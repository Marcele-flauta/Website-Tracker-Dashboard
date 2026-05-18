# Brand tokens — Construct Virtual

Single source of truth for colour and typography across the Website Tracker Dashboard. All values come from *Construct Virtual Brand Guidelines (2021)*, section 2 (Typography) and section 3 (Colour Palette). Web translations are derived; print Pantone/CMYK values omitted.

> If a colour is needed but not in this list, raise it as an open question — don't invent one. The brand palette is deliberately small.

---

## Colour palette

| Token | Hex | RGB | Brand name | Pantone |
|-------|-----|-----|------------|---------|
| `--cv-yellow` | `#fdce36` | 253 206 54 | Accent Yellow | 7548C |
| `--cv-orange` | `#fbaa35` | 251 170 53 | Accent Orange | 137C |
| `--cv-dark-grey` | `#414042` | 65 64 66 | Dark Grey | 426C |
| `--cv-cool-grey` | `#d2d2d2` | 210 210 210 | Cool Grey | 420C |
| `--cv-black` | `#101820` | 16 24 32 | Black | 6C |
| `--cv-white` | `#ffffff` | — | (white space) | — |

### Functional / system colours (outside brand — used for system feedback only)

| Token | Hex | Use |
|-------|-----|-----|
| `--sys-yellow-tint` | `#fffbf0` | Dropdown row hover background (warm yellow tint, derived from `--cv-yellow`) |
| `--sys-success` | `#2e7d32` | Success toast |
| `--sys-error` | `#c0392b` | Error toast, "stale > 5min" sync indicator |
| `--sys-warn` | `#c17d00` | "Stale > 2min" sync indicator |
| `--sys-muted` | `#aaaaaa` | Footer / auto-sync indicator text |

### Role assignments

| UI element | Token |
|------------|-------|
| Page background | `--cv-white` |
| Body text | `--cv-dark-grey` |
| Header bar background | `--cv-black` |
| Header bar text / icons | `--cv-white` |
| Primary CTA (`+ Add Client`, "Add Client" save) | `--cv-yellow` background, `--cv-dark-grey` text |
| Secondary CTA (`REFRESH DATA` border) | `--cv-cool-grey` border + text, `--cv-yellow` on hover |
| Stage circle: pending | `--cv-cool-grey` outline, transparent fill |
| Stage circle: complete | `--cv-yellow` fill |
| Stage circle: N/A | `--cv-cool-grey` dashed outline, transparent fill |
| Invoice badge: paid | `--cv-yellow` background |
| Invoice badge: unpaid | `--cv-cool-grey` background |
| Row left border: 100% complete | `--cv-orange` (brand has no green — Accent Orange used) |
| Dropdown border | `--cv-yellow` |
| Dropdown selected row | `--cv-yellow` background, `--cv-dark-grey` text |
| Dropdown hover row | `--sys-yellow-tint` background |
| Borders / dividers (subtle) | `--cv-cool-grey` |

---

## Typography

Two typefaces from the brand:

- **Source Sans Pro** — body text, table content, dropdowns, footer.
- **Montserrat** — page heading, section headings, button labels (uppercase).

Load both from Google Fonts. Brand uses these weights:

| Brand call-out | Use | CSS |
|----------------|-----|-----|
| Source Sans Pro Light (11pt body) | Body, table cells, dropdown options | `font-family: 'Source Sans Pro'; font-weight: 300; font-size: 14px; letter-spacing: 0.025em` |
| Source Sans Pro Semi Bold (12pt headings) | Column headers, dropdown selected row, badge text | `font-family: 'Source Sans Pro'; font-weight: 600; font-size: 14px; letter-spacing: 0.025em` |
| Montserrat Light (16pt, tracking 200) | Page H1 ("WEBSITE TRACKER"), section labels — uppercase | `font-family: 'Montserrat'; font-weight: 300; font-size: 20px; letter-spacing: 0.2em; text-transform: uppercase` |
| Montserrat Regular (14pt, tracking 200) | Button labels — uppercase | `font-family: 'Montserrat'; font-weight: 400; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase` |

### Notes on web translations

- Print point sizes ⇄ web px aren't 1:1. Sizes above are tuned for screen legibility while keeping brand proportions (Montserrat is roughly 1.4× the body size; Semi Bold sits at the same size as Light but heavier).
- Brand uses "tracking 200" for Montserrat → web `letter-spacing` ≈ `0.15em–0.2em`. We use `0.2em` for the larger H1 (more breathing room) and `0.15em` for compact button labels.
- **Companion spec said "Montserrat 600" for buttons.** Brand guideline is **Regular (400)**. We follow the brand. If a heavier button is wanted, use Montserrat Semi-Bold (600) but only for one role and confirm.

---

## CSS variable block (drop into `style.css`)

```css
:root {
  /* Brand */
  --cv-yellow:    #fdce36;
  --cv-orange:    #fbaa35;
  --cv-dark-grey: #414042;
  --cv-cool-grey: #d2d2d2;
  --cv-black:     #101820;
  --cv-white:     #ffffff;

  /* System */
  --sys-yellow-tint: #fffbf0;
  --sys-success:     #2e7d32;
  --sys-error:       #c0392b;
  --sys-warn:        #c17d00;
  --sys-muted:       #aaaaaa;

  /* Fonts */
  --font-body:    'Source Sans Pro', system-ui, sans-serif;
  --font-display: 'Montserrat', system-ui, sans-serif;
}

body {
  font-family: var(--font-body);
  font-weight: 300;
  font-size: 14px;
  letter-spacing: 0.025em;
  color: var(--cv-dark-grey);
  background: var(--cv-white);
}

.cv-h1 {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 20px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.cv-btn {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 12px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
```
