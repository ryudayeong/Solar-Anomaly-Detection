export function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatClock(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour12: false });
}
