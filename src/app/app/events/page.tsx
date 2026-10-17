import type { Metadata } from "next";

import { EventsPage } from "@/components/workspace/events";

export const metadata: Metadata = { title: "Events · The Wedding Home" };

export default function Page() {
  return <EventsPage />;
}
