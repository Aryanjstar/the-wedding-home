const INDIA = "Asia/Kolkata";

export function civilDateInIndia(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function clockInIndia(instant: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(instant)
    .replace("\u202f", " ")
    .toLowerCase();
}

/** A civil date plus a clock string such as "8:14 pm", read in India. */
export function instantInIndia(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  let hours = 0;
  let minutes = 0;
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2] ?? "0");
    const suffix = match[3]?.toLowerCase();
    if (suffix === "pm" && hours < 12) hours += 12;
    if (suffix === "am" && hours === 12) hours = 0;
    if (!suffix && hours > 23) return null;
  }
  if (hours > 23 || minutes > 59) return null;
  const stamp = `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`;
  const instant = new Date(stamp);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function daysUntilCivilDate(date: string, now: Date): number {
  const target = Date.parse(`${date}T00:00:00+05:30`);
  if (Number.isNaN(target)) return 0;
  const today = Date.parse(`${civilDateInIndia(now)}T00:00:00+05:30`);
  return Math.round((target - today) / 86_400_000);
}
