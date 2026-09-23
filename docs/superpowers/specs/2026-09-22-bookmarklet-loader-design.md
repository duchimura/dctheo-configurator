# GP2040-CE-D_C_Theo — Bookmarklet Loader — Design Spec

- **Date:** 2026-09-22
- **Status:** Approved design
- **Repo:** `github.com/duchimura/GP2040-CE-D_C_Theo`
- **Builds on:** the existing D_C_Theo web UI (``), which already talks only to the stock
  GP2040-CE API and needs no firmware changes to run.

## 1. Purpose

Today the D_C_Theo UI reaches a user in exactly one way: flash a UF2 built from this fork, which
bakes the UI into the firmware image. That requires a per-board build (firmware pin config is
compile-time) and a user willing to reflash their controller.

Most users don't need to reflash anything — the D_C_Theo UI works against **stock** GP2040-CE
firmware already, since it only calls the same API the stock UI does (confirmed live: a real
controller connected via `npm run dev-board`, and the visualizer picked up button presses).

This phase adds a second distribution path that needs no reflashing, no install, and no code
signing: a **bookmarklet** that loads the D_C_Theo UI, hosted on GitHub Pages, into the tab
already open on the controller's own config page (`http://192.168.7.1`).

## 2. Scope

**In scope:**
- A "loader" Vite build variant of the existing UI: same app, built with `base` set to the
  GitHub Pages URL and **unhashed** output filenames (a stable URL for the bookmarklet to
  reference, independent of content hash).
- A minimal static landing page (plain HTML, not part of the React app) explaining the tool and
  offering a drag-to-bookmark link.
- A GitHub Actions workflow that builds the loader variant and landing page and publishes them
  to GitHub Pages on every push to `main`.
- The bookmarklet script itself: DOM takeover of the current tab, then `<script>`/`<link>`
  injection of the hosted bundle.

**Out of scope (deferred):**
- Any firmware (C++) changes — none are needed or planned here.
- Version pinning: the bookmarklet always loads the latest published build from `main` (see §6).
  A "pin to a release" mode is deferred until it's actually needed.
- Mobile browsers. Controller config needs a wired USB connection to a PC/Mac; phones are out of
  scope regardless of bookmarklet support.
- Any change to the firmware-embedded build (`npm run build` → `fsdata.c`) — the loader variant
  is a new, separate build target alongside it, not a replacement.

## 3. Grounding (facts verified this session)

- **The firmware sets no CSP header.** Searched `src/webconfig.cpp` and `lib/httpd/*.c` for
  `Content-Security-Policy`/`X-Frame-Options`/`script-src` — no matches. Nothing in the firmware
  blocks a loaded page from fetching cross-origin `<script>`/`<link>` resources. (Not verified
  against a real device's actual HTTP response headers — inferred from source only.)
- **The firmware answers CORS with `Access-Control-Allow-Origin: *`** (`webconfig.cpp:259`) but,
  per `vite.config.ts`'s own comment, **does not answer `OPTIONS` requests** — i.e. it can't
  pass a CORS preflight. This is why the design avoids `fetch`/`XHR` to load the bundle (which
  would preflight) in favor of `<script src>`/`<link href>` tags (which never preflight,
  regardless of origin).
- **The API is already same-origin-safe for this design**: the bookmarklet never navigates the
  tab away from `http://192.168.7.1`, so once the D_C_Theo UI is loaded, its own calls to
  `/api/...` are same-origin exactly as the stock UI's are — no CORS or preflight involved for
  the actual gamepad-option/remap calls.
- **The app mounts into `<div id="root">`** (`src/index.jsx:9`,
  `ReactDOM.createRoot(document.getElementById('root'))`), confirming the DOM-takeover shape the
  bookmarklet needs to build.
- **Vite build output is content-hashed by default**
  (`build/assets/index-89d40b7b.js`), which is why a plain production build can't be the loader
  target — the bookmarklet needs one URL that never changes between publishes.
- **Live-hardware check so far:** a real controller connected via `npm run dev-board`
  (UI on localhost, proxied to the device) — the visualizer read button presses correctly.
  **Not yet tested:** saving any change (remap, profile, input mode) to a real device. This is a
  known gap, not specific to the bookmarklet — it applies equally to every distribution path.

## 4. Design

### 4.1 Loader build variant

A second Vite build config/script (e.g. `npm run build:loader` in ``), reusing the existing
app source, differing from the firmware build only in output config:

- `base`: the GitHub Pages URL (e.g. `https://duchimura.github.io/GP2040-CE-D_C_Theo/`), so
  every sub-resource the bundle itself requests (chunks, fonts, images) resolves against Pages,
  not against whatever page it's injected into.
- Output filenames unhashed and fixed: `dctheo-loader.js`, `dctheo-loader.css` (Rollup
  `output.entryFileNames`/`chunkFileNames`/`assetFileNames`, no `[hash]`). A cache-busting
  query param (`?v=<short-sha>`) can be added by the publish step instead, if staleness in
  browser cache becomes a real problem — deferred until observed.
- Does **not** touch `npm run build` (the firmware-embedded build) or its output
  (`lib/httpd/fsdata.c`) — this is an additional script, not a modification of the existing one.

### 4.2 Bookmarklet mechanics

The bookmarklet is a `javascript:` URI, generated (not hand-written) so it always embeds the
current Pages base URL. Conceptually:

```js
javascript:(function(){
  document.documentElement.innerHTML = '<head></head><body><div id="root"></div></body>';
  var base = 'https://duchimura.github.io/GP2040-CE-D_C_Theo/';
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'dctheo-loader.css';
  document.head.appendChild(css);
  var script = document.createElement('script');
  script.type = 'module';
  script.src = base + 'dctheo-loader.js';
  document.head.appendChild(script);
})();
```

Key properties:
- **Stays on `http://192.168.7.1`** — no navigation, so the tab's origin (and therefore the
  same-origin API calls the app makes) is unaffected.
- **No `fetch`/`XHR`** to load the bundle — only tag injection, which never triggers a CORS
  preflight (see §3).
- **Old page JS may keep running in the background** after the DOM is replaced (any timers/
  polling the stock UI had started). Expected to be harmless (same read-only endpoints, no
  shared state with the new app) but unverified — flagged as a test item (§6).

### 4.3 Landing page

A plain static HTML page (no React, no build step of its own) at the Pages root, containing:
- A one-paragraph explanation of what the tool does and what it needs (a controller in config
  mode, reachable at `192.168.7.1`).
- A visibly draggable link — `<a href="javascript:...">Drag me to your bookmarks bar</a>` — with
  a one-line reminder to make sure the bookmarks bar is visible.
- A fallback: the same code in a copyable text box, for anyone whose browser doesn't support
  drag-to-bookmark.
- A short "what this does NOT do" note: doesn't flash anything, doesn't store anything, changes
  only take effect on the controller you're connected to.

### 4.4 Publish workflow

New GitHub Actions workflow (or a job appended to the existing `www-ci.yml` pattern), triggered
on push to `main`:
1. `npm ci`, `npm run build:loader` (§4.1) in ``.
2. Generate the landing page's bookmarklet `<a href>` from the loader build's known output
   filenames + the Pages base URL (a small script, not hand-maintained HTML).
3. Publish the loader build output + landing page to GitHub Pages (`actions/deploy-pages` or
   equivalent), same repo, no new hosting account needed.

This mirrors the existing `www-ci.yml` (lint, test, build, size-check) pattern already in the
repo, adding a publish step gated on `main` only (PRs still just build/test, don't publish).

## 5. Risks / open unknowns

- **Untested: saving a change to a real device**, through any distribution path (dev-board,
  bookmarklet, or firmware-embedded). This blocks calling any of them "confirmed working" for
  the write side, not just the bookmarklet. Should be tested before this ships as the
  recommended path.
- **Untested: actual HTTP response headers from real firmware** (CSP absence, `OPTIONS`
  handling) — inferred from source, not observed on the wire.
- **Untested: DOM-takeover safety** — whether the stock page's leftover background JS causes any
  visible conflict (console errors, double-polling artifacts) once the D_C_Theo UI is mounted
  over it.
- **Browser bookmarklet support drifts over time.** Currently works in desktop Chrome, Firefox,
  Edge, Safari. No action needed now; worth a periodic sanity check.
- **Supply-chain note:** the bookmarklet always loads live code from `main` (§2, deferred
  pinning) — acceptable for a personal/early-stage fork where the repo owner controls `main`,
  but worth revisiting if this ever gets wider distribution.

## 6. Testing plan

1. **Before broader rollout:** perform an actual save (remap a button, or change input mode) via
   `npm run dev-board` against a real controller, and confirm it persists after replugging. This
   is a prerequisite check, not bookmarklet-specific.
2. Build the loader variant locally, serve it from a throwaway static server (or `python -m
   http.server`) standing in for GitHub Pages, and manually exercise the bookmarklet against a
   real controller's config page: load, read button state, remap, save, confirm persistence.
3. Confirm the landing page's drag-to-bookmark link installs correctly in Chrome, Firefox, and
   Edge on Windows, and Safari on macOS (the two platforms named in the original ask).
4. After the GitHub Actions workflow is live, confirm the published Pages URL matches what the
   generated bookmarklet embeds (i.e. the loader build and the landing page's link don't drift
   out of sync).
