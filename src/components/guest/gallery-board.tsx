"use client";

import { useState, type FormEvent } from "react";

import { sendGalleryFile } from "@/components/gallery-upload";

type Item = { id: string; title: string; url: string; kind?: "photo" | "video" };

export function GalleryBoard({
  token,
  couple,
  guestUploadEnabled,
  directUpload,
  uploadPrefix,
  items,
}: {
  token: string;
  couple: string;
  guestUploadEnabled: boolean;
  directUpload: boolean;
  uploadPrefix: string;
  items: Item[];
}) {
  const [photos, setPhotos] = useState(items);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) return;
    setPending(true);
    const failure = await sendGalleryFile(file, {
      direct: directUpload,
      prefix: uploadPrefix,
      handleUrl: `/api/public/gallery/${token}/upload`,
      registerUrl: `/api/public/gallery/${token}/register`,
      fallbackUrl: `/api/public/gallery/${token}`,
    });
    if (failure) {
      setNotice(failure);
      setPending(false);
      return;
    }
    const refreshed = await fetch(`/api/public/gallery/${token}`).then((response) => response.json()).catch(() => null) as { items?: Item[] } | null;
    if (refreshed?.items) setPhotos(refreshed.items);
    form.reset();
    setNotice("Added to the gallery.");
    setPending(false);
  }

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <p className="kicker">Shared gallery</p>
      <h1 className="serif">{couple}</h1>
      <p className="lede">Everyone with this link can see the photographs. No account.</p>
      {guestUploadEnabled ? (
        <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 520 }} onSubmit={(event) => void upload(event)}>
          <label>Photograph or video<input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" required /></label>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Uploading…" : "Add to the gallery"}</button>
          <p className="fine">JPEG, PNG, WebP, MP4, or QuickTime.</p>
          {notice ? <p className="fine">{notice}</p> : null}
        </form>
      ) : (
        <p className="muted">The family has turned guest upload off. You can still look.</p>
      )}
      <div className="gallery" style={{ marginTop: "1rem" }}>
        {photos.length === 0 ? <p className="muted">No photographs yet.</p> : null}
        {photos.map((item) => (
          <figure key={item.id} className="glass">
            {item.kind === "video" ? <video src={item.url} controls playsInline /> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.title} />
            )}
            <figcaption style={{ padding: "0.7rem 0.8rem" }}>{item.title}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
