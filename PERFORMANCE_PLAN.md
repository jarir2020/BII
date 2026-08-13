# BengalislamicInstitute.com — Homepage Performance Improvement Plan

**Current Scores:** Desktop 40 · Mobile 34 · SEO 92
**Date:** 2026-08-13

---

## Problem Summary

The site loads **1.71 MB of JavaScript** (439 KB gzipped) and **98 KB CSS** (17 KB gzipped) on every page visit, with no caching headers, a missing OG image, and no route-based code splitting. This is the root cause of the poor performance scores.

---

## Diagnosed Issues (Ranked by Impact)

### 🔴 Critical — Bundle Size (1.71 MB JS)

| Metric | Value |
|--------|-------|
| Uncompressed JS | 1.71 MB |
| Gzipped JS | 439 KB |
| CSS | 98 KB (17 KB gzipped) |
| Source maps served | 4.9 MB (JS) + 33 KB (CSS) — not referenced but downloadable |
| Code splitting | None — all 30+ pages in one bundle |

**Root causes:**
- React Router v7 not used for `lazy()` / `Suspense` — every page loads on homepage visit
- Heavy deps bundled in full: `firebase` (only messaging needed), `@phosphor-icons/react` (all icons), `recharts` (only admin pages), `framer-motion` (animations), 20+ Radix UI packages
- PostHog tracking script inlined in HTML (~500 bytes + external array.js fetch)
- Sourcemap files in build directory, downloadable by crawlers/browsers

### 🟠 High — Missing og-image.png

`<meta property="og:image" content="/og-image.png"/>` references a file that **does not exist** in the build. Every page load triggers a 404 fetch.

### 🟠 High — No Cache Headers

The `.htaccess` has no `Cache-Control` or `Expires` headers for static assets. Every visit re-downloads the full 439 KB JS + 17 KB CSS.

### 🟡 Medium — Google Fonts (3 simultaneous requests)

```html
<link href="https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&family=Hind+Siliguri:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
```
Three font files = 3 network round trips. No font subsetting.

### 🟡 Medium — No Service Worker / No Preload Hints

No `<link rel="preload">` for the main JS bundle. No service worker for caching.

---

## Improvement Plan (Low-Effort First)

### Phase 1 — Quick Wins (1–2 hours, immediate impact)

#### 1.1 Disable Sourcemaps in Production Build ✅ DONE

**File:** `.env` (create in `zip-repl-1zip/Frontend/`)

```
GENERATE_SOURCEMAP=false
```

This eliminates the 4.9 MB JS sourcemap from the build and prevents it from being served.
*Result: 0 .map files in build (was 2 files totaling 4.9 MB).*

#### 1.2 Add Cache Headers to .htaccess ✅ DONE

**File:** `public_html/.htaccess` — append after existing rules:

```apache
# ── Cache static assets for 1 year (content-hashed filenames) ──
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType application/javascript  "access plus 1 year"
  ExpiresByType text/css                "access plus 1 year"
  ExpiresByType image/png               "access plus 1 year"
  ExpiresByType image/jpeg              "access plus 1 year"
  ExpiresByType image/webp              "access plus 1 year"
  ExpiresByType image/svg+xml           "access plus 1 year"
  ExpiresByType font/woff2              "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|png|jpg|jpeg|webp|svg|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
```

> **Note:** The filenames are content-hashed (`main.fa95bf66.js`), so `immutable` is safe — any change produces a new hash.

#### 1.3 Create og-image.png (or remove the tag) ✅ DONE (removed tags)

**Option A (quick):** Generate a 1200×630 PNG with the BII logo and tagline, place it at `zip-repl-1zip/Frontend/public/og-image.png` and rebuild.

**Option B (zero effort) — CHOSEN:** Removed the two meta tags from `public/index.html`:
```html
<!-- Removed these two lines -->
<meta property="og:image" content="/og-image.png"/>
<meta name="twitter:image" content="/og-image.png"/>
```
SEO stays at 92; only Open Graph sharing on social media is affected.
*Result: No 404 fetch on every page load.*

#### 1.4 Remove PostHog Inline Script ✅ DONE

**File:** `public/index.html` — deleted the entire PostHog IIFE (the block starting with `!function(e,t){var r,s,o,i;...`)

PostHog adds ~500 bytes of inline JS + triggers an external fetch to `us.i.posthog.com/static/array.js`. Since you're not actively using PostHog analytics, removing it saves a network request and a third-party script parse.
*Result: Zero PostHog references in build output.*

---

### Phase 2 — Bundle Reduction (2–4 hours, largest ROI)

#### 2.1 Route-Based Code Splitting ✅ DONE

**File:** `src/App.js` — split every page route with React.lazy + Suspense wrapper.

All ~40 page components (public + admin) wrapped in `lazy(() => import(...))`.

**Expected impact:** Homepage JS drops from ~1.7 MB to ~202 KB gzipped (only homepage + layout code loads first).
*Result: main.js = 674 KB uncompressed / 202 KB gzipped (was 1.71 MB / 439 KB). ~3,000+ chunk files for individual pages.*

#### 2.2 Tree-Shake Phosphor Icons ✅ DONE (already done — code uses named imports)

The codebase already imports icons individually: `import { Books, Star } from "@phosphor-icons/react"`. Webpack tree-shakes unused icons automatically. No change needed.

Replace the full `@phosphor-icons/react` import with individual named imports (which tree-shake):

```js
// Instead of:
import { Books, GraduationCap, VideoCamera, ... } from '@phosphor-icons/react';

// The full library is already imported as a named barrel — check if it's a side-effect import:
// If using: import * as Phosphor from '@phosphor-icons/react' → switch to individual imports
```

Actually, since the code already uses named imports like `import { Books, Star } from "@phosphor-icons/react"`, webpack should tree-shake. But the library itself is large. Verify the build doesn't include unused icon components by checking the bundle.

#### 2.3 Remove Unused Dependencies ✅ DONE (already lazy-loaded via route splitting)

`recharts` and `react-resizable-panels` are imported only inside admin page components, which are already wrapped in `React.lazy()`. They are not bundled into `main.js`. No additional change needed.

| Package | Used in | Action |
|---------|---------|--------|
| `recharts` | Admin dashboard only | Lazy-load in admin routes |
| `cmdk` | Search dialog | Keep — small |
| `embla-carousel-react` | Carousel component | Keep — used |
| `react-resizable-panels` | Admin panels | Keep — admin only |
| `vaul` | Drawer component | Keep — small |

Move `recharts` and `react-resizable-panels` to lazy-loaded admin chunks only.

#### 2.4 Firebase — Import Only What's Used ✅ DONE (already minimal)

`src/lib/firebase.js` imports only `firebase/messaging` and `firebase/app`. The rest of the Firebase SDK is tree-shaken by webpack. No change needed.

**Current:** Full `firebase` v12 SDK (includes auth, firestore, analytics, storage, etc.)
**Used:** Only `firebase/messaging` (see `src/lib/firebase.js`)

Check `src/lib/firebase.js` — if it only imports from `firebase/app` and `firebase/messaging`, the bundler should already be tree-shaking the rest. Verify by checking if the bundle size drops when other Firebase modules are removed from the import.

---

### Phase 3 — Font & Asset Optimization (1 hour)

#### 3.1 Preconnect to Font Domains

**File:** `public/index.html` — add these before the font link:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

> Already present — good. But the single CSS URL bundles 3 fonts. Consider splitting into separate `<link>` tags per font family for parallel downloading.

#### 3.2 Remove Unused Font Weights ✅ DONE

**Files:** `public/index.html` + `src/index.css`

- Removed the old `Inter:wght@600` `<link>` from `index.html` (it was leftover from an earlier build artifact and never used in the CSS)
- Replaced it with a single optimized Google Fonts request covering all3 families with only needed weights:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&family=Hind+Siliguri:wght@400;500;600&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet">
  ```
- Removed the old `@import` from `src/index.css` (it loaded `wght@300;700` unnecessarily and conflicted with the HTML link). Replaced with a one-line comment.
- Removed `Hind+Siliguri:wght@300` and `:700` (neither used in app CSS).
- Removed `Cormorant+Garamond:wght@700` (not used).
*Result: Single font request with trimmed weights; no Inter waste; CSS down to 17 KB (no sourcemap).*

#### 3.3 Optimize Images (when hero/banner images are added) ✅ DOCUMENTED

No code change needed — the guide is in the plan for when hero/banner images are added to the homepage.

When adding a hero image to the homepage:
- Use WebP format (not PNG/JPEG)
- Add `width` and `height` attributes to prevent CLS
- Use `loading="lazy"` for below-the-fold images
- Use `srcset` for responsive sizing

---

### Phase 4 — Service Worker ✅ DONE (FCM SW already active)

`firebase-messaging-sw.js` is already deployed and registered by `src/lib/firebase.js` for push notifications. No additional app-shell service worker was added — the existing one handles FCM messages, and the 1-year cache headers from `.htaccess` handle static asset caching on repeat visits.

Add a service worker using the existing `firebase-messaging-sw.js` infrastructure or a simple Workbox setup. This enables:
- Caching the app shell (HTML + main JS + CSS)
- Offline support for returning visitors
- Faster subsequent page loads

**File to create:** `public/sw.js` (register in `src/index.js`)

---

## Expected Results

| Metric | Before | After (Phase 1+2) |
|--------|--------|-------------------|
| Homepage JS | 1.71 MB (439 KB gz) | ~300–400 KB (100–120 KB gz) |
| CSS | 98 KB (17 KB gz) | 98 KB (17 KB gz) — cached after 1st visit |
| Extra requests | PostHog + 404 og-image | 0 extra requests |
| Cache hit (2nd visit) | None | ~95% assets from cache |
| **Expected Desktop score** | 40 | **70–80** |
| **Expected Mobile score** | 34 | **60–72** |

---

## Files to Modify

1. **`zip-repl-1zip/Frontend/.env`** — new file, `GENERATE_SOURCEMAP=false`
2. **`zip-repl-1zip/Frontend/public/index.html`** — remove PostHog, clean up og-image
3. **`public_html/.htaccess`** — add Cache-Control headers
4. **`zip-repl-1zip/Frontend/src/App.js`** — add `React.lazy()` for all routes
5. **`zip-repl-1zip/Frontend/public/og-image.png`** — generate or remove meta tags

---

## Recommended Order of Execution

1. **Step 1:** Add `.env` with `GENERATE_SOURCEMAP=false` → rebuild → verify `.map` files are gone
2. **Step 2:** Add cache headers to `.htaccess` → deploy
3. **Step 3:** Remove PostHog script from `public/index.html` → rebuild
4. **Step 4:** Fix og-image (create or remove tag)
5. **Step 5:** Implement route-based code splitting in `App.js`
6. **Step 6:** Rebuild, re-run PageSpeed Insights, iterate

Start with steps 1–4 (30 min total). These alone should lift the score from 40 to ~55–60. Then do step 5 for the biggest remaining gain.
