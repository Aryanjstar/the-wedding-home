"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Mark } from "@/components/mark";
import { usePreview } from "@/components/preview-session";

const items = [
  ["Dashboard", "/app"],
  ["Events", "/app/events"],
  ["Guests", "/app/guests"],
  ["Tasks", "/app/tasks"],
  ["Expenses", "/app/expenses"],
  ["Vendors", "/app/vendors"],
  ["Website", "/app/website"],
  ["Photos", "/app/photos"],
  ["Details", "/app/details"],
  ["Members", "/app/members"],
  ["Account", "/app/account"],
] as const;

const adminOnly = new Set(["Website", "Members"]);

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, person, wedding } = usePreview();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (ready && !person && pathname.startsWith("/app")) router.replace("/");
  }, [ready, person, pathname, router]);

  if (!ready || !person) {
    return (
      <main className="account">
        <p className="muted">{ready ? "Sign in to open the wedding." : "Opening the wedding…"}</p>
      </main>
    );
  }

  const visible = person.role === "admin" ? items : items.filter(([label]) => !adminOnly.has(label));

  return (
    <div className="shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-bar">
          <div className="sidebar-brand">
            <Mark href="/" compact />
            {wedding ? (
              <Link className="sidebar-couple" href="/app">{wedding.bride.split(" ")[0]} & {wedding.groom.split(" ")[0]}</Link>
            ) : (
              <Link className="sidebar-couple" href="/wedding/new">Add the wedding</Link>
            )}
            <p className="sidebar-role">{person.role === "admin" ? "Admin" : "Manager"} · {person.email}</p>
          </div>
          <button className="btn-text menu-toggle" type="button" aria-expanded={open} onClick={() => setOpenPath(open ? null : pathname)}>
            {open ? "Close" : "Menu"}
          </button>
        </div>
        <nav aria-label="Family">
          {visible.map(([label, href]) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="workspace">{children}</div>
    </div>
  );
}
