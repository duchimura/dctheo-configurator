# dctheo-configurator

A web configurator for **GP2040-CE** gamepad firmware, with a redesigned "D_C_Theo" interface
layered on top of the stock UI. Works against **stock, unmodified GP2040-CE firmware** — no
custom firmware, no reflashing.

Extracted from the `GP2040-CE-D_C_Theo` firmware fork (`github.com/duchimura/GP2040-CE-D_C_Theo`)
on 2026-09-22; see `CLAUDE.md`'s "Lineage" section for why, and
`docs/superpowers/specs/2026-09-22-bookmarklet-loader-design.md` for where this is headed: a
bookmarklet, hosted on GitHub Pages, that loads this UI directly into a controller's own config
page at `http://192.168.7.1` — no install, no download, nothing to build yourself.

## Requirements

* Node.js and npm

## Development

### Mocked board

```
npm run dev
```

Starts the React app (Vite, `:3000`) and an Express mock of the controller's API (`:8080`) —
lets you work on the UI without a real controller attached.

### Connected board

```
npm run dev-board
```

Same UI, proxied to a real GP2040-CE controller in web-config mode at `http://192.168.7.1`.

## Testing

```
npm test        # Vitest + React Testing Library
npm run lint:dc  # ESLint, scoped to the D_C_Theo-owned files
```

## The bookmarklet loader build

```
npm run publish:loader
```

Builds this app for hosting on GitHub Pages under a fixed, unhashed filename (so an
already-installed bookmarklet keeps working across releases) and generates the landing page with
the bookmarklet link. See `docs/superpowers/specs/2026-09-22-bookmarklet-loader-design.md` and
`docs/superpowers/plans/2026-09-22-bookmarklet-loader.md` for the full design and implementation
plan.

## What NOT to run here

`npm run build`, `npm run build-proto`, `npm run gen-board-wirings`, and `npm run size-check` are
left over from this repo's firmware-fork origin. They reference a `proto/`/`configs/` firmware
source tree that does not exist in this repo and will fail. See `CLAUDE.md`'s "Generated code"
section.
