# Zero → working SaaS playbook

A repeatable path. The Wedding Home is the first time we ran it. Copy this file into a new repo when the next idea starts. Fill every stage before you write a lot of code.

Do not skip the **write-it-down** step. Chat is not the archive. Keep the dated journey log (`docs/journey/`) in the repo folder but out of git unless you decide to publish it; the method (this file) is what gets shared.

---

## Stage 0 — Capture the mess

**Goal:** Get the raw idea out without cleaning it.

Ask:

- Who hurts, and on what day of their life?
- What are they using today (Excel, WhatsApp, paper)?
- What would “it worked” look like for one real person?

**Write:** `docs/journey/YYYY-MM-DD-spark.md`

**The Wedding Home example:** “An operating system for Indian marriages” — many functions, cash, invites, RSVP, website, live, photos, family roles. Spoken, overlapping, not a spec yet.

---

## Stage 1 — Study the real process, not the competitor homepage

**Goal:** Understand the ritual / workflow from 0 to 100.

Ask:

- What are the actual steps in the world (Haldi → Sangeet → pheras, or whatever domain)?
- Who operates vs who only visits?
- What must never require an account?
- What is culturally specific vs generic SaaS?

**Write:** short notes + links in the journey log. Do not paste other products’ READMEs into your spec.

**The Wedding Home example:** Multi-event guest lists, household (not person), WhatsApp not email, veg/Jain food, muhurat, two families. Market size was context, not the product.

---

## Stage 2 — Cut v1 without killing the vision

**Goal:** Full vision on a canvas/spec; **layers** for shipping.

Ask:

- If we only finish three jobs, which three make it usable?
- What is distinctive (for us: theme studio, per-function music/video)?
- What is a different company (marketplace, native livestream)?

**Write:** `docs/PRODUCT.md` — in / later / never.

**The Wedding Home example:** Guests never log in. Reminders 1 month / 1 week / 1 day. Livestream = paste a URL. Themes grow forever on one token model.

---

## Stage 3 — Draw the pages before the database

**Goal:** Admin, manager, guest — every screen has a job.

Ask:

- Who may publish what the world sees?
- How do operators **preview** the guest experience?
- Public site vs secret invite link?

**Write:** page table in `docs/PRODUCT.md`.

**The Wedding Home example:** Admin publishes themes; Manager still Preview as guest. Public home + personal RSVP link. Countdown = wedding date (big) + next function (small).

---

## Stage 3b — Write the PRD before code

**Goal:** After the canvas looks good, expand the spec into requirements a builder can implement without inventing product.

Ask:

- What is the done-when for each slice?
- What objects exist (wedding, event, household, RSVP, …)?
- What must be true on every role and every guest link?

**Write:** `docs/PRD.md` — journeys, objects, functional requirements, acceptance criteria. Point PRODUCT.md at it. Do not add pages.

**The Wedding Home example:** Canvas signed off 20 Sep 2026; PRD v1.0 the same day. Slice 1 done-when stayed one sentence: sign up, create wedding, add functions, see countdown.

---

## Stage 4 — Cultural / domain texture pass

**Goal:** Fields that make it feel native, not translated from another country.

Walk the guest journey as a parent, an outstation cousin, an elder who only uses WhatsApp images.

**The Wedding Home example:** Muhurat, Jain food, two helplines, parking, what not to wear, aashirwad, e-card image, meet the families.

---

## Stage 5 — Name it

**Goal:** One name. Short. Say-it-aloud. Means something in the domain.

Give 5–20 options in **different kinds** (ritual word, object, colour, gathering, vow). Human picks. Then rename the folder and the chat.

**The Wedding Home example:** The place the family runs the wedding, and the site guests open. Tagline: operating system for Indian marriages.

---

## Stage 6 — Home for the work

**Goal:** One repo. Git. Journey log. Playbook. Product spec. Cursor rule to keep logging.

```text
~/Developer/<Name>/
  README.md
  docs/PLAYBOOK.md      ← this file
  docs/PRODUCT.md
  docs/journey/         ← dated log; gitignored by default (private), publish on purpose
  .cursor/rules/        ← always-on log reminder
```

Move the agent into that folder **before** scaffolding app code.

---

## Stage 7 — Build in slices (usable after each)

For The Wedding Home the slices are in PRODUCT.md. For any product:

1. Identity + empty home (auth, the “one workspace”)
2. Core objects of the domain
3. The outsider / guest / public surface
4. The loop that makes people come back (reminders, notifications)
5. Money or ops if needed
6. The distinctive layer (here: themes)
7. Deploy, measure, harden

A slice is done when a human can finish that job in the UI.

---

## Stage 8 — Deploy and keep the log

Ship a public URL early even if only slice 1 works. After every deploy, one journey entry: URL, what works, what does not.

---

## Anti-patterns (we already made some; do not repeat)

- Treating a fake deadline or fake scale as the product.
- Selling features on a homepage that do not exist in the app.
- Copying another codebase instead of using it as **inspiration**.
- Adding nav items instead of fields on existing pages.
- Leaving decisions only in chat.

---

## Checklist for a brand-new idea

- [ ] Spark written down
- [ ] Real-world process studied
- [ ] v1 vs later listed
- [ ] Page map (roles)
- [ ] PRD with acceptance criteria (after canvas sign-off)
- [ ] Domain texture pass
- [ ] Name chosen
- [ ] Repo + journey log started
- [ ] First slice defined in one sentence
- [ ] First deploy planned
