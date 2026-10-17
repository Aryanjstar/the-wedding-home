"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { MusicPreview } from "@/components/guest/sound";
import { Stage } from "@/components/guest/stage";
import { useSession } from "@/components/session";
import { Icon, type IconName } from "@/components/ui/icon";
import { music, occasionMusic, resolveTheme, type MusicId } from "@/data/worlds";

const functionsStrip = [
  ["रोका", "Roka"],
  ["हल्दी", "Haldi"],
  ["मेहँदी", "Mehendi"],
  ["संगीत", "Sangeet"],
  ["बारात", "Baraat"],
  ["फेरे", "Pheras"],
  ["विदाई", "Vidaai"],
  ["स्वागत", "Reception"],
];

const worldCards: { kind: string; title: string; when: string; world?: string; music?: MusicId }[] = [
  { kind: "haldi", title: "Haldi", when: "Morning, in the courtyard" },
  { kind: "mehendi", title: "Mehendi", when: "Afternoon, on the verandah" },
  { kind: "sangeet", title: "Sangeet", when: "A night of dancing" },
  { kind: "wedding", title: "Pheras", when: "Seven rounds of the fire" },
  { kind: "wedding", title: "Muhurtham", when: "The South Indian temple wedding", world: "wedding", music: "kettimelam" },
  { kind: "reception", title: "Reception", when: "Under the chhatris at night" },
];

function Toran() {
  return (
    <svg className="h-toran" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 6 Q300 40 600 6 T1200 6" fill="none" stroke="#c8902b" strokeWidth="2" />
      {Array.from({ length: 25 }, (_, index) => {
        const x = index * 50;
        const y = Math.round((6 + Math.abs(Math.sin((index / 12) * Math.PI)) * 17) * 10) / 10;
        return (
          <g key={index}>
            <path d={`M${x + 25} ${y + 2} q-10 22 0 44 q10 -22 0 -44z`} fill={index % 2 ? "#3d6b4a" : "#4f7d57"} />
            <circle cx={x} cy={y + 4} r="7" fill={index % 3 ? "#e3a018" : "#f08a24"} />
            <circle cx={x} cy={y + 4} r="3" fill="#b85c10" />
          </g>
        );
      })}
    </svg>
  );
}

function Feature({ icon, kicker, title, children, className }: { icon: IconName; kicker: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`h-bento-card${className ? ` ${className}` : ""}`}>
      <span className="h-bento-icon"><Icon name={icon} size={20} /></span>
      <p className="h-kicker">{kicker}</p>
      <h3>{title}</h3>
      <div className="h-bento-demo">{children}</div>
    </article>
  );
}

export function HomePage({ days }: { days: number }) {
  const { person, wedding, signOut } = useSession();
  const [openNav, setOpenNav] = useState(false);
  const startHref = !person ? "/plan" : wedding ? "/app" : "/plan";
  const startLabel = !person ? "Plan your wedding" : wedding ? "Open your wedding" : "Finish your wedding";

  return (
    <div className="h-page">
      <header className={openNav ? "h-header is-open" : "h-header"}>
        <Link href="/" className="h-brand" aria-label="The Wedding Home">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="14" r="1.6" fill="currentColor" /></svg>
          <span>The Wedding Home</span>
        </Link>
        <nav className="h-nav" aria-label="Page">
          <a href="#worlds" onClick={() => setOpenNav(false)}>Functions</a>
          <a href="#features" onClick={() => setOpenNav(false)}>Features</a>
          <a href="#guests" onClick={() => setOpenNav(false)}>For guests</a>
          <Link href="/w/aanya-and-kabir" onClick={() => setOpenNav(false)}>Sample wedding</Link>
          {person ? (
            <button type="button" onClick={() => { void signOut(); setOpenNav(false); }}>Sign out</button>
          ) : (
            <Link href="/sign-in" onClick={() => setOpenNav(false)}>Sign in</Link>
          )}
        </nav>
        <div className="h-header-actions">
          <Link className="h-btn h-btn-gold h-btn-sm" href={startHref}>{startLabel}</Link>
          <button className="h-menu" type="button" aria-expanded={openNav} aria-label={openNav ? "Close menu" : "Open menu"} onClick={() => setOpenNav((value) => !value)}>
            <Icon name={openNav ? "close" : "menu"} size={20} />
          </button>
        </div>
      </header>

      <section className="h-hero">
        <Toran />
        <div className="h-hero-grid">
          <div className="h-hero-copy">
            <p className="h-script" lang="hi">॥ शुभ विवाह ॥</p>
            <h1>Every function.<br />Every family.<br /><em>One home.</em></h1>
            <p className="h-lede">Plan the whole Indian wedding with your family in one place: the haldi to the vidaai, every household&apos;s RSVP, the caterer&apos;s count, the spend in rupees. Then give your guests a website with its own music for every function.</p>
            <div className="h-ctas">
              <Link className="h-btn h-btn-gold" href={startHref}>{startLabel} <Icon name="chevronRight" size={18} /></Link>
              <Link className="h-btn h-btn-ghost" href="/w/aanya-and-kabir">See a sample wedding</Link>
            </div>
            <ul className="h-trust">
              <li><Icon name="shield" size={16} /> Guests never sign up</li>
              <li><Icon name="whatsapp" size={16} /> Invites on WhatsApp</li>
              <li><Icon name="phone" size={16} /> No app to install</li>
            </ul>
          </div>
          <div className="h-hero-art" aria-hidden="true">
            <div className="h-arch">
              <Image src="/photos/wedding.jpg" alt="" fill priority sizes="(min-width: 900px) 40vw, 90vw" />
              <div className="h-arch-veil" />
              <div className="h-arch-copy">
                <span lang="hi">आन्या संग कबीर</span>
                <strong>Aanya &amp; Kabir</strong>
                <small>18 December · Jaipur</small>
              </div>
            </div>
            <div className="h-float h-float-count">
              <b>{days}</b>
              <span>days to go<br /><small>Muhurat 8:14 pm</small></span>
            </div>
            <div className="h-float h-float-rsvp">
              <span className="h-float-head"><Icon name="check" size={14} /> Sharma family replied</span>
              <strong>4 coming to the Haldi</strong>
              <span className="h-chips"><i className="veg">Veg 2</i><i className="nonveg">Non-veg 1</i><i className="jain">Jain 1</i></span>
            </div>
            <div className="h-float h-float-wa">
              <span className="h-float-head"><Icon name="whatsapp" size={14} /> WhatsApp</span>
              <p>You&apos;re invited to Aanya &amp; Kabir&apos;s wedding. Open your link to see your functions and RSVP.</p>
              <small>thewedding.home/i/•••• · 9:41</small>
            </div>
            <div className="h-float h-float-music">
              <span className="h-eq" aria-hidden="true"><i /><i /><i /><i /></span>
              <span>Haldi · <strong>Boliyan on dholak</strong></span>
            </div>
          </div>
        </div>
      </section>

      <div className="h-strip" aria-label="The functions">
        <div className="h-strip-track">
          {[...functionsStrip, ...functionsStrip].map(([hi, en], index) => (
            <span key={`${en}-${index}`}><b lang="hi">{hi}</b>{en}<i aria-hidden="true">✦</i></span>
          ))}
        </div>
      </div>

      <section className="h-section h-worlds" id="worlds">
        <div className="h-head">
          <p className="h-kicker">Every function, its own world</p>
          <h2>The haldi is turmeric. The sangeet is a jewel night.</h2>
          <p>Each function on your guest website gets its own colours, its own motif from Indian craft, and its own music: an original raga on the instruments you would hear there. It plays as guests arrive; one tap mutes it.</p>
        </div>
        <div className="h-world-grid">
          {worldCards.map((card) => {
            const theme = resolveTheme("traditional", card.kind, card.world || card.music ? { world: card.world ?? null, music: card.music ?? null } : null);
            const piece = card.music ?? occasionMusic[card.kind];
            const info = piece && piece !== "none" ? music[piece] : null;
            return (
              <article key={card.title} className="h-world">
                <Stage theme={theme} compact>
                  <span className="h-world-script" lang="hi">{theme.world.script}</span>
                </Stage>
                <div className="h-world-body">
                  <h3>{card.title}</h3>
                  <p>{card.when}</p>
                  <div className="h-world-music">
                    <span><Icon name="volume" size={15} /> {info?.label}</span>
                    <MusicPreview music={piece} />
                  </div>
                  <small>{info?.instruments}</small>
                </div>
              </article>
            );
          })}
        </div>
        <p className="h-note">Twenty-two pieces from North and South: shehnai, nadaswaram and thavil, dhol, dholak, tabla, mridangam, sitar, veena, santoor, sarangi, bansuri, harmonium, the shankh and temple bells. Pick any for any function.</p>
      </section>

      <section className="h-section" id="features">
        <div className="h-head">
          <p className="h-kicker">For the family</p>
          <h2>Everything the week asks for.</h2>
          <p>Parents, siblings, and trusted friends plan together: Admins and Managers see the same wedding, and nobody keeps a private spreadsheet.</p>
        </div>
        <div className="h-bento">
          <Feature icon="home" kicker="Dashboard" title="The countdown, and what needs you" className="h-bento-wide h-bento-dark">
            <div className="h-mini-dash">
              <div><b>61</b><span>days to go</span></div>
              <div><b>41 / 86</b><span>households replied</span></div>
              <div><b>₹18.4 L</b><span>spent so far</span></div>
              <div><b>12 / 40</b><span>tasks done</span></div>
            </div>
          </Feature>
          <Feature icon="users" kicker="Guests" title="Households, not spreadsheets">
            <ul className="h-mini-list">
              <li><span>Sharma family</span><i className="yes">Haldi · 4</i></li>
              <li><span>Mehta ji and family</span><i className="wait">Waiting</i></li>
              <li><span>College friends</span><i className="yes">Sangeet · 6</i></li>
            </ul>
          </Feature>
          <Feature icon="whatsapp" kicker="Invitations" title="Their own link, on WhatsApp">
            <div className="h-mini-wa">One tap opens their chat with the invitation and their private RSVP link. Email and a picture e-card for the elders too.</div>
          </Feature>
          <Feature icon="bell" kicker="Reminders" title="1 month, 1 week, 1 day before">
            <div className="h-mini-steps"><span>1m</span><span>1w</span><span>1d</span><span className="now">Send now</span></div>
          </Feature>
          <Feature icon="users" kicker="Caterer" title="Veg, non-veg, Jain, per function">
            <div className="h-mini-bars">
              <span style={{ width: "62%" }} className="veg">Veg 214</span>
              <span style={{ width: "30%" }} className="nonveg">Non-veg 98</span>
              <span style={{ width: "12%" }} className="jain">Jain 31</span>
            </div>
          </Feature>
          <Feature icon="checkSquare" kicker="Tasks" title="A name and a date on every job">
            <ul className="h-mini-tasks">
              <li className="done">Book the shehnai</li>
              <li>Confirm the mandap flowers <i>Aanya</i></li>
              <li>Print the welcome cards <i>Ritu</i></li>
            </ul>
          </Feature>
          <Feature icon="rupee" kicker="Spend log" title="Every rupee, as it leaves">
            <div className="h-mini-spend"><b>₹18,40,500</b><span>Venue ₹12 L · Catering ₹4.8 L · Decor ₹1.6 L</span></div>
          </Feature>
          <Feature icon="store" kicker="Vendors" title="Near the venue, on the map">
            <ul className="h-mini-list">
              <li><span>Shreeram Flowers</span><i>1.7 km</i></li>
              <li><span>Agarwal Caterers</span><i>2.3 km</i></li>
              <li><span>Lens &amp; Light Studio</span><i>₹1.2 L agreed</i></li>
            </ul>
          </Feature>
          <Feature icon="live" kicker="Live" title="The pheras, live on your site">
            <div className="h-mini-live"><span><Icon name="play" size={22} /></span><small>Paste a YouTube or Vimeo link; nani watches from Toronto.</small></div>
          </Feature>
          <Feature icon="photo" kicker="Gallery" title="Every phone's photos, one QR" className="h-bento-wide">
            <div className="h-mini-photos">
              {["haldi", "mehendi", "sangeet", "reception"].map((name) => (
                <Image key={name} src={`/photos/${name}.jpg`} alt="" width={240} height={240} />
              ))}
              <span className="h-mini-qr"><Icon name="qr" size={34} /><small>Scan at the venue</small></span>
            </div>
          </Feature>
        </div>
      </section>

      <section className="h-section h-split" id="guests">
        <div className="h-split-card h-split-family">
          <p className="h-kicker">The family app</p>
          <h3>For the people running the wedding</h3>
          <ul>
            <li><Icon name="check" size={16} /> Functions with venues, maps, and the muhurat</li>
            <li><Icon name="check" size={16} /> Admins and Managers on the same wedding</li>
            <li><Icon name="check" size={16} /> RSVPs, reminders, and the caterer&apos;s count</li>
            <li><Icon name="check" size={16} /> Tasks, a rupee spend log, and vendors</li>
            <li><Icon name="check" size={16} /> A themed website with a live stream</li>
          </ul>
        </div>
        <div className="h-split-card h-split-guest">
          <p className="h-kicker">The guests</p>
          <h3>For everyone you invite</h3>
          <ul>
            <li><Icon name="check" size={16} /> No account, no app, no password</li>
            <li><Icon name="check" size={16} /> Only the functions they are invited to</li>
            <li><Icon name="check" size={16} /> RSVP per function, with diet</li>
            <li><Icon name="check" size={16} /> The map, what to wear, who to call</li>
            <li><Icon name="check" size={16} /> One shared album for every phone</li>
          </ul>
        </div>
      </section>

      <section className="h-section">
        <div className="h-head">
          <p className="h-kicker">How it works</p>
          <h2>Three steps. Then the week is in one place.</h2>
        </div>
        <ol className="h-steps">
          <li><b lang="hi">१</b><h3>Name the wedding</h3><p>Bride, groom, date, and city. The countdown starts there.</p></li>
          <li><b lang="hi">२</b><h3>Lay out the week</h3><p>Haldi to reception, with venues. Invite the family to plan with you.</p></li>
          <li><b lang="hi">३</b><h3>Send the links</h3><p>Each household gets its invitation on WhatsApp. The gallery has one QR.</p></li>
        </ol>
      </section>

      <section className="h-photos" aria-label="Photographs">
        {[["haldi", "Haldi"], ["mehendi", "Mehendi"], ["sangeet", "Sangeet"], ["wedding", "Pheras"], ["reception", "Reception"]].map(([name, label]) => (
          <figure key={name}>
            <Image src={`/photos/${name}.jpg`} alt={`${label} set-up`} width={480} height={640} />
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </section>

      <section className="h-closing">
        <Toran />
        <p className="h-script" lang="hi">॥ श्री गणेशाय नमः ॥</p>
        <h2>Begin with two names and a date.</h2>
        <p>Your family plans together. Your guests just open a link.</p>
        <div className="h-ctas" style={{ justifyContent: "center" }}>
          <Link className="h-btn h-btn-gold" href={startHref}>{startLabel} <Icon name="chevronRight" size={18} /></Link>
          <Link className="h-btn h-btn-ghost" href="/w/aanya-and-kabir">See a sample wedding</Link>
        </div>
      </section>

      <footer className="h-footer">
        <span>The Wedding Home · the operating system for Indian marriages</span>
        <nav>
          <a href="#worlds">Functions</a>
          <a href="#features">Features</a>
          <Link href="/w/aanya-and-kabir">Sample wedding</Link>
          {person ? <Link href="/app">Your wedding</Link> : <Link href="/sign-in">Sign in</Link>}
          <a href="mailto:onboarding@aryanjaiswal.in">Contact</a>
        </nav>
      </footer>
    </div>
  );
}
