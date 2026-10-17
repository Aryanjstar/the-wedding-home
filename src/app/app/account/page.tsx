import type { Metadata } from "next";

import { AccountPage } from "@/components/workspace/settings";

export const metadata: Metadata = { title: "Account · The Wedding Home" };

export default function Page() {
  return <AccountPage />;
}
