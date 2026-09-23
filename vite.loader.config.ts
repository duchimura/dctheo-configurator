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
