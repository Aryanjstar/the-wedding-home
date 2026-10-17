import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { SoundProvider, SoundToggle, Soundtrack } from "@/components/guest/sound";
import { Stage } from "@/components/guest/stage";
import { Icon } from "@/components/ui/icon";
import { civilLong, clock, longDay } from "@/data/format";
import { daysUntilCivilDate } from "@/data/india-time";
import { themePack } from "@/data/theme-packs";
import { packMusic, packStyle, type MusicId, type ResolvedTheme } from "@/data/worlds";
import type { PublicSite } from "@/modules/website/service";

type SiteEvent = PublicSite["events"][number];

export function coupleOf(site: { title: string | null; brideName: string; groomName: string }) {
  return site.title || `${site.brideName.split(" ")[0]} & ${site.groomName.split(" ")[0]}`;
}

function monogram(site: { brideName: string; groomName: string }) {
  return `${site.brideName.trim()[0] ?? ""}${site.groomName.trim()[0] ?? ""}`;
}

export function GuestFrame({ packId, children, preview }: { packId: string; children: ReactNode; preview?: { back: string } | null }) {
  const pack = themePack(packId);
  return (
    <SoundProvider>
      <div className={`g-site g-pack-${pack.id}`} style={packStyle(pack) as CSSProperties}>
        {preview ? (
          <div className="g-preview-bar" role="status">
            <span><Icon name="eye" size={15} /> Preview. This is what guests see.</span>
            <Link href={preview.back}>Back to the workspace</Link>
          </div>
        ) : null}
        {children}
      </div>
    </SoundProvider>
  );
}

export function SiteHeader({ site, base, links }: { site: { title: string | null; brideName: string; groomName: string }; base: string; links: { href: string; label: string }[] }) {
  return (
    <header className="g-header">
      <Link href={base} className="g-monogram" aria-label={`${coupleOf(site)}, home`}>
        <span>{monogram(site)[0]}</span>
        <i aria-hidden="true">✦</i>
        <span>{monogram(site)[1]}</span>
      </Link>
      <nav className="g-nav" aria-label="Wedding">
        {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
      </nav>
      <SoundToggle />
    </header>
  );
}

function FunctionCard({ event, href }: { event: SiteEvent; href: string }) {
  return (
    <Link href={href} className="g-fn-card">
      <Stage theme={event.theme} compact>
        <span className="g-fn-script" lang="hi">{event.theme.world.script}</span>
      </Stage>
      <div className="g-fn-card-body">
        <p className="g-kicker">{longDay(event.startsAt)}</p>
        <h3>{event.title}</h3>
        <p className="g-muted">{clock(event.startsAt)}{event.venue?.name ? ` · ${event.venue.name}` : ""}</p>
        {event.dressNote ? <p className="g-muted g-small">Wear: {event.dressNote}</p> : null}
        <span className="g-link">Open <Icon name="chevronRight" size={14} /></span>
      </div>
    </Link>
  );
}

export function SiteHome({ site, base }: { site: PublicSite; base: string }) {
  const couple = coupleOf(site);
  const days = daysUntilCivilDate(site.weddingDate, new Date());
  const primary = site.events.find((event) => event.isPrimary);
  const families = [site.families.bride, site.families.groom].filter((family) => family.heading || family.blurb);
  const links = [
    ...(site.story ? [{ href: "#story", label: "Our story" }] : []),
    { href: "#functions", label: "Functions" },
    ...(families.length ? [{ href: "#families", label: "Families" }] : []),
    ...(site.stay || site.helplines.length ? [{ href: "#stay", label: "Stay & help" }] : []),
    ...(site.liveEmbed ? [{ href: "#live", label: "Live" }] : []),
    ...(site.aashirwad.length ? [{ href: "#aashirwad", label: "Aashirwad" }] : []),
  ];
  return (
    <>
      <Soundtrack music={(packMusic[site.packId] ?? "none") as MusicId} />
      <SiteHeader site={site} base={base} links={links} />
      <section className="g-hero">
        <svg className="g-mandala" viewBox="0 0 400 400" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <ellipse key={index} cx="200" cy="200" rx="190" ry="60" transform={`rotate(${index * 7.5} 200 200)`} />
          ))}
          <circle cx="200" cy="200" r="70" />
          <circle cx="200" cy="200" r="120" />
        </svg>
        <div className="g-hero-copy">
          <p className="g-script" lang="hi">॥ शुभ विवाह ॥</p>
          <p className="g-kicker">Together with their families</p>
          <h1>{site.title ? site.title : <>{site.brideName.split(" ")[0]} <em>&amp;</em> {site.groomName.split(" ")[0]}</>}</h1>
          <p className="g-hero-date">{civilLong(site.weddingDate)} · {site.city}</p>
          {primary?.muhuratAt ? <p className="g-muted">Muhurat {clock(primary.muhuratAt)}</p> : null}
          <div className="g-countdown">
            {days > 0 ? <><b>{days}</b><span>{days === 1 ? "day to go" : "days to go"}</span></> : days === 0 ? <b>Today</b> : <span>Thank you for the blessings</span>}
          </div>
          <div className="g-hero-actions">
            <a className="g-btn" href="#functions">See the functions</a>
            <SoundToggle inline />
          </div>
        </div>
      </section>

      {site.story ? (
        <section className="g-section g-narrow" id="story">
          <p className="g-kicker">Our story</p>
          <h2>How it began</h2>
          <p className="g-prose">{site.story}</p>
        </section>
      ) : null}

      <section className="g-section" id="functions">
        <p className="g-kicker">The functions</p>
        <h2>{site.events.length ? `${site.events.length} celebrations` : "The week"}</h2>
        {site.events.length === 0 ? <p className="g-muted">The functions will appear here soon.</p> : (
          <div className="g-fn-grid">
            {site.events.map((event) => <FunctionCard key={event.id} event={event} href={`${base}/${event.id}`} />)}
          </div>
        )}
        <p className="g-muted g-small" style={{ marginTop: "1rem" }}>Your personal invitation link has your RSVP. This page does not collect replies.</p>
      </section>

      {families.length ? (
        <section className="g-section" id="families">
          <p className="g-kicker">Meet the families</p>
          <h2>Two homes, one celebration</h2>
          <div className="g-two">
            {[site.families.bride, site.families.groom].map((family, index) => family.heading || family.blurb ? (
              <article key={index} className="g-card">
                <p className="g-kicker">{index === 0 ? "The bride's family" : "The groom's family"}</p>
                <h3>{family.heading}</h3>
                {family.blurb ? <p className="g-prose">{family.blurb}</p> : null}
              </article>
            ) : null)}
          </div>
        </section>
      ) : null}

      {site.stay || site.helplines.length ? (
        <section className="g-section" id="stay">
          <div className="g-two">
            {site.stay ? (
              <article className="g-card">
                <p className="g-kicker">Where to stay</p>
                <h3>Rooms nearby</h3>
                <p className="g-prose">{site.stay}</p>
              </article>
            ) : null}
            {site.helplines.length ? <Helplines lines={site.helplines} /> : null}
          </div>
        </section>
      ) : null}

      {site.liveEmbed ? <Live embed={site.liveEmbed} /> : null}

      {site.aashirwad.length ? <Blessings items={site.aashirwad} /> : null}

      {site.giftNote ? (
        <section className="g-section g-narrow g-center">
          <p className="g-script" lang="hi">आशीर्वाद</p>
          <p className="g-prose">{site.giftNote}</p>
        </section>
      ) : null}

      <SiteFooter couple={couple} />
    </>
  );
}

export function Helplines({ lines }: { lines: { side: "bride" | "groom"; name: string; phone: string }[] }) {
  return (
    <article className="g-card">
      <p className="g-kicker">Lost at the gate?</p>
      <h3>Call the family</h3>
      <div className="g-helplines">
        {lines.map((line) => (
          <a key={line.side} href={`tel:${line.phone.replace(/[^\d+]/g, "")}`} className="g-helpline">
            <Icon name="phone" size={18} />
            <span><strong>{line.name}</strong><small>{line.side === "bride" ? "Bride's side" : "Groom's side"} · {line.phone}</small></span>
          </a>
        ))}
      </div>
    </article>
  );
}

export function Live({ embed }: { embed: string }) {
  return (
    <section className="g-section" id="live">
      <p className="g-kicker"><span className="g-live-dot" /> Live</p>
      <h2>Watch from wherever you are</h2>
      <div className="g-video">
        <iframe title="Wedding live" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    </section>
  );
}

export function Blessings({ items }: { items: { id: string; author: string; relation: string | null; message: string }[] }) {
  return (
    <section className="g-section" id="aashirwad">
      <p className="g-kicker">Aashirwad</p>
      <h2>Blessings from the elders</h2>
      <div className="g-blessings">
        {items.map((item) => (
          <blockquote key={item.id} className="g-blessing">
            <p>“{item.message}”</p>
            <footer>{item.author}{item.relation ? `, ${item.relation}` : ""}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

export function SiteFooter({ couple }: { couple: string }) {
  return (
    <footer className="g-footer">
      <p className="g-script" lang="hi">धन्यवाद</p>
      <p>{couple}</p>
      <Link href="/">Made with The Wedding Home</Link>
    </footer>
  );
}

export function VenueBlock({ event, theme }: { event: { title: string; venue: SiteEvent["venue"] }; theme?: ResolvedTheme }) {
  if (!event.venue) return <p className="g-muted">The venue will be shared soon.</p>;
  return (
    <div className="g-venue">
      <div>
        <h3>{event.venue.name ?? event.title}</h3>
        {event.venue.address || event.venue.city ? <p className="g-muted">{[event.venue.address, event.venue.city].filter(Boolean).join(", ")}</p> : null}
      </div>
      {event.venue.embedUrl ? (
        <a className="g-map" href={event.venue.mapsUrl ?? "#"} target="_blank" rel="noopener noreferrer" aria-label={`Open ${event.venue.name ?? "the venue"} in Google Maps`}>
          <iframe title={`Map of ${event.venue.name ?? event.title}`} src={event.venue.embedUrl} loading="lazy" tabIndex={-1} />
        </a>
      ) : null}
      {event.venue.mapsUrl ? (
        <a className="g-btn" href={event.venue.mapsUrl} target="_blank" rel="noopener noreferrer" style={theme ? { background: theme.accent, color: theme.world.accentText } : undefined}>
          <Icon name="map" size={17} /> Open in Google Maps
        </a>
      ) : null}
    </div>
  );
}

export function FunctionDetail({ site, event, base, helplines }: { site: { title: string | null; brideName: string; groomName: string; events: { id: string; title: string }[] }; event: SiteEvent; base: string; helplines: { side: "bride" | "groom"; name: string; phone: string }[] }) {
  const theme = event.theme;
  return (
    <>
      <Soundtrack music={theme.music} />
      <SiteHeader site={site} base={base} links={[{ href: base, label: "Home" }, { href: "#where", label: "Where" }]} />
      <nav className="g-fn-switch" aria-label="Functions">
        {site.events.map((item) => (
          <Link key={item.id} href={`${base}/${item.id}`} aria-current={item.id === event.id ? "page" : undefined}>{item.title}</Link>
        ))}
      </nav>
      <Stage theme={theme} className="g-stage-hero">
        <p className="g-kicker">{theme.world.region}</p>
        <p className="g-stage-script" lang="hi">{theme.world.script}</p>
        <h1 className="g-stage-title">{event.title}</h1>
        <p className="g-stage-when">{longDay(event.startsAt)} · {clock(event.startsAt)}{event.endsAt ? ` to ${clock(event.endsAt)}` : ""}</p>
        {event.muhuratAt ? <p className="g-stage-when">Muhurat {clock(event.muhuratAt)}</p> : null}
        <SoundToggle inline />
      </Stage>
      <main className="g-fn-body" style={{ ["--fn-accent" as string]: theme.accent }}>
        {event.description ? (
          <section className="g-card">
            <p className="g-kicker">What this is</p>
            <p className="g-prose">{event.description}</p>
          </section>
        ) : null}
        {event.dressNote || event.howToReach || event.parking ? (
          <section className="g-card g-facts">
            {event.dressNote ? <div><Icon name="sparkle" size={18} /><span><strong>What to wear</strong>{event.dressNote}</span></div> : null}
            {event.howToReach ? <div><Icon name="map" size={18} /><span><strong>How to reach</strong>{event.howToReach}</span></div> : null}
            {event.parking ? <div><Icon name="store" size={18} /><span><strong>Parking</strong>{event.parking}</span></div> : null}
          </section>
        ) : null}
        <section className="g-card" id="where">
          <p className="g-kicker">Where</p>
          <VenueBlock event={event} theme={theme} />
        </section>
        {helplines.length ? <Helplines lines={helplines} /> : null}
        <Link className="g-link" href={base}><Icon name="arrowLeft" size={14} /> All functions</Link>
      </main>
      <SiteFooter couple={coupleOf(site)} />
    </>
  );
}
