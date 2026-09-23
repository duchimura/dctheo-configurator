import '@testing-library/jest-dom/vitest';
// Initialize i18n so components using useTranslation render real English strings
// (rather than raw keys) in tests.
import '../i18n';

// Mock window.matchMedia for components that use it
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
