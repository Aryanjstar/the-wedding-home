"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { FlowSteps } from "@/components/account-screen";
import { usePreview } from "@/components/preview-session";
import { eventShortcuts, nextEvent, primaryDate, todayInIndia, type PreviewEvent, type Role } from "@/data/preview";
import {
  couple,
  daysUntilDate,
  expenses,
  functions,
  households,
  inr,
  mapsUrl,
  tasks,
  vendors,
  type FunctionId,
} from "@/data/sample";

function Title({ kicker, children }: { kicker: string; children: string }) {
  return (
    <header>
      <p className="kicker">{kicker}</p>
      <h1 className="serif">{children}</h1>
    </header>
  );
}

function AdminsOnly({ title, children }: { title: string; children: ReactNode }) {
  const { person } = usePreview();
  if (person?.role === "admin") return children;
  return (
    <>
      <Title kicker={title}>Admins only</Title>
      <p className="lede">Managers plan the wedding with everyone else. Members and the guest website stay with an Admin.</p>
      <Link className="btn" href="/app">Back to the dashboard</Link>
    </>
  );
}

export function Dashboard({ days }: { days: number }) {
  const { wedding, sample } = usePreview();
  if (!sample) return <OwnDashboard />;
  const count = wedding?.date ? daysUntilDate(wedding.date, new Date()) : days;
  const names = wedding ? `${wedding.bride} & ${wedding.groom}` : couple.short;
  const stats = [
    ["Functions", "5"],
    ["Tasks", "12 / 40"],
    ["Households", "86"],
    ["Replies", "41"],
    ["Spent", inr(1_840_000)],
    ["Vendors", "7"],
  ];
  return (
    <>
      <Title kicker={names}>{String(count)}</Title>
      <p className="lede">days · Next · Haldi · 16 Dec{wedding?.city ? ` · ${wedding.city}` : ""}</p>
      <div className="stat-row">
        {stats.map(([label, value]) => (
          <article key={label} className="glass stat">
            <span className="kicker">{label}</span>
            <b>{value}</b>
          </article>
        ))}
      </div>
      <div className="actions">
        <Link className="btn" href="/w/aanya-and-kabir">Preview as guest</Link>
        {wedding ? null : <Link className="btn-text" href="/wedding/new">Add the wedding</Link>}
      </div>
    </>
  );
}

function OwnDashboard() {
  const { wedding, events, counts, days } = usePreview();
  const now = new Date();
  const date = wedding ? primaryDate({ id: "", sample: false, wedding, members: [], events }) : null;
  const count = days ?? (date ? daysUntilDate(date, now) : 0);
  const names = wedding ? `${wedding.bride} & ${wedding.groom}` : "Your wedding";
  const upcoming = nextEvent(events, todayInIndia(now));
  const stats = [
    ["Functions", String(counts.events)],
    ["Tasks", `${counts.tasksDone} / ${counts.tasksTotal}`],
    ["Households", String(counts.households)],
    ["Replies", String(counts.replies)],
    ["Spent", inr(counts.expensesTotalInr)],
    ["Vendors", String(counts.vendors)],
  ];
  return (
    <>
      <FlowSteps current={!wedding ? "wedding" : events.length ? "dashboard" : "functions"} />
      <Title kicker={names}>{wedding ? String(count) : "Setup"}</Title>
      <p className="lede">
        {wedding
          ? `days${upcoming ? ` · Next · ${upcoming.title}` : ""}${wedding.city ? ` · ${wedding.city}` : ""}`
          : "Add the couple, the date, and the city."}
      </p>
      <div className="stat-row">
        {stats.map(([label, value]) => (
          <article key={label} className="glass stat">
            <span className="kicker">{label}</span>
            <b>{value}</b>
          </article>
        ))}
      </div>
      <div className="actions">
        {wedding ? null : <Link className="btn" href="/wedding/new">Add the wedding</Link>}
        {wedding && events.length === 0 ? <Link className="btn" href="/app/events">Add the functions</Link> : null}
        {events.length > 0 ? <Link className="btn-text" href="/app/events">Edit the functions</Link> : null}
      </div>
    </>
  );
}

export function Events() {
  const { sample } = usePreview();
  if (!sample) return <OwnEvents />;
  return <SampleEvents />;
}

function SampleEvents() {
  const [selectedId, setSelectedId] = useState<FunctionId>("wedding");
  const selected = functions.find((item) => item.id === selectedId) ?? functions[0];
  return (
    <>
      <Title kicker="Events">The week</Title>
      <div className="split-panes" style={{ marginTop: "1rem" }}>
        <div className="list">
          {functions.map((item) => (
            <button
              key={item.id}
              className="glass list-row list-button"
              type="button"
              aria-pressed={item.id === selected.id}
              onClick={() => setSelectedId(item.id)}
            >
              <div>
                <strong>{item.title}</strong>
                <p className="muted">{item.when}</p>
              </div>
              <span className="muted">{item.time}</span>
            </button>
          ))}
          <p className="fine">Shortcuts also include Roka, Engagement, and Cocktail.</p>
        </div>
        <article className="glass card">
          <p className="kicker">Selected</p>
          <h2 className="serif">{selected.title}</h2>
          <p>{selected.when} · {selected.time}</p>
          <p>{selected.venue}</p>
          <p className="muted">{selected.address}</p>
          <div className="map-panel glass" style={{ marginTop: "0.8rem" }}>
            <div>
              <p className="kicker">Venue</p>
              <a className="btn" href={mapsUrl(selected.mapsQuery)}>Open in Google Maps</a>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

function OwnEvents() {
  const { events, wedding, addEvent, removeEvent } = usePreview();
  const [draft, setDraft] = useState({
    title: "Haldi",
    date: wedding?.date ?? "",
    time: "",
    venue: "",
    address: "",
    city: wedding?.city ?? "",
    muhurat: "",
    primary: false,
  });
  const [notice, setNotice] = useState<string | null>(null);

  function choose(title: string) {
    setDraft((current) => ({ ...current, title, primary: title === "Wedding" ? true : current.primary }));
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: PreviewEvent = {
      id: "",
      title: String(data.get("title") || draft.title),
      date: String(data.get("date") || ""),
      time: String(data.get("time") || ""),
      venue: String(data.get("venue") || ""),
      address: String(data.get("address") || ""),
      city: String(data.get("city") || ""),
      primary: draft.primary,
      muhurat: String(data.get("muhurat") || ""),
    };
    const saved = await addEvent(next);
    setNotice(saved ? `${next.title} is on the week.` : "Enter a name and a date.");
    if (!saved) return;
    setDraft((current) => ({ ...current, time: "", venue: "", address: "", muhurat: "", primary: false }));
  }

  return (
    <>
      <FlowSteps current="functions" />
      <Title kicker="Events">The week</Title>
      <p className="lede">Add Haldi, Sangeet, the wedding, and the reception. One function can hold the primary date and the muhurat.</p>
      <div className="tabs" role="group" aria-label="Function shortcuts">
        {eventShortcuts.map((title) => (
          <button key={title} className="tab" type="button" aria-pressed={draft.title === title} onClick={() => choose(title)}>
            {title}
          </button>
        ))}
      </div>
      <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 560 }} onSubmit={add}>
        <label>
          Function
          <input name="title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required />
        </label>
        <label>
          Date
          <input name="date" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} required />
        </label>
        <label>
          Start
          <input name="time" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} placeholder="10:00 am" />
        </label>
        <label>
          Venue
          <input name="venue" value={draft.venue} onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))} />
        </label>
        <label>
          Address
          <input name="address" value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} />
        </label>
        <label>
          City
          <input name="city" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} />
        </label>
        <label>
          Muhurat
          <input name="muhurat" value={draft.muhurat} onChange={(event) => setDraft((current) => ({ ...current, muhurat: event.target.value }))} placeholder="Optional" />
        </label>
        <label className="check">
          <input type="checkbox" checked={draft.primary} onChange={(event) => setDraft((current) => ({ ...current, primary: event.target.checked }))} />
          Primary wedding date
        </label>
        <button className="btn" type="submit">Add function</button>
        {notice ? <p className="fine">{notice}</p> : null}
      </form>
      <div className="list">
        {events.length === 0 ? <p className="muted">No functions yet.</p> : null}
        {events.map((item) => {
          const query = [item.venue, item.city].filter(Boolean).join(", ");
          return (
            <article key={item.id} className="glass list-row">
              <div>
                <strong>{item.title}{item.primary ? " · Primary" : ""}</strong>
                <p className="muted">{item.date}{item.time ? ` · ${item.time}` : ""}{item.muhurat ? ` · Muhurat ${item.muhurat}` : ""}</p>
                {item.address ? <p className="muted">{item.address}</p> : null}
              </div>
              {query ? <a className="btn" href={mapsUrl(query)}>Open in Google Maps</a> : <span className="muted">No venue yet</span>}
              <button className="btn-text" type="button" onClick={() => void removeEvent(item.id)}>Remove</button>
            </article>
          );
        })}
      </div>
      {events.length > 0 ? (
        <div className="actions">
          <Link className="btn" href="/app">Open the dashboard</Link>
        </div>
      ) : null}
    </>
  );
}

export function Guests() {
  const { sample } = usePreview();
  if (!sample) return <OwnGuests />;
  return <SampleGuests />;
}

function OwnGuests() {
  const { households, events, wedding, addHousehold, sendHouseholdEmail } = usePreview();
  const [selectedId, setSelectedId] = useState(households[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);
  const selected = households.find((house) => house.id === selectedId) ?? households[0];
  const names = wedding ? `${wedding.bride.split(" ")[0]} & ${wedding.groom.split(" ")[0]}` : "The family";
  const invited = picked ?? events.map((event) => event.id);

  function toggleEvent(id: string) {
    setPicked((current) => {
      const base = current ?? events.map((event) => event.id);
      return base.includes(id) ? base.filter((item) => item !== id) : [...base, id];
    });
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invited.length === 0) {
      setNotice("Invite them to at least one function.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const failure = await addHousehold({
      name: String(data.get("name") || ""),
      side: String(data.get("side") || "other") as "bride" | "groom" | "other",
      maxPeople: Number(data.get("max") || 2),
      email,
      invitedEventIds: invited,
    });
    setNotice(failure ?? "Household added. Share sends their own link.");
    if (!failure) event.currentTarget.reset();
  }

  async function share(id: string) {
    const response = await fetch(`/api/households/${id}/share`);
    if (!response.ok) {
      setNotice("The link is not ready yet.");
      return null;
    }
    return response.json() as Promise<{ inviteUrl: string; waUrl: string }>;
  }

  return (
    <>
      <Title kicker="Guests">Households</Title>
      <p className="lede">{names} can share one link per household. Guests do not make an account.</p>
      <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 520 }} onSubmit={(event) => void add(event)}>
        <label>Household<input name="name" required placeholder="Sharma family" /></label>
        <label>
          Side
          <select name="side" defaultValue="bride">
            <option value="bride">Bride</option>
            <option value="groom">Groom</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Max people<input name="max" type="number" min={1} max={25} defaultValue={4} /></label>
        <label>Email<input name="email" type="email" autoComplete="email" placeholder="Optional, for the invitation email" /></label>
        {events.length > 0 ? (
          <fieldset>
            <legend className="kicker">Invited to</legend>
            {events.map((item) => (
              <label key={item.id} className="row-between">
                {item.title}
                <input type="checkbox" checked={invited.includes(item.id)} onChange={() => toggleEvent(item.id)} />
              </label>
            ))}
          </fieldset>
        ) : null}
        <button className="btn" type="submit">Add household</button>
        {events.length === 0 ? <p className="fine">Add the functions first, then the invite lists them.</p> : null}
        {notice ? <p className="fine">{notice}</p> : null}
      </form>
      <div className="list" style={{ marginTop: "1rem" }}>
        {households.length === 0 ? <p className="muted">No households yet.</p> : null}
        {households.map((house) => (
          <article key={house.id} className="glass list-row">
            <button className="list-button" type="button" aria-pressed={house.id === selected?.id} onClick={() => setSelectedId(house.id)}>
              <strong>{house.name}</strong>
              <span className="muted">{house.side}</span>
              <span>{house.reply}</span>
            </button>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              <button className="btn" type="button" onClick={() => void share(house.id).then((body) => { if (body) window.open(body.waUrl, "_blank", "noopener"); })}>Share on WhatsApp</button>
              <button className="btn-text" type="button" onClick={() => void share(house.id).then(async (body) => {
                if (!body) return;
                try {
                  await navigator.clipboard.writeText(body.inviteUrl);
                  setNotice("Link copied.");
                } catch {
                  setNotice(body.inviteUrl);
                }
              })}>Copy link</button>
              <button
                className="btn-text"
                type="button"
                disabled={!house.email}
                onClick={() => {
                  void sendHouseholdEmail(house.id).then((failure) => {
                    setNotice(failure ?? `Invitation emailed to ${house.email}.`);
                  });
                }}
              >
                {house.invitationEmailSentAt ? "Resend email" : "Send email"}
              </button>
            </div>
            {house.email ? <p className="fine">{house.email}</p> : <p className="fine">Add an email to send the invitation.</p>}
          </article>
        ))}
      </div>
    </>
  );
}

function SampleGuests() {
  const [selectedName, setSelectedName] = useState(households[0].name);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = households.find((house) => house.name === selectedName) ?? households[0];

  function shareHref(origin = "") {
    const link = origin ? `${origin}/invite` : "/invite";
    return `https://wa.me/?text=${encodeURIComponent(`Aanya & Kabir invite you. Open your link: ${link}`)}`;
  }

  async function copyLink() {
    const url = `${window.location.origin}/invite`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Copied.");
    } catch {
      setNotice(url);
    }
  }

  return (
    <>
      <Title kicker="Guests">Households</Title>
      <p className="fine">3 to remind · 1 month, 1 week, 1 day, or send now.</p>
      <div className="split-panes" style={{ marginTop: "1rem" }}>
        <div className="list">
          {households.map((house) => (
            <button
              key={house.name}
              className="glass list-row list-button"
              type="button"
              aria-pressed={house.name === selected.name}
              onClick={() => {
                setSelectedName(house.name);
                setNotice(null);
              }}
            >
              <strong>{house.name}</strong>
              <span className="muted">{house.side}</span>
              <span>{house.reply}</span>
            </button>
          ))}
        </div>
        <article className="glass card">
          <h2 className="serif">{selected.name}</h2>
          <p className="muted">Max {selected.max} · {selected.invited.join(", ")}</p>
          {selected.diet ? (
            <p>Veg {selected.diet.veg} · Non-veg {selected.diet.nonVeg} · Jain {selected.diet.jain}</p>
          ) : (
            <p className="muted">No reply yet.</p>
          )}
          <div className="actions">
            <a
              className="btn"
              href={shareHref()}
              onClick={(event) => {
                event.currentTarget.href = shareHref(window.location.origin);
              }}
            >
              Share on WhatsApp
            </a>
            <button className="btn-text" type="button" onClick={copyLink}>{notice === "Copied." ? "Copied" : "Copy link"}</button>
          </div>
          {notice && notice !== "Copied." ? <p className="fine">{notice}</p> : null}
        </article>
      </div>
    </>
  );
}

export function Tasks() {
  const { sample } = usePreview();
  if (!sample) return <OwnTasks />;
  return <SampleTasks />;
}

function OwnTasks() {
  const { tasks, addTask, updateTask } = usePreview();
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "done">("all");
  const nextStatus = { todo: "doing", doing: "done", done: "todo" } as const;
  const columns = [
    ["To do", tasks.filter((task) => task.status === "todo")],
    ["Doing", tasks.filter((task) => task.status === "doing")],
    ["Done", tasks.filter((task) => task.status === "done")],
  ] as const;
  const visible = columns
    .map(([label, items]) => [label, items.filter((task) => (filter === "mine" ? task.mine : true))] as const)
    .filter(([label]) => (filter === "done" ? label === "Done" : true));

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const failure = await addTask({
      title: String(data.get("title") || ""),
      priority: String(data.get("priority") || "medium") as "low" | "medium" | "high",
      assignToMe: data.get("mine") === "on",
    });
    setNotice(failure ?? "Task added.");
    if (!failure) form.reset();
  }

  return (
    <>
      <Title kicker="Tasks">The work</Title>
      <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 520 }} onSubmit={(event) => void add(event)}>
        <label>Task<input name="title" required /></label>
        <label>
          Priority
          <select name="priority" defaultValue="medium">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="row-between">Assign to me<input name="mine" type="checkbox" /></label>
        <button className="btn" type="submit">Add task</button>
        {notice ? <p className="fine">{notice}</p> : null}
      </form>
      <div className="tabs" role="tablist" aria-label="Task filters">
        {([
          ["all", "All"],
          ["mine", "Mine"],
          ["done", "Done"],
        ] as const).map(([id, label]) => (
          <button key={id} className="tab" type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="columns">
        {visible.map(([label, items]) => (
          <section key={label}>
            <p className="kicker">{label}</p>
            <div className="list">
              {items.length === 0 ? <p className="muted">None</p> : null}
              {items.map((task) => (
                <article key={task.id} className="glass list-row">
                  <span className={`dot ${task.priority}`} />
                  <div style={{ flex: 1 }}>
                    <strong>{task.title}</strong>
                    <p className="muted">{task.who}</p>
                  </div>
                  <button className="btn-text" type="button" onClick={() => void updateTask(task.id, { status: nextStatus[task.status] }).then(setNotice)}>
                    {task.status === "done" ? "Reopen" : "Advance"}
                  </button>
                  <button className="btn-text" type="button" onClick={() => void updateTask(task.id, { assignToMe: !task.mine }).then(setNotice)}>
                    {task.mine ? "Leave" : "Mine"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function SampleTasks() {
  const { person } = usePreview();
  const [filter, setFilter] = useState<"all" | "mine" | "done">("all");
  const first = person?.name.split(" ")[0] ?? "";
  const columns = [
    ["To do", tasks.todo],
    ["Doing", tasks.doing],
    ["Done", tasks.done],
  ] as const;
  const visible = columns
    .map(([label, items]) => [
      label,
      items.filter((task) => (filter === "mine" ? task.who === first : true)),
    ] as const)
    .filter(([label, items]) => (filter === "done" ? label === "Done" : items.length > 0 || filter === "all"));

  return (
    <>
      <Title kicker="Tasks">The work</Title>
      <div className="tabs" role="tablist" aria-label="Task filters">
        {([
          ["all", "All"],
          ["mine", "Mine"],
          ["done", "Done"],
        ] as const).map(([id, label]) => (
          <button key={id} className="tab" type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="columns">
        {visible.length === 0 ? <p className="muted">None of these are yours.</p> : null}
        {visible.map(([label, items]) => (
          <section key={label}>
            <p className="kicker">{label}</p>
            <div className="list">
              {items.length === 0 ? <p className="muted">None</p> : null}
              {items.map((task) => (
                <article key={task.title} className="glass list-row">
                  <span className={`dot ${task.priority}`} />
                  <strong style={{ flex: 1 }}>{task.title}</strong>
                  <span className="muted">{task.who}</span>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export function Expenses() {
  const { sample, expenses: rows, counts, addExpense } = usePreview();
  const [notice, setNotice] = useState<string | null>(null);
  if (!sample) {
    async function add(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const failure = await addExpense({
        title: String(data.get("title") || ""),
        amountInr: Number(data.get("amount") || 0),
        spentOn: String(data.get("date") || ""),
        category: String(data.get("category") || "miscellaneous"),
      });
      setNotice(failure ?? "Saved in the spend log.");
      if (!failure) event.currentTarget.reset();
    }
    return (
      <>
        <Title kicker="Spent">{inr(counts.expensesTotalInr)}</Title>
        <p className="lede">A spend log, not a budget.</p>
        <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 520 }} onSubmit={(event) => void add(event)}>
          <label>What<input name="title" required /></label>
          <label>Rupees<input name="amount" type="number" min={1} required /></label>
          <label>Date<input name="date" type="date" required /></label>
          <label>
            Category
            <select name="category" defaultValue="miscellaneous">
              <option value="venue">Venue</option>
              <option value="catering">Food</option>
              <option value="decoration">Flowers and decor</option>
              <option value="photography">Photography</option>
              <option value="clothing">Clothing</option>
              <option value="jewellery">Jewellery</option>
              <option value="entertainment">Entertainment</option>
              <option value="travel">Travel</option>
              <option value="miscellaneous">Other</option>
            </select>
          </label>
          <button className="btn" type="submit">Add expense</button>
          {notice ? <p className="fine">{notice}</p> : null}
        </form>
        <div className="list">
          {rows.length === 0 ? <p className="muted">Nothing spent yet.</p> : null}
          {rows.map((item) => (
            <article key={item.id} className="glass list-row">
              <div>
                <strong>{item.title}</strong>
                <p className="muted">{item.spentOn} · {item.category}</p>
              </div>
              <b>{inr(item.amountInr)}</b>
            </article>
          ))}
        </div>
      </>
    );
  }
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  return (
    <>
      <Title kicker="Spent">{inr(total)}</Title>
      <p className="lede">A spend log, not a budget.</p>
      <div className="list">
        {expenses.map((item) => (
          <article key={item.title} className="glass list-row">
            <div>
              <strong>{item.title}</strong>
              <p className="muted">{item.date} · {item.category} · {item.fn}</p>
            </div>
            <b>{inr(item.amount)}</b>
          </article>
        ))}
      </div>
    </>
  );
}

export function Vendors() {
  const { sample, wedding, vendors: saved, addVendor } = usePreview();
  const [notice, setNotice] = useState<string | null>(null);
  const city = wedding?.city || "the city";
  if (!sample) {
    async function add(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const failure = await addVendor({
        name: String(data.get("name") || ""),
        category: String(data.get("category") || "other"),
        contactPerson: String(data.get("person") || ""),
        phone: String(data.get("phone") || ""),
        agreedCostInr: Number(data.get("cost") || 0),
      });
      setNotice(failure ?? "Saved. Nothing is booked from here.");
      if (!failure) event.currentTarget.reset();
    }
    return (
      <>
        <Title kicker="Vendors">My vendors</Title>
        <p className="lede">Save a vendor, or look nearby. Nothing is booked from here.</p>
        <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 520 }} onSubmit={(event) => void add(event)}>
          <label>Vendor<input name="name" required /></label>
          <label>
            Kind
            <select name="category" defaultValue="other">
              <option value="photographer">Photographer</option>
              <option value="caterer">Caterer</option>
              <option value="florist">Florist</option>
              <option value="venue">Venue</option>
              <option value="decorator">Decorator</option>
              <option value="makeup">Makeup</option>
              <option value="mehendi_artist">Mehendi</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>Person<input name="person" /></label>
          <label>Phone<input name="phone" /></label>
          <label>Agreed cost, rupees<input name="cost" type="number" min={0} /></label>
          <button className="btn" type="submit">Save vendor</button>
          {notice ? <p className="fine">{notice}</p> : null}
        </form>
        <div className="list">
          {saved.map((vendor) => (
            <article key={vendor.id} className="glass card">
              <div className="row-between">
                <strong>{vendor.name}</strong>
                <span>{vendor.cost ? inr(vendor.cost) : vendor.category}</span>
              </div>
              <p className="muted">{vendor.person}{vendor.phone ? ` · ${vendor.phone}` : ""}</p>
            </article>
          ))}
        </div>
        <a className="btn" href={mapsUrl(`wedding vendors ${city}`)}>Open in Google Maps</a>
      </>
    );
  }
  return (
    <>
      <Title kicker="Vendors">My vendors</Title>
      <div className="split-panes" style={{ marginTop: "1rem" }}>
        <div className="list">
          {vendors.map((vendor) => (
            <article key={vendor.name} className="glass card">
              <div className="row-between">
                <strong>{vendor.name}</strong>
                <span>{inr(vendor.cost)}</span>
              </div>
              <p className="muted">{vendor.person} · <a href={`tel:${vendor.phone.replace(/\s/g, "")}`}>{vendor.phone}</a></p>
              <p className="fine">{vendor.fn}</p>
            </article>
          ))}
        </div>
        <article className="glass map-panel">
          <div>
            <p className="kicker">Nearby</p>
            <h2 className="serif">Jaipur</h2>
            <p className="muted">Find a vendor, then save them here. No booking.</p>
            <a className="btn" href={mapsUrl("wedding vendors Jaipur")}>Open in Google Maps</a>
          </div>
        </article>
      </div>
    </>
  );
}

export function Website() {
  const { sample } = usePreview();
  if (!sample) return <OwnWebsite />;
  return <SampleWebsite />;
}

function OwnWebsite() {
  const { site, wedding, publishSite } = usePreview();
  const packs = [
    ["traditional", "Traditional"],
    ["classical", "Classical"],
    ["art", "Art"],
    ["choreography", "Choreography"],
  ] as const;
  const [packId, setPackId] = useState(site?.packId || "classical");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const suggested = wedding ? `${wedding.bride}-${wedding.groom}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) : "";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const published = String(data.get("intent") || "publish") !== "draft";
    setPending(true);
    const failure = await publishSite({
      slug: String(data.get("slug") || ""),
      published,
      packId,
      liveUrl: String(data.get("live") || ""),
    });
    setNotice(failure ?? (published ? "The guest site is live." : "Saved as a draft."));
    setPending(false);
  }

  return (
    <AdminsOnly title="Website">
      <Title kicker="Website">Guest site</Title>
      <p className="lede">One pack for the wedding. Guests open the address with no account. The designed Aanya sample keeps its own page.</p>
      <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 640 }} onSubmit={(event) => void save(event)}>
        <div className="stat-row">
          {packs.map(([id, label]) => (
            <button key={id} className="glass stat list-button" type="button" aria-pressed={packId === id} onClick={() => setPackId(id)}>
              <span className="kicker">{packId === id ? "Selected" : "Pack"}</span>
              <b>{label}</b>
            </button>
          ))}
        </div>
        <label>Address<input name="slug" required defaultValue={site?.slug || suggested} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={48} /></label>
        <label>YouTube or Vimeo, optional<input name="live" type="url" defaultValue={site?.liveUrl || ""} placeholder="https://www.youtube.com/watch?v=" /></label>
        <div className="actions">
          <button className="btn" name="intent" value="publish" type="submit" disabled={pending}>Publish</button>
          <button className="btn-text" name="intent" value="draft" type="submit" disabled={pending}>Save draft</button>
        </div>
        {site?.published && site.slug ? <Link className="btn-text" href={`/w/${site.slug}`}>Preview as guest</Link> : null}
        {notice ? <p className="fine">{notice}</p> : null}
      </form>
    </AdminsOnly>
  );
}

function SampleWebsite() {
  const packs = ["Traditional", "Classical", "Art", "Choreography"];
  const [selected, setSelected] = useState("Classical");
  return (
    <AdminsOnly title="Website">
      <Title kicker="Website">Guest site</Title>
      <p className="lede">One pack for the wedding. A function can override colour and a song.</p>
      <div className="stat-row">
        {packs.map((pack) => (
          <button
            key={pack}
            className="glass stat list-button"
            type="button"
            aria-pressed={pack === selected}
            onClick={() => setSelected(pack)}
          >
            <span className="kicker">{pack === selected ? "Selected" : "Pack"}</span>
            <b>{pack}</b>
          </button>
        ))}
      </div>
      <div className="actions">
        <Link className="btn" href="/w/aanya-and-kabir">Preview as guest</Link>
        <span className="chip">Published · aanya-and-kabir</span>
      </div>
    </AdminsOnly>
  );
}

export function Photos() {
  const { sample, photos, galleryUrl, guestUploadEnabled, uploadPhoto, deletePhoto, setGuestUpload } = usePreview();
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!sample) {
    async function upload(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (pending) return;
      const form = event.currentTarget;
      const file = new FormData(form).get("file");
      if (!(file instanceof File)) return;
      setPending(true);
      const failure = await uploadPhoto(file);
      setNotice(failure ?? "Photograph added.");
      if (!failure) form.reset();
      setPending(false);
    }
    return (
      <>
        <Title kicker="Photos">Shared gallery</Title>
        <p className="lede">One private gallery. Guests open the link and can add photographs and videos. No account.</p>
        <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 560 }} onSubmit={(event) => void upload(event)}>
          <label>Photograph or video<input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" required /></label>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Uploading…" : "Add to the gallery"}</button>
          <p className="fine">JPEG, PNG, WebP, MP4, or QuickTime. Photographs up to 15 MB and videos up to 100 MB go straight to the file store. Without that store, files stay under 4 MB.</p>
          {notice ? <p className="fine">{notice}</p> : null}
        </form>
        <div className="actions" style={{ marginTop: "0.8rem" }}>
          <button className="btn-text" type="button" onClick={() => void setGuestUpload(!guestUploadEnabled).then((failure) => setNotice(failure ?? (guestUploadEnabled ? "Guests can look, not upload." : "Guests can upload.")))}>
            {guestUploadEnabled ? "Turn guest upload off" : "Turn guest upload on"}
          </button>
          {galleryUrl ? (
            <button
              className="btn-text"
              type="button"
              onClick={() => void navigator.clipboard.writeText(galleryUrl).then(() => setNotice("Gallery link copied."))}
            >
              Copy gallery link
            </button>
          ) : null}
        </div>
        {photos.length === 0 ? <p className="muted">No photographs yet.</p> : null}
        <div className="gallery">
          {photos.map((item) => (
            <figure key={item.id} className="glass">
              {item.kind === "video" ? (
                <video src={item.url} controls playsInline />
              ) : item.url.startsWith("/photos/") ? (
                <Image src={item.url} alt={item.title} width={960} height={540} />
              ) : (
                // Uploaded files are served from this app or from an unguessable store URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.title} />
              )}
              <figcaption style={{ padding: "0.7rem 0.8rem" }}>
                {item.title}
                {item.url.startsWith("/photos/") ? null : (
                  <button className="btn-text" type="button" onClick={() => void deletePhoto(item.id).then((failure) => setNotice(failure ?? "Photograph removed."))}>Remove</button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <Title kicker="Photos">Shared gallery</Title>
      <p className="lede">Guests see one another’s photographs. Upload can be turned off.</p>
      <div className="gallery">
        {functions.map((item) => (
          <figure key={item.id} className="glass">
            <Image src={item.photo} alt={item.title} width={960} height={540} />
            <figcaption style={{ padding: "0.7rem 0.8rem" }}>{item.title}</figcaption>
          </figure>
        ))}
      </div>
      <p className="fine">Stable upload link stays on the gallery page for guests.</p>
    </>
  );
}

export function Details() {
  const { wedding } = usePreview();
  if (!wedding) {
    return (
      <>
        <Title kicker="Details">The wedding</Title>
        <p className="lede">Bride, groom, date, and city are not set yet.</p>
        <Link className="btn" href="/wedding/new">Add the wedding</Link>
      </>
    );
  }
  return (
    <>
      <Title kicker="Details">{`${wedding.bride} & ${wedding.groom}`}</Title>
      <article className="glass card" style={{ marginTop: "1rem", maxWidth: 560 }}>
        <p>Bride · {wedding.bride}</p>
        <p>Groom · {wedding.groom}</p>
        <p>Date · {wedding.date}</p>
        <p>City · {wedding.city}</p>
        {wedding.title ? <p>Title · {wedding.title}</p> : null}
        {wedding.story ? <p>{wedding.story}</p> : null}
        <p className="muted">Two families, one week in {wedding.city}, and a home the guests can open without an account.</p>
        <Link className="btn-text" href="/wedding/new">Edit the wedding</Link>
      </article>
    </>
  );
}

export function Members() {
  const { person, members, invitations, setMemberRole, removeMember, inviteMember, resendInvitation, revokeInvitation } = usePreview();
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const admins = members.filter((member) => member.role === "admin").length;

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "");
    const role = String(data.get("role") || "manager") as Role;
    setPending(true);
    const failure = await inviteMember({ name: "", email, role });
    setNotice(failure ?? `We emailed ${email.trim()}. They join when they sign in or create an account with that address.`);
    if (!failure) form.reset();
    setPending(false);
  }

  return (
    <AdminsOnly title="Members">
      <Title kicker="Members">Who can organise</Title>
      <p className="lede">Only an Admin invites, removes, or changes a role. The last Admin stays.</p>
      <div className="list">
        {members.map((member) => {
          const nextRole: Role = member.role === "admin" ? "manager" : "admin";
          const lastAdmin = member.role === "admin" && admins === 1;
          const self = member.email === person?.email;
          return (
            <article key={member.email} className="glass list-row">
              <div>
                <strong>{member.name}</strong>
                <p className="muted">{member.email}</p>
              </div>
              <button
                className="chip"
                type="button"
                disabled={lastAdmin}
                onClick={() => {
                  void setMemberRole(member.email, nextRole).then((saved) => {
                    setNotice(saved ? `${member.name} is now ${nextRole === "admin" ? "an Admin" : "a Manager"}.` : "The wedding keeps its last Admin.");
                  });
                }}
              >
                {member.role === "admin" ? "Admin" : "Manager"}
              </button>
              {self ? null : (
                <button
                  className="btn-text"
                  type="button"
                  onClick={() => {
                    void removeMember(member.email).then((saved) => {
                      setNotice(saved ? `${member.name} is no longer organising.` : "The wedding keeps its last Admin.");
                    });
                  }}
                >
                  Remove
                </button>
              )}
            </article>
          );
        })}
      </div>
      {invitations.length > 0 ? (
        <div className="list" style={{ marginTop: "1rem" }}>
          {invitations.map((invite) => (
            <article key={invite.id} className="glass list-row">
              <div>
                <strong>{invite.email}</strong>
                <p className="muted">Waiting · {invite.role === "admin" ? "Admin" : "Manager"}</p>
              </div>
              <button
                className="btn-text"
                type="button"
                onClick={() => {
                  void resendInvitation(invite.id).then((failure) => {
                    setNotice(failure ?? `Sent again to ${invite.email}.`);
                  });
                }}
              >
                Resend
              </button>
              <button
                className="btn-text"
                type="button"
                onClick={() => {
                  void revokeInvitation(invite.id).then((failure) => {
                    setNotice(failure ?? `Withdrew the invitation for ${invite.email}.`);
                  });
                }}
              >
                Withdraw
              </button>
            </article>
          ))}
        </div>
      ) : null}
      <form className="glass card fields" style={{ marginTop: "1rem", maxWidth: 460 }} onSubmit={(event) => void invite(event)}>
        <p className="kicker">Invite</p>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Role
          <select name="role" defaultValue="manager">
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="btn" type="submit" disabled={pending}>{pending ? "Sending…" : "Invite"}</button>
        {notice ? <p className="fine">{notice}</p> : null}
      </form>
    </AdminsOnly>
  );
}

export function Account() {
  const router = useRouter();
  const { person, signOut } = usePreview();
  if (!person) return null;
  return (
    <>
      <Title kicker="Account">{person.name}</Title>
      <article className="glass card" style={{ marginTop: "1rem", maxWidth: 460 }}>
        <p>Email · {person.email}</p>
        <p>Role · {person.role === "admin" ? "Admin" : "Manager"}</p>
        <p className="muted">Managers use the same wedding. They do not invite members or publish the website.</p>
        <div className="actions">
          <Link className="btn-text" href="/">Public home</Link>
          <Link className="btn-text" href="/reset-password">Reset password</Link>
          <button
            className="btn"
            type="button"
            onClick={() => {
              signOut();
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      </article>
    </>
  );
}
