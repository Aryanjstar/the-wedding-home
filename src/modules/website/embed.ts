/** A YouTube or Vimeo watch link becomes the player URL we embed. Anything else is refused. */
export function embedUrl(liveUrl: string | null | undefined): string | null {
  if (!liveUrl) return null;
  let url: URL;
  try {
    url = new URL(liveUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  const safe = (id: string | null | undefined) => (id && /^[\w-]{6,20}$/.test(id) ? id : null);
  if (host === "youtu.be") {
    const id = safe(url.pathname.split("/").filter(Boolean)[0]);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = safe(url.searchParams.get("v") || (["live", "embed", "shorts"].includes(parts[0] ?? "") ? parts[1] : null));
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}
