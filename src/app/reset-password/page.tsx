import type { Metadata } from "next";

import { ResetPasswordForm, ResetRequestForm } from "@/components/account-screen";

export const metadata: Metadata = { title: "Reset password · The Wedding Home" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return token ? <ResetPasswordForm token={token} /> : <ResetRequestForm />;
}
