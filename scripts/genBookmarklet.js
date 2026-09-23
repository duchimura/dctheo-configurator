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
	const fullCssUrl = baseUrl + cssFile;
	const fullJsUrl = baseUrl + jsFile;
	return (
		`(function(){` +
		// Bail out unless we're actually on the controller's own page — a
		// misclick on some other tab shouldn't run this against that origin.
		`if(location.hostname!=='192.168.7.1'&&!confirm('Load the D_C_Theo UI into this page?'))return;` +
		`document.documentElement.innerHTML='<head></head><body><div id="root"></div></body>';` +
		`var c=document.createElement('link');` +
		`c.rel='stylesheet';c.href=${JSON.stringify(fullCssUrl)};document.head.appendChild(c);` +
		`var s=document.createElement('script');` +
		`s.type='module';s.src=${JSON.stringify(fullJsUrl)};document.head.appendChild(s);` +
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
	const href = buildBookmarkletHref(baseUrl, jsFile, cssFile);
	return template
		.replaceAll('__BOOKMARKLET_HREF__', href)
		// The manual-fallback code box must contain the full `javascript:` URI
		// (not just the bare function source) since that's what users are told
		// to paste directly into a bookmark's URL field.
		.replaceAll('__BOOKMARKLET_CODE__', escapeHtml(href))
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
