import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuestChrome } from "@/components/guest/chrome";
import { FunctionStage } from "@/components/guest/function-art";
import { functions, mapsUrl } from "@/data/sample";

export function generateStaticParams() {
  return functions.map((item) => ({ function: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ function: string }> }): Promise<Metadata> {
  const { function: id } = await params;
  const fn = functions.find((item) => item.id === id);
  return { title: fn ? `${fn.title} · Aanya & Kabir` : "The Wedding Home" };
}

export default async function FunctionPage({ params }: { params: Promise<{ function: string }> }) {
  const { function: id } = await params;
  const fn = functions.find((item) => item.id === id);
  if (!fn) notFound();

  return (
    <GuestChrome>
      <section>
        <nav className="fn-switch wrap" aria-label="Functions">
          {functions.map((item) => (
            <Link key={item.id} href={`/w/aanya-and-kabir/${item.id}`} aria-current={item.id === fn.id ? "page" : undefined}>
              {item.title}
            </Link>
          ))}
        </nav>
        <FunctionStage
          id={fn.id}
          badge={fn.badge === fn.time ? "" : fn.badge}
          title={fn.title}
          when={`${fn.when} · ${fn.time}`}
        />
      </section>
      <main className={`fn-body fn-${fn.id} wrap`}>
        <article className="glass card">
          <p className="kicker">What this is</p>
          <p>{fn.about}</p>
          <p className="muted">Dress · {fn.dress}</p>
        </article>
        <article className="glass card">
          <p className="kicker">Where</p>
          <h2 className="serif">{fn.venue}</h2>
          <p>{fn.address}</p>
          <div className="map-panel">
            <a className="btn" href={mapsUrl(fn.mapsQuery)}>Open in Google Maps</a>
          </div>
        </article>
      </main>
    </GuestChrome>
  );
}
