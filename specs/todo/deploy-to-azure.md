# Deploy to Azure App Service + Embed in SharePoint

> **Goal:** Make the Website Design Tracker available to anyone in the Construct Virtual M365 tenant, gated by Entra ID sign-in, embedded in a SharePoint page. Minimum hosting cost.
>
> **Plan:** Azure App Service (Free F1 tier) running the existing Node.js app as-is, behind Easy Auth (App Service Authentication) restricted to the tenant, embedded in a SharePoint page via the Embed web part.

---

## Architecture

```
SharePoint page (Embed web part) on CampaignManagementTeam
        │
        │  <iframe src="https://website-tracker-cm.azurewebsites.net">
        ▼
Azure App Service  (F1 free, Node 20 Linux, UK South)
   ├─ Easy Auth (Entra ID, Campaign Management Team only)  ← gate
   ├─ Express dashboard from GitHub master (CI/CD)         ← code
   └─ App Settings holds the 7 secrets                     ← config
        │
        │ Microsoft Graph (app-only auth via client_credentials)
        ▼
SharePoint Excel workbook (existing)
```

Two identities at play:
- **User identity** — Entra ID sign-in via Easy Auth. Only proves "you're allowed to see this page." App doesn't read the user's identity.
- **App identity** — the Azure AD app from [`docs/sharepoint-setup.md`](../../docs/sharepoint-setup.md), used by the server to call Graph. Unchanged.

---

## In scope

- New Azure App Service (Free F1) hosting the existing repo on `master` branch.
- Continuous deployment from <https://github.com/Marcele-flauta/Website-Tracker-Dashboard>.
- App Service Authentication (Easy Auth) using Entra ID, restricted to the Construct Virtual tenant.
- App Settings populated from `.env` values (no `.env` in the deployed code).
- CSP header in the Express app to allow SharePoint to embed the dashboard in an iframe.
- Bump default `CACHE_TTL_MS` for production use.
- Embed the running URL in a SharePoint page on `CampaignManagementTeam`.

## Out of scope

- Custom domain (requires B1+ tier — adds cost).
- TLS certs (App Service gives a free `*.azurewebsites.net` cert).
- HA / scale-out (single F1 instance is enough for a small team dashboard).
- Per-user audit (Easy Auth logs sign-ins; granular action logging is a later spec).
- Power Apps / SPFx alternatives (rejected in favour of zero-rewrite option).

---

## Prerequisites

- An Azure subscription connected to the Construct Virtual tenant. **If no Azure subscription exists yet**, create one — the dashboard fits in the always-free tier indefinitely. Sign-up flow: <https://portal.azure.com> → *Subscriptions* → *+ Add*. A "Pay-As-You-Go" or "Free Trial" subscription is fine; with the F1 plan there's nothing to bill.
- Admin rights in the tenant to enable App Service Authentication (Global Admin or Application Admin).
- GitHub repo access (already set up — public repo at `Marcele-flauta/Website-Tracker-Dashboard`).
- The seven `.env` values from local `.env` (we'll copy them into App Service config).

---

## Branching & PR strategy

All deployment-related changes (the three code edits below + the GitHub Actions workflow YAML) land via **one pull request** for visibility:

1. Create feature branch `add-deployment-workflow` from `master`.
2. Commit: three code changes (CSP middleware, `trust proxy`, default cache TTL bump).
3. Commit: GitHub Actions workflow YAML (`.github/workflows/azure-deploy.yml`).
4. Push branch, open PR against `master`, request your review.
5. After you merge, proceed with Azure portal steps (Steps 1–6 below).
6. In Step 4 (Deployment Center), choose **"Use available workflow"** so Azure points at our YAML instead of generating its own.

This gives you a single diff to review before anything lands on master.

---

## Code changes (small)

Three minor edits to make the app iframe-friendly and production-ready:

### 1. CSP header for SharePoint iframe (`app/server/server.js`)

Add this middleware before route registration:

```js
app.use((req, res, next) => {
  // Allow SharePoint and Office to frame this page (for the SP Embed web part).
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.sharepoint.com https://*.office.com"
  );
  next();
});
```

This replaces the default browser behaviour (`X-Frame-Options: SAMEORIGIN` from some proxies) with an explicit allowlist. `'self'` keeps it usable standalone; the two `*.` patterns cover SP and Office embedded contexts.

### 2. Trust proxy (`app/server/server.js`)

App Service runs behind a reverse proxy. One line:

```js
app.set('trust proxy', 1);
```

Lets Express see real client IPs and the original `Host` header. Not strictly required for our routes but good hygiene.

### 3. Default cache TTL bump

Local default is 60s — fine for development, possibly tight for a free-tier instance with multiple concurrent users. Set the default in `app/server/cache.js`:

```js
const TTL_MS = () => parseInt(process.env.CACHE_TTL_MS || '300000', 10);
```

5 minutes by default; still overridable via env var. On Azure we'll set `CACHE_TTL_MS=300000` explicitly.

---

## Deployment steps (Azure portal)

### Step 1 — Create the App Service Plan (F1 free)

In <https://portal.azure.com>:

- *Create a resource* → search **App Service Plan** → *Create*.
- Settings:
  - **Subscription:** your Construct Virtual sub
  - **Resource group:** create new — `rg-website-tracker`
  - **Name:** `asp-website-tracker`
  - **OS:** Linux
  - **Region:** **UK South**
  - **Pricing tier:** **Free F1** (click "Change size" → *Dev/Test* tab → Free F1)
- *Review + create* → *Create*.

### Step 2 — Create the App Service

- *Create a resource* → search **Web App** → *Create*.
- Settings:
  - **Resource group:** `rg-website-tracker`
  - **Name:** `website-tracker-cm` (must be globally unique across all of Azure — if taken, fall back to `website-tracker-cm` or `cv-website-tracker-cm`. The full URL becomes `https://<name>.azurewebsites.net`)
  - **Publish:** Code
  - **Runtime stack:** Node 20 LTS
  - **OS:** Linux
  - **Region:** UK South
  - **Linux Plan:** select the `asp-website-tracker` you just made
- *Review + create* → *Create*.

Wait for deployment to finish (~1 min). Confirm by browsing to `https://<your-app-name>.azurewebsites.net` — you'll see Azure's default landing page until code is deployed.

### Step 3 — Configure App Settings (the seven env vars)

In the App Service blade:

- Left sidebar → **Settings** → **Environment variables** → **+ Add** (one per row):

| Name | Value |
|------|-------|
| `MS_TENANT_ID` | (from local `.env`) |
| `MS_CLIENT_ID` | `fbf8afda-0239-4564-a5dd-e6cebaf5ddb4` |
| `MS_CLIENT_SECRET` | (from local `.env`) |
| `SHAREPOINT_SITE_ID` | `constructvirtual.sharepoint.com,52d77d92-...,9b721188-...` |
| `SHAREPOINT_DRIVE_ID` | `b!kn3XUsERlE6CXRBIpgy6d4gRcptptMpJuFnqOEEEtUPuS5Mn7JuvRacRoWnB5F1o` |
| `EXCEL_FILE_ID` | `015WTHE437X4L27E643FHKF75TGYMXFWRQ` |
| `EXCEL_WORKSHEET_NAME` | `Website Tracker` |
| `CACHE_TTL_MS` | `300000` |
| `WEBSITES_PORT` | `3000` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

The last two are App-Service-specific:
- `WEBSITES_PORT` tells App Service which port your Node process is listening on
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true` makes App Service run `npm install` after pulling new code

Click **Apply** at the bottom.

### Step 4 — Connect GitHub for continuous deployment

- App Service blade → **Deployment** → **Deployment Center**.
- **Source:** GitHub
- Sign in to GitHub (OAuth flow); grant access to the `Marcele-flauta/Website-Tracker-Dashboard` repo.
- Settings:
  - **Organisation:** Marcele-flauta
  - **Repository:** Website-Tracker-Dashboard
  - **Branch:** master
  - **Workflow option:** **Use available workflow** — point Azure at `.github/workflows/azure-deploy.yml` (already merged via the deployment PR). Azure will *not* write a new YAML; it will only add the `AZUREAPPSERVICE_PUBLISHPROFILE` secret to the repo, which the existing workflow uses.
- **Save**.

Azure now does its first build & deploy. Watch the **Logs** tab — takes 3–5 minutes. When it shows "Deployment successful", refresh `https://<your-app-name>.azurewebsites.net`.

You should see the dashboard load — but with **no auth gate yet** and a 403 toast (Easy Auth not enabled means the App Service URL is public, but Sites.Selected still works because the app identity is unchanged).

### Step 5 — Enable Easy Auth + restrict to Campaign Management Team

**5a. Enable Easy Auth**

- App Service blade → **Settings** → **Authentication** → **Add identity provider**.
- **Identity provider:** Microsoft
- **App registration:**
  - **Choose:** *Create new app registration*
  - **Name:** `website-tracker-auth`
  - **Supported account types:** ***Current tenant - Single tenant***  ← critical
- **Restrict access:** *Require authentication*
- **Unauthenticated requests:** *HTTP 302 Found redirect: recommended for websites*
- **Token store:** Enabled (default)
- **Add**.

> This creates a *second* Azure AD app registration (`website-tracker-auth`) that handles user sign-in. It's separate from the existing `Website Tracker Dashboard` app that holds Graph permissions — don't confuse the two.

**5b. Restrict to Campaign Management Team group**

By default, Easy Auth lets *any user in the tenant* sign in. To narrow it to just the Campaign Management Team:

1. Find or create the security group. The SharePoint site `CampaignManagementTeam` already has an associated **Microsoft 365 Group** with the same name — that group's membership is what we'll use.
2. In <https://entra.microsoft.com> → **Applications** → **Enterprise applications** → search for `website-tracker-auth` (this is the app Easy Auth just created, listed in *Enterprise applications*, not the original app reg).
3. Open it → **Properties** → set **Assignment required?** to **Yes** → **Save**. This turns the app into "only users explicitly assigned can sign in".
4. Same app → **Users and groups** → **+ Add user/group** → **Users and groups** → search for `Campaign Management Team` → select the M365 group → **Assign**.

Now only members of that M365 group can sign in. Adding/removing a teammate from the M365 group automatically grants/revokes their dashboard access — no app-side changes needed.

**5c. Test**

Open an incognito window → `https://<your-app-name>.azurewebsites.net`. You should be redirected to Microsoft sign-in.

- Sign in with a Campaign Management Team member's account → dashboard loads. ✓
- Sign in with a tenant user who *isn't* in the group → "You do not have access" Entra ID error. ✓

### Step 6 — Embed in a SharePoint page

In SharePoint, on the `CampaignManagementTeam` site:

- Create a new page (or pick an existing one) — *+ New* → *Page* → *Blank*.
- Title it "Website Design Tracker".
- Click the **+** button to add a web part → search **Embed**.
- In the Embed URL box, paste: `https://<your-app-name>.azurewebsites.net`
- Click outside the box. The embed should preview.
- Adjust the web part height (the gear icon → *Edit*) — set to ~900px or whatever fits a typical client row count.
- **Publish** the page.

Visit the page as a regular user (incognito window with a tenant account) — you should see the dashboard inline, with sign-in happening transparently because they're already authenticated in the same Entra ID tenant in the same browser session.

---

## Iframe gotchas (likely & how to handle)

1. **Third-party cookies.** Modern browsers block third-party cookies by default. The Easy Auth cookie lives on `azurewebsites.net`; from a SharePoint iframe, it's a third-party cookie.

   - **Symptom:** sign-in loop, or "you must sign in" inside the iframe even when signed into SP.
   - **Fix A (cheap):** in the SP page, swap the Embed web part for a **Link** web part instead — opens the dashboard in a new tab on click. Loses inline feel but always works.
   - **Fix B (proper):** use a custom domain for the App Service that's a subdomain of `constructvirtual.com`. Requires B1+ tier (~US$13/mo) for custom domain support. First-party cookie, no issues.

2. **CSP misconfiguration.** If the CSP header above isn't applied (browser still blocks framing), you'll see a console error like *"Refused to display in a frame because an ancestor violates the following Content Security Policy directive"*.

   - Fix: confirm `server.js` was deployed with the CSP middleware (Step 1 of Code changes). Check by running `curl -I https://<your-app-name>.azurewebsites.net | grep -i security-policy`.

3. **F1 cold start.** F1 sleeps after 20 minutes of inactivity. First request takes ~10–15 seconds. If this is jarring, B1 Basic (~US$13/mo) is always-on.

4. **F1 daily CPU quota.** F1 caps at 60 minutes of CPU/day across all users. If the team uses the dashboard heavily (multiple people, polling every 30s), you may hit the quota and the app will 503 until midnight UTC. The 5-minute cache TTL (Step 3) helps a lot.

---

## Cost

| Component | Tier | Cost (USD) |
|-----------|------|------------|
| App Service Plan | F1 Free | $0/mo |
| App Service Authentication | included | $0/mo |
| Azure outbound bandwidth | first 100 GB/mo | $0/mo |
| SharePoint Embed web part | included with M365 | $0/mo |
| **Total** | | **$0/mo** |

Upgrade trigger: if you hit the daily 60-min CPU cap, or want a custom domain.

| Upgrade | Tier | Cost (USD) |
|---------|------|------------|
| Always-on, no cap | B1 Basic | ~$13/mo |
| Custom domain support | B1+ | included |

---

## Done = all of the following

- [ ] PR `add-deployment-workflow` → `master` opened with the three code changes + the workflow YAML; reviewed by you; merged.
- [ ] App Service Plan `asp-website-tracker` exists in the Construct Virtual subscription on F1 Free, in UK South.
- [ ] App Service `<chosen-name>` is running Node 20 from GitHub `master`.
- [ ] All seven SharePoint env vars set in App Service Environment Variables.
- [ ] Easy Auth enabled, scoped to the Campaign Management Team M365 group.
- [ ] Visiting `https://<your-app-name>.azurewebsites.net` in incognito triggers Entra ID sign-in and then shows the live dashboard (when signed in as a team member).
- [ ] A user outside the Campaign Management Team M365 group is denied access on sign-in.
- [ ] A SharePoint page on `CampaignManagementTeam` embeds the dashboard inline. (Acceptable fallback: a Link web part opening in a new tab, if cookies cause iframe issues.)
- [ ] First production write tested: clicking a stage circle still updates the workbook.

---

## Resolved

1. **Region:** UK South.
2. **App Service name:** `website-tracker-cm` (fall back to `website-tracker-cm` or `cv-website-tracker-cm` if the name is taken — must be globally unique).
3. **Resource group:** `rg-website-tracker`.
4. **Custom domain:** none — free `.azurewebsites.net` URL.
5. **GitHub workflow:** all deployment changes (code + workflow YAML) land via **one PR** from `add-deployment-workflow` → `master`. Azure's Deployment Center uses "Use available workflow" to consume the merged YAML, so nothing else gets auto-committed by Azure.
6. **Embed strategy:** Embed web part (try first). If third-party cookies break sign-in inside the iframe, fall back to a Link web part.
7. **Access:** restricted to the **Campaign Management Team** M365 group via Enterprise Application user assignment (Step 5b).
8. **Monitoring:** skip Application Insights for now — add later if visibility is needed.

---

## Post-deployment notes (for the runbook)

- **Secret rotation:** the `MS_CLIENT_SECRET` expires every 24 months (Step 3 of `docs/sharepoint-setup.md`). To rotate: create a new secret in Azure AD → update App Service env var → restart. Old secret stays valid until you delete it.
- **Logs:** App Service → *Monitoring* → *Log stream* shows live `console.error` output. Same diagnostic surface we used locally (`GET /api/data: Graph ... → 404`).
- **Restart:** App Service → *Overview* → *Restart* if anything gets wedged. State is in-memory cache only; restart is safe.
- **Roll back:** Deployment Center → *Logs* → pick a previous deployment → *Redeploy*. Or revert the commit on GitHub and let CI/CD push a new build.
