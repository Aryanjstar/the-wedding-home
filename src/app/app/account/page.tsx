import type { Metadata } from "next";

import { Account } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Account · The Wedding Home" };

export default function AccountPage() {
  return <Account />;
}
