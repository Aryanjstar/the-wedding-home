import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHome, coupleOf } from "@/components/guest/site";
import { publishedSite } from "@/modules/website/cached";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await publishedSite((await params).slug);
  if (!site) return { title: "The Wedding Home" };
  return { title: `${coupleOf(site)} · ${site.city}`, description: `The wedding of ${site.brideName} and ${site.groomName} in ${site.city}.` };
}

export default async function WeddingSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await publishedSite(slug);
  if (!site) notFound();
  return <SiteHome site={site} base={`/w/${slug}`} />;
}
