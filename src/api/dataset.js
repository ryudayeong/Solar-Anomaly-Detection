/**
 * CSV → Dataset 파서.
 *
 * 사용자가 업로드한 CSV를 받아서 대시보드가 쓰는 dataset 모양으로 변환한다.
 * 실제 ML 추론(LightGBM forecaster/detector)은 브라우저에서 돌릴 수 없으므로,
 * forecaster 예측값과 detector 출력은 CSV에 포함되어 있을 때만 시각화한다.
 *
 * 필수 컬럼: timestamp, power_ratio
 * 선택 컬럼:
 *   - site, capacity_kw
 *   - ghi, temp
 *   - power_ratio_pred (또는 predicted) : forecaster 예측 PR
 *   - residual_raw, residual_pr        : 사전 계산된 잔차
 *   - attack_label, attack_type, attack_ratio : 정답 라벨
 *   - attack_prob, final_pred           : detector 예측 결과
 */

// detector zone 정의 (test_ver7.py 기준)
export const GHI_ZONES = {
  excluded: { min: 0, max: 200, key: "excluded", label: "EXCLUDED (<200)" },
  mid: { min: 300, max: 545, key: "mid", label: "mid (300–545)" },
  high: { min: 545, max: Infinity, key: "high", label: "high (≥545)" },
  // 200 ≤ GHI < 300은 legacy 동작에서 "high"로 들어감
};

export const ZONE_THRESHOLDS = {
  mid: 0.45,
  high: 0.55,
};

export const WINDOW_SCALES_MIN = [30, 60, 120, 180, 240]; // 5분 * [6, 12, 24, 36, 48]
export const FORECAST_FEATURE_COUNT = 35;

export class DatasetParseError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "DatasetParseError";
  }
}

function classifyZone(ghi) {
  if (ghi == null || ghi < GHI_ZONES.excluded.max) return "excluded";
  if (ghi >= GHI_ZONES.high.min) return "high";
  if (ghi >= GHI_ZONES.mid.min) return "mid";
  return "high"; // 200 ≤ ghi < 300 legacy
}

const truthy = (v) => v === 1 || v === "1" || v === true || v === "true" || v === "True";

// 헤더 별칭 → 정규화된 키
const HEADER_ALIASES = {
  timestamp: ["timestamp", "time", "datetime", "date_time"],
  site: ["site", "site_id"],
  capacity_kw: ["capacity_kw", "capacity", "cap_kw"],
  ghi: ["ghi", "irradiance"],
  temp: ["temp", "temperature", "temp_c"],
  power_ratio: ["power_ratio", "pr", "pr_measured"],
  power_ratio_pred: ["power_ratio_pred", "predicted", "pr_pred", "pr_hat", "y_hat"],
  residual_raw: ["residual_raw", "resid_raw", "raw_residual"],
  residual_pr: ["residual_pr", "resid_pr", "pr_residual"],
  attack_label: ["attack_label", "label", "y_true"],
  attack_type: ["attack_type", "atk_type"],
  attack_ratio: ["attack_ratio", "atk_ratio"],
  attack_prob: ["attack_prob", "prob", "y_prob"],
  final_pred: ["final_pred", "pred", "y_pred"],
};

function buildHeaderMap(headers) {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const map = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = norm.findIndex((h) => aliases.includes(h));
    if (idx >= 0) map[key] = idx;
  }
  return map;
}

// 간단한 CSV 라인 파서 (따옴표 미지원, 쉼표 구분)
function parseLine(line) {
  return line.split(",").map((s) => s.trim());
}

function parseTimestamp(raw) {
  if (!raw) return null;
  // "2018-07-15 11:00:00" 같은 형태도 Date가 받아주지만 일부 브라우저는 ISO만 받음 → 공백 → T 치환
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toHHMM(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function toNum(v) {
  if (v == null || v === "" || v === "NaN" || v === "nan") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function inferIntervalMinutes(points) {
  if (points.length < 2) return null;
  const diffs = [];
  for (let i = 1; i < Math.min(points.length, 20); i++) {
    const a = points[i - 1].timestamp;
    const b = points[i].timestamp;
    if (a && b) diffs.push((b.getTime() - a.getTime()) / 60000);
  }
  if (diffs.length === 0) return null;
  diffs.sort((a, b) => a - b);
  return Math.round(diffs[Math.floor(diffs.length / 2)]);
}

function buildDetections(points) {
  // attack_label == 1 인 연속 구간 → 한 건의 detection
  const runs = [];
  let cur = null;
  for (const p of points) {
    const isAttack = p.attackLabel === 1;
    if (isAttack) {
      if (cur == null) {
        cur = { type: p.attackType ?? "ATTACK", startIdx: p.idx, endIdx: p.idx };
      } else {
        cur.endIdx = p.idx;
        // type이 도중에 바뀌면 같은 run이라도 우세 type 유지
      }
    } else if (cur != null) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur != null) runs.push(cur);

  return runs.map((r) => {
    const startPoint = points[r.startIdx];
    const endPoint = points[r.endIdx];
    return {
      type: r.type,
      startIdx: r.startIdx,
      endIdx: r.endIdx,
      startTime: startPoint?.time ?? "",
      endTime: endPoint?.time ?? "",
      confidence: null, // ground truth 라벨이므로 신뢰도 N/A
      detectedBy: "Ground Truth (attack_label)",
    };
  });
}

function buildDetectionsFromProb(points) {
  // attack_prob >= zone threshold 인 연속 구간
  const runs = [];
  let cur = null;
  for (const p of points) {
    if (p.attackProb == null) {
      if (cur != null) { runs.push(cur); cur = null; }
      continue;
    }
    const thresh = ZONE_THRESHOLDS[p.ghiZone] ?? null;
    const flagged = thresh != null && p.attackProb >= thresh;
    if (flagged) {
      if (cur == null) {
        cur = { startIdx: p.idx, endIdx: p.idx, probs: [p.attackProb], zone: p.ghiZone };
      } else {
        cur.endIdx = p.idx;
        cur.probs.push(p.attackProb);
      }
    } else if (cur != null) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur != null) runs.push(cur);

  return runs.map((r) => {
    const startPoint = points[r.startIdx];
    const endPoint = points[r.endIdx];
    const meanProb = r.probs.reduce((s, x) => s + x, 0) / r.probs.length;
    return {
      type: "PREDICTED",
      startIdx: r.startIdx,
      endIdx: r.endIdx,
      startTime: startPoint?.time ?? "",
      endTime: endPoint?.time ?? "",
      confidence: meanProb,
      detectedBy: `Zone-specific Detector (${r.zone}, thr ${ZONE_THRESHOLDS[r.zone]})`,
    };
  });
}

export function parseCsvDataset(csvText, { fileName = "uploaded.csv" } = {}) {
  if (!csvText || typeof csvText !== "string") {
    throw new DatasetParseError("EMPTY", "CSV 내용이 비어 있습니다.");
  }
  // 라인 분리 + BOM 제거
  const text = csvText.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new DatasetParseError("NO_DATA", "헤더 외에 데이터 행이 없습니다.");
  }
  const headers = parseLine(lines[0]);
  const headerMap = buildHeaderMap(headers);

  if (!("timestamp" in headerMap) || !("power_ratio" in headerMap)) {
    throw new DatasetParseError(
      "MISSING_COLUMNS",
      `필수 컬럼이 없습니다. 최소 'timestamp' 와 'power_ratio' 가 필요합니다. (인식된 컬럼: ${headers.join(", ")})`
    );
  }

  const points = [];
  let firstSite = null;
  let firstCapacity = null;
  let hasPredicted = false;
  let hasLabels = false;
  let hasAttackProb = false;
  let firstTs = null;
  let lastTs = null;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells.length < 2) continue;
    const get = (key) => (headerMap[key] != null ? cells[headerMap[key]] : undefined);

    const ts = parseTimestamp(get("timestamp"));
    const powerRatio = toNum(get("power_ratio"));
    if (!ts || powerRatio == null) continue;

    const ghi = toNum(get("ghi"));
    const temp = toNum(get("temp"));
    const capacityKw = toNum(get("capacity_kw"));
    const site = get("site")?.trim() ?? null;
    const predictedPr = toNum(get("power_ratio_pred"));
    let residualRaw = toNum(get("residual_raw"));
    let residualPr = toNum(get("residual_pr"));
    const attackLabelRaw = get("attack_label");
    const attackLabel = attackLabelRaw == null ? null : truthy(attackLabelRaw) ? 1 : 0;
    const attackType = get("attack_type")?.trim() || null;
    const attackRatio = toNum(get("attack_ratio"));
    const attackProb = toNum(get("attack_prob"));
    const finalPredRaw = get("final_pred");
    const finalPred = finalPredRaw == null ? null : truthy(finalPredRaw) ? 1 : 0;

    // residual 사전계산이 없고 predicted가 있으면 즉석에서 계산
    if (residualRaw == null && predictedPr != null) residualRaw = powerRatio - predictedPr;
    if (residualPr == null && predictedPr != null) {
      residualPr = Math.min(3, Math.max(0, powerRatio / (predictedPr + 0.02)));
    }

    if (predictedPr != null) hasPredicted = true;
    if (attackLabel != null) hasLabels = true;
    if (attackProb != null) hasAttackProb = true;
    if (firstSite == null && site) firstSite = site;
    if (firstCapacity == null && capacityKw != null) firstCapacity = capacityKw;
    if (firstTs == null) firstTs = ts;
    lastTs = ts;

    const ghiZone = classifyZone(ghi);

    points.push({
      idx: points.length,
      timestamp: ts,
      time: toHHMM(ts),
      powerRatio,
      predicted: predictedPr,
      ghi,
      temp,
      residualRaw: residualRaw == null ? null : +residualRaw.toFixed(4),
      residualPr: residualPr == null ? null : +residualPr.toFixed(4),
      attackLabel,
      attackType,
      attackRatio,
      attackProb,
      finalPred,
      ghiZone,
    });
  }

  if (points.length === 0) {
    throw new DatasetParseError("NO_VALID_ROWS", "유효한 행을 하나도 파싱하지 못했습니다.");
  }

  const intervalMinutes = inferIntervalMinutes(points);
  const cap = firstCapacity ?? null;

  // 표시용 kW 컬럼 채우기
  for (const p of points) {
    p.measuredKw = cap != null ? +(p.powerRatio * cap).toFixed(3) : null;
    p.predictedKw = cap != null && p.predicted != null ? +(p.predicted * cap).toFixed(3) : null;
  }

  const detections = hasLabels
    ? buildDetections(points)
    : hasAttackProb
    ? buildDetectionsFromProb(points)
    : [];

  return {
    fileName,
    source: "uploaded-csv",
    fetchedAt: new Date().toISOString(),
    site: firstSite,
    capacityKw: cap,
    intervalMinutes,
    rowCount: points.length,
    dateRange: {
      start: firstTs?.toISOString() ?? null,
      end: lastTs?.toISOString() ?? null,
    },
    hasPredicted,
    hasLabels,
    hasAttackProb,
    points,
    detections,
  };
}
