import type { Metadata } from "next";

import { AccountScreen, TextLink } from "@/components/account-screen";

export const metadata: Metadata = { title: "Reset password · The Wedding Home" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AccountScreen
      kind="reset"
      title="Reset password"
      lede="Enter the email on the account. If it has one, the reset link is on its way."
      action="Send reset link"
      token={token}
      links={<TextLink href="/sign-in">Back to sign in</TextLink>}
    />
  );
}
