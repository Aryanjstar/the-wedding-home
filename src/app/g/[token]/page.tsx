import type { Metadata } from "next";
import Link from "next/link";

import { GalleryBoard } from "@/components/guest/gallery-board";
import { GuestFrame, SiteFooter } from "@/components/guest/site";
import { readPublicGallery } from "@/modules/gallery/service";

export const metadata: Metadata = { title: "Shared gallery · The Wedding Home", robots: { index: false, follow: false } };

export default async function GalleryLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const gallery = await readPublicGallery(token);
  if (!gallery) {
    return (
      <main className="g-calm">
        <p className="g-script" lang="hi">धन्यवाद</p>
        <h1>This gallery is closed</h1>
        <p>The family has closed the shared album, or the link is not complete. Ask them for the gallery link again.</p>
        <Link href="/">The Wedding Home</Link>
      </main>
    );
  }
  return (
    <GuestFrame packId={gallery.packId}>
      <GalleryBoard
        token={token}
        couple={gallery.couple}
        guestUploadEnabled={gallery.guestUploadEnabled}
        directUpload={gallery.directUpload}
        uploadPrefix={gallery.uploadPrefix}
        albums={gallery.albums}
        items={gallery.items}
      />
      <SiteFooter couple={gallery.couple} />
    </GuestFrame>
  );
}
