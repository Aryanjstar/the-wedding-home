# The Wedding Home — system architecture

**Product:** The Wedding Home — the operating system for Indian marriages  
**Version:** 1.4  
**Status:** Locked for v1 scaffolding  
**Date:** 4 Oct 2026 (v1.4 matches the API and database gap pass; v1.3 was 30 Sep 2026)  
**Audience:** Anyone implementing a slice

This document is the system design. It does not add pages, roles, or features. Requirements stay in [PRD.md](./PRD.md). Vision stays in [PRODUCT.md](./PRODUCT.md).

| Artifact | Job |
|---|---|
| [PRODUCT.md](./PRODUCT.md) | Locked vision, page map, layers |
| [PRD.md](./PRD.md) | Requirements, objects, acceptance criteria |
| [DATABASE.md](./DATABASE.md) | Collections, fields, indexes, integrity |
| [API.md](./API.md) | The HTTP contract |
| This file | Processes, boundaries, vendors, and how a request moves |
| [PLAYBOOK.md](./PLAYBOOK.md) | How we got here; how to do the next idea |

Exact MongoDB schemas and REST contracts are in [DATABASE.md](./DATABASE.md) and [API.md](./API.md). Frontend component trees are a later document. The rules below are already decided, so those documents follow them.

---

## 1. Purpose

Define how The Wedding Home runs:

- One deployable application and its boundaries
- Who authenticates, and who only holds a secret link
- How a wedding isolates its data
- Where files, email, maps, and the public site sit
- How reminders and bulk email run without a second server
- What happens when Mongo, S3, Resend, Places, or YouTube fails

---

## 2. Goals

1. Simple enough to ship slice by slice.
2. Clear domain modules, with business rules out of route files.
3. Production-ready without a platform team.
4. A member of wedding A cannot read wedding B.
5. A guest finishes RSVP, maps, WhatsApp, and the gallery in a phone browser, with no account.
6. The same design still holds at roughly **1,000 households on one wedding**, **5,000 gallery items on one wedding**, and **thousands of weddings** over time.

That scale is the ceiling this design must survive. It is not a reason to add queues, Redis, or microservices now.

---

## 3. Principles

**One deployable.** Next.js on Vercel is the UI, the API, and the cron. A module leaves this process only when its load or failure mode actually hurts the rest of the app. Media processing and the email sender are the first candidates. They stay inside for v1.

**The wedding is the tenant.** Events, households, RSVPs, tasks, expenses, vendors, gallery items, reminders, and memberships belong to one wedding. The backend puts `weddingId` on the query. The screen does not.

**Guests never become users.** Invitation and gallery access are unguessable links.

**Managed services.** Vercel, Atlas, S3, Resend, Google Places, YouTube. We do not run servers, clusters, or a stream.

**Third-party SDKs stay behind one adapter each.** Domain code calls `EmailService`, `StorageService`, and `VendorDiscoveryService`.

**Same data for every organiser.** Admin and Manager differ by permission, not by a private copy of the wedding.

---

## 4. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Application | Next.js App Router on Node.js |
| HTTP API | Route Handlers, REST |
| Shape | Modular monolith |
| Database | MongoDB Atlas, Mumbai (`ap-south-1`) |
| Data access | Mongoose |
| Input validation | Zod at the HTTP boundary |
| Auth | Custom email and password. No Clerk, Auth0, or similar |
| Session | Random id in an httpOnly cookie. Server stores the hash |
| Passwords | bcrypt, cost 12, via a pure-JS library. No hand-rolled crypto. Argon2id is deferred (DATABASE §5.1) |
| Files | Private Amazon S3 bucket in `ap-south-1` |
| Email | Resend, behind `EmailService` |
| Bulk email | MongoDB job rows, small batches, Vercel Cron |
| Maps | Venue pin and place search in the browser with a referrer-restricted Maps key. Open in Google Maps is a plain link. Places API from the server, with a separate key, for vendor search |
| Live | YouTube or Vimeo URL embedded on our site |
| WhatsApp | `wa.me` with a prefilled message. Not the Business API |
| Host | Vercel |
| Logs | Application logs and Vercel logs |
| Realtime | None in v1 |
| Product analytics | None in v1 |

S3 stays instead of Cloudflare R2 so gallery objects sit in Mumbai with Atlas and with the families. `StorageService` is the only S3 caller, so a later move to an S3-compatible store does not rewrite domain modules. The weak part of the earlier media design was the upload protocol, not the region. Section 12 replaces that protocol.

---

## 5. Context

```text
Organiser browser                         Guest phone
session cookie                            secret link, no account
        │                                        │
        └──────────────── HTTPS ─────────────────┘
                              │
                              ▼
                 ┌────────────────────────────┐
                 │ Next.js on Vercel          │
                 │ React UI                   │
                 │ REST route handlers        │
                 │ Domain services            │
                 │ Mongoose                   │
                 └─────────────┬──────────────┘
                               │
         ┌─────────────────────┼──────────────────────┐
         ▼                     ▼                      ▼
  MongoDB Atlas          S3 (private)             Resend
  Mumbai                 Mumbai                   email

  Google Places  ← server only, vendor search (server key)
  Google Maps    ← venue pin in the page (browser key, referrer-restricted); Open in Google Maps is a normal link
  WhatsApp       ← guest's or organiser's phone, via wa.me
  YouTube        ← player embedded on our page
```

---

## 6. Three surfaces

### Private family app — `/app/*`

Session required. Page map from the PRD: Dashboard, Events, Guests, Tasks, Expenses, Vendors, Website and themes (Admin), Preview as guest, Photos and videos, Wedding details, Members (Admin), Account.

Hidden pages are absent, not disabled. The server rejects them for a Manager even if the URL is typed.

Preview renders the guest components with the organiser's session. A preview RSVP is not saved as a real household response.

### Public wedding site — `/w/{slug}`

No session. Served only when the wedding is published. Story, timeline, venues, dress, map link, families, stay, aashirwad, helplines, live when a URL is set. It does not collect RSVP.

A gallery teaser may show when sharing is on. The HTML of this indexable page does not contain the gallery token.

### Secret links

| Path | Holder | What it opens |
|---|---|---|
| `/i/{token}` | One household | Their functions, RSVP, attending counts |
| `/g/{token}` | Anyone with the gallery link | Shared photos and videos. Stable URL for print and QR |

`/w/` keeps the public slug away from `/app`, `/i`, `/g`, and `/api`, so we do not depend on a blocklist of slugs.

---

## 7. Modules and the request path

```text
auth
wedding
members
events
households        invitation, RSVP, WhatsApp link
reminders
tasks
expenses
vendors           saved records; Places stays inside this module
website           tokens, slug, publish, Live URL
gallery
```

Adapters, not domains: `EmailService`, `StorageService`, `VendorDiscoveryService`, Mongo connection, rate limit.

A route handler does five things:

1. Parse the request.
2. Authenticate when the route is private.
3. Validate with Zod.
4. Call a service.
5. Map the result to an HTTP response.

Services own rules: last Admin, attending count ≤ max, RSVP replace, same-wedding references, publish. Repositories talk to Mongoose. Pages and route files do not.

Server Components may call services directly for a read. They do not reimplement rules, and they do not HTTP-call our own API.

```text
Households

Route handler
    ↓
Zod
    ↓
HouseholdService
    ↓
Household repository
    ↓
MongoDB
```

Slices add modules when the slice starts. We do not scaffold empty ones ahead of time.

---

## 8. Authentication

Email and password. No email verification in v1. Signup creates the user and the session, then the product asks them to create a wedding or accept an invite. Signup does not silently create a wedding.

```text
POST /api/auth/signup
  validate → reject duplicate email → hash password
  → create user → create session → set cookie

POST /api/auth/login
  generic failure on a bad email or password
  → create session → set cookie

POST /api/auth/logout
  delete session row → clear cookie
```

The cookie stores a random session id, not a role and not a wedding id. Mongo stores the SHA-256 hash of that id, the user id, and `expiresAt`. `SESSION_SECRET` is not part of the hash. Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`. A session lasts 30 days from the last daily renewal, and never more than 90 days from `createdAt`. A session created before `passwordChangedAt` is dead. Logout and password reset delete that user's sessions. The exact cookie name and the renewal write are in API §3 and DATABASE §5.2.

Password reset always returns the same generic message. The email contains a single-use token. Mongo stores a hash and an expiry. The link sets a new password and burns the token.

Account pages change name, email, and password. They do not change wedding data.

---

## 9. Membership

```text
User → Membership → weddingId + role (admin | manager)
```

A user has at most one active membership. Creating a wedding and creating its first Admin membership is one Mongo transaction. If the membership insert fails, the wedding does not stay behind without an Admin.

Admin invites by email. The invite row holds `weddingId`, email, role, token hash, status, and expiry. Resend delivers it.

```text
No account yet:  open link → signup → accept → membership
Has an account:  open link → login → accept → membership
Already on this wedding:     error
Already on another wedding:  error
```

Accepting an invite creates the membership and marks the invite accepted in one transaction. No email verification on that path.

The service refuses: a Manager inviting, changing roles, or removing anyone; removing or demoting the last Admin; a second active membership for one user.

---

## 10. Tenancy and authorization

Every private request:

```text
cookie → session → user → membership → weddingId → permission → query
```

`weddingId` on the JSON body is not proof. The membership is the proof.

Loading `event` where `_id = id` is not enough. The query is `_id = id` and `weddingId = currentWeddingId`. The same pattern covers households, tasks, expenses, vendors, gallery items, and memberships.

Assigned members and linked events must belong to that same wedding. An expense may omit vendor and event. A task may omit event. Those links, when present, are checked.

Admin may manage members and the public site (themes, slug, publish, Live URL). Manager may run the rest of the family app, including Preview. Guests have no role.

---

## 11. Households and RSVP

A household is wedding data, not a user. It has no password and no session. One household is one invitation, even when several people attend.

```text
/i/{token}
  → resolve token
  → load that household and its invited events
  → show counts, not other families' names
  → submit per event: yes/no, attending count, diet
  → later submit replaces the previous RSVP
```

Diet is a headcount in each of veg, non-veg, Jain, and no onion-garlic, and the four numbers add up to the attending count. The count cannot exceed the household max. Uninvited events are not in the payload the server will accept.

The invite token is a stable, high-entropy random value stored on the household so organisers can copy the same URL again for WhatsApp, email, and the e-card. It is excluded from logs, from guest-facing JSON, and from any response except the organiser action that copies or sends that household's link. Session ids, password-reset tokens, and member-invite tokens stay hashed. Those can be rotated. The household link cannot, or printed and forwarded messages break.

Invalid tokens get a calm error and never another household's page. `/i/*` is `noindex`, `no-referrer`, and not cached.

Share on WhatsApp builds `wa.me` on the server (or as a link the organiser's phone opens). If a phone number exists, the chat is that number. If not, WhatsApp opens a chooser. We do not send the WhatsApp message ourselves.

---

## 12. Gallery and S3

Mongo holds metadata. S3 holds bytes. The gallery token is one per wedding, stable, and stored so Photos can show the link and the QR again. Same logging rules as the household token. The QR image is generated when an organiser asks for it. It is not stored. The QR text is `https://{host}/g/{token}`.

Guests with the link see non-hidden photos and videos. They upload only when the wedding flag is on. They cannot hide or delete. Organisers can upload, hide, delete, and download. Hide keeps the object and drops it from guest views. Delete removes the S3 object first and the metadata row only after the object is gone. If storage refuses the delete, the row stays and the API returns a retryable error (API §7.12). Download returns a short-lived signed URL in JSON. The app does not proxy the bytes and does not redirect.

There is no approval queue. Upload becomes visible after the metadata row is published. Organisers remove a bad item afterwards.

### Direct upload

Bytes do not pass through Vercel.

```text
Client
  → POST upload permission (session or gallery token, mime, size)
  → service checks access, allow-list, size, guest-upload flag
  → StorageService returns a short-lived PUT to a staging key
  → browser PUTs straight to S3
  → client calls complete with the ETag
  → server checks length, Content-Type, and the first bytes of the file
  → server copies that ETag to a final key
  → Mongo inserts the row
```

The signature check is the file itself, not the browser's claim. JPEG, PNG, WebP, MP4, and QuickTime only, plus MP3 for theme music. HEIC must be converted to JPEG in the browser before this flow. A mismatch, or an ETag that moved between PUT and complete, does not publish a row.

Starting caps: photos 15 MB, gallery video 100 MB, theme loop 20 MB, theme audio 10 MB. The exact list by purpose is API §9. Theme loops still aim for 20 seconds or less.

Staging keys expire by a lifecycle rule. A copy that succeeds and a metadata insert that fails can leave an orphan object. Cleanup of orphans is follow-up work, not part of the request. No metadata row means the item is not in the gallery.

Browsing uses cursor pagination. v1 may serve the original file through a short-lived signed GET. Derivatives and a CDN wait until real galleries show they need them. Signed gallery URLs do not go through Next's public image optimizer.

Cover images, theme media, and e-card downloads use the same staging protocol and the same private bucket, under different key prefixes:

```text
weddings/{weddingId}/staging/{uploadId}
weddings/{weddingId}/cover/{id}
weddings/{weddingId}/themes/{eventId}/{id}
weddings/{weddingId}/gallery/{itemId}
weddings/{weddingId}/ecards/{id}
```

The bucket blocks public access except the prefix `weddings/{weddingId}/public/`, which is public-read and holds published cover, family, and theme objects only (DATABASE §5.15). Gallery, staging, and unpublished media stay private. IAM on Vercel can put, get, head, delete, and copy inside this bucket only. CORS allows `GET`, `PUT`, and `HEAD` from the production origin and localhost, and allows the `Content-Type` header. Dev and production use different buckets and different credentials.

---

## 13. Public site, slug, themes, live

Admin sets the public slug. A helper may suggest `bride-groom-ddmmyyyy`, and may append `-2` when that string is taken. After publish, editing the couple's names or the date does not change the slug. A shared `/w/...` link stays valid until an Admin deliberately changes it.

The renderer loads one wedding and applies theme tokens: palette, type, motion, background, audio, video. A function may override those tokens. Packs are named sets of the same object (traditional, classical, art, choreography, and later regional packs). The family app is not themed. Three generic skins are not this model.

Live is a URL on the wedding. We allow YouTube and Vimeo hosts, store the URL, and embed the player. An empty or unplayable URL hides the player. The rest of the site still renders. We do not host the stream.

---

## 14. Events, tasks, expenses, vendors

Events belong to the wedding. Each event with a venue stores structured place data: formatted address, city, latitude, longitude, Google place id. The page shows that pin with the Maps Embed or JavaScript API, and the organiser picks the venue with place autocomplete. Both run in the browser, so they use a separate Maps key restricted to our production and preview origins and to those two APIs. That key is public by design and is not the Places key below. Open in Google Maps is a normal link to those coordinates and needs no key. No venue means no map. Haldi and reception are different pins. This map is not vendor search.

Tasks, expenses, saved vendors, and gallery items may point at an event. The service checks the event is in the same wedding.

Expenses are an INR spend log: integer rupees, optional category breakdown, no budget. A vendor and an expense can each exist without the other.

Vendor discovery calls Places from `VendorDiscoveryService`, using the selected function's coordinates. The browser never sees the server Places key. Add to My vendors copies name, address, and contact into our vendor row. After that, the saved vendor does not depend on Google still returning the place.

---

## 15. Email, reminders, WhatsApp

`EmailService` is the only path to Resend. Templates, errors, and a future provider change live there.

Sent immediately, one message, inside the user request:

- Password reset
- One member invitation
- One household invitation email
- One send-now reminder

WhatsApp is not in this list. It is a `wa.me` link.

Bulk work does not call Resend in the request that the organiser is waiting on. "Email every silent household" creates job rows and returns.

```text
PENDING → claimed → PROCESSING → SENT
                              ├→ FAILED after 3 attempts
                              └→ SKIPPED when no longer needed
```

A job stores attempts, last attempt time, error, and sent time. Claim is an atomic update from `PENDING` to `PROCESSING`, so two overlapping crons cannot send the same row. Batch size starts at 25 and stays configurable. Retries stop at 3.

Scheduled reminders use the function's start time, evaluated in `Asia/Kolkata`: please-RSVP at 1 month, 1 week, and 1 day for households still silent; see-you-soon at 1 day for households who said yes. An hourly cron inserts those jobs with a unique key `(household, event, kind, slot)`. Inserting twice is a no-op. A second cron drains the queue. Vercel's Hobby plan limits cron to once a day (check the current limits), so the hourly planner and the drain need the Pro plan, or an external scheduler calling the same two routes with the same secret. Send-now is an extra send, not a substitute for the schedule. Copy-to-WhatsApp stays a link on the Guests page.

The drain route is `/api/internal/jobs/email`. The planner route is `/api/internal/jobs/reminders`. Both require `Authorization: Bearer $CRON_SECRET`.

---

## 16. Data rules

Do not embed thousands of households, RSVPs, or gallery items inside one wedding document.

Working collections. The names and fields are final in [DATABASE.md](./DATABASE.md):

```text
users
sessions
password_resets
weddings
memberships
member_invitations
events
households
rsvps
tasks
expenses
vendors
gallery_items
email_jobs
upload_intents
rate_limits
```

Every wedding-scoped document carries `weddingId`. Instants are UTC. Screens use `Asia/Kolkata`. Money is an integer number of rupees.

Indexes the database design must cover: unique user email, unique wedding slug, unique active membership per user, household token, gallery token, session hash, reset hash, RSVP unique on `(household, event)`, email-job claim by status, and `weddingId` plus the fields we filter (event date, task due, RSVP status).

Dev and production are separate databases. Production data is never the local connection string. Use a cluster tier that has backups before a real family's phone numbers are stored.

The Mongo client is cached on `globalThis` and reused. A request must not open and close its own connection.

Transactions are for the few writes that must succeed together: create wedding plus first Admin, and accept invite plus membership. Ordinary updates are single-document.

v1 hard-deletes tasks and expenses. Gallery delete removes the object, then the row, and keeps the row if the object delete fails. Removing a member deletes the membership and leaves the user account. Deleting a whole wedding is not a v1 feature; the operator procedure is DATABASE §9. Transactions also cover the last-Admin update and the cascading deletes in DATABASE §7.

---

## 17. API, validation, errors, logs

```text
/api/auth/*
/api/me
/api/dashboard
/api/wedding/*
/api/members/*
/api/events/*
/api/households/*
/api/tasks/*
/api/expenses/*
/api/vendors/*
/api/website/*
/api/gallery/*
/api/reminders/*
/api/uploads/*
/api/preview/*
/api/public/site/{slug}
/api/public/member-invite/{token}
/api/public/invite/{token}/*
/api/public/gallery/{token}/*
/api/internal/jobs/*
```

Zod validates external input. Mongoose schemas protect what gets stored. Those are different checks.

Errors map to a stable code, without a stack trace in the JSON:

```text
VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

Unknown ids and other weddings' ids both surface as not found, so a caller cannot learn that an id exists elsewhere.

Logs may include `requestId`, `userId`, `weddingId`, operation, and the error code. They must not include passwords, session ids, reset tokens, invite tokens, gallery tokens, or raw `Authorization` headers. Request paths that contain a token are not logged in full.

Large lists are paginated. Gallery uses a cursor. Households, tasks, expenses, and vendors use `page` and `limit`. The UI does not request an unbounded collection.

---

## 18. Security

| Topic | Rule |
|---|---|
| Session | Cookie id only. Role and wedding come from the database |
| CSRF | `SameSite=Lax` on the session cookie, plus an `Origin` header check on every cookie-authenticated write (API §3) |
| Isolation | Backend query, not a filtered response |
| Guest links | 256-bit random. Stable and retrievable by organisers. Never logged |
| Uploads | Short-lived PUT to one staging key. Signature and size checked before publish |
| Rate limits | Mongo counters. Keys are HMAC'd so the counter collection does not store raw tokens |
| Secrets | Server env only. Server Places key, S3 keys, Resend, Mongo URI, session secret, and cron secret never ship to the browser |
| Public vs private | Public site shows only published fields. Invite shows one household. Gallery shows non-hidden items |

Rate-limit order on RSVP and upload permission:

1. Per-IP limit runs first, including for bad tokens, so guessing costs the caller.
2. Resolve the token. A bad token returns the calm error and does not consume the per-link budget.
3. Per-link limit, then the shared application limit, and only after the token is valid. The numbers are in API §6. A rejected or unknown token does not consume the shared limit.

Login, signup, and forgot-password are per IP. Limits are configurable. Starting points: auth 20 per IP per 15 minutes, RSVP 20 per invite per 15 minutes, upload permission 30 per gallery token per 15 minutes.

---

## 19. Performance and freshness

v1 uses indexes, pagination, connection reuse, direct-to-S3 uploads, and small email batches. No Redis. Next.js may cache public theme assets when the slug is published. It does not cache `/i` or `/g`.

There are no WebSockets and no live cursors. Another organiser sees a change on navigation or refresh. The PRD already excludes collaborative presence.

---

## 20. Deployment

```text
Internet → Vercel (Next.js) → Atlas, S3, Resend
                            → Places, from the server
```

No Kubernetes, ECS, Docker-as-production, or a separate Node process.

| Env | App | Database | Bucket |
|---|---|---|---|
| Local | `next dev` | `wedding-home-dev` | dev bucket |
| Preview | Vercel preview | `wedding-home-dev` | dev bucket, its own key |
| Production | Vercel production | `wedding-home` | prod bucket |

```text
MONGODB_URI
SESSION_SECRET
CRON_SECRET
S3_BUCKET
S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
RESEND_API_KEY
EMAIL_FROM
NEXT_PUBLIC_APP_URL
GOOGLE_PLACES_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
RATE_LIMIT_HMAC_SECRET
```

Vercel egress IPs are not stable, so Atlas is locked to the database user and TLS, not to one application IP. A private network path can wait until we leave serverless.

---

## 21. Scaling path

**Now.** The stack in section 4. Nothing else.

**When a real gallery hurts.** Indexes and query shape first, then signed-URL lifetime, then image derivatives, then a CDN in front of S3. Email batch size and rate limits move by configuration.

**Only after that is proven insufficient.** A dedicated worker, Redis, or a separate media process. Not a microservice per domain.

---

## 22. Failure

| Dependency | Behaviour |
|---|---|
| Atlas down | Requests fail clearly. No partial wedding without its Admin, because that pair is one transaction |
| Resend down, one email | The request returns an error and the organiser can retry |
| Resend down, a job | Attempt increments. After 3 failures the job is `FAILED`. The wedding stays usable |
| S3 PUT fails | No metadata row. The client shows a failed upload and can retry |
| Places down | Vendor search shows that discovery is unavailable. Saved vendors, guests, and events still work |
| Bad Live URL | Player hidden. The public page still renders |

---

## 23. Tests this design expects

Services unit-tested without HTTP. API tests against a database for the flows that cross documents. At least:

- Wedding A cannot read or write wedding B's event, task, household, or expense.
- A Manager cannot invite, remove, or change a role.
- The last Admin cannot be removed or demoted.
- A second wedding for one user is rejected.
- A household token never returns a different household.
- RSVP over max is rejected. A second RSVP replaces the first.
- A bad gallery token cannot get an upload URL.
- An expired reset token cannot set a password.
- Two job runners cannot both mark the same email sent.

One end-to-end path, once slice 2 exists: signup → create wedding → add a function → add a household → open `/i/{token}` → RSVP.

---

## 24. Decisions

| | Decision | Why |
|---|---|---|
| 1 | Modular monolith | One wedding's data is read together. A small team ships slices in order |
| 2 | Next.js for UI and API | Avoids a second Node service and keeps one deploy |
| 3 | REST handlers plus services | Rules stay testable when the screen changes. Replaces ad-hoc Server Actions as the write path |
| 4 | Atlas and Mongoose | Document data, managed cluster in Mumbai, schema checks beside Zod |
| 5 | Custom sessions | Membership rules are ours. The cookie carries an id, not a privilege |
| 6 | No email verification in v1 | Less friction. Reset still uses email |
| 7 | Wedding is the tenant | Even though one user has one wedding |
| 8 | S3 in Mumbai, direct upload with a checked staging copy | Bytes skip Vercel. Objects stay in-region. Signature and ETag run before the row exists |
| 9 | Stable retrievable guest and gallery tokens | Organisers must copy the same link again. Other secrets stay hashed |
| 10 | Resend, plus Mongo jobs for bulk | One email stays in the request. Hundreds do not. No Redis and no worker fleet |
| 11 | Scheduled reminders stay | 1 month / 1 week / 1 day before that function, plus send-now. Jobs are how they send, not a reason to drop the clock |
| 12 | Places for discovery only | Saved vendors are our rows. No booking |
| 13 | Vercel | Matches Next.js. Cron is an HTTP call with a secret |

### Aligned on 4 Oct 2026

The API and database gap pass locked bcrypt, the upload-complete race, gallery delete order, opaque cursors, RSVP `MAX_CHANGED`, the public media prefix, reminder timing, and which slice creates which module. Those sentences live in API.md and DATABASE.md. This file now matches them. Product decisions in the PRD did not move.

### Taken from the 30 Sep 2026 architecture review

Service layer under thin route handlers. Mongoose plus Zod. Email job states, atomic claim, batch size, and retries. Member-invite acceptance as its own flow. Slug frozen when names or dates change. Transactions for wedding creation and invite acceptance. Object-level `weddingId` checks. Error codes. Pagination. Per-dependency failure behaviour. Scaling stages. Security tests. Staging upload, magic-byte check, ETag, then copy to a final key. QR generated on demand. On-demand image derivatives explicitly deferred.

### Left as The Wedding Home

Households, not one row per person. Diet on RSVP. Attending counts on guest surfaces. WhatsApp via `wa.me` as the primary send. Google Maps on each function. Theme tokens and per-function overrides, not a set of generic skins. Gallery videos, hide, and a private token rather than a public gallery on `/w`. Preview as guest. The page map. S3 in Mumbai rather than R2. Many Admins and Managers on one shared ledger.

---

## 25. Out of v1

Microservices, a separate Express or Nest process, GraphQL, Kafka, RabbitMQ, Redis, BullMQ, WebSockets, Kubernetes, a transcoding pipeline, an approval queue for photos, Sentry or Datadog, product analytics, WhatsApp Business API, SMS, push, custom domains, and one database per wedding.

---

## 26. Later design documents

1. Database — done: [DATABASE.md](./DATABASE.md).
2. API — done: [API.md](./API.md).
3. Module layout — folders, repositories, shared helpers.
4. Frontend — layouts, server and client components, forms.
5. Security — CSRF details, rate-limit numbers under load, upload edge cases.
6. Deploy — Atlas, S3, Resend domain, cron, and the first production URL.

Slice 1 can start from this document and the two above. The remaining documents get sharper as that slice is built. They do not reopen the decisions in section 24.
