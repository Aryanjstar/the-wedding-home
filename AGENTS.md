<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# The Wedding Home

`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/API.md` are the source of truth. If code, a screen, or a reference repo disagrees with them, follow the docs and say so. Change those four files only when the human explicitly asks.

`docs/PRODUCT.md` is the page map and the slice order. `docs/PLAYBOOK.md` is how the next product repeats this. `docs/journey/` is the private log of what we actually did.

- Keep `src/app` to routes, layouts, and thin handlers. A handler parses, authenticates, validates with Zod, calls a service, and maps the HTTP result.
- Add a feature module under `src/modules` when its slice starts. Do not create empty modules, routes, or nav items ahead of that slice.
- Keep database connections, password hashing, session cookies, HTTP errors, and provider adapters in `src/server`. Keep env parsing in `src/config`.
- `weddingId` comes from the membership, never from the request body. Another wedding's id is `NOT_FOUND`.
- Money is integer rupees. Passwords are bcrypt cost 12. Session and one-time tokens are stored as SHA-256 hashes. Household and gallery links stay retrievable and are never logged.
- Do not add Redis, GraphQL, microservices, or a new dependency without a reason already written in the architecture.
- Build one PRODUCT.md slice at a time, on a branch. Cross-check tests and the four docs, merge to `main`, and push. Record the step in the journey log, and update the playbook or `docs/templates/` when the step taught a repeatable method.
