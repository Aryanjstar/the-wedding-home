import type { Metadata } from "next";

import { JoinInvite } from "@/components/join-invite";

export const metadata: Metadata = { title: "Join the wedding · The Wedding Home" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinInvite token={token} />;
}
