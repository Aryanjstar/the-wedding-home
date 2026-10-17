import type { Metadata } from "next";

import { DetailsPage } from "@/components/workspace/settings";

export const metadata: Metadata = { title: "Wedding details · The Wedding Home" };

export default function Page() {
  return <DetailsPage />;
}
