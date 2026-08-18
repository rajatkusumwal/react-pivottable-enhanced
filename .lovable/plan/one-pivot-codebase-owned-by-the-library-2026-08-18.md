# One pivot codebase, owned by the library

Today the pivot code exists twice on disk: `src/components/pivot` (the real source) and
`standalone/src/pivot` (a committed copy produced by `sync-from-app.mjs`). We flip the
ownership: the library folder becomes the only copy, and the demo site imports it.

## What changes for you

- There is exactly one place to edit pivot code: `standalone/src/pivot`.
- The demo site keeps working exactly as it does now — same pages, same behaviour.
- No more sync step. Building or publishing the package no longer copies files around.
- No monorepo/workspace machinery; plain folders and a path alias, as you asked.

## The move

1. Move `src/components/pivot/**` (including the `*.test.ts(x)` files) to
   `standalone/src/pivot/`. `standalone/src/index.ts` already re-exports that folder,
   so the package's public API is unchanged.
2. Delete `standalone/scripts/sync-from-app.mjs` and the `sync` script, plus the
   sync-integrity tests in `standalone/tests/package.test.ts` and the sync step in
   `standalone/tests/global-setup.ts` (they exist only to police the copy).

## How the site imports it

Add one alias in `tsconfig.json` so app code imports the library by its package name:

```json
"paths": {
  "@/*": ["./src/*"],
  "react-pivottable-enhanced": ["./standalone/src/index.ts"],
  "react-pivottable-enhanced/*": ["./standalone/src/*"]
}
```

`vite-tsconfig-paths` is already in both the app and the Vitest configs, so the alias
resolves in dev, build and tests with no extra plugin. Then rewrite the site's imports
(`src/routes/demos.tsx`, `src/routes/docs.tsx` and anything else touching
`@/components/pivot`) to `from "react-pivottable-enhanced"` — the same import a consumer of the
npm package writes, which means the demo site now dogfoods the published API.

## Tests

- `vitest.config.ts`: change `include` to `["src/**/*.test.{ts,tsx}", "standalone/src/**/*.test.{ts,tsx}", "standalone/tests/package.test.ts"]` so the ~296 pivot tests run from their new home.
- `standalone/tests/package.test.ts` keeps the export-surface checks (every documented
  symbol resolves from `standalone/src/index.ts`) and drops the copy checks.
- `bun run test:package` (real build + consumer render) is unchanged; its global setup
  simply no longer runs a sync.
- Expected result: the same 308 tests green.

## Packaging details

- `standalone/tsconfig.build.json`: exclude `src/**/*.test.*` so tests are not typechecked
  or emitted into `dist`.
- `standalone/vite.config.ts`: same exclusion for the library build entry.
- `standalone/package.json`: `files` becomes `["dist", "README.md"]` (source no longer
  shipped, so no test files can leak into the tarball); `build` becomes
  `vite build && tsc -p tsconfig.build.json && node scripts/copy-css.mjs`.

## Docs

- `README.md` and `standalone/README.md`: replace the "sync from app" workflow with
  "edit `standalone/src/pivot`, the site imports it via the alias", and update the
  pre-publish checklist.
- `AGENTS.md` / project layout section: point the pivot path at `standalone/src/pivot`.
