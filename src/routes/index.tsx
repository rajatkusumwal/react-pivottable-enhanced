import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
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

const TITLE = "Pivot Table Tools Compared: Flexmonster vs Free Options";
const DESCRIPTION =
  "A plain-English comparison of the paid Flexmonster pivot table against two free options, react-pivottable and Orb.js — what each one can and cannot do.";

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

const plainNames: Record<ProductKey, { name: string; price: string }> = {
  flexmonster: { name: "Flexmonster", price: "Paid" },
  reactPivottable: { name: "react-pivottable", price: "Free" },
  orb: { name: "Orb.js", price: "Free" },
  studioRpt: { name: "Demo — react-pivottable tab", price: "Free" },
  studioOrb: { name: "Demo — Orb.js tab", price: "Free" },
};

const statusMeta = {
  yes: {
    label: "Yes",
    Icon: Check,
    chip: "bg-support-yes-soft text-support-yes",
  },
  partial: {
    label: "Partly",
    Icon: Minus,
    chip: "bg-support-partial-soft text-support-partial",
  },
  no: {
    label: "No",
    Icon: X,
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
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          meta.chip,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        {meta.label}
        <span className="sr-only">{` — ${product}`}</span>
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
            const s = new Set([r.flexmonster.s, r.reactPivottable.s, r.orb.s, r.studioRpt.s, r.studioOrb.s]);
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
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Which pivot table tool should you use?
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A pivot table lets people slice and summarise data on a screen, like in Excel.
            Below we take everything the paid tool <strong className="font-medium text-foreground">Flexmonster</strong>{" "}
            can do — {totalFeatures} things in total — and check whether the two most popular
            free tools can do the same — plus the ready-made{" "}
            <strong className="font-medium text-foreground">Pivot Studio</strong> setup you can
            try on the demos page, which wraps those free tools with extra features.
          </p>
          <Link
            to="/demos"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try the free tools yourself
          </Link>
        </header>


        {/* At a glance */}
        <section aria-labelledby="glance" className="mt-10">
          <h2 id="glance" className="text-xl font-semibold text-foreground">
            The short answer
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {products.map((p) => {
              const key = p.key as ProductKey;
              const score = scoreFor(key);
              const pct = Math.round(((score.full + score.partial * 0.5) / totalFeatures) * 100);
              return (
                <article key={p.key} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {plainNames[key].name}
                    </h3>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {plainNames[key].price}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-primary">{pct}%</p>
                  <p className="text-sm text-muted-foreground">of the {totalFeatures} features</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {verdicts[key]}
                  </p>
                  {key === "studioRpt" || key === "studioOrb" ? (
                    <Link
                      to="/demos"
                      className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
                    >
                      Open the demo
                    </Link>
                  ) : (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
                    >
                      Visit website
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* How to read */}
        <section
          aria-label="How to read this page"
          className="mt-10 rounded-xl border border-border bg-surface p-5"
        >
          <h2 className="text-sm font-semibold text-foreground">How to read the table</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusMeta.yes.chip)}>
                Yes
              </span>
              Works out of the box.
            </li>
            <li className="flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusMeta.partial.chip)}>
                Partly
              </span>
              Possible, but needs extra work, a plugin, or is limited.
            </li>
            <li className="flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusMeta.no.chip)}>
                No
              </span>
              Not available at all.
            </li>
          </ul>
        </section>

        {/* Table */}
        <section aria-labelledby="matrix" className="mt-10">
          <h2 id="matrix" className="text-xl font-semibold text-foreground">
            Feature by feature
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
                  placeholder="Search a feature, e.g. “export to Excel”"
                  aria-label="Search features"
                  className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <label htmlFor="cat" className="sr-only">
                Filter by topic
              </label>
              <select
                id="cat"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="all">All topics</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={diffOnly}
                  onChange={(e) => setDiffOnly(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Only show where they differ
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {visibleCount} of {totalFeatures} features
            </p>
          </div>

          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-border md:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Feature support comparison between Flexmonster, react-pivottable, Orb.js and the two Pivot Studio demo tabs
              </caption>
              <thead>
                <tr className="bg-surface-2">
                  <th
                    scope="col"
                    className="w-[26%] px-4 py-3 text-left font-semibold text-foreground"
                  >
                    Feature
                  </th>
                  {products.map((p) => (
                    <th
                      key={p.key}
                      scope="col"
                      className="px-3 py-3 text-center font-semibold text-foreground"
                    >
                      {plainNames[p.key as ProductKey].name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {plainNames[p.key as ProductKey].price}
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
                      colSpan={products.length + 1}
                      className="border-y border-border bg-surface px-4 py-2.5 text-left text-sm font-semibold text-foreground"
                    >
                      {cat.name}
                    </th>
                  </tr>
                  {cat.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-border/60 hover:bg-surface/70">
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-normal text-foreground"
                      >
                        {row.feature}
                      </th>
                      {products.map((p) => (
                        <td key={p.key} className="px-3 py-3 align-top">
                          <SupportCell
                            cell={row[p.key as ProductKey]}
                            product={plainNames[p.key as ProductKey].name}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-8 md:hidden">
            {filtered.map((cat) => (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                <ul className="mt-2 space-y-2">
                  {cat.rows.map((row) => (
                    <li key={row.feature} className="rounded-xl border border-border bg-card p-4">
                      <p className="text-sm font-medium text-foreground">{row.feature}</p>
                      <div className="mt-3 space-y-2">
                        {products.map((p) => (
                          <div
                            key={p.key}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-muted-foreground">
                              {plainNames[p.key as ProductKey].name}
                            </span>
                            <SupportCell
                              cell={row[p.key as ProductKey]}
                              product={plainNames[p.key as ProductKey].name}
                            />
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
              Nothing matches your search. Try a different word.
            </p>
          )}
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Based on the official Flexmonster documentation and pricing pages, the react-pivottable
            docs, and the Orb.js demo and code repository. Last checked 16 August 2026 — always
            double-check with the vendor before buying.
          </p>
        </footer>
      </div>
    </main>
  );
}
