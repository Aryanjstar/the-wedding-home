# The Wedding Home

The operating system for Indian marriages. The family plans the week in one place. Guests open a link.

Live: [the-wedding-home.vercel.app](https://the-wedding-home.vercel.app)

## What it does

- A wedding with bride, groom, date, and city, and a countdown.
- Functions from Haldi to reception, each with a venue that opens in Google Maps.
- Household invitations by WhatsApp or email, and an RSVP with veg, non-veg, and Jain.
- Shared tasks, a spend log in rupees, and the people you hired.
- A published guest site in Traditional, Classical, Art, or Choreography, with an optional YouTube or Vimeo link.
- A private gallery for photographs and videos. Guests use one link and do not make an account.
- Mail leaves as `The Wedding Home <onboarding@aryanjaiswal.in>`.

People who organise sign in. After that, the wedding shows them what they can do. Guests never see a sign-in.

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
npm test
npm run typecheck
npm run lint
```

`MONGODB_URI` must use the database `wedding-home-dev` locally. Production on Vercel uses `wedding-home`. A push to `main` redeploys [the-wedding-home.vercel.app](https://the-wedding-home.vercel.app).

## License

[MIT](LICENSE)
