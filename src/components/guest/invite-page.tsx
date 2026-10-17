import Link from "next/link";

import { RsvpForm, SectionMusic } from "@/components/guest/invite-view";
import { Blessings, GuestFrame, Helplines, Live, SiteFooter, SiteHeader, VenueBlock, coupleOf } from "@/components/guest/site";
import { Stage } from "@/components/guest/stage";
import { Icon } from "@/components/ui/icon";
import { civilLong, clock, longDay } from "@/data/format";
import type { InvitePayload } from "@/modules/guests/service";

export function InviteDocument({ invite, endpoint, preview }: { invite: InvitePayload; endpoint: string; preview?: { back: string } }) {
  const wedding = invite.wedding;
  const couple = coupleOf(wedding);
  const links = [
    { href: "#functions", label: "Functions" },
    { href: "#rsvp", label: "Reply" },
    ...(wedding.liveEmbed ? [{ href: "#live", label: "Live" }] : []),
    ...(invite.galleryUrl ? [{ href: invite.galleryUrl, label: "Photos" }] : []),
  ];
  return (
    <GuestFrame packId={wedding.packId} preview={preview ?? null}>
      <SectionMusic sections={invite.events.map((event) => ({ id: event.id, music: event.theme.music }))} />
      <SiteHeader site={wedding} base="#top" links={links} />
      <section className="g-hero g-hero-invite" id="top">
        <div className="g-hero-copy">
          <p className="g-script" lang="hi">॥ निमंत्रण ॥</p>
          <p className="g-kicker">Dear {invite.household.name}</p>
          <h1>{wedding.title ? wedding.title : <>{wedding.brideName.split(" ")[0]} <em>&amp;</em> {wedding.groomName.split(" ")[0]}</>}</h1>
          <p className="g-hero-date">request the pleasure of your company</p>
          <p className="g-muted">{civilLong(wedding.weddingDate)} · {wedding.city}</p>
          <div className="g-hero-actions">
            <a className="g-btn" href="#rsvp">Reply now</a>
            {wedding.siteUrl ? <Link className="g-btn g-btn-ghost" href={wedding.siteUrl}>The wedding website</Link> : null}
          </div>
          <p className="g-muted g-small">This link is only for your household. You see the {invite.events.length === 1 ? "function" : `${invite.events.length} functions`} you are invited to.</p>
        </div>
      </section>

      <div id="functions">
        {invite.events.map((event) => (
          <section key={event.id} className="g-invite-fn" id={`fn-${event.id}`}>
            <Stage theme={event.theme} className="g-stage-band">
              <p className="g-kicker">{event.theme.world.region}</p>
              <p className="g-stage-script" lang="hi">{event.theme.world.script}</p>
              <h2 className="g-stage-title">{event.title}</h2>
              <p className="g-stage-when">{longDay(event.startsAt)} · {clock(event.startsAt)}{event.muhuratAt ? ` · Muhurat ${clock(event.muhuratAt)}` : ""}</p>
            </Stage>
            <div className="g-fn-body g-fn-body-tight" style={{ ["--fn-accent" as string]: event.theme.accent }}>
              <div className="g-card">
                {event.description ? <p className="g-prose">{event.description}</p> : null}
                <div className="g-facts">
                  {event.dressNote ? <div><Icon name="sparkle" size={18} /><span><strong>What to wear</strong>{event.dressNote}</span></div> : null}
                  {event.howToReach ? <div><Icon name="map" size={18} /><span><strong>How to reach</strong>{event.howToReach}</span></div> : null}
                  {event.parking ? <div><Icon name="store" size={18} /><span><strong>Parking</strong>{event.parking}</span></div> : null}
                  <div><Icon name="users" size={18} /><span><strong>{event.attending.total} {event.attending.total === 1 ? "person has" : "people have"} said yes</strong>Names stay with the family.</span></div>
                </div>
              </div>
              <div className="g-card">
                <VenueBlock event={event} theme={event.theme} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="g-section g-narrow">
        {invite.events.length ? (
          <RsvpForm
            endpoint={endpoint}
            household={invite.household.name}
            maxPeople={invite.household.maxPeople}
            preview={invite.preview}
            events={invite.events.map((event) => ({ id: event.id, title: event.title, music: event.theme.music, accent: event.theme.accent, rsvp: event.rsvp }))}
          />
        ) : <p className="g-muted">The family will add your functions soon.</p>}
      </section>

      {wedding.helplines.length ? <section className="g-section g-narrow"><Helplines lines={wedding.helplines} /></section> : null}
      {wedding.liveEmbed ? <Live embed={wedding.liveEmbed} /> : null}
      {invite.galleryUrl ? (
        <section className="g-section g-narrow">
          <Link className="g-card g-gallery-cta" href={invite.galleryUrl}>
            <Icon name="photo" size={26} />
            <span><strong>The shared gallery</strong><span className="g-muted">See everyone&apos;s photographs and add your own. No account.</span></span>
            <Icon name="chevronRight" size={18} />
          </Link>
        </section>
      ) : null}
      {wedding.aashirwad.length ? <Blessings items={wedding.aashirwad} /> : null}
      {wedding.giftNote ? <section className="g-section g-narrow g-center"><p className="g-prose">{wedding.giftNote}</p></section> : null}
      <SiteFooter couple={couple} />
    </GuestFrame>
  );
}
