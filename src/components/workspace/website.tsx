"use client";

import { useState, type FormEvent } from "react";

import { api, errorText, invalidate, useResource } from "@/components/api";
import { MusicPreview } from "@/components/guest/sound";
import { AdminOnly } from "@/components/workspace/shell";
import { copyText } from "@/components/workspace/guests";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorNote, Field, IconButton, PageHeader, Select, Skeleton, TextArea, TextInput, useFeedback } from "@/components/ui/kit";
import { shortDay } from "@/data/format";
import { themePackIds, themePacks } from "@/data/theme-packs";
import { music as musicInfo, musicIds, packMusic, worldIds, worlds, type MusicId, type WorldId } from "@/data/worlds";

type Site = {
  slug: string | null;
  published: boolean;
  url: string | null;
  liveUrl: string | null;
  liveEmbed: string | null;
  theme: { packId: string };
  stay: string | null;
  helplines: { side: "bride" | "groom"; name: string; phone: string }[];
  families: { bride: { heading: string; blurb: string }; groom: { heading: string; blurb: string } };
  giftNote: string | null;
  aashirwad: { id: string; author: string; relation: string | null; message: string }[];
  slugSuggestion: string;
  events: { id: string; title: string; kind: string; startsAt: string; override: { world?: string; accent?: string; music?: string } | null; resolved: { world: WorldId; music: MusicId; accent: string } }[];
};

export function WebsitePage() {
  return (
    <AdminOnly>
      <WebsiteStudio />
    </AdminOnly>
  );
}

function WebsiteStudio() {
  const { data, error, loading, reload, setData } = useResource<Site>("/api/website");
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  async function run<T>(key: string, work: () => Promise<T>, message: string) {
    setBusy(key);
    try {
      const result = await work();
      toast(message);
      invalidate("/api/dashboard");
      return result;
    } catch (failure) {
      toast(errorText(failure), "bad");
      return null;
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Skeleton rows={5} />;
  if (error || !data) return <ErrorNote message={error ?? "The website settings did not load."} retry={reload} />;

  const save = (body: Record<string, unknown>, message: string, key = "save") =>
    run(key, async () => {
      const next = await api<Site>("/api/website", { method: "PATCH", body });
      setData(next);
    }, message);

  return (
    <>
      <PageHeader kicker="Website & themes" title="The guest website" lede="One look for the wedding, and a world of its own for each function: colour, motif, and music. Guests open it with no account. RSVPs stay on each household's private link." />

      <div className="ws-publish-bar" data-live={data.published}>
        <div style={{ display: "grid", gap: "0.3rem", minWidth: 0 }}>
          <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {data.published ? <Badge tone="good">Live</Badge> : <Badge tone="warn">Draft</Badge>}
            <strong>{data.published ? "Guests can open the site" : "Only the family can preview the site"}</strong>
          </span>
          {data.url ? (
            <span className="ws-link-box" style={{ maxWidth: 520 }}>
              <span>{data.url}</span>
              <IconButton icon="copy" label="Copy the website link" onClick={() => void copyText(data.url ?? "").then((copied) => copied && toast("Website link copied."))} />
            </span>
          ) : <span className="ui-hint">Publishing gives the site an address like /w/{data.slugSuggestion}.</span>}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <ButtonLink href={data.published && data.slug ? `/w/${data.slug}` : "/preview/site"} tone="secondary" icon="eye">{data.published ? "Open site" : "Preview"}</ButtonLink>
          {data.published ? (
            <Button
              tone="secondary"
              busy={busy === "publish"}
              onClick={() => {
                void confirm({ title: "Take the site down?", body: "The address stops working until you publish again. Household invitations keep working.", confirm: "Unpublish" }).then((sure) => {
                  if (sure) void run("publish", () => api("/api/website/unpublish", { method: "POST" }), "The site is now a draft.").then(reload);
                });
              }}
            >
              Unpublish
            </Button>
          ) : (
            <Button icon="globe" busy={busy === "publish"} onClick={() => void run("publish", () => api("/api/website/publish", { method: "POST" }), "The guest site is live.").then(reload)}>Publish</Button>
          )}
        </div>
      </div>

      <Card kicker="The look" title="Wedding pack" action={<MusicPreview music={packMusic[data.theme.packId] ?? "none"} />}>
        <div className="ws-packs">
          {themePackIds.map((id) => {
            const pack = themePacks[id];
            const selected = data.theme.packId === id;
            return (
              <button key={id} type="button" className="ws-pack" aria-pressed={selected} onClick={() => !selected && void save({ theme: { packId: id } }, `${pack.label} is the wedding's look.`, "pack")}>
                <span className="ws-pack-swatch" style={{ background: pack.bg, color: pack.text, border: `1px solid ${pack.surface}` }}>
                  Aa
                  <i style={{ background: pack.accent }} />
                </span>
                <strong>{pack.label}{selected ? <Icon name="check" size={16} /> : null}</strong>
                <small>{pack.soul} · {musicInfo[packMusic[id] as Exclude<MusicId, "none">]?.label}</small>
              </button>
            );
          })}
        </div>
      </Card>

      <Card kicker="Each function" title="Colour, motif, and music per function">
        {data.events.length === 0 ? <EmptyState icon="calendar" title="No functions yet">Add functions on Events, and each gets its own world here.</EmptyState> : (
          <div className="ui-list">
            {data.events.map((event) => <FunctionTheme key={event.id} event={event} onSaved={(next) => setData(next)} />)}
          </div>
        )}
        <p className="ui-hint" style={{ marginTop: "0.8rem" }}>A guest invited only to the Sangeet never sees the Haldi yellow. Music starts muted and guests turn it on.</p>
      </Card>

      <div className="ws-grid ws-grid-2">
        <AddressCard site={data} onSaved={reload} />
        <LiveCard site={data} save={save} busy={busy === "live"} />
      </div>

      <DetailsCard site={data} save={save} busy={busy === "details"} />
      <Blessings site={data} onChange={setData} />
    </>
  );
}

function FunctionTheme({ event, onSaved }: { event: Site["events"][number]; onSaved: (site: Site) => void }) {
  const { toast } = useFeedback();
  const [world, setWorld] = useState<string>(event.override?.world ?? "");
  const [track, setTrack] = useState<string>(event.override?.music ?? "");
  const [accent, setAccent] = useState<string>(event.override?.accent ?? event.resolved.accent);
  const [busy, setBusy] = useState(false);
  const shown = worlds[(world || event.resolved.world) as WorldId] ?? worlds.wedding;
  const playing = (track || event.resolved.music) as MusicId;
  const changed = world !== (event.override?.world ?? "") || track !== (event.override?.music ?? "") || accent !== (event.override?.accent ?? event.resolved.accent);

  async function save(reset = false) {
    setBusy(true);
    try {
      const next = reset
        ? await api<Site>(`/api/website/events/${event.id}/theme`, { method: "DELETE" }).then(() => api<Site>("/api/website"))
        : await api<Site>(`/api/website/events/${event.id}/theme`, {
            method: "PUT",
            body: { world: world || null, music: track || null, accent: accent !== shown.accent ? accent : null },
          });
      if (reset) {
        setWorld("");
        setTrack("");
        setAccent(worlds[next.events.find((item) => item.id === event.id)?.resolved.world ?? "wedding"].accent);
      }
      onSaved(next);
      toast(reset ? `${event.title} is back to its own world.` : `${event.title} theme saved.`);
    } catch (failure) {
      toast(errorText(failure), "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ws-fn-theme">
      <div className="ws-fn-swatch" style={{ ["--fn-sky" as string]: shown.sky, ["--fn-ground" as string]: shown.ground, ["--fn-ink" as string]: shown.ink, borderBottom: `5px solid ${accent}` }}>
        <b lang="hi">{shown.script}</b>
        <span>{event.title}</span>
      </div>
      <div style={{ display: "grid", gap: "0.6rem" }}>
        <span style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <strong>{event.title}</strong>
          <span className="ui-hint">{shortDay(event.startsAt)} · {shown.region}</span>
        </span>
        <div className="ws-fn-controls">
          <Field label="World">
            <Select value={world} onChange={(change) => { setWorld(change.target.value); if (change.target.value) setAccent(worlds[change.target.value as WorldId].accent); }}>
              <option value="">From the function ({worlds[event.resolved.world].label})</option>
              {worldIds.map((id) => <option key={id} value={id}>{worlds[id].label}</option>)}
            </Select>
          </Field>
          <Field label="Music">
            <Select value={track} onChange={(change) => setTrack(change.target.value)}>
              <option value="">Default ({musicInfo[event.resolved.music as Exclude<MusicId, "none">]?.label ?? "None"})</option>
              {musicIds.map((id) => <option key={id} value={id}>{id === "none" ? "No music" : musicInfo[id].label}</option>)}
            </Select>
          </Field>
          <Field label="Accent">
            <span className="ws-color">
              <input type="color" value={accent} onChange={(change) => setAccent(change.target.value)} aria-label="Accent colour" />
              <MusicPreview music={playing} />
            </span>
          </Field>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Button size="sm" busy={busy} disabled={!changed} onClick={() => void save()}>Save</Button>
            {event.override ? <Button size="sm" tone="ghost" onClick={() => void save(true)}>Reset</Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressCard({ site, onSaved }: { site: Site; onSaved: () => void }) {
  const { toast } = useFeedback();
  const [slug, setSlug] = useState(site.slug ?? site.slugSuggestion);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/website/slug", { method: "PUT", body: { slug } });
      toast("Address saved.");
      onSaved();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card kicker="Address" title="The website link">
      <form className="ui-form ui-form-1" onSubmit={(event) => void submit(event)}>
        <Field label="Address" error={error} hint="Lowercase letters, numbers, and hyphens. Changing it breaks links you already sent.">
          <span className="ui-affix">
            <span className="ui-affix-pre" style={{ fontWeight: 500, fontSize: "0.85rem" }}>/w/</span>
            <TextInput value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-"))} style={{ paddingLeft: "2.3rem" }} maxLength={48} />
          </span>
        </Field>
        <div><Button type="submit" busy={busy} disabled={slug === site.slug || slug.length < 3}>Save address</Button></div>
      </form>
    </Card>
  );
}

function LiveCard({ site, save, busy }: { site: Site; save: (body: Record<string, unknown>, message: string, key?: string) => Promise<unknown>; busy: boolean }) {
  const [url, setUrl] = useState(site.liveUrl ?? "");
  return (
    <Card kicker="Live" title="Stream on the website">
      <form className="ui-form ui-form-1" onSubmit={(event) => { event.preventDefault(); void save({ liveUrl: url }, url ? "Live link saved. Guests see it on the site." : "Live link removed.", "live"); }}>
        <Field label="YouTube or Vimeo link" optional hint="Paste the link from your photographer. Guests watch it on your site.">
          <TextInput type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" maxLength={300} />
        </Field>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button type="submit" busy={busy} disabled={url === (site.liveUrl ?? "")}>Save</Button>
          {site.liveUrl ? <Button tone="ghost" onClick={() => { setUrl(""); void save({ liveUrl: null }, "Live link removed.", "live"); }}>Remove</Button> : null}
        </div>
        {site.liveEmbed ? (
          <div className="ws-map" style={{ aspectRatio: "16 / 9" }}>
            <iframe title="Live preview" src={site.liveEmbed} allow="encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        ) : null}
      </form>
    </Card>
  );
}

function DetailsCard({ site, save, busy }: { site: Site; save: (body: Record<string, unknown>, message: string, key?: string) => Promise<unknown>; busy: boolean }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    void save(
      {
        helplines: [
          { side: "bride", name: text("brideHelpName"), phone: text("brideHelpPhone") },
          { side: "groom", name: text("groomHelpName"), phone: text("groomHelpPhone") },
        ],
        families: {
          bride: { heading: text("brideHeading"), blurb: text("brideBlurb") },
          groom: { heading: text("groomHeading"), blurb: text("groomBlurb") },
        },
        stay: text("stay"),
        giftNote: text("giftNote"),
      },
      "Website details saved.",
      "details",
    );
  }
  const help = (side: "bride" | "groom") => site.helplines.find((line) => line.side === side) ?? { name: "", phone: "" };
  return (
    <Card kicker="For the guests" title="Helplines, families, stay">
      <form className="ui-form" onSubmit={submit}>
        <p className="ui-form-section" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>Helplines, for the cousin lost at the gate</p>
        <Field label="Bride's side, name" optional><TextInput name="brideHelpName" defaultValue={help("bride").name} placeholder="Meera Mausi" maxLength={100} /></Field>
        <Field label="Phone" optional><TextInput name="brideHelpPhone" type="tel" defaultValue={help("bride").phone} placeholder="+91 98123 45678" maxLength={30} /></Field>
        <Field label="Groom's side, name" optional><TextInput name="groomHelpName" defaultValue={help("groom").name} placeholder="Karan Bhaiya" maxLength={100} /></Field>
        <Field label="Phone" optional><TextInput name="groomHelpPhone" type="tel" defaultValue={help("groom").phone} maxLength={30} /></Field>
        <p className="ui-form-section">Meet the families</p>
        <Field label="Bride's family" optional><TextInput name="brideHeading" defaultValue={site.families.bride.heading} placeholder="The Sharmas of Jaipur" maxLength={120} /></Field>
        <Field label="Groom's family" optional><TextInput name="groomHeading" defaultValue={site.families.groom.heading} placeholder="The Mehtas of Pune" maxLength={120} /></Field>
        <Field label="A few lines" optional><TextArea name="brideBlurb" defaultValue={site.families.bride.blurb} maxLength={600} /></Field>
        <Field label="A few lines" optional><TextArea name="groomBlurb" defaultValue={site.families.groom.blurb} maxLength={600} /></Field>
        <p className="ui-form-section">Stay and gifts</p>
        <Field label="Where to stay" span={2} optional hint="Plain text. Not a booking."><TextArea name="stay" defaultValue={site.stay ?? ""} placeholder="Hotel Pacific is 5 minutes from the venue. Ask for the Sharma–Mehta block." maxLength={1500} /></Field>
        <Field label="Blessings or gift note" span={2} optional><TextInput name="giftNote" defaultValue={site.giftNote ?? ""} placeholder="Your blessings are all we ask." maxLength={300} /></Field>
        <div className="ui-span-2"><Button type="submit" busy={busy}>Save details</Button></div>
      </form>
    </Card>
  );
}

function Blessings({ site, onChange }: { site: Site; onChange: (site: Site) => void }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    setBusy(true);
    try {
      const next = await api<Site>("/api/website/aashirwad", { method: "POST", body: { author: text("author"), relation: text("relation"), message: text("message") } });
      onChange(next);
      form.reset();
      toast("Blessing added to the wall.");
    } catch (failure) {
      toast(errorText(failure), "bad");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      onChange(await api<Site>(`/api/website/aashirwad/${id}`, { method: "DELETE" }));
      toast("Blessing removed.");
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }
  return (
    <Card kicker="Aashirwad" title="Blessings from the elders">
      <div className="ws-grid ws-grid-2">
        <form className="ui-form ui-form-1" onSubmit={(event) => void add(event)}>
          <Field label="From"><TextInput name="author" placeholder="Dadi" maxLength={100} required /></Field>
          <Field label="Relation" optional><TextInput name="relation" placeholder="Groom's grandmother" maxLength={100} /></Field>
          <Field label="Blessing"><TextArea name="message" placeholder="Sada khush raho…" maxLength={400} required /></Field>
          <div><Button type="submit" icon="plus" busy={busy}>Add to the wall</Button></div>
        </form>
        <div className="ui-list">
          {site.aashirwad.length === 0 ? <p className="ui-hint">Written by the family. Guests cannot post here.</p> : null}
          {site.aashirwad.map((entry) => (
            <div key={entry.id} className="ws-blessing">
              <p>“{entry.message}”</p>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <small>{entry.author}{entry.relation ? `, ${entry.relation}` : ""}</small>
                <IconButton icon="trash" label="Remove" onClick={() => void remove(entry.id)} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
