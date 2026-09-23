/**
 * @vitest-environment node
 */
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
