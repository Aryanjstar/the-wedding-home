import type { Metadata } from "next";

import { AccountScreen, TextLink } from "@/components/account-screen";

export const metadata: Metadata = { title: "Choose a new password · The Wedding Home" };

export default async function ResetWithTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AccountScreen
      kind="reset"
      title="Choose a new password"
      action="Save password"
      token={decodeURIComponent(token)}
      links={<TextLink href="/sign-in">Back to sign in</TextLink>}
    />
  );
}
