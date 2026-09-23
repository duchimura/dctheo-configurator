import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { LOADER_BASE_URL } from './loaderConfig.js';

// This is the REAL regression guard for "the loader build's bundle must use
// the configured base URL for the logo, not a hardcoded '/images/logo.png'"
// (Navigation.jsx / import.meta.env.BASE_URL). Navigation.test.jsx cannot
// catch this on its own: import.meta.env.BASE_URL is '/' in the Vitest/jsdom
// environment regardless of source, so the string it asserts against is
// identical whether or not the fix is present. Only an actual production
// build with vite.loader.config.ts's `base` set can distinguish them, because
// only then does Vite substitute the real LOADER_BASE_URL into the bundle.
//
// This test intentionally does NOT trigger `npm run build:loader` itself (a
// ~30s Vite build inside a unit-test run would slow every `vitest run` and
// risks flakiness/parallel-worker contention). It instead asserts against
// publish/dctheo-loader.js when a build already exists — e.g. right after
// `npm run build:loader` / `npm run publish:loader` — and skips (rather than
// failing) when it doesn't, so a plain `npx vitest run` on a clean checkout
// stays green without a prior manual build step.
const publishJsPath = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'publish',
	'dctheo-loader.js',
);

describe('loader build output', () => {
	const hasBuild = fs.existsSync(publishJsPath);

	it.runIf(hasBuild)(
		"uses the configured LOADER_BASE_URL for the logo, not a hardcoded '/images/logo.png'",
		() => {
			const bundle = fs.readFileSync(publishJsPath, 'utf8');
			expect(bundle).toContain(`${LOADER_BASE_URL}images/logo.png`);
			expect(bundle).not.toContain('"/images/logo.png"');
			expect(bundle).not.toContain("'/images/logo.png'");
		},
	);

	it.skipIf(hasBuild)(
		'skipped: no publish/dctheo-loader.js found — run `npm run build:loader` first to exercise this guard',
		() => {},
	);
});
