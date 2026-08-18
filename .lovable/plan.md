# Test the standalone package

Today the pivot logic is well tested inside the demo app, but the npm package itself
(`standalone/`) has no tests. The published artifact could break — a missing file, a
broken export, absent CSS — and every existing test would still pass.

## What gets added

### 1. Sync integrity test
Run the sync script, then assert:
- `standalone/src/pivot` exists and contains the same file list as `src/components/pivot`
  minus `*.test.ts(x)`.
- No `*.test.*` file survives in the synced tree.
- Re-running sync on a dirty target leaves no stale files.

### 2. Public surface test
Assert that `standalone/src/index.ts` re-exports everything a consumer needs
(`PivotStudio`, the config/result types, the engine factories) and that every export
resolves — catches the case where a file is renamed in the app but the barrel is not.

### 3. Build smoke test
A script that runs the real package build (`sync` -> `tsc` -> `vite build` -> `copy-css`)
and then asserts on the output:
- `dist/index.js`, `dist/index.d.ts` and `dist/pivot-theme.css` all exist.
- `dist/index.js` does not bundle React (peer dep stays external).
- The declaration file names `PivotStudio`.

### 4. Consumer render test
A test that imports the built bundle the way an app would and renders `PivotStudio`
with the sample dataset into jsdom, asserting the grid paints rows. This is the single
test that proves the package actually works when installed.

### 5. Wire it up
- Add `bun run test:package` at the repo root for 3 and 4 (slow, build-dependent),
  keeping the fast unit suite unchanged.
- Document both commands and the pre-publish checklist in `standalone/README.md`
  and the root `README.md`.

## Technical notes
- Tests 1 and 2 are plain Vitest files under `standalone/` run by the existing root
  Vitest config, so no second test runner is introduced.
- Tests 3 and 4 shell out to the package build once and share the artifact, so the
  slow step runs a single time.
- The build test runs in a temp dir copy where possible so it never leaves a stale
  `standalone/dist` behind for the dev server to pick up.
