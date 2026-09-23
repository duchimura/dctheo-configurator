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
