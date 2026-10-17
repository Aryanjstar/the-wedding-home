"use client";

import { useState, type FormEvent } from "react";

import { api, ApiError, errorText, invalidate, useResource } from "@/components/api";
import { useSession } from "@/components/session";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, ButtonLink, ChipPicker, Drawer, EmptyState, ErrorNote, Field, MoneyInput, PageHeader, Segmented, Select, Skeleton, TextArea, TextInput, useFeedback } from "@/components/ui/kit";
import { useEvents } from "@/components/workspace/events";
import { formatInr, vendorCategoryLabels } from "@/data/format";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  agreedCostInr: number | null;
  spentInr: number;
  eventIds: string[];
  notes: string | null;
  source: "manual" | "places";
  placeId: string | null;
  mapsUrl: string | null;
};

type Place = {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string;
  osmUrl: string;
  distanceM: number;
  savedVendorId: string | null;
};

type View = "saved" | "nearby";

export function VendorsPage() {
  const { data, error, loading, reload } = useResource<{ items: Vendor[] }>("/api/vendors");
  const [view, setView] = useState<View>("saved");
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);
  const items = data?.items ?? [];
  const agreed = items.reduce((sum, vendor) => sum + (vendor.agreedCostInr ?? 0), 0);

  return (
    <>
      <PageHeader
        kicker="Vendors"
        title="The people you hire"
        lede="Save contacts and the agreed price, or look for photographers, caterers, and decorators near a venue. Nothing is booked or paid from here."
        actions={<Button icon="plus" onClick={() => setEditing("new")}>Add a vendor</Button>}
      />
      <div className="ws-toolbar">
        <Segmented<View> label="Vendors view" value={view} onChange={setView} options={[{ id: "saved", label: "My vendors", count: items.length }, { id: "nearby", label: "Find nearby" }]} />
        {view === "saved" && agreed > 0 ? <span className="ui-hint">Agreed so far: <strong>{formatInr(agreed)}</strong></span> : null}
      </div>
      {view === "saved" ? (
        <>
          {loading ? <Skeleton rows={3} /> : null}
          {error ? <ErrorNote message={error} retry={reload} /> : null}
          {data && items.length === 0 ? (
            <EmptyState icon="store" title="No vendors saved yet" action={<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}><Button icon="plus" onClick={() => setEditing("new")}>Add a vendor</Button><Button tone="secondary" icon="search" onClick={() => setView("nearby")}>Find nearby</Button></div>}>
              The photographer, the caterer, the pandit ji. Keep their number and the price you agreed in one place.
            </EmptyState>
          ) : null}
          <div className="ws-grid ws-grid-3">
            {items.map((vendor) => (
              <article key={vendor.id} className="ui-card ws-vendor">
                <div className="ws-vendor-head">
                  <div>
                    <h3>{vendor.name}</h3>
                    <span className="ui-hint">{vendorCategoryLabels[vendor.category] ?? vendor.category}{vendor.source === "places" ? " · from the map" : ""}</span>
                  </div>
                  <Button tone="ghost" size="sm" icon="edit" onClick={() => setEditing(vendor)} aria-label={`Edit ${vendor.name}`} />
                </div>
                <div className="ws-vendor-facts">
                  {vendor.contactPerson ? <span><Icon name="user" size={13} /> {vendor.contactPerson}</span> : null}
                  {vendor.phone ? <a href={`tel:${vendor.phone.replace(/\s/g, "")}`}><Icon name="phone" size={13} /> {vendor.phone}</a> : null}
                  {vendor.email ? <a href={`mailto:${vendor.email}`}><Icon name="mail" size={13} /> {vendor.email}</a> : null}
                  {vendor.website ? <a href={vendor.website} target="_blank" rel="noopener noreferrer"><Icon name="globe" size={13} /> Website</a> : null}
                  {vendor.address ? <span className="ui-hint">{vendor.address}</span> : null}
                  {vendor.notes ? <span className="ui-hint">{vendor.notes}</span> : null}
                </div>
                <div className="ws-vendor-foot">
                  <span>{vendor.agreedCostInr !== null ? <><span className="ui-hint">Agreed </span><strong>{formatInr(vendor.agreedCostInr)}</strong></> : <span className="ui-hint">No price agreed</span>}</span>
                  {vendor.spentInr > 0 ? <Badge tone="good">Paid {formatInr(vendor.spentInr)}</Badge> : vendor.mapsUrl ? <a className="ui-hint" href={vendor.mapsUrl} target="_blank" rel="noopener noreferrer">Map</a> : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <NearbySearch onSaved={() => invalidate("/api/vendors", "/api/dashboard")} />
      )}
      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== "new" ? `Edit ${editing.name}` : "Add a vendor"}>
        {editing !== null ? <VendorForm key={editing === "new" ? "new" : editing.id} vendor={editing === "new" ? null : editing} onDone={() => setEditing(null)} /> : null}
      </Drawer>
    </>
  );
}

function NearbySearch({ onSaved }: { onSaved: () => void }) {
  const events = useEvents();
  const { wedding } = useSession();
  const { toast } = useFeedback();
  const [category, setCategory] = useState("photographer");
  const [eventId, setEventId] = useState("");
  const [words, setWords] = useState("");
  const [results, setResults] = useState<{ near: string; attribution: string; places: Place[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const withVenue = (events.data?.items ?? []).filter((event) => event.venue);

  async function search(formEvent?: FormEvent<HTMLFormElement>) {
    formEvent?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, ...(eventId ? { eventId } : {}), ...(words.trim() ? { q: words.trim() } : {}) });
      setResults(await api(`/api/vendors/search?${params}`));
    } catch (failure) {
      setError(errorText(failure));
      setResults(null);
    } finally {
      setBusy(false);
    }
  }

  async function save(place: Place) {
    try {
      await api("/api/vendors", { method: "POST", body: { place: { id: place.placeId }, category, ...(eventId ? { eventIds: [eventId] } : {}) } });
      toast(`${place.name} saved to My vendors.`);
      setResults((current) => current && { ...current, places: current.places.map((item) => (item.placeId === place.placeId ? { ...item, savedVendorId: "saved" } : item)) });
      onSaved();
    } catch (failure) {
      toast(failure instanceof ApiError && failure.reason === "ALREADY_SAVED" ? "Already in My vendors." : errorText(failure), failure instanceof ApiError && failure.reason === "ALREADY_SAVED" ? "info" : "bad");
    }
  }

  const fallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`wedding ${vendorCategoryLabels[category] ?? category} near ${withVenue.find((event) => event.id === eventId)?.venue?.name ?? wedding?.city ?? ""}`)}`;

  return (
    <div className="ws-grid">
      <form className="ui-card ui-form ui-form-3" onSubmit={(event) => void search(event)}>
        <Field label="Looking for">
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            {Object.entries(vendorCategoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Near">
          <Select value={eventId} onChange={(event) => setEventId(event.target.value)}>
            <option value="">{wedding?.city ?? "The wedding city"}</option>
            {withVenue.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.venue?.name ?? event.venue?.city}</option>)}
          </Select>
        </Field>
        <Field label="Words" optional><TextInput value={words} onChange={(event) => setWords(event.target.value)} placeholder="candid, Rajasthani, budget" maxLength={80} /></Field>
        <div className="ui-span-2" style={{ gridColumn: "1 / -1", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button type="submit" icon="search" busy={busy}>Search nearby</Button>
          <ButtonLink href={fallback} external tone="secondary" icon="external">Open in Google Maps</ButtonLink>
        </div>
      </form>
      {error ? <ErrorNote message={error} /> : null}
      {results ? (
        results.places.length === 0 ? (
          <EmptyState icon="search" title="Nothing found">Try another kind of vendor or fewer words.</EmptyState>
        ) : (
          <>
            <p className="ui-hint">{results.places.length} near {results.near}, nearest first. Names and contacts come from OpenStreetMap, where Indian listings can be thin, so call before you trust a number.</p>
            <div className="ws-grid ws-grid-3">
              {results.places.map((place) => (
                <div key={place.placeId} className="ws-place">
                  <h4>{place.name}</h4>
                  <span className="ui-hint"><Icon name="map" size={13} /> {place.distanceM < 1000 ? `${place.distanceM} m` : `${(place.distanceM / 1000).toFixed(1)} km`} away</span>
                  {place.address ? <span className="ui-hint">{place.address}</span> : null}
                  {place.phone ? <a href={`tel:${place.phone.replace(/\s/g, "")}`} className="ui-hint">{place.phone}</a> : null}
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                    {place.savedVendorId ? <Badge tone="good">Saved</Badge> : <Button size="sm" icon="plus" onClick={() => void save(place)}>Save</Button>}
                    <ButtonLink href={place.mapsUrl} external size="sm" tone="secondary" icon="map">Google Maps</ButtonLink>
                    <ButtonLink href={place.osmUrl} external size="sm" tone="ghost">OSM</ButtonLink>
                  </div>
                </div>
              ))}
            </div>
            <p className="ui-hint"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{results.attribution}</a></p>
          </>
        )
      ) : null}
    </div>
  );
}

function VendorForm({ vendor, onDone }: { vendor: Vendor | null; onDone: () => void }) {
  const events = useEvents();
  const { toast, confirm } = useFeedback();
  const [eventIds, setEventIds] = useState<string[]>(vendor?.eventIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    if (!text("name")) return setError("Give the vendor a name.");
    setBusy(true);
    setError(null);
    try {
      await api(vendor ? `/api/vendors/${vendor.id}` : "/api/vendors", {
        method: vendor ? "PATCH" : "POST",
        body: {
          name: text("name"),
          category: text("category"),
          contactPerson: text("contactPerson"),
          phone: text("phone"),
          email: text("email"),
          website: text("website"),
          address: text("address"),
          agreedCostInr: text("agreedCostInr") ? Number(text("agreedCostInr")) : null,
          eventIds,
          notes: text("notes"),
        },
      });
      toast(vendor ? "Vendor saved." : `${text("name")} saved. Nothing is booked from here.`);
      invalidate("/api/vendors", "/api/dashboard");
      onDone();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!vendor) return;
    if (!(await confirm({ title: `Remove ${vendor.name}?`, body: "Expenses paid to them keep the name.", confirm: "Remove", danger: true }))) return;
    try {
      await api(`/api/vendors/${vendor.id}`, { method: "DELETE" });
      toast(`${vendor.name} removed.`);
      invalidate("/api/vendors", "/api/dashboard", "/api/expenses");
      onDone();
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  return (
    <form className="ui-form" onSubmit={(event) => void submit(event)} noValidate>
      <Field label="Name" span={2}><TextInput name="name" defaultValue={vendor?.name ?? ""} placeholder="Lens and Light Studio" maxLength={120} autoFocus /></Field>
      <Field label="Kind">
        <Select name="category" defaultValue={vendor?.category ?? "photographer"}>
          {Object.entries(vendorCategoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </Select>
      </Field>
      <Field label="Agreed price" optional><MoneyInput name="agreedCostInr" defaultValue={vendor?.agreedCostInr} /></Field>
      <Field label="Contact person" optional><TextInput name="contactPerson" defaultValue={vendor?.contactPerson ?? ""} maxLength={100} /></Field>
      <Field label="Phone" optional><TextInput name="phone" type="tel" defaultValue={vendor?.phone ?? ""} maxLength={30} /></Field>
      <Field label="Email" optional><TextInput name="email" type="email" defaultValue={vendor?.email ?? ""} maxLength={200} /></Field>
      <Field label="Website or Instagram" optional><TextInput name="website" defaultValue={vendor?.website ?? ""} placeholder="instagram.com/…" maxLength={300} /></Field>
      <Field label="Address" span={2} optional><TextInput name="address" defaultValue={vendor?.address ?? ""} maxLength={300} /></Field>
      <fieldset>
        <legend className="ui-label">For which functions</legend>
        <ChipPicker options={(events.data?.items ?? []).map((event) => ({ id: event.id, label: event.title }))} value={eventIds} onChange={setEventIds} empty="No functions yet." />
      </fieldset>
      <Field label="Notes" span={2} optional><TextArea name="notes" defaultValue={vendor?.notes ?? ""} placeholder="Advance paid. Balance on the day." maxLength={1000} /></Field>
      {error ? <p className="ui-span-2 auth-alert" role="alert">{error}</p> : null}
      <div className="ui-span-2 ui-drawer-foot" style={{ margin: "0.5rem -1.4rem -1.4rem", position: "sticky", bottom: "-1.4rem" }}>
        {vendor ? <Button tone="danger" icon="trash" onClick={() => void remove()}>Remove</Button> : null}
        <Button tone="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" busy={busy}>{vendor ? "Save" : "Save vendor"}</Button>
      </div>
    </form>
  );
}
