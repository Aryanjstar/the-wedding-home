"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useResource } from "@/components/api";
import { useSession } from "@/components/session";
import { Icon, type IconName } from "@/components/ui/icon";
import { FeedbackProvider } from "@/components/ui/kit";
import { civilLong, initials } from "@/data/format";

type Item = { label: string; href: string; icon: IconName; admin?: boolean };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Plan",
    items: [
      { label: "Dashboard", href: "/app", icon: "home" },
      { label: "Events", href: "/app/events", icon: "calendar" },
      { label: "Guests", href: "/app/guests", icon: "users" },
      { label: "Tasks", href: "/app/tasks", icon: "checkSquare" },
    ],
  },
  {
    label: "Money and people",
    items: [
      { label: "Expenses", href: "/app/expenses", icon: "rupee" },
      { label: "Vendors", href: "/app/vendors", icon: "store" },
    ],
  },
  {
    label: "Share",
    items: [
      { label: "Photos & videos", href: "/app/photos", icon: "photo" },
      { label: "Website & themes", href: "/app/website", icon: "globe", admin: true },
      { label: "Preview as guest", href: "/app/preview", icon: "eye" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Wedding details", href: "/app/details", icon: "heart" },
      { label: "Members", href: "/app/members", icon: "shield", admin: true },
      { label: "Account", href: "/app/account", icon: "user" },
    ],
  },
];

type Countdown = { countdown: { daysToGo: number; date: string } };

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, me, signOut } = useSession();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const hasWedding = Boolean(me?.wedding);
  const summary = useResource<Countdown>(hasWedding ? "/api/dashboard" : null);

  useEffect(() => {
    if (!ready) return;
    if (!me) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    else if (!me.wedding) router.replace("/plan");
  }, [ready, me, pathname, router]);

  if (!ready || !me || !me.wedding || !me.membership) {
    return (
      <div className="ws-loading">
        <span className="ui-spinner" aria-hidden="true" />
        <p>{ready && !me ? "Taking you to sign in…" : "Opening the wedding…"}</p>
      </div>
    );
  }

  const role = me.membership.role;
  const wedding = me.wedding;
  const names = wedding.title || `${wedding.brideName.split(" ")[0]} & ${wedding.groomName.split(" ")[0]}`;
  const days = summary.data?.countdown.daysToGo;

  return (
    <FeedbackProvider>
      <div className="ws">
        <header className="ws-topbar">
          <button className="ws-menu-btn" type="button" aria-expanded={open} aria-controls="ws-sidebar" onClick={() => setOpenPath(open ? null : pathname)}>
            <Icon name={open ? "close" : "menu"} size={20} />
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
          <Link href="/app" className="ws-topbar-names">{names}</Link>
          {typeof days === "number" && days >= 0 ? <span className="ws-topbar-days">{days}d</span> : <span />}
        </header>
        <aside id="ws-sidebar" className={open ? "ws-sidebar is-open" : "ws-sidebar"}>
          <div className="ws-brand">
            <Link href="/" className="ws-mark" aria-label="The Wedding Home, public site">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="14" r="1.6" fill="currentColor" /></svg>
              <span>The Wedding Home</span>
            </Link>
          </div>
          <Link href="/app" className="ws-couple">
            <span className="ws-couple-script" lang="hi">शुभ विवाह</span>
            <strong>{names}</strong>
            <span className="ws-couple-meta">{civilLong(wedding.weddingDate)} · {wedding.city}</span>
            {typeof days === "number" ? (
              <span className="ws-couple-days">{days > 0 ? `${days} ${days === 1 ? "day" : "days"} to go` : days === 0 ? "Today is the day" : "Married"}</span>
            ) : null}
          </Link>
          <nav className="ws-nav" aria-label="Wedding">
            {groups.map((group) => {
              const items = group.items.filter((item) => !item.admin || role === "admin");
              return (
                <div key={group.label} className="ws-nav-group">
                  <p>{group.label}</p>
                  {items.map((item) => {
                    const current = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
                    return (
                      <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined}>
                        <Icon name={item.icon} size={18} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="ws-person">
            <span className="ws-avatar" aria-hidden="true">{initials(me.user.name) || "?"}</span>
            <div>
              <strong>{me.user.name}</strong>
              <span>{role === "admin" ? "Admin" : "Manager"}</span>
            </div>
            <button
              type="button"
              className="ws-signout"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                void signOut().then(() => router.push("/"));
              }}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </aside>
        {open ? <button className="ws-scrim" type="button" aria-label="Close menu" onClick={() => setOpenPath(null)} /> : null}
        <main className="ws-main" id="main">
          <div className="ws-content">{children}</div>
        </main>
      </div>
    </FeedbackProvider>
  );
}

/** Website and Members: hidden from a Manager in the nav, and calm if they open the address directly. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { me } = useSession();
  if (me?.membership?.role === "admin") return children;
  return (
    <div className="ui-empty ws-admin-only">
      <span className="ui-empty-icon"><Icon name="shield" size={26} /></span>
      <h3>Admins only</h3>
      <p>Managers plan everything else with the family. Members and the guest website stay with an Admin.</p>
      <Link className="ui-btn ui-btn-primary ui-btn-md" href="/app">Back to the dashboard</Link>
    </div>
  );
}
