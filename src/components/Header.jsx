import { Sun, Radio, Loader2, WifiOff, FileSpreadsheet } from "lucide-react";

export function Header({ loadState, dataset }) {
  const pillCls =
    loadState === "ready"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : loadState === "loading"
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : loadState === "error"
      ? "bg-rose-50 border-rose-200 text-rose-700"
      : "bg-zinc-50 border-zinc-200 text-zinc-500";

  const pillIcon =
    loadState === "ready" ? (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    ) : loadState === "loading" ? (
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
    ) : loadState === "error" ? (
      <WifiOff className="w-3.5 h-3.5" />
    ) : (
      <FileSpreadsheet className="w-3.5 h-3.5" />
    );

  const pillLabel =
    loadState === "ready"
      ? "DATA LOADED"
      : loadState === "loading"
      ? "PARSING…"
      : loadState === "error"
      ? "PARSE ERROR"
      : "NO DATA";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/60 bg-gradient-to-br from-amber-50/60 via-white to-blue-50/50 shadow-lg shadow-blue-500/5">
      <div className="pointer-events-none absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 w-[280px] h-[280px] rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -left-16 w-[220px] h-[220px] rounded-full bg-rose-100/40 blur-3xl" />

      <div className="relative px-7 py-6 flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Sun className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 leading-tight">
              Solar <span className="text-blue-600">Anomaly</span> Detection
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              태양광 발전량 조작 탐지 대시보드
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${pillCls}`}>
            {pillIcon}
            {pillLabel}
          </div>
          {loadState === "ready" && dataset && (
            <div className="text-[11px] text-zinc-400 font-mono leading-tight text-right">
              <div>
                {dataset.site ?? "—"}
                {dataset.capacityKw != null && ` · ${dataset.capacityKw}kW`}
              </div>
              <div>
                {dataset.rowCount.toLocaleString()} rows · {dataset.intervalMinutes ?? "?"}min
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
