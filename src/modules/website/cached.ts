import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { readPreviewInvite } from "@/modules/guests/service";
import { readPreviewSite, readPublishedSite } from "@/modules/website/service";
import { ServiceError } from "@/server/http/handle";

/** One database read per request, shared by the layout and the page. */
export const publishedSite = cache((slug: string) => readPublishedSite(slug));

/** The organiser's own session, as a request the services understand. */
async function sessionRequest() {
  const incoming = await headers();
  return new Request("http://localhost/", { headers: { cookie: incoming.get("cookie") ?? "" } });
}

async function orSignIn<T>(work: () => Promise<T>, back: string): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ServiceError && (error.httpStatus === 401 || error.reason === "NO_WEDDING")) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
    throw error;
  }
}

export const previewSite = cache(async () => orSignIn(async () => readPreviewSite(await sessionRequest()), "/app/preview"));

export const previewInvite = cache(async () => orSignIn(async () => readPreviewInvite(await sessionRequest()), "/app/preview"));
