import type { Metadata } from "next";

import { Guests } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Guests · The Wedding Home" };

export default function GuestsPage() {
  return <Guests />;
}
