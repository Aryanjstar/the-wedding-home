import type { Metadata } from "next";

import { GuestChrome } from "@/components/guest/chrome";

export const metadata: Metadata = { title: "Live · Aanya & Kabir" };

export default function LivePage() {
  return (
    <GuestChrome current="Live">
      <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
        <p className="kicker">Live</p>
        <h1 className="serif">The courtyard</h1>
        <p className="lede">The family pastes a YouTube link. It plays here, on this site.</p>
        <div className="glass map-panel" style={{ minHeight: 360, marginTop: "1rem" }}>
          <div>
            <p className="kicker">Waiting for the stream</p>
            <p>When the muhurat starts, this frame becomes the player.</p>
          </div>
        </div>
      </main>
    </GuestChrome>
  );
}
