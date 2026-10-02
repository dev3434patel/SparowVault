/** Calendar date in the user's timezone, YYYY-MM-DD.
 * `Date.toISOString()` is UTC and hides a voucher posted on the local calendar day
 * during the hours when local midnight is still the previous UTC day.
 */
export function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localMonthStart(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
