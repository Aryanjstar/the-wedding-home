"use client";

import { useMemo, useState, type FormEvent } from "react";

import { api, ApiError, errorText, invalidate, useResource } from "@/components/api";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, ChipPicker, Drawer, EmptyState, ErrorNote, Field, IconButton, PageHeader, Segmented, Select, Skeleton, TextArea, TextInput, useFeedback } from "@/components/ui/kit";
import { useEvents, type EventItem } from "@/components/workspace/events";
import { clock, longDay, plural, shortDay, sideLabels } from "@/data/format";

type Rsvp = { eventId: string; status: "silent" } | { eventId: string; status: "yes" | "no"; attendingCount: number; diet: { veg: number; nonVeg: number; jain: number } };

export type Household = {
  id: string;
  name: string;
  side: "bride" | "groom" | "other";
  maxPeople: number;
  invitedEventIds: string[];
  email: string | null;
  phone: string | null;
  notes: string | null;
  invitationEmailSentAt: string | null;
  lastReminderAt: string | null;
  rsvps: Rsvp[];
};

type Share = { inviteUrl: string; message: string; waUrl: string };

/** Open WhatsApp from a click even though the link comes from the server. */
export async function openWhatsApp(load: () => Promise<Share>) {
  const popup = window.open("", "_blank");
  try {
    const share = await load();
    if (popup) popup.location.href = share.waUrl;
    else window.location.href = share.waUrl;
    return share;
  } catch (error) {
    popup?.close();
    throw error;
  }
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this link", text);
    return false;
  }
}

type View = "households" | "reminders" | "caterer";

export function GuestsPage() {
  const households = useResource<{ items: Household[] }>("/api/households");
  const events = useEvents();
  const [view, setView] = useState<View>("households");
  const [editing, setEditing] = useState<Household | "new" | null>(null);
  const items = households.data?.items ?? [];
  const eventList = events.data?.items ?? [];

  return (
    <>
      <PageHeader
        kicker="Guests"
        title="Households"
        lede="One row per family, with its own private link. Share it on WhatsApp; guests never make an account and only see the functions you invite them to."
        actions={<Button icon="plus" onClick={() => setEditing("new")}>Add a household</Button>}
      />
      <Segmented<View>
        label="Guests view"
        value={view}
        onChange={setView}
        options={[
          { id: "households", label: "Households", count: items.length },
          { id: "reminders", label: "Reminders" },
          { id: "caterer", label: "Caterer counts" },
        ]}
      />
      {households.loading || events.loading ? <Skeleton rows={4} /> : null}
      {households.error ? <ErrorNote message={households.error} retry={households.reload} /> : null}
      {households.data && events.data ? (
        view === "households" ? (
          <HouseholdList items={items} events={eventList} onEdit={setEditing} onAdd={() => setEditing("new")} />
        ) : view === "reminders" ? (
          <Reminders events={eventList} />
        ) : (
          <Caterer events={eventList} />
        )
      ) : null}
      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== "new" ? `Edit ${editing.name}` : "Add a household"}>
        {editing !== null ? (
          <HouseholdForm key={editing === "new" ? "new" : editing.id} household={editing === "new" ? null : editing} events={eventList} ready={Boolean(events.data)} onDone={() => setEditing(null)} />
        ) : null}
      </Drawer>
    </>
  );
}

function HouseholdList({ items, events, onEdit, onAdd }: { items: Household[]; events: EventItem[]; onEdit: (household: Household) => void; onAdd: () => void }) {
  const { toast } = useFeedback();
  const [search, setSearch] = useState("");
  const [side, setSide] = useState("all");
  const [reply, setReply] = useState("all");
  const titles = useMemo(() => new Map(events.map((event) => [event.id, event.title])), [events]);

  const visible = items.filter((house) => {
    if (search && !house.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (side !== "all" && house.side !== side) return false;
    const answered = house.rsvps.some((item) => item.status !== "silent");
    if (reply === "waiting" && answered) return false;
    if (reply === "replied" && !answered) return false;
    return true;
  });

  async function emailInvite(house: Household) {
    try {
      await api(`/api/households/${house.id}/invite-email`, { method: "POST" });
      toast(`Invitation emailed to ${house.email}.`);
      invalidate("/api/households");
    } catch (error) {
      toast(errorText(error), "bad");
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState icon="users" title="No households yet" action={<Button icon="plus" onClick={onAdd}>Add the first household</Button>}>
        {events.length === 0 ? "Add the functions first, so each household can be invited to the right ones." : "Add the Sharma family, Mehta ji, the college friends. A phone number lets WhatsApp open their chat directly."}
      </EmptyState>
    );
  }

  return (
    <>
      <div className="ws-toolbar">
        <label className="ws-search">
          <Icon name="search" size={16} />
          <TextInput placeholder="Search households" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search households" />
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Select value={side} onChange={(event) => setSide(event.target.value)} aria-label="Side">
            <option value="all">Both sides</option>
            <option value="bride">Bride&apos;s side</option>
            <option value="groom">Groom&apos;s side</option>
            <option value="other">Friends and others</option>
          </Select>
          <Select value={reply} onChange={(event) => setReply(event.target.value)} aria-label="Reply">
            <option value="all">Every reply</option>
            <option value="waiting">Still waiting</option>
            <option value="replied">Replied</option>
          </Select>
        </div>
      </div>
      <p className="ui-hint">{plural(visible.length, "household")} · {visible.reduce((sum, house) => sum + house.maxPeople, 0)} people at most</p>
      <div className="ui-list">
        {visible.map((house) => (
          <article key={house.id} className="ui-row ws-guest-row">
            <div className="ui-row-main">
              <span className="ui-row-title">
                <span>{house.name}</span>
                <Badge tone={house.side === "bride" ? "bad" : house.side === "groom" ? "info" : "neutral"}>{sideLabels[house.side]}</Badge>
              </span>
              <span className="ui-row-meta">
                <span><Icon name="users" size={13} />Up to {house.maxPeople}</span>
                {house.phone ? <span><Icon name="phone" size={13} />{house.phone}</span> : null}
                {house.email ? <span><Icon name="mail" size={13} />{house.email}{house.invitationEmailSentAt ? " · sent" : ""}</span> : null}
              </span>
              {house.notes ? <span className="ui-hint">{house.notes}</span> : null}
            </div>
            <div className="ws-rsvp-dots" aria-label="Replies">
              {house.rsvps.length === 0 ? <span className="ui-hint">Not invited to a function</span> : null}
              {house.rsvps.map((item) => (
                <span key={item.eventId} className="ws-rsvp-dot" data-status={item.status}>
                  {titles.get(item.eventId) ?? "Function"}
                  {item.status === "yes" ? ` · ${item.attendingCount}` : item.status === "no" ? " · no" : " · ?"}
                </span>
              ))}
            </div>
            <div className="ui-row-actions">
              <Button
                tone="primary"
                className="ui-btn-whatsapp"
                size="sm"
                icon="whatsapp"
                onClick={() => {
                  void openWhatsApp(() => api<Share>(`/api/households/${house.id}/share`)).catch((error) => toast(errorText(error), "bad"));
                }}
              >
                WhatsApp
              </Button>
              <IconButton
                icon="copy"
                label="Copy their invitation link"
                tone="secondary"
                onClick={() => {
                  void api<Share>(`/api/households/${house.id}/share`)
                    .then((share) => copyText(share.inviteUrl))
                    .then((copied) => copied && toast("Invitation link copied."))
                    .catch((error) => toast(errorText(error), "bad"));
                }}
              />
              <IconButton icon="mail" label={house.email ? (house.invitationEmailSentAt ? "Send the email again" : "Email the invitation") : "Add an email to send"} tone="secondary" disabled={!house.email} onClick={() => void emailInvite(house)} />
              <a className="ui-icon-btn ui-btn-secondary" href={`/api/households/${house.id}/ecard?download=1`} download aria-label="Download the e-card" title="Download the WhatsApp e-card">
                <Icon name="download" size={17} />
              </a>
              <IconButton icon="edit" label="Edit" tone="secondary" onClick={() => onEdit(house)} />
            </div>
          </article>
        ))}
        {visible.length === 0 ? <p className="ui-hint">No household matches.</p> : null}
      </div>
    </>
  );
}

function HouseholdForm({ household, events, ready, onDone }: { household: Household | null; events: EventItem[]; ready: boolean; onDone: () => void }) {
  const { toast, confirm } = useFeedback();
  const [side, setSide] = useState<Household["side"]>(household?.side ?? "bride");
  // Until someone changes it, a new household is invited to every function, even ones still loading.
  const [picked, setInvited] = useState<string[] | null>(household?.invitedEventIds ?? null);
  const invited = picked ?? events.map((event) => event.id);
  const [max, setMax] = useState(household?.maxPeople ?? 4);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>, force = false): Promise<void> {
    const path = household ? `/api/households/${household.id}${force ? "?confirm=true" : ""}` : "/api/households";
    try {
      await api(path, { method: household ? "PATCH" : "POST", body });
    } catch (failure) {
      if (failure instanceof ApiError && failure.reason === "CONFIRMATION_REQUIRED" && !force) {
        const sure = await confirm({ title: "Remove a function they answered?", body: failure.message, confirm: "Remove it", danger: true });
        if (sure) return send(body, true);
      }
      throw failure;
    }
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    if (!text("name")) return setError("Give the household a name.");
    // Never save before the functions arrive, or a new household would be invited to nothing.
    if (!ready) return setError("The functions are still loading. Try again in a moment.");
    const body = { name: text("name"), side, maxPeople: max, invitedEventIds: invited, email: text("email"), phone: text("phone"), notes: text("notes") };
    setBusy(true);
    setError(null);
    try {
      await send(body);
      toast(household ? `${body.name} saved.` : `${body.name} added. Share their link on WhatsApp.`);
      invalidate("/api/households", "/api/events", "/api/dashboard");
      onDone();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!household) return;
    const sure = await confirm({ title: `Remove ${household.name}?`, body: "Their link stops working and their replies are removed.", confirm: "Remove household", danger: true });
    if (!sure) return;
    try {
      await api(`/api/households/${household.id}`, { method: "DELETE" });
      toast(`${household.name} removed.`);
      invalidate("/api/households", "/api/events", "/api/dashboard");
      onDone();
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  return (
    <form className="ui-form" onSubmit={(formEvent) => void submit(formEvent)} noValidate>
      <Field label="Household" span={2} hint="How the family is known: “Sharma family”, “Mehta ji and family”.">
        <TextInput name="name" defaultValue={household?.name ?? ""} placeholder="Sharma family" maxLength={100} autoFocus />
      </Field>
      <fieldset>
        <legend className="ui-label">Side</legend>
        <div className="ui-chips">
          {(["bride", "groom", "other"] as const).map((id) => (
            <button key={id} type="button" className="ui-chip" aria-pressed={side === id} onClick={() => setSide(id)}>{sideLabels[id]}</button>
          ))}
        </div>
      </fieldset>
      <Field label="People on this invitation" hint="The most who can come from this household.">
        <span style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <IconButton icon="minus" label="One fewer" tone="secondary" onClick={() => setMax((value) => Math.max(1, value - 1))} />
          <TextInput type="number" min={1} max={25} value={max} onChange={(event) => setMax(Math.min(25, Math.max(1, Number(event.target.value) || 1)))} style={{ textAlign: "center", width: "5rem" }} aria-label="People" />
          <IconButton icon="plus" label="One more" tone="secondary" onClick={() => setMax((value) => Math.min(25, value + 1))} />
        </span>
      </Field>
      <Field label="Mobile" optional hint="WhatsApp opens this chat directly. Without it, you pick the chat."><TextInput name="phone" type="tel" inputMode="tel" defaultValue={household?.phone ?? ""} placeholder="98765 43210" maxLength={30} /></Field>
      <Field label="Email" optional hint="For the invitation email and reminders."><TextInput name="email" type="email" defaultValue={household?.email ?? ""} placeholder="family@example.com" maxLength={200} /></Field>
      <fieldset>
        <legend className="ui-label">Invited to</legend>
        <ChipPicker options={events.map((event) => ({ id: event.id, label: `${event.title} · ${shortDay(event.startsAt)}` }))} value={invited} onChange={setInvited} empty="Add the functions on Events first." />
      </fieldset>
      <Field label="Notes" span={2} optional><TextArea name="notes" defaultValue={household?.notes ?? ""} placeholder="Coming from Pune. Dadi needs a wheelchair." maxLength={1000} /></Field>
      {error ? <p className="ui-span-2 auth-alert" role="alert">{error}</p> : null}
      <div className="ui-span-2 ui-drawer-foot" style={{ margin: "0.5rem -1.4rem -1.4rem", position: "sticky", bottom: "-1.4rem" }}>
        {household ? <Button tone="danger" icon="trash" onClick={() => void remove()}>Remove</Button> : null}
        <Button tone="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" busy={busy || !ready}>{household ? "Save changes" : "Add household"}</Button>
      </div>
    </form>
  );
}

type Queue = {
  event: { id: string; title: string; startsAt: string };
  schedule: { slot: "1m" | "1w" | "1d"; dueAt: string; state: "passed" | "upcoming"; kinds: string[] }[];
  silent: { householdId: string; name: string; hasEmail: boolean; hasPhone: boolean; lastReminderAt: string | null }[];
  yes: { householdId: string; name: string; hasEmail: boolean; hasPhone: boolean; lastReminderAt: string | null }[];
};

const slotLabel = { "1m": "1 month before", "1w": "1 week before", "1d": "1 day before" } as const;

function Reminders({ events }: { events: EventItem[] }) {
  const [eventId, setEventId] = useState(() => {
    const now = Date.now();
    return events.find((event) => Date.parse(event.startsAt) > now)?.id ?? events[0]?.id ?? "";
  });
  const [kind, setKind] = useState<"please_rsvp" | "see_you_soon">("please_rsvp");
  const queue = useResource<Queue>(eventId ? `/api/reminders/queue?eventId=${eventId}` : null);
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);

  if (events.length === 0) return <EmptyState icon="bell" title="Reminders follow each function">Add a function and invite households; reminders go 1 month, 1 week, and 1 day before it.</EmptyState>;

  const people = kind === "please_rsvp" ? queue.data?.silent ?? [] : queue.data?.yes ?? [];
  const withEmail = people.filter((person) => person.hasEmail).length;

  async function sendAll() {
    const sure = await confirm({
      title: kind === "please_rsvp" ? "Email everyone still silent?" : "Email everyone coming?",
      body: `${plural(withEmail, "household")} with an email address get it now. The scheduled reminders still go out. ${people.length - withEmail} without email can be sent on WhatsApp below.`,
      confirm: `Send ${plural(withEmail, "email")}`,
    });
    if (!sure) return;
    setBusy(true);
    try {
      const result = await api<{ sent: number; failed: number; skipped: { noEmail: number; other: number } }>("/api/reminders/send-now", { method: "POST", body: { eventId, kind } });
      toast(`Sent ${result.sent}${result.failed ? `, ${result.failed} will be retried` : ""}.`, result.failed ? "info" : "good");
      queue.reload();
      invalidate("/api/households");
    } catch (error) {
      toast(errorText(error), "bad");
    } finally {
      setBusy(false);
    }
  }

  async function emailOne(householdId: string, name: string) {
    try {
      await api(`/api/households/${householdId}/remind`, { method: "POST", body: { eventId, kind } });
      toast(`Reminder emailed to ${name}.`);
      queue.reload();
    } catch (error) {
      toast(errorText(error), "bad");
    }
  }

  return (
    <div className="ws-grid">
      <div className="ws-toolbar">
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <Select value={eventId} onChange={(event) => setEventId(event.target.value)} aria-label="Function">
            {events.map((event) => <option key={event.id} value={event.id}>{event.title} · {shortDay(event.startsAt)}</option>)}
          </Select>
          <Segmented<"please_rsvp" | "see_you_soon">
            label="Reminder"
            value={kind}
            onChange={setKind}
            options={[
              { id: "please_rsvp", label: "Please RSVP", count: queue.data?.silent.length },
              { id: "see_you_soon", label: "See you soon", count: queue.data?.yes.length },
            ]}
          />
        </div>
        <Button icon="mail" busy={busy} disabled={withEmail === 0} onClick={() => void sendAll()}>Email {withEmail} now</Button>
      </div>
      {queue.data ? (
        <div className="ws-grid ws-grid-3">
          {queue.data.schedule.map((slot) => {
            const applies = slot.kinds.includes(kind);
            return (
              <div key={slot.slot} className="ws-stat" style={{ opacity: applies ? 1 : 0.5 }}>
                <span className="ws-stat-label"><Icon name="clock" size={14} />{slotLabel[slot.slot]}</span>
                <b style={{ fontSize: "1.05rem" }}>{longDay(slot.dueAt).replace(/ \d{4}$/, "")}</b>
                <small>{!applies ? "Not for this reminder" : slot.state === "passed" ? "Already sent" : `Sends automatically at ${clock(slot.dueAt)}`}</small>
              </div>
            );
          })}
        </div>
      ) : null}
      {queue.loading ? <Skeleton rows={3} /> : null}
      {queue.error ? <ErrorNote message={queue.error} retry={queue.reload} /> : null}
      {queue.data && people.length === 0 ? (
        <EmptyState icon="check" title={kind === "please_rsvp" ? "Everyone has replied" : "No one has said yes yet"}>
          {kind === "please_rsvp" ? "No household invited to this function is still silent." : "See-you-soon reminders go to households that said yes, one day before."}
        </EmptyState>
      ) : null}
      <div className="ui-list">
        {people.map((person) => (
          <div key={person.householdId} className="ui-row">
            <div className="ui-row-main">
              <span className="ui-row-title"><span>{person.name}</span></span>
              <span className="ui-row-meta">
                <span>{person.hasEmail ? "Has email" : "No email"}</span>
                {person.lastReminderAt ? <span>Last reminded {shortDay(person.lastReminderAt)}</span> : null}
              </span>
            </div>
            <div className="ui-row-actions">
              <Button
                size="sm"
                className="ui-btn-whatsapp"
                icon="whatsapp"
                onClick={() => {
                  void openWhatsApp(() => api<Share>(`/api/households/${person.householdId}/share?kind=${kind}&eventId=${eventId}`)).catch((error) => toast(errorText(error), "bad"));
                }}
              >
                WhatsApp
              </Button>
              <Button size="sm" tone="secondary" icon="mail" disabled={!person.hasEmail} onClick={() => void emailOne(person.householdId, person.name)}>Email</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Caterer({ events }: { events: EventItem[] }) {
  if (events.length === 0) return <EmptyState icon="users" title="No functions yet">Diet counts appear here per function once households reply.</EmptyState>;
  const totals = events.reduce(
    (sum, event) => ({ veg: sum.veg + event.attendance.yes.diet.veg, nonVeg: sum.nonVeg + event.attendance.yes.diet.nonVeg, jain: sum.jain + event.attendance.yes.diet.jain }),
    { veg: 0, nonVeg: 0, jain: 0 },
  );
  return (
    <div className="ws-grid">
      <p className="ui-hint">The numbers the caterer asks for. Veg, non-veg, and Jain add up to the people coming. Plates across all functions: {totals.veg + totals.nonVeg + totals.jain}.</p>
      <div className="ws-caterer">
        {events.map((event) => (
          <div key={event.id} className="ws-caterer-card">
            <strong>{event.title}</strong>
            <small>{shortDay(event.startsAt)} · {clock(event.startsAt)}</small>
            <b>{event.attendance.yes.attending}</b>
            <small>coming from {plural(event.attendance.yes.households, "household")}</small>
            <div className="ws-diet">
              <Badge tone="good">Veg {event.attendance.yes.diet.veg}</Badge>
              <Badge tone="bad">Non-veg {event.attendance.yes.diet.nonVeg}</Badge>
              <Badge tone="warn">Jain {event.attendance.yes.diet.jain}</Badge>
            </div>
            <small>{event.attendance.silent} still to reply · {event.attendance.no} declined</small>
          </div>
        ))}
      </div>
    </div>
  );
}
