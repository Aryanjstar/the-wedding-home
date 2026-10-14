import type { Metadata } from "next";

import { AccountScreen, TextLink } from "@/components/account-screen";
import { previewSignInHint, sampleOrganisers } from "@/data/preview";
import { joinReturnPath } from "@/data/return-path";

export const metadata: Metadata = { title: "Sign in · The Wedding Home" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const params = await searchParams;
  const returnTo = joinReturnPath(params.next);
  return (
    <AccountScreen
      kind="sign-in"
      title="Welcome back"
      lede="Sign in to the wedding you organise."
      action="Continue"
      returnTo={returnTo}
      defaultEmail={params.email}
      links={<><TextLink href={returnTo ? `/create-account?next=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(params.email ?? "")}` : "/plan"}>{returnTo ? "Create an account" : "Plan the wedding"}</TextLink><TextLink href="/reset-password">Forgot password?</TextLink></>}
      extra={<p className="fine">{previewSignInHint()} {sampleOrganisers.map((person) => person.email).join(", ")}.</p>}
    />
  );
}
