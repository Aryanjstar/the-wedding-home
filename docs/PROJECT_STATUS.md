# The Wedding Home — Project Status

**Last updated:** 2026-10-14

This is the progress log. Read it before building, and update it in the same change when a major feature is added or materially changed. Product scope stays in `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/API.md`. This file does not override them.

## Current position

The public site opens on **Plan the wedding**. The first screen asks for the bride, the groom, the date, the city, and an optional title and story. The next screen creates the account, and that person is the first Admin of that wedding only. Another email can plan a different wedding in the same Atlas database, `wedding-home-dev`. `aryanjstar3@gmail.com` is an Admin of the Jaipur sample. `aryanjstar4@gmail.com` and `22bcs018@iiitdwd.ac.in` are Managers there. A new password must be 10 to 128 characters and must not be a very common password. Password reset and invitation mail go out through Resend. With no verified domain, mail still leaves only to `aryanjstar3@gmail.com`. Clicking a function opens its own Indian stage: Haldi is bandhani and Bilawal, Mehendi is jaali and Bhimpalasi, Sangeet is ghungroo and Yaman, the wedding is a gopuram and Shankarabharanam, and the reception is chhatris with a tanpura drone. The sound starts silent. Nothing is deployed.

| Milestone | Status | Recorded on |
| --- | --- | --- |
| Application scaffold | Complete — foundation only | 2026-10-06 |
| Public homepage and screen preview | Complete — UI with sample data | 2026-10-14 |
| Family data in MongoDB | Complete — Atlas `wedding-home-dev` | 2026-10-14 |
| Vercel deployment | Not started | — |

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
- Photographs for a new wedding wait until storage is connected. Aanya’s gallery still uses the photographs already in the site.

## Upcoming development

Verify a sending domain at Resend before invitations can reach anyone except `aryanjstar3@gmail.com`. Deploy when a Vercel login is available. A map pin from a real place, and a published guest site for a wedding that is not the sample, are still open.

## Updating this document

- Update the current position, the milestone table, and the date when a major feature progresses.
- Add a numbered milestone for each new major feature. Record status, date, what was implemented, what was actually checked, and what is still out of scope.
- Keep earlier milestones. Note a follow-up on the milestone it changes.
- Use statuses such as **In progress**, **Complete — UI with sample data**, or **Complete — end to end**. Do not mark unverified work as complete.
- Do not write credentials, tokens, or connection strings here.
