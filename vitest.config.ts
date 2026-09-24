import { defineConfig } from 'vitest/config';
import path from 'path';

// NOTE: We intentionally do NOT use @vitejs/plugin-react here. This project pins
// Vite 4 while Vitest 2 bundles Vite 5, and the two React-refresh runtimes clash
// ("@vitejs/plugin-react can't detect preamble"). esbuild's automatic JSX runtime
// transforms .tsx for tests without needing the refresh preamble.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@proto': path.resolve(__dirname, 'src_gen'),
      lodash: 'lodash-es',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Vitest's own defaults don't exclude .worktrees/ (only .git/.cache/etc.), so a
    // git worktree created inside this repo (e.g. for SDD/agent-managed work) gets
    // walked and its test files collected a second time, silently doubling every
    // count. Extend the default exclude list rather than replace it.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/.worktrees/**',
    ],
  },
});
