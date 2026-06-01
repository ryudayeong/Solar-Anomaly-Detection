import { Cloud, GitBranch, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { ZONE_THRESHOLDS, FORECAST_FEATURE_COUNT, WINDOW_SCALES_MIN } from "../api/dataset";

export function PipelinePanel({ status, currentPoint, dataset }) {
  const ghi = currentPoint?.ghi;
  const zone = currentPoint?.ghiZone;
  const thr = zone ? ZONE_THRESHOLDS[zone] : null;
  const prob = currentPoint?.attackProb;

  const stages = [
    {
      num: "01",
      title: "Forecaster",
      desc: `LightGBM · ${FORECAST_FEATURE_COUNT} feature → PR ${
        currentPoint?.predicted != null
          ? currentPoint.predicted.toFixed(3)
          : currentPoint?.powerRatio?.toFixed(3) ?? "—"
      }`,
      icon: <Cloud className="w-4 h-4" />,
      status: status.stage1,
    },
    {
      num: "02",
      title: "GHI Zone 분기",
      desc:
        zone === "high"
          ? "high (≥545) → Raw residual"
          : zone === "mid"
          ? "mid (300–545) → PR residual"
          : zone === "excluded"
          ? "excluded (<200)"
          : "—",
      icon: <GitBranch className="w-4 h-4" />,
      status: status.stage2,
    },
    {
      num: "03",
      title: "Zone Detector",
      desc: `window ${WINDOW_SCALES_MIN[0]}~${WINDOW_SCALES_MIN[WINDOW_SCALES_MIN.length - 1]}분 · thr ${
        thr ?? `${ZONE_THRESHOLDS.mid}/${ZONE_THRESHOLDS.high}`
      }${prob != null ? ` · prob ${prob.toFixed(3)}` : ""}`,
      icon: <TrendingUp className="w-4 h-4" />,
      status: status.stage3,
    },
  ];

  return (
    <div className="space-y-3 h-full">
      {stages.map((s) => (
        <StageCard key={s.num} stage={s} />
      ))}
    </div>
  );
}

function StageCard({ stage }) {
  const tones = {
    idle: {
      card: "bg-white border-zinc-200/70",
      icon: "text-zinc-400",
      title: "text-zinc-500",
      num: "text-zinc-300",
      badge: "bg-zinc-50 text-zinc-400 border-zinc-200",
      badgeIcon: null,
      badgeLabel: "STAND-BY",
      desc: "text-zinc-400",
    },
    active: {
      card: "bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white border-emerald-200/70",
      icon: "text-emerald-600",
      title: "text-zinc-900",
      num: "text-emerald-400",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      badgeIcon: <CheckCircle2 className="w-3 h-3" />,
      badgeLabel: "ACTIVE",
      desc: "text-emerald-700/70",
    },
    alert: {
      card: "bg-gradient-to-br from-rose-50 via-rose-50/50 to-white border-rose-300",
      icon: "text-rose-600",
      title: "text-zinc-900",
      num: "text-rose-400",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
      badgeIcon: <AlertTriangle className="w-3 h-3" />,
      badgeLabel: "ALERT",
      desc: "text-rose-700/70",
    },
  };
  const t = tones[stage.status];

  // Stage 1 (Forecaster) 은 active 일 때 항상 blue 톤 유지 (브랜드 색)
  const isForecaster = stage.num === "01" && stage.status === "active";
  const card = isForecaster
    ? "bg-gradient-to-br from-blue-50 via-blue-50/40 to-white border-blue-200/70"
    : t.card;
  const titleCls = isForecaster ? "text-zinc-900" : t.title;
  const iconCls = isForecaster ? "text-blue-600" : t.icon;
  const numCls = isForecaster ? "text-blue-400" : t.num;
  const badgeCls = isForecaster
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : t.badge;
  const descCls = isForecaster ? "text-blue-700/70" : t.desc;
  const badgeLabel = isForecaster ? null : t.badgeLabel;

  return (
    <div className={`rounded-2xl border ${card} p-4 shadow-lg shadow-blue-500/5`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={iconCls}>{stage.icon}</span>
          <h3 className={`text-base font-bold tracking-tight ${titleCls}`}>{stage.title}</h3>
        </div>
        {badgeLabel ? (
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}`}>
            {t.badgeIcon}
            {badgeLabel}
          </span>
        ) : (
          <span className={`text-[11px] font-bold font-mono ${numCls}`}>{stage.num}</span>
        )}
      </div>
      <p className={`text-xs ${descCls} truncate`} title={stage.desc}>
        {stage.desc}
      </p>
    </div>
  );
}
