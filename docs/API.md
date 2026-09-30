# The Wedding Home — API design

**Product:** The Wedding Home — the operating system for Indian marriages  
**Version:** 1.0 (draft for review)  
**Date:** 30 Sep 2026  
**Audience:** Anyone writing a route handler, a Zod schema, or a client call

This is the HTTP contract of the single Next.js app described in [ARCHITECTURE.md](./ARCHITECTURE.md), over the collections in [DATABASE.md](./DATABASE.md). It adds no pages, roles, or features. Requirements stay in [PRD.md](./PRD.md).

Every route handler does the five steps of architecture §7: parse, authenticate, validate with Zod, call a service, map the result. This document says what goes in and comes out at step one and step five, and which errors step four may raise.

---

## 1. Principles

1. **First-party API.** The only client is our own UI, so there is no `/v1` prefix and no public developer contract. The exceptions are the guest paths `/i/…`, `/g/…`, `/w/…` and the payloads behind them, which live on printed cards and forwarded WhatsApp messages and must not break (§13).
2. **Resources, not RPC.** Nouns, standard verbs, standard status codes. A few action endpoints exist where a verb is honest (`publish`, `send-now`, `complete`).
3. **The server decides who you are and what wedding you mean.** Never from the body. A `weddingId`, `role`, or `userId` in a request body is ignored.
4. **A guest is a token in the path,** not a session. Guest routes never read the cookie.
5. **Small, boring responses.** JSON objects, no envelope for single resources, `items` for lists.
6. **Errors carry a stable code and a specific reason,** so the UI never parses English.

---

## 2. Conventions

| Topic | Rule |
|---|---|
| Base path | `/api`. JSON in, JSON out. `Content-Type: application/json; charset=utf-8` on every body |
| Names | `camelCase` fields, `kebab-case` path segments, plural nouns |
| Ids | Strings (the `ObjectId` hex). Response objects call theirs `id`. Foreign keys are `xxxId` |
| Instants | ISO 8601 UTC with `Z`: `2027-02-14T13:30:00.000Z` |
| Civil dates | `YYYY-MM-DD` (`weddingDate`, `dueOn`, `spentOn`), meaning that day in India |
| Money | Integer rupees: `amountInr`, `agreedCostInr`, `totalInr`. Formatting with `₹` and lakh grouping is the client's job |
| Phones | Sent and returned as E.164. The server normalises `98765 43210` to `+919876543210` when the country is unambiguous, otherwise rejects with `INVALID_PHONE` |
| Places | `{ name?, address, city, lat, lng, googlePlaceId? }`. Responses add `mapsUrl` (see §7.5). GeoJSON never leaves the server |
| Media | Requests reference an upload by `uploadId` (§9). Responses give `{ url, contentType, expiresAt }` with a short-lived signed URL. Storage keys are never returned |
| Booleans, enums | As in DATABASE §2 and §5. `silent` is a derived RSVP status that responses may carry and requests may not |
| `null` | In a `PATCH`, `null` clears an optional field. A field left out is left alone |
| Unknown fields | Rejected with `VALIDATION_ERROR`. Zod objects are `.strict()`. This blocks mass assignment (`{"role":"admin"}` on a profile update) |
| Trailing slash, methods | No trailing slash. `405` with `Allow` for a wrong method |
| Status codes | `200` read or update, `201` create (with `Location`), `202` accepted for background work, `204` no body, `302` only for downloads |

### Verbs

| Verb | Meaning |
|---|---|
| `GET` | Read. Never changes state, with one exception: cron routes in §10, which Vercel can only call with `GET` |
| `POST` | Create, or an action |
| `PATCH` | Partial update of a resource: only listed fields change |
| `PUT` | Replace a value the client owns entirely (an RSVP answer, a slug, an event's theme) |
| `DELETE` | Remove. `204` |

### Idempotency

Retries are safe where the operation is naturally idempotent: `PUT` for RSVPs, slugs and themes; `complete` for uploads (a second call returns the same item); `DELETE`, which fails `404` the second time and is never a problem. There is **no** `Idempotency-Key` header in v1. Nothing here moves money, and a double-clicked "Add guest" is visible and deletable. Buttons disable while a request is in flight. If a create-once operation ever needs it (a paid plan, say), the header goes on `POST`.

### Concurrency

Last write wins. `PATCH` changes only the named fields, so two organisers editing different fields of one record do not overwrite each other. Every resource returns `updatedAt`. Architecture §19 already excludes real-time collaboration.

---

## 3. Authentication, CSRF, headers

### Three kinds of caller

| Caller | Proof | Routes |
|---|---|---|
| Organiser | Session cookie | `/api/*` except the ones below |
| Guest | Secret token in the path | `/api/public/invite/{token}/…`, `/api/public/gallery/{token}/…` |
| Nobody | — | `/api/auth/*` (some), `/api/public/site/{slug}`, `/api/public/member-invite/{token}` |
| Cron | `Authorization: Bearer $CRON_SECRET` | `/api/internal/jobs/*` |

### Session

Cookie `__Host-twh_session` in production (`twh_session` on `http://localhost`): `HttpOnly; Secure; SameSite=Lax; Path=/`, no `Domain`, so it can never be sent to a sibling subdomain. The value is 32 random bytes, base64url. The database keeps its SHA-256 hash (DATABASE §5.2).

For a private route the server resolves, in order: cookie, session, user, membership, `weddingId`, role, permission, query. A valid session with no membership gets `403` reason `NO_WEDDING` on wedding-scoped routes, which is how the UI knows to show "Create your wedding".

### CSRF

`SameSite=Lax` is the first layer. The second: every cookie-authenticated `POST`, `PUT`, `PATCH`, `DELETE` must carry an `Origin` header equal to `NEXT_PUBLIC_APP_URL` (or a Vercel preview origin in preview). Anything else gets `403` reason `BAD_ORIGIN`. A `GET` never changes state, so a cross-site `GET` cannot do harm. No CORS headers are sent at all: only same-origin pages call this API.

### Headers on every response

| Header | Value |
|---|---|
| `X-Request-Id` | The request id, also in every error body and in logs |
| `X-Content-Type-Options` | `nosniff` |
| `Strict-Transport-Security` | Set by Vercel and by the app |
| `Cache-Control` | Private routes: `no-store`. Token routes: `no-store`. Public site: `public, s-maxage=60, stale-while-revalidate=300` |
| `Referrer-Policy` | `no-referrer` on token routes and the pages behind them |
| `X-Robots-Tag` | `noindex, nofollow` on token routes |

### Passwords

Length 10 to 128, any characters, no composition rules, and a check against a list of very common passwords. Passwords are never logged and never returned.

---

## 4. Errors

Errors use the shape of [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) with `Content-Type: application/problem+json`, plus our stable members `code`, `reason`, and `requestId`.

```json
{
  "type": "/problems/conflict",
  "title": "Conflict",
  "status": 409,
  "code": "CONFLICT",
  "reason": "LAST_ADMIN",
  "detail": "A wedding must keep at least one Admin. Make someone else an Admin first.",
  "requestId": "req_8f3a1c"
}
```

Validation failures add `errors`:

```json
{
  "type": "/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "requestId": "req_8f3a1c",
  "errors": [
    { "path": "responses[0].diet", "reason": "DIET_MISMATCH", "message": "The diet numbers must add up to 3." }
  ]
}
```

- `code` is one of the seven from architecture §17 and is what clients branch on first.
- `reason` is specific and stable. The UI maps it to its own words. `detail` and `message` are safe English for logs and fallbacks.
- No stack traces, no SQL-like internals, no other tenant's data. Unknown ids and ids from another wedding are both `NOT_FOUND`.
- `type` is a relative URI. It need not resolve yet.

| `code` | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Malformed JSON, unknown field, bad type or range |
| `UNAUTHENTICATED` | 401 | No or expired session. Wrong login uses this with the generic reason `INVALID_CREDENTIALS` |
| `FORBIDDEN` | 403 | Signed in, not allowed |
| `NOT_FOUND` | 404 | Unknown, deleted, or another wedding's. Also a bad guest token |
| `CONFLICT` | 409 | The request is fine, the current state refuses it |
| `RATE_LIMITED` | 429 | With `Retry-After` seconds |
| `INTERNAL_ERROR` | 500 | Anything unexpected. Also `503` reason `DEPENDENCY_UNAVAILABLE` for Places or Resend outages |

### Reasons

| Reason | Code | Where |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Login |
| `INVALID_TOKEN` | 400 | Reset password with an unknown, used, or expired token. One shared message |
| `SESSION_EXPIRED` | 401 | Any private route |
| `NO_WEDDING` | 403 | Private routes for a user with no membership |
| `NOT_ADMIN` | 403 | Admin-only routes reached by a Manager |
| `BAD_ORIGIN` | 403 | CSRF check |
| `INVITE_EMAIL_MISMATCH` | 403 | Accepting a member invitation as a different email |
| `EMAIL_TAKEN` | 409 | Signup, email change |
| `ALREADY_HAS_WEDDING` | 409 | Creating a second wedding |
| `ALREADY_MEMBER` | 409 | Inviting someone already on this wedding |
| `MEMBER_OF_OTHER_WEDDING` | 409 | Inviting or accepting for a user on another wedding |
| `INVITATION_PENDING` | 409 | A live invitation already exists for that email |
| `INVITATION_EXPIRED`, `INVITATION_REVOKED`, `INVITATION_USED` | 409 | Opening or accepting a bad member invitation |
| `LAST_ADMIN` | 409 | Removing or demoting the last Admin, or the last Admin leaving |
| `SLUG_TAKEN` | 409 | Setting a slug |
| `PUBLISH_REQUIREMENTS` | 409 | Publishing without a slug or without any function. `details` names what is missing |
| `CONFIRMATION_REQUIRED` | 409 | A destructive change needs `?confirm=true`. `details` says what will go |
| `MAX_BELOW_ATTENDING` | 409 | Lowering a household's `maxPeople` under an existing answer |
| `NO_EMAIL` | 409 | Sending an email to a household with no address |
| `ALREADY_ANSWERED` | 409 | Reminding a household that has answered |
| `ALREADY_SAVED` | 409 | Saving a vendor place twice |
| `LIMIT_REACHED` | 409 | Per-wedding limit (DATABASE §2) |
| `UPLOADS_DISABLED` | 403 | Guest upload switched off, or gallery closed |
| `UPLOAD_MISMATCH` | 409 | Complete found a different length, type, or ETag than promised |
| `UPLOAD_EXPIRED` | 409 | Upload permission timed out |
| `DIET_MISMATCH` | 400 | Diet numbers do not add up to the attending count |
| `RSVP_OVER_MAX` | 400 | Attending count above the household maximum |
| `EVENT_NOT_INVITED` | 400 | RSVP for a function the household was not invited to |
| `INVALID_PHONE`, `LIVE_URL_UNSUPPORTED`, `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `BAD_SLUG` | 400 | Field-specific rules |
| `DISCOVERY_UNAVAILABLE` | 503 | Places is down. Saved vendors still work |

### Things that must not leak

- **Login:** the same `INVALID_CREDENTIALS` for unknown email and wrong password, with similar timing (hash a dummy password when the user does not exist).
- **Forgot password:** always `202` with the same body.
- **Signup:** `EMAIL_TAKEN` is unavoidable, because the PRD requires rejecting a duplicate (FR-1.1). This does tell a caller that an address has an account. It is rate-limited per IP (§6). See open item 1.
- **Guest tokens:** a bad token is `404` with a calm body and the same timing as a good token that finds nothing else.
- **Cross-wedding ids:** `404`, never `403`.

---

## 5. Lists, filters, sorting

### Paged lists

Households, tasks, expenses, vendors.

```text
GET /api/households?page=2&limit=25&q=sha&side=bride
```

```json
{ "items": [ … ], "page": 2, "limit": 25, "total": 312 }
```

`page` starts at 1. `limit` defaults to 25, max 100. `page × limit` may not exceed 10,000, past which the answer is `VALIDATION_ERROR`. Sorting is a fixed default per endpoint, and `sort` (when offered) accepts a short whitelist such as `name` or `-createdAt`. Filters are plain query parameters that combine with AND. Repeated filters are not supported in v1.

### Cursor lists

Gallery only.

```text
GET /api/gallery/items?limit=30&cursor=6512ab…
```

```json
{ "items": [ … ], "nextCursor": "6512aa…" }
```

The cursor is opaque to the client (the last `_id` inside). `nextCursor` is absent on the last page. `limit` defaults to 30, max 60. Newest first. This stays stable while guests upload.

### Small lists

Events, members, and Aashirwad entries are bounded (30, 30, 40) and returned whole as `{ "items": [ … ] }`.

---

## 6. Rate limits

Counters are in MongoDB (DATABASE §5.16). Limits are configuration; these are the starting values.

| Scope | Key | Limit |
|---|---|---|
| Signup, login | IP | 20 per 15 min (shared) |
| Forgot password | IP, and the target email | 5 per hour per IP, 3 per hour per email (stops mail-bombing a stranger) |
| Password reset submit | IP | 10 per 15 min |
| RSVP | IP first, then invite token | 20 per 15 min per invite |
| Guest routes with a token (GET) | IP | 120 per minute, including bad tokens |
| Upload permission | IP first, then gallery token | 30 per 15 min per token |
| Member invitations | Wedding | 20 per day |
| Household emails (invite, single reminder) | Wedding | 500 per day |
| Send-now bulk | Wedding | 10 per hour |
| Vendor search | Wedding | 30 per hour (each search costs money) |

For token routes the order is architecture §18: the IP counter runs first, so guessing costs the caller; a bad token returns the calm `404` and does not use the per-link budget; the per-link counter runs only after the token is valid. Exceeding a limit returns `429`, reason `RATE_LIMITED`, and `Retry-After`.

---

## 7. Family app endpoints

Notation for **Who**: `S` any signed-in member (Admin or Manager), `A` Admin only, `—` no session needed, `SU` signed-in user, member or not.

Every route from §7.3 on also needs a membership, except where **Who** says otherwise (`POST /api/wedding`, `POST /api/members/join`). A wedding-scoped route for a signed-in user without one is `403 NO_WEDDING`. Admin-only routes reached by a Manager are `403 NOT_ADMIN`.

### 7.1 Auth

| Endpoint | Who | Body | Success | Errors |
|---|---|---|---|---|
| `POST /api/auth/signup` | — | `{ name, email, password }` | `201` Me object (§7.2), sets the cookie. Creates no wedding | `EMAIL_TAKEN` 409 |
| `POST /api/auth/login` | — | `{ email, password }` | `200` Me object, sets the cookie | `INVALID_CREDENTIALS` 401 |
| `POST /api/auth/logout` | SU | — | `204`, deletes the session row, clears the cookie | |
| `POST /api/auth/forgot-password` | — | `{ email }` | `202` `{ "message": "If that address has an account, we have sent a reset link." }` always | |
| `POST /api/auth/reset-password` | — | `{ token, password }` | `204`, deletes **all** of that user's sessions | `INVALID_TOKEN` (`VALIDATION_ERROR` 400) for unknown, used, or expired |

Signup and reset do not sign anyone in as a side effect of anything but their own success. Reset does **not** log the user in: they sign in with the new password.

### 7.2 Account (`/api/me`)

| Endpoint | Who | Body | Success |
|---|---|---|---|
| `GET /api/me` | SU | — | `200` Me object |
| `PATCH /api/me` | SU | `{ name?, email?, currentPassword? }` (`currentPassword` required when `email` changes) | `200` Me object |
| `POST /api/me/password` | SU | `{ currentPassword, newPassword }` | `204`, deletes the user's **other** sessions, keeps this one |

```json
{
  "user": { "id": "…", "name": "Priya Sharma", "email": "priya@example.com" },
  "membership": { "weddingId": "…", "role": "admin" },
  "wedding": { "id": "…", "brideName": "Ananya", "groomName": "Rohan", "title": null,
               "weddingDate": "2027-02-14", "city": "Dehradun" }
}
```

`membership` and `wedding` are `null` for a user with no wedding. This one call is how the UI decides which shell to show. It contains no other data.

### 7.3 Wedding and dashboard

| Endpoint | Who | Body / query | Success | Errors |
|---|---|---|---|---|
| `POST /api/wedding` | SU without a wedding | `{ brideName, groomName, weddingDate, city, title?, story?, coverUploadId? }` | `201` `{ wedding, membership }`. One transaction: wedding, first Admin membership, `adminCount = 1`, gallery token | `ALREADY_HAS_WEDDING` 409 |
| `GET /api/wedding` | S | — | `200` wedding (details only, no `site` content) | |
| `PATCH /api/wedding` | S | any of the create fields; `coverUploadId`; `null` clears `title`, `story`, cover | `200` wedding | |
| `GET /api/dashboard` | S | — | `200` below | |

Changing the couple's names or date never changes a published slug.

```json
{
  "wedding": { "brideName": "Ananya", "groomName": "Rohan", "title": null, "city": "Dehradun" },
  "countdown": { "date": "2027-02-14", "daysToGo": 137, "muhuratAt": "2027-02-14T05:12:00.000Z", "source": "primary_event" },
  "nextEvent": { "id": "…", "title": "Sangeet", "startsAt": "…" },
  "counts": { "events": 5, "tasksDone": 12, "tasksTotal": 31, "households": 214, "householdsAnswered": 96,
              "expensesTotalInr": 1845000, "vendors": 9 },
  "tasksNearingDue": [ { "id": "…", "title": "Confirm caterer", "dueOn": "2027-01-20", "priority": "high" } ]
}
```

`daysToGo` is computed on the server in `Asia/Kolkata` and can be zero or negative after the day. `source` is `primary_event` or `wedding_date`. `householdsAnswered` counts households with at least one RSVP row. Values are computed live, with no cache, in parallel queries (DATABASE §6).

### 7.4 Members

| Endpoint | Who | Body | Success | Errors |
|---|---|---|---|---|
| `GET /api/members` | A | — | `200` `{ members: [{ userId, name, email, role, joinedAt }], invitations: [{ id, email, role, status, expiresAt, createdAt }] }` (pending only) | |
| `POST /api/members/invitations` | A | `{ email, role }` | `201` invitation. Sends the email inside the request | `ALREADY_MEMBER`, `MEMBER_OF_OTHER_WEDDING`, `INVITATION_PENDING`, `LIMIT_REACHED`, `DEPENDENCY_UNAVAILABLE` |
| `POST /api/members/invitations/{id}/resend` | A | — | `204`. New token, new 7-day expiry, email sent | |
| `DELETE /api/members/invitations/{id}` | A | — | `204`. Status becomes `revoked` | |
| `PATCH /api/members/{userId}` | A | `{ role }` | `200` member | `LAST_ADMIN` |
| `DELETE /api/members/{userId}` | A | — | `204` | `LAST_ADMIN` |
| `POST /api/members/leave` | S | — | `204`. The caller leaves. Any role | `LAST_ADMIN` |
| `POST /api/members/join` | SU without a wedding | `{ token }` | `200` Me object. Marks the invitation accepted and creates the membership in one transaction | `INVITATION_*`, `INVITE_EMAIL_MISMATCH`, `MEMBER_OF_OTHER_WEDDING` |
| `GET /api/members/assignees` | S | — | `200` `{ items: [{ userId, name }] }`. For the task assignee picker; a Manager needs it and cannot open Members. No emails | |

Joining requires the signed-in user's email to equal the invited email. Someone who forwards the link cannot pass their invitation to a different person (open item 2).

### 7.5 Events

| Endpoint | Who | Body / query | Success | Errors |
|---|---|---|---|---|
| `GET /api/events` | S | — | `200` `{ items }` sorted by `startsAt`. Each item includes `householdsInvited` | |
| `POST /api/events` | S | Event fields below | `201` event | `LIMIT_REACHED` |
| `GET /api/events/{id}` | S | — | `200` event | |
| `PATCH /api/events/{id}` | S | Any event field. `isPrimary: true` moves the primary flag from the old event in the same transaction | `200` event | `VALIDATION_ERROR` (`muhuratAt` only on the primary event) |
| `DELETE /api/events/{id}` | S | `?confirm=true` | `204` | `CONFIRMATION_REQUIRED` 409 with `details: { householdsInvited, rsvps }` when any household is invited. Retry with `confirm=true` |
| `GET /api/events/{id}/attendance` | S | — | `200` attendance totals | |

```json
{
  "kind": "sangeet",
  "title": "Sangeet",
  "startsAt": "2027-02-12T13:30:00.000Z",
  "endsAt": "2027-02-12T17:30:00.000Z",
  "isPrimary": false,
  "venue": { "name": "Lakeview Lawns", "address": "Rajpur Road", "city": "Dehradun",
             "lat": 30.3752, "lng": 78.0664, "googlePlaceId": "ChIJ…" },
  "description": "An evening of songs and dance by both families.",
  "dressNote": "Jewel tones. Heels sink into the lawn.",
  "howToReach": "Gate 2 from Rajpur Road.",
  "parking": "Valet at Gate 2.",
  "coverUploadId": null
}
```

Responses turn `venue` into `{ …, "mapsUrl": "https://www.google.com/maps/search/?api=1&query=30.3752,78.0664&query_place_id=ChIJ…" }`, the documented Google Maps URL format. Opening it needs no key. `venue` is `null`, and there is no map, when it was never set. A venue always needs `lat` and `lng`; the client obtains them from place autocomplete with the browser Maps key (architecture §14).

The theme override is not on this resource. It is Admin-only and lives at `PUT /api/website/events/{eventId}/theme` (§7.11), so a Manager editing an event cannot touch it.

```json
{
  "eventId": "…",
  "invited": 120,
  "silent": 31,
  "no": 9,
  "yes": { "households": 80, "attending": 214,
           "diet": { "veg": 120, "nonVeg": 70, "jain": 14, "noOnionGarlic": 10 } }
}
```

`diet` adds up to `attending`. This is the caterer's number.

### 7.6 Households (Guests page)

Responses **never** contain `inviteToken` or a full invite URL. Only the `share` endpoint below returns it (DATABASE §8).

| Endpoint | Who | Body / query | Success | Errors |
|---|---|---|---|---|
| `GET /api/households` | S | `page, limit, q` (name prefix), `side`, `eventId`, `rsvp` (`silent`, `yes`, `no`; needs `eventId`), `emailed` (`true`, `false`), `sort` (`name`, `-createdAt`) | `200` paged list | |
| `POST /api/households` | S | `{ name, side, maxPeople, invitedEventIds, email?, phone?, notes? }` | `201` household. Generates the invite token | `INVALID_PHONE`, `LIMIT_REACHED` |
| `GET /api/households/{id}` | S | — | `200` household | |
| `PATCH /api/households/{id}` | S | Any create field. `?confirm=true` | `200` household | `MAX_BELOW_ATTENDING`; `CONFIRMATION_REQUIRED` with `details: { rsvpsRemoved }` when removing a function that has an answer |
| `DELETE /api/households/{id}` | S | — | `204`. Its RSVPs and pending jobs go too | |
| `GET /api/households/{id}/share` | S | `kind` (`invite`, `please_rsvp`, `see_you_soon`), `eventId` (for the two reminders) | `200` `{ inviteUrl, message, waUrl }` | |
| `POST /api/households/{id}/invite-email` | S | — | `200` `{ invitationEmailSentAt }`. Sends one email inside the request. Resend allowed | `NO_EMAIL`, `DEPENDENCY_UNAVAILABLE` |
| `GET /api/households/{id}/ecard.png` | S | — | `200` `image/png`. Slice 5. Rendered on demand, not stored | |

A household in a list:

```json
{
  "id": "…", "name": "Sharma family", "side": "bride", "maxPeople": 5,
  "invitedEventIds": ["…", "…"], "email": null, "phone": "+919876543210", "notes": null,
  "invitationEmailSentAt": null,
  "rsvps": [
    { "eventId": "…", "status": "yes", "attendingCount": 3,
      "diet": { "veg": 2, "nonVeg": 1, "jain": 0, "noOnionGarlic": 0 }, "respondedAt": "…" },
    { "eventId": "…", "status": "silent" }
  ],
  "createdAt": "…", "updatedAt": "…"
}
```

`share` is the one place an organiser sees a guest's private link:

```json
{
  "inviteUrl": "https://thewedding.home/i/Xk3…",
  "message": "You're invited to Ananya & Rohan's wedding.\n\nYou're invited through The Wedding Home — open this link to see your functions and RSVP:\nhttps://thewedding.home/i/Xk3…\n\nWith love,\nThe families",
  "waUrl": "https://wa.me/919876543210?text=You%27re%20invited%20…"
}
```

`waUrl` uses the household's phone as digits when there is one, and `https://wa.me/?text=` (WhatsApp then asks who to send to) when there is not. WhatsApp is never called by the server. The route logs the operation and household id, never the URL. It is rate-limited with the household email quota, because it is the natural way to scrape links.

### 7.7 Reminders (slice 3)

The clock and the job rules are in DATABASE §5.14 and architecture §15.

| Endpoint | Who | Body / query | Success | Errors |
|---|---|---|---|---|
| `GET /api/reminders/queue` | S | `eventId` (required), `page`, `limit` | `200` `{ event, schedule: [{ slot: "1m", dueAt, state: "passed" or "upcoming" }, …], items: [{ householdId, name, hasEmail, lastReminderAt }], page, limit, total }`. The items are households still silent for that function | |
| `POST /api/households/{id}/remind` | S | `{ eventId, kind }` | `200` `{ sentAt }`. One email, inside the request | `NO_EMAIL`, `ALREADY_ANSWERED`, `DEPENDENCY_UNAVAILABLE` |
| `POST /api/reminders/send-now` | S | `{ eventId, kind, householdIds? }` (omit for every household the kind applies to) | `202` `{ batchId, enqueued, skipped: { noEmail } }` | `LIMIT_REACHED` |
| `GET /api/reminders/batches/{batchId}` | S | — | `200` `{ total, pending, processing, sent, failed, skipped }` | |

Copy-to-WhatsApp for a reminder is `GET /api/households/{id}/share?kind=please_rsvp&eventId=…`. Send-now is in addition to the schedule, never instead of it.

### 7.8 Tasks (slice 4)

| Endpoint | Who | Body / query | Success |
|---|---|---|---|
| `GET /api/tasks` | S | `page, limit, status, priority, assignee` (`me`, a userId, or `none`), `eventId`, `due` (`overdue`, `week`), `q` | `200` paged. Default order: not done first, then due date (undated last), then priority |
| `POST /api/tasks` | S | `{ title, description?, status?, priority?, assigneeId?, eventId?, dueOn? }` | `201` task |
| `GET /api/tasks/{id}` | S | — | `200` task |
| `PATCH /api/tasks/{id}` | S | Any field. Setting `status: "done"` stamps `completedAt` | `200` task |
| `DELETE /api/tasks/{id}` | S | — | `204` |

The filter tabs the PRD asks for map to parameters: All is none, Mine is `assignee=me`, Completed is `status=done`. `assigneeId` must belong to a member of this wedding (`VALIDATION_ERROR`, path `assigneeId`); so must `eventId`.

### 7.9 Expenses (slice 4)

| Endpoint | Who | Body / query | Success |
|---|---|---|---|
| `GET /api/expenses` | S | `page, limit, category, eventId, vendorId, from, to` (civil dates), `q` | `200` `{ items, page, limit, total, sumInr }` where `sumInr` is the total of everything matching the filters, not just this page |
| `GET /api/expenses/summary` | S | `eventId?, from?, to?` | `200` `{ totalInr, count, byCategory: [{ category, totalInr, count }] }` |
| `POST /api/expenses` | S | `{ title, amountInr, spentOn, category, eventId?, vendorId?, vendorLabel?, notes? }` | `201` expense |
| `GET /api/expenses/{id}` | S | — | `200` expense |
| `PATCH /api/expenses/{id}` | S | Any field | `200` expense |
| `DELETE /api/expenses/{id}` | S | — | `204` |

`amountInr` is a whole number of rupees from 1 to 1,000,000,000. There are no budget fields anywhere in this API.

### 7.10 Vendors (slice 6)

| Endpoint | Who | Body / query | Success | Errors |
|---|---|---|---|---|
| `GET /api/vendors` | S | `page, limit, category, eventId, q` | `200` paged | |
| `POST /api/vendors` | S | `{ name, category, contactPerson?, phone?, email?, address?, website?, agreedCostInr?, eventIds?, notes?, place?: { googlePlaceId, lat, lng } }` | `201` vendor | `ALREADY_SAVED`, `LIMIT_REACHED` |
| `GET /api/vendors/{id}` | S | — | `200` vendor | |
| `PATCH /api/vendors/{id}` | S | Any field | `200` vendor | |
| `DELETE /api/vendors/{id}` | S | — | `204`. Its expenses keep the name in `vendorLabel` | |
| `GET /api/vendors/search` | S | `eventId` (venue coordinates are the centre), `category`, `radiusM` (default 5000, max 30000), `q?` | `200` `{ places: [{ googlePlaceId, name, rating, ratingCount, address, lat, lng, distanceM, phone?, website?, mapsUrl, savedVendorId? }] }` | `DISCOVERY_UNAVAILABLE` 503 |

Search calls Places from the server with a field mask that asks only for these fields (cost control) and never returns the API key. `savedVendorId` is filled when a result is already in My vendors. The event must have a venue with coordinates, or the search is `VALIDATION_ERROR` on `eventId`. The guest function map has nothing to do with this route.

### 7.11 Website and themes (slice 5, Admin only)

All routes here are `A`.

| Endpoint | Body | Success | Errors |
|---|---|---|---|
| `GET /api/website` | — | `200` the `site` content below, plus `slugSuggestion` (`bride-groom-ddmmyyyy`, with `-2` appended when taken) | |
| `PATCH /api/website` | Any of `theme`, `liveUrl`, `stay`, `helplines`, `families`, `giftNote` | `200` site | `LIVE_URL_UNSUPPORTED` |
| `PUT /api/website/slug` | `{ slug }` | `200` `{ slug }` | `BAD_SLUG`, `SLUG_TAKEN` |
| `POST /api/website/publish` | — | `200` `{ published: true, publishedAt, url }` | `PUBLISH_REQUIREMENTS` |
| `POST /api/website/unpublish` | — | `200` `{ published: false }` | |
| `PUT /api/website/events/{eventId}/theme` | ThemeOverride | `200` | |
| `DELETE /api/website/events/{eventId}/theme` | — | `204` | |
| `POST /api/website/aashirwad` | `{ author, relation?, message }` | `201` entry | `LIMIT_REACHED` |
| `PATCH /api/website/aashirwad/{entryId}` | Any field | `200` entry | |
| `DELETE /api/website/aashirwad/{entryId}` | — | `204` | |

```json
{
  "slug": "ananya-rohan-14022027",
  "published": false,
  "publishedAt": null,
  "liveUrl": null,
  "theme": { "packId": "traditional", "overrides": null },
  "stay": "Hotel Pacific is 5 minutes from the venue. Ask for the Sharma–Verma block.",
  "helplines": [ { "side": "bride", "name": "Meera Mausi", "phone": "+919812345678" },
                 { "side": "groom", "name": "Karan Bhaiya", "phone": "+919898989898" } ],
  "families": { "bride": { "heading": "The Sharmas of Dehradun", "blurb": "…", "photoUploadId": null },
                "groom": { "heading": "The Vermas of Pune", "blurb": "…", "photoUploadId": null } },
  "giftNote": "Your blessings are all we ask.",
  "aashirwad": [ { "id": "…", "author": "Dadi", "relation": "Groom's grandmother", "message": "…" } ]
}
```

- **Slug:** lowercase letters, digits, single hyphens, 3 to 48 characters. Once published it stays until an Admin changes it with this same endpoint; nothing else edits it.
- **Publish** needs a slug and at least one event. Unpublishing takes the public page down within the cache time of about a minute (§3).
- **Live URL:** `https` only, on `youtube.com`, `youtu.be`, `youtube-nocookie.com`, or `vimeo.com`. The server parses the video id, stores the URL you gave, and builds the embed URL when rendering. `null` removes it.
- **Theme:** `packId` must be a known pack. `overrides` is validated with a strict Zod schema built from the token model in the `indian-wedding-themes` skill. Media fields take an `uploadId`; the server swaps it for a stored reference.

### 7.12 Photos and videos (slice 7, organiser side)

| Endpoint | Who | Body / query | Success |
|---|---|---|---|
| `GET /api/gallery` | S | — | `200` `{ enabled, guestUploadEnabled, url, albums: [{ eventId, title, total, hidden }] }`. `eventId: null` is "Other / wedding memories". `url` is the stable `/g/{token}` link |
| `PATCH /api/gallery` | S | `{ enabled?, guestUploadEnabled? }` | `200` |
| `GET /api/gallery/qr` | S | `format` (`png`, `svg`), `size` (px, png only) | `200` the QR image, made on demand and not stored. Encodes `https://{host}/g/{token}` |
| `GET /api/gallery/items` | S | `eventId` (an id, or `none` for Other), `hidden` (`true`, `false`, `all`; default `all`), `cursor`, `limit` | `200` cursor list |
| `PATCH /api/gallery/items/{id}` | S | `{ hidden?, eventId? }` | `200` item |
| `DELETE /api/gallery/items/{id}` | S | — | `204`. Deletes the row, then the object |
| `GET /api/gallery/items/{id}/download` | S | — | `302` to a 5 minute signed URL with `Content-Disposition: attachment` |

Uploading uses the generic protocol in §9 with `purpose: "gallery"`. An item:

```json
{ "id": "…", "kind": "photo", "contentType": "image/jpeg", "bytes": 3145728,
  "url": "https://…signed…", "urlExpiresAt": "…", "eventId": null, "hidden": false,
  "uploadedBy": "guest", "createdAt": "…" }
```

Downloading many at once (a zip) is not in v1 (open item 6).

### 7.13 Preview as guest

Both roles. The same components render as for a real guest, driven by the organiser's session.

| Endpoint | Success |
|---|---|
| `GET /api/preview/site` | The public site payload of §8.1, whether or not the site is published |
| `GET /api/preview/invite` | An invite payload of §8.3 for a made-up household ("Preview family", 4 people, invited to every function, all silent) |
| `PUT /api/preview/invite/rsvp` | The same body and validation as the real RSVP, the same response, and **no write** |

---

## 8. Guest endpoints

No cookie is read. All send `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, except §8.1.

### 8.1 Public site

`GET /api/public/site/{slug}` — no auth. `404` unless the wedding is published. Cached at the edge for 60 seconds. It returns only published fields and no guest data and no tokens:

```json
{
  "wedding": { "brideName": "Ananya", "groomName": "Rohan", "title": null, "weddingDate": "2027-02-14",
               "city": "Dehradun", "story": "…", "cover": { "url": "…", "contentType": "image/jpeg" } },
  "theme": { … resolved tokens for the wedding … },
  "events": [ { "id": "…", "kind": "sangeet", "title": "Sangeet", "startsAt": "…", "endsAt": "…",
                "venue": { "name": "…", "address": "…", "city": "…", "mapsUrl": "…" },
                "dressNote": "…", "theme": { … } } ],
  "families": { … }, "stay": "…", "helplines": [ … ], "aashirwad": [ … ], "giftNote": "…",
  "live": { "provider": "youtube", "embedUrl": "https://www.youtube-nocookie.com/embed/…" }
}
```

`live` is `null` when there is no URL or it cannot play. The site does not collect RSVPs and never contains the gallery token (architecture §6).

### 8.2 Member invitation preview

`GET /api/public/member-invite/{token}` — shows an invitee what they are joining before they sign in.

```json
{ "wedding": { "brideName": "Ananya", "groomName": "Rohan" }, "role": "manager", "email": "dad@example.com" }
```

`409` with `INVITATION_EXPIRED`, `INVITATION_REVOKED`, or `INVITATION_USED` when it is no longer good; `404` for an unknown token.

### 8.3 Personal invitation

`GET /api/public/invite/{token}`

```json
{
  "wedding": { "brideName": "Ananya", "groomName": "Rohan", "title": null, "weddingDate": "2027-02-14",
               "helplines": [ … ], "aashirwad": [ … ], "live": null },
  "household": { "name": "Sharma family", "maxPeople": 5 },
  "events": [
    {
      "id": "…", "kind": "sangeet", "title": "Sangeet",
      "startsAt": "…", "endsAt": "…",
      "venue": { "name": "…", "address": "…", "city": "…", "mapsUrl": "…" },
      "description": "…", "dressNote": "…", "howToReach": "…", "parking": "…",
      "theme": { … resolved for this function only … },
      "attending": { "total": 214 },
      "rsvp": { "status": "silent" }
    }
  ],
  "galleryUrl": "/g/…"
}
```

Only the functions this household was invited to are present. No other family's name appears anywhere; `attending.total` is a number only. A guest invited only to Sangeet never receives another function's theme tokens. `galleryUrl` is `null` when the gallery is off. The whole route is `404` with a calm body for a token that does not exist, including one whose household was deleted.

`PUT /api/public/invite/{token}/rsvp`

```json
{
  "responses": [
    { "eventId": "…", "status": "yes", "attendingCount": 3,
      "diet": { "veg": 2, "nonVeg": 1, "jain": 0, "noOnionGarlic": 0 } },
    { "eventId": "…", "status": "no" }
  ]
}
```

- Every `eventId` must be one the household was invited to (`EVENT_NOT_INVITED`) and appear once.
- `yes`: `1 ≤ attendingCount ≤ maxPeople` (`RSVP_OVER_MAX`), and the four diet numbers are integers ≥ 0 that add up to `attendingCount` (`DIET_MISMATCH`).
- `no`: `attendingCount` and `diet` are absent or zero.
- Each listed function's answer is **replaced**. Functions not listed are untouched. Answering twice is an edit, not a duplicate (the unique `(householdId, eventId)` index).
- All-or-nothing: everything is validated first, then written in one bulk operation. If any item is invalid, nothing is saved and `errors` names each bad item by `path`.

`200` returns the updated `events[].rsvp` objects, so the page can re-render without another call.

### 8.4 Shared gallery

All under `/api/public/gallery/{token}`. `404` for an unknown token. A closed gallery (`enabled: false`) answers `200` with `{ "enabled": false }` on the first route and `403 UPLOADS_DISABLED` on the rest, so a printed QR shows a friendly "closed" page rather than an error.

| Endpoint | Body / query | Success | Errors |
|---|---|---|---|
| `GET /` | — | `200` `{ enabled, wedding: { brideName, groomName, title }, guestUploadEnabled, albums: [{ eventId, title, total }] }` | |
| `GET /items` | `eventId` (id or `none`), `cursor`, `limit` | `200` cursor list of visible (not hidden) items with signed URLs | |
| `POST /uploads` | `{ contentType, bytes, eventId? }` | `201` upload permission (§9) | `UPLOADS_DISABLED`, `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `LIMIT_REACHED` |
| `POST /uploads/{uploadId}/complete` | `{ etag }` | `201` gallery item | `UPLOAD_MISMATCH`, `UPLOAD_EXPIRED` |

Guests cannot hide, delete, or download in bulk. A guest never sees another uploader's identity, only the item.

---

## 9. Uploads

One protocol for every file (architecture §12). Bytes go from the browser straight to S3, never through Vercel.

```text
1  POST intent           → server checks access, type, size, limits; stores an upload_intent
                           returns a short-lived signed PUT to a staging key
2  PUT to S3             → browser sends exactly the bytes and headers it was given
3  POST …/complete {etag}→ server verifies, copies to the final key, publishes
```

### Step 1: ask for permission

`POST /api/uploads` for organisers, `POST /api/public/gallery/{token}/uploads` for guests (gallery only).

```json
{ "purpose": "gallery", "contentType": "video/mp4", "bytes": 48213004, "eventId": "…" }
```

```json
{
  "uploadId": "6512…",
  "upload": {
    "method": "PUT",
    "url": "https://s3.ap-south-1.amazonaws.com/…?X-Amz-Signature=…",
    "headers": { "Content-Type": "video/mp4", "Content-Length": "48213004" },
    "expiresAt": "…"
  }
}
```

The client states the **exact** byte length. The signed URL is bound to that `Content-Type` and `Content-Length`, which is how a presigned `PUT` enforces size: S3 rejects a body that differs. A presigned `PUT` cannot express "up to N bytes", so the client must know the length first, which a browser does from `file.size`. The URL lives 30 minutes for video and 10 for everything else.

### Step 2: PUT

The browser sends the bytes with the headers it was given, and reads the `ETag` from S3's response. HEIC photos are converted to JPEG in the browser before step 1 (architecture §12). If the network drops, the client starts again from step 1; the staging object expires by lifecycle rule.

### Step 3: complete

`POST /api/uploads/{uploadId}/complete` (guests: `…/gallery/{token}/uploads/{uploadId}/complete`) with `{ "etag": "…" }`. The server:

1. Loads the intent by `_id` and `weddingId` (and checks the gallery token and upload flag for guests). Unknown or expired: `UPLOAD_EXPIRED`.
2. `HEAD`s the staging object. Length or `Content-Type` different from the intent, or ETag different from the client's: `UPLOAD_MISMATCH`.
3. Reads the first bytes and checks the file signature against the declared type (JPEG, PNG, WebP, MP4, QuickTime, MP3). A mismatch is `UPLOAD_MISMATCH`, not a trusted browser claim.
4. Copies staging to the final key, conditional on the ETag, then deletes staging.
5. For `gallery`, inserts the `gallery_items` row and returns it. For every other purpose, marks the intent `completed` and returns `{ uploadId, contentType, bytes }`.

A second `complete` for the same intent returns the same result. No row exists until step 5, so a failure anywhere before it leaves no half-published item, only an orphan object that the lifecycle rule and later cleanup remove.

### Attaching to something

Covers, family photos, and theme media are attached by putting the `uploadId` in the `PATCH` that owns them (`coverUploadId`, `photoUploadId`, and the media fields of a theme override). The server checks that the intent is `completed`, belongs to this wedding, has the matching `purpose`, and has not been attached before, and then records the media on the parent. Replacing media deletes the old object afterwards, best-effort.

### Allowed types, caps, and who may ask

| `purpose` | Types | Cap | Who |
|---|---|---|---|
| `gallery` | `image/jpeg`, `image/png`, `image/webp` | 15 MB | Organisers; guests with a valid gallery link when guest upload is on |
| `gallery` | `video/mp4`, `video/quicktime` | 100 MB | same |
| `wedding_cover`, `event_cover` | JPEG, PNG, WebP | 15 MB | Any organiser |
| `family_photo`, `theme_image` | JPEG, PNG, WebP | 15 MB | Admin |
| `theme_video` | `video/mp4` | 20 MB | Admin |
| `theme_audio` | `audio/mpeg` | 10 MB | Admin |

`audio/mpeg` and its 10 MB cap are new; architecture §12 listed no audio type although theme tokens include music. The e-card is rendered on demand and is not uploaded (§7.6).

---

## 10. Internal jobs

Called by Vercel Cron, or by any scheduler holding the secret. Never linked from the UI.

| Route | Does | Schedule |
|---|---|---|
| `/api/internal/jobs/reminders` | The planner: inserts `email_jobs` for every slot now due, using the unique `dedupeKey`, so running twice is a no-op | Hourly |
| `/api/internal/jobs/email` | The drain: claims up to 25 `PENDING` rows, sends each through `EmailService`, records the result | Every 5 minutes |

- **Method:** `GET`, because Vercel Cron can only issue `GET`. `POST` is accepted too for other schedulers. Both are protected the same way.
- **Auth:** `Authorization: Bearer $CRON_SECRET`, compared in constant time. Missing or wrong: `401`, no detail.
- **Response:** `200` with counts: `{ enqueued, skippedDuplicates }` or `{ claimed, sent, failed, skipped }`. Nothing about individual households.
- **Time budget:** a run stops claiming when about 80% of the function's `maxDuration` is spent and leaves the rest for the next run.
- **After send-now:** the request that enqueues a batch may start one drain in the background (`after()` in Next.js), so an organiser is not left waiting for the next 5 minute tick. If it does not, the cron drains it.
- The hourly and 5 minute schedules need Vercel's Pro plan; the Hobby plan runs cron at most daily (architecture §15).

---

## 11. Permissions at a glance

| Area | Admin | Manager | Guest (token) | Public |
|---|---|---|---|---|
| Account (`/me`) | ✓ | ✓ | | |
| Wedding details, dashboard | ✓ | ✓ | | |
| Members (list, invite, role, remove) | ✓ | ✗ `NOT_ADMIN` | | |
| Leave the wedding, list assignees | ✓ | ✓ | | |
| Events, households, reminders, tasks, expenses, vendors | ✓ | ✓ | | |
| Gallery admin, QR, hide, delete, download, toggles | ✓ | ✓ | | |
| Website, themes, slug, publish, Live URL, Aashirwad, function themes | ✓ | ✗ `NOT_ADMIN` | | |
| Preview as guest | ✓ | ✓ | | |
| Open invite, RSVP | | | own token | |
| Shared gallery view and upload | | | gallery token | |
| Public site | | | | if published |

Permission checks live in the service, not the route: `assertAdmin(ctx)` for the two ✗ rows, and the repository requires the `weddingId` from `ctx`.

---

## 12. Flows

### A. Slice 1: first sign-up to a countdown

```text
POST /api/auth/signup                  → 201, cookie
GET  /api/me                           → membership null → UI shows "Create your wedding"
POST /api/wedding                      → 201 (wedding + Admin membership + gallery token, one transaction)
POST /api/events   ×4                  → Haldi, Sangeet, Wedding (isPrimary + muhuratAt), Reception
GET  /api/dashboard                    → countdown from the primary event, next function, counts
POST /api/members/invitations          → email with /join/{token}
   invitee: GET /api/public/member-invite/{token} → sign up or in → POST /api/members/join
```

### B. Slice 2: WhatsApp invite to RSVP

```text
organiser  POST /api/households                 → household with a private invite token
organiser  GET  /api/households/{id}/share      → waUrl → opens WhatsApp on the organiser's phone
guest      GET  /api/public/invite/{token}      → only their functions, counts, maps
guest      PUT  /api/public/invite/{token}/rsvp → answers replace earlier ones
organiser  GET  /api/events/{id}/attendance     → yes 80 households / 214 people, diet totals
```

### C. Slice 7: QR to gallery

```text
organiser  GET  /api/gallery/qr?format=svg                      → print it once; the URL never changes
guest      GET  /api/public/gallery/{token}                     → wedding name, albums
guest      POST …/uploads → PUT to S3 → POST …/uploads/{id}/complete   → item is live at once
organiser  PATCH /api/gallery/items/{id} {hidden:true}          → gone from guest views
```

---

## 13. Contract and versioning

- **No `/v1` prefix,** because UI and API deploy together from one repo. A breaking change ships as one commit that changes both.
- **The long-lived contracts** are the guest links and what they open: `/w/{slug}`, `/i/{token}`, `/g/{token}` and the public payloads behind them. They live on printed cards and old WhatsApp messages. Changing their meaning needs a migration plan; adding fields is always allowed. Removing a field from a public payload needs the same care as removing a URL.
- **OpenAPI.** The Zod schemas are the source. Once slice 1 exists, `npm run openapi` generates `openapi.json` from them, CI fails when the committed file is out of date, and this document keeps the reasoning while the generated file holds the exact shapes. Until then this document is the contract.
- **Pagination, filters, and error codes** are added, never renamed. A new `reason` is not a breaking change; the UI treats an unknown reason like its `code`.

---

## 14. Tests this contract expects

These add to architecture §23.

1. Every private route without a cookie is `401`; with a cookie but no membership, `403 NO_WEDDING`; a Manager on any `A` route is `403 NOT_ADMIN`.
2. A write with a missing or foreign `Origin` is `403 BAD_ORIGIN`.
3. A body with an unknown field, or with `weddingId`, `role`, or `userId`, is rejected and changes nothing.
4. Wedding A's id in any path returns `404` on wedding B's session, for every resource type.
5. `LAST_ADMIN` under concurrency: two Admins demote each other in parallel; exactly one succeeds.
6. RSVP: over max, diet not adding up, an uninvited function, a duplicated `eventId`, and a mixed valid and invalid batch (nothing saved). A second valid answer replaces the first and leaves exactly one row.
7. The invite payload contains no other household's name, no other function's theme, and no other token. The household list contains no `inviteToken` anywhere.
8. Signup, login, and forgot-password responses are identical in shape and close in timing for existing and unknown emails (except the required `EMAIL_TAKEN`).
9. Reset token: single use, expires, and kills all sessions.
10. Upload: mismatched length, wrong file signature, ETag changed between PUT and complete, expired intent, and a second `complete` all behave as §9 says.
11. Cron routes: `401` without the secret; running the planner twice inserts each job once; two drains never send the same row twice.
12. Deleting an event, household, vendor, or member leaves no dangling reference (DATABASE §7).
13. Every list route respects `limit ≤ 100` and refuses deep pages.

---

## 15. Open items for review

1. **Signup reveals which emails have accounts.** The PRD requires rejecting a duplicate email, which tells an outsider the address is registered. We rate-limit it. The clean fix is email-verified signup ("check your inbox"), which the architecture chose to skip in v1. Acceptable for now?
2. **Joining requires the invited email.** If a parent signs up with a different address than the one the Admin typed, the join is refused and the Admin must invite the right address. Stricter than the PRD, and it stops a forwarded link from handing over the wedding. The alternative is any signed-in user with the token can join.
3. **Who edits helplines, stay, families, Aashirwad** (Admin only here). DATABASE open item 1.
4. **Large videos on phones.** A 100 MB video in one `PUT` restarts from zero if the network drops. S3 multipart upload fixes it and adds complexity to the protocol. Worth a spike before slice 7.
5. **Gallery link on the invite.** `galleryUrl` in the invite payload is how a guest finds the gallery. The PRD says the gallery is for "people with the link" but does not say where they get it besides the QR. Confirm this is wanted.
6. **Download everything.** A zip of the whole gallery needs a worker or a client-side zip. Not in v1; per-item download only.
7. **Guest CSV import.** No endpoint yet. DATABASE open item 6.
8. **Vercel plan.** Hourly and 5-minute crons need Pro (§10).
