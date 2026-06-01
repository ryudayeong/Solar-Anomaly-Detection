import { FileWarning, AlertTriangle, Inbox, Scale, ChevronDown } from "lucide-react";
import { ZONE_THRESHOLDS } from "../api/dataset";

export function VerdictPanel({ verdict, stats, dataset, cursor }) {
  const isConfirmed = verdict.state === "confirmed";
  const isSuspect = verdict.state === "suspect";
  const isMonitoring = verdict.state === "monitoring";
  const isNoData = verdict.state === "no-data";

  const detections = dataset?.detections ?? [];
  const startedDetections = detections.filter((d) => cursor >= d.startIdx);

  const tone = isConfirmed
    ? {
        card: "border-rose-200 bg-gradient-to-r from-rose-50 via-rose-50/60 to-white",
        title: "text-rose-700",
        pill: "bg-rose-600 text-white",
        icon: "text-rose-600",
        iconBg: "bg-rose-100 border-rose-200",
        action: "bg-rose-600 hover:bg-rose-700 text-white",
        actionLabel: "REJECT",
      }
    : isSuspect
    ? {
        card: "border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white",
        title: "text-amber-800",
        pill: "bg-amber-500 text-white",
        icon: "text-amber-600",
        iconBg: "bg-amber-100 border-amber-200",
        action: "bg-amber-500 hover:bg-amber-600 text-white",
        actionLabel: "HOLD",
      }
    : isNoData
    ? {
        card: "border-zinc-200 bg-white",
        title: "text-zinc-700",
        pill: "bg-zinc-300 text-zinc-700",
        icon: "text-zinc-400",
        iconBg: "bg-zinc-100 border-zinc-200",
        action: "bg-zinc-300 text-zinc-600",
        actionLabel: "PENDING",
      }
    : {
        card: "border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white",
        title: "text-emerald-800",
        pill: "bg-emerald-600 text-white",
        icon: "text-emerald-600",
        iconBg: "bg-emerald-100 border-emerald-200",
        action: "bg-emerald-600 hover:bg-emerald-700 text-white",
        actionLabel: "ACCEPT",
      };

  const source = dataset?.hasLabels
    ? "GT"
    : dataset?.hasAttackProb
    ? "DET"
    : "—";

  const sourceFull = dataset?.hasLabels
    ? "ground truth"
    : dataset?.hasAttackProb
    ? `attack_prob ≥ ${ZONE_THRESHOLDS.mid}/${ZONE_THRESHOLDS.high}`
    : "라벨 없음";

  const headline = isConfirmed
    ? "조작 확정 — TAMPERING CONFIRMED"
    : isSuspect
    ? "조작 의심 — 진행 중"
    : isNoData
    ? "판정 대기 — CSV 업로드 필요"
    : "정상 — 적발 없음";

  const subline = isConfirmed
    ? `${detections.length}건의 공격 구간 검출됨`
    : isSuspect
    ? `${startedDetections.length}건의 구간이 진행 중`
    : isNoData
    ? "CSV를 업로드하면 자동으로 판정 시작"
    : "전 구간 라벨/탐지 결과 0";

  const totalHits = (stats?.labeledHits ?? 0) + (stats?.predictedHits ?? 0);

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${tone.card} shadow-lg ${isConfirmed ? "shadow-rose-500/10" : "shadow-blue-500/5"}`}>
      {/* blob 장식 */}
      {!isNoData && (
        <div
          className={`pointer-events-none absolute -bottom-24 -right-24 w-[320px] h-[320px] rounded-full blur-3xl ${
            isConfirmed ? "bg-rose-200/40" : isSuspect ? "bg-amber-200/40" : "bg-emerald-200/30"
          }`}
        />
      )}

      <div className="relative flex flex-wrap items-center gap-5 px-6 py-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${tone.iconBg}`}>
          {isConfirmed ? (
            <FileWarning className={`w-7 h-7 ${tone.icon}`} />
          ) : isSuspect ? (
            <AlertTriangle className={`w-7 h-7 ${tone.icon}`} />
          ) : isNoData ? (
            <Inbox className={`w-7 h-7 ${tone.icon}`} />
          ) : (
            <Scale className={`w-7 h-7 ${tone.icon}`} />
          )}
        </div>

        <div className="flex-1 min-w-[200px]">
          <span className={`text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded ${tone.pill}`}>
            FINAL VERDICT
          </span>
          <h2 className={`text-2xl font-bold tracking-tight mt-1 ${tone.title}`}>{headline}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{subline}</p>
        </div>

        {/* 요약 stats: 적발 포인트 + 탐지 출처 */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`text-3xl font-bold tabular-nums ${tone.title}`}>{totalHits}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">적발 포인트</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${tone.title}`}>{source}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 font-medium" title={sourceFull}>
              탐지 출처
            </div>
          </div>
        </div>

        <button
          disabled
          className={`flex items-center justify-center px-6 py-3 rounded-2xl text-sm font-bold tracking-wide shadow-md ${tone.action} cursor-default`}
        >
          {tone.actionLabel}
        </button>
      </div>

      {!isNoData && (
        <div className="relative flex justify-center pb-3">
          <div className="w-7 h-7 rounded-full bg-white/80 border border-zinc-200 flex items-center justify-center shadow-sm">
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      )}
    </div>
  );
}
