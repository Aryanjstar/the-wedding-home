import type { Metadata } from "next";

import { SignInForm } from "@/components/account-screen";
import { joinReturnPath } from "@/data/return-path";

export const metadata: Metadata = { title: "Sign in · The Wedding Home" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const params = await searchParams;
  return <SignInForm returnTo={joinReturnPath(params.next)} defaultEmail={params.email} />;
}
