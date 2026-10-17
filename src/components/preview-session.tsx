"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { sendGalleryFile } from "@/components/gallery-upload";
import { civilDateInIndia, clockInIndia, instantInIndia } from "@/data/india-time";
import { passwordProblem } from "@/data/password-rules";
import {
  CREDENTIALS_ERROR,
  sampleOrganisers,
  weddingFields,
  type PreviewEvent,
  type PreviewMember,
  type PreviewPerson,
  type PreviewWedding,
  type Role,
} from "@/data/preview";

type HouseholdRow = {
  id: string;
  name: string;
  side: string;
  maxPeople: number;
  invitedEventIds: string[];
  reply: string;
  email: string | null;
  invitationEmailSentAt: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  who: string;
  mine: boolean;
};

type ExpenseRow = {
  id: string;
  title: string;
  amountInr: number;
  spentOn: string;
  category: string;
};

type VendorRow = {
  id: string;
  name: string;
  category: string;
  person: string;
  phone: string;
  cost: number | null;
};

type PhotoRow = { id: string; title: string; url: string; kind?: "photo" | "video" };

type Counts = {
  events: number;
  tasksDone: number;
  tasksTotal: number;
  households: number;
  replies: number;
  expensesTotalInr: number;
  vendors: number;
};

type SiteState = {
  slug: string;
  published: boolean;
  packId: string;
  liveUrl: string;
};

type WorkspaceState = {
  person: PreviewPerson | null;
  wedding: PreviewWedding | null;
  members: PreviewMember[];
  invitations: { id: string; email: string; role: Role }[];
  events: PreviewEvent[];
  households: HouseholdRow[];
  tasks: TaskRow[];
  expenses: ExpenseRow[];
  vendors: VendorRow[];
  photos: PhotoRow[];
  galleryUrl: string | null;
  guestUploadEnabled: boolean;
  directUpload: boolean;
  uploadPrefix: string;
  site: SiteState | null;
  counts: Counts;
  days: number | null;
};

type PreviewContextValue = WorkspaceState & {
  ready: boolean;
  sample: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; next: string }>;
  createAccount: (name: string, email: string, password: string, confirm: string) => Promise<{ error: string | null; next: string }>;
  saveWedding: (wedding: PreviewWedding) => Promise<string | null>;
  signOut: () => Promise<void>;
  setMemberRole: (email: string, role: Role) => Promise<boolean>;
  removeMember: (email: string) => Promise<boolean>;
  inviteMember: (member: PreviewMember) => Promise<string | null>;
  resendInvitation: (id: string) => Promise<string | null>;
  revokeInvitation: (id: string) => Promise<string | null>;
  addEvent: (event: PreviewEvent) => Promise<boolean>;
  removeEvent: (id: string) => Promise<boolean>;
  addHousehold: (input: { name: string; side: "bride" | "groom" | "other"; maxPeople: number; email?: string; invitedEventIds?: string[] }) => Promise<string | null>;
  sendHouseholdEmail: (id: string) => Promise<string | null>;
  addTask: (input: { title: string; priority: TaskRow["priority"]; assignToMe?: boolean }) => Promise<string | null>;
  updateTask: (id: string, input: { status?: TaskRow["status"]; assignToMe?: boolean }) => Promise<string | null>;
  uploadPhoto: (file: File) => Promise<string | null>;
  deletePhoto: (id: string) => Promise<string | null>;
  setGuestUpload: (enabled: boolean) => Promise<string | null>;
  publishSite: (input: SiteState) => Promise<string | null>;
  addExpense: (input: { title: string; amountInr: number; spentOn: string; category: string }) => Promise<string | null>;
  addVendor: (input: { name: string; category: string; contactPerson: string; phone: string; agreedCostInr: number }) => Promise<string | null>;
  resetPassword: (token: string, password: string, confirm: string) => Promise<string | null>;
  requestReset: (email: string) => Promise<string | null>;
};

const emptyCounts: Counts = { events: 0, tasksDone: 0, tasksTotal: 0, households: 0, replies: 0, expensesTotalInr: 0, vendors: 0 };

const emptyState: WorkspaceState = {
  person: null,
  wedding: null,
  members: [],
  invitations: [],
  events: [],
  households: [],
  tasks: [],
  expenses: [],
  vendors: [],
  photos: [],
  galleryUrl: null,
  guestUploadEnabled: true,
  directUpload: false,
  uploadPrefix: "",
  site: null,
  counts: emptyCounts,
  days: null,
};

const PreviewContext = createContext<PreviewContextValue | null>(null);

async function readProblem(response: Response) {
  return response.json().catch(() => null) as Promise<{ reason?: string; detail?: string } | null>;
}

function explain(body: { reason?: string; detail?: string } | null, fallback: string) {
  if (body?.reason === "INVALID_CREDENTIALS") return CREDENTIALS_ERROR;
  if (body?.reason === "EMAIL_TAKEN") return "That email already has an account.";
  if (body?.reason === "INVALID_EMAIL" || body?.detail === "Enter a valid email address.") return "Enter a valid email address.";
  if (body?.reason === "DEPENDENCY_UNAVAILABLE") return body.detail || "The email did not go out. Try again in a moment.";
  if (body?.reason === "NO_EMAIL") return "Add an email address before sending.";
  if (body?.reason === "INVALID_TOKEN") return body.detail || "That link is no longer valid.";
  if (body?.reason === "FILE_TOO_LARGE" || body?.reason === "UNSUPPORTED_FILE" || body?.reason === "UPLOADS_DISABLED") return body.detail || fallback;
  if (body?.reason === "SLUG_TAKEN" || body?.reason === "SLUG_RESERVED" || body?.reason === "LIVE_URL" || body?.reason === "LIMIT_REACHED") return body.detail || fallback;
  return body?.detail || fallback;
}

async function loadWorkspace(): Promise<WorkspaceState> {
  const meResponse = await fetch("/api/me", { cache: "no-store" });
  if (!meResponse.ok) return emptyState;
  const me = await meResponse.json() as {
    user: { name: string; email: string };
    membership: { role: Role } | null;
    wedding: { brideName: string; groomName: string; title: string | null; weddingDate: string; city: string } | null;
  };
  const person: PreviewPerson = {
    name: me.user.name,
    email: me.user.email,
    role: me.membership?.role ?? "admin",
  };
  const detailResponse = me.wedding ? await fetch("/api/wedding", { cache: "no-store" }) : null;
  const detail = detailResponse?.ok
    ? await detailResponse.json() as {
        title: string | null;
        story: string | null;
        site?: { slug: string | null; published: boolean; packId: string; liveUrl: string | null };
      }
    : null;
  const wedding = me.wedding
    ? {
        bride: me.wedding.brideName,
        groom: me.wedding.groomName,
        date: me.wedding.weddingDate,
        city: me.wedding.city,
        title: detail?.title ?? me.wedding.title ?? "",
        story: detail?.story ?? "",
      }
    : null;
  if (!me.wedding) return { ...emptyState, person };

  const [eventsResponse, householdResponse, taskResponse, expenseResponse, vendorResponse, photoResponse, dashboardResponse, memberResponse] = await Promise.all([
    fetch("/api/events", { cache: "no-store" }),
    fetch("/api/households", { cache: "no-store" }),
    fetch("/api/tasks", { cache: "no-store" }),
    fetch("/api/expenses", { cache: "no-store" }),
    fetch("/api/vendors", { cache: "no-store" }),
    fetch("/api/gallery", { cache: "no-store" }),
    fetch("/api/dashboard", { cache: "no-store" }),
    person.role === "admin" ? fetch("/api/members", { cache: "no-store" }) : Promise.resolve(null),
  ]);

  const eventsBody = eventsResponse.ok ? await eventsResponse.json() as { items: Array<{ id: string; title: string; startsAt: string; isPrimary: boolean; muhuratAt: string | null; venue: { name: string | null; address: string | null; city: string | null } | null }> } : { items: [] };
  const events: PreviewEvent[] = eventsBody.items.map((item) => ({
    id: item.id,
    title: item.title,
    date: civilDateInIndia(new Date(item.startsAt)),
    time: clockInIndia(new Date(item.startsAt)),
    venue: item.venue?.name ?? "",
    address: item.venue?.address ?? "",
    city: item.venue?.city ?? "",
    primary: item.isPrimary,
    muhurat: item.muhuratAt ? clockInIndia(new Date(item.muhuratAt)) : "",
  }));

  const householdBody = householdResponse.ok ? await householdResponse.json() as { items: Array<{ id: string; name: string; side: string; maxPeople: number; invitedEventIds: string[]; email: string | null; invitationEmailSentAt: string | null; rsvps: Array<{ status: string; attendingCount: number }> }> } : { items: [] };
  const households = householdBody.items.map((item) => {
    const yes = item.rsvps.find((reply) => reply.status === "yes");
    const no = item.rsvps.find((reply) => reply.status === "no");
    return {
      id: item.id,
      name: item.name,
      side: item.side,
      maxPeople: item.maxPeople,
      invitedEventIds: item.invitedEventIds,
      email: item.email,
      invitationEmailSentAt: item.invitationEmailSentAt,
      reply: yes ? `${yes.attendingCount} yes` : no ? "No" : "Waiting",
    };
  });

  const taskBody = taskResponse.ok ? await taskResponse.json() as { items: Array<TaskRow & { assigneeName?: string | null }> } : { items: [] };
  const tasks = (taskBody.items ?? []).map((item) => ({ ...item, who: item.assigneeName || "Open", mine: Boolean(item.mine) }));
  const expenseBody = expenseResponse.ok ? await expenseResponse.json() as { items: ExpenseRow[] } : { items: [] };
  const vendorBody = vendorResponse.ok ? await vendorResponse.json() as { items: Array<{ id: string; name: string; category: string; contactPerson: string | null; phone: string | null; agreedCostInr: number | null }> } : { items: [] };
  const photoBody = photoResponse.ok ? await photoResponse.json() as { items: PhotoRow[]; url?: string; guestUploadEnabled?: boolean; directUpload?: boolean; uploadPrefix?: string } : { items: [] };
  const rawSlug = detail?.site?.slug ?? "";
  const reservedSlug = rawSlug === "aanya-and-kabir";
  const dashboardBody = dashboardResponse.ok ? await dashboardResponse.json() as { counts: Counts; countdown: { daysToGo: number } } : null;
  const memberBody = memberResponse && memberResponse.ok
    ? await memberResponse.json() as { members: Array<{ userId: string; name: string; email: string; role: Role }>; invitations: Array<{ id: string; email: string; role: Role }> }
    : { members: [], invitations: [] };

  return {
    person,
    wedding,
    members: memberBody.members.map((member) => ({ ...member, userId: member.userId })),
    invitations: memberBody.invitations,
    events,
    households,
    tasks,
    expenses: expenseBody.items ?? [],
    vendors: vendorBody.items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      person: item.contactPerson ?? "",
      phone: item.phone ?? "",
      cost: item.agreedCostInr,
    })),
    photos: (photoBody.items ?? []).filter((item) => item.url),
    galleryUrl: photoBody.url ?? null,
    guestUploadEnabled: photoBody.guestUploadEnabled !== false,
    directUpload: photoBody.directUpload === true,
    uploadPrefix: photoBody.uploadPrefix ?? "",
    site: {
      slug: reservedSlug ? "" : rawSlug,
      published: Boolean(detail?.site?.published) && !reservedSlug,
      packId: detail?.site?.packId || "classical",
      liveUrl: detail?.site?.liveUrl ?? "",
    },
    counts: { ...emptyCounts, ...dashboardBody?.counts },
    days: dashboardBody?.countdown.daysToGo ?? null,
  };
}

async function send(path: string, method: string, body?: unknown) {
  return fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function PreviewSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(emptyState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const next = await loadWorkspace();
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    loadWorkspace().then((next) => {
      if (!active) return;
      setState(next);
      setReady(true);
    }).catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const sample = sampleOrganisers.some((person) => person.email === state.person?.email);

  const value: PreviewContextValue = {
    ...state,
    ready,
    sample,
    async signIn(email, password) {
      const response = await send("/api/auth/login", "POST", { email, password });
      if (!response.ok) return { error: explain(await readProblem(response), CREDENTIALS_ERROR), next: "" };
      const me = await response.json() as { wedding: unknown };
      await refresh();
      return { error: null, next: me.wedding ? "/app" : "/wedding/new" };
    },
    async createAccount(name, email, password, confirm) {
      const weak = passwordProblem(password);
      if (weak) return { error: weak, next: "" };
      if (password !== confirm) return { error: "Those passwords do not match.", next: "" };
      const response = await send("/api/auth/signup", "POST", { name, email, password });
      if (!response.ok) return { error: explain(await readProblem(response), "Could not create the account."), next: "" };
      const me = await response.json() as { wedding: unknown };
      await refresh();
      return { error: null, next: me.wedding ? "/app" : "/wedding/new" };
    },
    async saveWedding(wedding) {
      const fields = weddingFields(wedding);
      if (!fields) return null;
      const body = {
        brideName: fields.bride,
        groomName: fields.groom,
        weddingDate: fields.date,
        city: fields.city,
        title: fields.title || null,
        story: fields.story || null,
      };
      const editing = Boolean(state.wedding);
      const response = await send("/api/wedding", editing ? "PATCH" : "POST", body);
      if (!response.ok) return null;
      await refresh();
      return editing ? "/app/details" : "/app/events";
    },
    async signOut() {
      await send("/api/auth/logout", "POST");
      setState(emptyState);
    },
    async setMemberRole(email, role) {
      const member = state.members.find((item) => item.email === email);
      if (!member?.userId) return false;
      const response = await send(`/api/members/${member.userId}`, "PATCH", { role });
      if (!response.ok) return false;
      await refresh();
      return true;
    },
    async removeMember(email) {
      const member = state.members.find((item) => item.email === email);
      if (!member?.userId) return false;
      const response = await send(`/api/members/${member.userId}`, "DELETE");
      if (!response.ok) return false;
      await refresh();
      return true;
    },
    async inviteMember(member) {
      const response = await send("/api/members/invitations", "POST", { email: member.email, role: member.role });
      const problem = response.ok ? null : await readProblem(response);
      if (response.ok || problem?.reason === "DEPENDENCY_UNAVAILABLE") await refresh();
      if (!response.ok) return explain(problem, "Could not send the invitation.");
      return null;
    },
    async resendInvitation(id) {
      const response = await send(`/api/members/invitations/${id}/resend`, "POST");
      if (!response.ok) return explain(await readProblem(response), "Could not resend the invitation.");
      await refresh();
      return null;
    },
    async revokeInvitation(id) {
      const response = await send(`/api/members/invitations/${id}`, "DELETE");
      if (!response.ok) return explain(await readProblem(response), "Could not withdraw the invitation.");
      await refresh();
      return null;
    },
    async addEvent(event) {
      const starts = instantInIndia(event.date, event.time || "12:00 pm");
      if (!event.title.trim() || !starts) return false;
      const muhurat = event.muhurat ? instantInIndia(event.date, event.muhurat) : null;
      const venue = event.venue || event.address || event.city
        ? { name: event.venue || undefined, address: event.address || undefined, city: event.city || undefined }
        : undefined;
      const response = await send("/api/events", "POST", {
        title: event.title.trim(),
        startsAt: starts.toISOString(),
        isPrimary: event.primary,
        muhuratAt: muhurat ? muhurat.toISOString() : null,
        venue,
      });
      if (!response.ok) return false;
      await refresh();
      return true;
    },
    async removeEvent(id) {
      const response = await send(`/api/events/${id}`, "DELETE");
      if (!response.ok) return false;
      await refresh();
      return true;
    },
    async addHousehold(input) {
      const email = input.email?.trim();
      const response = await send("/api/households", "POST", {
        name: input.name,
        side: input.side,
        maxPeople: input.maxPeople,
        invitedEventIds: input.invitedEventIds ?? state.events.map((event) => event.id),
        ...(email ? { email } : {}),
      });
      if (!response.ok) return explain(await readProblem(response), "Could not add that household.");
      await refresh();
      return null;
    },
    async sendHouseholdEmail(id) {
      const response = await send(`/api/households/${id}/invite-email`, "POST");
      if (!response.ok) return explain(await readProblem(response), "Could not send that email.");
      await refresh();
      return null;
    },
    async addTask(input) {
      const response = await send("/api/tasks", "POST", input);
      if (!response.ok) return explain(await readProblem(response), "Could not add that task.");
      await refresh();
      return null;
    },
    async updateTask(id, input) {
      const response = await send(`/api/tasks/${id}`, "PATCH", input);
      if (!response.ok) return explain(await readProblem(response), "Could not update that task.");
      await refresh();
      return null;
    },
    async uploadPhoto(file) {
      const failure = await sendGalleryFile(file, {
        direct: state.directUpload,
        prefix: state.uploadPrefix,
        handleUrl: "/api/gallery/upload",
        registerUrl: "/api/gallery/register",
        fallbackUrl: "/api/gallery",
      });
      if (failure) return failure;
      await refresh();
      return null;
    },
    async deletePhoto(id) {
      const response = await send(`/api/gallery/items/${id}`, "DELETE");
      if (!response.ok) return explain(await readProblem(response), "Could not remove that photograph.");
      await refresh();
      return null;
    },
    async setGuestUpload(enabled) {
      const response = await send("/api/gallery", "PATCH", { guestUploadEnabled: enabled });
      if (!response.ok) return explain(await readProblem(response), "Could not change guest upload.");
      await refresh();
      return null;
    },
    async publishSite(input) {
      const response = await send("/api/wedding/site", "PATCH", {
        slug: input.slug,
        published: input.published,
        packId: input.packId,
        ...(input.liveUrl ? { liveUrl: input.liveUrl } : {}),
      });
      if (!response.ok) return explain(await readProblem(response), "Could not save the guest site.");
      await refresh();
      return null;
    },
    async addExpense(input) {
      const response = await send("/api/expenses", "POST", input);
      if (!response.ok) return explain(await readProblem(response), "Could not add that expense.");
      await refresh();
      return null;
    },
    async addVendor(input) {
      const response = await send("/api/vendors", "POST", input);
      if (!response.ok) return explain(await readProblem(response), "Could not save that vendor.");
      await refresh();
      return null;
    },
    async resetPassword(token, password, confirm) {
      const weak = passwordProblem(password);
      if (weak) return weak;
      if (password !== confirm) return "Those passwords do not match.";
      const response = await send("/api/auth/reset-password", "POST", { token, password });
      if (!response.ok) return explain(await readProblem(response), "Could not reset the password.");
      return null;
    },
    async requestReset(email) {
      const response = await send("/api/auth/forgot-password", "POST", { email });
      if (!response.ok) return explain(await readProblem(response), "Could not send the reset link.");
      return null;
    },
  };

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview() {
  const value = useContext(PreviewContext);
  if (!value) throw new Error("Preview session is missing.");
  return value;
}
