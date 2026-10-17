"use client";

import Link from "next/link";

import { useResource } from "@/components/api";
import { useSession } from "@/components/session";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge, ButtonLink, Card, ErrorNote, Skeleton } from "@/components/ui/kit";
import { clock, civilLong, civilShort, expenseCategoryLabels, formatInr, longDay, relativeDays, shortDay } from "@/data/format";
import { worldForKind, worlds } from "@/data/worlds";

type Dashboard = {
  wedding: { brideName: string; groomName: string; title: string | null; city: string; weddingDate: string };
  countdown: { date: string; daysToGo: number; muhuratAt: string | null; source: string };
  nextEvent: { id: string; title: string; kind: string; startsAt: string; venue: string | null } | null;
  events: { id: string; title: string; kind: string; startsAt: string; isPrimary: boolean }[];
  counts: {
    events: number;
    eventsUpcoming: number;
    tasksDone: number;
    tasksTotal: number;
    tasksMine: number;
    households: number;
    householdsAnswered: number;
    peopleComing: number;
    expensesTotalInr: number;
    vendors: number;
    members: number;
    photos: number;
  };
  spendByCategory: { category: string; totalInr: number }[];
  tasksNearingDue: { id: string; title: string; dueOn: string | null; priority: string; overdue: boolean; assigneeName: string | null }[];
  site: { published: boolean; slug: string | null };
};

function Stat({ href, icon, label, value, note }: { href: string; icon: IconName; label: string; value: string; note?: string }) {
  return (
    <Link className="ws-stat" href={href}>
      <span className="ws-stat-label"><Icon name={icon} size={15} />{label}</span>
      <b>{value}</b>
      {note ? <small>{note}</small> : null}
    </Link>
  );
}

export function DashboardPage() {
  const { me } = useSession();
  const { data, error, loading, reload } = useResource<Dashboard>("/api/dashboard");
  if (loading) return <Skeleton rows={4} />;
  if (error || !data) return <ErrorNote message={error ?? "The dashboard did not load."} retry={reload} />;

  const { counts } = data;
  const names = data.wedding.title || `${data.wedding.brideName} & ${data.wedding.groomName}`;
  const days = data.countdown.daysToGo;
  const isAdmin = me?.membership?.role === "admin";
  const replyShare = counts.households ? Math.round((counts.householdsAnswered / counts.households) * 100) : 0;
  const taskShare = counts.tasksTotal ? Math.round((counts.tasksDone / counts.tasksTotal) * 100) : 0;

  const setup = [
    { done: counts.events > 0, label: "Add the functions", note: "Haldi, mehendi, sangeet, the pheras, the reception", href: "/app/events" },
    { done: counts.households > 0, label: "Add the guest households", note: "One row per family, not per person", href: "/app/guests" },
    { done: counts.members > 1, label: "Invite the family to organise", note: "Parents, siblings, trusted friends", href: isAdmin ? "/app/members" : "/app/account", admin: true },
    { done: counts.tasksTotal > 0, label: "Write down what needs doing", note: "Assign it, give it a date", href: "/app/tasks" },
    { done: data.site.published, label: "Publish the guest website", note: "Pick a look and a link", href: isAdmin ? "/app/website" : "/app/preview", admin: true },
  ].filter((step) => isAdmin || !step.admin);
  const remaining = setup.filter((step) => !step.done).length;
  const maxSpend = Math.max(1, ...data.spendByCategory.map((row) => row.totalInr));

  return (
    <>
      <section className="ws-hero" aria-label="Countdown">
        <div>
          <p className="ws-hero-script" lang="hi">॥ शुभ विवाह ॥</p>
          <h1>{names}</h1>
          <p>{civilLong(data.countdown.date)} · {data.wedding.city}{data.countdown.muhuratAt ? ` · Muhurat ${clock(data.countdown.muhuratAt)}` : ""}</p>
        </div>
        <div className="ws-hero-count">
          <b>{Math.abs(days)}</b>
          <span>{days > 0 ? (days === 1 ? "day to go" : "days to go") : days === 0 ? "Today" : "days married"}</span>
        </div>
        <div className="ws-hero-next">
          {data.nextEvent ? (
            <>
              <span>Next</span>
              <strong>{data.nextEvent.title}</strong>
              <span>{shortDay(data.nextEvent.startsAt)}, {clock(data.nextEvent.startsAt)}</span>
              {data.nextEvent.venue ? <span>{data.nextEvent.venue}</span> : null}
              <Link href="/app/events">See the week →</Link>
            </>
          ) : (
            <>
              <span>No functions yet.</span>
              <Link href="/app/events">Add Haldi, Sangeet, the wedding →</Link>
            </>
          )}
        </div>
      </section>

      <div className="ws-grid ws-grid-4">
        <Stat href="/app/events" icon="calendar" label="Functions" value={String(counts.events)} note={counts.events ? `${counts.eventsUpcoming} still to come` : "Add the first one"} />
        <Stat href="/app/guests" icon="users" label="Replies in" value={`${counts.householdsAnswered} / ${counts.households}`} note={counts.households ? `${replyShare}% answered · ${counts.peopleComing} coming` : "No households yet"} />
        <Stat href="/app/tasks" icon="checkSquare" label="Tasks done" value={`${counts.tasksDone} / ${counts.tasksTotal}`} note={counts.tasksMine ? `${counts.tasksMine} open with you` : taskShare ? `${taskShare}% complete` : "Nothing assigned to you"} />
        <Stat href="/app/expenses" icon="rupee" label="Spent so far" value={formatInr(counts.expensesTotalInr, { compact: counts.expensesTotalInr >= 10_00_000 })} note={formatInr(counts.expensesTotalInr)} />
      </div>

      <div className="ws-grid ws-grid-main">
        <div className="ws-grid">
          <Card kicker="The week" title="Functions" action={<ButtonLink href="/app/events" tone="ghost" size="sm" icon="plus">Add</ButtonLink>}>
            {data.events.length === 0 ? (
              <p className="ui-hint">The countdown uses the wedding date until a function is marked as the primary date.</p>
            ) : (
              <div className="ws-timeline">
                {data.events.map((event) => {
                  const world = worlds[worldForKind(event.kind) ?? "wedding"];
                  const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" }).format(new Date(event.startsAt));
                  const month = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(new Date(event.startsAt));
                  return (
                    <Link key={event.id} href={`/app/events#${event.id}`}>
                      <span className="ws-date-tile" style={{ background: world.sky, color: world.ink }}><b>{day}</b><span>{month}</span></span>
                      <span>
                        <strong>{event.title}</strong>
                        <span className="ui-hint" style={{ display: "block" }}>{longDay(event.startsAt).replace(/ \d{4}$/, "")} · {clock(event.startsAt)}</span>
                      </span>
                      {event.isPrimary ? <Badge tone="gold">Primary</Badge> : <Icon name="chevronRight" size={16} />}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card kicker="Coming due" title="Tasks in the next two weeks" action={<ButtonLink href="/app/tasks" tone="ghost" size="sm">All tasks</ButtonLink>}>
            {data.tasksNearingDue.length === 0 ? (
              <p className="ui-hint">Nothing open is due in the next two weeks.</p>
            ) : (
              <div className="ui-list">
                {data.tasksNearingDue.map((task) => (
                  <Link key={task.id} href="/app/tasks" className="ui-row ui-row-clickable" style={{ textDecoration: "none", color: "inherit", boxShadow: "none" }}>
                    <div className="ui-row-main">
                      <span className="ui-row-title"><span className={`ws-prio ws-prio-${task.priority}`} /><span>{task.title}</span></span>
                      <span className="ui-row-meta">{task.assigneeName ? <span><Icon name="user" size={13} />{task.assigneeName}</span> : <span>Unassigned</span>}</span>
                    </div>
                    {task.dueOn ? <Badge tone={task.overdue ? "bad" : "warn"}>{task.overdue ? `Overdue · ${civilShort(task.dueOn)}` : `Due ${relativeDays(task.dueOn)}`}</Badge> : null}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="ws-grid">
          {remaining > 0 ? (
            <Card kicker="Getting set up" title={`${setup.length - remaining} of ${setup.length} done`}>
              <div className="ws-setup">
                {setup.map((step, index) => (
                  <Link key={step.label} href={step.href} data-done={step.done}>
                    <span className="ws-setup-dot">{step.done ? <Icon name="check" size={13} /> : index + 1}</span>
                    <span><strong>{step.label}</strong><small>{step.note}</small></span>
                    <Icon name="chevronRight" size={16} />
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          <Card kicker="Spend log" title={formatInr(counts.expensesTotalInr)} action={<ButtonLink href="/app/expenses" tone="ghost" size="sm" icon="plus">Log</ButtonLink>}>
            {data.spendByCategory.length === 0 ? (
              <p className="ui-hint">A record of what has already been paid. Not a budget.</p>
            ) : (
              <div className="ws-bars">
                {data.spendByCategory.slice(0, 6).map((row) => (
                  <div key={row.category} className="ws-bar-row">
                    <div><span>{expenseCategoryLabels[row.category] ?? row.category}</span><b>{formatInr(row.totalInr)}</b></div>
                    <div className="ws-meter"><span style={{ width: `${Math.max(4, (row.totalInr / maxSpend) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card kicker="At a glance">
            <div className="ws-grid ws-grid-2">
              <Stat href="/app/vendors" icon="store" label="Vendors" value={String(counts.vendors)} />
              <Stat href="/app/photos" icon="photo" label="Photos" value={String(counts.photos)} />
              <Stat href={isAdmin ? "/app/members" : "/app/account"} icon="shield" label="Organisers" value={String(counts.members)} />
              <Stat href={isAdmin ? "/app/website" : "/app/preview"} icon="globe" label="Website" value={data.site.published ? "Live" : "Draft"} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
