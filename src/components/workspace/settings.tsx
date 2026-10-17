"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, errorText, invalidate, useResource } from "@/components/api";
import { useSession, type Me, type Role } from "@/components/session";
import { AdminOnly } from "@/components/workspace/shell";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, ButtonLink, Card, ErrorNote, Field, PageHeader, PasswordInput, Segmented, Skeleton, TextArea, TextInput, useFeedback } from "@/components/ui/kit";
import { initials, shortDay } from "@/data/format";
import { passwordProblem } from "@/data/password-rules";

/* ---------- Wedding details ---------- */

type WeddingDetails = { brideName: string; groomName: string; title: string | null; story: string | null; weddingDate: string; city: string };

export function DetailsPage() {
  const { setMe } = useSession();
  const { data, error, loading, reload } = useResource<WeddingDetails>("/api/wedding");
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("brideName") || !text("groomName") || !text("weddingDate") || !text("city")) return setProblem("The bride, the groom, the date, and the city are needed.");
    setBusy(true);
    setProblem(null);
    try {
      const me = await api<Me>("/api/wedding", {
        method: "PATCH",
        body: { brideName: text("brideName"), groomName: text("groomName"), weddingDate: text("weddingDate"), city: text("city"), title: text("title") || null, story: text("story") || null },
      });
      setMe(me);
      toast("Wedding details saved.");
      invalidate("/api/wedding", "/api/dashboard");
    } catch (failure) {
      setProblem(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader kicker="Wedding details" title="The couple and the date" lede="Every organiser can edit these. The countdown uses this date until a function is marked as the primary wedding date." />
      {loading ? <Skeleton rows={2} /> : null}
      {error ? <ErrorNote message={error} retry={reload} /> : null}
      {data ? (
        <Card>
          <form className="ui-form" onSubmit={(event) => void submit(event)} noValidate>
            <Field label="Bride"><TextInput name="brideName" defaultValue={data.brideName} maxLength={100} /></Field>
            <Field label="Groom"><TextInput name="groomName" defaultValue={data.groomName} maxLength={100} /></Field>
            <Field label="Wedding date"><TextInput name="weddingDate" type="date" defaultValue={data.weddingDate} /></Field>
            <Field label="City"><TextInput name="city" defaultValue={data.city} maxLength={80} /></Field>
            <Field label="Title" span={2} optional hint="Shown instead of the two names, e.g. “Aanya weds Kabir”."><TextInput name="title" defaultValue={data.title ?? ""} maxLength={120} /></Field>
            <Field label="Your story" span={2} optional hint="A few lines for the guest website."><TextArea name="story" defaultValue={data.story ?? ""} rows={5} maxLength={2000} /></Field>
            {problem ? <p className="ui-span-2 auth-alert" role="alert">{problem}</p> : null}
            <div className="ui-span-2"><Button type="submit" busy={busy}>Save details</Button></div>
          </form>
        </Card>
      ) : null}
    </>
  );
}

/* ---------- Members ---------- */

type Members = {
  members: { userId: string; name: string; email: string; role: Role; joinedAt: string }[];
  invitations: { id: string; email: string; role: Role; expiresAt: string }[];
};

export function MembersPage() {
  return (
    <AdminOnly>
      <MembersInner />
    </AdminOnly>
  );
}

function MembersInner() {
  const { me } = useSession();
  const { data, error, loading, reload } = useResource<Members>("/api/members");
  const { toast, confirm } = useFeedback();
  const [role, setRole] = useState<Role>("manager");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const admins = data?.members.filter((member) => member.role === "admin").length ?? 0;

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api("/api/members/invitations", { method: "POST", body: { email: email.trim(), role } });
      toast(`Invitation emailed to ${email.trim()}.`);
      setEmail("");
    } catch (failure) {
      toast(errorText(failure), "bad");
    } finally {
      setBusy(false);
      reload();
    }
  }

  async function act(work: () => Promise<unknown>, message: string) {
    try {
      await work();
      toast(message);
      reload();
      invalidate("/api/dashboard", "/api/members/assignees");
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  return (
    <>
      <PageHeader kicker="Members" title="Who organises" lede="Admins invite, remove, and change roles, and run the website. Managers plan everything else. Everyone sees the same wedding." />
      <Card kicker="Invite" title="Add someone from the family">
        <form className="ui-form" onSubmit={(event) => void invite(event)} style={{ gridTemplateColumns: "minmax(0, 1.4fr) auto auto", alignItems: "end" }}>
          <Field label="Email"><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="papa@example.com" autoComplete="off" required /></Field>
          <Segmented<Role> label="Role" value={role} onChange={setRole} options={[{ id: "manager", label: "Manager" }, { id: "admin", label: "Admin" }]} />
          <Button type="submit" icon="mail" busy={busy} disabled={!email.trim()}>Send invite</Button>
        </form>
        <p className="ui-hint" style={{ marginTop: "0.6rem" }}>They get an email with a link. They join when they sign in or create an account with that same address. The link lasts seven days.</p>
      </Card>
      {loading ? <Skeleton rows={3} /> : null}
      {error ? <ErrorNote message={error} retry={reload} /> : null}
      {data ? (
        <div className="ui-list">
          {data.members.map((member) => {
            const self = member.email === me?.user.email;
            const lastAdmin = member.role === "admin" && admins === 1;
            return (
              <div key={member.userId} className="ui-row ws-member">
                <span className="ws-avatar" aria-hidden="true">{initials(member.name)}</span>
                <div className="ui-row-main">
                  <span className="ui-row-title"><span>{member.name}{self ? " (you)" : ""}</span><Badge tone={member.role === "admin" ? "gold" : "neutral"}>{member.role === "admin" ? "Admin" : "Manager"}</Badge></span>
                  <span className="ui-row-meta"><span>{member.email}</span><span>Joined {shortDay(member.joinedAt)}</span></span>
                </div>
                <div className="ui-row-actions">
                  <Button
                    size="sm"
                    tone="secondary"
                    disabled={lastAdmin}
                    title={lastAdmin ? "The wedding keeps at least one Admin" : undefined}
                    onClick={() => void act(() => api(`/api/members/${member.userId}`, { method: "PATCH", body: { role: member.role === "admin" ? "manager" : "admin" } }), `${member.name} is now ${member.role === "admin" ? "a Manager" : "an Admin"}.`)}
                  >
                    Make {member.role === "admin" ? "Manager" : "Admin"}
                  </Button>
                  {self ? null : (
                    <Button
                      size="sm"
                      tone="ghost"
                      icon="trash"
                      disabled={lastAdmin}
                      onClick={() => {
                        void confirm({ title: `Remove ${member.name}?`, body: "They lose access to this wedding. Their tasks become unassigned.", confirm: "Remove", danger: true }).then((sure) => {
                          if (sure) void act(() => api(`/api/members/${member.userId}`, { method: "DELETE" }), `${member.name} no longer organises.`);
                        });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {data.invitations.map((invite) => (
            <div key={invite.id} className="ui-row ws-member" style={{ borderStyle: "dashed" }}>
              <span className="ws-avatar" aria-hidden="true"><Icon name="mail" size={15} /></span>
              <div className="ui-row-main">
                <span className="ui-row-title"><span>{invite.email}</span><Badge tone="warn">Invited · {invite.role === "admin" ? "Admin" : "Manager"}</Badge></span>
                <span className="ui-row-meta"><span>Link valid until {shortDay(invite.expiresAt)}</span></span>
              </div>
              <div className="ui-row-actions">
                <Button size="sm" tone="secondary" onClick={() => void act(() => api(`/api/members/invitations/${invite.id}/resend`, { method: "POST" }), `Sent again to ${invite.email}.`)}>Resend</Button>
                <Button size="sm" tone="ghost" onClick={() => void act(() => api(`/api/members/invitations/${invite.id}`, { method: "DELETE" }), "Invitation withdrawn.")}>Withdraw</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

/* ---------- Account ---------- */

export function AccountPage() {
  const router = useRouter();
  const { me, setMe, signOut } = useSession();
  const { toast, confirm } = useFeedback();
  const [nameBusy, setNameBusy] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  if (!me) return null;

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    setNameBusy(true);
    try {
      setMe(await api<Me>("/api/me", { method: "PATCH", body: { name } }));
      toast("Name saved.");
      invalidate("/api/members/assignees");
    } catch (failure) {
      toast(errorText(failure), "bad");
    } finally {
      setNameBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    const again = String(data.get("again") ?? "");
    const weak = passwordProblem(next);
    if (weak) return setPassError(weak);
    if (next !== again) return setPassError("The new passwords do not match.");
    setPassBusy(true);
    setPassError(null);
    try {
      await api("/api/me/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      form.reset();
      toast("Password changed. Other devices are signed out.");
    } catch (failure) {
      setPassError(errorText(failure));
    } finally {
      setPassBusy(false);
    }
  }

  async function leave() {
    const sure = await confirm({ title: "Leave this wedding?", body: "You will no longer see it. An Admin can invite you again.", confirm: "Leave", danger: true });
    if (!sure) return;
    try {
      await api("/api/members/leave", { method: "POST" });
      toast("You have left the wedding.");
      router.push("/plan");
      window.setTimeout(() => window.location.reload(), 50);
    } catch (failure) {
      toast(errorText(failure), "bad");
    }
  }

  return (
    <>
      <PageHeader kicker="Account" title={me.user.name} lede={`${me.user.email} · ${me.membership?.role === "admin" ? "Admin" : "Manager"} of this wedding. This page is yours, not the wedding's.`} />
      <div className="ws-grid ws-grid-2">
        <Card kicker="Profile" title="Your name">
          <form className="ui-form ui-form-1" onSubmit={(event) => void saveName(event)}>
            <Field label="Name" hint="Shown on tasks and to the other organisers."><TextInput name="name" defaultValue={me.user.name} maxLength={100} autoComplete="name" /></Field>
            <Field label="Email" hint="The address you sign in with."><TextInput value={me.user.email} disabled readOnly /></Field>
            <div><Button type="submit" busy={nameBusy}>Save name</Button></div>
          </form>
        </Card>
        <Card kicker="Security" title="Change password">
          <form className="ui-form ui-form-1" onSubmit={(event) => void savePassword(event)} noValidate>
            <Field label="Current password"><PasswordInput name="current" autoComplete="current-password" /></Field>
            <Field label="New password" hint="10 to 128 characters. Not a common password."><PasswordInput name="next" autoComplete="new-password" /></Field>
            <Field label="New password again"><PasswordInput name="again" autoComplete="new-password" /></Field>
            {passError ? <p className="auth-alert" role="alert">{passError}</p> : null}
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
              <Button type="submit" busy={passBusy}>Change password</Button>
              <ButtonLink href="/reset-password" tone="ghost">Forgot it? Reset by email</ButtonLink>
            </div>
          </form>
        </Card>
      </div>
      <Card kicker="Leave" title="Sign out or step away">
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button tone="secondary" icon="logout" onClick={() => void signOut().then(() => router.push("/"))}>Sign out</Button>
          <Button tone="ghost" onClick={() => void leave()}>Leave this wedding</Button>
        </div>
        <p className="ui-hint" style={{ marginTop: "0.6rem" }}>The last Admin cannot leave until someone else is an Admin.</p>
      </Card>
    </>
  );
}

/* ---------- Preview as guest ---------- */

export function PreviewPage() {
  const site = useResource<{ published: boolean; slug: string | null; events: unknown[] }>("/api/preview/site");
  return (
    <>
      <PageHeader kicker="Preview as guest" title="See what the guests see" lede="Both open in this browser without signing out. The test invitation behaves like a real one, and nothing you send from it is saved." />
      <div className="ws-preview-cards">
        <div className="ws-preview-card">
          <div className="ws-preview-art"><b lang="hi">स्वागत</b><span>The wedding website</span></div>
          <h2>The website</h2>
          <p>{site.data?.published ? "Live for anyone with the address." : "Not published yet. Only the family can see this preview."}</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <ButtonLink href="/preview/site" icon="eye">Preview the website</ButtonLink>
            {site.data?.published && site.data.slug ? <ButtonLink href={`/w/${site.data.slug}`} tone="secondary" external icon="external">Open the live site</ButtonLink> : null}
          </div>
        </div>
        <div className="ws-preview-card">
          <div className="ws-preview-art" style={{ background: "linear-gradient(160deg, #fdf2d8, #f6d978)", color: "#8a4b08" }}><b lang="hi">निमंत्रण</b><span>A household&apos;s invitation</span></div>
          <h2>A test invitation</h2>
          <p>A made-up “Preview family” of four, invited to every function. Try the RSVP, the maps, and the music.</p>
          <div><ButtonLink href="/preview/invite" icon="eye">Open the test invitation</ButtonLink></div>
        </div>
      </div>
    </>
  );
}
