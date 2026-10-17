import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/account-screen";

export const metadata: Metadata = { title: "Choose a new password · The Wedding Home" };

export default async function ResetWithTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetPasswordForm token={decodeURIComponent(token)} />;
}
