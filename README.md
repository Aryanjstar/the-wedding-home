# The Wedding Home

The operating system for Indian marriages. The family plans the week in one place. Guests open a link.

Live: [the-wedding-home.vercel.app](https://the-wedding-home.vercel.app)

## What it does

**For the family (sign in, Admin or Manager):**

- A dashboard with the countdown, the muhurat, the next function, replies, tasks due, and rupees spent.
- Functions from Roka to Reception, each with a venue map that opens Google Maps, and veg / non-veg / Jain totals for the caterer.
- Households, not individuals. Each gets a private link to share on WhatsApp (their own chat when you have the number), by email, or as an e-card picture.
- Reminders 1 month, 1 week, and 1 day before each function, plus "send now" to everyone still silent.
- Tasks with a person, a date, and a priority. A spend log in rupees (not a budget). Vendors with the agreed price, and a nearby search on OpenStreetMap (no key needed).
- One shared photo and video gallery with a stable QR, albums per function, hide, and download.
- A guest website in Traditional, Classical, Art, or Choreography, where each function gets its own colours, motif, and music: 22 original North and South Indian pieces (shehnai, nadaswaram and thavil, dhol, dholak, tabla, mridangam, sitar, veena, santoor, sarangi, bansuri, harmonium, shankh). YouTube or Vimeo live on the site.
- Admins invite family, change roles, and publish the website. The wedding always keeps an Admin.

**For guests (no account, ever):** the wedding website, their personal invitation with a per-function RSVP, the maps, the helplines, live, and the gallery. Music is on by default, a piece chosen for each occasion, and follows them from Haldi to Sangeet; one tap mutes it.

Mail leaves as `The Wedding Home <onboarding@aryanjaiswal.in>`.

## Docs

| File | What it is |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Vision, page map, build order |
| [docs/PRD.md](docs/PRD.md) | Requirements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the app runs |
| [docs/DATABASE.md](docs/DATABASE.md) | Collections and indexes |
| [docs/API.md](docs/API.md) | HTTP contract |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | What is live, and what was checked |
| [AGENTS.md](AGENTS.md) | Rules for working in this repo |

## Local

Node 22. See `.nvmrc`.

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test          # unit tests
npm run typecheck
npm run lint
npm run e2e       # the whole journey in Chrome, against `npm run dev` and the dev database
```

`npm run e2e` creates real accounts and sends real mail to plus-addresses of `E2E_INBOX` (default `aryanjstar3@gmail.com`). Set `E2E_BASE_URL` to run it against another deployment.

Reminders go out from a daily Vercel Cron (`vercel.json`) that calls `/api/internal/reminders` with `CRON_SECRET`. To run them by hand: `npx tsx --env-file=.env.local --conditions=react-server scripts/run-reminders.ts`.

After a schema change, sync indexes with `npx tsx --env-file=.env.local --conditions=react-server scripts/db-indexes.ts`.

`MONGODB_URI` must use the database `wedding-home-dev` locally. Production on Vercel uses `wedding-home`. A push to `main` redeploys [the-wedding-home.vercel.app](https://the-wedding-home.vercel.app).

## License

[MIT](LICENSE)
