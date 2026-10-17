"use client";

import { useState, type FormEvent } from "react";

import { api, errorText, invalidate, useResource } from "@/components/api";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, Card, Drawer, EmptyState, ErrorNote, Field, MoneyInput, PageHeader, Select, Skeleton, TextArea, TextInput, useFeedback } from "@/components/ui/kit";
import { useEvents } from "@/components/workspace/events";
import { civilLong, expenseCategoryLabels, formatInr, plural, todayInIndia } from "@/data/format";

type Expense = {
  id: string;
  title: string;
  amountInr: number;
  spentOn: string;
  category: string;
  eventId: string | null;
  eventTitle: string | null;
  vendorId: string | null;
  vendorName: string | null;
  vendorLabel: string | null;
  notes: string | null;
};

type ExpenseList = { items: Expense[]; sumInr: number; byCategory: { category: string; totalInr: number; count: number }[] };

export function ExpensesPage() {
  const { data, error, loading, reload } = useResource<ExpenseList>("/api/expenses");
  const events = useEvents();
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [category, setCategory] = useState("all");
  const [eventId, setEventId] = useState("all");
  const items = data?.items ?? [];
  const visible = items.filter((item) => (category === "all" || item.category === category) && (eventId === "all" || item.eventId === eventId));
  const visibleTotal = visible.reduce((sum, item) => sum + item.amountInr, 0);
  const max = Math.max(1, ...(data?.byCategory ?? []).map((row) => row.totalInr));

  return (
    <>
      <PageHeader
        kicker="Expenses"
        title="What has been spent"
        lede="A spend log in rupees that every organiser sees. Not a budget: write down what was paid, when, and to whom."
        actions={<Button icon="plus" onClick={() => setEditing("new")}>Log an expense</Button>}
      />
      {loading ? <Skeleton rows={3} /> : null}
      {error ? <ErrorNote message={error} retry={reload} /> : null}
      {data ? (
        <div className="ws-grid ws-grid-main">
          <div className="ws-grid">
            <div className="ws-toolbar">
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
                  <option value="all">Every category</option>
                  {Object.entries(expenseCategoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </Select>
                <Select value={eventId} onChange={(event) => setEventId(event.target.value)} aria-label="Function">
                  <option value="all">Every function</option>
                  {(events.data?.items ?? []).map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                </Select>
              </div>
              {category !== "all" || eventId !== "all" ? <span className="ui-hint">{plural(visible.length, "expense")} · {formatInr(visibleTotal)}</span> : null}
            </div>
            {items.length === 0 ? (
              <EmptyState icon="rupee" title="Nothing logged yet" action={<Button icon="plus" onClick={() => setEditing("new")}>Log the first expense</Button>}>
                The caterer advance, the lehenga, the tent deposit. Every organiser sees the same total.
              </EmptyState>
            ) : null}
            <div className="ui-list">
              {visible.map((item) => (
                <article key={item.id} className="ui-row ui-row-clickable" role="button" tabIndex={0} onClick={() => setEditing(item)} onKeyDown={(event) => { if (event.key === "Enter") setEditing(item); }}>
                  <div className="ui-row-main">
                    <span className="ui-row-title"><span>{item.title}</span><Badge>{expenseCategoryLabels[item.category] ?? item.category}</Badge></span>
                    <span className="ui-row-meta">
                      <span><Icon name="calendar" size={13} />{civilLong(item.spentOn)}</span>
                      {item.vendorName ? <span><Icon name="store" size={13} />{item.vendorName}</span> : null}
                      {item.eventTitle ? <span><Icon name="sparkle" size={13} />{item.eventTitle}</span> : null}
                    </span>
                  </div>
                  <span className="ws-amount">{formatInr(item.amountInr)}</span>
                </article>
              ))}
            </div>
          </div>
          <div className="ws-grid">
            <Card kicker="Total spent">
              <p className="ws-total">{formatInr(data.sumInr)}</p>
              <p className="ui-hint">{plural(items.length, "expense")} logged{data.sumInr >= 1_00_000 ? ` · ${formatInr(data.sumInr, { compact: true })}` : ""}</p>
            </Card>
            {data.byCategory.length > 0 ? (
              <Card kicker="By category">
                <div className="ws-bars">
                  {data.byCategory.map((row) => (
                    <button key={row.category} type="button" className="ws-bar-row" onClick={() => setCategory(category === row.category ? "all" : row.category)} style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", opacity: category === "all" || category === row.category ? 1 : 0.45 }}>
                      <div><span>{expenseCategoryLabels[row.category] ?? row.category}</span><b>{formatInr(row.totalInr)}</b></div>
                      <div className="ws-meter"><span style={{ width: `${Math.max(4, (row.totalInr / max) * 100)}%` }} /></div>
                    </button>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== "new" ? "Edit expense" : "Log an expense"}>
        {editing !== null ? <ExpenseForm key={editing === "new" ? "new" : editing.id} expense={editing === "new" ? null : editing} onDone={() => setEditing(null)} /> : null}
      </Drawer>
    </>
  );
}

function ExpenseForm({ expense, onDone }: { expense: Expense | null; onDone: () => void }) {
  const events = useEvents();
  const vendors = useResource<{ items: { id: string; name: string; category: string }[] }>("/api/vendors");
  const { toast, confirm } = useFeedback();
  const [vendorId, setVendorId] = useState(expense?.vendorId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const amount = Number(text("amountInr"));
    if (!text("title")) return setError("Say what it was for.");
    if (!amount || amount < 1) return setError("Enter the amount in rupees.");
    if (!text("spentOn")) return setError("Choose the date it was paid.");
    setBusy(true);
    setError(null);
    try {
      await api(expense ? `/api/expenses/${expense.id}` : "/api/expenses", {
        method: expense ? "PATCH" : "POST",
        body: {
          title: text("title"),
          amountInr: amount,
          spentOn: text("spentOn"),
          category: text("category"),
          eventId: text("eventId") || null,
          vendorId: vendorId || null,
          vendorLabel: vendorId ? null : text("vendorLabel"),
          notes: text("notes"),
        },
      });
      toast(expense ? "Expense saved." : `${formatInr(amount)} logged.`);
      invalidate("/api/expenses", "/api/dashboard", "/api/vendors");
      onDone();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!expense) return;
    if (!(await confirm({ title: "Delete this expense?", body: `${expense.title} · ${formatInr(expense.amountInr)}`, confirm: "Delete", danger: true }))) return;
    try {
      await api(`/api/expenses/${expense.id}`, { method: "DELETE" });
      toast("Expense deleted.");
      invalidate("/api/expenses", "/api/dashboard", "/api/vendors");
      onDone();
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  return (
    <form className="ui-form" onSubmit={(event) => void submit(event)} noValidate>
      <Field label="What it was for" span={2}><TextInput name="title" defaultValue={expense?.title ?? ""} placeholder="Caterer advance" maxLength={140} autoFocus /></Field>
      <Field label="Amount"><MoneyInput name="amountInr" defaultValue={expense?.amountInr} /></Field>
      <Field label="Paid on"><TextInput name="spentOn" type="date" defaultValue={expense?.spentOn ?? todayInIndia()} /></Field>
      <Field label="Category">
        <Select name="category" defaultValue={expense?.category ?? "miscellaneous"}>
          {Object.entries(expenseCategoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </Select>
      </Field>
      <Field label="Function" optional>
        <Select name="eventId" defaultValue={expense?.eventId ?? ""} key={events.data ? "ready" : "loading"}>
          <option value="">Whole wedding</option>
          {(events.data?.items ?? []).map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </Select>
      </Field>
      <Field label="Paid to" optional hint="Choose a saved vendor, or type a name.">
        <Select value={vendorId} onChange={(event) => setVendorId(event.target.value)} key={vendors.data ? "ready" : "loading"}>
          <option value="">Not a saved vendor</option>
          {(vendors.data?.items ?? []).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
        </Select>
      </Field>
      {vendorId ? <div /> : <Field label="Name" optional><TextInput name="vendorLabel" defaultValue={expense?.vendorLabel ?? ""} placeholder="Sharma Tent House" maxLength={120} /></Field>}
      <Field label="Notes" span={2} optional><TextArea name="notes" defaultValue={expense?.notes ?? ""} maxLength={1000} /></Field>
      {error ? <p className="ui-span-2 auth-alert" role="alert">{error}</p> : null}
      <div className="ui-span-2 ui-drawer-foot" style={{ margin: "0.5rem -1.4rem -1.4rem", position: "sticky", bottom: "-1.4rem" }}>
        {expense ? <Button tone="danger" icon="trash" onClick={() => void remove()}>Delete</Button> : null}
        <Button tone="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" busy={busy}>{expense ? "Save" : "Log expense"}</Button>
      </div>
    </form>
  );
}
