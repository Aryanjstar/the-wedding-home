import type { Metadata } from "next";

import { Website } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Website · The Wedding Home" };

export default function WebsitePage() {
  return <Website />;
}
