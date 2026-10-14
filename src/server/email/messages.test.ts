import { describe, expect, it } from "vitest";

import { householdInvitationText, memberInvitationText, passwordResetText } from "@/server/email/messages";

describe("email messages", () => {
  it("tells an organiser which role and link to use", () => {
    const text = memberInvitationText({
      brideName: "Aanya Sharma",
      groomName: "Kabir Mehta",
      role: "manager",
      email: "parent@example.com",
      url: "https://wedding.example/join/token",
      expiresAt: new Date("2026-10-21T12:00:00.000Z"),
    });

    expect(text).toContain("a Manager");
    expect(text).toContain("parent@example.com");
    expect(text).toContain("https://wedding.example/join/token");
    expect(text).not.toContain("re_");
  });

  it("names an Admin invitation differently", () => {
    const text = memberInvitationText({
      brideName: "Aanya",
      groomName: "Kabir",
      role: "admin",
      email: "a@example.com",
      url: "https://wedding.example/join/token",
      expiresAt: new Date("2026-10-21T12:00:00.000Z"),
    });
    expect(text).toContain("an Admin");
  });

  it("puts the reset link in the message and nothing else secret", () => {
    const text = passwordResetText("https://wedding.example/reset-password?token=abc");
    expect(text).toContain("https://wedding.example/reset-password?token=abc");
    expect(text).toContain("next hour");
  });

  it("gives a guest the invitation link without asking them to sign up", () => {
    const text = householdInvitationText({
      brideName: "Aanya Sharma",
      groomName: "Kabir Mehta",
      weddingDate: "2026-12-18",
      city: "Jaipur",
      url: "https://wedding.example/i/token",
    });
    expect(text).toContain("do not need an account");
    expect(text).toContain("https://wedding.example/i/token");
    expect(text).toContain("Jaipur");
  });
});
