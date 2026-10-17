import "server-only";

import { themePack } from "@/data/theme-packs";
import { assertId, notFound, requireMember } from "@/modules/access";
import { EventModel, HouseholdModel, WeddingModel } from "@/server/db/schemas";

function dayAndTime(instant: Date) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
    .format(instant)
    .replace(" ", " ");
}

export async function readEcard(request: Request, householdId: string) {
  const { weddingId } = await requireMember(request);
  assertId(householdId, "household");
  const [house, wedding] = await Promise.all([HouseholdModel.findOne({ _id: householdId, weddingId }), WeddingModel.findById(weddingId)]);
  if (!house || !wedding) notFound("household");
  const events = await EventModel.find({ _id: { $in: house.invitedEventIds }, weddingId }).sort({ startsAt: 1 }).limit(6);
  const pack = themePack(wedding.site?.theme?.packId);
  const [year, month, day] = wedding.weddingDate.split("-").map(Number);
  return {
    household: house.name,
    couple: wedding.title || `${wedding.brideName.split(" ")[0]} & ${wedding.groomName.split(" ")[0]}`,
    city: wedding.city,
    date: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day))),
    lines: events.map((event) => `${event.title} · ${dayAndTime(event.startsAt)}`),
    bg: pack.bg,
    text: pack.text,
    muted: pack.muted,
    accent: pack.accent,
  };
}
