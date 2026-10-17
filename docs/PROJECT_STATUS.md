# The Wedding Home — Project Status

**Last updated:** 2026-10-18

This is the progress log. Read it before building, and update it in the same change when a major feature is added or materially changed. Product scope stays in `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/API.md`. This file does not override them.

## Current position

The public site opens on **Plan the wedding**. The first screen asks for the bride, the groom, the date, the city, and an optional title and story. The next screen creates the account, and that person is the first Admin of that wedding only. Another email can plan a different wedding in the same Atlas database, `wedding-home-dev`. `aryanjstar3@gmail.com` is an Admin of the Jaipur sample. `aryanjstar4@gmail.com` and `22bcs018@iiitdwd.ac.in` are Managers there. A new password must be 10 to 128 characters and must not be a very common password. Password reset and invitation mail go out through Resend as `The Wedding Home <onboarding@aryanjaiswal.in>`. That domain is verified. Session and one-time tokens are HMAC-SHA256 when `AUTH_TOKEN_PEPPER` is set, and older SHA-256 rows still sign in. A real wedding can move tasks, copy a gallery link, upload a small photograph, and publish a themed guest site. The designed Aanya pages stay at `/w/aanya-and-kabir`. The Jaipur sample is also published at `/w/aanya-kabir-jaipur` in the Traditional pack. Production is [https://the-wedding-home.vercel.app](https://the-wedding-home.vercel.app). Vercel’s GitHub connection already redeploys `main`. Photographs and videos upload through the app under 4 MB. When `BLOB_READ_WRITE_TOKEN` is set on the Vercel project, photographs up to 15 MB and videos up to 100 MB upload straight to Vercel Blob.

| Milestone | Status | Recorded on |
| --- | --- | --- |
| Application scaffold | Complete — foundation only | 2026-10-06 |
| Public homepage and screen preview | Complete — UI with sample data | 2026-10-14 |
| Family data in MongoDB | Complete — Atlas `wedding-home-dev` | 2026-10-14 |
| Family workspace, gallery trial, published theme | Complete — checked locally | 2026-10-17 |
| Vercel deployment | Live — the-wedding-home.vercel.app redeploys from main | 2026-10-17 |
| Rebuilt family app, all seven slices, themed guest site with music | Complete — end to end, see milestone 5 | 2026-10-18 |
| Homepage, music on by default, OpenStreetMap vendor search | Complete — end to end, see milestone 6 | 2026-10-18 |

## 1. Application scaffold

**Status:** Complete — foundation only

**Recorded on:** 2026-10-06

### Implemented

- Next.js App Router, TypeScript, Zod, and Mongoose 8.
- Routes under `src/app`, server infrastructure under `src/server`, environment parsing under `src/config`.
- Health check, HTTP problem responses, bcrypt cost 12, and SHA-256 session helpers. These helpers are not wired to a sign-in screen.
- Lint, typecheck, and Vitest scripts.

### Validation

- Committed as the app shell on 2026-10-06. The health route and the helper tests exist in the repo.

### Boundaries

- The scaffold does not sign anyone in and does not create a wedding.
- A reference repository supplied the folder idea. This product kept households, integer rupees, and its own routes.

## 2. Public homepage and screen preview

**Status:** Complete — UI with sample data

**Recorded on:** 2026-10-14

### Implemented

- Public homepage at `/`, the family workspace at `/app`, and the sample guest site at `/w/aanya-and-kabir`, including the invite, a function page, live, and gallery.
- Layouts that fit a phone and a desktop window: the marketing header, the family menu, and the guest menu collapse; grids stack or scroll instead of overflowing.
- A browser preview of the first journey. Creating an account asks for a name, email, and password, then the couple, date, and city, then the functions. Signing in with `aanya@example.com`, `kabir@example.com`, `ritu@example.com`, or `arjun@example.com` uses the preview password `preview`. Aanya and Kabir are Admin. Ritu and Arjun are Manager. A new account does not see the sample wedding. An invited email joins that wedding when they create an account. A wrong password fails. Reset asks for an email and then a new password, and the message stays the same when the email is unknown.
- The family logo links to the public homepage. The couple’s names link back to the dashboard. Account also links to the public homepage. A signed-in organiser on the guest site can return to the family app.
- Admin can open Website and Members, invite someone, change a role, and remove someone. The last Admin cannot be removed or demoted. Manager does not see those two pages and can still preview the guest site. A new wedding’s website is not published.
- Events select a function and open Google Maps. Households can be selected. Task filters are All, Mine, and Done. Copy link and Share on WhatsApp are actions. The invite page checks that veg, non-veg, and Jain add up to the people coming.

### Validation

- 24 tests passed, including signup, invite join, last Admin, password reset, and the preview password. Typecheck passed. Lint passed.
- Checked in the browser on a desktop window and a phone width: create account rejects a short password, a mismatch, and an email that already exists; a new wedding starts empty and continues to functions; the logo and Account’s public-home link return to the homepage; a wrong password and an unknown email fail the same way; an invited manager joins that wedding and cannot open Members; the sample manager signs in with the preview password; RSVP refuses a diet that does not add up; reset does not create an account for an unknown email. No horizontal overflow on the phone width.

### Boundaries

- The sample wedding is now also stored in MongoDB. This milestone’s screens for Aanya remain the designed walkthrough.
- Password reset does not send email. Share on WhatsApp opens WhatsApp with a prefilled message; it does not use the WhatsApp Business API.
- The preview session lives in this browser only for the older helper tests. The family app itself now uses a database session.

## 3. Family data in MongoDB

**Status:** Complete — Atlas `wedding-home-dev`

**Recorded on:** 2026-10-14

### Implemented

- Local MongoDB is a single-node replica set so creating a wedding can run in a transaction. The database name is `wedding-home-dev`.
- Sign-up, sign-in, sign-out, and password reset use a session cookie. Passwords are bcrypt cost 12. The cookie value is stored as a SHA-256 hash.
- Creating a wedding writes the wedding and the first Admin membership together. Functions, households, tasks, expenses, vendors, and the Aanya sample wedding are stored in the collections from the database design.
- Aanya and Kabir still open the designed Stitch screens, including the guest site. A new wedding gets the working family screens: countdown, functions, guests, tasks, expenses, vendors, photos, website, details, members, and account. A household share link opens `/i/{token}` and can save an RSVP.
- Sample organisers still sign in with the preview password. An invited email joins that wedding when they create an account.

### Validation

- 26 unit tests passed.
- Signed in as Aanya in the browser and opened the designed dashboard (65 days, Haldi next). Signed out to the public homepage. Created a new account, saved Meera Iyer and Arun Kapoor in Dehradun on 14 February 2027, added the wedding function with a map link and muhurat, and added a household. The dashboard then showed 123 days, 1 function, and 1 household.

### Boundaries

- The dev database is now Atlas (`wedding-home-dev` on the `ai.dxorkhr` cluster). Production still must use the database name `wedding-home`, and this app refuses that name outside production.
- Seeded on 2026-10-14: one wedding (Aanya Sharma and Kabir Mehta, Jaipur, 18 December 2026), 5 functions, 3 households, 7 RSVPs, 4 tasks, 3 expenses, 3 vendors, and 5 gallery photographs. Seven organisers. Three Admins: Aanya, Kabir, and Aryan (`aryanjstar3@gmail.com`). Managers include `aryanjstar4@gmail.com` and `22bcs018@iiitdwd.ac.in`. Every seeded account signs in with the preview password.
- The four `@example.com` accounts still open the designed Stitch screens. The three real addresses open the same wedding from the database.
- Password reset asks for an email and sends a one-hour link. The reply is the same when the address is unknown. The link sets a new password and signs every session out. Member invitations email `/join/{token}`. A failed send keeps the invitation so an Admin can resend or withdraw it. A household invitation email is sent only when that household has an address, and the sent time is stored only after Resend accepts it.
- Resend has no verified domain on this key, so mail can leave only as `The Wedding Home <onboarding@resend.dev>` and only to `aryanjstar3@gmail.com`. Inviting any other address saves the invitation and reports that the email did not go out.
- A venue opens Google Maps search from the address. It does not yet store a latitude and longitude.
- New weddings do not publish a guest website. Aanya’s site remains the designed one. Each function page (`/w/aanya-and-kabir/haldi`, `mehendi`, `sangeet`, `wedding`, `reception`) has its own colour, calligraphy, pattern, and a Play/Mute tone that starts silent. Haldi is bandhani, Mehendi is a jaali, Sangeet is ghungroo, the wedding is a gopuram, and the reception is chhatris. The wedding line shows the date and muhurat once.
- Sign-up and password reset reject passwords shorter than 10 characters, longer than 128, or on the common-password list. Sign-in still accepts the seeded preview password. Auth, reset, member invitations, and household emails are rate limited in `rate_limits`.
- An Admin sees Members and Website. A Manager sees the rest of the wedding and, on a direct Members link, “Admins only.”
- Plan the wedding starts at `/plan`: couple, date, city, optional title and story, then the account. Checked on 2026-10-14 with separate weddings in Pune, Kochi, and Udaipur. Each account saw only its own wedding. A manager joined the Pune wedding and could not open Members or start a second wedding. The last Admin could not step down.
- Photographs for a new wedding can be uploaded. See milestone 4. Aanya’s designed gallery still uses the photographs already in the site.

## 4. Tasks, invites, gallery trial, and a published theme

**Status:** Complete — checked locally. Not deployed.

**Recorded on:** 2026-10-17

### Implemented

- The real-wedding dashboard counts households that have said yes.
- Tasks can be added, assigned to the signed-in organiser, filtered by All, Mine, and Done, and moved between to do, doing, and done.
- Household invites and RSVP were already stored. The guest link, WhatsApp share, and diet check stay as they were. A personalised reminder campaign is still later.
- An Admin can pick Traditional, Classical, Art, or Choreography, set an address, paste a YouTube or Vimeo link, and publish. Guests open `/w/{slug}` with no account. `/w/aanya-and-kabir` stays the designed sample, so a published wedding uses a different address.
- Photographs for the trial are stored in MongoDB (`media_objects`), not Cloudflare R2 or S3. JPEG, PNG, and WebP only, under 1.5 MB, up to 40 per wedding. Guests use `/g/{token}`. Organisers can turn guest upload off and remove a photograph they uploaded. Video waits until a private file bucket exists. This avoids a payment method. The architecture still names S3 as the later store.

### Validation

- 35 unit tests passed. Typecheck passed. Lint passed.
- Signed in through the API as the Jaipur Admin: the dashboard reported 1 reply, a task moved to done, a JPEG uploaded and downloaded, and `PATCH /api/wedding/site` published `aanya-kabir-jaipur`. The trial photograph and the extra task were removed afterwards.
- In the browser, as the Kochi admin, added a task, saw it assigned, opened Photos (upload, guest-upload toggle, copy link), and selected Traditional on Website. Opened `/w/aanya-kabir-jaipur` and saw Jaipur, the five functions, and Open in Google Maps. The Kochi task was removed afterwards.
- On 2026-10-17 a second pass created Meera Iyer and Arun Kapoor in Udaipur and walked signup, a wrong password, one wedding per account, functions with a Maps link, a household invited only to the wedding, an RSVP that refuses a bad diet and too many people, the attending count, the dashboard, a finished task, a rupee expense, a vendor, gallery upload and the guest-upload switch, publish and unpublish, a Manager invitation, last-Admin protection, and isolation from the Jaipur wedding. Resend delivered the household invite, the organiser invite, and the password reset from `The Wedding Home <onboarding@aryanjaiswal.in>`. The same wedding was then opened in the browser: 399 days, Haldi next, Sharma family “3 yes”, and the Traditional guest site. Reminder campaigns are still later.

### Boundaries

- No Vercel deployment in this step. Production must use the database name `wedding-home`. Local stays on `wedding-home-dev`.
- Reminder batches and a personalised email form are not built.
- Nearby vendor search is still a Google Maps link, not Places.
- Gallery video, albums, and a printed QR image are not in this trial.

## 5. Rebuilt family app, all seven slices, themed guest site with music

**Status:** Complete — end to end. Nearby vendor search waits on a valid Google key.

**Recorded on:** 2026-10-18

### Why

The earlier screens saved some things and then crashed (`event.currentTarget` read after an `await`), mixed a fake in-browser preview store with real data, could not edit or delete most records, had an uneven layout (sidebar ending mid-page, oversized checkboxes, run-together rows), and gave real weddings a plain list instead of a themed site. Reminders, per-function RSVP, caterer totals, site content, per-function themes, vendor search, gallery albums, QR, and the e-card were missing.

### Implemented

- **Structure.** The single 1,100-line service is split into `src/modules/{access,events,guests,reminders,tasks,expenses,vendors,website,gallery}`; `home` keeps auth, account, wedding, members, and the dashboard. Every route handler is the same thin shape (`src/server/http/route.ts`). `weddingId` always comes from the membership. The in-browser preview store (`src/data/preview.ts`) and the 1,100-line `views.tsx` are gone.
- **Family app.** A design system (`src/components/ui`, `src/styles/app.css`): a full-height maroon sidebar with the couple, the date, and a countdown; grouped navigation from the page map; Admin-only items hidden for a Manager; drawers to add and edit; toasts; confirm dialogs; a password eye on every password field; a ₹ input with Indian grouping and lakh/crore hints; a phone menu.
- **Dashboard.** Countdown to the primary function (or the wedding date) with the muhurat, the next function, replies in, people coming, tasks done, rupees spent, functions, tasks due in two weeks, spend by category, and a setup checklist.
- **Events.** Add, edit, delete with a confirmation when households are invited. Kind shortcuts (Roka to Reception, Custom), end time, primary date and muhurat, venue, address, city, what it is, what to wear, how to reach, parking. A keyless Google map below the venue and Open in Google Maps. A city alone is not a venue, so it gets no map. Per function: invited, silent, no, yes, and veg / non-veg / Jain totals.
- **Guests.** Households with side, max people (stepper), mobile (normalised to +91), email, notes, and invited functions. Edit and delete; removing a function someone answered asks first. Per-function reply chips. WhatsApp opens the household's own chat when there is a phone, else the chat picker, with that household's link. Copy link, email the invitation, and download a WhatsApp e-card PNG (rendered on demand). Panels on the same page: Reminders and Caterer counts.
- **Reminders (slice 3).** `email_jobs` as in DATABASE §5.14: please-RSVP 1 month / 1 week / 1 day before that function, see-you-soon 1 day before, a 36-hour window, households added after a slot skip it, unique dedupe key, atomic claim, 3 attempts. Send-now to everyone silent (or everyone coming) for a function, one household by email, or WhatsApp reminder text. A daily Vercel Cron calls `/api/internal/reminders` with `CRON_SECRET`. `scripts/run-reminders.ts` runs it by hand, optionally at a pretend time.
- **Tasks.** To do / doing / done board, quick add, tick to finish, assignee (any organiser, Manager included), priority, due date, function, notes, delete. Filters: All, Mine, Unassigned, Done, and by function. Removing a member unassigns their tasks.
- **Expenses.** Spend log in whole rupees with category, function, a saved vendor or a free-text payee, notes; edit and delete; total and category breakdown; filters. Not a budget.
- **Vendors.** My vendors with contact, phone, email, website, address, agreed price, functions, notes, and how much has been paid to them from the spend log. Find nearby runs Google Places (New) Text Search on the server near a function venue or the city, shows rating, distance, and contact, and saves through `POST /api/vendors` with `place` (the server refetches the place). Deleting a vendor keeps the name on its expenses.
- **Photos & videos.** Stable gallery link and an on-demand QR (PNG or SVG), gallery open/closed, guest upload on/off, multi-file upload with an album per function, album filter, hide/show, download, delete. Guests see albums, upload from the phone, and a calm closed page when the gallery is off.
- **Website & themes (Admin).** Four packs, each with its own music; per-function world (Haldi, Mehendi, Sangeet, Wedding, Reception, Roka/engagement), music, and accent colour with Listen; slug; publish / unpublish; YouTube or Vimeo Live; two helplines; meet the families; stay; blessings or gift note; aashirwad wall.
- **Guest site.** `/w/{slug}` home (countdown, story, function cards in each world, families, stay, helplines, live, aashirwad) and `/w/{slug}/{eventId}` function pages in their own colour, Devanagari script, motif, and motion, with the venue map. `/i/{token}` personal invitation: only the invited functions, each in its world, attending count only, and RSVP per function with yes/no, people, and veg / non-veg / Jain steppers that must add up. All-or-nothing validation, a second reply replaces the first. Preview as guest opens the same site and a test invitation that never saves.
- **Music.** `src/components/guest/sound-engine.ts` synthesises original phrases in the browser (rights-cleared by construction): Bilawal with dhol, Bhimpalasi on santoor with dadra, Yaman on sitar with tabla and ghungroo, Shankarabharanam as nadaswaram with temple bells, tanpura, Bhairavi shehnai, Des sitar, Kafi santoor, and dhol-bhangra. It starts muted. Once a guest turns it on, the choice is remembered and the music crossfades as they move between functions (and as they scroll through the invitation).
- **Account.** Change name, change password (signs out other devices), forgot-password link, leave the wedding (the last Admin cannot), sign out.

### Validation

- `npm test`: 41 unit tests, including the new rules in `src/modules/rules.test.ts` (phones, RSVP rules, the reminder clock, embeds, rupees, theme isolation, return paths).
- `npm run typecheck`, `npm run lint`, and `next build` pass.
- `npm run e2e` (Playwright, `tests/e2e/journey.spec.ts`, against the Atlas dev database): 15 steps pass as an Admin, a Manager, a second family, and a guest on a phone — plan a wedding, four functions with maps and a muhurat, households with WhatsApp links and the e-card, a real invitation email, a guest RSVP per function that refuses a diet that does not add up and more people than allowed, caterer totals, a real send-now reminder through Resend, delete confirmation, tasks, vendors and expenses in rupees, photo upload with albums, hide, QR, guest upload and closing the gallery, pack and per-function music, publish and unpublish, the public site with sound carried across function pages, the preview invitation, a Manager joining by invitation with the right pages and 403 on Admin APIs, promoting and demoting, the last Admin, another wedding getting 404 on this one, one wedding per account, password change with the eye, a wrong password, reset request, and no horizontal overflow at 390 px.
- Scheduled reminders run at a pretend time one week before a Sangeet: 6 planned and 6 delivered by Resend; a second run planned 0.
- The same journey passes against production, https://the-wedding-home.vercel.app, on 2026-10-18. Running it there first found two real bugs that the dev machine hid: a household saved before the functions loaded was invited to nothing, and photos sent straight to Vercel Blob lost their album. Both are fixed. The production run leaves a demo wedding (Meera & Arun, Udaipur, published at `/w/meera-arun-14022027-2`) and a second family's wedding (Kochi). Three earlier, interrupted runs left partial demo weddings under the `+admin-live`, `+admin-demo`, and `+admin-home` plus-addresses.

### Boundaries and deviations

- **Nearby search:** Google answered "API key not valid" for `GOOGLE_PLACES_API_KEY`. Superseded by milestone 6, which moves search to OpenStreetMap. The page then says discovery is unavailable and offers Open in Google Maps. Set a key with Places API (New) enabled, locally and on Vercel.
- **Maps:** the venue map is the keyless Google Maps embed from the venue, address, and city. API.md asks for latitude and longitude from place autocomplete; that waits for a browser Maps key.
- **Files:** still Vercel Blob (when `BLOB_READ_WRITE_TOKEN` is set) or MongoDB under 4 MB, not S3 with upload intents. The gallery list is one response of up to 2,000 items, not the cursor list in API §7.12, and download goes through the file route rather than a signed URL.
- **Reminder queue response** returns `silent` and `yes` lists instead of one paged `items` list.
- **Cron** is daily (Vercel Hobby). The 36-hour window covers it.
- A second Vercel project named `frontend` is connected to this repository and has failed on every commit since before this change. The live site is the `the-wedding-home` project, which deploys.
- The designed `/w/aanya-and-kabir` sample keeps its own pages; its function pages now use the new music engine. Seeded dev organisers still sign in with the preview password.

## 6. Homepage, music on by default, OpenStreetMap vendor search

**Status:** Complete — end to end

**Recorded on:** 2026-10-18

### Implemented

- **Homepage** (`src/components/home-page.tsx`, `src/styles/home.css`): a maroon-and-gold hero with a marigold toran, the couple in a mehrab arch, and floating cards that show the product (countdown and muhurat, a household's reply with diet, the WhatsApp invitation, the function's music); a strip of the functions in Devanagari; each function's world with a Listen button; a feature bento for the family; family and guest columns; three steps in Devanagari numerals; photographs in arches; a closing call to action. No invented numbers or testimonials.
- **Music on by default.** Every function plays a piece chosen for its occasion; the wedding pack plays on the site's home. Browsers allow sound only after a touch, so it starts on the guest's first tap or key; the button reads “Tap for music” until then and always mutes after. A mute is remembered. The designed Aanya sample uses the same player.
- **Music library: 22 original pieces**, synthesised in the browser. North: Bhairavi shehnai, baraat shehnai and dhol, pheras with shankh and bells, boliyan on dholak and chimta, Bilawal flute and dhol, ghoomar in Raga Mand on sarangi, Bhimpalasi santoor, Pilu sarangi, Yaman sitar with tabla and ghungroo, garba with dandiya, bhangra, qawwali with harmonium and taali, Des sitar, Kafi santoor, Bageshri bansuri, tanpura. South: Kalyani nadaswaram with thavil, kettimelam, Shankarabharanam nadaswaram, Mohanam veena with mridangam, Hamsadhwani flute, kolattam sticks. New voices: sarangi, harmonium, veena; new percussion: dholak, mridangam, thavil, manjira, dandiya, taali, shankh. Admins pick any piece per function, grouped North and South.
- **Best piece per occasion** (`occasionMusic` in `src/data/worlds.ts`), recorded in PRD §11. A new **Pheras (North)** world (sindoor and gold, mandap and agni) is now the default for a wedding; the temple world becomes **Wedding (South)** with nadaswaram and thavil.
- **OpenStreetMap instead of Google Places** (`src/server/maps/osm.ts`): Nominatim stores coordinates for each venue on save, and nearby vendor search combines Photon name searches and Nominatim category searches around the venue, nearest first, with OSM attribution. Saving reads the place back by its OSM id. The venue map stays Google's keyless embed with Open in Google Maps.
- **Docs:** ARCHITECTURE v1.5, DATABASE v1.2, API v1.2, and PRD v1.5 record Vercel Blob (with the reason and the way back to S3), OpenStreetMap, venue coordinates, and music on by default. The playbook gains “prove each slice in a real browser” and the provider rule; the cross-check and AGENTS templates and this repo's AGENTS.md require the browser journey before a merge.

### Validation

- All 22 pieces played in Chrome through an analyser: every piece sounds, no errors, peaks under 0.55 after levelling.
- Vendor search near the Jaipur Haldi venue returned real places in 1 to 4 seconds (caterers 786 m and 953 m away, florists at 1.7 km, marriage gardens, salons); saving one copied its website and address, and saving it again was refused.
- Homepage: no horizontal overflow at 1440 and 390 px, no hydration warnings.
- `npm test` 41 passed; typecheck and lint clean; the 15-step browser journey passed locally and on production with music on by default, the mute remembered across a reload, the per-function piece following the guest from the site home to Haldi to Sangeet.

### Boundaries

- OpenStreetMap's Indian listings are thinner than Google's and have no ratings. Public Overpass servers were too slow or throttled and are not used. Nominatim is limited to one request a second per server instance.
- A phone in silent mode or with no audio device shows “Music on” but cannot play; the mute still works.

## Upcoming development

S3 with upload intents for very large galleries, and a paged gallery list. Optional: a hosted geocoder or Places key if OpenStreetMap coverage is too thin for a city.

## Updating this document

- Update the current position, the milestone table, and the date when a major feature progresses.
- Add a numbered milestone for each new major feature. Record status, date, what was implemented, what was actually checked, and what is still out of scope.
- Keep earlier milestones. Note a follow-up on the milestone it changes.
- Use statuses such as **In progress**, **Complete — UI with sample data**, or **Complete — end to end**. Do not mark unverified work as complete.
- Do not write credentials, tokens, or connection strings here.
