# The Wedding Home — Product Requirements Document

**Product:** The Wedding Home — the operating system for Indian marriages  
**Version:** 1.3  
**Status:** Ready to build  
**Date:** 30 Sep 2026 (first written 20 Sep 2026)  
**Audience:** Anyone implementing or reviewing a slice

This PRD is the build-ready expansion of the locked plan. It does not invent pages or roles.

| Artifact | Job |
|---|---|
| [PRODUCT.md](./PRODUCT.md) | Locked vision, page map, layers, out of scope |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design: stack, boundaries, vendors |
| This file | Requirements, objects, journeys, acceptance criteria |
| [PLAYBOOK.md](./PLAYBOOK.md) | How we got here; how to do the next idea |

Build in the order in §8. Do not add navigation that is not in the page map.

**v1.3:** Three product choices made while starting the database design: RSVP diet is a headcount per category; the Aashirwad wall is written by the family only; Meet the families is two structured entries. See §7, FR-2.3, FR-2.5, §12, §18.

**v1.2:** Compared with a generic Indian-wedding-OS PRD (Make My Marriage). We copied operational gaps that sit on **existing** pages. We did **not** copy their nav, their three generic themes, or dropping scheduled reminders.

---

## 1. Summary

The Wedding Home is a **shared family workspace** plus a **no-login guest website**.

Organisers (bride, groom, parents, siblings, close family, trusted friends) log in as **Admin** or **Manager**. There can be many of both. They all see the **same** wedding: events, guests, tasks, expenses, vendors, gallery.

Guests never create an account. Someone they already know sends a WhatsApp with a prefilled invite and their unique link. They open the invitation, RSVP a family count, see only the functions they were invited to, tap the venue map into Google Maps, watch a **YouTube livestream embedded on our site** from a pasted Live URL, and share photos and videos in one gallery.

After login, the family app matches the person’s **role**: Admin sees Members and Website & themes; Manager does not. Same wedding data either way.

The distinctive layer is the **theme studio**: one wedding look, then per-function colour, music, and video.

This version: **one user, one wedding.** Resume first; ship in layers; take time.

---

## 2. Problem

An Indian wedding is a week of functions, two families, cash, WhatsApp, and a guest list that is households — not a seating chart of individuals. Today that lives in forty chats, a spreadsheet, scattered vendor numbers, and a pretty website that cannot RSVP. Photos vanish across phones after the week.

What a family actually needs the night before:

- When is the muhurat
- Who is coming to *this* function, as a number
- Veg / non-veg / Jain / no onion-garlic for the caterer
- Who an outstation cousin calls when they are lost at the gate
- A picture dadi can forward on WhatsApp if she will not open a link

---

## 3. Goals and non-goals

### v1 goals

1. A family can run one wedding from a shared workspace.
2. Guests can RSVP without signing up.
3. Each function has its own time, a visible venue map, and a tap that opens **Google Maps** for that place.
4. Organisers send each household’s unique invite with one **Share on WhatsApp** tap (prefilled message + URL). Email send is available when an address exists. Not WhatsApp Business API.
5. Reminders fire 1 month / 1 week / 1 day before **that function**, and organisers can send a reminder **now**.
6. Tasks and expenses are one ledger, in INR, visible to every organiser. Expenses are a spend log, not a budget.
7. The guest site can be themed and published. Live is a YouTube (or similar) URL **shown on our website**. After login, Admin and Manager see the same wedding with role-correct pages.
8. Organisers can find nearby vendors on a map, save them with contacts, and log agreed cost. No booking.
9. Guests and organisers share one photo/video gallery, optionally grouped by function, with a stable QR.

### Explicit non-goals (this version)

WhatsApp Business API · SMS · push notifications · in-app notification centre · our own livestream · vendor **booking or payments** · vendor marketplace transactions · seating · hotel / room allocation · flights, trains, airport pickup, vehicles · shagun accounts desk · private money by family side · guest native app · guest accounts · public list of guest **names** · multiple weddings per user · wedding-planner business accounts · department or side-specific permissions · budgets, budget limits, split expenses, payment instalments, vendor payment schedules · activity logs · real-time collaborative presence · drag-and-drop website builder · custom domains · AI · advanced gallery permissions (face find, auto-tag)

These may become later releases. V1 is a cohesive product a real family could use — not every wedding feature.

---

## 4. Users and roles

### Organisers (login) — Wedding Members

Primary users: bride, groom, parents, siblings, close family, trusted friends.

| Role | Count | What they do |
|---|---|---|
| **Admin** | Many | Everything a Manager can, plus members and the public website (themes, slug, publish, Live URL) |
| **Manager** | Many | Help run the shaadi. Cannot invite, remove, or change member roles. Cannot open Website & themes. **Can** Preview as guest |

Last Admin cannot leave or be demoted until another Admin exists. A wedding must never have zero Admins.

### Guests (no account)

Open a public slug or a personal invite link. They never sign up.

### Constraint

One signed-in user belongs to one wedding. Professional planners managing many weddings are out of this version.

---

## 5. Rules that do not bend

1. **Same data for all organisers.** No private expenses, private tasks, or department permissions.
2. **Only Admin** invites, removes, or changes roles.
3. **Guests never sign up.**
4. Guests see **attending counts**, not other families’ names.
5. Guests see **only events they are invited to**.
6. Attendance and gallery are **not** a public name list.
7. Vendor map is **find and save**, not a marketplace.
8. Theme media is **family-uploaded or rights-cleared** only.
9. Do not add nav items that are not in the page map. Shaadi-specific fields live on existing pages.
10. The **Wedding** is the workspace. All other data hangs off it.
11. Simple enough for a parent: add a guest, tick a task, log a bill, see who replied.

---

## 6. Two surfaces and page map

### 6.1 Family app (login)

Every logged-in page shows the wedding identity (couple names / title). Dashboard is a command centre, not analytics.

Dashboard · Events (venue map → Google Maps) · Guests (Share on WhatsApp, email send, reminders) · Tasks · Expenses · Vendors (saved list + nearby search) · Website & themes (**Admin**) · Preview as guest · Photos & videos · Wedding details · Members (**Admin**) · Account

| Page | Job | Admin | Manager |
|---|---|---|---|
| Dashboard | Large days-to-wedding. Quieter next function. Counts: events, tasks done/total, households, RSVPs in, INR total, vendors. Jump links | Yes | Yes |
| Events | Functions: start/end, venue, city. Map below the address → Google Maps. Primary date + muhurat. Shortcuts include Roka / Engagement / Cocktail | Yes | Yes |
| Guests | Households, side, events invited, max people, RSVP, notes. Copy invite. Share on WhatsApp. Send/resend email. Reminder queue + send now | Yes | Yes |
| Tasks | To-do / doing / done. Assign. Optional event, due, priority. Filters on this page (all / mine / done) | Yes | Yes |
| Expenses | Spend log: title, amount INR, date, category, optional event and vendor. Same rupee total. Optional category breakdown. Not a budget | Yes | Yes |
| Vendors | **My vendors** (contacts, agreed cost) and **nearby search** on the same page. Save from the map. No booking | Yes | Yes |
| Website & themes | Pack, per-function override, public slug, Live URL add/update/remove, publish | Yes | Hidden |
| Preview as guest | Public site and a test invite, without leaving the workspace | Yes | Yes |
| Photos & videos | Shared gallery. Group by function. Upload, hide, delete, download. Guest upload on/off. Stable QR. Share gallery link | Yes | Yes |
| Wedding details | Bride name, groom name, date, city, title, cover, story | Yes | Yes |
| Members | Invite Admin/Manager by email. Change role. Remove. Never zero Admins | Yes | Hidden |
| Account | Name, email, password, reset, sign out. Not wedding data | Yes | Yes |

Vendors, Guests, and Photos stay **one nav item each**. Filters and two panels on a page are fine. Sub-nav like “Invitations / RSVP” or “Live Stream” is not.

### 6.2 Guest website (no account)

| Page | Job |
|---|---|
| Wedding home (public slug) | Pretty site: story, timeline of functions (date, time, venue, dress, map link), theme, live when on, meet the families, stay, aashirwad. **Not** used to RSVP. Visible after Admin publishes |
| Personal invite | Secret link. Couple names, welcome, only their functions, RSVP. Attending as a **number** |
| Function page | Colour, music, video, venue, time, dress, how to reach, **map below the address** → Google Maps, 3–4 lines what this function is |
| Live | YouTube (or similar) player **on our site** when a URL is pasted |
| Gallery | Private to people with the link. Photos **and** videos, optionally by function. Upload from the phone. No account |

Public home and personal invite are both required. RSVP only happens on the personal invite.

---

## 7. Core objects

Conceptual. Not a schema.

**User** — name, unique email, password. At most one wedding membership. Forgot-password reset.

**Wedding** — bride name, groom name, intended primary date, city, optional title, cover, story, public slug, published flag, Live URL, wedding-level theme pack, stay list, two helplines, meet the families (two entries: bride side and groom side, each with a heading, a short blurb and an optional photo), aashirwad wall (blessings written by the family: author, optional relation, message; guests cannot submit), optional blessings-only / UPI note, gallery guest-upload flag.

**Membership** — user, wedding, role `admin` | `manager`. Invite email outstanding until they sign up and join.

**Event (function)** — kind `roka` | `engagement` | `mehendi` | `haldi` | `sangeet` | `cocktail` | `wedding` | `reception` | `custom`, title, start, optional end, city, venue name, address, map coordinates (or Google place), optional cover, optional muhurat, primary-wedding-date flag, how to reach, parking, what not to wear / dress, 3–4 line explanation, optional theme-token override.

**Household (guest)** — display name, side (bride / groom / other), max people, events invited, secret invite token, optional email, optional phone, notes, invitation-sent flag (email). One invitation = one household, not every individual.

**RSVP** — household, per invited event: status (`silent` | `yes` | `no`), attending count (≤ max), and when `yes` a **diet headcount**: how many of the attending people are veg, non-veg, Jain, no onion-garlic (the four numbers add up to the attending count). `silent` means no answer yet. Later edits via the same link replace the previous answer.

**Task** — title, optional description, status (`todo` | `doing` | `done`), priority (`low` | `medium` | `high`), assignee (member), optional event, optional due date. No comments, attachments, subtasks, or dependencies.

**Expense** — title, amount (INR), date, category, optional event, optional saved vendor, optional free-text vendor label, notes, created by. Not a budget line.

**Saved vendor** — name, category, optional contact person, phone, email, address, website, optional agreed cost (INR), related events, notes, optional map place. Not a booking.

**Gallery item** — photo or video, storage URL, optional event (or “other”), uploaded by organiser or guest, hidden flag, created at.

**Reminder** — kind `please_rsvp` | `see_you_soon`, function-relative schedule and/or send-now, channel email + copy-to-WhatsApp.

**Theme tokens** — palette, type, motion, background, audio, video. See skill `indian-wedding-themes`.

---

## 8. Build slices

A slice is done when a human can finish that job in the UI.

| Order | Slice | Done when |
|---|---|---|
| 1 | Auth, wedding, members, events | Sign up / sign in / reset password. Create wedding (bride, groom, date, city). Add functions including a map that opens Google Maps. Dashboard countdown + simple counts. Invite a member by email |
| 2 | Guests, invite, RSVP | Phone opens a named link and submits a family count (with diet). Share on WhatsApp. Optional email send + sent flag |
| 3 | Reminders | 1 month / 1 week / 1 day mail plus copy-to-WhatsApp, plus send-now to silent households |
| 4 | Tasks, expenses | Tasks with assignee, priority, filters. Spend log with categories and a rupee total (and optional breakdown). Not a budget |
| 5 | Theme studio, public site, live, e-card, helplines, stay, families, aashirwad | One pack site-wide; one function can override colour and a song; Admin publishes; Live URL add/update/remove embeds on our site |
| 6 | Vendors | Nearby search, save to My vendors with contacts / agreed cost, no booking |
| 7 | Shared photo/video gallery | Guests see each other; optional albums by function; QR with a **stable** URL; hide/delete; download; guest upload on/off |

---

## 9. User journeys

### J1 — Couple starts the workspace (slice 1)

Sign up → create wedding (bride name, groom name, date, city, optional cover) → become Admin → add Haldi, Sangeet, wedding (primary + muhurat), reception → dashboard shows large countdown and counts → invite a parent as Admin or Manager (they sign up and join).

### J2 — Guest RSVPs from WhatsApp (slice 2)

Organiser taps **Share on WhatsApp** → WhatsApp opens with a prefilled invite and unique URL → guest opens on phone, no password → only invited functions → attending count and diet → can change later → attendance is a number, not names.

### J3 — Outstation cousin finds the farmhouse (slice 5)

Function page → how to reach, parking, what not to wear → map below the address → Open in Google Maps → helpline if lost.

### J4 — Elder who will not open a link (slice 5)

Organiser downloads WhatsApp e-card image from Guests and forwards the picture.

### J5 — Night-before ops (slices 3–4)

Reminder send-now or copy WhatsApp for silent households. Tick a task. Log a caterer bill against a saved vendor. Every organiser sees the same numbers.

### J6 — Sangeet looks like Sangeet (slice 5)

Admin picks a pack, overrides Sangeet, publishes, Previews as guest. A guest invited only to Sangeet never sees Haldi yellow.

---

## 10. Functional requirements

IDs are stable. Acceptance criteria are the test.

### Slice 1 — Auth, wedding, members, events

**FR-1.1 Sign up, sign in, sign out, reset password**  
Name, unique email, password. Forgot-password reset. Guests never authenticate.  
**AC:** Duplicate email is rejected. Invalid credentials fail clearly. Reset does not reveal whether an email exists beyond a generic message. Session required for all family pages.

**FR-1.2 Create wedding**  
A user with no wedding is prompted to create one. Required: bride name, groom name, wedding date, city. Optional: title, story, cover. Creator is the first Admin.  
**AC:** No second wedding for that user. Example identity: “Ananya & Rohan — 14 February 2027 — Dehradun”. Wedding details can edit these fields. Countdown uses this date until a primary event overrides it.

**FR-1.3 Members (Admin only)**  
Admin invites by email as Admin or Manager. Invitee creates an account (or signs in) and joins **this** wedding. Admin can view, change role, remove.  
**AC:** Manager never sees Members. Last Admin cannot leave, be removed, or be demoted. Email already on **another** wedding → clear error. Email already on **this** wedding → clear error. Email has an account with no wedding → they join after sign-in. Wedding never has zero Admins.

**FR-1.4 Events**  
Add / edit / delete / list functions. Shortcuts: Roka, Engagement, Mehendi, Haldi, Sangeet, Cocktail, Wedding, Reception, plus Custom. Fields: name, date, start, optional end, venue, address, city, optional cover, description / 3–4 lines, dress / what not to wear. One event may be primary wedding date; that event may store muhurat.  
**AC:** Dashboard clock uses primary date (or wedding date from FR-1.2). Next-function line uses the next upcoming event. Empty wedding still renders dashboard. Warn before deleting an event that already has household invitations. Reception after the pheras date is valid.

**FR-1.5 Family shell**  
Nav matches the page map. Hidden pages are hidden, not disabled. Couple / wedding identity is visible on family pages.  
**AC:** Manager has no Website & themes and no Members. Both roles have Preview as guest (stub until slice 5). Dashboard shows: days to go, next function, events count, tasks done/total, household count, RSVPs in, INR total (0 until slice 4), vendor count (0 until slice 6). Informational only — no analytics suite.

**FR-1.6 Venue map → Google Maps**  
Every event with a venue shows **that location on a map** below the address (or equally obvious). Tap map, pin, or **Open in Google Maps** → Google Maps at that place.  
**AC:** Haldi and reception can be different pins. No venue → no map, no broken embed. Get-there map, not vendor search. Same pin on the guest function page in slice 5.

### Slice 2 — Guests, invite, RSVP

**FR-2.1 Households**  
Name, side, max people, events invited, optional email, optional phone, notes.  
**AC:** Invite to a subset of events. Phone is optional (WhatsApp share still works by picking a chat). One household = one invitation; other family members do not need rows.

**FR-2.2 Personal invite link**  
Unguessable secret URL per household, identifying wedding, household, and invited events.  
**AC:** Opens a named invitation with no login (couple names, welcome, their events, RSVP). Invalid/expired/unknown token → a calm error, not another family’s invite. Public slug is not this link.

**FR-2.3 RSVP**  
Per invited event: yes/no; if yes, attending count 1…max, split into a headcount for each diet: veg, non-veg, Jain, no onion-garlic. Same link can change the answer later (replace, do not duplicate).  
**AC:** Uninvited events hidden. Cannot choose more people than max. Diet is a headcount per category, not a single “vegetarian” checkbox, and the four numbers must add up to the attending count. No account.

**FR-2.4 Attending counts**  
Guest surfaces show **how many**, not other families’ names.  
**AC:** Family Guests page shows household names.

**FR-2.5 Family Guests page**  
List households, RSVP, copy invite, sent status. Per function, show attending total and diet totals (the numbers a caterer asks for). Admin and Manager see the same list.

**FR-2.6 Share on WhatsApp**  
Per household, one tap opens WhatsApp with a prefilled wedding-card message that includes **that** unique invitation URL (not the public slug).  
**AC:** If phone exists, open that chat with text filled; else organiser picks a chat. `wa.me` / native share. **Not** Business API. Copy-link remains. Unique URL never another family’s.

Example tone (fields required; copy may follow the theme):

```text
You're invited to Ananya & Rohan's wedding.

You're invited through The Wedding Home — open this link to see your functions and RSVP:
https://…/i/<household-token>

With love,
The families
```

**FR-2.7 Email invitation (optional path)**  
If the household has email, organisers can send / resend an email: couple names, short message, wedding date, unique invite link. Record that email was sent.  
**AC:** No email → email send is unavailable; WhatsApp share still works. Resend is allowed. WhatsApp remains the primary Indian send path.

### Slice 3 — Reminders

**FR-3.1 Schedule**  
Clock is the **function date**.  
- Please RSVP → invited and still silent → 1 month, 1 week, 1 day before that function  
- See you soon → said yes → 1 day before (venue and time); 1 week optional  

**FR-3.2 Channels**  
Email when an address exists. Always offer copy-to-WhatsApp. Missing email does not block WhatsApp copy.

**FR-3.3 Send now**  
From the Guests reminder queue: send reminder to one silent household, or to all silent households for a function.  
**AC:** Scheduled reminders still run. Send-now is extra, not a replacement.

### Slice 4 — Tasks and expenses

**FR-4.1 Tasks**  
Title, optional description, to-do / doing / done, priority low/medium/high, assign to a member, optional event, optional due date.  
**AC:** Every organiser sees every task. Filters on the Tasks page: all, mine, completed; by status, event, assignee, priority. Dashboard shows incomplete tasks nearing due. No comments, attachments, subtasks, dependencies.

**FR-4.2 Expenses (spend log, not a budget)**  
Title, amount (INR, formatted), date, category, optional event, optional saved vendor, notes. Add / edit / delete / filter.  
**AC:** Same rupee total for everyone. Dashboard shows total. Optional category breakdown (e.g. venue vs catering). **No** budget, limit, variance, split, or instalment. Suggested categories: venue, catering, photography, videography, decoration, clothing, jewellery, entertainment, invitations, gifts, travel, makeup, miscellaneous.

**FR-4.3 Expense ↔ vendor**  
An expense may exist without a vendor. A vendor may exist without an expense. Both valid.

### Slice 5 — Theme studio, website, live, Indian texture

**FR-5.1 Wedding pack**  
Admin chooses traditional, classical, art, or choreography. Tokens: palette, type, motion, background, audio, video.  
**AC:** Pack applies until a function overrides. Family dashboard stays calm and unthemed. Changing pack changes presentation, not wedding data.

**FR-5.2 Per-function override**  
Colour, background, motion, music, looping video per event.  
**AC:** Sangeet-only guests never receive Haldi tokens. Obvious mute. Background video muted autoplay, loop, tap to hear. Family-uploaded or rights-cleared only.

**FR-5.3 Publish**  
Admin sets public slug, publishes.  
**AC:** Unpublished public home is not live. Preview works for Admin and Manager regardless. Manager cannot publish.

**FR-5.4 Public home**  
Hero (names, date, cover), welcome/story, timeline of functions (name, date, time, venue, dress, map link), meet the families, stay list (text), aashirwad, optional blessings-only / UPI note, helplines, Live when URL present, gallery teaser only if sharing is on.  
**AC:** Does not collect RSVP.

**FR-5.5 Function page (guest)**  
Venue, time, dress, how to reach, parking, 3–4 lines, theme, map below the address → Google Maps for **this** venue. Works on a phone.

**FR-5.6 Live**  
Admin can add, update, or remove a YouTube (or similar) URL. Guest Live tab **embeds that player on our site**.  
**AC:** Empty URL → no player. Live is not a theme background. We do not operate streaming infrastructure.

**FR-5.7 WhatsApp e-card**  
Download/copy a shareable card image from Guests. Not a substitute for the unique RSVP link.

**FR-5.8 Preview as guest**  
Public site and a test invite from the family app. RSVP, mute, live, gallery (once slice 7 exists) without signing out.

**FR-5.9 Helplines and stay**  
Two helplines (bride side / groom side) and suggested stay as **text**. Not hotel booking.

### Slice 6 — Vendors

**FR-6.1 Nearby search**  
Search near a function venue (photographer, caterer, décor, makeup, florist, DJ, venue, …). Show name, rating, address, distance, contact when the map/API provides them. **Add to My vendors**.  
**AC:** No book, no pay. Guest function map does not become this search UI.

**FR-6.2 My vendors**  
Saved list on the same Vendors page: name, category (photographer, videographer, venue, caterer, decorator, DJ, makeup, mehendi artist, pandit, choreographer, florist, planner, transport, other), contact person, phone, email, address, website, optional agreed cost INR, related events, notes.  
**AC:** All organisers see the same list. Discovery and the saved list are panels/filters, not extra nav items.

### Slice 7 — Shared gallery

**FR-7.1 Shared album**  
People with the gallery link see everyone’s non-hidden photos **and** videos. Not publicly searchable or indexed.  
**AC:** No account to view or upload. Organisers can upload too.

**FR-7.2 Upload and stable QR**  
Phone upload via link or QR. QR URL is **stable** so a printed card keeps working. View, download, print/share QR from Photos & videos.  
**AC:** Upload works on a phone browser. After the wedding the gallery still works unless organisers turn guest upload or the gallery off.

**FR-7.3 Hide or delete**  
Organiser can hide or delete a bad upload. Guests cannot delete. Light moderation only.

**FR-7.4 Group by function**  
Optional album by event, plus **Other / wedding memories**. Uploader (organiser or guest) may choose the event. Filter on the Photos page — not new nav.

**FR-7.5 Share and download**  
Organisers can copy the gallery link and download media. Guest-upload availability is a toggle on Photos (not a new Settings nav).

**FR-7.6 Upload safeguards**  
File type allow-list, size cap, reasonable count limits, secure upload URLs. Unsupported file or failed mid-upload → clear error, no corrupt item.

---

## 11. Theme studio (requirements, not art direction)

Stable token object (packs are named sets of the same shape):

- `palette` — bg, surface, text, muted, accent, accentText  
- `type` — display, body  
- `motion` — still | slow | playful | dance  
- `background` — color | pattern | image | video  
- `audio` — optional; always muted-autoplay with mute control  
- `video` — optional loop, muted autoplay, poster required  

Wedding-level tokens are the default. A function copies them, then overrides fields. New packs (Rajasthani miniature, South silk, phulkari, …) **must not** require a new data model.

Default colour worlds: Haldi turmeric/playful; Mehendi henna/slow; Sangeet jewel/dance; Wedding ivory-sindoor/slow; Reception midnight/still.

Guest-gallery video is **not** a theme token. Three generic “classic / minimal / modern” skins are not a substitute for this model.

Skill: `indian-wedding-themes`.

---

## 12. Indian domain fields (not extra menus)

| Field | Where | Notes |
|---|---|---|
| Muhurat | Primary wedding event + dashboard | A minute, not a day |
| Veg / non-veg / Jain / no onion-garlic | RSVP on personal invite, as a headcount per diet | Catering is politics, and families are mixed |
| Helpline bride side / groom side | Public site + invite footer | Lost at the farmhouse gate |
| How to reach, parking, what not to wear | Each function page | White sarees, heels in lawns, wrong gate |
| Venue map → Google Maps | Each event, below the address | Tap and go |
| Share on WhatsApp | Guests page, per household | Prefills unique URL |
| Suggested stay | Public site, one text block | Not a hotel product |
| Meet the families | Public home | Two houses |
| What this function is | Function page, 3–4 lines | NRI cousins, college friends |
| Aashirwad wall | Public site + invite | Blessings, not a joke guestbook |
| WhatsApp e-card image | Guests page | Elders forward a picture |
| Blessings-only / optional UPI note | Public site, optional | Not a shagun desk |
| INR formatting | Expenses, dashboard, vendor agreed cost | Indian grouping, ₹ |

---

## 13. Non-functional

| Area | Requirement |
|---|---|
| Guest device | Invite, RSVP, map → Google Maps, WhatsApp share, gallery browse/upload: phone browser first |
| Family app | Usable on laptop; must not be broken on a phone. Simple enough for parents |
| Wedding-first | Couple / wedding identity visible on logged-in pages |
| Locale | UI English in this version. Times in IST. Money in INR with ₹ formatting |
| Auth | Only organisers have passwords. Invite and gallery tokens are unguessable |
| Isolation | A member of wedding A must never read wedding B, even though each user has only one wedding |
| Privacy | No guest-name list on guest surfaces. Gallery link-private, not indexed |
| Media | Family-uploaded or rights-cleared. Compress. Theme loops aim ≤ 20s. Validate gallery uploads |
| Reliability | Each slice stays usable after the next ships. Gallery remains after the wedding unless turned off |
| Stack | Locked in [ARCHITECTURE.md](./ARCHITECTURE.md). README carries run commands when slice 1 is scaffolded |
| Scale posture | Demo-quality that can become real SaaS. Do not design as a 700-guest panic deadline |

---

## 14. Permissions matrix

| Action | Admin | Manager | Guest (link) |
|---|---|---|---|
| Events, guests, tasks, expenses, vendors, photos, wedding details | Yes | Yes | No |
| Preview as guest | Yes | Yes | — |
| Members: invite, remove, change role | Yes | No | No |
| Website, themes, slug, publish, Live URL | Yes | No | No |
| Open public home (if published) | — | — | Yes |
| Open personal invite, RSVP | — | — | Yes, own token |
| Share household invite on WhatsApp / send email invite | Yes | Yes | No |
| Open this event in Google Maps | Yes | Yes | Yes (own functions) |
| See attending **counts** | Yes (and names in family app) | Yes (and names in family app) | Counts only |
| Gallery view/upload | Yes | Yes | Yes, with link (if upload on) |
| Hide / delete / download gallery item | Yes | Yes | No |
| Gallery guest-upload toggle | Yes | Yes | No |

---

## 15. Edge cases

The product must behave calmly here. Not new pages.

**Members**

- Invite email already has an account with no wedding → they join after sign-in  
- Invite email already on another wedding → error  
- Admin removes a Manager  
- Multiple Admins  
- Attempt to remove or demote the last Admin → blocked  
- Member invite unused (they never signed up) → Admin can resend or revoke  

**Guests**

- Invalid invitation token  
- RSVP submitted twice → treat as an edit  
- Diet headcounts that do not add up to the attending count → rejected  
- Attending count above max → rejected  
- No email → WhatsApp / copy link still work  
- Guest with no phone → Share on WhatsApp still opens a chat picker  

**Events**

- Event after the primary wedding date (reception) → allowed  
- Event with no venue → allowed; no map  
- Delete event after households were invited → warn first  

**Money and vendors**

- Expense without vendor, vendor without expense → both allowed  

**Gallery**

- Unsupported file, oversize, failed mid-upload → error, no partial corrupt row  
- Guest scans QR after the wedding → gallery still opens unless disabled  

---

## 16. Success criteria

**Product-level (v1 complete):** A family can create a wedding, invite organisers, plan functions with maps that open Google Maps, manage tasks, keep a household guest list, send unique invites (WhatsApp primary, email optional), collect RSVPs with diet, remind on the function clock, log INR spend (not a budget), save and discover vendors without booking, publish a themed site with an embedded YouTube Live URL, and run a private photo/video gallery with a stable QR — while guests never create accounts.

**Slice 1 (next build):** Sign up, create wedding (bride, groom, date, city), add functions, see each on a map that opens Google Maps, see the dashboard countdown.

**Later product metrics (not in the UI):** activation (sign up → wedding → first event), setup completeness (event + task + guest), organisers per wedding, invites sent / RSVP rate, task completion, vendor saves / discovery searches, gallery uploads and QR scans.

---

## 17. UX principles

1. **Wedding first** — logged-in pages belong to this shaadi, not a generic SaaS shell.  
2. **Simple enough for parents** — guest, task, expense, RSVP must feel like a form, not Jira.  
3. **Mobile-first for guests** — RSVP, invite, maps, WhatsApp, gallery.  
4. **Minimal guest friction** — no account, no app install. Link → RSVP. QR → gallery.  
5. **Indian context** — many functions, households, WhatsApp, INR, veg/Jain/non-veg, muhurat.  
6. **Does this help a family plan, coordinate, celebrate, or preserve the wedding?** If it only adds complexity, defer it.

---

## 18. Decisions already locked

Do not reopen in implementation without an explicit product change:

- Name: **The Wedding Home**. Tagline: the operating system for Indian marriages  
- Many Admins and Managers; shared ledger  
- Guests never log in  
- Public home **and** personal RSVP links  
- Attendance on guest surfaces = counts, not names  
- Reminders 1 month / 1 week / 1 day before **that** function, plus send-now  
- Live = paste a URL, **embed on our site**  
- Each event venue is on a map; tap opens Google Maps  
- Share on WhatsApp = prefilled message + that household’s unique invite URL (`wa.me`, not Business API)  
- Email invite send is optional and secondary  
- Vendors = map search + saved contacts, no booking  
- Expenses = spend log with categories, **not** a budget  
- Gallery = shared photos and videos, optional albums by function, stable QR  
- Theme studio grows on one token model (not three generic skins)  
- RSVP diet is a headcount per category, summing to the attending count  
- Aashirwad wall is written by the family only; guests cannot submit  
- Meet the families is two entries (bride side, groom side)  
- One user, one wedding  
- Page map does not grow extra nav items  

No open product questions for v1. Implementation may choose stack, hosting, and library detail.
