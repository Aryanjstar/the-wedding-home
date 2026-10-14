import { describe, expect, it } from "vitest";

import {
  accountByEmail,
  addEventOnStore,
  currentSession,
  hydrateStore,
  initialStore,
  inviteMemberOnStore,
  membersAfterRemove,
  membersAfterRoleChange,
  nextEvent,
  organiserFromEmail,
  PREVIEW_PASSWORD,
  previewSignInHint,
  primaryDate,
  registerAccount,
  removeEventOnStore,
  removeMemberOnStore,
  replacePassword,
  SAMPLE_PASSWORD_HASH,
  sampleOrganisers,
  saveWeddingOnStore,
  setRoleOnStore,
  validateSignUp,
} from "@/data/preview";

describe("organiserFromEmail", () => {
  it("keeps a known manager", () => {
    expect(organiserFromEmail("Ritu@example.com")).toEqual({
      name: "Ritu Sharma",
      email: "ritu@example.com",
      role: "manager",
    });
  });

  it("treats a new address as Admin", () => {
    expect(organiserFromEmail("dev@family.test", "Dev Sharma")).toEqual({
      name: "Dev Sharma",
      email: "dev@family.test",
      role: "admin",
    });
  });
});

describe("preview members", () => {
  it("refuses to demote the last Admin", () => {
    const only = [{ name: "Aanya Sharma", email: "aanya@example.com", role: "admin" as const }];
    expect(membersAfterRoleChange(only, "aanya@example.com", "manager")).toBeNull();
  });

  it("refuses to remove the last Admin or yourself", () => {
    expect(membersAfterRemove(sampleOrganisers, "aanya@example.com", "kabir@example.com")).not.toBeNull();
    const only = [sampleOrganisers[0]];
    expect(membersAfterRemove(only, "aanya@example.com", "kabir@example.com")).toBeNull();
    expect(membersAfterRemove(sampleOrganisers, "aanya@example.com", "aanya@example.com")).toBeNull();
  });
});

describe("preview accounts", () => {
  it("accepts the shared preview password", async () => {
    const { compare } = await import("bcryptjs");
    expect(await compare(PREVIEW_PASSWORD, SAMPLE_PASSWORD_HASH)).toBe(true);
    expect(await compare("not-the-password", SAMPLE_PASSWORD_HASH)).toBe(false);
  });

  it("rejects a short password, a mismatch, and a duplicate email", () => {
    const store = initialStore();
    expect(validateSignUp("Dev", "dev@family.test", "short", "short")).toMatch(/10 to 128/);
    expect(validateSignUp("Dev", "dev@family.test", "long-enough", "different")).toMatch(/do not match/);
    const taken = registerAccount(store, {
      name: "Aanya",
      email: "Aanya@example.com",
      password: "long-enough",
      confirm: "long-enough",
      passwordHash: "hash",
    }, "new-wedding");
    expect(taken.error).toMatch(/already has an account/);
    expect(taken.store.accounts).toHaveLength(store.accounts.length);
  });

  it("starts a wedding for a new admin and lets an invitee join that wedding", () => {
    const created = registerAccount(initialStore(), {
      name: "Dev Sharma",
      email: "dev@family.test",
      password: "long-enough",
      confirm: "long-enough",
      passwordHash: "hash",
    }, "dev-wedding");
    expect(created.error).toBeNull();
    expect(created.next).toBe("/wedding/new");
    const session = currentSession(created.store);
    expect(session?.account.role).toBe("admin");
    expect(session?.workspace.wedding).toBeNull();

    const invited = inviteMemberOnStore(created.store, { name: "Ritu Aunt", email: "ritu.aunt@family.test", role: "manager" });
    expect(invited.error).toBeNull();
    const blocked = inviteMemberOnStore(invited.store, { name: "Kabir", email: "kabir@example.com", role: "manager" });
    expect(blocked.error).toMatch(/already on a wedding/);

    const joined = registerAccount(invited.store, {
      name: "Ritu Auntie",
      email: "ritu.aunt@family.test",
      password: "long-enough",
      confirm: "long-enough",
      passwordHash: "their-hash",
    }, "should-not-create");
    expect(joined.error).toBeNull();
    expect(joined.next).toBe("/wedding/new");
    expect(currentSession(joined.store)?.workspace.id).toBe("dev-wedding");
    expect(currentSession(joined.store)?.account.role).toBe("manager");
  });

  it("sends a finished wedding to the functions, then keeps edits on the details", () => {
    const created = registerAccount(initialStore(), {
      name: "Dev Sharma",
      email: "dev@family.test",
      password: "long-enough",
      confirm: "long-enough",
      passwordHash: "hash",
    }, "dev-wedding");
    const saved = saveWeddingOnStore(created.store, { bride: "  Meera ", groom: "Arun", date: "2027-02-14", city: " Dehradun " });
    expect(saved?.next).toBe("/app/events");
    expect(currentSession(saved!.store)?.workspace.wedding).toEqual({
      bride: "Meera",
      groom: "Arun",
      date: "2027-02-14",
      city: "Dehradun",
      title: "",
      story: "",
    });
    expect(saveWeddingOnStore(created.store, { bride: " ", groom: "Arun", date: "2027-02-14", city: "Dehradun" })).toBeNull();
    const edited = saveWeddingOnStore(saved!.store, { bride: "Meera", groom: "Arun", date: "2027-02-14", city: "Dehradun" });
    expect(edited?.next).toBe("/app/details");
  });

  it("adds one primary function and does not reset an unknown email", () => {
    const created = registerAccount(initialStore(), {
      name: "Dev Sharma",
      email: "dev@family.test",
      password: "long-enough",
      confirm: "long-enough",
      passwordHash: "hash",
    }, "dev-wedding");
    const first = addEventOnStore(created.store, {
      id: "haldi",
      title: "Haldi",
      date: "2027-02-12",
      time: "10:00",
      venue: "House",
      address: "Rajpur Road",
      city: "Dehradun",
      primary: true,
      muhurat: "",
    });
    const second = addEventOnStore(first!, {
      id: "wedding",
      title: "Wedding",
      date: "2027-02-14",
      time: "19:00",
      venue: "",
      address: "",
      city: "Dehradun",
      primary: true,
      muhurat: "8:14 pm",
    });
    const events = currentSession(second!)?.workspace.events ?? [];
    expect(events.find((event) => event.id === "haldi")?.primary).toBe(false);
    expect(events.find((event) => event.id === "wedding")?.primary).toBe(true);
    expect(primaryDate(currentSession(second!)!.workspace)).toBe("2027-02-14");
    expect(nextEvent(events, "2027-02-13")?.title).toBe("Wedding");
    expect(removeEventOnStore(second!, "missing")).toBeNull();
    expect(currentSession(removeEventOnStore(second!, "haldi")!)?.workspace.events).toHaveLength(1);
    expect(addEventOnStore(initialStore(), { ...events[0] })).toBeNull();

    const reset = replacePassword(created.store, "nobody@family.test", "new-hash");
    expect(reset).toEqual(created.store);
    expect(accountByEmail(replacePassword(created.store, "dev@family.test", "new-hash"), "dev@family.test")?.passwordHash).toBe("new-hash");
  });

  it("refuses the last admin and keeps a legacy session", () => {
    const created = registerAccount(initialStore(), {
      name: "Dev Sharma",
      email: "dev@family.test",
      password: "long-enough",
      confirm: "long-enough",
      passwordHash: "hash",
    }, "dev-wedding");
    expect(setRoleOnStore(created.store, "dev@family.test", "manager")).toBeNull();
    expect(removeMemberOnStore(created.store, "dev@family.test")).toBeNull();

    const legacy = hydrateStore(JSON.stringify({
      person: { name: "Dev Sharma", email: "dev@family.test", role: "admin" },
      wedding: { bride: "Meera", groom: "Arun", date: "2027-02-14", city: "Dehradun" },
      members: [{ name: "Dev Sharma", email: "dev@family.test", role: "admin" }],
    }));
    expect(legacy.currentEmail).toBe("dev@family.test");
    expect(currentSession(legacy)?.workspace.wedding?.city).toBe("Dehradun");
    expect(hydrateStore("not-json").currentEmail).toBeNull();
    expect(accountByEmail(hydrateStore(""), "aanya@example.com")?.passwordHash).toBe(SAMPLE_PASSWORD_HASH);
  });

  it("names both roles and the preview password", () => {
    expect(previewSignInHint()).toContain("Admin");
    expect(previewSignInHint()).toContain("Manager");
    expect(previewSignInHint()).toContain(PREVIEW_PASSWORD);
  });
});
