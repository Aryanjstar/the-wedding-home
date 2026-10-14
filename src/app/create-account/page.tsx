import type { Metadata } from "next";

import { AccountScreen, TextLink } from "@/components/account-screen";
import { joinReturnPath } from "@/data/return-path";

export const metadata: Metadata = { title: "Start a wedding · The Wedding Home" };

export default async function CreateAccountPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const params = await searchParams;
  const returnTo = joinReturnPath(params.next);
  return (
    <AccountScreen
      kind="create"
      title="Start a wedding"
      lede="Your name, your email, and a password. The wedding comes next."
      action="Create account"
      returnTo={returnTo}
      defaultEmail={params.email}
      links={<TextLink href={returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(params.email ?? "")}` : "/sign-in"}>Already have an account</TextLink>}
    />
  );
}
