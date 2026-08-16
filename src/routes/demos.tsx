import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PivotStudio, sampleData, sampleFields, createDefaultConfig } from "@/components/pivot";
import type { PivotEngine } from "@/components/pivot";

const TITLE = "Free Pivot Table Demos: react-pivottable and Orb.js in Action";
const DESCRIPTION =
  "Interactive demos of the two free pivot tables, react-pivottable and Orb.js, with filters, calculated values, charts, drill-through, export and languages.";

export const Route = createFileRoute("/demos")({
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
  component: DemosPage,
});

const tabs: {
  id: PivotEngine;
  name: string;
  blurb: string;
  officialUrl: string;
}[] = [
  {
    id: "react-pivottable",
    name: "react-pivottable",
    blurb:
      "The react-pivottable grid, wrapped with a field list, filters, calculated values, charts, drill-through and export.",
    officialUrl: "https://react-pivottable.js.org/",
  },
  {
    id: "orb",
    name: "Orb.js",
    blurb:
      "The Orb.js engine doing the grouping, rendered with a modern React table that adds the same feature set.",
    officialUrl: "https://nnajm.github.io/orb/index.html",
  },
];

const startConfig = createDefaultConfig({
  rows: ["region"],
  cols: ["category"],
  values: [{ field: "revenue", aggregator: "sum", caption: "Revenue", format: { decimals: 0, currency: "USD" } }],
  chart: { visible: true, type: "bar" },
});

function DemosPage() {
  const [active, setActive] = useState<PivotEngine>("react-pivottable");
  const [mounted, setMounted] = useState(false);
  const current = tabs.find((t) => t.id === active) ?? tabs[0]!;

  useEffect(() => setMounted(true), []);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the comparison
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Try the free tools yourself
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Both tabs run on the same sample sales data and the same controls, so you can feel the
          difference between the two engines. Nothing you do here is saved.
        </p>

        <div
          role="tablist"
          aria-label="Choose a demo"
          className="mt-8 inline-flex gap-1 rounded-xl border border-border bg-surface p-1"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        <section
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          className="mt-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-sm text-muted-foreground">{current.blurb}</p>
            <a
              href={current.officialUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Official demo
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-3">
            {mounted ? (
              <PivotStudio
                key={current.id}
                engine={current.id}
                data={sampleData}
                fields={sampleFields}
                initialConfig={startConfig}
                title={`${current.name} demo`}
                permissions={{ maskedFields: [], allowExport: true, allowDrillThrough: true }}
              />
            ) : (
              <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
