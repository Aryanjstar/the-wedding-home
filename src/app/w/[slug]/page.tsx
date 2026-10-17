import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Mark } from "@/components/mark";
import { readPublishedSite } from "@/modules/website/service";

export const metadata: Metadata = { title: "Wedding · The Wedding Home" };

function when(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function PublishedWeddingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await readPublishedSite(slug);
  if (!site) notFound();
  const names = `${site.brideName} & ${site.groomName}`;
  const pack = site.pack;
  const theme = {
    "--theme-bg": pack.bg,
    "--theme-surface": pack.surface,
    "--theme-text": pack.text,
    "--theme-muted": pack.muted,
    "--theme-accent": pack.accent,
    "--theme-accent-text": pack.accentText,
  } as CSSProperties;

  return (
    <div className="guest-theme" style={theme}>
      <header className="guest-bar" style={{ background: "var(--theme-surface)", color: "var(--theme-text)" }}>
        <Mark href={`/w/${slug}`} />
        <nav className="guest-nav" aria-label="Guest">
          <a href="#week">Week</a>
          {site.liveEmbed ? <a href="#live">Live</a> : null}
          <Link href="/">The Wedding Home</Link>
        </nav>
      </header>
      <section className="wrap" style={{ padding: "3.5rem 0 1rem" }}>
        <p className="kicker">{site.city}</p>
        <h1 className="serif" style={{ fontSize: "clamp(2.6rem, 7vw, 5rem)", margin: "0.2rem 0" }}>{site.title || names}</h1>
        <p className="lede">{site.weddingDate} · {pack.label}</p>
        {site.story ? <p style={{ maxWidth: 640 }}>{site.story}</p> : null}
      </section>
      <main className="wrap" id="week" style={{ paddingBottom: "4rem" }}>
        <p className="kicker">The week</p>
        <h2 className="serif">When to come</h2>
        <div className="list" style={{ marginTop: "1rem" }}>
          {site.events.length === 0 ? <p className="muted">The functions will appear here.</p> : null}
          {site.events.map((event) => (
            <article key={event.id} className="list-row" style={{ background: "var(--theme-surface)" }}>
              <div>
                <strong>{event.title}</strong>
                <p className="muted">{when(event.startsAt)}{event.venue ? ` · ${event.venue}` : ""}</p>
              </div>
              {event.mapsUrl ? <a className="btn" href={event.mapsUrl}>Open in Google Maps</a> : null}
            </article>
          ))}
        </div>
        {site.liveEmbed ? (
          <section id="live" style={{ marginTop: "2rem" }}>
            <p className="kicker">Live</p>
            <div className="glass" style={{ overflow: "hidden", borderRadius: 14, aspectRatio: "16 / 9" }}>
              <iframe
                title="Wedding live"
                src={site.liveEmbed}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
