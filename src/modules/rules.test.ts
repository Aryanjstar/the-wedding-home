import { describe, expect, it } from "vitest";

import { formatInr, inputsFromInstant, instantFromInputs } from "@/data/format";
import { joinReturnPath } from "@/data/return-path";
import { resolveTheme, worldForKind } from "@/data/worlds";
import { kindFromTitle, mapEmbedUrl, mapsUrl } from "@/modules/events/service";
import { checkRsvp, normalisePhone, shareMessage, whatsappUrl } from "@/modules/guests/service";
import { dueSlot, monthBefore, slotTimes } from "@/modules/reminders/service";
import { taskOrder } from "@/modules/tasks/service";
import { distanceM } from "@/modules/vendors/service";
import { embedUrl } from "@/modules/website/embed";
import { slugSuggestion } from "@/modules/website/service";

describe("rupees", () => {
  it("groups the Indian way and compacts lakhs and crores", () => {
    expect(formatInr(1840000)).toBe("₹18,40,000");
    expect(formatInr(1840000, { compact: true })).toBe("₹18.4 L");
    expect(formatInr(25000000, { compact: true })).toBe("₹2.5 Cr");
    expect(formatInr(950, { compact: true })).toBe("₹950");
  });
});

describe("India time for the date and time inputs", () => {
  it("round-trips a civil date and a 24-hour clock through IST", () => {
    const iso = instantFromInputs("2027-02-14", "20:14");
    expect(iso).toBe("2027-02-14T14:44:00.000Z");
    expect(inputsFromInstant(iso)).toEqual({ date: "2027-02-14", time: "20:14" });
    expect(instantFromInputs("14/02/2027", "10:00")).toBeNull();
  });
});

describe("phones for WhatsApp", () => {
  it("turns a 10-digit Indian mobile into +91 and keeps other country codes", () => {
    expect(normalisePhone("98765 43210")).toBe("+919876543210");
    expect(normalisePhone("098765-43210")).toBe("+919876543210");
    expect(normalisePhone("919876543210")).toBe("+919876543210");
    expect(normalisePhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalisePhone("12")).toBe("invalid");
    expect(normalisePhone("  ")).toBeNull();
  });

  it("opens that chat when there is a phone, and the chat picker when there is not", () => {
    expect(whatsappUrl("+919876543210", "hi")).toBe("https://wa.me/919876543210?text=hi");
    expect(whatsappUrl(null, "hi there")).toBe("https://wa.me/?text=hi%20there");
  });

  it("puts the household's own link in the message", () => {
    const message = shareMessage({ kind: "invite", couple: "Ananya & Rohan", householdName: "Sharma family", inviteUrl: "https://x/i/abc" });
    expect(message).toContain("You're invited to Ananya & Rohan's wedding.");
    expect(message).toContain("https://x/i/abc");
  });
});

describe("RSVP rules", () => {
  const invited = ["a".repeat(24), "b".repeat(24)];
  const yes = (count: number, diet: [number, number, number], eventId = invited[0]) => ({ eventId, status: "yes" as const, attendingCount: count, diet: { veg: diet[0], nonVeg: diet[1], jain: diet[2] } });

  it("accepts a diet that adds up and a no", () => {
    expect(checkRsvp({ responses: [yes(3, [2, 0, 1]), { eventId: invited[1], status: "no" }] }, invited, 4)).toEqual([]);
  });

  it("refuses a diet that does not add up, more than the max, a function not invited to, and a repeat", () => {
    const reasons = (responses: Parameters<typeof checkRsvp>[0]["responses"]) => checkRsvp({ responses }, invited, 4).map((error) => error.reason);
    expect(reasons([yes(3, [1, 1, 0])])).toEqual(["DIET_MISMATCH"]);
    expect(reasons([yes(5, [5, 0, 0])])).toEqual(["RSVP_OVER_MAX"]);
    expect(reasons([yes(0, [0, 0, 0])])).toEqual(["RSVP_EMPTY"]);
    expect(reasons([{ eventId: "c".repeat(24), status: "no" }])).toEqual(["EVENT_NOT_INVITED"]);
    expect(reasons([yes(1, [1, 0, 0]), yes(1, [1, 0, 0])])).toEqual(["DUPLICATE_EVENT"]);
  });
});

describe("the reminder clock", () => {
  const sangeet = new Date("2027-02-13T14:00:00.000Z");

  it("is one calendar month, one week, and one day before that function", () => {
    const times = slotTimes(sangeet);
    expect(times["1m"].toISOString()).toBe("2027-01-13T14:00:00.000Z");
    expect(times["1w"].toISOString()).toBe("2027-02-06T14:00:00.000Z");
    expect(times["1d"].toISOString()).toBe("2027-02-12T14:00:00.000Z");
    expect(monthBefore(new Date("2027-03-31T06:00:00.000Z")).toISOString()).toBe("2027-02-28T06:00:00.000Z");
  });

  it("is due inside a 36-hour window, so a missed daily run is forgiven", () => {
    expect(dueSlot("please_rsvp", sangeet, new Date("2027-02-06T20:00:00.000Z"))?.slot).toBe("1w");
    expect(dueSlot("please_rsvp", sangeet, new Date("2027-02-09T00:00:00.000Z"))).toBeNull();
    expect(dueSlot("see_you_soon", sangeet, new Date("2027-02-06T20:00:00.000Z"))).toBeNull();
    expect(dueSlot("see_you_soon", sangeet, new Date("2027-02-12T15:00:00.000Z"))?.slot).toBe("1d");
  });
});

describe("functions", () => {
  it("knows the kind from a familiar name", () => {
    expect(kindFromTitle("Haldi")).toBe("haldi");
    expect(kindFromTitle("Pheras")).toBe("wedding");
    expect(kindFromTitle("Mehndi night")).toBe("mehendi");
    expect(kindFromTitle("Garba")).toBe("sangeet");
    expect(kindFromTitle("Pool party")).toBe("custom");
  });

  it("maps a venue or an address, and never a city alone", () => {
    expect(mapsUrl({ name: "Rambagh Palace", city: "Jaipur" })).toContain("Rambagh%20Palace%2C%20Jaipur");
    expect(mapEmbedUrl({ address: "Lal Ghat" })).toContain("output=embed");
    expect(mapsUrl({ city: "Jaipur" })).toBeNull();
    expect(mapsUrl(null)).toBeNull();
  });
});

describe("themes", () => {
  it("gives each function its own world, and an Admin's override wins only for that function", () => {
    expect(resolveTheme("traditional", "haldi").world.id).toBe("haldi");
    expect(resolveTheme("traditional", "haldi").music).toBe("dholak-boliyan");
    expect(resolveTheme("traditional", "sangeet").music).toBe("dhol-bhangra");
    expect(resolveTheme("traditional", "wedding").world.id).toBe("pheras");
    expect(resolveTheme("traditional", "wedding", { world: "wedding" }).music).toBe("kalyani-nadaswaram-thavil");
    expect(resolveTheme("traditional", "custom").music).toBe("bhairavi-shehnai");
    const overridden = resolveTheme("classical", "haldi", { world: "sangeet", music: "dhol-bhangra", accent: "#123456" });
    expect([overridden.world.id, overridden.music, overridden.accent]).toEqual(["sangeet", "dhol-bhangra", "#123456"]);
    expect(resolveTheme("classical", "haldi", { accent: "red" }).accent).toBe("#a5520c");
    expect(worldForKind("roka")).toBe("engagement");
  });
});

describe("the website", () => {
  it("embeds YouTube and Vimeo and refuses anything else", () => {
    expect(embedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedUrl("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
    expect(embedUrl("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(embedUrl("https://example.com/live")).toBeNull();
  });

  it("suggests bride-groom-ddmmyyyy", () => {
    expect(slugSuggestion({ brideName: "Ananya Rao", groomName: "Rohan", weddingDate: "2027-02-14" })).toBe("ananya-rohan-14022027");
  });
});

describe("small helpers", () => {
  it("orders tasks: open first, then by due date, then by priority", () => {
    const rows = [
      { status: "done", dueOn: "2027-01-01", priority: "high" as const },
      { status: "todo", dueOn: null, priority: "high" as const },
      { status: "todo", dueOn: "2027-01-05", priority: "low" as const },
      { status: "doing", dueOn: "2027-01-05", priority: "high" as const },
    ];
    expect([...rows].sort(taskOrder).map((row) => `${row.status}-${row.priority}`)).toEqual(["doing-high", "todo-low", "todo-high", "done-high"]);
  });

  it("measures distance to a vendor", () => {
    expect(distanceM({ lat: 26.9124, lng: 75.7873 }, { lat: 26.9124, lng: 75.7873 })).toBe(0);
    expect(distanceM({ lat: 26.9, lng: 75.8 }, { lat: 27.0, lng: 75.8 })).toBeGreaterThan(11000);
  });

  it("returns only to our own pages after sign-in", () => {
    expect(joinReturnPath("/app/guests")).toBe("/app/guests");
    expect(joinReturnPath("/join/abc")).toBe("/join/abc");
    expect(joinReturnPath("//evil.example")).toBeUndefined();
    expect(joinReturnPath("https://evil.example")).toBeUndefined();
    expect(joinReturnPath("/admin")).toBeUndefined();
  });
});
