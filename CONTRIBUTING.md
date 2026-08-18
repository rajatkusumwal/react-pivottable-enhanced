# Contributing

Welcome. This guide is written for two audiences: junior developers making their
first change here, and AI coding agents doing the same. Both should be able to
follow it top to bottom without asking anyone.

## How this project was built

Every line of this repository — library, demo site, tests and documentation —
was produced with an AI coding agent, then reviewed by a human. It is offered as
is under the MIT licence, with no warranty. **Review the code and test it in your
own environment before relying on it in production; use at your own discretion.**
The same applies to contributions: agent-generated patches are welcome, but the
person opening the pull request owns the correctness of what they submit.

## What lives where

```
standalone/src/pivot/   the library (the npm package source of truth)
  PivotStudio.tsx       the one component apps embed
  types.ts              PivotConfig and friends (the report state)
  constants.ts          every tunable number — no magic numbers elsewhere
  result.ts             PivotResult: the contract every engine returns
  engines/              local (browser), REST backend, mock API, custom source
  ui/                   presentational pieces (grid, toolbar, sidebar, dialogs, chart)
  *.ts                  pure helpers: aggregators, filters, calculated, export, format, sort
  *.test.ts(x)          tests sit next to the code they cover
standalone/tests/       packaging tests (built dist/ renders, types emit)
src/routes/             demo site; imports the library as "react-pivottable-enhanced"
src/lib/pivot-comparison.ts   feature matrix shown on the home page
```

There is only one copy of the pivot code. The site imports it through a
tsconfig path alias, so never duplicate a file into `src/`.

## Getting started

```bash
bun install
bun run dev            # demo site on http://localhost:8080
bun run test           # full unit suite
bunx tsgo --noEmit     # typecheck
bun run format         # prettier (100 cols, double quotes, semicolons)
```

Useful extras:

```bash
bunx vitest run standalone/src/pivot/sort.test.ts   # one file
bun run test:coverage                               # enforces coverage floors
bun run lib:build                                   # build the npm package
bunx vitest run --config vitest.package.config.ts   # packaging tests
```

## The workflow for a change

1. Find the file that owns the behaviour (`rg` for a string from the UI helps).
2. Write or extend the test next to it first (`foo.test.ts`).
3. Make it pass with the smallest change. Keep pure logic out of components.
4. Cover three cases for anything new:
   - the normal case,
   - an edge case (empty input, one row, blanks/nulls),
   - the worst case (bad types, missing fields).
     `standalone/src/pivot/edge-cases.test.ts` is the house style.
5. If the change is user-visible, update `standalone/README.md` and the feature
   matrix in `src/lib/pivot-comparison.ts`.
6. Run `bun run test`, `bunx tsgo --noEmit` and `bun run format` before opening
   a pull request.

## Code style

- Prettier decides formatting — do not hand-format.
- TypeScript strict; no `any`.
- Named exports only; no default exports in `standalone/src/pivot`.
- New tunable numbers go in `constants.ts` with a one-line comment saying why.
- Comments explain _why_, not _what_. Prefer a clear name over a comment.
- Engines must keep returning the same `PivotResult`, so the browser engine and
  a backend service stay swappable.
- The library must not import from the demo site (`@/...`) — every import inside
  `standalone/src/pivot` is relative or from a declared dependency.
- Style with Tailwind utility classes and the theme tokens in
  `standalone/src/pivot-theme.css`; do not hardcode hex colours.

## Adding a dependency

Don't, unless there is no reasonable alternative. The package deliberately ships
a short dependency list (`@dnd-kit/*`, `lucide-react`, `recharts`). A new runtime
dependency in the library needs a justification in the pull request and an entry
in both `standalone/package.json` and the README install notes.

## Pull requests

- One logical change per pull request; keep the diff readable.
- Title: short imperative, e.g. `fix: keep drill-through dialog inside viewport`.
- Describe what changed, why, and how you verified it.
- Tests must pass and coverage must stay above the configured floors.
- Say in the description if the change was written with an AI agent, and confirm
  you reviewed the output.

## Reporting bugs and asking for features

Open an issue on GitHub:

- [github.com/rajatkusumwal/react-pivottable-enhanced/issues](https://github.com/rajatkusumwal/react-pivottable-enhanced/issues)

Please include:

- what you did, what you expected, what happened,
- a minimal `data` + `initialConfig` snippet that reproduces it,
- library version, React version, browser.

## For AI agents

- Read `AGENTS.md` first; it is the short version of this file.
- Only change what was asked. Do not reformat or refactor unrelated files.
- Never edit `src/routeTree.gen.ts` or anything in `dist/`.
- Add the test in the same change as the code — a patch with no test is rejected.
- Verify with `bun run test` and `bunx tsgo --noEmit` and report the real output;
  do not claim success without running them.
- Do not add a second copy of the pivot source under `src/`.

## Licence

By contributing you agree that your contribution is licensed under the
[MIT licence](./LICENSE).


## Angular wrapper (`angular/`)

`angular/src` holds `react-pivottable-enhanced-angular`: a thin `<pivot-studio>`
component that mounts the React `PivotStudio`. Rules:

- Wrapper only — no pivot logic, no duplicated types. Types are re-exported from
  `react-pivottable-enhanced`.
- Every input maps 1:1 onto a React prop; outputs re-emit React callbacks inside the
  Angular zone.
- Tests sit next to the code (`angular/src/*.test.ts`) and run with the rest of the
  suite via `bun run test`.
- Build/typecheck with `bun run angular:build` / `bun run angular:typecheck`.
