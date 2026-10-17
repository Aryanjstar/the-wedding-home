"use client";

import { useState, type FormEvent } from "react";

import { api, ApiError, errorText, invalidate, useResource } from "@/components/api";
import { useSession } from "@/components/session";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, ButtonLink, Drawer, EmptyState, ErrorNote, Field, PageHeader, Skeleton, TextArea, TextInput, Toggle, useFeedback } from "@/components/ui/kit";
import { clock, eventKindLabels, inputsFromInstant, instantFromInputs, longDay, plural } from "@/data/format";
import { worldForKind, worlds } from "@/data/worlds";

export type EventItem = {
  id: string;
  kind: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  isPrimary: boolean;
  muhuratAt: string | null;
  venue: { name: string | null; address: string | null; city: string | null; mapsUrl: string | null; embedUrl: string | null } | null;
  description: string | null;
  dressNote: string | null;
  howToReach: string | null;
  parking: string | null;
  householdsInvited: number;
  attendance: { invited: number; silent: number; no: number; yes: { households: number; attending: number; diet: { veg: number; nonVeg: number; jain: number } } };
};

const SHORTCUTS = ["haldi", "mehendi", "sangeet", "wedding", "reception", "roka", "engagement", "cocktail", "custom"] as const;

export function EventsPage() {
  const { data, error, loading, reload } = useResource<{ items: EventItem[] }>("/api/events");
  const [editing, setEditing] = useState<EventItem | "new" | null>(null);
  const { confirm, toast } = useFeedback();
  const items = data?.items ?? [];

  async function remove(event: EventItem) {
    const sure = await confirm({ title: `Remove ${event.title}?`, body: "Its tasks, expenses, and photos stay, without this function attached.", confirm: "Remove", danger: true });
    if (!sure) return;
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
    } catch (failure) {
      if (failure instanceof ApiError && failure.reason === "CONFIRMATION_REQUIRED") {
        const again = await confirm({ title: "Households are invited to this", body: failure.message, confirm: "Remove anyway", danger: true });
        if (!again) return;
        try {
          await api(`/api/events/${event.id}?confirm=true`, { method: "DELETE" });
        } catch (second) {
          toast(errorText(second), "bad");
          return;
        }
      } else {
        toast(errorText(failure), "bad");
        return;
      }
    }
    toast(`${event.title} removed.`);
    setEditing(null);
    invalidate("/api/events", "/api/dashboard", "/api/households");
  }

  return (
    <>
      <PageHeader
        kicker="Events"
        title="The week"
        lede="Each function has its own time, venue, and map. Mark one as the primary wedding date; it holds the muhurat and drives the countdown."
        actions={<Button icon="plus" onClick={() => setEditing("new")}>Add a function</Button>}
      />
      {loading ? <Skeleton rows={3} /> : null}
      {error ? <ErrorNote message={error} retry={reload} /> : null}
      {data && items.length === 0 ? (
        <EmptyState icon="calendar" title="No functions yet" action={<Button icon="plus" onClick={() => setEditing("new")}>Add the first function</Button>}>
          Start with Haldi, Mehendi, Sangeet, the wedding, and the reception. Roka, engagement, and cocktail are there too.
        </EmptyState>
      ) : null}
      <div className="ui-list">
        {items.map((event) => <EventCard key={event.id} event={event} onEdit={() => setEditing(event)} />)}
      </div>
      <EventDrawer
        event={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onRemove={editing && editing !== "new" ? () => void remove(editing) : undefined}
      />
    </>
  );
}

function EventCard({ event, onEdit }: { event: EventItem; onEdit: () => void }) {
  const world = worlds[worldForKind(event.kind) ?? "wedding"];
  const date = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(date);
  const { attendance } = event;
  return (
    <article className="ui-card ws-event" id={event.id} style={{ ["--fn-sky" as string]: world.sky, ["--fn-ground" as string]: world.ground, ["--fn-ink" as string]: world.ink }}>
      <div className="ws-event-date">
        <span>{month}</span>
        <b>{day}</b>
        <em lang="hi">{world.script}</em>
      </div>
      <div className="ws-event-body">
        <div className="ws-event-top">
          <div>
            <h3>{event.title}</h3>
            <p className="ui-hint">{longDay(event.startsAt)} · {clock(event.startsAt)}{event.endsAt ? ` to ${clock(event.endsAt)}` : ""}</p>
          </div>
          <div className="ui-row-actions">
            {event.isPrimary ? <Badge tone="gold">Primary date</Badge> : null}
            {event.muhuratAt ? <Badge tone="warn">Muhurat {clock(event.muhuratAt)}</Badge> : null}
            <Button tone="secondary" size="sm" icon="edit" onClick={onEdit}>Edit</Button>
          </div>
        </div>
        <div className="ws-event-grid">
          <div className="ws-event-facts">
            {event.venue ? (
              <div><Icon name="map" size={16} /><span><strong>{event.venue.name ?? event.venue.address ?? event.venue.city}</strong>{event.venue.name && (event.venue.address || event.venue.city) ? <><br />{[event.venue.address, event.venue.city].filter(Boolean).join(", ")}</> : null}</span></div>
            ) : (
              <div><Icon name="map" size={16} /><span className="ui-hint">No venue yet. Add one and the map appears.</span></div>
            )}
            {event.dressNote ? <div><Icon name="sparkle" size={16} /><span>{event.dressNote}</span></div> : null}
            {event.description ? <div><Icon name="heart" size={16} /><span>{event.description}</span></div> : null}
            <div><Icon name="users" size={16} /><span>
              {attendance.invited === 0 ? "No households invited yet." : (
                <>{plural(attendance.invited, "household")} invited · <strong>{attendance.yes.attending} coming</strong> from {attendance.yes.households} · {attendance.no} declined · {attendance.silent} waiting</>
              )}
            </span></div>
            {attendance.yes.attending > 0 ? (
              <div className="ws-diet" aria-label="Diet for the caterer">
                <Badge tone="good">Veg {attendance.yes.diet.veg}</Badge>
                <Badge tone="bad">Non-veg {attendance.yes.diet.nonVeg}</Badge>
                <Badge tone="warn">Jain {attendance.yes.diet.jain}</Badge>
              </div>
            ) : null}
          </div>
          {event.venue?.embedUrl ? (
            <div className="ws-map">
              <iframe title={`Map of ${event.venue.name ?? event.title}`} src={event.venue.embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              {event.venue.mapsUrl ? <ButtonLink href={event.venue.mapsUrl} external size="sm" icon="external">Open in Google Maps</ButtonLink> : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EventDrawer({ event, open, onClose, onRemove }: { event: EventItem | null; open: boolean; onClose: () => void; onRemove?: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title={event ? `Edit ${event.title}` : "Add a function"} wide>
      {open ? <EventForm key={event?.id ?? "new"} event={event} onDone={onClose} onRemove={onRemove} /> : null}
    </Drawer>
  );
}

function EventForm({ event, onDone, onRemove }: { event: EventItem | null; onDone: () => void; onRemove?: () => void }) {
  const { wedding } = useSession();
  const { toast } = useFeedback();
  const start = inputsFromInstant(event?.startsAt);
  const end = inputsFromInstant(event?.endsAt);
  const muhurat = inputsFromInstant(event?.muhuratAt);
  const [kind, setKind] = useState(event?.kind ?? "haldi");
  const [title, setTitle] = useState(event?.title ?? "Haldi");
  const [primary, setPrimary] = useState(event?.isPrimary ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(next: string) {
    setKind(next);
    if (!event || title === eventKindLabels[kind]) setTitle(next === "custom" ? "" : eventKindLabels[next] ?? next);
    if (next === "wedding" && !event) setPrimary(true);
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const date = text("date");
    const startsAt = instantFromInputs(date, text("start"));
    if (!title.trim()) return setError("Give the function a name.");
    if (!startsAt) return setError("Choose the date.");
    const endsAt = text("end") ? instantFromInputs(date, text("end")) : null;
    const muhuratAt = primary && text("muhurat") ? instantFromInputs(date, text("muhurat")) : null;
    const body = {
      kind,
      title: title.trim(),
      startsAt,
      endsAt,
      isPrimary: primary,
      muhuratAt,
      venue: { name: text("venueName"), address: text("address"), city: text("city") },
      description: text("description"),
      dressNote: text("dressNote"),
      howToReach: text("howToReach"),
      parking: text("parking"),
    };
    setBusy(true);
    setError(null);
    try {
      await api(event ? `/api/events/${event.id}` : "/api/events", { method: event ? "PATCH" : "POST", body });
      toast(event ? `${body.title} saved.` : `${body.title} is on the week.`);
      invalidate("/api/events", "/api/dashboard");
      onDone();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="ui-form" onSubmit={(formEvent) => void submit(formEvent)} noValidate>
      <fieldset>
        <legend className="ui-label">Which function</legend>
        <div className="ui-chips">
          {SHORTCUTS.map((id) => (
            <button key={id} type="button" className="ui-chip" aria-pressed={kind === id} onClick={() => pick(id)}>{eventKindLabels[id]}</button>
          ))}
        </div>
      </fieldset>
      <Field label="Name" span={2}>
        <TextInput value={title} onChange={(change) => setTitle(change.target.value)} placeholder="Haldi" maxLength={120} required />
      </Field>
      <Field label="Date"><TextInput name="date" type="date" defaultValue={start.date || wedding?.date || ""} required /></Field>
      <div className="ui-form ui-form-1" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Starts"><TextInput name="start" type="time" defaultValue={start.time || "10:00"} /></Field>
        <Field label="Ends" optional><TextInput name="end" type="time" defaultValue={end.time} /></Field>
      </div>
      <div className="ui-span-2">
        <Toggle checked={primary} onChange={setPrimary} label="Primary wedding date" description="The countdown counts to this function. Only one function can hold it." />
      </div>
      {primary ? (
        <Field label="Muhurat" hint="The auspicious minute, shown on the dashboard and the guest site." optional>
          <TextInput name="muhurat" type="time" defaultValue={muhurat.time} />
        </Field>
      ) : null}
      <p className="ui-form-section">Venue</p>
      <Field label="Venue name" optional><TextInput name="venueName" defaultValue={event?.venue?.name ?? ""} placeholder="Rambagh Palace" maxLength={120} /></Field>
      <Field label="City" optional><TextInput name="city" defaultValue={event?.venue?.city ?? wedding?.city ?? ""} maxLength={80} /></Field>
      <Field label="Address" span={2} optional hint="The map and Open in Google Maps use the venue, address, and city."><TextInput name="address" defaultValue={event?.venue?.address ?? ""} placeholder="Bhawani Singh Road" maxLength={300} /></Field>
      <p className="ui-form-section">For the guests</p>
      <Field label="What this function is" span={2} optional hint="Three or four lines for the NRI cousins and college friends.">
        <TextArea name="description" defaultValue={event?.description ?? ""} maxLength={600} />
      </Field>
      <Field label="What to wear" optional><TextInput name="dressNote" defaultValue={event?.dressNote ?? ""} placeholder="Yellow. No white." maxLength={300} /></Field>
      <Field label="Parking" optional><TextInput name="parking" defaultValue={event?.parking ?? ""} placeholder="Valet at gate 2" maxLength={300} /></Field>
      <Field label="How to reach" span={2} optional><TextInput name="howToReach" defaultValue={event?.howToReach ?? ""} placeholder="Enter from the Bhawani Singh Road gate" maxLength={300} /></Field>
      {error ? <p className="ui-span-2 auth-alert" role="alert">{error}</p> : null}
      <div className="ui-span-2 ui-drawer-foot" style={{ margin: "0.5rem -1.4rem -1.4rem", position: "sticky", bottom: "-1.4rem" }}>
        {onRemove ? <Button tone="danger" icon="trash" onClick={onRemove}>Remove</Button> : null}
        <Button tone="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" busy={busy}>{event ? "Save changes" : "Add function"}</Button>
      </div>
    </form>
  );
}

export function useEvents() {
  return useResource<{ items: EventItem[] }>("/api/events");
}

