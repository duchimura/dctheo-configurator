import { describe, it, expect, afterEach, vi } from 'vitest';

// loaderConfig.js reads process.env.VITE_LOADER_BASE_URL at module-evaluation
// time, so each scenario needs a fresh module instance with the env var set
// beforehand.
async function loadWithEnv(value) {
	vi.resetModules();
	if (value === undefined) {
		vi.unstubAllEnvs();
	} else {
		vi.stubEnv('VITE_LOADER_BASE_URL', value);
	}
	return import('./loaderConfig.js');
}

describe('LOADER_BASE_URL normalization', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('defaults to the dctheo-configurator Pages URL when no env var is set', async () => {
		const { LOADER_BASE_URL } = await loadWithEnv(undefined);
		expect(LOADER_BASE_URL).toBe('https://duchimura.github.io/dctheo-configurator/');
	});

	it('adds a trailing slash when a provided base URL is missing one', async () => {
		const { LOADER_BASE_URL } = await loadWithEnv('https://duchimura.github.io/dctheo-configurator');
		expect(LOADER_BASE_URL).toBe('https://duchimura.github.io/dctheo-configurator/');
		expect(LOADER_BASE_URL.endsWith('//')).toBe(false);
	});

	it('does not double up a trailing slash when one is already present', async () => {
		const { LOADER_BASE_URL } = await loadWithEnv('https://duchimura.github.io/dctheo-configurator/');
		expect(LOADER_BASE_URL).toBe('https://duchimura.github.io/dctheo-configurator/');
		expect(LOADER_BASE_URL.endsWith('//')).toBe(false);
	});

	it('collapses multiple trailing slashes to exactly one', async () => {
		const { LOADER_BASE_URL } = await loadWithEnv('https://duchimura.github.io/dctheo-configurator//');
		expect(LOADER_BASE_URL).toBe('https://duchimura.github.io/dctheo-configurator/');
	});
});
