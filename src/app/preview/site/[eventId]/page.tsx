import { notFound } from "next/navigation";

import { FunctionDetail } from "@/components/guest/site";
import { previewSite } from "@/modules/website/cached";

export default async function PreviewFunctionPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const site = await previewSite();
  const event = site.events.find((item) => item.id === eventId);
  if (!event) notFound();
  return <FunctionDetail site={site} event={event} base="/preview/site" helplines={site.helplines} />;
}
