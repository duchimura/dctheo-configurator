// Shared source of truth for the bookmarklet-loader build (vite.loader.config.ts,
// Task 2) and the bookmarklet/landing-page generator (genBookmarklet.js, Task 3),
// so the published bundle's URL and the bookmarklet that references it can never
// drift out of sync with each other.
export const LOADER_BASE_URL =
	process.env.VITE_LOADER_BASE_URL ||
	'https://duchimura.github.io/GP2040-CE-D_C_Theo/';
export const LOADER_JS_FILE = 'dctheo-loader.js';
export const LOADER_CSS_FILE = 'dctheo-loader.css';
