# Consultant Directory App

An internal tool for delivery managers and project managers to search and browse consultants across the organization. Displays name, title, location, role type, and phone number. All filtering runs client-side against a full dataset fetched on load.

---

## Running the App

```bash
npm install
node server/index.js
```

Navigate to `http://localhost:3002`. On first start, the server creates a SQLite database (`data.db`) and seeds it with consultant records if the table is empty.

---

## Pages

| Page | File | Purpose |
|---|---|---|
| Directory | `home.html` | Single-page app: search, filter, consultant rows, and inline detail cards. |

---

## User Flows

### Search and Filter
1. Page loads and fetches all consultants from `/api/consultants`
2. Location and title filter dropdowns are populated from the data
3. Three filters run simultaneously, client-side:
   - **Text search**: matches any part of the consultant's name (case-insensitive)
   - **Location dropdown**: filters by city + state combination
   - **Title dropdown**: filters by job title
4. Results update live as filters change; re-filtering closes any open detail cards

### View Consultant Details
1. Click any row to expand an inline detail card below it
2. The card shows name, title, role type, location, and phone number
3. Only one detail card is open at a time — clicking a new row closes the previous one
4. Clicking an open row toggles it closed

---

## Data Model

```
users
  id, email (UNIQUE), name, role
  Seeded: austin.dircks@improving.com

consultants
  id, name (UNIQUE), city, state
  role_type, title, phone
```

The `db.js` migration logic adds missing columns (`title`, `phone`, `state`) with `ALTER TABLE` if they don't exist — safe to run against older databases. Seed data is only inserted when the consultants table is empty.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/consultants` | Return all consultants, sorted by last name. No auth guard, no pagination. |

This is the only API endpoint. All search and filtering logic runs in the browser.

---

## Frontend Architecture

Single HTML file (`home.html`) with no module imports or build step. Key behaviors:

- **Avatar color** is deterministic: a hash of the consultant's name maps to one of 8 colors, so the same name always renders the same color.
- **`BASE_URL` pattern** for portal navigation:
  ```js
  const BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://portal-production-2c38.up.railway.app';
  ```
  The portal logo and sign-out button both use this constant. Update it if portal's production URL changes.

---

## App Ecosystem

| App | Production URL | Role |
|---|---|---|
| Portal | https://portal-production-2c38.up.railway.app/ | Auth hub — login and dashboard |
| Revenue Analysis | https://revenue-analysis-app-production.up.railway.app/ | Project financial tracking |
| Consultant Directory | https://consultant-directory-app-production.up.railway.app/ | This app |

**Shared identity key:** Consultant `name` is the field that links this app to revenue-analysis-app. Both apps have a `consultants` table keyed on `name`. If the name format changes in either app, it must be coordinated across both.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Backend | Express 5.2.1 (Node.js) |
| Database | SQLite via better-sqlite3 |

---

## Project Structure

```
consultant-directory-app/
├── home.html               Single-page directory UI
├── server/
│   ├── index.js            Express entry — static files + /api/consultants route
│   └── db.js               SQLite schema init, seed data, column migrations
├── styles/
│   ├── layout.css          Directory grid, table rows, detail panels, typography
│   └── account.css         User button, avatar, sign-out button
├── assets/
│   └── improving-logo-simple.png
├── data.db                 SQLite database (auto-created on first run, gitignored)
└── package.json
```

---

## Deployment

Hosted on Railway. Railway infers Node.js from `package.json` and runs `npm start` → `node server/index.js`. The `PORT` environment variable is set by Railway automatically (default fallback: `3002`).

`data.db` is created fresh on each deploy and is not persisted across Railway deployments unless a volume is mounted. Seed data re-inserts on each cold start, so consultant records are reset on redeploy without a volume.

To verify production is healthy: https://consultant-directory-app-production.up.railway.app/

---

## Known Issues / Gotchas

- **No auth guard on the API.** Any request to `/api/consultants` returns all consultant records without authentication.
- **`name` is the unique key for consultants.** Duplicate names fail silently on insert. An external ID field will be needed before integrating a real HR system.
- **All filtering is client-side.** Fine for the current dataset size; server-side filtering will be needed if consultant count grows significantly.
- **No error handling in `server/index.js`.** A bad database state will return an unformatted 500.
- **`data.db` is ephemeral on Railway without a volume.** Seed data survives cold starts but not redeploys unless a persistent volume is attached at the path `DB_PATH` points to.

---

## Git Workflow

- Branch naming: `feature/short-description` or `fix/short-description`
- Commit messages: present-tense, imperative ("Add state column to consultant table", not "Added...")
