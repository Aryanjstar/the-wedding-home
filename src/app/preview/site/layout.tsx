import type { ReactNode } from "react";

import { GuestFrame } from "@/components/guest/site";
import { previewSite } from "@/modules/website/cached";

export default async function PreviewSiteLayout({ children }: { children: ReactNode }) {
  const site = await previewSite();
  return <GuestFrame packId={site.packId} preview={{ back: "/app/preview" }}>{children}</GuestFrame>;
}
