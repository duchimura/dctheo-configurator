import '@testing-library/jest-dom/vitest';
// Initialize i18n so components using useTranslation render real English strings
// (rather than raw keys) in tests.
import '../i18n';

// Polyfill TextEncoder/TextDecoder for jsdom + esbuild compatibility.
// esbuild checks `new TextEncoder().encode("") instanceof Uint8Array`, and jsdom's
// TextEncoder returns a different Uint8Array class. This polyfill imports the
// node implementation, which esbuild recognizes.
import { TextEncoder, TextDecoder } from 'util';
Object.assign(globalThis, { TextEncoder, TextDecoder });

// Mock window.matchMedia for components that use it (jsdom only)
if (typeof window !== 'undefined') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {}, // deprecated but required
			removeListener: () => {}, // deprecated but required
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => true,
		}),
	});
}
