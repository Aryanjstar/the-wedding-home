import type { Metadata } from "next";
import Image from "next/image";

import { GuestChrome } from "@/components/guest/chrome";
import { functions } from "@/data/sample";

export const metadata: Metadata = { title: "Gallery · Aanya & Kabir" };

export default function GalleryPage() {
  return (
    <GuestChrome current="Gallery">
      <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
        <p className="kicker">Gallery</p>
        <h1 className="serif">Everyone’s photographs</h1>
        <p className="lede">People with this link can see what others added. No account.</p>
        <div className="gallery" style={{ marginTop: "1rem" }}>
          {functions.map((item) => (
            <figure key={item.id}>
              <Image src={item.photo} alt={item.title} width={960} height={540} />
              <figcaption className="muted" style={{ padding: "0.45rem 0" }}>{item.title}</figcaption>
            </figure>
          ))}
        </div>
      </main>
    </GuestChrome>
  );
}
