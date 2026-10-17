import type { Metadata } from "next";

import { SiteHome } from "@/components/guest/site";
import { previewSite } from "@/modules/website/cached";

export const metadata: Metadata = { title: "Preview the website · The Wedding Home", robots: { index: false, follow: false } };

export default async function PreviewSitePage() {
  return <SiteHome site={await previewSite()} base="/preview/site" />;
}
