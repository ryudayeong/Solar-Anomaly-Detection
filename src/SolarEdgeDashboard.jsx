import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { parseCsvDataset, DatasetParseError, ZONE_THRESHOLDS } from "./api/dataset";
import { Header } from "./components/Header";
import { DataSourcePanel } from "./components/DataSourcePanel";
import { ControlBar } from "./components/ControlBar";
import { KpiCards } from "./components/KpiCards";
import { TimelineChart } from "./components/TimelineChart";
import { PipelinePanel } from "./components/PipelinePanel";
import { VerdictPanel } from "./components/VerdictPanel";

export default function SolarEdgeDashboard() {
  // 데이터 상태
  const [dataset, setDataset] = useState(null);
  const [loadState, setLoadState] = useState("idle"); // idle | loading | ready | error
  const [loadError, setLoadError] = useState(null);

  // 재생 상태
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(80);
  const intervalRef = useRef(null);

  const points = dataset?.points;
  const totalPoints = points?.length ?? 0;
  const hasData = !!points && totalPoints > 0;

  useEffect(() => {
    if (!playing || !hasData) return;
    intervalRef.current = setInterval(() => {
      setCursor((prev) => {
        if (prev >= totalPoints - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, hasData, totalPoints]);

  const handleLoadCsv = useCallback(async (file) => {
    if (!file) return;
    setLoadState("loading");
    setLoadError(null);
    try {
      const text = await file.text();
      const result = parseCsvDataset(text, { fileName: file.name });
      setPlaying(false);
      setCursor(0);
      setDataset(result);
      setLoadState("ready");
    } catch (err) {
      setLoadError(
        err instanceof DatasetParseError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: err?.message ?? "알 수 없는 오류가 발생했습니다." }
      );
      setLoadState("error");
    }
  }, []);

  const handleClearData = useCallback(() => {
    setPlaying(false);
    setCursor(0);
    setDataset(null);
    setLoadError(null);
    setLoadState("idle");
  }, []);

  const visibleData = useMemo(
    () => (hasData ? points.slice(0, cursor + 1) : []),
    [points, cursor, hasData]
  );
  const currentPoint = hasData ? points[cursor] : null;

  // 파이프라인 단계 상태
  const moduleStatus = useMemo(() => {
    if (!currentPoint) return { stage1: "idle", stage2: "idle", stage3: "idle" };
    const ghi = currentPoint.ghi ?? 0;
    const inDetectorRange = ghi >= 200;
    const zone = currentPoint.ghiZone;
    const thr = ZONE_THRESHOLDS[zone];
    const isFlagged =
      currentPoint.attackLabel === 1 ||
      (currentPoint.attackProb != null && thr != null && currentPoint.attackProb >= thr);

    return {
      stage1: ghi > 0 ? "active" : "idle",
      stage2: inDetectorRange ? "active" : "idle",
      stage3: isFlagged ? "alert" : inDetectorRange ? "active" : "idle",
    };
  }, [currentPoint]);

  // 통계
  const stats = useMemo(() => {
    if (!hasData) {
      return {
        labeledHits: 0,
        predictedHits: 0,
        alerts: 0,
        attackTypes: {},
        meanResidualRaw: null,
        meanResidualPr: null,
        meanGhi: null,
        zoneCounts: { excluded: 0, mid: 0, high: 0 },
      };
    }
    let labeledHits = 0;
    let predictedHits = 0;
    const attackTypes = {};
    let residRawSum = 0, residRawN = 0;
    let residPrSum = 0, residPrN = 0;
    let ghiSum = 0, ghiN = 0;
    const zoneCounts = { excluded: 0, mid: 0, high: 0 };

    for (const p of visibleData) {
      if (p.attackLabel === 1) {
        labeledHits++;
        const t = p.attackType ?? "ATTACK";
        attackTypes[t] = (attackTypes[t] ?? 0) + 1;
      }
      const thr = ZONE_THRESHOLDS[p.ghiZone];
      if (p.attackProb != null && thr != null && p.attackProb >= thr) predictedHits++;
      if (p.residualRaw != null) { residRawSum += p.residualRaw; residRawN++; }
      if (p.residualPr != null) { residPrSum += p.residualPr; residPrN++; }
      if (p.ghi != null) { ghiSum += p.ghi; ghiN++; }
      zoneCounts[p.ghiZone] = (zoneCounts[p.ghiZone] ?? 0) + 1;
    }

    return {
      labeledHits,
      predictedHits,
      alerts: labeledHits + predictedHits,
      attackTypes,
      meanResidualRaw: residRawN > 0 ? residRawSum / residRawN : null,
      meanResidualPr: residPrN > 0 ? residPrSum / residPrN : null,
      meanGhi: ghiN > 0 ? ghiSum / ghiN : null,
      zoneCounts,
    };
  }, [visibleData, hasData]);

  // 최종 판정
  const verdict = useMemo(() => {
    if (!hasData) return { state: "no-data", reachedEnd: false };
    const reachedEnd = cursor >= totalPoints - 1;
    const hits = stats.labeledHits + stats.predictedHits;

    if (hits === 0) return { state: "monitoring", reachedEnd };
    if (reachedEnd) return { state: "confirmed", reachedEnd };
    return { state: "suspect", reachedEnd };
  }, [cursor, stats.labeledHits, stats.predictedHits, hasData, totalPoints]);

  const handlePlay = () => {
    if (!hasData) return;
    if (cursor >= totalPoints - 1) setCursor(0);
    setPlaying(true);
  };
  const handlePause = () => setPlaying(false);
  const handleReset = () => {
    setPlaying(false);
    setCursor(0);
  };

  const progressPct = hasData
    ? ((cursor / Math.max(1, totalPoints - 1)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="relative min-h-screen text-zinc-900 p-6 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white via-30% to-amber-50/30">
      {/* 페이지 전체 floating blob 장식 (가장 뒤) */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-[40%] -right-32 w-[460px] h-[460px] rounded-full bg-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute top-[70%] left-[20%] w-[400px] h-[400px] rounded-full bg-emerald-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[20%] w-[380px] h-[380px] rounded-full bg-sky-200/25 blur-3xl" />

      <div className="relative max-w-[1600px] mx-auto space-y-5">
        <Header loadState={loadState} dataset={dataset} />

        {/* 데이터 없을 때만 업로드 패널 펼치고, 로드되면 상단 ControlBar 안으로 컴팩트하게 */}
        {!hasData && (
          <DataSourcePanel
            loadState={loadState}
            loadError={loadError}
            dataset={dataset}
            onLoadFile={handleLoadCsv}
            onClear={handleClearData}
          />
        )}

        <ControlBar
          playing={playing}
          cursor={cursor}
          progressPct={progressPct}
          currentPoint={currentPoint}
          speed={speed}
          setSpeed={setSpeed}
          onPlay={handlePlay}
          onPause={handlePause}
          onReset={handleReset}
          hasData={hasData}
        />

        <KpiCards stats={stats} currentPoint={currentPoint} hasData={hasData} dataset={dataset} />

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 xl:col-span-8">
            <TimelineChart
              data={visibleData}
              detections={dataset?.detections ?? []}
              hasData={hasData}
              loadState={loadState}
              dataset={dataset}
            />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <PipelinePanel status={moduleStatus} currentPoint={currentPoint} dataset={dataset} />
          </div>
        </div>

        <VerdictPanel verdict={verdict} stats={stats} dataset={dataset} cursor={cursor} />

        {/* 데이터 로드된 상태에서 작은 "다시 업로드" 영역 */}
        {hasData && (
          <div className="flex justify-center">
            <button
              onClick={handleClearData}
              className="text-xs text-zinc-400 hover:text-zinc-600 font-mono transition"
            >
              ↑  다른 CSV 업로드
            </button>
          </div>
        )}

        <div className="text-center pt-2 pb-2">
          <div className="text-xs text-zinc-400 font-mono">
            Solar Anomaly Detection · entro2 Forecaster · test_ver7 Zone-specific Detector
          </div>
        </div>
      </div>
    </div>
  );
}
