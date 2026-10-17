import type { Metadata } from "next";

import { InviteDocument } from "@/components/guest/invite-page";
import { readPublicInvite } from "@/modules/guests/service";
import Link from "next/link";

export const metadata: Metadata = { title: "Your invitation · The Wedding Home", robots: { index: false, follow: false } };

export default async function PersonalInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await readPublicInvite(decodeURIComponent(token));
  if (!invite) {
    return (
      <main className="g-calm">
        <p className="g-script" lang="hi">नमस्ते</p>
        <h1>This invitation link is not valid</h1>
        <p>It may have been copied only in part, or the family changed it. Ask them to send your link again on WhatsApp.</p>
        <Link href="/">The Wedding Home</Link>
      </main>
    );
  }
  return <InviteDocument invite={invite} endpoint={`/api/public/invite/${encodeURIComponent(token)}/rsvp`} />;
}
