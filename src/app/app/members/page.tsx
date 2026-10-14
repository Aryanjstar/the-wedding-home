import type { Metadata } from "next";

import { Members } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Members · The Wedding Home" };

export default function MembersPage() {
  return <Members />;
}
