import type { Metadata } from "next";

import { GuestsPage } from "@/components/workspace/guests";

export const metadata: Metadata = { title: "Guests · The Wedding Home" };

export default function Page() {
  return <GuestsPage />;
}
