# Nextstep

A personal job-search workspace designed to reduce the effort of maintaining an application spreadsheet.

## Features

- Kanban application board: Saved → Applied → Assessment → Interview → Offer → Closed.
- Mouse and touch drag handles, accessible “Move to” menus, status history, and undo for the latest move.
- Quick application entry, next steps, dates, notes, search, and CSV import/export.
- Job-link import through public job APIs (Greenhouse, Lever, SmartRecruiters), structured webpage data, and conservative title/URL suggestions.
- Local pasted-text extraction when a job website blocks scanning. Suggestions are always reviewed before saving.
- Private interview question bank: preparation, real interview answers, improved answers, feedback, company/application links, categories, tags, favourites, confidence, and practice mode.
- JSON export of interview notes.
- Example workspace for exploring the interface without a login or real application data.

## Stack

React 19 + TypeScript, Vinext (Next.js-compatible API), Vite, Cloudflare Workers, D1, Drizzle ORM, and Lucide icons. The original hosted version uses ChatGPT Sites for deployment and authentication. No AI API key is needed for the importer.

This project was built collaboratively with ChatGPT/Codex. The repository contains implementation and tests, not private job application records or interview answers.

## Run locally (Windows, macOS, Linux)

Use Node.js **22.13+** (Node 24 LTS recommended) and pnpm 10.

```sh
npm install --global pnpm@10
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed in your terminal, normally `http://localhost:5173/?demo=1`.

**Start with `?demo=1`.** This exercises the Kanban and interview screens without ChatGPT sign-in. Changes in the example workspace last only for the current session. Refreshing resets them. They are not your hosted records.

The exported project deliberately has no Sites project ID or credentials. Normal live-mode API calls reject requests without verified ChatGPT identity. Local demo mode does not disable authentication or change production permissions.

### Check your changes

```sh
pnpm typecheck
pnpm test
pnpm build
```

Optional public-network importer check:

```sh
node tests/live-scan.mjs "https://jobs.smartrecruiters.com/COMPANY/JOB_ID-job-title"
```

Use a real live vacancy URL. The normal test suite uses fixtures and makes no external requests. The live check runs the actual import pipeline, but does not save an application.

## Where to edit

| File | Purpose |
| --- | --- |
| `app/page.tsx` | Main workspace, applications, modal, navigation, CSV handling |
| `components/kanban-board.tsx` | Pointer dragging, stage columns, accessible move menus |
| `components/interview-bank.tsx` | Q&A editor, practice mode, search and exports |
| `app/globals.css` | Colours, spacing, desktop and mobile layouts |
| `lib/job-scan.ts` | HTML/JSON-LD parsing and local text extraction |
| `lib/scan-network.ts` | Public URL fetching, timeouts, redirects, API adapters |
| `app/api/scan-job/route.ts` | Signed-in link-import endpoint |
| `app/api/applications/route.ts` | Owner-scoped application CRUD |
| `app/api/interviews/route.ts` | Owner-scoped interview CRUD |
| `lib/interviews.ts` | Interview type and server-side validation |
| `db/schema.ts` | D1 tables |
| `drizzle/` | Versioned database migrations |
| `app/chatgpt-auth.ts` | Sites identity integration |
| `tests/` | Parser, network-flow, security guard and input validation tests |

Suggested learning sequence: change a colour in `app/globals.css`; edit a label in `app/page.tsx`; inspect the Kanban `onMove` flow; follow a saved interview from its form to the API and database.

## Create your GitHub portfolio repository

1. Create an **empty** repository named `nextstep-job-tracker` at https://github.com/new. Choose Public for a portfolio, or Private while learning. Do not add a generated README or .gitignore, because this project contains both.
2. Extract this ZIP and open the `nextstep-job-tracker` folder in VS Code.
3. Open the terminal in that folder and run:

```sh
git init
git add .
git commit -m "Build Nextstep job application and interview tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nextstep-job-tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your own GitHub username. Authenticate through GitHub's normal browser/credential-manager flow; do not paste tokens into source files.

Repository description suggestion: “A personal job-search app with a touch-friendly Kanban board, public job-link import, and a reusable interview preparation bank.”

Use **example data** for portfolio screenshots. The production link currently requires the owner's ChatGPT sign-in, so a public GitHub repository does not automatically make the live app public.

**GitHub and Sites are separate:** pushing to your GitHub repository does not automatically update the original ChatGPT-hosted app. Deployment integration or a hosting migration is a separate step. Keeping this source in GitHub gives you a version history and a place to learn and edit independently.

## Data, privacy, and backups

- D1 stores application and interview records. The database is separate from the source repository and is **not** included in this ZIP.
- Each API operation scopes records to the verified Sites user ID.
- CSV export covers applications; JSON export covers interview notes.
- Never commit exported personal records, `.env` files, `.dev.vars`, databases, tokens, or `.wrangler` state. Existing ignore rules cover common secret/runtime files; check before committing new files.
- A scanner reads only public job pages and documented public APIs. It does not log in to job platforms, forward your cookies, or submit job applications.

## Importer limitations and verification

A URL is not always enough: login walls, automated-access blocks, JavaScript-only pages, expired vacancies, and unknown formats can prevent extraction. Public API adapters reduce dependence on fragile HTML. URL-derived values and text-heading guesses are labelled as suggestions, not verified facts. Always review them.

Regression tests cover JSON-LD, nested graphs, multiple-vacancy safety, missing/blocked metadata, URL validation, public API routing, private-IP/redirect rejection, and interview input validation. A live Grab/SmartRecruiters listing was successfully fetched and parsed on 27 October 2026. That does not guarantee every listing or platform will work.

## Database migrations

Do not edit an already-applied migration. After changing `db/schema.ts`:

```sh
pnpm db:generate
pnpm build
```

For local persistence development, apply each pending migration to the local D1 instance, in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_bent_satana.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_uneven_roland_deschain.sql
```

These create local tables, but authenticated live-mode use still needs a suitable identity setup. Never add a client-supplied production user ID as an authentication shortcut.

## Hosting outside ChatGPT

This is not a static HTML app. Deploying to your own Cloudflare account requires Workers/D1 provisioning, migration application, and replacing the Sites-managed login with your own authentication and authorization. Vercel requires runtime/database adaptation as well. These steps are not performed by uploading the repository to GitHub. See `docs/ARCHITECTURE.md`.
