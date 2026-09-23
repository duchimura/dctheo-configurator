// Shared source of truth for the bookmarklet-loader build (vite.loader.config.ts,
// Task 2) and the bookmarklet/landing-page generator (genBookmarklet.js, Task 3),
// so the published bundle's URL and the bookmarklet that references it can never
// drift out of sync with each other.

// Ensure exactly one trailing slash, regardless of what CI or a local env var
// provides (e.g. actions/configure-pages@v5's base_url output may or may not
// already have one, and a hand-set env var can't be trusted either).
function withTrailingSlash(url) {
	return url.replace(/\/*$/, '/');
}

export const LOADER_BASE_URL = withTrailingSlash(
	process.env.VITE_LOADER_BASE_URL || 'https://duchimura.github.io/dctheo-configurator/',
);
export const LOADER_JS_FILE = 'dctheo-loader.js';
export const LOADER_CSS_FILE = 'dctheo-loader.css';
