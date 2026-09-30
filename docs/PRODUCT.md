# The Wedding Home — product spec

**Tagline:** The operating system for Indian marriages.  
**Name:** The Wedding Home (where the family runs the wedding, and where guests visit).  

This file is the locked vision. The [PRD](./PRD.md) is what we implement against. [ARCHITECTURE.md](./ARCHITECTURE.md) is how it runs. The [playbook](./PLAYBOOK.md) is how we got here and how we will do the next product.

## Who this is for

People who **organise** the wedding (they log in):

- Bride, groom, parents, siblings, close family, trusted friends

They are **Admin** or **Manager**. A wedding can have **many of both**.

Guests do **not** log in. They use the invitation link.

## Two surfaces

1. **Family app** (login) — organisers. Roles: **Admin**, **Manager**.
2. **Guest website** (no account) — public wedding home **and** personal RSVP links.

One user, one wedding in this version.

## Shared data (locked)

Every Admin and every Manager sees the **same** wedding: events, guests, tasks, expenses, vendors, gallery.

There are **no** private expenses, private tasks, or department-specific permissions.

## Who can do what

| | Admin | Manager |
|---|---|---|
| Events, guests, tasks, expenses, vendors (map), photos/videos, wedding details | Yes | Yes |
| Preview as guest | Yes | Yes |
| **Members** — invite, remove, change Admin/Manager | **Yes only** | No |
| Website, themes, publish, live URL | Yes | No |

Last Admin cannot leave until another Admin exists.

## Guests (invitation link, no account)

- Open their wedding invitation
- See only events they are invited to
- RSVP (family count, veg / non-veg / Jain / no onion-garlic)
- See **how many** people are attending those events (numbers, not other families’ names)
- View wedding information (story, timeline, helplines, stay list)
- Venue **map** on each function (shown on the event, below the address). Tap pin or Open in Google Maps to go there
- Receive invite via **Share on WhatsApp** (prefilled message + their unique URL)
- View the private gallery and **see everyone else’s** photos and videos
- Upload photos and videos (QR or link)
- Live tab when a URL is pasted

## Family pages

Dashboard · Events (venue map → Google Maps) · Guests (Share on WhatsApp, email send, reminders) · Tasks · Expenses (spend log, not a budget) · **Vendors (My vendors + nearby search)** · Website & themes (Admin) · Preview as guest · Photos & videos · Wedding details · Members (Admin) · Account

## Guest pages

Public wedding home (slug) · Personal invite + RSVP · Per-function page (theme + venue map → Google Maps) · Live · Shared gallery / QR upload

## Layers (build in this order)

1. Auth, wedding, members, events (bride + groom names, date, city, muhurat, venue map → Google Maps, password reset)
2. Guests, invite, RSVP (household, family count, diet including non-veg, attending **count**, **Share on WhatsApp**, optional email send)
3. Reminders — 1 month / 1 week / 1 day before **that function**, plus send-now (email + copy WhatsApp)
4. Tasks (priority, filters), expenses (INR categories, spend log **not** a budget)
5. Theme studio, public site, YouTube live **embedded on our site**, e-card, helplines, stay list, meet the families, aashirwad
6. Nearby vendor search + **My vendors** (contacts, agreed cost, no booking)
7. Shared gallery: photos **and** videos, optional albums by function, stable QR, hide/delete, guest upload on/off

## Theme studio

Wedding pack + per-function override. Packs: traditional, classical, art, choreography. Tokens: palette, type, motion, background, audio, video. Family-uploaded or rights-cleared media only. Skill: `indian-wedding-themes`.

## Shaadi fields (not extra menus)

Muhurat · diet on RSVP (veg / non-veg / Jain / no onion-garlic) · two helplines · how to reach / parking / what not to wear · venue map → Google Maps on each function · Share on WhatsApp (prefilled + unique invite URL) · suggested stay as text · meet the families · 3–4 lines what this function is · aashirwad wall · WhatsApp e-card image · optional blessings-only / UPI note

## Not this version

WhatsApp Business API · SMS · push · our own livestream · vendor **booking/payments** · seating · hotel booking · flights / pickups · shagun accounts desk · private money by family side · guest native app · public list of guest **names** · budgets / split expenses · planner multi-wedding accounts · custom domains · AI

## First slice (next build)

A family can sign up, create a wedding (bride, groom, date, city), add Haldi / Sangeet / wedding / reception, see each function on a map that opens Google Maps, and see the dashboard countdown.
