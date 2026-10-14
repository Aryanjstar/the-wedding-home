import { describe, expect, it } from "vitest";

import { civilDateInIndia, daysUntilCivilDate, instantInIndia } from "@/data/india-time";

describe("India time", () => {
  it("reads a civil date and a clock in Kolkata", () => {
    const instant = instantInIndia("2026-12-18", "8:14 pm");
    expect(instant?.toISOString()).toBe("2026-12-18T14:44:00.000Z");
    expect(instant && civilDateInIndia(instant)).toBe("2026-12-18");
  });

  it("counts days from today in India, including a date that has passed", () => {
    const now = new Date("2026-12-16T12:00:00+05:30");
    expect(daysUntilCivilDate("2026-12-18", now)).toBe(2);
    expect(daysUntilCivilDate("2026-12-15", now)).toBe(-1);
  });
});
