# Base Dashboard

> Foundational build for the Website Tracker Dashboard. Read/write to a SharePoint-hosted Excel workbook via Microsoft Graph. Build this **before** [`dropdowns-and-manual-refresh.md`](./dropdowns-and-manual-refresh.md) — that spec augments parts of what's built here.
>
> Brand tokens (colours + fonts) live in [`docs/brand-tokens.md`](../../docs/brand-tokens.md). Don't restate values inline — reference token names.

---

## Goal

A single-page web dashboard for the Campaign Management team to track each client's progress through 12 onboarding/website stages. Data lives in one Excel workbook in SharePoint; the dashboard is the only UI that team members use to read or update it. No login screen — the app runs in a trusted network context with one shared Azure AD app identity on the server.

## In scope

- Express server with Microsoft Graph integration (app-only auth).
- One Excel workbook as the source of truth.
- `GET /api/data` — full snapshot, 60-second in-memory cache.
- `PATCH /api/cell` — single-cell write, also updates "Last Updated" (col O).
- `POST /api/row` — append a new client row.
- Vanilla JS frontend at `/` — table of clients, 12 stage circles, invoice badge, "+ Add Client" button.
- Polling: client fetches `/api/data` every 30 seconds.
- Toast notification system (used by all subsequent specs).
- Brand styling per [`docs/brand-tokens.md`](../../docs/brand-tokens.md).

## Out of scope (covered by [`dropdowns-and-manual-refresh.md`](./dropdowns-and-manual-refresh.md))

- Dropdown selectors, `GET /api/refresh`, `POST /api/batch-update`.
- Inline-editable client name, quick-action menu.
- Authentication for end users.

---

## Data model (Excel workbook)

- Worksheet name: **`Website Tracker`** (has a space — quote correctly in Graph URLs: `/worksheets('Website Tracker')`).
- 12 stages — confirmed.
- **Row 1 holds headers.** The 12 stage names live in row 1, columns C–N, and are read from the workbook at runtime — never hard-coded. Client rows start at row 2.

| Col | Header (row 1) | Type | Notes |
|-----|----------------|------|-------|
| A | Client | string | Client name (unique per row) |
| B | Invoice Paid | `"Yes"` \| `"No"` | Defaults to `"No"` for new rows |
| C–N | *(12 stage names — read from row 1)* | date string \| `"No"` \| `""` | Each cell: ISO date when stage completed, `"No"` if N/A, blank if pending |
| O | Last Updated | ISO timestamp | Server writes on every PATCH/POST |

A stage cell is in one of three logical states:

- **Pending** (`""`) → grey outline circle (`--cv-cool-grey`).
- **Complete** (date string) → yellow-filled circle (`--cv-yellow`).
- **N/A** (`"No"`) → dashed-outline circle (`--cv-cool-grey`).

% complete = `completed / (total - skipped)`, rounded. When 100%, row left border = `--cv-orange` (brand has no green; Accent Orange used — see [brand-tokens.md](../../docs/brand-tokens.md)).

**Workbook location:**
- Site: `constructvirtual.sharepoint.com / CampaignManagementTeam`
- Share link (for reference, NOT for runtime — Graph needs file ID): <https://constructvirtual.sharepoint.com/:x:/s/CampaignManagementTeam/IQB_vxevk9zZTqL_szYZctowAYfjQ3HjGGixkLPpDUalUW8>
- Resolve to `EXCEL_FILE_ID`, `SHAREPOINT_SITE_ID`, `SHAREPOINT_DRIVE_ID` per [`docs/sharepoint-setup.md`](../../docs/sharepoint-setup.md).

---

## Server

### Stack
- Node 20+, Express 4.
- `@azure/identity` (`ClientSecretCredential`) + `@microsoft/microsoft-graph-client` for Graph.
- No DB. In-memory cache only.

### Auth
Client-credentials flow (app-only). Token cached in process and refreshed before expiry.

### Routes

#### `GET /api/data`
Returns the current cached snapshot. If cache age > 60s, re-fetches the workbook before responding.

Response:
```json
{
  "fetchedAt": "2026-05-18T14:22:31.000Z",
  "stageNames": ["Discovery", "Wireframes", "Design", "Content", "Build", "Review", "QA", "SEO", "Training", "Launch Prep", "Launch", "Handoff"],
  "clients": [
    {
      "row": 2,
      "name": "Acme Corp",
      "invoicePaid": "Yes",
      "stages": ["2026-04-01", "", "No", "", "", "", "", "", "", "", "", ""],
      "lastUpdated": "2026-05-18T14:18:02.000Z"
    }
  ]
}
```

- `stageNames` is always a 12-element array, read from row 1 cols C–N of the workbook. (The example values above are illustrative — actual names come from the sheet.)
- `stages` per client is always a 12-element array, aligned with `stageNames` by index.

#### `PATCH /api/cell`
Body: `{ "row": 2, "col": 3, "value": "2026-05-18" }` (col is 1-indexed: A=1 … O=15).

Behavior:
1. PATCH the target cell via Graph (`/workbook/worksheets('{name}')/range(address='C2')`).
2. PATCH cell O (col 15) for the same row with `new Date().toISOString()`.
3. Invalidate cache (force next `/api/data` to re-fetch).
4. Return `{ ok: true, row, col, value }` or `{ ok: false, error }` (4xx/5xx).

Both writes happen inside one **workbook session** (`POST /workbook/createSession` with `persistChanges: true`, then close it after both PATCHes).

#### `POST /api/row`
Body: `{ "name": "New Client", "invoicePaid": "No", "stages": ["","","","","","","","","","","",""] }` (12 entries).

Behavior:
1. Locate the first empty row in the worksheet (Graph: `usedRange` → next row).
2. Build the full row array (A–O: name, invoice, 12 stages, ISO timestamp).
3. PATCH `range(address='A{n}:O{n}')` with the values.
4. Invalidate cache.
5. Return `{ ok: true, row: n }`.

### Cache
- Single in-memory object: `{ fetchedAt, clients }`.
- Stale at 60s. Any PATCH/POST invalidates immediately.
- No persistent storage — on process restart the next `/api/data` re-fetches.

### Error handling
- Graph 401 → refresh token, retry once.
- Graph 423 (locked) or 5xx → return 503 to client; client shows red toast.
- Validate inputs at route boundary (`row` int ≥ 2, `col` 1–15, `value` string). 400 on bad input.

### Config (`.env`)
```
PORT=3000
MS_TENANT_ID=
MS_CLIENT_ID=
MS_CLIENT_SECRET=
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=
EXCEL_FILE_ID=
EXCEL_WORKSHEET_NAME=Website Tracker
CACHE_TTL_MS=60000
```

---

## Client (vanilla JS)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Header — --cv-black]  WEBSITE TRACKER       [+ Add Client]│
├─────────────────────────────────────────────────────────────┤
│  Acme Corp   [✓ Paid]   ● ● ● ○ ○ ○ ○ ○ ○ ○ ○ ○   25%       │
│  Beta LLC    [✗ Unpaid] ● ● ● ● ● ● — ● ● ○ ○ ○   73%       │
│  ...                                                         │
├─────────────────────────────────────────────────────────────┤
│  Footer — small muted text                                   │
└─────────────────────────────────────────────────────────────┘
```

### State
- Single in-memory `state.clients` array, replaced on each successful `/api/data` poll.
- Render is full re-render on update (small dataset — ≤ a few hundred rows). No framework.
- 30-second `setInterval` polls `/api/data`; pauses while the tab is hidden (`document.hidden`).

### Stage circle visual states
See *Role assignments* in [`docs/brand-tokens.md`](../../docs/brand-tokens.md). Hover any circle → tooltip showing the stage name (from `stageNames[i]`) and the date (or "Not started" / "N/A"). Click → currently no-op (the dropdowns spec wires up the click handler).

### Column headers above stage circles
Render the 12 `stageNames` as a header row above the stage-circle columns, Source Sans Pro Semi Bold 12px, color `var(--cv-dark-grey)`, rotated 45° or wrapped at a sensible width — confirm visual approach during build.

### Invoice badge
Pill next to client name. `--cv-yellow` background `[✓ Paid]` if `"Yes"`, `--cv-cool-grey` background `[✗ Unpaid]` if `"No"`. Click → currently no-op (dropdowns spec replaces with dropdown).

### "+ Add Client"
Button in the header, brand primary CTA style (`--cv-yellow` background, `--cv-dark-grey` text, Montserrat Regular uppercase). For the base build: simplest possible — `prompt()` for a name, POST `/api/row` with `{ name, invoicePaid: "No", stages: Array(12).fill("") }`, re-poll on success. The dropdowns spec replaces this with the full inline form.

### Toast system
- Three variants: success (`--sys-success`), error (`--sys-error`), neutral (`--sys-muted`).
- Appears bottom-right, auto-dismisses after 3s, max 3 stacked.
- Single helper: `toast(message, variant)`.
- All later specs depend on this — must work before any of them ship.

---

## Typography & colour

All values from [`docs/brand-tokens.md`](../../docs/brand-tokens.md). Implementation must use the CSS variables defined there (`--cv-*` and `--sys-*`), not hard-coded hex values, so the brand can be revised in one place.

Fonts loaded via Google Fonts in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600&family=Source+Sans+Pro:wght@300;600&display=swap" rel="stylesheet">
```

---

## File layout

```
app/
├── server/
│   ├── server.js           # Express app, route wiring
│   ├── graph.js            # Graph client + token cache
│   ├── excel.js            # readWorkbook, patchCell, appendRow, withSession
│   ├── cache.js            # 60s in-memory cache
│   └── routes/
│       ├── data.js         # GET /api/data
│       ├── cell.js         # PATCH /api/cell
│       └── row.js          # POST /api/row
└── client/
    ├── index.html
    ├── style.css           # Imports brand tokens, layout
    ├── app.js              # Render loop, polling, event wiring
    └── toast.js            # toast(message, variant)
package.json
.env.example                # placeholders only — see Open Questions
```

---

## Done = all of the following

- [ ] `npm start` boots a server on `PORT`.
- [ ] Hitting `/` renders the dashboard with live SharePoint data, brand colours and fonts applied.
- [ ] All 12 stage circles render per client, in the three visual states.
- [ ] Polling every 30s replaces stale state without flicker.
- [ ] Clicking "+ Add Client" with a name POSTs a new row to the workbook and the new row appears in the next poll.
- [ ] Manually editing a cell in Excel (in SharePoint) shows up within ~90s in the dashboard (60s cache + 30s poll).
- [ ] PATCH/POST failures show a red toast and don't corrupt UI state.
- [ ] No console errors in the browser on load or after 5 minutes of idle polling.

---

## Resolved

- 12 stages, names read from row 1 cols C–N at runtime.
- Worksheet name: `Website Tracker`.
- Brand tokens locked — see [`docs/brand-tokens.md`](../../docs/brand-tokens.md).
- `.env.example` Anthropic key removed.
- **Polling pauses when tab is hidden** (`document.hidden` check) — resumes on visibility change.
- **Date cell format = Calendar (Excel Date).** Columns C–N are formatted as Date in the workbook. When the dashboard writes a completed-stage value, send it as an Excel-friendly date so the cell renders with the calendar format. Implementation: write `YYYY-MM-DD` strings and let Graph coerce against the column's Date formatting; verify after first PATCH that a calendar-icon date renders in Excel. If the column ever reverts to General/Text format, re-apply Date format on the column before next write (one-time admin action, not in code).
