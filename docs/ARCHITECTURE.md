# Architecture and design notes

## Request flow

Browser → authenticated API routes → Drizzle → Cloudflare D1.

Application records are stored in `applications`; interview records in `interviews`. Each row contains a stable record ID prefixed with the verified owner ID, its owner, JSON data and update time. The JSON payload makes small feature additions possible without rewriting existing records. Owner-scoped queries prevent one user's records from being returned to another.

The application field `history` records status changes. The Kanban component delegates a move to the parent, which persists it and updates the UI only after success. A failed request leaves the card in its original stage. Demo moves use separate in-memory example records. “Undo” performs a new status change and therefore preserves an honest history.

Interview entries retain three answers separately: planned, actually given, and improved. Linking a question to an application copies display company/role into the interview entry, so notes remain understandable even after an application is deleted.

## Import flow

1. Normalise and validate the public URL.
2. If the URL belongs to a documented supported ATS, request the corresponding public JSON endpoint.
3. Otherwise fetch HTML, validate redirects, bound response size and request duration, and parse JobPosting JSON-LD or supported page metadata.
4. If a readable LinkedIn URL itself contains a role/company slug, offer labelled suggestions rather than pretending the page was read.
5. When network import fails, parse pasted text locally. No third-party AI service receives it.
6. Let the user review and save. Never infer that the user applied merely because a listing was scanned; status is editable.

Known public hiring domains avoid the old mandatory external DNS-over-HTTPS step. Other domains require successful public-address resolution and every redirect is revalidated. This is an application-level guard, not a substitute for infrastructure egress policy; DNS validation alone does not pin the later fetch's resolution. Production Workers must not be given private-network bindings. If migrating into a network with internal services, use an egress proxy with IP pinning or a strict destination allowlist.

## Tradeoffs and future work

- This is a personal tracker; concurrent edits from two devices currently use last-write-wins. Add version preconditions if simultaneous editing matters.
- The board changes stages; it does not persist arbitrary ordering inside a column.
- D1 JSON payloads are simple to extend; columns and indexes for frequently queried fields would improve large-scale analytics.
- CSV imports append new records; reimporting the same file can create duplicates.
- Site blocks cannot be solved reliably by generic HTML parsing. Additional official ATS APIs or a user-initiated browser extension are better future options than bypassing access controls.
- Add an authenticated storage integration test in your own deployed environment before relying on a new hosting setup.
- Independent hosting must replace ChatGPT Sites authentication with real user authentication and enforce ownership in each route.

## Verification scope

Automated tests exercise parser and fetch-pipeline behavior with controlled responses, plus input validation. Live importer smoke checks require a real public URL. UI checks use an isolated example workspace and do not alter the user's real applications or interview data.
