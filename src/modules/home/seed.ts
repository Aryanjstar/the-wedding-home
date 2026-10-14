import "server-only";

import mongoose from "mongoose";

import { instantInIndia } from "@/data/india-time";
import { SAMPLE_PASSWORD_HASH } from "@/data/preview";
import { connectToDatabase } from "@/server/db/connection";
import { registeredModels } from "@/server/db/models";
import {
  EventModel,
  ExpenseModel,
  GalleryModel,
  HouseholdModel,
  MembershipModel,
  RsvpModel,
  TaskModel,
  UserModel,
  VendorModel,
  WeddingModel,
} from "@/server/db/schemas";
import { randomToken } from "@/server/auth/session";

const organisers = [
  { name: "Aanya Sharma", email: "aanya@example.com", role: "admin" as const },
  { name: "Kabir Mehta", email: "kabir@example.com", role: "admin" as const },
  { name: "Ritu Sharma", email: "ritu@example.com", role: "manager" as const },
  { name: "Arjun Mehta", email: "arjun@example.com", role: "manager" as const },
  { name: "Aryan", email: "aryanjstar3@gmail.com", role: "admin" as const },
  { name: "Aryan", email: "aryanjstar4@gmail.com", role: "manager" as const },
  { name: "IIIT DWD", email: "22bcs018@iiitdwd.ac.in", role: "manager" as const },
];

const realOrganisers = organisers.filter((person) => person.email.endsWith("gmail.com") || person.email.endsWith("iiitdwd.ac.in"));

async function ensureRealOrganisers() {
  const wedding = await WeddingModel.findOne({ "site.slug": "aanya-and-kabir" });
  if (!wedding) return;
  for (const person of realOrganisers) {
    let user = await UserModel.findOne({ email: person.email });
    if (!user) {
      user = await UserModel.create({
        name: person.name,
        email: person.email,
        passwordHash: SAMPLE_PASSWORD_HASH,
        schemaVersion: 1,
      });
    }
    const membership = await MembershipModel.findOne({ userId: user._id });
    if (membership) continue;
    await MembershipModel.create({
      weddingId: wedding._id,
      userId: user._id,
      role: person.role,
      joinedVia: "invitation",
      schemaVersion: 1,
    });
    if (person.role === "admin") {
      await WeddingModel.updateOne({ _id: wedding._id }, { $inc: { adminCount: 1 } });
    }
  }
}

export async function seedDevWedding() {
  await connectToDatabase();
  for (const model of registeredModels) await model.syncIndexes();

  if (await UserModel.exists({ email: "aanya@example.com" })) {
    await ensureRealOrganisers();
    console.log("Aanya is already in the database. Real organisers are in place.");
    await mongoose.disconnect();
    return;
  }

  const users = await UserModel.create(
    organisers.map((person) => ({
      name: person.name,
      email: person.email,
      passwordHash: SAMPLE_PASSWORD_HASH,
      schemaVersion: 1,
    })),
  );
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const aanya = byEmail.get("aanya@example.com");
  if (!aanya) throw new Error("Seed user missing.");

  const wedding = await WeddingModel.create({
    brideName: "Aanya Sharma",
    groomName: "Kabir Mehta",
    title: "Aanya & Kabir",
    weddingDate: "2026-12-18",
    city: "Jaipur",
    story: "Two families, one week in Jaipur, and a home the guests can open without an account.",
    adminCount: organisers.filter((person) => person.role === "admin").length,
    createdBy: aanya._id,
    site: { slug: "aanya-and-kabir", published: true, publishedAt: new Date(), theme: { packId: "classical" } },
    gallery: { token: randomToken(), enabled: true, guestUploadEnabled: true },
    schemaVersion: 1,
  });

  await MembershipModel.create(
    organisers.map((person) => ({
      weddingId: wedding._id,
      userId: byEmail.get(person.email)?._id,
      role: person.role,
      joinedVia: person.email === "aanya@example.com" ? "creator" : "invitation",
      schemaVersion: 1,
    })),
  );

  const plan = [
    ["Haldi", "2026-12-16", "10:00 am", "Rambagh Palace courtyard, Jaipur", "Bhawani Singh Road, Jaipur", false, ""],
    ["Mehendi", "2026-12-16", "4:00 pm", "Rambagh verandah, Jaipur", "Bhawani Singh Road, Jaipur", false, ""],
    ["Sangeet", "2026-12-17", "7:30 pm", "Fairmont, Jaipur", "2, Amber Rd, Jaipur", false, ""],
    ["Wedding", "2026-12-18", "6:00 pm", "Rambagh Palace", "Bhawani Singh Road, Jaipur", true, "8:14 pm"],
    ["Reception", "2026-12-19", "8:00 pm", "Fairmont ballroom, Jaipur", "2, Amber Rd, Jaipur", false, ""],
  ] as const;

  const events = [];
  for (const [title, date, time, venue, address, primary, muhurat] of plan) {
    const starts = instantInIndia(date, time);
    const muhuratAt = muhurat ? instantInIndia(date, muhurat) : null;
    if (!starts) throw new Error(`Bad time for ${title}`);
    events.push(await EventModel.create({
      weddingId: wedding._id,
      kind: title.toLowerCase(),
      title,
      startsAt: starts,
      isPrimary: primary,
      muhuratAt: muhuratAt ?? undefined,
      venue: { name: venue, address, city: "Jaipur" },
      schemaVersion: 1,
    }));
  }

  const byTitle = new Map(events.map((event) => [event.title, event]));
  const allIds = events.map((event) => event._id);
  const weddingIds = ["Wedding", "Reception"].map((title) => byTitle.get(title)?._id).filter(Boolean);

  const houses = [
    { name: "Mehta household", side: "groom", maxPeople: 6, invited: allIds, people: 4, diet: { veg: 2, nonVeg: 1, jain: 1 } },
    { name: "Sharma household", side: "bride", maxPeople: 5, invited: allIds, people: null, diet: null },
    { name: "Iyer household", side: "other", maxPeople: 3, invited: weddingIds, people: 0, diet: { veg: 0, nonVeg: 0, jain: 0 } },
  ];

  for (const house of houses) {
    const row = await HouseholdModel.create({
      weddingId: wedding._id,
      name: house.name,
      nameSearch: house.name.toLowerCase(),
      side: house.side,
      maxPeople: house.maxPeople,
      invitedEventIds: house.invited,
      inviteToken: randomToken(),
      createdBy: aanya._id,
      schemaVersion: 1,
    });
    if (house.people === null || !house.diet) continue;
    for (const eventId of house.invited) {
      await RsvpModel.create({
        weddingId: wedding._id,
        householdId: row._id,
        eventId,
        status: house.people === 0 ? "no" : "yes",
        attendingCount: house.people,
        diet: house.diet,
        respondedAt: new Date(),
        schemaVersion: 1,
      });
    }
  }

  const ritu = byEmail.get("ritu@example.com");
  const kabir = byEmail.get("kabir@example.com");
  const arjun = byEmail.get("arjun@example.com");
  await TaskModel.create([
    { weddingId: wedding._id, title: "Confirm caterer count", status: "todo", priority: "high", assigneeId: ritu?._id, createdBy: aanya._id, schemaVersion: 1 },
    { weddingId: wedding._id, title: "Print the gate list", status: "todo", priority: "medium", createdBy: aanya._id, schemaVersion: 1 },
    { weddingId: wedding._id, title: "Haldi playlist", status: "doing", priority: "low", assigneeId: kabir?._id, createdBy: aanya._id, schemaVersion: 1 },
    { weddingId: wedding._id, title: "Return the light deposit", status: "done", priority: "medium", assigneeId: arjun?._id, completedAt: new Date(), createdBy: aanya._id, schemaVersion: 1 },
  ]);

  await ExpenseModel.create([
    { weddingId: wedding._id, title: "Venue", amountInr: 1_200_000, spentOn: "2026-11-02", category: "venue", createdBy: aanya._id, schemaVersion: 1 },
    { weddingId: wedding._id, title: "Catering", amountInr: 480_000, spentOn: "2026-11-18", category: "catering", createdBy: aanya._id, schemaVersion: 1 },
    { weddingId: wedding._id, title: "Flowers", amountInr: 160_000, spentOn: "2026-12-01", category: "decoration", createdBy: aanya._id, schemaVersion: 1 },
  ]);

  await VendorModel.create([
    { weddingId: wedding._id, name: "Leela Studio", category: "photographer", contactPerson: "Leela Studio", phone: "+919829022010", agreedCostInr: 300_000, source: "manual", createdBy: aanya._id, schemaVersion: 1 },
    { weddingId: wedding._id, name: "Annapurna", category: "caterer", contactPerson: "Annapurna", phone: "+919810011880", agreedCostInr: 480_000, source: "manual", createdBy: aanya._id, schemaVersion: 1 },
    { weddingId: wedding._id, name: "Marigold Room", category: "florist", contactPerson: "Marigold Room", phone: "+919928044112", agreedCostInr: 160_000, source: "manual", createdBy: aanya._id, schemaVersion: 1 },
  ]);

  const photos = [
    ["Haldi", "/photos/haldi.jpg"],
    ["Mehendi", "/photos/mehendi.jpg"],
    ["Sangeet", "/photos/sangeet.jpg"],
    ["Wedding", "/photos/wedding.jpg"],
    ["Reception", "/photos/reception.jpg"],
  ] as const;
  for (const [title, publicPath] of photos) {
    const itemId = new mongoose.Types.ObjectId();
    await GalleryModel.create({
      _id: itemId,
      weddingId: wedding._id,
      kind: "photo",
      contentType: "image/jpeg",
      bytes: 1,
      storageKey: `weddings/${wedding._id}/gallery/${itemId}`,
      publicPath,
      title,
      uploadedBy: { type: "organiser", userId: aanya._id },
      hidden: false,
      schemaVersion: 1,
    });
  }

  await mongoose.disconnect();
}
