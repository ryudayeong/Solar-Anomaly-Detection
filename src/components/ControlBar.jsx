import { Play, Pause, RotateCcw } from "lucide-react";

export function ControlBar({
  playing,
  cursor,
  progressPct,
  currentPoint,
  speed,
  setSpeed,
  onPlay,
  onPause,
  onReset,
  hasData,
}) {
  const disabled = !hasData;
  return (
    <div
      className={`rounded-3xl border border-zinc-200/60 bg-white shadow-lg shadow-blue-500/5 ${
        disabled ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="flex items-center gap-2">
          {!playing ? (
            <button
              onClick={onPlay}
              disabled={disabled}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:cursor-not-allowed text-white disabled:text-zinc-400 font-semibold transition shadow-md shadow-blue-500/30 disabled:shadow-none"
            >
              <Play className="w-4 h-4 fill-current" /> 시연 시작
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition shadow-md shadow-amber-500/30"
            >
              <Pause className="w-4 h-4 fill-current" /> 일시정지
            </button>
          )}
          <button
            onClick={onReset}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-zinc-50 disabled:hover:bg-white disabled:cursor-not-allowed text-zinc-700 disabled:text-zinc-400 font-semibold transition border border-zinc-200"
          >
            <RotateCcw className="w-4 h-4" /> 초기화
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {[200, 80, 30].map((s, i) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                speed === s
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {["x1", "x2", "x6"][i]}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-end gap-4 text-sm">
          <span className="text-zinc-500">
            현재 <span className="text-zinc-900 font-mono ml-1">{currentPoint?.time ?? "—"}</span>
          </span>
          <span className="text-zinc-500">
            진행률 <span className="text-blue-600 font-bold ml-1">{progressPct}%</span>
          </span>
        </div>
      </div>

      <div className="h-1 rounded-b-3xl bg-zinc-100 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-blue-600 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
