import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PivotStudio, sampleData, sampleFields, createDefaultConfig } from "@/components/pivot";

const TITLE = "Free Pivot Table Demo: A Flexmonster-Style Grid on react-pivottable";
const DESCRIPTION =
  "Try a free pivot table with drag-and-drop fields, filters, calculated values, subtotals, charts, drill-through, export and your own uploaded CSV or JSON file.";

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

const startConfig = createDefaultConfig({
  rows: ["region", "country", "state", "city"],
  cols: ["year", "half", "quarter"],
  collapsed: [],
  collapsedCols: [],
  values: [
    { field: "revenue", aggregator: "sum", caption: "Revenue", format: { decimals: 0, currency: "USD" } },
  ],
  chart: { visible: false, type: "stackedBar", position: "bottom", drillRows: [], drillCols: [], hiddenSeries: [] },
});

function DemosPage() {
  const [mounted, setMounted] = useState(false);
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
        <Link
          to="/docs"
          className="ml-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Install it in your app
        </Link>


        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Try the free pivot table yourself
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          This is the open-source engine dressed up to feel like the paid tool your team already
          knows: drag fields around, expand rows, filter members, chart it side by side with the grid and export it. Load your
          own CSV or JSON file too — it stays in your browser.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-sm text-muted-foreground">
            Aggregation runs in the browser here. The same screen can hand the maths to a backend
            service without any UI changes.
          </p>
          <a
            href="https://react-pivottable.js.org/"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Original react-pivottable demo
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-4">
          {mounted ? (
            <PivotStudio
              data={sampleData}
              fields={sampleFields}
              initialConfig={startConfig}
              title="Sales analysis"
              allowFileUpload
              permissions={{ maskedFields: [], allowExport: true, allowDrillThrough: true }}
            />
          ) : (
            <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
          )}
        </div>
      </div>
    </main>
  );
}
