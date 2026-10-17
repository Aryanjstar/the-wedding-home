"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { api, errorText, invalidate, useResource } from "@/components/api";
import { sendGalleryFile } from "@/components/gallery-upload";
import { Icon } from "@/components/ui/icon";
import { Badge, ButtonLink, Card, EmptyState, ErrorNote, IconButton, PageHeader, Select, Skeleton, Toggle, useFeedback } from "@/components/ui/kit";
import { copyText } from "@/components/workspace/guests";

type Gallery = {
  enabled: boolean;
  guestUploadEnabled: boolean;
  directUpload: boolean;
  uploadPrefix: string;
  url: string;
  albums: { eventId: string | null; title: string; total: number }[];
  items: { id: string; title: string; kind: "photo" | "video"; url: string; eventId: string | null; hidden: boolean; uploadedBy: "organiser" | "guest" }[];
};

export function PhotosPage() {
  const { data, error, loading, reload, setData } = useResource<Gallery>("/api/gallery");
  const { toast, confirm } = useFeedback();
  const [album, setAlbum] = useState<string>("all");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    if (!data) return;
    const list = [...files];
    let done = 0;
    for (const file of list) {
      setUploading(`Uploading ${done + 1} of ${list.length}…`);
      const failure = await sendGalleryFile(file, {
        direct: data.directUpload,
        prefix: data.uploadPrefix,
        handleUrl: "/api/gallery/upload",
        registerUrl: "/api/gallery/register",
        fallbackUrl: "/api/gallery",
        eventId: uploadAlbum || null,
      });
      if (failure) {
        toast(`${file.name}: ${failure}`, "bad");
      } else done += 1;
    }
    setUploading(null);
    if (done) toast(`${done} ${done === 1 ? "file" : "files"} added to the gallery.`);
    invalidate("/api/gallery", "/api/dashboard");
  }

  async function patch(id: string, body: Record<string, unknown>, message: string) {
    try {
      await api(`/api/gallery/items/${id}`, { method: "PATCH", body });
      toast(message);
      invalidate("/api/gallery", "/api/dashboard");
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  async function remove(id: string) {
    if (!(await confirm({ title: "Delete this for everyone?", body: "Guests will not see it again. Hiding keeps it for the family.", confirm: "Delete", danger: true }))) return;
    try {
      await api(`/api/gallery/items/${id}`, { method: "DELETE" });
      toast("Deleted.");
      invalidate("/api/gallery", "/api/dashboard");
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  async function setting(body: Partial<Pick<Gallery, "enabled" | "guestUploadEnabled">>, message: string) {
    const before = data;
    // Show the switch where the person put it at once, so a quick second tap sends the right value.
    setData((current) => (current ? { ...current, ...body } : current));
    try {
      await api("/api/gallery", { method: "PATCH", body });
      toast(message);
    } catch (failure) {
      setData(before);
      toast(errorText(failure), "bad");
    }
  }

  if (loading) return <Skeleton rows={4} />;
  if (error || !data) return <ErrorNote message={error ?? "The gallery did not load."} retry={reload} />;

  const visible = data.items.filter((item) => album === "all" || (album === "none" ? !item.eventId : item.eventId === album));
  const titles = new Map(data.albums.map((entry) => [entry.eventId ?? "none", entry.title]));

  return (
    <>
      <PageHeader kicker="Photos & videos" title="One shared gallery" lede="Guests open one private link, or scan the QR at the venue, to see everyone's photographs and add their own. No account, and it keeps working after the wedding." />
      <div className="ws-grid ws-grid-2">
        <Card kicker="Share" title="The gallery link">
          <div className="ws-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/gallery/qr" alt="QR code for the gallery" width={132} height={132} />
            <div className="ws-grid" style={{ gap: "0.6rem" }}>
              <div className="ws-link-box">
                <span>{data.url}</span>
                <IconButton icon="copy" label="Copy the gallery link" onClick={() => void copyText(data.url).then((copied) => copied && toast("Gallery link copied."))} />
              </div>
              <p className="ui-hint">This link never changes, so a printed QR keeps working.</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <ButtonLink href="/api/gallery/qr?format=png" download tone="secondary" size="sm" icon="download">QR image</ButtonLink>
                <ButtonLink href={data.url} external tone="secondary" size="sm" icon="external">Open as a guest</ButtonLink>
              </div>
            </div>
          </div>
        </Card>
        <Card kicker="Settings" title="Who can add">
          <Toggle checked={data.enabled} onChange={(value) => void setting({ enabled: value }, value ? "The gallery is open." : "The gallery link now shows a closed page.")} label="Gallery open" description="Off shows guests a calm “closed” page. Nothing is deleted." />
          <Toggle checked={data.guestUploadEnabled} disabled={!data.enabled} onChange={(value) => void setting({ guestUploadEnabled: value }, value ? "Guests can upload." : "Guests can look, not upload.")} label="Guests can upload" description="Turn off after the wedding to keep it a viewing album." />
        </Card>
      </div>

      <div
        className="ws-dropzone"
        data-over={over}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(event) => { if (event.key === "Enter") input.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (event.dataTransfer.files.length) void upload(event.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={26} />
        <strong>{uploading ?? "Add photographs and videos"}</strong>
        <span className="ui-hint">JPEG, PNG, WebP, MP4, or MOV. {data.directUpload ? "Photos up to 15 MB, videos up to 100 MB." : "Up to 4 MB each."}</span>
        <span onClick={(event) => event.stopPropagation()} style={{ minWidth: 220 }}>
          <Select value={uploadAlbum} onChange={(event) => setUploadAlbum(event.target.value)} aria-label="Album for the upload">
            <option value="">Album: Other memories</option>
            {data.albums.filter((entry) => entry.eventId).map((entry) => <option key={entry.eventId} value={entry.eventId ?? ""}>Album: {entry.title}</option>)}
          </Select>
        </span>
        <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={(event) => { if (event.target.files?.length) void upload(event.target.files); event.target.value = ""; }} />
      </div>

      <div className="ui-chips" role="group" aria-label="Albums">
        <button type="button" className="ui-chip" aria-pressed={album === "all"} onClick={() => setAlbum("all")}>All · {data.items.length}</button>
        {data.albums.map((entry) => (
          <button key={entry.eventId ?? "none"} type="button" className="ui-chip" aria-pressed={album === (entry.eventId ?? "none")} onClick={() => setAlbum(entry.eventId ?? "none")}>{entry.title} · {entry.total}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="photo" title={data.items.length ? "Nothing in this album yet" : "No photographs yet"}>Upload a few, or share the link and let the cousins do it.</EmptyState>
      ) : (
        <div className="ws-gallery">
          {visible.map((item) => (
            <figure key={item.id} className="ws-tile" data-hidden={item.hidden} style={{ margin: 0 }}>
              {item.kind === "video" ? (
                <video src={item.url} muted playsInline controls preload="metadata" />
              ) : item.url.startsWith("/photos/") ? (
                <Image src={item.url} alt={item.title} width={400} height={400} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.title} loading="lazy" />
              )}
              <span className="ws-tile-tag">
                {item.hidden ? <Badge tone="bad">Hidden</Badge> : item.eventId ? <Badge>{titles.get(item.eventId) ?? "Album"}</Badge> : null}
              </span>
              <figcaption className="ws-tile-bar">
                <Badge tone={item.uploadedBy === "guest" ? "info" : "neutral"}>{item.uploadedBy === "guest" ? "Guest" : "Family"}</Badge>
                <span style={{ display: "flex" }}>
                  <IconButton icon={item.hidden ? "eye" : "eyeOff"} label={item.hidden ? "Show to guests" : "Hide from guests"} onClick={() => void patch(item.id, { hidden: !item.hidden }, item.hidden ? "Visible to guests again." : "Hidden from guests.")} />
                  <a className="ui-icon-btn" href={`/api/gallery/items/${item.id}/file?download=1`} download aria-label="Download" title="Download" style={{ color: "#fff" }}><Icon name="download" size={17} /></a>
                  <IconButton icon="trash" label="Delete" onClick={() => void remove(item.id)} />
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {!data.directUpload ? <p className="ui-hint">The large-file store is not connected on this server, so each upload stays under 4 MB.</p> : null}
    </>
  );
}
