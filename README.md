# The Wedding Home

The operating system for Indian marriages.  
The place the family runs the wedding — and the site guests open.

This repo is early. The **plan and PRD are locked**. The app shell runs; slice 1 is next.

## Start here

| File | What it is |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Locked vision, page map, layers |
| [docs/PRD.md](docs/PRD.md) | Build-ready requirements and acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modular monolith: Next.js, Atlas, S3, Resend |
| [docs/DATABASE.md](docs/DATABASE.md) | Collections, fields, indexes, integrity rules |
| [docs/API.md](docs/API.md) | HTTP contract: auth, errors, every endpoint |
| [docs/PLAYBOOK.md](docs/PLAYBOOK.md) | How to go from zero to SaaS (reuse for the next idea) |
| [docs/templates/](docs/templates/) | Empty shapes for the next product, including scaffold, Stitch, and git |
| [AGENTS.md](AGENTS.md) | Rules for anyone building in this repo. The four design docs win |

## Idea in one breath

Family logs in (Admin / Manager). Many of both; **everyone sees the same wedding**. Guests never log in. Many functions, each with a map that opens Google Maps, colour, music. Personal RSVP links plus a public site. Share on WhatsApp with a prefilled invite and unique URL. Nearby vendor search on a map (find, don’t book). Shared gallery: guests see each other’s photos and videos. Reminders 1 month / 1 week / 1 day.

## Status

- [x] Idea, research, page map, name  
- [x] PRD (v1.3)  
- [x] Architecture v1.3 — one Next.js app, Atlas, S3, Resend  
- [x] Database design v1.1 and API design v1.1, cross-checked 4 Oct 2026  
- [x] App scaffold — Next.js, TypeScript, Zod, Mongoose, local scripts  
- [ ] Slice 1 — auth, wedding, events, dashboard  
- [ ] … through deploy (see PRODUCT.md layers)

## Local

Node.js 22 (see `.nvmrc`). Node 20.19+ or 24+ also work. Node 23.0 does not: the lint toolchain rejects it.

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

The shell is at [http://localhost:3000](http://localhost:3000). `GET /api/health` returns `{ "ok": true }` and does not need MongoDB.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`MONGODB_URI` is read only when something opens the database. The database name in that URI must be `wedding-home-dev` locally and on preview. `VERCEL_ENV=production` must use `wedding-home`. Slice 1 wedding creation needs a replica set: Atlas (including the free tier) is one. A local `mongod` needs `--replSet rs0` and one `rs.initiate()`.

Feature modules (auth, wedding, events, and the rest) are added with their slice. This scaffold is the shared shell: config, the Mongo connection, password hashing, session cookie rules, and the error shape.

## License

[MIT](LICENSE)
