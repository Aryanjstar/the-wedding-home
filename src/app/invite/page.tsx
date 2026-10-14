import type { Metadata } from "next";
import Link from "next/link";

import { Mark } from "@/components/mark";
import { InviteForm } from "@/components/guest/invite";
import { couple } from "@/data/sample";

export const metadata: Metadata = { title: "Your invite · Aanya & Kabir" };

export default function InvitePage() {
  return (
    <main className="wrap" style={{ padding: "1.5rem 0 4rem", display: "grid", gap: "1rem", maxWidth: 760 }}>
      <Mark href="/" />
      <p className="kicker">You are invited</p>
      <h1 className="serif">{couple.short}</h1>
      <p className="lede">Jaipur · {couple.dateLabel}. This page is only yours. Reply here.</p>
      <InviteForm />
      <p className="fine">
        The public home is separate. <Link href="/w/aanya-and-kabir">See the week</Link>
      </p>
    </main>
  );
}
