import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Mark } from "@/components/mark";
import { PublicRsvp } from "@/components/guest/public-invite";
import { readPublicInvite } from "@/modules/home/service";

export const metadata: Metadata = { title: "Your invitation · The Wedding Home" };

export default async function PersonalInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await readPublicInvite(decodeURIComponent(token));
  if (!invite) notFound();

  return (
    <>
      <header className="guest-bar glass">
        <Mark href="/" />
      </header>
      <section className="wrap" style={{ padding: "4rem 0 3rem" }}>
        <p className="kicker">{invite.city}</p>
        <h1 className="serif">{invite.couple}</h1>
        <p className="lede">{invite.household}, you are invited. This link is only for your household.</p>
        <div className="list" style={{ marginTop: "1.5rem" }}>
          {invite.events.map((event) => (
            <article key={event.id} className="glass card">
              <strong>{event.title}</strong>
              <p className="muted">{event.venue?.name ?? "Venue to follow"}{event.venue?.city ? ` · ${event.venue.city}` : ""}</p>
              <p className="muted">{event.attending} {event.attending === 1 ? "person" : "people"} coming. Names stay with the family.</p>
              {event.venue?.mapsUrl ? <a className="btn" href={event.venue.mapsUrl}>Open in Google Maps</a> : null}
            </article>
          ))}
        </div>
        <div style={{ marginTop: "1.5rem", maxWidth: 520 }}>
          <PublicRsvp token={token} maxPeople={invite.maxPeople} />
        </div>
      </section>
    </>
  );
}
