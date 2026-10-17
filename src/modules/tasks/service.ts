import "server-only";

import type mongoose from "mongoose";
import { z } from "zod";

import { assertId, civilDate, idOf, limitReached, notFound, objectId, optionalText, requireMember } from "@/modules/access";
import { assertEventsOnWedding } from "@/modules/events/service";
import { EventModel, MembershipModel, TaskModel, UserModel } from "@/server/db/schemas";
import type { TaskDoc } from "@/server/db/documents";
import { ServiceError } from "@/server/http/handle";

const STATUSES = ["todo", "doing", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

/** Names of everyone who can be given a task. No emails: a Manager uses this too. */
export async function listAssignees(request: Request) {
  const { weddingId } = await requireMember(request);
  const rows = await MembershipModel.find({ weddingId });
  const users = await UserModel.find({ _id: { $in: rows.map((row) => row.userId) } }).sort({ name: 1 });
  return { items: users.map((user) => ({ userId: idOf(user._id), name: user.name })) };
}

function presentTask(row: TaskDoc & { _id: unknown }, names: Map<string, string>, events: Map<string, string>, me: string) {
  const assigneeId = row.assigneeId ? idOf(row.assigneeId) : null;
  const eventId = row.eventId ? idOf(row.eventId) : null;
  return {
    id: idOf(row._id),
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority,
    assigneeId,
    assigneeName: assigneeId ? names.get(assigneeId) ?? "Former organiser" : null,
    mine: assigneeId === me,
    eventId,
    eventTitle: eventId ? events.get(eventId) ?? null : null,
    dueOn: row.dueOn ?? null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function taskOrder(a: { status: string; dueOn: string | null; priority: "low" | "medium" | "high" }, b: typeof a) {
  const doneA = a.status === "done" ? 1 : 0;
  const doneB = b.status === "done" ? 1 : 0;
  if (doneA !== doneB) return doneA - doneB;
  if (a.dueOn !== b.dueOn) {
    if (!a.dueOn) return 1;
    if (!b.dueOn) return -1;
    return a.dueOn < b.dueOn ? -1 : 1;
  }
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

async function lookups(weddingId: mongoose.Types.ObjectId) {
  const [memberships, events] = await Promise.all([MembershipModel.find({ weddingId }), EventModel.find({ weddingId }, { title: 1 })]);
  const users = await UserModel.find({ _id: { $in: memberships.map((row) => row.userId) } }, { name: 1 });
  return {
    names: new Map(users.map((user) => [idOf(user._id), user.name])),
    events: new Map(events.map((event) => [idOf(event._id), event.title])),
  };
}

export async function listTasks(request: Request) {
  const { user, weddingId } = await requireMember(request);
  const [rows, { names, events }] = await Promise.all([TaskModel.find({ weddingId }), lookups(weddingId)]);
  const items = rows.map((row) => presentTask(row, names, events, idOf(user._id))).sort(taskOrder);
  return { items };
}

const taskFields = {
  title: z.string().trim().min(1).max(140),
  description: optionalText(2000),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  assigneeId: objectId.nullable(),
  eventId: objectId.nullable(),
  dueOn: civilDate.nullable(),
};

const createSchema = z.object({
  ...taskFields,
  status: taskFields.status.optional(),
  priority: taskFields.priority.optional(),
  assigneeId: taskFields.assigneeId.optional(),
  eventId: taskFields.eventId.optional(),
  dueOn: taskFields.dueOn.optional(),
  assignToMe: z.boolean().optional(),
}).strict();

const updateSchema = z.object({ ...taskFields, assignToMe: z.boolean() }).partial().strict();

async function assertAssignee(weddingId: mongoose.Types.ObjectId, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const member = await MembershipModel.findOne({ weddingId, userId: assigneeId });
  if (!member) throw new ServiceError(400, "VALIDATION_ERROR", "UNKNOWN_ASSIGNEE", "Assign the task to someone organising this wedding.", { path: "assigneeId" });
}

async function one(request: Request, taskId: string) {
  const { user, weddingId } = await requireMember(request);
  const row = await TaskModel.findOne({ _id: taskId, weddingId });
  if (!row) notFound("task");
  const { names, events } = await lookups(weddingId);
  return presentTask(row, names, events, idOf(user._id));
}

export async function createTask(request: Request, body: unknown) {
  const { user, weddingId } = await requireMember(request);
  const input = createSchema.parse(body);
  const count = await TaskModel.countDocuments({ weddingId });
  if (count >= 2000) limitReached("This wedding already has 2,000 tasks.");
  const assigneeId = input.assignToMe ? idOf(user._id) : input.assigneeId ?? null;
  await assertAssignee(weddingId, assigneeId);
  if (input.eventId) await assertEventsOnWedding(weddingId, [input.eventId]);
  const status = input.status ?? "todo";
  const row = await TaskModel.create({
    weddingId,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    status,
    priority: input.priority ?? "medium",
    ...(assigneeId ? { assigneeId } : {}),
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.dueOn ? { dueOn: input.dueOn } : {}),
    ...(status === "done" ? { completedAt: new Date() } : {}),
    createdBy: user._id,
    schemaVersion: 1,
  });
  return one(request, idOf(row._id));
}

export async function updateTask(request: Request, taskId: string, body: unknown) {
  const { user, weddingId } = await requireMember(request);
  assertId(taskId, "task");
  const input = updateSchema.parse(body);
  const row = await TaskModel.findOne({ _id: taskId, weddingId });
  if (!row) notFound("task");
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) {
    if (input.description) set.description = input.description;
    else unset.description = "";
  }
  if (input.priority !== undefined) set.priority = input.priority;
  if (input.status !== undefined) {
    set.status = input.status;
    if (input.status === "done") set.completedAt = row.status === "done" && row.completedAt ? row.completedAt : new Date();
    else unset.completedAt = "";
  }
  const assigneeId = input.assignToMe === true ? idOf(user._id) : input.assignToMe === false ? null : input.assigneeId;
  if (assigneeId !== undefined) {
    await assertAssignee(weddingId, assigneeId);
    if (assigneeId) set.assigneeId = assigneeId;
    else unset.assigneeId = "";
  }
  if (input.eventId !== undefined) {
    if (input.eventId) {
      await assertEventsOnWedding(weddingId, [input.eventId]);
      set.eventId = input.eventId;
    } else unset.eventId = "";
  }
  if (input.dueOn !== undefined) {
    if (input.dueOn) set.dueOn = input.dueOn;
    else unset.dueOn = "";
  }
  await TaskModel.updateOne({ _id: row._id }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  return one(request, taskId);
}

export async function deleteTask(request: Request, taskId: string) {
  const { weddingId } = await requireMember(request);
  assertId(taskId, "task");
  const removed = await TaskModel.findOneAndDelete({ _id: taskId, weddingId });
  if (!removed) notFound("task");
}
