import type { Metadata } from "next";

import { CreateAccountForm } from "@/components/account-screen";
import { joinReturnPath } from "@/data/return-path";

export const metadata: Metadata = { title: "Create an account · The Wedding Home" };

export default async function CreateAccountPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const params = await searchParams;
  return <CreateAccountForm returnTo={joinReturnPath(params.next)} defaultEmail={params.email} />;
}
