import type { Metadata } from "next";

import { Details } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Details · The Wedding Home" };

export default function DetailsPage() {
  return <Details />;
}
