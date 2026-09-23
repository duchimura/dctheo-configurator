# dctheo-configurator — Project Guide (for Claude Code)

A standalone web configurator for **GP2040-CE** gamepad firmware, extracted from the
`GP2040-CE-D_C_Theo` firmware fork on 2026-09-22 so it no longer depends on that fork's C++
firmware source at all. This repo works against **stock, unmodified GP2040-CE firmware** — no
reflashing, no custom firmware build. See §"Lineage" below for the full story.

The UI is a React app (Vite) that talks to a GP2040-CE controller's own HTTP config API, either
directly (a controller in config mode serves it at `http://192.168.7.1`) or via a bookmarklet
that loads this app into that same page (see the bookmarklet-loader design doc).

## Where things are

- **App:** `src/` — Vite + React 18 + TypeScript, Zustand, proto→TS via `pbjs` (the generated
  output, `src_gen/*.ts`, is committed — see "Generated code" below).
- **Our code:** everything under `src/**/dc/` plus `src/Store/useConnectionStore.ts` and
  `src/Store/useDcMode.ts` is the "D_C_Theo" enhanced UI layer. The rest of `src/` is the
  original stock GP2040-CE configurator UI this was built on top of.
- **Design specs & plans:** `docs/superpowers/specs/` and `docs/superpowers/plans/`.
- **Mock dev server:** `server/app.js` — an Express server standing in for a real controller
  during development (`npm run dev`).

## Generated code — no firmware tree to regenerate from

`src_gen/enums.ts` and `src_gen/boardWirings.ts` are normally generated from a GP2040-CE
firmware checkout's `proto/enums.proto` and `configs/*/BoardConfig.h`. **This repo has neither
directory** — that's deliberate (see Lineage). The generator scripts
(`scripts/genBoardWirings.js`) and the firmware-embedding build script (`"build"` in
`package.json`, which also calls a proto compiler and writes `lib/httpd/fsdata.c`) are still
present but **inert here** — they reference paths (`../proto`, `../../configs`, `../lib/httpd`)
that don't exist in this repo and will fail if run. Do not try to "fix" them by re-adding those
directories; the frozen, already-committed `src_gen/*.ts` files are the intended state. If a new
GP2040-CE board ships and its wiring needs adding, edit `src_gen/boardWirings.ts` by hand, or run
the generator against a separate GP2040-CE firmware checkout and copy the result in.

## Commands

- `npm run dev` — mock Express API (:8080) + Vite (:3000).
- `npm run dev-board` — same UI, proxied to a real controller at `192.168.7.1` instead of the mock.
- `npm test` — Vitest + React Testing Library.
- `npm run build:loader` / `npm run gen-bookmarklet` / `npm run publish:loader` — the
  GitHub-Pages-hosted bookmarklet loader build (see the bookmarklet-loader design doc). This is
  the build that matters in this repo — the `"build"` script is the old firmware-embedding one
  (see "Generated code" above); don't use it here.
- `npm run lint:dc` — ESLint (`--max-warnings 0`) scoped to the D_C_Theo-owned files.

## Conventions (carried over from the original fork)

- **Reuse, don't fork stock code.** Device I/O goes through the `WebApi` **default export**;
  profiles go through the stock `useProfilesStore`.
- **i18n:** all D_C_Theo UI strings go through the **`DC` namespace** (`src/Locales/en/DC.jsx`).
- **Vitest quirks:** the Vitest config intentionally omits `@vitejs/plugin-react` (Vite 4 /
  Vitest 2 refresh-preamble clash) and uses esbuild's automatic JSX; i18n is initialized in
  `src/test/setup.ts` so components render real strings.
- **Styling:** Tailwind with the **`tw-` prefix** (coexists with stock Bootstrap;
  `preflight` off).

## Lineage

This repo's entire history starts at one commit: a snapshot of `www/`'s tracked files from
`GP2040-CE-D_C_Theo` (the firmware fork) as of 2026-09-22, flattened so this repo's root is what
was that fork's `www/` directory. The original fork's git history was **not** carried over (a
deliberate choice — that fork's history had already been rewritten once before, and a fresh,
history-free copy was the lowest-risk way to split this out). The original fork remains at
`github.com/duchimura/GP2040-CE-D_C_Theo` if the firmware-embedding build/distribution path is
ever wanted again; this repo is the bet that it won't be — the web app already works against
stock firmware, and the bookmarklet loader (in progress — see the design doc/plan under
`docs/superpowers/`) is meant to be the primary way people actually get to it.

## License

MIT, carried over from GP2040-CE (`LICENSE`) — this app is a derivative of the stock GP2040-CE
web configurator (OpenStickCommunity / Jason Skuby), with the D_C_Theo UI layer added on top.
