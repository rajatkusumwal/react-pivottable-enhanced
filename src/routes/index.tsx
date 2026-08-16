import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Minus, X, Search } from "lucide-react";
import {
  categories,
  products,
  scoreFor,
  totalFeatures,
  verdicts,
  type Cell,
  type ProductKey,
} from "@/lib/pivot-comparison";
import { cn } from "@/lib/utils";

const TITLE = "Flexmonster vs react-pivottable vs Orb.js — Pivot Feature Matrix";
const DESCRIPTION =
  "A 150-row feature-by-feature comparison of Flexmonster Pivot Table with the open-source react-pivottable and Orb.js libraries: grid, filters, charts, exports, data sources and licensing.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparisonPage,
});

const statusMeta = {
  yes: {
    label: "Supported",
    Icon: Check,
    text: "text-support-yes",
    chip: "bg-support-yes-soft text-support-yes",
  },
  partial: {
    label: "Partial",
    Icon: Minus,
    text: "text-support-partial",
    chip: "bg-support-partial-soft text-support-partial",
  },
  no: {
    label: "Not supported",
    Icon: X,
    text: "text-support-no",
    chip: "bg-support-no-soft text-support-no",
  },
} as const;

function SupportCell({ cell, product }: { cell: Cell; product: string }) {
  const meta = statusMeta[cell.s];
  const { Icon } = meta;
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full",
          meta.chip,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        <span className="sr-only">{`${product}: ${meta.label}`}</span>
      </span>
      {cell.note && (
        <span className="text-[11px] leading-tight text-muted-foreground">{cell.note}</span>
      )}
    </div>
  );
}

function ComparisonPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [diffOnly, setDiffOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => activeCategory === "all" || c.id === activeCategory)
      .map((c) => ({
        ...c,
        rows: c.rows.filter((r) => {
          if (q && !r.feature.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) {
            return false;
          }
          if (diffOnly) {
            const s = new Set([r.flexmonster.s, r.reactPivottable.s, r.orb.s]);
            if (s.size === 1) return false;
          }
          return true;
        }),
      }))
      .filter((c) => c.rows.length > 0);
  }, [query, activeCategory, diffOnly]);

  const visibleCount = filtered.reduce((a, c) => a + c.rows.length, 0);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-10">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Pivot table libraries · feature matrix
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Flexmonster vs react-pivottable vs Orb.js
          </h1>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
            Every capability listed in Flexmonster&rsquo;s commercial technical specification, checked
            row by row against the two most common open-source JavaScript pivot grids.
          </p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {totalFeatures} features compared · compiled 16 Aug 2026
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {products.map((p) => (
              <a
                key={p.key}
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full border border-border bg-surface px-4 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {p.name} ↗
              </a>
            ))}
          </div>
        </header>

        <section aria-labelledby="summary" className="py-10">
          <h2 id="summary" className="sr-only">
            Summary
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {products.map((p) => {
              const score = scoreFor(p.key);
              const pct = Math.round(((score.full + score.partial * 0.5) / totalFeatures) * 100);
              return (
                <article
                  key={p.key}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                    <span className="font-mono text-2xl font-bold text-primary">{pct}%</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {p.subtitle}
                  </p>
                  <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="bg-support-yes"
                      style={{ width: `${(score.full / totalFeatures) * 100}%` }}
                    />
                    <span
                      className="bg-support-partial"
                      style={{ width: `${(score.partial / totalFeatures) * 100}%` }}
                    />
                  </div>
                  <dl className="mt-3 flex gap-4 font-mono text-xs">
                    <div className="text-support-yes">
                      <dt className="inline">Full </dt>
                      <dd className="inline font-bold">{score.full}</dd>
                    </div>
                    <div className="text-support-partial">
                      <dt className="inline">Partial </dt>
                      <dd className="inline font-bold">{score.partial}</dd>
                    </div>
                    <div className="text-support-no">
                      <dt className="inline">None </dt>
                      <dd className="inline font-bold">{score.none}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {verdicts[p.key]}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="matrix">
          <h2 id="matrix" className="text-xl font-semibold text-foreground">
            Feature matrix
          </h2>

          <div className="sticky top-0 z-30 -mx-4 mt-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search features…"
                  aria-label="Search features"
                  className="w-full rounded-md border border-input bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={diffOnly}
                  onChange={(e) => setDiffOnly(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Differences only
              </label>
              <span className="font-mono text-xs text-muted-foreground">
                {visibleCount}/{totalFeatures} rows
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {[{ id: "all", name: "All" }, ...categories].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  aria-pressed={activeCategory === c.id}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                    activeCategory === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop matrix */}
          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Feature support comparison between Flexmonster, react-pivottable and Orb.js
              </caption>
              <thead>
                <tr className="bg-surface-2">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 w-[40%] bg-surface-2 px-4 py-3 text-left font-semibold text-foreground"
                  >
                    Feature
                  </th>
                  {products.map((p) => (
                    <th
                      key={p.key}
                      scope="col"
                      className="px-3 py-3 text-center font-semibold text-foreground"
                    >
                      {p.name}
                      <span className="block font-mono text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                        {p.subtitle}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              {filtered.map((cat) => (
                <tbody key={cat.id}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={4}
                      className="border-y border-border bg-surface px-4 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-primary"
                    >
                      {cat.name}
                    </th>
                  </tr>
                  {cat.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-border/60 hover:bg-surface/60">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-background px-4 py-2.5 text-left font-normal text-foreground"
                      >
                        {row.feature}
                      </th>
                      {products.map((p) => (
                        <td key={p.key} className="px-3 py-2.5 align-top">
                          <SupportCell cell={row[p.key as ProductKey]} product={p.name} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-6 md:hidden">
            {filtered.map((cat) => (
              <div key={cat.id}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  {cat.name}
                </h3>
                <ul className="mt-2 space-y-2">
                  {cat.rows.map((row) => (
                    <li
                      key={row.feature}
                      className="rounded-lg border border-border bg-surface p-3"
                    >
                      <p className="text-sm font-medium text-foreground">{row.feature}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {products.map((p) => (
                          <div key={p.key} className="text-center">
                            <p className="font-mono text-[10px] text-muted-foreground">{p.name}</p>
                            <div className="mt-1 flex justify-center">
                              <SupportCell cell={row[p.key as ProductKey]} product={p.name} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {visibleCount === 0 && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              No features match your filters.
            </p>
          )}
        </section>

        <section className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
          {(["yes", "partial", "no"] as const).map((s) => {
            const meta = statusMeta[s];
            const { Icon } = meta;
            return (
              <span key={s} className="flex items-center gap-2">
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", meta.chip)}>
                  <Icon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {meta.label}
              </span>
            );
          })}
        </section>

        <footer className="mt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            Sources: Flexmonster technical specifications and pricing pages, the react-pivottable
            documentation site, and the Orb.js demo and repository. Open-source entries reflect the
            latest published releases; &ldquo;partial&rdquo; means the capability exists only through
            custom code, a plugin, or a reduced form. Compiled 16 August 2026 — verify against vendor
            docs before making a purchasing decision.
          </p>
        </footer>
      </div>
    </main>
  );
}
