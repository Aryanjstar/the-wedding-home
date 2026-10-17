"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { SoundToggle } from "@/components/guest/sound";
import { Mark } from "@/components/mark";
import { useSession } from "@/components/session";

const links = [
  ["Week", "/w/aanya-and-kabir#week"],
  ["Families", "/w/aanya-and-kabir#families"],
  ["Stay", "/w/aanya-and-kabir#stay"],
  ["Blessings", "/w/aanya-and-kabir#blessings"],
  ["Live", "/w/aanya-and-kabir/live"],
  ["Gallery", "/w/aanya-and-kabir/gallery"],
];

export function GuestChrome({ children, current }: { children: ReactNode; current?: string }) {
  const [open, setOpen] = useState(false);
  const { person } = useSession();

  return (
    <>
      <header className={open ? "guest-bar glass open" : "guest-bar glass"}>
        <div className="sidebar-bar">
          <Mark href="/w/aanya-and-kabir" />
          <button className="btn-text menu-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? "Close" : "Menu"}
          </button>
        </div>
        <nav className="guest-nav" aria-label="Guest">
          {links.map(([label, href]) => (
            <Link key={label} href={href} aria-current={current === label ? "page" : undefined} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          {person ? <Link href="/app" onClick={() => setOpen(false)}>Family app</Link> : null}
        </nav>
        <SoundToggle />
      </header>
      {children}
    </>
  );
}
