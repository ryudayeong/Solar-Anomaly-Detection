import { Header } from "./components/Header";

export default function SolarEdgeDashboard() {
  return (
    <div className="relative min-h-screen text-zinc-900 p-6 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white via-30% to-amber-50/30">
      {/* 페이지 전체 floating blob 장식 */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-[40%] -right-32 w-[460px] h-[460px] rounded-full bg-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute top-[70%] left-[20%] w-[400px] h-[400px] rounded-full bg-emerald-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[20%] w-[380px] h-[380px] rounded-full bg-sky-200/25 blur-3xl" />

      <div className="relative max-w-[1600px] mx-auto space-y-5">
        <Header loadState="idle" dataset={null} />

        <div className="text-center pt-2 pb-2">
          <div className="text-xs text-zinc-400 font-mono">
            Solar Anomaly Detection · entro2 Forecaster · test_ver7 Zone-specific Detector
          </div>
        </div>
      </div>
    </div>
  );
}
