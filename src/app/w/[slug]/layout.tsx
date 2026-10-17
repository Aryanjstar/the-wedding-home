import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { GuestFrame } from "@/components/guest/site";
import { publishedSite } from "@/modules/website/cached";

export default async function WeddingSiteLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await publishedSite(slug);
  if (!site) notFound();
  return <GuestFrame packId={site.packId}>{children}</GuestFrame>;
}
