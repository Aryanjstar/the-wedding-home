const INDIA = "Asia/Kolkata";

/** ₹18,40,000, or ₹18.4 L / ₹1.2 Cr when compact. Whole rupees only. */
export function formatInr(amount: number, options: { compact?: boolean } = {}) {
  const value = Math.round(amount);
  if (options.compact) {
    if (Math.abs(value) >= 1_00_00_000) return `₹${trim(value / 1_00_00_000)} Cr`;
    if (Math.abs(value) >= 1_00_000) return `₹${trim(value / 1_00_000)} L`;
  }
  return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
}

function trim(value: number) {
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

/** "Sat, 12 Dec" in India. */
export function shortDay(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: INDIA, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

/** "Saturday, 12 December 2026" in India. */
export function longDay(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: INDIA, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/** "7:30 pm" in India. */
export function clock(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: INDIA, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(" ", " ")
    .toLowerCase();
}

/** A civil date "2026-12-18" as "18 December 2026". */
export function civilLong(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** A civil date "2026-12-18" as "18 Dec". */
export function civilShort(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** The civil date and 24-hour clock of an instant in India, for date and time inputs. */
export function inputsFromInstant(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: INDIA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** "2026-12-18" and "19:30" read in India, as an ISO instant. */
export function instantFromInputs(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const clockValue = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  const instant = new Date(`${date}T${clockValue}:00+05:30`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

export function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: INDIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function relativeDays(date: string) {
  const today = Date.parse(`${todayInIndia()}T00:00:00Z`);
  const target = Date.parse(`${date}T00:00:00Z`);
  const days = Math.round((target - today) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export const expenseCategoryLabels: Record<string, string> = {
  venue: "Venue",
  catering: "Catering",
  photography: "Photography",
  videography: "Videography",
  decoration: "Decor and flowers",
  clothing: "Clothing",
  jewellery: "Jewellery",
  entertainment: "Music and entertainment",
  invitations: "Invitations",
  gifts: "Gifts and shagun",
  travel: "Travel",
  makeup: "Makeup",
  miscellaneous: "Other",
};

export const vendorCategoryLabels: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  venue: "Venue",
  caterer: "Caterer",
  decorator: "Decorator",
  dj: "DJ and music",
  makeup: "Makeup",
  mehendi_artist: "Mehendi artist",
  pandit: "Pandit",
  choreographer: "Choreographer",
  florist: "Florist",
  planner: "Planner",
  transport: "Transport",
  other: "Other",
};

export const sideLabels: Record<string, string> = { bride: "Bride's side", groom: "Groom's side", other: "Friends and others" };

export const eventKindLabels: Record<string, string> = {
  roka: "Roka",
  engagement: "Engagement",
  mehendi: "Mehendi",
  haldi: "Haldi",
  sangeet: "Sangeet",
  cocktail: "Cocktail",
  wedding: "Wedding",
  reception: "Reception",
  custom: "Custom",
};

export function plural(count: number, one: string, many = `${one}s`) {
  return `${new Intl.NumberFormat("en-IN").format(count)} ${count === 1 ? one : many}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
