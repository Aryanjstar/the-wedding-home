# The Wedding Home

The operating system for Indian marriages.  
The place the family runs the wedding — and the site guests open.

This repo is early. The **plan and PRD are locked**; the app is not written yet.

## Start here

| File | What it is |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Locked vision, page map, layers |
| [docs/PRD.md](docs/PRD.md) | Build-ready requirements and acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modular monolith: Next.js, Atlas, S3, Resend |
| [docs/DATABASE.md](docs/DATABASE.md) | Collections, fields, indexes, integrity rules |
| [docs/API.md](docs/API.md) | HTTP contract: auth, errors, every endpoint |
| [docs/PLAYBOOK.md](docs/PLAYBOOK.md) | How to go from zero to SaaS (reuse for the next idea) |

## Idea in one breath

Family logs in (Admin / Manager). Many of both; **everyone sees the same wedding**. Guests never log in. Many functions, each with a map that opens Google Maps, colour, music. Personal RSVP links plus a public site. Share on WhatsApp with a prefilled invite and unique URL. Nearby vendor search on a map (find, don’t book). Shared gallery: guests see each other’s photos and videos. Reminders 1 month / 1 week / 1 day.

## Status

- [x] Idea, research, page map, name  
- [x] PRD (v1.3)  
- [x] Architecture v1.3 — one Next.js app, Atlas, S3, Resend  
- [x] Database design v1.0 and API design v1.0 (drafts for review)  
- [ ] Slice 1 — auth, wedding, events, dashboard  
- [ ] … through deploy (see PRODUCT.md layers)

## Local

App commands will land here when slice 1 exists. Node 20+ when we scaffold.

## License

[MIT](LICENSE)
