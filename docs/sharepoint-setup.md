# Azure AD + SharePoint setup

One-time setup. Result: six values in your `.env` that let the dashboard read and write the SharePoint Excel workbook via Microsoft Graph.

You need: an Azure AD tenant admin (to grant application permissions) and access to the SharePoint site `CampaignManagementTeam → Website_Tracker`.

---

## What you're building

```
Dashboard server  ──client credentials──►  Microsoft Graph  ──►  SharePoint Excel workbook
        ▲                                                                 │
        └────────────────── reads/writes via Graph REST ──────────────────┘
```

The server authenticates as an **application** (no user signs in). It gets a token from Azure AD using a client ID + secret, then calls Graph with that token to PATCH cells.

---

## Step 1 — Register an Azure AD app

Portal: <https://entra.microsoft.com> → **Applications** → **App registrations** → **New registration**.

- **Name:** `Website Tracker Dashboard` (or your preference).
- **Supported account types:** *Accounts in this organizational directory only* (single tenant).
- **Redirect URI:** leave blank — this app is server-side, no browser flow.

Click **Register**. On the overview page, copy:
- **Application (client) ID** → `MS_CLIENT_ID`
- **Directory (tenant) ID** → `MS_TENANT_ID`

---

## Step 2 — Grant API permissions

Same app → **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions** (not delegated).

Add **one** of these:

| Permission | Scope |
|-----------|-------|
| `Sites.Selected` | Recommended. Grants access to *only* the sites an admin explicitly allow-lists. Most secure. |
| `Files.ReadWrite.All` | Broader: read/write all files in the tenant. Simpler but over-permissioned. |

After adding, click **Grant admin consent for [tenant]**. The status column should show a green check.

### If you chose `Sites.Selected` (recommended)

You also need an admin to grant *this specific app* write access to the CampaignManagementTeam site. There's no UI for this — it's a Graph call. Use Graph Explorer (<https://developer.microsoft.com/graph/graph-explorer>) signed in as a SharePoint admin:

```http
POST https://graph.microsoft.com/v1.0/sites/{SITE_ID}/permissions
Content-Type: application/json

{
  "roles": ["write"],
  "grantedToIdentities": [{
    "application": {
      "id": "{MS_CLIENT_ID}",
      "displayName": "Website Tracker Dashboard"
    }
  }]
}
```

(Get `{SITE_ID}` from Step 5 below.)

---

## Step 3 — Create a client secret

Same app → **Certificates & secrets** → **Client secrets** → **New client secret**.

- **Description:** `dashboard-prod` (or `dashboard-dev`).
- **Expires:** 6, 12, or 24 months. Set a calendar reminder to rotate.

Click **Add**. **Copy the `Value` column immediately** — it's only shown once.

→ `MS_CLIENT_SECRET`

If you miss it, delete the secret and create another. Never paste secrets into chat or commit them to git.

---

## Step 4 — Find the Site ID

Graph Explorer, signed in as any user with access to the site:

```http
GET https://graph.microsoft.com/v1.0/sites/constructvirtual.sharepoint.com:/sites/CampaignManagementTeam
```

Response includes:
```json
{ "id": "constructvirtual.sharepoint.com,GUID1,GUID2", ... }
```

Copy the full `id` value (the comma-separated triple).

→ `SHAREPOINT_SITE_ID`

---

## Step 5 — Find the Drive ID

```http
GET https://graph.microsoft.com/v1.0/sites/{SHAREPOINT_SITE_ID}/drives
```

Returns the document libraries on the site. Find the one that holds the `Website_Tracker` folder — usually `"name": "Documents"`. Copy its `id`.

→ `SHAREPOINT_DRIVE_ID`

---

## Step 6 — Find the Excel File ID

The workbook lives here (share link, for human reference):

<https://constructvirtual.sharepoint.com/:x:/s/CampaignManagementTeam/IQB_vxevk9zZTqL_szYZctowAYfjQ3HjGGixkLPpDUalUW8>

Open it once in the browser to confirm the filename, then resolve via Graph:

```http
GET https://graph.microsoft.com/v1.0/drives/{SHAREPOINT_DRIVE_ID}/root:/Website_Tracker/{filename}.xlsx
```

Response includes `"id": "01ABCD..."`. Copy it.

→ `EXCEL_FILE_ID`

Worksheet name is **`Website Tracker`** (confirmed). To verify it still matches if the team ever renames it:

```http
GET https://graph.microsoft.com/v1.0/drives/{SHAREPOINT_DRIVE_ID}/items/{EXCEL_FILE_ID}/workbook/worksheets
```

→ `EXCEL_WORKSHEET_NAME=Website Tracker`. The space is fine in the env value; Graph URLs need it URL-encoded as `%20` or wrapped in single quotes inside `worksheets('Website Tracker')`.

---

## Step 7 — Smoke test from the terminal

Get a token:

```bash
curl -X POST "https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token" \
  -d "client_id=${MS_CLIENT_ID}" \
  -d "client_secret=${MS_CLIENT_SECRET}" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials"
```

Copy `access_token` from the response. Then:

```bash
# Note: worksheet name contains a space — URL-encode it as %20 inside the path,
# but keep single quotes around the name per Graph's syntax.
curl "https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/items/${EXCEL_FILE_ID}/workbook/worksheets('Website%20Tracker')/usedRange" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

You should see the workbook's used range with `values` populated. If you get 403, the app doesn't have permission on this site (check Step 2). If 404, the IDs are wrong.

---

## Step 8 — Populate `.env`

In `Website_Tracker/.env` (create from `.env.example`):

```
MS_TENANT_ID=...
MS_CLIENT_ID=...
MS_CLIENT_SECRET=...
SHAREPOINT_SITE_ID=...
SHAREPOINT_DRIVE_ID=...
EXCEL_FILE_ID=...
EXCEL_WORKSHEET_NAME=Website Tracker
```

Confirm `.env` is in `.gitignore` (it is, in this template). Never commit it.

---

## Security notes

- **`Sites.Selected` over `Files.ReadWrite.All`.** The dashboard touches one workbook; don't grant tenant-wide access for it.
- **Secret rotation.** Calendar reminder for 30 days before expiry. To rotate without downtime: create the new secret, deploy, then delete the old one.
- **Logging.** Never log the access token, client secret, or `Authorization` header. Log status codes and Graph request IDs (`request-id` response header) instead — they're what Microsoft Support asks for.
- **Concurrent edits.** Graph workbook sessions serialize edits per-file. If two dashboard instances run, that's fine — Graph handles it. But a user editing the file in the SharePoint web UI while the dashboard writes can return 423 (locked) — surface this as a red toast and retry.
- **PII.** Client names are PII. If the dashboard is exposed beyond the trusted network, add real authentication before then — this base setup has none.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| 401 from Graph | Token expired or wrong scope. The SDK should auto-refresh; if not, check `MS_CLIENT_SECRET`. |
| 403 from Graph on the workbook | App not granted `Sites.Selected` for this site (Step 2 follow-up), or admin consent missing. |
| 404 on the file | `EXCEL_FILE_ID` wrong, or file moved/renamed in SharePoint. |
| 423 (locked) on PATCH | Someone has the file open in Excel Desktop with exclusive lock. Retry, or ask them to close. |
| Cells write but show as text instead of dates | Set the column format in Excel to Date before first use, or write as Excel serial numbers — Graph passes values through as-is. |
