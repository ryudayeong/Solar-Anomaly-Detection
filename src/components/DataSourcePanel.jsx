import { useRef, useState } from "react";
import {
  Database,
  Clock,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { formatClock } from "../utils/format";

const REQUIRED_COLS = ["timestamp", "power_ratio"];
const OPTIONAL_COLS = [
  "site",
  "capacity_kw",
  "ghi",
  "temp",
  "power_ratio_pred",
  "residual_raw",
  "residual_pr",
  "attack_label",
  "attack_type",
  "attack_ratio",
  "attack_prob",
  "final_pred",
];

export function DataSourcePanel({ loadState, loadError, dataset, onLoadFile, onClear }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const openPicker = () => fileInputRef.current?.click();

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onLoadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onLoadFile(file);
  };

  const isLoading = loadState === "loading";
  const isReady = loadState === "ready";
  const isError = loadState === "error";

  return (
    <div className="rounded-3xl border border-blue-100/60 bg-gradient-to-br from-blue-50/40 via-white to-sky-50/30 shadow-lg shadow-blue-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-blue-50/40 to-transparent">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-zinc-900">데이터 소스</span>
          <span className="text-xs text-zinc-500">로컬 CSV 업로드</span>
        </div>
        {isReady && dataset && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            로드 시각 <span className="text-zinc-900 font-mono">{formatClock(dataset.fetchedAt)}</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleChange}
        className="hidden"
      />

      <div className="p-5">
        {loadState === "idle" && (
          <div className="space-y-3">
            <div
              onClick={openPicker}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`relative overflow-hidden flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition cursor-pointer py-14 px-6 ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-blue-200/70 bg-gradient-to-b from-blue-50/40 via-white to-white hover:border-blue-300 hover:from-blue-50/70"
              }`}
            >
              {/* 장식 blob */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-200/30 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-sky-100/40 blur-2xl" />

              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <div className="relative text-base font-semibold text-zinc-900 mt-1">
                CSV 파일을 드래그하거나 클릭해서 선택
              </div>
              <div className="relative text-xs text-zinc-500 max-w-md text-center leading-relaxed">
                test_ver7 결과 CSV
                (예: <span className="font-mono text-zinc-700">site5_5.4kw_2018_2020_attack_sa_5pct.csv</span>)
                또는 같은 스키마의 평가 CSV
              </div>
              <button
                type="button"
                className="relative mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                onClick={(e) => { e.stopPropagation(); openPicker(); }}
              >
                <Upload className="w-3.5 h-3.5" /> 파일 선택
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <SchemaBox title="필수 컬럼" cols={REQUIRED_COLS} tone="amber" />
              <SchemaBox title="선택 컬럼 (있으면 자동 활용)" cols={OPTIONAL_COLS} tone="slate" />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-900">CSV 파싱 중…</div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono">컬럼 인식 / 행 변환 / GHI zone 분류</div>
              <div className="mt-2 h-1 rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {isReady && dataset && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 font-medium font-mono truncate max-w-[260px]">
                  {dataset.fileName}
                </span>
              </div>
              <DataChip label="행" value={`${dataset.rowCount}`} unit="개" />
              <DataChip
                label="기간"
                value={dataset.dateRange?.start ? dataset.dateRange.start.slice(0, 10) : "—"}
                unit={dataset.dateRange?.end ? `→ ${dataset.dateRange.end.slice(0, 10)}` : ""}
              />
              {dataset.intervalMinutes != null && (
                <DataChip label="간격" value={`${dataset.intervalMinutes}`} unit="분" />
              )}
              {dataset.site && <DataChip label="site" value={dataset.site} mono />}
              {dataset.capacityKw != null && (
                <DataChip label="capacity" value={`${dataset.capacityKw}`} unit="kW" />
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={openPicker}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-medium border border-zinc-200 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> 다른 파일
                </button>
                <button
                  onClick={onClear}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 text-sm font-medium transition"
                >
                  <XCircle className="w-3.5 h-3.5" /> 비우기
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <ColPresenceChip label="forecaster 예측" present={dataset.hasPredicted} />
              <ColPresenceChip label="ground truth 라벨" present={dataset.hasLabels} />
              <ColPresenceChip label="detector attack_prob" present={dataset.hasAttackProb} />
              <ColPresenceChip
                label={`detection ${dataset.detections.length}건`}
                present={dataset.detections.length > 0}
                neutral={!dataset.hasLabels && !dataset.hasAttackProb}
              />
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-rose-700">
                CSV 파싱 실패
                {loadError?.code && (
                  <span className="ml-2 text-[10px] font-mono bg-rose-100 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded">
                    {loadError.code}
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-600 mt-0.5">{loadError?.message ?? "알 수 없는 오류"}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openPicker}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium border border-rose-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 다른 파일
              </button>
              <button
                onClick={onClear}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 text-sm font-medium transition"
              >
                <XCircle className="w-3.5 h-3.5" /> 취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SchemaBox({ title, cols, tone }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    slate: "border-zinc-200 bg-zinc-50/60 text-zinc-700",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
        <FileSpreadsheet className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
        {cols.map((c) => (
          <span key={c} className="px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function DataChip({ label, value, unit, mono = false }) {
  return (
    <div className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-semibold ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
      {unit && <span className="text-zinc-400">{unit}</span>}
    </div>
  );
}

function ColPresenceChip({ label, present, neutral = false }) {
  const cls = neutral
    ? "border-zinc-200 bg-zinc-50 text-zinc-500"
    : present
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-50 text-zinc-400";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${cls}`}>
      {neutral ? "·" : present ? "✓" : "×"} {label}
    </span>
  );
}
