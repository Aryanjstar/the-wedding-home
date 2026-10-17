"use client";

import { upload } from "@vercel/blob/client";

export async function sendGalleryFile(file: File, target: {
  direct: boolean;
  prefix: string;
  handleUrl: string;
  registerUrl: string;
  fallbackUrl: string;
  eventId?: string | null;
}) {
  if (target.direct && target.prefix) {
    const safeName = file.name.replace(/[^\w. -]/g, "_").slice(0, 80) || "upload";
    const blob = await upload(`${target.prefix}/${safeName}`, file, {
      access: "public",
      handleUploadUrl: target.handleUrl,
      clientPayload: JSON.stringify({ contentType: file.type }),
      multipart: file.size > 4_500_000,
    });
    const response = await fetch(target.registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: blob.url, pathname: blob.pathname, ...(target.eventId ? { eventId: target.eventId } : {}) }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: string } | null;
      return body?.detail || "Could not save that file.";
    }
    return null;
  }
  if (file.size > 4_000_000) {
    return "Files sent through the app stay under 4 MB until the direct file store is connected.";
  }
  const body = new FormData();
  body.set("file", file);
  if (target.eventId) body.set("eventId", target.eventId);
  const response = await fetch(target.fallbackUrl, { method: "POST", body });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string } | null;
    return problem?.detail || "Could not add that file.";
  }
  return null;
}
