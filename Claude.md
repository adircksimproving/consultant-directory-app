# Consultant Directory App

Internal tool for delivery managers to search and browse consultants across the organization. Displays name, title, location, role type, and phone. Data is seeded in SQLite — no external HR system integration yet.

**Production:** https://consultant-directory-app-production.up.railway.app/
**GitHub:** https://github.com/adircksimproving/consultant-directory-app

---

## App Ecosystem

These three apps share a common auth layer (portal) and serve the same users (delivery managers, project managers). Before changing anything related to auth, routing, user identity, or navigation — check what portal does first.

| Repo | Local Path | Production URL | Role |
|---|---|---|---|
| `portal` | `~/Documents/projects/internal/portal-main` | https://portal-production-2c38.up.railway.app/ | Auth hub — login page and app dashboard |
| `revenue-analysis-app` | `~/Documents/projects/internal/revenue-analysis-app-main` | https://revenue-analysis-app-production.up.railway.app/ | Project financial tracking and forecasting |
| `consultant-directory-app` | `~/Documents/projects/internal/consultant-directory-app-main` | https://consultant-directory-app-production.up.railway.app/ | Consultant search and profile directory |

### Load sibling repos in a session

```bash
# Start with multiple repos
claude --add-dir ~/Documents/projects/internal/consultant-directory-app-main \
       --add-dir ~/Documents/projects/internal/revenue-analysis-app-main

# Add mid-session
/add-dir ~/Documents/projects/internal/portal-main
```

### Cross-repo rules

- Auth is owned by portal. Any login, session, or identity work must mirror the pattern portal establishes. The sign-out button and portal logo link use a `BASE_URL` variable in `home.html` — keep this pattern if updating navigation.
- Consultant name is the shared identity key between this app and `revenue-analysis-app`. Both apps have a `consultants` table with a `name` field. If you rename, reformat, or add identity fields here, check impact on `revenue-analysis-app/server/db.js` and flag it.
- Do NOT modify files in sibling repos unless explicitly asked. If a change here requires follow-up elsewhere, say so: "Follow-up needed in [repo]: [what and where]."

---

## This Repo: Structure & Key Files

```
consultant-directory-app/
├── home.html               # Single-page app: search, filter, consultant table + detail rows
├── server/
│   ├── index.js            # Express entry — static files + /api/consultants route
│   └── db.js               # SQLite schema init, seed data, migration logic
├── styles/
│   ├── layout.css          # Directory grid, table rows, detail panels, typography
│   └── account.css         # User button, avatar, sign-out button
├── assets/
│   └── improving-logo-simple.png
└── package.json            # express 5.2.1, better-sqlite3 12.9.0
```

**Read before making changes:**
- `home.html` — owns all frontend logic: fetching, filtering, rendering, row expansion, and the portal `BASE_URL` pattern
- `server/db.js` — owns the schema, seed data, and column migration logic; read this before touching data shape
- `server/index.js` — owns the Express setup and the single API endpoint

---

## Running Locally

```bash
npm install
node server/index.js
# Serves on http://localhost:3002
# data.db is auto-created in the repo root on first run
```

---

## Database Schema

SQLite via `better-sqlite3` (synchronous). Database file: `data.db` (gitignored, auto-created).

**`users` table**
```
id, email (unique), name, role
Seeded: austin.dircks@improving.com
```

**`consultants` table**
```
id, name, city, state, title, role_type, phone
Unique: name
```

The `db.js` migration logic adds missing columns (`title`, `phone`, `state`) if they don't exist — safe to run against older databases. Seed data is only inserted if the table is empty.

---

## API

**`GET /api/consultants`**
Returns all rows from `consultants`, sorted by `last_name`. No filtering, no pagination, no auth guard.

This is the only API endpoint. All search and filter logic runs client-side in `home.html`.

---

## Frontend Architecture (home.html)

Single HTML file, no module imports. Key behaviors:

1. On load: fetches `/api/consultants`, populates location and title filter dropdowns from the data.
2. Three-tier filtering: live text search by name, location dropdown, title dropdown. All run client-side against the full dataset.
3. Row click toggles an inline detail card. Only one detail card open at a time. Re-filtering closes open cards.
4. Avatar color is deterministic: a hash of the consultant's name maps to one of 8 colors — same name always gets the same color.

**`BASE_URL` pattern for portal navigation:**
```js
const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://portal-production-2c38.up.railway.app';
```
Portal logo and sign-out button use this. If portal's production URL changes, update this constant.

---

## Design System

Shared across all three apps — do not introduce new values without applying them consistently:
- Fonts: Poppins (headings), Khula (body) via Google Fonts
- Primary blue: `#005596`
- Hover background: `#f0f6ff` with `#005596` text
- Neutral grays: `#f8f9fa`, `#e5e7eb`
- Table grid: `2fr 1.5fr 2fr` (name, location, role)
- Detail panel: 4-column field grid

---

## Code Style

- Vanilla HTML, CSS, and JavaScript only. No frameworks, no bundler, no build step.
- Do not add npm packages beyond Express and better-sqlite3 without being explicitly asked.
- `const` and `let` only — never `var`.
- Named functions — no anonymous functions for anything non-trivial.
- No inline styles — CSS classes only.

---

## Constraints

- Do not add React, Vue, or any frontend framework. This is intentionally vanilla.
- Do not add authentication middleware or session libraries speculatively. When auth is implemented, it will use Entra ID via portal — wait for that work to be scoped.
- The `/api/consultants` endpoint has no auth guard by design (current state). Do not add per-endpoint auth patterns without coordinating the approach with portal first.

---

## Known Issues / Gotchas

- **No auth guard on the API.** Any request to `/api/consultants` returns all consultant data without authentication.
- **Schema uses `name` as the unique key for consultants.** Duplicate names will fail silently on insert. If a real HR system integration is added, this needs an external ID field.
- **All filtering is client-side.** Fine for the current dataset size; will need server-side filtering if the consultant count grows significantly.
- **`server/index.js` has no error handling.** A bad DB state will return an unformatted 500.

---

## Git Workflow

- Branch naming: `feature/short-description` or `fix/short-description`
- Commit messages: present-tense, imperative ("Add phone field to detail panel", not "Added...")

---

## Deployment

Hosted on Railway. No Dockerfile or railway.json needed — Railway infers Node.js from `package.json` and runs `npm start` → `node server/index.js`. The `PORT` environment variable is set by Railway automatically (default fallback: 3002).

`data.db` is created fresh on each Railway deployment. It is not persisted across deploys unless a Railway volume is attached. Current seed data is re-inserted on each cold start.

To verify production is healthy: https://consultant-directory-app-production.up.railway.app/
