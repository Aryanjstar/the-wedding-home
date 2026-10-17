import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GalleryBoard } from "@/components/guest/gallery-board";
import { Mark } from "@/components/mark";
import { readPublicGallery } from "@/modules/gallery/service";

export const metadata: Metadata = { title: "Gallery · The Wedding Home", robots: { index: false, follow: false } };

export default async function GalleryLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const gallery = await readPublicGallery(token);
  if (!gallery) notFound();
  return (
    <>
      <header className="guest-bar glass">
        <Mark href="/" />
      </header>
      <GalleryBoard token={token} couple={gallery.couple} guestUploadEnabled={gallery.guestUploadEnabled} directUpload={gallery.directUpload} uploadPrefix={gallery.uploadPrefix} items={gallery.items} />
    </>
  );
}
