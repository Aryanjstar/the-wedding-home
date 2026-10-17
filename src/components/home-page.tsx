"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Mark } from "@/components/mark";
import { usePreview } from "@/components/preview-session";
import { functions } from "@/data/sample";
import { themePacks, type ThemePackId } from "@/data/theme-packs";

const features = [
  { kicker: "The week", title: "Every celebration, dated", line: "Haldi through reception, with the venue a tap away.", photo: "/photos/haldi.jpg" },
  { kicker: "Invitations", title: "A link for each household", line: "WhatsApp, email, and a reply you can count.", photo: "/photos/mehendi.jpg" },
  { kicker: "The work", title: "What still needs doing", line: "Priorities, names, and a clear done column.", photo: "/photos/sangeet.jpg" },
  { kicker: "Spend", title: "Rupees, as they leave", line: "A log of what the wedding has already cost.", photo: "/photos/wedding.jpg" },
  { kicker: "People", title: "The ones you hired", line: "Florists, photographers, pandits. Contacts, not a marketplace.", photo: "/photos/reception.jpg" },
  { kicker: "The site", title: "A home guests can open", line: "A theme, the week, and a live link if you have one.", photo: "/photos/wedding.jpg" },
];

export function HomePage({ days }: { days: number }) {
  const { person, wedding, signOut } = usePreview();
  const [openNav, setOpenNav] = useState(false);
  const [packId, setPackId] = useState<ThemePackId>("traditional");
  const pack = themePacks[packId];
  const startHref = !person ? "/plan" : wedding ? "/app" : "/plan";
  const startLabel = !person ? "Plan the wedding" : wedding ? "Open the wedding" : "Finish the wedding";

  return (
    <>
      <header className={openNav ? "site-header open" : "site-header"}>
        <Mark />
        <nav className="site-nav" aria-label="Page">
          <a href="#features" onClick={() => setOpenNav(false)}>Features</a>
          <a href="#how" onClick={() => setOpenNav(false)}>How it works</a>
          <a href="#themes" onClick={() => setOpenNav(false)}>Themes</a>
          <Link className="nav-cta" href={startHref} onClick={() => setOpenNav(false)}>{startLabel}</Link>
          {person ? (
            <button className="btn-text" type="button" onClick={() => { signOut(); setOpenNav(false); }}>Sign out</button>
          ) : (
            <Link href="/sign-in" onClick={() => setOpenNav(false)}>Sign in</Link>
          )}
        </nav>
        <div className="header-actions">
          <Link className="btn" href={startHref}>{startLabel}</Link>
          <button className="btn-text menu-toggle" type="button" aria-expanded={openNav} onClick={() => setOpenNav((value) => !value)}>Menu</button>
        </div>
      </header>

      <main className="market">
        <section className="wrap market-hero">
          <p className="eyebrow"><i /> The wedding, in one home</p>
          <h1>Plan the week.<br /><em>Keep it together.</em></h1>
          <p className="lede">Names, functions, guests, spend, and a site they can open. One place for an Indian wedding.</p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <Link className="btn" href={startHref}>{startLabel}</Link>
            <a className="btn ghost" href="#how">See how it works</a>
          </div>
        </section>

        <section className="wrap">
          <article className="workspace-frame">
            <header className="workspace-top">
              <span>Aanya & Kabir</span>
              <span className="muted">Jaipur · 18 December 2026</span>
            </header>
            <div className="workspace-stats">
              <div><span className="kicker">Days</span><b>{days}</b><small>until the wedding</small></div>
              <div><span className="kicker">Next</span><b>Haldi</b><small>16 Dec · 10:00 am</small></div>
              <div><span className="kicker">Replies</span><b>41</b><small>households have answered</small></div>
              <div><span className="kicker">Spent</span><b>₹18.4L</b><small>logged so far</small></div>
            </div>
            <div className="workspace-split">
              <div>
                <p className="kicker">Coming up</p>
                {functions.slice(0, 3).map((item) => (
                  <p key={item.id} className="coming-row"><strong>{item.title}</strong><span>{item.time}</span></p>
                ))}
              </div>
              <div>
                <p className="kicker">Still open</p>
                <p className="coming-row"><strong>Confirm the mandap flowers</strong><span>Aanya</span></p>
                <p className="coming-row"><strong>Print the welcome cards</strong><span>Ritu</span></p>
                <p className="coming-row done"><strong>Book the shehnai</strong><span>Done</span></p>
              </div>
            </div>
          </article>
        </section>

        <section className="wrap section" id="how">
          <div className="section-head">
            <div>
              <p className="kicker">How it works</p>
              <h2 className="serif">Three steps. Then the week is in one place.</h2>
            </div>
          </div>
          <ol className="steps">
            <li><span>01</span><h3 className="serif">Name the wedding</h3><p>Bride, groom, date, and city. The countdown starts there.</p></li>
            <li><span>02</span><h3 className="serif">Lay out the week</h3><p>Haldi, mehendi, sangeet, pheras, reception. Add the people helping.</p></li>
            <li><span>03</span><h3 className="serif">Share the links</h3><p>Each household gets an invitation. The gallery has one address.</p></li>
          </ol>
        </section>

        <section className="wrap section" id="features">
          <div className="section-head">
            <div>
              <p className="kicker">Features</p>
              <h2 className="serif">Everything the week asks for.</h2>
            </div>
          </div>
          <div className="feature-grid">
            {features.map((item) => (
              <article key={item.title} className="feature-card">
                <div className="feature-photo">
                  <Image src={item.photo} alt="" fill sizes="(min-width: 900px) 30vw, 100vw" />
                </div>
                <p className="kicker">{item.kicker}</p>
                <h3 className="serif">{item.title}</h3>
                <p>{item.line}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wrap section" id="week">
          <div className="section-head">
            <div>
              <p className="kicker">The week</p>
              <h2 className="serif">Five functions. One home.</h2>
            </div>
            <Link className="btn-text" href="/w/aanya-and-kabir">Open the sample →</Link>
          </div>
          <div className="function-rail">
            {functions.map((item) => (
              <Link key={item.id} className="function-tile" href={`/w/aanya-and-kabir/${item.id}`} style={{ background: item.wash, color: item.ink }}>
                <span>{item.when.replace(" 2026", "")}</span>
                <strong className="serif">{item.title}</strong>
                <small>{item.time}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="wrap section" id="themes">
          <div className="section-head">
            <div>
              <p className="kicker">Themes</p>
              <h2 className="serif">A look for the wedding, and for each night.</h2>
            </div>
          </div>
          <div className="theme-layout">
            <div className="theme-choices">
              {(Object.values(themePacks)).map((item) => (
                <button key={item.id} type="button" className="theme-choice" aria-pressed={item.id === packId} onClick={() => setPackId(item.id)}>
                  <i style={{ background: item.accent }} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.soul}</small>
                  </span>
                </button>
              ))}
            </div>
            <article className="theme-stage" style={{ background: pack.bg, color: pack.text }}>
              <p className="kicker" style={{ color: pack.accent }}>{pack.label}</p>
              <h3 className="serif">Aanya & Kabir</h3>
              <p>invite you to a week in Jaipur.</p>
              <p className="theme-date">18 December 2026</p>
              <span className="theme-pill" style={{ background: pack.accent, color: pack.accentText }}>Open the invitation</span>
            </article>
          </div>
        </section>

        <section className="wrap section">
          <div className="section-head">
            <div>
              <p className="kicker">Photographs</p>
              <h2 className="serif">The week, after it has happened.</h2>
            </div>
          </div>
          <div className="photo-rail">
            {functions.map((item) => (
              <figure key={item.id}>
                <Image src={item.photo} alt="" width={640} height={800} />
                <figcaption>{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="wrap closing">
          <h2>Start with the names and the date.</h2>
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
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#themes">Themes</a>
          <Link href="/w/aanya-and-kabir">Sample wedding</Link>
          {person ? <button type="button" onClick={() => signOut()}>Sign out</button> : <Link href="/sign-in">Sign in</Link>}
        </nav>
      </footer>
    </>
  );
}
