import { useState, useEffect, useRef, useCallback } from "react";
import { parseCsvDataset, DatasetParseError } from "./api/dataset";
import { Header } from "./components/Header";
import { DataSourcePanel } from "./components/DataSourcePanel";
import { ControlBar } from "./components/ControlBar";

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

  // 시뮬레이션 루프
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

  const currentPoint = hasData ? points[cursor] : null;

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
      <div className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-[40%] -right-32 w-[460px] h-[460px] rounded-full bg-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute top-[70%] left-[20%] w-[400px] h-[400px] rounded-full bg-emerald-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[20%] w-[380px] h-[380px] rounded-full bg-sky-200/25 blur-3xl" />

      <div className="relative max-w-[1600px] mx-auto space-y-5">
        <Header loadState={loadState} dataset={dataset} />

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
