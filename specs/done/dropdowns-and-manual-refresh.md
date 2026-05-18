# Dropdowns + Manual Refresh

> **Status:** Additions to the Website Tracker Dashboard. Assumes [`base-dashboard.md`](./base-dashboard.md) is built (Express server, Graph integration, `/api/data`, `/api/cell`, `/api/row`, stage circles, invoice badge, "+ Add Client", toast system).
>
> **Data source:** SharePoint Excel workbook in `CampaignManagementTeam → Website_Tracker`. Columns: A=Client, B=Invoice Paid, C–N=**12 stages**, O=Last Updated (ISO).
>
> **Brand:** All colour and font values come from [`docs/brand-tokens.md`](../../docs/brand-tokens.md). Where this spec references explicit hex/font values below, they're shown for clarity — implement using the CSS variables (`--cv-*`, `--sys-*`) defined in that doc, not hard-coded hex.

---

## 1. Dropdown selectors for each stage field

When a team member clicks any stage circle or field, the inline editor must show a DROPDOWN as the primary input — not just a date picker.

### Dropdown options for every stage field (cols C–N)

Four options:

| Icon | Label | Cell value |
|------|-------|------------|
| ○ | Not started yet | `""` (blank) |
| ✓ | Mark as done — today | today's date |
| 📅 | Pick a specific date | opens flatpickr |
| — | Not applicable / N/A | `"No"` |

**Behavior per option:**

- **Mark as done — today** → writes today's date, closes dropdown, circle turns yellow (complete), fires PATCH.
- **Pick a specific date** → flatpickr calendar appears inline below the dropdown; user picks date → saves → circle turns yellow.
- **Not applicable / N/A** → writes `"No"`, circle becomes dashed outline (skipped state), fires PATCH.
- **Not started yet** → clears the cell (writes `""`), circle returns to grey (pending), fires PATCH.

### Dropdown for Invoice Paid (col B)

Replace the toggle button with a visible dropdown:

| Icon | Label | Cell value |
|------|-------|------------|
| ✓ | Invoice paid | `"Yes"` |
| ✗ | Invoice not paid | `"No"` |

Instant visual update on the row badge.

### Dropdown styling (Construct Virtual brand)

Tokens (see [brand-tokens.md](../../docs/brand-tokens.md)):
- Background: `--cv-white`
- Border: `1px solid var(--cv-yellow)`
- Border-radius: `6px`
- Font: Source Sans Pro Light 14px (brand body), color `var(--cv-dark-grey)`
- Hover row: background `var(--sys-yellow-tint)`
- Selected row: background `var(--cv-yellow)`, color `var(--cv-dark-grey)`, Source Sans Pro Semi Bold (`font-weight: 600`)
- Width: 220px, appears directly below the clicked element
- Close: clicking outside dismisses it (click-away listener)
- Close: pressing Escape dismisses it

### Dropdown for Add New Client

When "+ Add Client" is clicked, a new row appears with:
- Text input for Client Name (auto-focused)
- Invoice dropdown (default: "Invoice not paid")
- All **12** stage dropdowns defaulting to "Not started yet"
- Save button (`--cv-yellow` background): "Add Client" → POST `/api/row` (per base spec)
- Cancel link: removes the row without saving

---

## 2. Manual refresh / update button

### "Refresh Data" button in the header bar

Position: right side of header, next to "+ Add Client"

Style (tokens per [brand-tokens.md](../../docs/brand-tokens.md)):
- Background: transparent
- Border: `1px solid var(--cv-cool-grey)`
- Color: `var(--cv-cool-grey)` (subtle on `--cv-black` header)
- Font: **Montserrat Regular** (brand), 12px, uppercase, letter-spacing `0.15em` — i.e. the `.cv-btn` class
- Icon: refresh/sync icon to the left of text
- Text: `"REFRESH DATA"`
- Hover: border-color `var(--cv-yellow)`, color `var(--cv-yellow)`
- Active/spinning: icon rotates 360° (CSS animation), button disabled during fetch

> Companion brief said "Montserrat 600, 10px"; brand guideline specifies **Regular (400), 14pt** for buttons. We follow brand. If a heavier weight is required for this one button, raise as an open question — don't introduce a one-off.

### What "Refresh Data" does

1. Button icon starts spinning (CSS rotate animation, 600ms loop).
2. Button text changes to `"SYNCING..."`.
3. Fires `GET /api/refresh` → forces fresh download from SharePoint (bypasses the 60-second server cache).
4. **On success:**
   - All dashboard sections re-render with new data.
   - Button stops spinning, text returns to `"REFRESH DATA"`.
   - "Last synced" timestamp updates to right now.
   - If data changed: green toast `"✓ Dashboard updated"`.
   - If no changes: grey toast `"↻ Already up to date"`.
5. **On failure:**
   - Button stops spinning.
   - Red toast `"✗ Could not reach SharePoint — check connection"`.
   - Shows last cached data (no data loss).

### `GET /api/refresh` route (server.js)

Forces a new Graph API call regardless of cache age. Returns same JSON structure as `GET /api/data`. Sets cache timestamp to now after successful fetch.

### Auto-refresh indicator (bottom of page)

Small text below the footer:

> `Auto-syncing every 30 seconds · Last sync: X seconds ago`

- Source Sans Pro Light 12px, color `var(--sys-muted)`
- The "X seconds ago" counter ticks live via `setInterval` every second.
- Turns `var(--sys-warn)` if last sync was > 2 minutes ago.
- Turns `var(--sys-error)` if last sync was > 5 minutes ago (likely connection issue).

---

## 3. "Mark all stages" quick action (bonus)

On each client row, add a small dropdown arrow `⌄` at the far right. Clicking opens a quick-action mini-menu:

| Icon | Action |
|------|--------|
| ✓ | Mark all stages done today |
| ↩ | Clear all stages (reset) |
| 📋 | Copy progress to clipboard |

**Mark all stages done today:**
- Inline confirm: `"Mark all 12 stages as done for [Client]? Yes / Cancel"`.
- On Yes: writes today's date to all blank stage cells in that row.
- Fires a single batched PATCH for all cells at once.
- All circles turn `--cv-yellow`, % complete jumps to 100%, row left border turns `--cv-orange` (brand has no green — Accent Orange is used to mark 100% complete; see [brand-tokens.md](../../docs/brand-tokens.md)).

**Clear all stages:**
- Inline confirm: `"Clear all stage dates for [Client]? This cannot be undone. Yes / Cancel"`.
- On Yes: writes `""` to all stage cells (C–N).
- Fires batched PATCH. Row resets to 0%, all circles grey.

### Batch PATCH route: `POST /api/batch-update`

Body:
```json
{ "clientRow": 2, "updates": [ {"col": 2, "value": "2026-05-18"}, {"col": 3, "value": "2026-05-18"} ] }
```

Server loops through `updates` and PATCHes each cell within a **single workbook session**. Close session after all cells written (not after each one — more efficient).

---

## 4. Editable client name

- Click any client name in the table → text input appears inline.
- Enter or click-away saves.
- Escape cancels.
- On save → PATCH col A for that row → toast `"✓ Client name updated"`.

---

## Summary of all interactive elements

Every field on the dashboard is editable:

| Field | Input type | Writes to |
|-------|-----------|-----------|
| Client name | Inline text input | Col A |
| Invoice status | 2-option dropdown | Col B |
| Each stage (×12) | 4-option dropdown (+ flatpickr if "pick date") | Cols C–N |
| Add new client | New row with all fields | Next empty row |
| Refresh button | Forces SharePoint pull | Read-only |
| Quick-action menu | Batch update all stages | Cols C–N |

**Every save:**
1. Optimistic UI update (instant).
2. PATCH to SharePoint in background.
3. Write ISO timestamp to col O (Last Updated).
4. Toast notification (success or error).
5. If error: revert UI to previous state.

---

## Dropdown component (reusable, `public/dropdown.js`)

Create a single reusable Dropdown class:

```js
class CVDropdown {
  constructor({ anchor, options, onSelect, width = 220 })

  // options format:
  // [
  //   { value: '',      label: 'Not started yet',         icon: '○',  style: 'normal' },
  //   { value: 'today', label: 'Mark as done — today',    icon: '✓',  style: 'action' },
  //   { value: 'pick',  label: 'Pick a specific date',    icon: '📅', style: 'normal' },
  //   { value: 'No',    label: 'Not applicable',          icon: '—',  style: 'muted'  }
  // ]

  open()   // positions dropdown relative to anchor, adds click-away listener
  close()  // removes dropdown, removes click-away listener
}
```

- Only one dropdown open at a time — opening a new one closes any existing one.
- Keyboard: Arrow keys navigate options, Enter selects, Escape closes.

Use `CVDropdown` everywhere — invoice toggle, stage circles, quick-action menu. Keeps all dropdown logic in one place and consistent across the dashboard.

---

## Prerequisites

- [`base-dashboard.md`](./base-dashboard.md) must be built and merged first.
- SharePoint Graph credentials populated per [`docs/sharepoint-setup.md`](../../docs/sharepoint-setup.md).
- `.env.example` cleanup (see same setup doc).
