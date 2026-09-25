/** FY label helpers for company chrome (no accounting side effects). */

export function fyLabelFromStartMonth(startMonth: number, refDate = new Date()): string {
  const m = Math.min(12, Math.max(1, startMonth || 4));
  const y = refDate.getFullYear();
  const month = refDate.getMonth() + 1;
  const startYear = month >= m ? y : y - 1;
  const endYear = startYear + 1;
  const yy = String(endYear).slice(-2);
  return `FY ${startYear}–${yy}`;
}

export function periodRange(
  kind: "today" | "week" | "month" | "quarter" | "fy" | "custom",
  fyStartMonth = 4,
  custom?: { from: string; to: string },
): { from: string; to: string; label: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const to = iso(today);
  if (kind === "custom" && custom) return { ...custom, label: "Custom" };
  if (kind === "today") return { from: to, to, label: "Today" };
  if (kind === "week") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: iso(d), to, label: "This week" };
  }
  if (kind === "month") {
    const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    return { from, to, label: "This month" };
  }
  if (kind === "quarter") {
    const q = Math.floor(today.getMonth() / 3) * 3;
    const from = `${today.getFullYear()}-${String(q + 1).padStart(2, "0")}-01`;
    return { from, to, label: "This quarter" };
  }
  // FY
  const m = fyStartMonth || 4;
  const y = today.getFullYear();
  const month = today.getMonth() + 1;
  const startYear = month >= m ? y : y - 1;
  const from = `${startYear}-${String(m).padStart(2, "0")}-01`;
  return { from, to, label: fyLabelFromStartMonth(m, today) };
}
