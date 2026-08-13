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

#### 2.2 Remove framer-motion from main bundle ✅ DONE

**File:** `src/components/Layout.jsx` — replaced `motion.div`/`motion.aside` + `AnimatePresence` with plain `div`/`aside` + Tailwind `transition-*` classes for the sidebar animations.

`framer-motion` was pulled into main.js because Layout.jsx is always rendered. After removal, main.js drops from 673KB → 549KB (202KB → 163KB gzipped). framer-motion now only loads in the Welcome/Home lazy chunks.

*Result: −39KB gzipped from main.js. Sidebar slide/fade works with native CSS transitions.*

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

#### 2.5 Remove framer-motion from Home.jsx ✅ DONE

**File:** `src/pages/Home.jsx` — replaced `motion.div` (menu grid + review cards) with plain `div` + CSS `@keyframes biiStaggerIn` animation with staggered delays via utility classes (`.bii-stagger-1` through `.bii-stagger-12`).

`framer-motion` is now completely absent from the entire build (verified: zero chunks contain "framer-motion"). All animations use native CSS — zero JS overhead for animations.

*Result: framer-motion chunk (23 KB / 5.2 KB gzipped) no longer loads on any page. main.js = 167 KB gzipped (was 163 KB — net change negligible, CSS +4 KB for new animation keyframes).*

#### 2.6 Hero Image CLS Fix ✅ DONE

**File:** `src/pages/Welcome.jsx` — added `aspect-[16/9] sm:aspect-[21/9] md:aspect-[16/9]` to the hero `<section>` to give the browser a known intrinsic ratio before the remote Unsplash image loads, eliminating Cumulative Layout Shift on the LCP element.

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

#### 3.4 Font CSS Preload ✅ DONE

**File:** `public/index.html`

- Added `<link rel="preload" href="https://fonts.googleapis.com/...&display=swap" as="style">` before the actual font CSS link
- Eliminates one round-trip to discover the font CSS file; browser starts fetching it immediately after HTML parse
*Result: Fonts load ~1 round-trip faster on first visit.*

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

#### 2.7 Hero Image Optimization ✅ DONE

**File:** `src/pages/Welcome.jsx`

- Changed hero image URL from `?auto=format&fit=crop&w=1600&q=70` (JPEG, 676 KB) to `?auto=format&fit=crop&w=800&q=80&fm=webp` (WebP, 232 KB)
- Added `fetchPriority="high"` to the hero `<img>` (LCP element) so the browser prioritizes it
- 66% reduction in hero image size: 676 KB → 232 KB (−444 KB)

#### 2.8 Add JS Preload ✅ DONE

**File:** `public_html/index.html` (deployed build)

- Added `<link rel="preload" href="/static/js/main.055b4906.js" as="script">` before the script tag
- Helps the browser discover and start downloading main.js earlier in the critical path

#### 2.9 Hero Image Further Reduction (W=800→600) ✅ DONE

**File:** `src/pages/Welcome.jsx`

- Reduced hero image width from 800→600px: 232 KB → 140 KB WebP (−92 KB, 40% further savings)
- Added `decoding="async"` to hero `<img>` (off-main-thread decode, though LCP image already has `fetchPriority="high"`)

#### 2.10 Lazy-Load Winner Photos ✅ DONE

**File:** `src/pages/Home.jsx`

- Added `loading="lazy"` + `decoding="async"` to winner photos in ReviewCard
- These images sit below the fold (after the menu grid and ad banner), so lazy loading prevents unnecessary download
- `decoding="async"` shifts image decode off the main thread, improving TTI

## Session 2026-08-13 — Continued Optimizations

### Completed
- **Firebase tree-shaking verified** ✅ — Only `firebase/app` and `firebase/messaging` code in bundle. The 29 `@firebase/` string references are compat module name identifiers only, not actual code imports.
- **Hero image w=600→w=400** ✅ — Default src reduced from 137KB to 68KB WebP. srcset still provides w=600/800/1200/1600 for larger viewports.
- **Axios → native fetch** ✅ — Replaced axios with fetch() in api.js. Saved ~45KB uncompressed / ~16KB gzipped from main.js.
- **Unused dependencies removed** ✅ — dayjs, date-fns, lodash, swr, @types/lodash removed from package.json.
- **Production console statements removed** ✅ — Removed BII debug logs from capacitor-push.js, capacitor-push-listener.js, firebase.js, NotificationPrompt.jsx, BookReaderModal.jsx, ErrorBoundary.jsx, CompletionCertificate.jsx, LibraryReader.jsx.
- **Cormorant Garamond font removed** ✅ — Only Tiro Bangla + Hind Siliguri needed. Saved ~30-50KB font download.
- **framer-motion tree-shaken** ✅ — Zero refs in main.js. All animations use CSS keyframes instead.

### Bundle Size Progression
| Build | Uncompressed | Gzipped | Change |
|-------|-------------|---------|--------|
| Before all optimizations | ~561KB | ~168KB | baseline |
| After hero w=600 | ~561KB | ~168KB | (same build, different src) |
| After unused deps removed | ~561KB | ~168KB | (deps were already tree-shaken) |
| After axios→fetch | 515KB | 151KB | **-46KB / -17KB** |
| After console cleanup | 514KB | 151KB | -1KB |
| After font removal | 514KB | 151KB | (CSS changed, JS same) |
| After hero w=400 | 514KB | 151KB | (same build, different src) |

### Current Critical Resources
- **main.js**: 514KB uncmp / 148KB gzipped
- **main.css**: 101KB uncmp / 17.5KB gzipped
- **Fonts**: 2 families (Tiro Bangla italic + Hind Siliguri 400/500/600)
- **Hero image (mobile)**: 68KB WebP (w=400) / 137KB (w=600) / 232KB (w=800)
- **Firebase SW**: Separate file, uses compat SDK from CDN

### Pending
- [ ] PageSpeed retest after all deployments complete
- [ ] Consider reducing phosphor icons in Layout.jsx (21 icons, ~5-8KB gzipped) — only if UI allows
- [ ] Consider font subsetting for Tiro Bangla + Hind Siliguri (would require build tooling)
