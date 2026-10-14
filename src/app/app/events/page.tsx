import type { Metadata } from "next";

import { Events } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Events · The Wedding Home" };

export default function EventsPage() {
  return <Events />;
}
