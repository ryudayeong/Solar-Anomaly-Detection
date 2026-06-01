import { Sun, Gauge, ShieldCheck, ShieldAlert, TrendingUp } from "lucide-react";

export function KpiCards({ stats, currentPoint, hasData, dataset }) {
  const dash = "—";
  const hasLabels = dataset?.hasLabels;
  const hitsValue = hasLabels ? stats.labeledHits : stats.predictedHits;
  const hitsLabel = hasLabels ? "라벨 적발" : "Detector 예측 적발";
  const hitsSub = hasLabels ? "attack_label = 1 누적" : "attack_prob ≥ zone thr 누적";
  const hitsHasAny = hasData && hitsValue > 0;

  const attackTypeStr =
    Object.keys(stats.attackTypes).length > 0
      ? Object.entries(stats.attackTypes)
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => `${t} ${n}`)
          .join(" · ")
      : "—";

  const heroValue = hasData ? (currentPoint?.powerRatio?.toFixed(3) ?? dash) : dash;
  const heroSub = hasData
    ? currentPoint?.predicted != null
      ? `예측 ŷ ${currentPoint.predicted.toFixed(3)} · 잔차 ${(currentPoint.residualRaw ?? 0).toFixed(3)}`
      : "예측 컬럼 없음"
    : "데이터 미수집";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Hero: 블루 솔리드 */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500 bg-gradient-to-br from-blue-600 to-blue-700 p-5 shadow-xl shadow-blue-500/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-blue-100 font-medium tracking-wide">현재 power_ratio</span>
          <Gauge className="w-5 h-5 text-blue-200" />
        </div>
        <div className="text-5xl font-bold text-white tracking-tight tabular-nums truncate" title={String(heroValue)}>
          {heroValue}
        </div>
        <div className="text-xs text-blue-100/80 mt-2 truncate" title={heroSub}>
          {heroSub}
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
      </div>

      {/* GHI · zone : 앰버/피치 */}
      <PastelCard
        tone="amber"
        icon={<Sun className="w-5 h-5" />}
        label="현재 GHI · zone"
        value={hasData && currentPoint?.ghi != null ? `${currentPoint.ghi.toFixed(0)}` : dash}
        valueSub={hasData && currentPoint?.ghi != null ? currentPoint.ghiZone : null}
        sub={hasData ? (currentPoint?.temp != null ? `temp ${currentPoint.temp.toFixed(1)}°C` : "—") : "데이터 미수집"}
      />

      {/* 라벨 적발 : 적발 0건이면 emerald (정상), 있으면 rose */}
      <PastelCard
        tone={hitsHasAny ? "rose" : "emerald"}
        icon={hitsHasAny ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
        label={hitsLabel}
        value={hasData ? `${hitsValue}` : dash}
        valueSub={hasData ? "건" : null}
        sub={hitsSub}
      />

      {/* 공격 타입 누적 : 적발 있으면 rose, 없으면 zinc */}
      <PastelCard
        tone={hasData && Object.keys(stats.attackTypes).length > 0 ? "rose" : "zinc"}
        icon={<TrendingUp className="w-5 h-5" />}
        label="공격 타입 누적"
        value={hasData ? attackTypeStr : dash}
        sub={hasData ? `평균 잔차 ${(stats.meanResidualRaw ?? 0).toFixed(3)}` : "—"}
      />
    </div>
  );
}

function PastelCard({ tone, icon, label, value, valueSub, sub }) {
  const tones = {
    amber: {
      card: "bg-gradient-to-br from-amber-50 via-orange-50/40 to-white border-amber-200/60",
      icon: "text-amber-500",
      value: "text-amber-700",
      sub: "text-amber-700/70",
    },
    emerald: {
      card: "bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white border-emerald-200/60",
      icon: "text-emerald-500",
      value: "text-emerald-700",
      sub: "text-emerald-700/70",
    },
    rose: {
      card: "bg-gradient-to-br from-rose-50 via-rose-50/40 to-white border-rose-200/60",
      icon: "text-rose-500",
      value: "text-rose-700",
      sub: "text-rose-700/70",
    },
    zinc: {
      card: "bg-gradient-to-br from-zinc-50 via-white to-white border-zinc-200/60",
      icon: "text-zinc-400",
      value: "text-zinc-700",
      sub: "text-zinc-500",
    },
  };
  const t = tones[tone];
  return (
    <div className={`relative overflow-hidden rounded-3xl border ${t.card} p-5 shadow-lg shadow-blue-500/5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-600 font-medium tracking-wide">{label}</span>
        <div className={t.icon}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className={`text-5xl font-bold tracking-tight tabular-nums truncate ${t.value}`} title={String(value)}>
          {value}
        </div>
        {valueSub && <div className="text-sm text-zinc-500 font-medium">{valueSub}</div>}
      </div>
      <div className={`text-xs mt-2 truncate ${t.sub}`} title={sub}>
        {sub}
      </div>
    </div>
  );
}
