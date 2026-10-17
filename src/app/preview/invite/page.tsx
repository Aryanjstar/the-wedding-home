import type { Metadata } from "next";

import { InviteDocument } from "@/components/guest/invite-page";
import { previewInvite } from "@/modules/website/cached";

export const metadata: Metadata = { title: "Preview an invitation · The Wedding Home", robots: { index: false, follow: false } };

export default async function PreviewInvitePage() {
  return <InviteDocument invite={await previewInvite()} endpoint="/api/preview/invite/rsvp" preview={{ back: "/app/preview" }} />;
}
