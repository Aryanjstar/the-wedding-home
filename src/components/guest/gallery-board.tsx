"use client";

import { useRef, useState } from "react";

import { sendGalleryFile } from "@/components/gallery-upload";
import { Icon } from "@/components/ui/icon";

type Item = { id: string; title: string; url: string; kind?: "photo" | "video"; eventId?: string | null };

export function GalleryBoard({
  token,
  couple,
  guestUploadEnabled,
  directUpload,
  uploadPrefix,
  albums,
  items,
}: {
  token: string;
  couple: string;
  guestUploadEnabled: boolean;
  directUpload: boolean;
  uploadPrefix: string;
  albums: { eventId: string; title: string }[];
  items: Item[];
}) {
  const [photos, setPhotos] = useState(items);
  const [album, setAlbum] = useState("all");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    const list = [...files];
    let done = 0;
    setNotice(null);
    for (const file of list) {
      setBusy(`Uploading ${done + 1} of ${list.length}…`);
      const failure = await sendGalleryFile(file, {
        direct: directUpload,
        prefix: uploadPrefix,
        handleUrl: `/api/public/gallery/${token}/upload`,
        registerUrl: `/api/public/gallery/${token}/register`,
        fallbackUrl: `/api/public/gallery/${token}`,
        eventId: uploadAlbum || null,
      });
      if (failure) setNotice({ tone: "bad", text: `${file.name}: ${failure}` });
      else done += 1;
    }
    const refreshed = (await fetch(`/api/public/gallery/${token}`, { cache: "no-store" }).then((response) => response.json()).catch(() => null)) as { items?: Item[] } | null;
    if (refreshed?.items) setPhotos(refreshed.items);
    setBusy(null);
    if (done) setNotice({ tone: "ok", text: `Thank you. ${done} ${done === 1 ? "file is" : "files are"} in the gallery.` });
  }

  const visible = photos.filter((item) => album === "all" || (album === "none" ? !item.eventId : item.eventId === album));

  return (
    <main className="g-section">
      <p className="g-script" lang="hi">यादें</p>
      <p className="g-kicker">Shared gallery</p>
      <h1 className="g-h1">{couple}</h1>
      <p className="g-muted">Everyone with this link sees the photographs and videos. No account, nothing public.</p>

      {guestUploadEnabled ? (
        <div className="g-card g-upload">
          <div>
            <strong>Add yours</strong>
            <p className="g-muted g-small">Photos and short videos from your phone. {directUpload ? "Up to 15 MB a photo, 100 MB a video." : "Up to 4 MB each."}</p>
          </div>
          <select value={uploadAlbum} onChange={(event) => setUploadAlbum(event.target.value)} aria-label="Which function">
            <option value="">Which function? (optional)</option>
            {albums.map((entry) => <option key={entry.eventId} value={entry.eventId}>{entry.title}</option>)}
          </select>
          <button type="button" className="g-btn" disabled={Boolean(busy)} onClick={() => input.current?.click()}>
            <Icon name="upload" size={17} /> {busy ?? "Choose photos"}
          </button>
          <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={(event) => { if (event.target.files?.length) void upload(event.target.files); event.target.value = ""; }} />
          {notice ? <p className={notice.tone === "ok" ? "g-ok" : "g-error"} role="status">{notice.text}</p> : null}
        </div>
      ) : (
        <p className="g-card g-muted">The family has turned uploads off. You can still look, and download what you like.</p>
      )}

      {albums.length ? (
        <div className="g-albums" role="group" aria-label="Albums">
          <button type="button" aria-pressed={album === "all"} onClick={() => setAlbum("all")}>All</button>
          {albums.map((entry) => <button key={entry.eventId} type="button" aria-pressed={album === entry.eventId} onClick={() => setAlbum(entry.eventId)}>{entry.title}</button>)}
          <button type="button" aria-pressed={album === "none"} onClick={() => setAlbum("none")}>Other memories</button>
        </div>
      ) : null}

      {visible.length === 0 ? <p className="g-muted" style={{ marginTop: "1.5rem" }}>No photographs here yet. Be the first.</p> : (
        <div className="g-gallery">
          {visible.map((item) => (
            <button key={item.id} type="button" className="g-tile" onClick={() => setOpen(item)} aria-label={`Open ${item.title}`}>
              {item.kind === "video" ? <video src={item.url} muted playsInline preload="metadata" /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.title} loading="lazy" />
              )}
              {item.kind === "video" ? <span className="g-tile-play"><Icon name="play" size={18} /></span> : null}
            </button>
          ))}
        </div>
      )}

      {open ? (
        <div className="g-lightbox" role="dialog" aria-modal="true" aria-label={open.title} onClick={() => setOpen(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            {open.kind === "video" ? <video src={open.url} controls autoPlay playsInline /> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.url} alt={open.title} />
            )}
            <div className="g-lightbox-bar">
              <a href={open.url} download className="g-btn g-btn-ghost"><Icon name="download" size={16} /> Download</a>
              <button type="button" className="g-btn" onClick={() => setOpen(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
