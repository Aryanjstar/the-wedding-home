import { passwordProblem } from "@/data/password-rules";

export type Role = "admin" | "manager";

export type PreviewPerson = {
  name: string;
  email: string;
  role: Role;
};

export type PreviewWedding = {
  bride: string;
  groom: string;
  date: string;
  city: string;
  title?: string;
  story?: string;
};

export type PreviewMember = PreviewPerson & { userId?: string };

export type PreviewEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  city: string;
  primary: boolean;
  muhurat: string;
};

export type PreviewWorkspace = {
  id: string;
  sample: boolean;
  wedding: PreviewWedding | null;
  members: PreviewMember[];
  events: PreviewEvent[];
};

export type PreviewAccount = {
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  workspaceId: string;
};

export type PreviewStore = {
  currentEmail: string | null;
  accounts: PreviewAccount[];
  workspaces: PreviewWorkspace[];
};

export const PREVIEW_PASSWORD = "preview";

/** bcrypt cost 12 of PREVIEW_PASSWORD. Sample organisers share it in this browser preview. */
export const SAMPLE_PASSWORD_HASH = "$2b$12$/.ezbPzjlwkYVj4Kd8av3OAIpw3Arhr3MDnrzGqFa75XANSNo7Tj6";

export const SAMPLE_WORKSPACE_ID = "sample";

export const CREDENTIALS_ERROR = "That email and password do not match.";

export const sampleOrganisers: PreviewPerson[] = [
  { name: "Aanya Sharma", email: "aanya@example.com", role: "admin" },
  { name: "Kabir Mehta", email: "kabir@example.com", role: "admin" },
  { name: "Ritu Sharma", email: "ritu@example.com", role: "manager" },
  { name: "Arjun Mehta", email: "arjun@example.com", role: "manager" },
];

export const sampleWedding: PreviewWedding = {
  bride: "Aanya Sharma",
  groom: "Kabir Mehta",
  date: "2026-12-18",
  city: "Jaipur",
};

export const eventShortcuts = ["Haldi", "Mehendi", "Sangeet", "Wedding", "Reception", "Roka", "Engagement", "Cocktail"] as const;

export function organiserFromEmail(email: string, name?: string): PreviewPerson {
  const normalized = normalizeEmail(email);
  const known = sampleOrganisers.find((person) => person.email === normalized);
  if (known) return known;
  const fallback = name?.trim() || normalized.split("@")[0] || "Organiser";
  return { name: fallback, email: normalized, role: "admin" };
}

export function previewSignInHint() {
  const admins = sampleOrganisers.filter((person) => person.role === "admin").map((person) => person.name.split(" ")[0]);
  const managers = sampleOrganisers.filter((person) => person.role === "manager").map((person) => person.name.split(" ")[0]);
  return `${admins.join(" and ")} sign in as Admin. ${managers.join(" and ")} sign in as Manager. The preview password is ${PREVIEW_PASSWORD}.`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function membersAfterRoleChange(members: PreviewMember[], email: string, role: Role) {
  const next = members.map((member) => (member.email === email ? { ...member, role } : member));
  if (!next.some((member) => member.role === "admin")) return null;
  return next;
}

export function membersAfterRemove(members: PreviewMember[], email: string, selfEmail: string) {
  if (email === selfEmail) return null;
  const target = members.find((member) => member.email === email);
  if (!target) return null;
  const remaining = members.filter((member) => member.email !== email);
  if (target.role === "admin" && !remaining.some((member) => member.role === "admin")) return null;
  return remaining;
}

function sampleWorkspace(): PreviewWorkspace {
  return {
    id: SAMPLE_WORKSPACE_ID,
    sample: true,
    wedding: { ...sampleWedding },
    members: sampleOrganisers.map((person) => ({ ...person })),
    events: [],
  };
}

function sampleAccounts(): PreviewAccount[] {
  return sampleOrganisers.map((person) => ({
    email: person.email,
    name: person.name,
    role: person.role,
    passwordHash: SAMPLE_PASSWORD_HASH,
    workspaceId: SAMPLE_WORKSPACE_ID,
  }));
}

export function initialStore(): PreviewStore {
  return {
    currentEmail: null,
    accounts: sampleAccounts(),
    workspaces: [sampleWorkspace()],
  };
}

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "manager";
}

function isAccount(value: unknown): value is PreviewAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as PreviewAccount;
  return typeof account.email === "string" && typeof account.name === "string" && isRole(account.role) && typeof account.passwordHash === "string" && typeof account.workspaceId === "string";
}

function isWedding(value: unknown): value is PreviewWedding | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const wedding = value as PreviewWedding;
  return typeof wedding.bride === "string" && typeof wedding.groom === "string" && typeof wedding.date === "string" && typeof wedding.city === "string";
}

function isMember(value: unknown): value is PreviewMember {
  if (!value || typeof value !== "object") return false;
  const member = value as PreviewMember;
  return typeof member.name === "string" && typeof member.email === "string" && isRole(member.role);
}

function isEvent(value: unknown): value is PreviewEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as PreviewEvent;
  return typeof event.id === "string" && typeof event.title === "string" && typeof event.date === "string" && typeof event.primary === "boolean";
}

function isWorkspace(value: unknown): value is PreviewWorkspace {
  if (!value || typeof value !== "object") return false;
  const workspace = value as PreviewWorkspace;
  return typeof workspace.id === "string" && typeof workspace.sample === "boolean" && isWedding(workspace.wedding) && Array.isArray(workspace.members) && workspace.members.every(isMember) && Array.isArray(workspace.events) && workspace.events.every(isEvent);
}

function ensureSample(store: PreviewStore): PreviewStore {
  const accounts = [...store.accounts];
  for (const sample of sampleAccounts()) {
    if (!accounts.some((account) => account.email === sample.email)) accounts.push(sample);
  }
  const workspaces = [...store.workspaces];
  if (!workspaces.some((workspace) => workspace.id === SAMPLE_WORKSPACE_ID)) workspaces.unshift(sampleWorkspace());
  const currentEmail = accounts.some((account) => account.email === store.currentEmail) ? store.currentEmail : null;
  return { currentEmail, accounts, workspaces };
}

function migrateLegacy(person: PreviewPerson, wedding: PreviewWedding | null, members: PreviewMember[]): PreviewStore {
  const store = initialStore();
  const email = normalizeEmail(person.email);
  if (store.accounts.some((account) => account.email === email)) {
    return ensureSample({
      ...store,
      currentEmail: email,
      workspaces: store.workspaces.map((workspace) => (
        workspace.id === SAMPLE_WORKSPACE_ID
          ? { ...workspace, wedding: wedding ?? workspace.wedding, members: members.length ? members : workspace.members }
          : workspace
      )),
    });
  }
  const role = isRole(person.role) ? person.role : "admin";
  const organiser = { name: person.name || email, email, role };
  return {
    currentEmail: email,
    accounts: [...store.accounts, { ...organiser, passwordHash: "", workspaceId: "migrated" }],
    workspaces: [...store.workspaces, { id: "migrated", sample: false, wedding, members: members.length ? members : [organiser], events: [] }],
  };
}

export function hydrateStore(raw: string): PreviewStore {
  if (!raw) return initialStore();
  try {
    const parsed = JSON.parse(raw) as {
      currentEmail?: unknown;
      accounts?: unknown;
      workspaces?: unknown;
      person?: PreviewPerson;
      wedding?: PreviewWedding | null;
      members?: PreviewMember[];
    };
    if (Array.isArray(parsed.accounts) && Array.isArray(parsed.workspaces)) {
      return ensureSample({
        currentEmail: typeof parsed.currentEmail === "string" ? normalizeEmail(parsed.currentEmail) : null,
        accounts: parsed.accounts.filter(isAccount),
        workspaces: parsed.workspaces.filter(isWorkspace),
      });
    }
    if (parsed.person?.email && isRole(parsed.person.role)) {
      return migrateLegacy(parsed.person, isWedding(parsed.wedding) ? parsed.wedding : null, Array.isArray(parsed.members) ? parsed.members.filter(isMember) : []);
    }
  } catch {
    return initialStore();
  }
  return initialStore();
}

export function currentSession(store: PreviewStore) {
  if (!store.currentEmail) return null;
  const account = store.accounts.find((item) => item.email === store.currentEmail);
  if (!account) return null;
  const workspace = store.workspaces.find((item) => item.id === account.workspaceId);
  if (!workspace) return null;
  return { account, workspace };
}

export function personFromAccount(account: PreviewAccount): PreviewPerson {
  return { name: account.name, email: account.email, role: account.role };
}

export function accountByEmail(store: PreviewStore, email: string) {
  return store.accounts.find((account) => account.email === normalizeEmail(email)) ?? null;
}

export function validatePassword(password: string, confirm: string) {
  const weak = passwordProblem(password);
  if (weak) return weak;
  if (password !== confirm) return "Those passwords do not match.";
  return null;
}

export function validateSignUp(name: string, email: string, password: string, confirm: string) {
  if (!name.trim()) return "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) return "Enter a valid email.";
  return validatePassword(password, confirm);
}

export function registerAccount(
  store: PreviewStore,
  input: { name: string; email: string; password: string; confirm: string; passwordHash: string },
  workspaceId: string,
): { store: PreviewStore; error: string | null; next: string } {
  const error = validateSignUp(input.name, input.email, input.password, input.confirm);
  if (error) return { store, error, next: "" };
  const email = normalizeEmail(input.email);
  if (store.accounts.some((account) => account.email === email)) {
    return { store, error: "That email already has an account.", next: "" };
  }
  const invited = store.workspaces.find((workspace) => workspace.members.some((member) => member.email === email));
  const name = input.name.trim();
  if (invited) {
    const member = invited.members.find((item) => item.email === email);
    const role = member?.role ?? "manager";
    const account: PreviewAccount = { email, name: name || member?.name || email, role, passwordHash: input.passwordHash, workspaceId: invited.id };
    return {
      store: {
        ...store,
        currentEmail: email,
        accounts: [...store.accounts, account],
        workspaces: store.workspaces.map((workspace) => (
          workspace.id === invited.id
            ? { ...workspace, members: workspace.members.map((item) => (item.email === email ? { ...item, name: account.name } : item)) }
            : workspace
        )),
      },
      error: null,
      next: invited.wedding ? "/app" : "/wedding/new",
    };
  }
  const person: PreviewPerson = { name, email, role: "admin" };
  return {
    store: {
      ...store,
      currentEmail: email,
      accounts: [...store.accounts, { ...person, passwordHash: input.passwordHash, workspaceId }],
      workspaces: [...store.workspaces, { id: workspaceId, sample: false, wedding: null, members: [person], events: [] }],
    },
    error: null,
    next: "/wedding/new",
  };
}

export function beginSession(store: PreviewStore, email: string): PreviewStore {
  return { ...store, currentEmail: normalizeEmail(email) };
}

export function endSession(store: PreviewStore): PreviewStore {
  return { ...store, currentEmail: null };
}

export function replacePassword(store: PreviewStore, email: string, passwordHash: string): PreviewStore {
  const normalized = normalizeEmail(email);
  if (!store.accounts.some((account) => account.email === normalized)) return store;
  return {
    ...store,
    accounts: store.accounts.map((account) => (account.email === normalized ? { ...account, passwordHash } : account)),
  };
}

function withWorkspace(store: PreviewStore, workspaceId: string, update: (workspace: PreviewWorkspace) => PreviewWorkspace): PreviewStore {
  return {
    ...store,
    workspaces: store.workspaces.map((workspace) => (workspace.id === workspaceId ? update(workspace) : workspace)),
  };
}

export function weddingFields(wedding: PreviewWedding) {
  const next = {
    bride: wedding.bride.trim(),
    groom: wedding.groom.trim(),
    date: wedding.date.trim(),
    city: wedding.city.trim(),
    title: (wedding.title ?? "").trim(),
    story: (wedding.story ?? "").trim(),
  };
  if (!next.bride || !next.groom || !next.date || !next.city) return null;
  return next;
}

export function saveWeddingOnStore(store: PreviewStore, wedding: PreviewWedding): { store: PreviewStore; next: string } | null {
  const session = currentSession(store);
  const next = weddingFields(wedding);
  if (!session || !next) return null;
  const created = !session.workspace.wedding;
  const saved = withWorkspace(store, session.workspace.id, (workspace) => ({ ...workspace, wedding: next }));
  const workspace = saved.workspaces.find((item) => item.id === session.workspace.id);
  const destination = !created ? "/app/details" : workspace && !workspace.sample && workspace.events.length === 0 ? "/app/events" : "/app";
  return { store: saved, next: destination };
}

export function setRoleOnStore(store: PreviewStore, email: string, role: Role): PreviewStore | null {
  const session = currentSession(store);
  if (!session || session.account.role !== "admin") return null;
  const normalized = normalizeEmail(email);
  const members = membersAfterRoleChange(session.workspace.members, normalized, role);
  if (!members) return null;
  const accounts = store.accounts.map((account) => (
    account.workspaceId === session.workspace.id && account.email === normalized ? { ...account, role } : account
  ));
  return withWorkspace({ ...store, accounts }, session.workspace.id, (workspace) => ({ ...workspace, members }));
}

export function removeMemberOnStore(store: PreviewStore, email: string): PreviewStore | null {
  const session = currentSession(store);
  if (!session || session.account.role !== "admin") return null;
  const normalized = normalizeEmail(email);
  const members = membersAfterRemove(session.workspace.members, normalized, session.account.email);
  if (!members) return null;
  const accounts = store.accounts.filter((account) => !(account.email === normalized && account.workspaceId === session.workspace.id));
  return withWorkspace({ ...store, accounts }, session.workspace.id, (workspace) => ({ ...workspace, members }));
}

export function inviteMemberOnStore(store: PreviewStore, member: PreviewMember): { store: PreviewStore; error: string | null } {
  const session = currentSession(store);
  if (!session || session.account.role !== "admin") return { store, error: "Only an Admin can invite." };
  const email = normalizeEmail(member.email);
  const name = member.name.trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { store, error: "Enter a name and email." };
  if (session.workspace.members.some((item) => item.email === email)) {
    return { store, error: "That email is already on this wedding." };
  }
  const elsewhere = store.accounts.some((account) => account.email === email)
    || store.workspaces.some((workspace) => workspace.id !== session.workspace.id && workspace.members.some((item) => item.email === email));
  if (elsewhere) return { store, error: "That email is already on a wedding." };
  const role: Role = member.role === "admin" ? "admin" : "manager";
  return {
    store: withWorkspace(store, session.workspace.id, (workspace) => ({
      ...workspace,
      members: [...workspace.members, { name, email, role }],
    })),
    error: null,
  };
}

export function addEventOnStore(store: PreviewStore, event: PreviewEvent): PreviewStore | null {
  const session = currentSession(store);
  if (!session || session.workspace.sample) return null;
  const title = event.title.trim();
  const date = event.date.trim();
  if (!title || !date || !event.id) return null;
  if (session.workspace.events.some((item) => item.id === event.id)) return null;
  const next: PreviewEvent = {
    id: event.id,
    title,
    date,
    time: event.time.trim(),
    venue: event.venue.trim(),
    address: event.address.trim(),
    city: event.city.trim(),
    primary: event.primary,
    muhurat: event.muhurat.trim(),
  };
  return withWorkspace(store, session.workspace.id, (workspace) => ({
    ...workspace,
    events: [...(next.primary ? workspace.events.map((item) => ({ ...item, primary: false })) : workspace.events), next],
  }));
}

export function removeEventOnStore(store: PreviewStore, id: string): PreviewStore | null {
  const session = currentSession(store);
  if (!session || session.workspace.sample) return null;
  if (!session.workspace.events.some((event) => event.id === id)) return null;
  return withWorkspace(store, session.workspace.id, (workspace) => ({
    ...workspace,
    events: workspace.events.filter((event) => event.id !== id),
  }));
}

export function primaryDate(workspace: PreviewWorkspace) {
  return workspace.events.find((event) => event.primary)?.date || workspace.wedding?.date || null;
}

export function nextEvent(events: PreviewEvent[], todayIso: string) {
  return [...events].filter((event) => event.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))[0] ?? null;
}

export function todayInIndia(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
