import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { Activity, Loader2, Inbox, AlertTriangle } from "lucide-react";

export function TimelineChart({ data, detections, hasData, loadState, dataset }) {
  const attackRegions = [];
  if (hasData) {
    const cursor = data.length - 1;
    for (const det of detections) {
      if (cursor < det.startIdx) continue;
      const endIdx = Math.min(cursor, det.endIdx);
      const startPoint = data[det.startIdx];
      const endPoint = data[endIdx];
      if (!startPoint || !endPoint) continue;
      attackRegions.push({ x1: startPoint.time, x2: endPoint.time, label: det.type });
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-lg shadow-blue-500/5 h-full">
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Activity className="w-4 h-4 text-blue-600" />
          발전 곡선 · <span className="font-mono text-zinc-900">power_ratio</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-3 text-zinc-500">
            <LegendDot color="#2563eb" label="측정" />
            {dataset?.hasPredicted && <LegendDot color="#a1a1aa" label="예측 ŷ" dashed />}
            <LegendDot color="#f43f5e" label="적발" box />
          </div>
          {hasData && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              live
            </span>
          )}
        </div>
      </div>

      <div className="h-[380px] relative">
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 z-10 pointer-events-none">
            {loadState === "loading" ? (
              <>
                <Loader2 className="w-10 h-10 mb-3 text-blue-500 animate-spin" />
                <div className="text-sm font-medium text-zinc-700">파싱 중…</div>
              </>
            ) : (
              <>
                <Inbox className="w-10 h-10 mb-3 text-zinc-300" />
                <div className="text-sm font-medium text-zinc-600">데이터가 없습니다</div>
                <div className="text-xs mt-1 text-zinc-500">상단에서 CSV 를 업로드해주세요</div>
              </>
            )}
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="time"
              stroke="#a1a1aa"
              tick={{ fontSize: 11, fill: "#71717a" }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              stroke="#a1a1aa"
              tick={{ fontSize: 11, fill: "#71717a" }}
              domain={[0, "auto"]}
              label={{
                value: "PR",
                angle: -90,
                position: "insideLeft",
                fill: "#71717a",
                fontSize: 11,
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {attackRegions.map((r, i) => (
              <ReferenceArea
                key={i}
                x1={r.x1}
                x2={r.x2}
                strokeOpacity={0}
                fill="#f43f5e"
                fillOpacity={0.1}
              />
            ))}

            {dataset?.hasPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#a1a1aa"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
                name="예측 ŷ"
              />
            )}
            <Line
              type="monotone"
              dataKey="powerRatio"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                if (payload.attackLabel === 1 || (payload.attackProb != null && payload.finalPred === 1)) {
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      fill="#f43f5e"
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                  );
                }
                return null;
              }}
              isAnimationActive={false}
              name="측정 PR"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label, dashed = false, box = false }) {
  return (
    <div className="flex items-center gap-1.5">
      {box ? (
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.4 }} />
      ) : (
        <span
          className="inline-block w-4 h-0.5"
          style={{
            background: color,
            borderTop: dashed ? `2px dashed ${color}` : "none",
            height: dashed ? 0 : 2,
          }}
        />
      )}
      {label}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg min-w-[180px]">
      <div className="text-zinc-500 font-mono mb-1.5">{label}</div>
      <div className="space-y-1">
        <Row label="측정 PR" value={p.powerRatio?.toFixed(3) ?? "—"} color="#2563eb" />
        {p.predicted != null && <Row label="예측 ŷ" value={p.predicted.toFixed(3)} color="#71717a" />}
        {p.residualRaw != null && <Row label="residual raw" value={p.residualRaw.toFixed(3)} color="#f59e0b" />}
        {p.residualPr != null && <Row label="residual PR" value={p.residualPr.toFixed(3)} color="#8b5cf6" />}
        {p.ghi != null && <Row label="GHI" value={`${p.ghi.toFixed(0)} · ${p.ghiZone}`} color="#f59e0b" />}
        {p.attackProb != null && <Row label="attack_prob" value={p.attackProb.toFixed(3)} color="#f43f5e" />}
        {(p.attackLabel === 1 || p.attackType) && (
          <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center gap-1.5 text-rose-600 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> {p.attackType ?? "ATTACK"}
            {p.attackRatio != null && <span className="text-zinc-400 font-normal">· {p.attackRatio}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
