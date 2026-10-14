import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { GuestChrome } from "@/components/guest/chrome";
import { blessings, couple, families, functions, helplines, stays } from "@/data/sample";

export const metadata: Metadata = { title: "Aanya & Kabir · The Wedding Home" };

export default function PublicHomePage() {
  return (
    <GuestChrome>
      <section className="hero-photo">
        <Image src="/photos/wedding.jpg" alt="Palace lawn prepared for the wedding" fill priority sizes="100vw" />
        <div className="veil" />
        <div className="copy wrap">
          <p className="kicker">Jaipur</p>
          <h1>{couple.short}</h1>
          <p>{couple.dateLabel}</p>
        </div>
      </section>
      <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
        <section id="week">
          <p className="kicker">The week</p>
          <h2 className="serif">When to come</h2>
          <div className="timeline" style={{ marginTop: "1rem" }}>
            {functions.map((item) => (
              <Link key={item.id} className="shot" href={`/w/aanya-and-kabir/${item.id}`}>
                <Image src={item.photo} alt="" fill sizes="20vw" />
                <span>
                  <strong>{item.title}</strong>
                  {item.when}
                  <small>{item.venue}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section id="families" style={{ marginTop: "2.4rem" }}>
          <p className="kicker">Meet the families</p>
          <div className="stills">
            {families.map((family) => (
              <article key={family.side} className="glass card">
                <Image src={family.photo} alt="" width={800} height={360} style={{ height: 180, width: "100%", objectFit: "cover", borderRadius: 10 }} />
                <p className="kicker" style={{ marginTop: "0.8rem" }}>{family.side}</p>
                <h3 className="serif">{family.heading}</h3>
                <p className="muted">{family.blurb}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="stay" style={{ marginTop: "2.4rem" }}>
          <p className="kicker">Stay</p>
          <div className="list">
            {stays.map((stay) => (
              <article key={stay.name} className="glass list-row">
                <strong>{stay.name}</strong>
                <span className="muted">{stay.note}</span>
              </article>
            ))}
          </div>
          <div className="list" style={{ marginTop: "0.8rem" }}>
            {helplines.map((line) => (
              <article key={line.phone} className="glass list-row">
                <span>{line.label} · {line.name}</span>
                <a href={`tel:${line.phone.replace(/\s/g, "")}`}>{line.phone}</a>
              </article>
            ))}
          </div>
        </section>
        <section id="blessings" style={{ marginTop: "2.4rem" }}>
          <p className="kicker">Aashirwad</p>
          <div className="stills">
            {blessings.map((blessing) => (
              <blockquote key={blessing.author} className="glass card">
                <p className="serif" style={{ fontSize: "1.4rem", margin: 0 }}>{blessing.message}</p>
                <p className="muted">{blessing.author} · {blessing.relation}</p>
              </blockquote>
            ))}
          </div>
        </section>
      </main>
    </GuestChrome>
  );
}
