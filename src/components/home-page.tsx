"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FunctionStage } from "@/components/guest/function-art";
import { Mark } from "@/components/mark";
import { usePreview } from "@/components/preview-session";
import { functions, type FunctionId } from "@/data/sample";

const specs = [
  { title: "Muhurat", line: "The auspicious time is written on the wedding function." },
  { title: "Headcount", line: "Guests see how many people are coming. Not other families’ names." },
  { title: "Diet", line: "Veg, non-veg, and Jain, counted for the caterer." },
  { title: "Helpline", line: "Two numbers, for the gate and for the family." },
  { title: "WhatsApp", line: "A prefilled message, and that household’s own link." },
];

export function HomePage({ days }: { days: number }) {
  const { person, wedding, signOut } = usePreview();
  const [openNav, setOpenNav] = useState(false);
  const startHref = !person ? "/plan" : wedding ? "/app" : "/plan";
  const startLabel = !person ? "Plan the wedding" : wedding ? "Open the wedding" : "Finish the wedding";
  const [active, setActive] = useState<FunctionId>("haldi");
  const [openSpec, setOpenSpec] = useState<string | null>(null);
  const fn = functions.find((item) => item.id === active) ?? functions[0];

  return (
    <>
      <header className={openNav ? "site-header open" : "site-header"}>
        <Mark />
        <nav className="site-nav" aria-label="Page">
          <a href="#week" onClick={() => setOpenNav(false)}>The week</a>
          <a href="#family" onClick={() => setOpenNav(false)}>Family</a>
          <a href="#guests" onClick={() => setOpenNav(false)}>Guests</a>
          <Link className="nav-cta" href={startHref} onClick={() => setOpenNav(false)}>{startLabel}</Link>
          {person ? (
            <button className="btn-text" type="button" onClick={() => { signOut(); setOpenNav(false); }}>Sign out</button>
          ) : (
            <Link href="/sign-in" onClick={() => setOpenNav(false)}>Sign in</Link>
          )}
        </nav>
        <div className="header-actions">
          <Link className="btn" href={startHref}>{startLabel}</Link>
          <button className="btn-text menu-toggle" type="button" aria-expanded={openNav} onClick={() => setOpenNav((v) => !v)}>
            Menu
          </button>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div>
            <p className="eyebrow"><i /> Jaipur · 18 December 2026</p>
            <h1>Every function, in one shared home.</h1>
            <p className="lede">The family plans the week together. Guests open one link, reply, and share photographs. No account.</p>
            <div className="actions">
              <Link className="btn" href={startHref}>{startLabel}</Link>
              <Link className="btn-text" href="/invite">See a guest invite →</Link>
            </div>
            <p className="fine">The family plans together. Guests never make an account.</p>
          </div>
          <div className="stage">
            <article className="glass countdown">
              <div className="row-between">
                <p className="kicker">Days to the wedding</p>
                <span className="chip">Jaipur ’26</span>
              </div>
              <p className="count">{days}<span>days</span></p>
              <div className="row-between" style={{ marginTop: "1rem" }}>
                <div>
                  <p className="kicker">Next</p>
                  <strong>Haldi</strong>
                </div>
                <span className="muted">16 Dec · 10:00 am</span>
              </div>
            </article>
            <article className="glass pass">
              <div className="row-between">
                <p className="kicker">Guest pass</p>
                <span className="chip">No account</span>
              </div>
              <div className="row-between" style={{ marginTop: "0.8rem" }}>
                <div>
                  <h2 className="serif">Aanya & Kabir</h2>
                  <p>Rambagh Palace · Jaipur</p>
                </div>
                <span className="qr" aria-hidden="true" />
              </div>
            </article>
          </div>
        </section>

        <section className="wrap section" id="week">
          <div className="section-head">
            <div>
              <p className="kicker">The week</p>
              <h2 className="serif">Five functions. One home.</h2>
            </div>
            <p className="muted">Each function keeps its own script, pattern, and raga.</p>
          </div>
          <div className="tabs" role="tablist" aria-label="Functions">
            {functions.map((item) => (
              <button
                key={item.id}
                className="tab"
                type="button"
                role="tab"
                aria-selected={item.id === active}
                style={item.id === active ? { background: item.wash, color: item.ink } : undefined}
                onClick={() => setActive(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
          <div className="week-grid">
            <article className="band function-band">
              <FunctionStage id={fn.id} badge={fn.badge} title={fn.title} when={`${fn.when} · ${fn.venue}`} compact />
              <div className="band-actions">
                <Link className="btn" href={`/w/aanya-and-kabir/${fn.id}`}>Open {fn.title}</Link>
              </div>
            </article>
            <aside className="glass family-card">
              <p className="kicker">Family app</p>
              <h3 className="serif">The same wedding, for everyone organising.</h3>
              <div className="ops">
                <div><span>{days} days</span><span className="muted">Countdown</span></div>
                <div><span>12 / 40 tasks</span><span className="muted">Open work</span></div>
                <div><span>41 replies</span><span className="muted">Households</span></div>
              </div>
              <p className="fine">This card stays bone. Colour belongs to the function.</p>
            </aside>
          </div>
        </section>

        <section className="wrap section">
          <div className="stills">
            <figure className="glass still">
              <div className="still-photo">
                <Image src="/photos/wedding.jpg" alt="Palace lawn and mandap prepared for the wedding" fill sizes="(min-width: 980px) 40vw, 100vw" />
              </div>
              <figcaption>
                <div>
                  <p className="kicker">Family</p>
                  <h3 className="serif">One shared wedding</h3>
                </div>
              </figcaption>
            </figure>
            <figure className="glass still">
              <div className="still-photo">
                <Image src="/photos/sangeet.jpg" alt="Evening pavilion prepared for the sangeet" fill sizes="(min-width: 980px) 40vw, 100vw" />
              </div>
              <figcaption>
                <div>
                  <p className="kicker">Guests</p>
                  <h3 className="serif">One guest link</h3>
                </div>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="wrap section" id="family">
          <div className="section-head">
            <div>
              <p className="kicker">The family app</p>
              <h2 className="serif">One wedding. Two roles. No guest accounts.</h2>
            </div>
            <p className="muted">Admins invite the family. Managers plan with them. Guests never sign up.</p>
          </div>
          <div className="specs" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              ["Events", "Each function has a venue. Open it in Google Maps."],
              ["Guests", "One link per household, on WhatsApp or by email."],
              ["RSVP", "How many are coming, with veg, non-veg, and Jain."],
              ["Tasks", "Shared work. All, mine, or done."],
              ["Spend", "A log in rupees. Not a budget."],
              ["Gallery", "Photographs and videos in one private link."],
            ].map(([title, line]) => (
              <article key={title} className="spec">
                <span className="icon-blob" aria-hidden="true">{title.slice(0, 1)}</span>
                <strong>{title}</strong>
                <p>{line}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wrap section" id="guests">
          <div className="section-head">
            <p className="kicker">What a guest can do</p>
          </div>
          <div className="specs">
            {specs.map((spec) => (
              <button
                key={spec.title}
                className="spec"
                type="button"
                aria-expanded={openSpec === spec.title}
                onClick={() => setOpenSpec((current) => (current === spec.title ? null : spec.title))}
              >
                <span className="icon-blob" aria-hidden="true">{spec.title.slice(0, 1)}</span>
                <strong>{spec.title}</strong>
                {openSpec === spec.title ? <p>{spec.line}</p> : <small>Tap for the detail</small>}
              </button>
            ))}
          </div>
        </section>

        <section className="wrap closing">
          <h2>Every function, in one shared home.</h2>
          <div className="actions" style={{ justifyContent: "center" }}>
            <Link className="btn" href={startHref}>{startLabel}</Link>
          </div>
          <div className="rule" />
          <p>The operating system for Indian marriages.</p>
          <p className="fine"><a href="mailto:onboarding@aryanjaiswal.in">onboarding@aryanjaiswal.in</a></p>
        </section>
      </main>
      <footer className="site-footer">
        <nav>
          <a href="#week">The week</a>
          <a href="#family">Family</a>
          <a href="#guests">Guests</a>
          {person ? (
            <button type="button" onClick={() => signOut()}>Sign out</button>
          ) : (
            <Link href="/sign-in">Sign in</Link>
          )}
        </nav>
      </footer>
    </>
  );
}
