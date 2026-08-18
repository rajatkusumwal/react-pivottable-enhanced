<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# inhouse-grid-monster — working agreements

This repo is one product: a commercial-style pivot table (`standalone/src/pivot`, published as the `inhouse-grid-monster` npm package)
plus a small marketing/demo site (`src/routes`). Junior developers read this code
daily, so favour the obvious solution over the clever one.

## Layout

```
standalone/src/pivot/
  PivotStudio.tsx     the one component apps embed
  types.ts            PivotConfig and friends (the report state)
  constants.ts        every tunable number lives here — no magic numbers elsewhere
  result.ts           PivotResult: the contract every engine returns
  engines/            local (browser) engine, REST backend engine, mock API, custom source
  ui/               presentational pieces (grid, toolbar, sidebar, dialogs, chart)
  *.ts                pure helpers: aggregators, filters, calculated, export, format, sort…
  *.test.ts(x)        tests sit next to the code they cover
src/routes/                   demo site; imports the library as "inhouse-grid-monster"
src/lib/pivot-comparison.ts   feature matrix shown on the home page
```

## Test-driven workflow

1. Write or extend a test next to the file you are changing (`foo.test.ts`).
2. Run `bun run test` (all) or `bunx vitest run standalone/src/pivot/foo.test.ts`.
3. Make it pass with the smallest change; keep pure logic out of components.
4. Cover three cases for anything new: the normal case, an edge case (empty
   input, one row, blanks/nulls) and the worst case (bad types, missing fields).
   See `standalone/src/pivot/edge-cases.test.ts` for the house style.
5. If the change adds a user-visible capability, update `README.md` and the
   feature matrix in `src/lib/pivot-comparison.ts`.

## Code style

- Prettier decides formatting: `bun run format` (100 cols, double quotes, semicolons).
- TypeScript strict; no `any`. Run `bunx tsgo --noEmit` before finishing.
- Named exports only; no default exports in `standalone/src/pivot`.
- New tunable numbers go in `constants.ts` with a one-line comment saying why.
- Comments explain _why_, not _what_. Prefer a clear name over a comment.
- Engines must keep returning the same `PivotResult`, so the browser engine and a
  backend service stay swappable.
