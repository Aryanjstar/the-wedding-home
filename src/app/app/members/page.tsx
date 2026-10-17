import type { Metadata } from "next";

import { MembersPage } from "@/components/workspace/settings";

export const metadata: Metadata = { title: "Members · The Wedding Home" };

export default function Page() {
  return <MembersPage />;
}
