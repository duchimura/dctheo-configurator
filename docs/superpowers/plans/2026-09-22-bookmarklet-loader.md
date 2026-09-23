# Bookmarklet Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any user load the D_C_Theo web UI onto a **stock** GP2040-CE controller with no
reflashing, no install, and no code signing — by dragging a bookmarklet that, when clicked on
the controller's own `http://192.168.7.1` config page, replaces the tab's content with the UI
loaded from a hosted, published build.

**Architecture:** A second Vite build of the existing app (`vite.loader.config.ts`),
distinct from the firmware-embedded build, producing fixed-name (unhashed) output files under
`publish/`. A small generator script renders a static landing page containing the
bookmarklet (a `javascript:` URI that does DOM takeover + `<script>`/`<link>` tag injection —
never `fetch`/`XHR`, which would trigger a CORS preflight the firmware can't answer). A GitHub
Actions workflow builds and publishes `publish/` to GitHub Pages on every push to `main`.

**Tech Stack:** Vite 4, vitest 2, Node (ESM scripts, matching `scripts/genBoardWirings.js`'s
existing style), GitHub Actions + `actions/deploy-pages`.

**Spec:** `docs/superpowers/specs/2026-09-22-bookmarklet-loader-design.md`

## Global Constraints

- The firmware answers CORS with `Access-Control-Allow-Origin: *` but does **not** answer
  `OPTIONS` requests — nothing may load the published bundle via `fetch`/`XHR` (would preflight
  and fail). Only `<script src>`/`<link href>` tag injection is used.
- The bookmarklet must never navigate the tab away from `http://192.168.7.1` — the app's own API
  calls stay same-origin only because the tab's origin never changes.
- The app mounts into `<div id="root">` (`src/index.jsx:9`) — the bookmarklet's DOM takeover
  must recreate exactly that.
- Default published base URL: `https://duchimura.github.io/GP2040-CE-D_C_Theo/` (GitHub Pages
  project-site URL for this fork), overridable via the `VITE_LOADER_BASE_URL` env var.
- The loader build's output filenames are fixed and unhashed (`dctheo-loader.js`,
  `dctheo-loader.css`) — a content hash would break every already-installed bookmarklet on each
  new publish.
- No firmware (C++) changes. No modification to the existing `npm run build` /
  `lib/httpd/fsdata.c` firmware-embedded build pipeline — this is an additional, separate build
  target.
- **The loader build must not depend on `proto/` or `configs/`** (the firmware source tree). This
  repo has neither directory at all — it was extracted from the original GP2040-CE-D_C_Theo fork
  specifically so it doesn't (see `CLAUDE.md`'s "Generated code" section). Unlike the
  firmware-embedded `build` script, `build:loader` does **not** call
  `build-proto`/`gen-board-wirings` — it builds straight from whatever `src_gen/enums.ts` and
  `src_gen/boardWirings.ts` are already committed (they're tracked in git, not generated fresh
  every build — confirmed via `git ls-files src_gen/`). (This repo's own `src/` — the web app,
  e.g. `src/Components/Navigation.jsx` in Task 1 below — is unrelated to the firmware's `src/`
  and is of course still present.)
- Mobile browsers are out of scope (controller config needs a wired USB connection to a
  PC/Mac regardless of bookmarklet support).
- Bookmarklet always loads the latest published build from `main` — no version pinning (deferred
  per spec §2/§5).

---

### Task 1: Fix the nav logo's hardcoded root path

The loader build's `base` won't be `/` — a hardcoded `src="/images/logo.png"` would try to load
from `http://192.168.7.1/images/logo.png` (wrong path on the device) once the bookmarklet's DOM
takeover happens. Fix it to use Vite's own base-URL variable, which is `/` by default (identical
to today) and the Pages URL only in the loader build.

**Files:**
- Modify: `src/Components/Navigation.jsx:72`
- Test: `src/Components/Navigation.test.jsx` (new)

**Interfaces:**
- Produces: no new exports — this is a template-string fix inside `Navigation`'s existing JSX.

- [ ] **Step 1: Write the failing test**

Create `src/Components/Navigation.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../Contexts/AppContext';
import Navigation from './Navigation';

const renderNav = () =>
  render(
    <AppContext.Provider
      value={{
        buttonLabels: { buttonLabelType: 'gp2040' },
        setButtonLabels: vi.fn(),
      }}
    >
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    </AppContext.Provider>,
  );

describe('Navigation logo', () => {
  it("points the logo at the app's own base URL, not a hardcoded root path", () => {
    renderNav();
    const logo = screen.getByAltText('GP2040-CE logo');
    // import.meta.env.BASE_URL defaults to '/' in this test environment, matching
    // today's firmware-embedded behavior exactly; the loader build
    // (vite.loader.config.ts, Task 2) sets BASE_URL to the published site's URL
    // instead, so this same source resolves correctly in both contexts.
    expect(logo).toHaveAttribute('src', `${import.meta.env.BASE_URL}images/logo.png`);
    expect(logo.getAttribute('src')).toBe('/images/logo.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/Components/Navigation.test.jsx`
Expected: FAIL — the rendered `src` is the literal string `/images/logo.png` today, so the first
assertion (comparing against a template using `import.meta.env.BASE_URL`) currently happens to
pass (both are `/images/logo.png` by default), but if it fails for any other reason (missing
provider, render error), fix the harness before moving on. If both assertions already pass, that
only confirms the *default* case matches — proceed to Step 3 regardless, since the real bug (a
hardcoded string that can't follow a different `base`) isn't visible from the default-base test
alone; Step 3's source change is what makes the assertion meaningful (`toHaveAttribute` against
the *dynamic* `import.meta.env.BASE_URL` expression, not a hardcoded string).

- [ ] **Step 3: Fix the source**

In `src/Components/Navigation.jsx`, change:

```jsx
					<img
						src="/images/logo.png"
						className="title-logo"
						alt="GP2040-CE logo"
					/>
```

to:

```jsx
					<img
						src={`${import.meta.env.BASE_URL}images/logo.png`}
						className="title-logo"
						alt="GP2040-CE logo"
					/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/Components/Navigation.test.jsx`
Expected: PASS

- [ ] **Step 5: Run the full suite and lint to confirm nothing else broke**

Run: `npx vitest run && npm run lint:dc`
Expected: all tests pass; lint clean (`Navigation.jsx`/`Navigation.test.jsx` aren't in `lint:dc`'s
scoped file list, so this only guards against a regression in the `dc`-owned files).

- [ ] **Step 6: Commit**

```bash
git add src/Components/Navigation.jsx src/Components/Navigation.test.jsx
git commit -m "fix(www): resolve the nav logo against the app's base URL, not a hardcoded root path"
```

---

### Task 2: Loader Vite build config

**Files:**
- Create: `scripts/loaderConfig.js`
- Create: `vite.loader.config.ts`
- Test: `vite.loader.config.test.ts` (new)

**Interfaces:**
- Produces: `LOADER_BASE_URL: string`, `LOADER_JS_FILE: string`, `LOADER_CSS_FILE: string`
  (from `scripts/loaderConfig.js`) — consumed by Task 3's generator script so the published
  bundle's filenames and the bookmarklet that references them can never drift apart.
- Produces: `vite.loader.config.ts`'s default export — a Vite `UserConfig` object consumed
  by the `build:loader` npm script (Task 4).

- [ ] **Step 1: Write the failing test**

Create `vite.loader.config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import loaderConfig from './vite.loader.config';
import { LOADER_BASE_URL, LOADER_JS_FILE, LOADER_CSS_FILE } from './scripts/loaderConfig.js';

describe('vite.loader.config', () => {
  it('publishes under the loader base URL, not the default root', () => {
    expect(loaderConfig.base).toBe(LOADER_BASE_URL);
    expect(loaderConfig.base?.endsWith('/')).toBe(true);
  });

  it('outputs to publish/, replacing prior contents on each build', () => {
    expect(loaderConfig.build?.outDir).toMatch(/publish$/);
    expect(loaderConfig.build?.emptyOutDir).toBe(true);
  });

  it('uses a fixed, unhashed entry filename so the bookmarklet URL never changes', () => {
    const output = loaderConfig.build?.rollupOptions?.output as { entryFileNames?: string };
    expect(output.entryFileNames).toBe(LOADER_JS_FILE);
  });

  it("names the CSS output file the bookmarklet's stable CSS filename, leaving other assets alone", () => {
    const output = loaderConfig.build?.rollupOptions?.output as {
      assetFileNames?: (info: { name?: string }) => string;
    };
    expect(output.assetFileNames?.({ name: 'index.css' })).toBe(LOADER_CSS_FILE);
    expect(output.assetFileNames?.({ name: 'logo.png' })).toBe('assets/[name][extname]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run vite.loader.config.test.ts`
Expected: FAIL with a module-not-found error for `./vite.loader.config` and
`./scripts/loaderConfig.js`.

- [ ] **Step 3: Write the shared constants module**

Create `scripts/loaderConfig.js`:

```js
// Shared source of truth for the bookmarklet-loader build (vite.loader.config.ts,
// Task 2) and the bookmarklet/landing-page generator (genBookmarklet.js, Task 3),
// so the published bundle's URL and the bookmarklet that references it can never
// drift out of sync with each other.
export const LOADER_BASE_URL =
	process.env.VITE_LOADER_BASE_URL ||
	'https://duchimura.github.io/GP2040-CE-D_C_Theo/';
export const LOADER_JS_FILE = 'dctheo-loader.js';
export const LOADER_CSS_FILE = 'dctheo-loader.css';
```

- [ ] **Step 4: Write the loader Vite config**

Create `vite.loader.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {
	LOADER_BASE_URL,
	LOADER_JS_FILE,
	LOADER_CSS_FILE,
} from './scripts/loaderConfig.js';

// Builds the same app as vite.config.ts, but for the bookmarklet loader (see
// docs/superpowers/specs/2026-09-22-bookmarklet-loader-design.md) instead of the
// firmware-embedded build: `base` points at the published GitHub Pages site (so
// every sub-resource the bundle itself requests resolves there, not against
// whatever page the bookmarklet injects it into — see Task 1's logo fix for why
// this matters), and output filenames are fixed and unhashed (the bookmarklet
// needs one URL that never changes between publishes).
export default defineConfig({
	base: LOADER_BASE_URL,
	build: {
		outDir: path.join(__dirname, 'publish'),
		emptyOutDir: true,
		sourcemap: false,
		cssCodeSplit: false,
		rollupOptions: {
			output: {
				entryFileNames: LOADER_JS_FILE,
				chunkFileNames: 'dctheo-loader-[name].js',
				assetFileNames: (assetInfo) => {
					if (assetInfo.name && assetInfo.name.endsWith('.css')) {
						return LOADER_CSS_FILE;
					}
					return 'assets/[name][extname]';
				},
			},
		},
	},
	plugins: [react()],
	resolve: {
		alias: {
			'~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
			lodash: 'lodash-es',
			'@proto': path.resolve(__dirname, 'src_gen'),
		},
	},
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run vite.loader.config.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/loaderConfig.js vite.loader.config.ts vite.loader.config.test.ts
git commit -m "feat(www): add the loader build's Vite config (fixed filenames, Pages base URL)"
```

---

### Task 3: Bookmarklet + landing page generator

**Files:**
- Create: `loader/landing.template.html`
- Create: `scripts/genBookmarklet.js`
- Test: `scripts/genBookmarklet.test.js` (new)

**Interfaces:**
- Consumes: `LOADER_BASE_URL`, `LOADER_JS_FILE`, `LOADER_CSS_FILE` from
  `scripts/loaderConfig.js` (Task 2).
- Produces: `buildBookmarkletSource(baseUrl, jsFile, cssFile): string`,
  `buildBookmarkletHref(baseUrl, jsFile, cssFile): string`, `escapeHtml(str): string`,
  `renderLandingPage(template, baseUrl, jsFile, cssFile): string` — all pure functions, exported
  for testing; `main()` (unexported, guarded, writes `publish/index.html`) is what the
  `gen-bookmarklet` npm script (Task 4) runs.

- [ ] **Step 1: Write the failing tests**

Create `scripts/genBookmarklet.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
	buildBookmarkletSource,
	buildBookmarkletHref,
	escapeHtml,
	renderLandingPage,
} from './genBookmarklet.js';

const BASE = 'https://duchimura.github.io/GP2040-CE-D_C_Theo/';
const JS = 'dctheo-loader.js';
const CSS = 'dctheo-loader.css';

describe('buildBookmarkletSource', () => {
	it('replaces the whole document and injects the loader script/link tags', () => {
		const source = buildBookmarkletSource(BASE, JS, CSS);
		expect(source).toContain('document.documentElement.innerHTML');
		expect(source).toContain('id="root"');
		expect(source).toContain(`${BASE}${CSS}`);
		expect(source).toContain(`${BASE}${JS}`);
	});

	it('never uses fetch/XHR to load the bundle (would trigger an unanswerable CORS preflight)', () => {
		const source = buildBookmarkletSource(BASE, JS, CSS);
		expect(source).not.toMatch(/fetch\(|XMLHttpRequest/);
	});

	it("loads the script as a module, matching the bundle's own module output", () => {
		expect(buildBookmarkletSource(BASE, JS, CSS)).toContain("s.type='module'");
	});
});

describe('buildBookmarkletHref', () => {
	it('produces a javascript: URI that decodes back to the exact source', () => {
		const href = buildBookmarkletHref(BASE, JS, CSS);
		expect(href.startsWith('javascript:')).toBe(true);
		const decoded = decodeURIComponent(href.slice('javascript:'.length));
		expect(decoded).toBe(buildBookmarkletSource(BASE, JS, CSS));
	});
});

describe('escapeHtml', () => {
	it('escapes the characters that would break embedding inside <pre>', () => {
		expect(escapeHtml(`a<b>c&d"e`)).toBe('a&lt;b&gt;c&amp;d&quot;e');
	});
});

describe('renderLandingPage', () => {
	const template =
		'<a href="__BOOKMARKLET_HREF__">go</a><pre>__BOOKMARKLET_CODE__</pre><p>__BASE_URL__</p>';

	it('fills in the href, the escaped source, and the base URL', () => {
		const html = renderLandingPage(template, BASE, JS, CSS);
		expect(html).toContain(`href="${buildBookmarkletHref(BASE, JS, CSS)}"`);
		expect(html).toContain(escapeHtml(buildBookmarkletSource(BASE, JS, CSS)));
		expect(html).toContain(`<p>${BASE}</p>`);
		expect(html).not.toContain('__BOOKMARKLET_HREF__');
		expect(html).not.toContain('__BOOKMARKLET_CODE__');
		expect(html).not.toContain('__BASE_URL__');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/genBookmarklet.test.js`
Expected: FAIL — `./genBookmarklet.js` doesn't exist yet.

- [ ] **Step 3: Write the landing page template**

Create `loader/landing.template.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>D_C_Theo Edition — Bookmarklet Loader</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; color: #1e293b; }
  h1 { font-size: 1.5rem; }
  .bookmarklet { display: inline-block; padding: 0.6rem 1.2rem; margin: 1rem 0; background: #0284c7; color: #fff; text-decoration: none; border-radius: 0.375rem; font-weight: 600; cursor: grab; }
  code, pre { background: #f1f5f9; padding: 0.75rem; display: block; border-radius: 0.375rem; overflow-x: auto; font-size: 0.85rem; white-space: pre-wrap; word-break: break-all; }
  .note { background: #fffbeb; border: 1px solid #fde68a; padding: 0.75rem 1rem; border-radius: 0.375rem; margin: 1.5rem 0; }
</style>
</head>
<body>
  <h1>D_C_Theo Edition — GP2040-CE UI Loader</h1>
  <p>
    This tool loads the D_C_Theo web interface into the page your GP2040-CE
    controller already serves at <code>http://192.168.7.1</code> — no reflashing,
    no install, nothing to download. It works with stock GP2040-CE firmware.
  </p>
  <p>
    First, make sure your browser's bookmarks bar is visible, then drag this link
    onto it:
  </p>
  <p>
    <a class="bookmarklet" href="__BOOKMARKLET_HREF__">D_C_Theo UI</a>
  </p>
  <p>
    To use it: put your controller into web-config mode, open
    <code>http://192.168.7.1</code> in your browser, then click the bookmarklet.
  </p>
  <p>
    If your browser won't let you drag the link above, create a new bookmark by
    hand and paste this into its URL field:
  </p>
  <pre>__BOOKMARKLET_CODE__</pre>
  <div class="note">
    This does not flash or modify your controller's firmware, and it doesn't store
    anything anywhere — it only changes what your browser shows, for as long as
    that tab stays open. Any changes you save (button mappings, profiles, and so
    on) are written to the controller you're connected to, exactly as the stock
    interface does.
  </div>
  <p><small>Published from <code>__BASE_URL__</code></small></p>
</body>
</html>
```

- [ ] **Step 4: Write the generator script**

Create `scripts/genBookmarklet.js`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOADER_BASE_URL, LOADER_JS_FILE, LOADER_CSS_FILE } from './loaderConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Builds the bookmarklet's javascript: source: replace the current tab's DOM
// (the controller's own http://192.168.7.1 page) with a fresh mount point, then
// load the published loader bundle into it via tag injection — never fetch/XHR,
// which would trigger a CORS preflight the firmware can't answer (see design
// spec §3/§4.2).
export function buildBookmarkletSource(baseUrl, jsFile, cssFile) {
	return (
		`(function(){` +
		`document.documentElement.innerHTML='<head></head><body><div id="root"></div></body>';` +
		`var b=${JSON.stringify(baseUrl)};` +
		`var c=document.createElement('link');` +
		`c.rel='stylesheet';c.href=b+${JSON.stringify(cssFile)};document.head.appendChild(c);` +
		`var s=document.createElement('script');` +
		`s.type='module';s.src=b+${JSON.stringify(jsFile)};document.head.appendChild(s);` +
		`})();`
	);
}

export function buildBookmarkletHref(baseUrl, jsFile, cssFile) {
	return 'javascript:' + encodeURIComponent(buildBookmarkletSource(baseUrl, jsFile, cssFile));
}

export function escapeHtml(str) {
	return str
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export function renderLandingPage(template, baseUrl, jsFile, cssFile) {
	const source = buildBookmarkletSource(baseUrl, jsFile, cssFile);
	const href = buildBookmarkletHref(baseUrl, jsFile, cssFile);
	return template
		.replaceAll('__BOOKMARKLET_HREF__', href)
		.replaceAll('__BOOKMARKLET_CODE__', escapeHtml(source))
		.replaceAll('__BASE_URL__', baseUrl);
}

function main() {
	const templatePath = path.join(__dirname, '..', 'loader', 'landing.template.html');
	const publishDir = path.join(__dirname, '..', 'publish');
	const template = fs.readFileSync(templatePath, 'utf8');
	const html = renderLandingPage(template, LOADER_BASE_URL, LOADER_JS_FILE, LOADER_CSS_FILE);
	fs.mkdirSync(publishDir, { recursive: true });
	fs.writeFileSync(path.join(publishDir, 'index.html'), html);
	console.log(`gen-bookmarklet: wrote ${path.join(publishDir, 'index.html')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run scripts/genBookmarklet.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add loader/landing.template.html scripts/genBookmarklet.js scripts/genBookmarklet.test.js
git commit -m "feat(www): generate the bookmarklet and its landing page from a template"
```

---

### Task 4: Wire the npm scripts and verify the publish pipeline locally

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `build:loader` runs `vite.loader.config.ts` (Task 2); `gen-bookmarklet` runs
  `scripts/genBookmarklet.js`'s `main()` (Task 3).
- Produces: `npm run publish:loader` — the single command Task 5's CI workflow calls.

- [ ] **Step 1: Add the npm scripts**

In `package.json`, inside `"scripts"`, add these three entries:

```json
		"build:loader": "npx vite build --config vite.loader.config.ts",
		"gen-bookmarklet": "node scripts/genBookmarklet.js",
		"publish:loader": "npm run build:loader && npm run gen-bookmarklet",
```

Unlike the firmware-embedded `"build"` script, `build:loader` deliberately does **not** run
`build-proto`/`gen-board-wirings` first — it builds straight from whatever `src_gen/enums.ts` and
`src_gen/boardWirings.ts` are already committed in the working tree. This is what keeps the
loader buildable independent of `../proto` and `../configs` (see Global Constraints) — Step 4
below proves it.

- [ ] **Step 2: Ignore the generated publish directory**

In `.gitignore`, add `/publish` next to the existing `/build` entry:

```
# production
/build
/publish
```

- [ ] **Step 3: Confirm the loader build has no firmware-tree dependency**

This repo (`dctheo-configurator`) was extracted from the original GP2040-CE-D_C_Theo fork
specifically so it has no `proto/`/`configs/` firmware source tree at all — the decoupling this
step exists to check is structural here, not something to simulate with a temporary rename. Two
checks:

```bash
grep -c "build-proto\|gen-board-wirings" package.json
```

Expected: the `build:loader` script line contains neither string (a `grep -c` on the whole file
is fine to be nonzero from the *other*, unrelated `build-proto`/`gen-board-wirings` script
entries still present in `package.json` from the original repo — those are dead/inapplicable
here, since there is no `proto/` or `configs/` for them to read; confirm with `cat package.json`
that `build:loader`'s own line doesn't call either).

```bash
ls proto configs 2>&1
```

Expected: `No such file or directory` for both — confirming there is nothing for `build:loader` to
have depended on in the first place.

- [ ] **Step 4: Run the full publish pipeline locally**

Run: `npm run publish:loader`
Expected: completes with no errors, ending in the `gen-bookmarklet: wrote ...` log line from
Task 3.

- [ ] **Step 5: Verify the published output**

Run (bash):

```bash
ls publish/index.html publish/dctheo-loader.js publish/dctheo-loader.css publish/images/logo.png
```

Expected: all four files listed, none missing. (`images/logo.png` comes from Vite's automatic
`public/` copy — confirms Task 1's base-URL fix has a real file to resolve against once
published.)

Run:

```bash
grep -o 'javascript:[^"]*' publish/index.html | head -c 80
```

Expected: prints the start of a `javascript:...` URI (confirms the bookmarklet link rendered,
not a leftover `__BOOKMARKLET_HREF__` placeholder).

- [ ] **Step 6: Visually check the landing page**

Run: `npx serve publish -l 4173` (or `python -m http.server 4173` from inside `publish`),
then open `http://localhost:4173` in a browser. Expected: the landing page renders with the blue
"D_C_Theo UI" bookmarklet link, the fallback code box below it, and the yellow "does not flash…"
note. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 7: Run the full test suite and lint**

Run: `npx vitest run && npm run lint:dc`
Expected: all tests pass (including Tasks 1–3's new tests); lint clean.

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore
git commit -m "feat(www): wire up the publish:loader pipeline, decoupled from firmware regen"
```

---

### Task 5: GitHub Actions publish workflow

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `npm run publish:loader` (Task 4).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/pages.yml`:

```yaml
name: Publish bookmarklet loader

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint:dc
      - run: npx vitest run
      - run: npm run publish:loader
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: publish

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: One-time manual repo setting (cannot be done via a file change)**

In the GitHub repo's web UI: **Settings → Pages → Build and deployment → Source**, select
**"GitHub Actions"** (not "Deploy from a branch"). This is a one-time setting; without it, the
`deploy` job's `actions/deploy-pages` step fails with an explicit error naming this setting.
Confirm this step was done — this plan's remaining steps assume it has been.

- [ ] **Step 3: Commit the workflow**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: publish the bookmarklet loader to GitHub Pages on push to main"
```

- [ ] **Step 4: Push and verify the run**

Push the branch this plan's commits are on, merge to `main` per the project's normal workflow
(see `CLAUDE.md`'s Git/workflow section), then open the repo's **Actions** tab and confirm the
"Publish bookmarklet loader" run for the `main` push succeeds (both the `build` and `deploy`
jobs green). Open the resulting Pages URL (shown in the `deploy` job's output, or
**Settings → Pages**) and confirm it shows the same landing page verified locally in Task 4 Step
5.

---

### Task 6: Real-controller verification

This is the spec's explicit prerequisite gate (§5/§6) — confirm a save actually persists on real
hardware, through the bookmarklet path specifically, before treating this as done. Needs a real
GP2040-CE controller in web-config mode, reachable at `192.168.7.1`.

**Files:** none (verification only).

- [ ] **Step 1: Confirm a save persists via the existing dev-board path (baseline)**

With the controller connected and in config mode:

```bash
npm run dev-board
```

In the opened browser tab, make one real change (e.g. remap a button, or change the input mode
via the toolbar dropdown added in the earlier input-mode-selector work), save it, then unplug and
replug the controller and reload the page. Expected: the change is still there. If it is **not**,
stop here — this is a pre-existing gap unrelated to the bookmarklet, and needs its own
investigation before the bookmarklet path can be trusted at all.

- [ ] **Step 2: Confirm the bookmarklet loads against the real device**

With the controller still connected and in config mode, open `http://192.168.7.1` directly in a
browser tab (not through the `dev-board` proxy this time — this is the real path a user takes).
In a second tab, open the published landing page (the local one from Task 4 Step 5, or the live
Pages URL from Task 5 Step 4). Drag the bookmarklet to the bookmarks bar, switch to the first
tab, and click it.

Expected: the tab's content is replaced by the D_C_Theo UI, and the connection banner shows the
controller connected (matching the earlier live check where the visualizer picked up button
presses).

- [ ] **Step 3: Confirm a save persists via the bookmarklet path**

In that same bookmarklet-loaded tab, repeat Step 1's change-and-verify: make a real change, save
it, unplug/replug, reload `http://192.168.7.1` fresh (stock page), click the bookmarklet again.

Expected: the change is still there — confirming the bookmarklet path's saves are exactly as
durable as the direct/dev-board path's.

- [ ] **Step 4: Spot-check drag-to-bookmark on the target platforms**

On Windows (Chrome or Edge) and, if available, macOS (Safari or Chrome): open the landing page,
confirm the bookmarklet link drags onto the bookmarks bar and the resulting bookmark's URL starts
with `javascript:`. If macOS isn't available in this environment, note it as unverified rather
than skipping the record of it.

- [ ] **Step 5: Record results**

Update this plan's checkboxes to reflect what was actually confirmed, and note in the PR/commit
message (per Task 5's push) any platform or step that couldn't be verified in this environment,
so it's an explicit known gap rather than a silent assumption.
