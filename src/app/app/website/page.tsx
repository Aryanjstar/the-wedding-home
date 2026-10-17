import type { Metadata } from "next";

import { WebsitePage } from "@/components/workspace/website";

export const metadata: Metadata = { title: "Website & themes · The Wedding Home" };

export default function Page() {
  return <WebsitePage />;
}
