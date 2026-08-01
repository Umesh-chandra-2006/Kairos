const DAY_MS = 86_400_000;

/** Today's date as YYYY-MM-DD in UTC. Injected `now` enables deterministic tests. */
export function dateStr(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysStr(dateStrIn: string, days: number): string {
  const [yRaw, mRaw, dRaw] = dateStrIn.split("-").map(Number);
  const y = yRaw ?? 0;
  const m = mRaw ?? 1;
  const d = dRaw ?? 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isMonday(date: Date = new Date()): boolean {
  return date.getUTCDay() === 1;
}

/** Date string of the most recent Monday (this week's refill key). */
export function lastMondayStr(date: Date = new Date()): string {
  const day = date.getUTCDay(); // 0 = Sunday
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date.getTime() - daysToMonday * DAY_MS);
  return dateStr(monday);
}
