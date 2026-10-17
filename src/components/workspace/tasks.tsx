"use client";

import { useState, type FormEvent } from "react";

import { api, errorText, invalidate, useResource } from "@/components/api";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, Drawer, EmptyState, ErrorNote, Field, PageHeader, Segmented, Select, Skeleton, TextArea, TextInput, useFeedback } from "@/components/ui/kit";
import { useEvents } from "@/components/workspace/events";
import { civilShort, relativeDays, todayInIndia } from "@/data/format";

type Status = "todo" | "doing" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  assigneeName: string | null;
  mine: boolean;
  eventId: string | null;
  eventTitle: string | null;
  dueOn: string | null;
};

type Filter = "all" | "mine" | "unassigned" | "done";

const columns: { id: Status; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

export function TasksPage() {
  const { data, error, loading, reload } = useResource<{ items: Task[] }>("/api/tasks");
  const events = useEvents();
  const { toast } = useFeedback();
  const [filter, setFilter] = useState<Filter>("all");
  const [eventId, setEventId] = useState("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [quick, setQuick] = useState("");
  const [adding, setAdding] = useState(false);
  const items = data?.items ?? [];
  const today = todayInIndia();

  const visible = items.filter((task) => {
    if (filter === "mine" && !task.mine) return false;
    if (filter === "unassigned" && task.assigneeId) return false;
    if (filter === "done" && task.status !== "done") return false;
    if (eventId !== "all" && task.eventId !== eventId) return false;
    return true;
  });

  async function addQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setAdding(true);
    try {
      await api("/api/tasks", { method: "POST", body: { title, assignToMe: filter === "mine", ...(eventId !== "all" ? { eventId } : {}) } });
      setQuick("");
      toast("Task added.");
      invalidate("/api/tasks", "/api/dashboard");
    } catch (failure) {
      toast(errorText(failure), "bad");
    } finally {
      setAdding(false);
    }
  }

  async function move(task: Task, status: Status) {
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: { status } });
      if (status === "done") toast(`Done: ${task.title}`);
      invalidate("/api/tasks", "/api/dashboard");
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  return (
    <>
      <PageHeader kicker="Tasks" title="The work" lede="Every organiser sees every task. Give each one a person and a date, and tick it off when it is done." />
      <form className="ui-card" onSubmit={(event) => void addQuick(event)} style={{ display: "flex", gap: "0.6rem", padding: "0.8rem" }}>
        <TextInput value={quick} onChange={(event) => setQuick(event.target.value)} placeholder="Add a task, e.g. Book the mehendi artist" maxLength={140} aria-label="New task" />
        <Button type="submit" icon="plus" busy={adding} disabled={!quick.trim()}>Add</Button>
      </form>
      <div className="ws-toolbar">
        <Segmented<Filter>
          label="Task filter"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All", count: items.length },
            { id: "mine", label: "Mine", count: items.filter((task) => task.mine && task.status !== "done").length },
            { id: "unassigned", label: "Unassigned", count: items.filter((task) => !task.assigneeId && task.status !== "done").length },
            { id: "done", label: "Done", count: items.filter((task) => task.status === "done").length },
          ]}
        />
        <Select value={eventId} onChange={(event) => setEventId(event.target.value)} aria-label="Function">
          <option value="all">Every function</option>
          {(events.data?.items ?? []).map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </Select>
      </div>
      {loading ? <Skeleton rows={3} /> : null}
      {error ? <ErrorNote message={error} retry={reload} /> : null}
      {data && items.length === 0 ? <EmptyState icon="checkSquare" title="Nothing on the list yet">Type a task above. Book the pandit, confirm the caterer count, print the welcome cards.</EmptyState> : null}
      {data && items.length > 0 ? (
        <div className="ws-board">
          {columns
            .filter((column) => filter !== "done" || column.id === "done")
            .map((column) => {
              const cards = visible.filter((task) => task.status === column.id);
              return (
                <section key={column.id} className="ws-column" aria-label={column.label}>
                  <div className="ws-column-head"><span>{column.label}</span><span className="ui-count">{cards.length}</span></div>
                  {cards.length === 0 ? <p className="ui-hint" style={{ padding: "0 0.3rem" }}>Nothing here.</p> : null}
                  {cards.map((task) => {
                    const overdue = task.dueOn && task.status !== "done" && task.dueOn < today;
                    return (
                      <div key={task.id} className="ws-task" data-done={task.status === "done"} role="button" tabIndex={0} onClick={() => setEditing(task)} onKeyDown={(event) => { if (event.key === "Enter") setEditing(task); }}>
                        <div className="ws-task-title">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={task.status === "done"}
                            aria-label={task.status === "done" ? "Mark not done" : "Mark done"}
                            className="ws-check"
                            onClick={(event) => {
                              event.stopPropagation();
                              void move(task, task.status === "done" ? "todo" : "done");
                            }}
                          >
                            {task.status === "done" ? <Icon name="check" size={13} /> : null}
                          </button>
                          <span>{task.title}</span>
                        </div>
                        <div className="ws-task-meta">
                          <span className={`ws-prio ws-prio-${task.priority}`} title={`${task.priority} priority`} />
                          <span>{task.assigneeName ?? "Unassigned"}</span>
                          {task.eventTitle ? <Badge>{task.eventTitle}</Badge> : null}
                          {task.dueOn ? <Badge tone={overdue ? "bad" : task.status === "done" ? "neutral" : "warn"}>{overdue ? `Overdue ${civilShort(task.dueOn)}` : task.status === "done" ? civilShort(task.dueOn) : `Due ${relativeDays(task.dueOn)}`}</Badge> : null}
                        </div>
                        {column.id === "todo" ? (
                          <Button size="sm" tone="ghost" icon="chevronRight" onClick={(event) => { event.stopPropagation(); void move(task, "doing"); }} style={{ justifySelf: "start", marginLeft: "-0.5rem" }}>Start</Button>
                        ) : null}
                      </div>
                    );
                  })}
                </section>
              );
            })}
        </div>
      ) : null}
      <Drawer open={editing !== null} onClose={() => setEditing(null)} title="Task">
        {editing ? <TaskForm key={editing.id} task={editing} onDone={() => setEditing(null)} /> : null}
      </Drawer>
    </>
  );
}

function TaskForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const assignees = useResource<{ items: { userId: string; name: string }[] }>("/api/members/assignees");
  const events = useEvents();
  const { toast, confirm } = useFeedback();
  const [status, setStatus] = useState<Status>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    if (!text("title")) return setError("Give the task a title.");
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: {
          title: text("title"),
          description: text("description"),
          status,
          priority,
          assigneeId: text("assigneeId") || null,
          eventId: text("eventId") || null,
          dueOn: text("dueOn") || null,
        },
      });
      toast("Task saved.");
      invalidate("/api/tasks", "/api/dashboard");
      onDone();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirm({ title: "Delete this task?", body: task.title, confirm: "Delete", danger: true }))) return;
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      toast("Task deleted.");
      invalidate("/api/tasks", "/api/dashboard");
      onDone();
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  return (
    <form className="ui-form" onSubmit={(event) => void submit(event)} noValidate>
      <Field label="Task" span={2}><TextInput name="title" defaultValue={task.title} maxLength={140} /></Field>
      <Field label="Notes" span={2} optional><TextArea name="description" defaultValue={task.description ?? ""} maxLength={2000} /></Field>
      <fieldset>
        <legend className="ui-label">Status</legend>
        <Segmented<Status> label="Status" value={status} onChange={setStatus} options={columns.map((column) => ({ id: column.id, label: column.label }))} />
      </fieldset>
      <fieldset>
        <legend className="ui-label">Priority</legend>
        <Segmented<Priority> label="Priority" value={priority} onChange={setPriority} options={[{ id: "high", label: "High" }, { id: "medium", label: "Medium" }, { id: "low", label: "Low" }]} />
      </fieldset>
      <Field label="Who is doing it">
        <Select name="assigneeId" defaultValue={task.assigneeId ?? ""} key={assignees.data ? "ready" : "loading"}>
          <option value="">Unassigned</option>
          {(assignees.data?.items ?? []).map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}
        </Select>
      </Field>
      <Field label="Due" optional><TextInput name="dueOn" type="date" defaultValue={task.dueOn ?? ""} /></Field>
      <Field label="For which function" span={2} optional>
        <Select name="eventId" defaultValue={task.eventId ?? ""} key={events.data ? "ready" : "loading"}>
          <option value="">Not tied to a function</option>
          {(events.data?.items ?? []).map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </Select>
      </Field>
      {error ? <p className="ui-span-2 auth-alert" role="alert">{error}</p> : null}
      <div className="ui-span-2 ui-drawer-foot" style={{ margin: "0.5rem -1.4rem -1.4rem", position: "sticky", bottom: "-1.4rem" }}>
        <Button tone="danger" icon="trash" onClick={() => void remove()}>Delete</Button>
        <Button tone="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" busy={busy}>Save</Button>
      </div>
    </form>
  );
}
