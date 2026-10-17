import "server-only";

import type mongoose from "mongoose";
import { z } from "zod";

import { assertId, civilDate, idOf, limitReached, notFound, objectId, optionalText, requireMember } from "@/modules/access";
import { assertEventsOnWedding } from "@/modules/events/service";
import { EventModel, ExpenseModel, VendorModel } from "@/server/db/schemas";
import type { ExpenseDoc } from "@/server/db/documents";
import { ServiceError } from "@/server/http/handle";

export const EXPENSE_CATEGORIES = ["venue", "catering", "photography", "videography", "decoration", "clothing", "jewellery", "entertainment", "invitations", "gifts", "travel", "makeup", "miscellaneous"] as const;

function presentExpense(row: ExpenseDoc & { _id: unknown }, vendors: Map<string, string>, events: Map<string, string>) {
  const vendorId = row.vendorId ? idOf(row.vendorId) : null;
  const eventId = row.eventId ? idOf(row.eventId) : null;
  return {
    id: idOf(row._id),
    title: row.title,
    amountInr: row.amountInr,
    spentOn: row.spentOn,
    category: row.category,
    eventId,
    eventTitle: eventId ? events.get(eventId) ?? null : null,
    vendorId,
    vendorName: vendorId ? vendors.get(vendorId) ?? row.vendorLabel ?? null : row.vendorLabel ?? null,
    vendorLabel: row.vendorLabel ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function lookups(weddingId: mongoose.Types.ObjectId) {
  const [vendors, events] = await Promise.all([VendorModel.find({ weddingId }, { name: 1 }), EventModel.find({ weddingId }, { title: 1 })]);
  return {
    vendors: new Map(vendors.map((vendor) => [idOf(vendor._id), vendor.name])),
    events: new Map(events.map((event) => [idOf(event._id), event.title])),
  };
}

export async function listExpenses(request: Request) {
  const { weddingId } = await requireMember(request);
  const [rows, { vendors, events }] = await Promise.all([ExpenseModel.find({ weddingId }).sort({ spentOn: -1, _id: -1 }), lookups(weddingId)]);
  const items = rows.map((row) => presentExpense(row, vendors, events));
  const byCategory = new Map<string, { category: string; totalInr: number; count: number }>();
  for (const item of items) {
    const entry = byCategory.get(item.category) ?? { category: item.category, totalInr: 0, count: 0 };
    entry.totalInr += item.amountInr;
    entry.count += 1;
    byCategory.set(item.category, entry);
  }
  return {
    items,
    sumInr: items.reduce((sum, item) => sum + item.amountInr, 0),
    byCategory: [...byCategory.values()].sort((a, b) => b.totalInr - a.totalInr),
  };
}

const fields = {
  title: z.string().trim().min(1).max(140),
  amountInr: z.number().int().min(1, "Enter at least ₹1.").max(1_000_000_000),
  spentOn: civilDate,
  category: z.enum(EXPENSE_CATEGORIES),
  eventId: objectId.nullable(),
  vendorId: objectId.nullable(),
  vendorLabel: optionalText(120),
  notes: optionalText(1000),
};

const createSchema = z.object({ ...fields, eventId: fields.eventId.optional(), vendorId: fields.vendorId.optional() }).strict();
const updateSchema = z.object(fields).partial().strict();

async function assertVendor(weddingId: mongoose.Types.ObjectId, vendorId: string | null | undefined) {
  if (!vendorId) return;
  const vendor = await VendorModel.findOne({ _id: vendorId, weddingId });
  if (!vendor) throw new ServiceError(400, "VALIDATION_ERROR", "UNKNOWN_VENDOR", "Choose one of your saved vendors.", { path: "vendorId" });
}

async function one(weddingId: mongoose.Types.ObjectId, id: string) {
  const row = await ExpenseModel.findOne({ _id: id, weddingId });
  if (!row) notFound("expense");
  const { vendors, events } = await lookups(weddingId);
  return presentExpense(row, vendors, events);
}

export async function createExpense(request: Request, body: unknown) {
  const { user, weddingId } = await requireMember(request);
  const input = createSchema.parse(body);
  const count = await ExpenseModel.countDocuments({ weddingId });
  if (count >= 10000) limitReached("This wedding already has 10,000 expenses.");
  if (input.eventId) await assertEventsOnWedding(weddingId, [input.eventId]);
  await assertVendor(weddingId, input.vendorId);
  const row = await ExpenseModel.create({
    weddingId,
    title: input.title,
    amountInr: input.amountInr,
    spentOn: input.spentOn,
    category: input.category,
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.vendorId ? { vendorId: input.vendorId } : {}),
    ...(input.vendorLabel ? { vendorLabel: input.vendorLabel } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    createdBy: user._id,
    schemaVersion: 1,
  });
  return one(weddingId, idOf(row._id));
}

export async function updateExpense(request: Request, expenseId: string, body: unknown) {
  const { weddingId } = await requireMember(request);
  assertId(expenseId, "expense");
  const input = updateSchema.parse(body);
  const row = await ExpenseModel.findOne({ _id: expenseId, weddingId });
  if (!row) notFound("expense");
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  for (const field of ["title", "amountInr", "spentOn", "category"] as const) {
    if (input[field] !== undefined) set[field] = input[field];
  }
  if (input.eventId !== undefined) {
    if (input.eventId) {
      await assertEventsOnWedding(weddingId, [input.eventId]);
      set.eventId = input.eventId;
    } else unset.eventId = "";
  }
  if (input.vendorId !== undefined) {
    await assertVendor(weddingId, input.vendorId);
    if (input.vendorId) set.vendorId = input.vendorId;
    else unset.vendorId = "";
  }
  for (const field of ["vendorLabel", "notes"] as const) {
    if (input[field] === undefined) continue;
    if (input[field]) set[field] = input[field];
    else unset[field] = "";
  }
  await ExpenseModel.updateOne({ _id: row._id }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  return one(weddingId, expenseId);
}

export async function deleteExpense(request: Request, expenseId: string) {
  const { weddingId } = await requireMember(request);
  assertId(expenseId, "expense");
  const removed = await ExpenseModel.findOneAndDelete({ _id: expenseId, weddingId });
  if (!removed) notFound("expense");
}
