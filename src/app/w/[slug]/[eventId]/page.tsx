import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FunctionDetail, coupleOf } from "@/components/guest/site";
import { publishedSite } from "@/modules/website/cached";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; eventId: string }> }): Promise<Metadata> {
  const { slug, eventId } = await params;
  const site = await publishedSite(slug);
  const event = site?.events.find((item) => item.id === eventId);
  return { title: site && event ? `${event.title} · ${coupleOf(site)}` : "The Wedding Home" };
}

export default async function FunctionPage({ params }: { params: Promise<{ slug: string; eventId: string }> }) {
  const { slug, eventId } = await params;
  const site = await publishedSite(slug);
  const event = site?.events.find((item) => item.id === eventId);
  if (!site || !event) notFound();
  return <FunctionDetail site={site} event={event} base={`/w/${slug}`} helplines={site.helplines} />;
}
