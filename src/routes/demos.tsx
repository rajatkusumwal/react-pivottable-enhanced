import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const TITLE = "Try the Free Pivot Tables: react-pivottable and Orb.js Demos";
const DESCRIPTION =
  "Play with the live demos of the two free pivot table tools, react-pivottable and Orb.js, side by side in one place.";

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

const tabs = [
  {
    id: "react-pivottable",
    name: "react-pivottable",
    url: "https://react-pivottable.js.org/",
    blurb:
      "Drag the grey field names into the row and column areas to build a summary. Change the dropdown on the left to switch between table and chart.",
  },
  {
    id: "orb",
    name: "Orb.js",
    url: "https://nnajm.github.io/orb/index.html",
    blurb:
      "Drag field names between the row, column and data areas. Click the small arrows to expand or collapse groups and see subtotals.",
  },
] as const;

function DemosPage() {
  const [active, setActive] = useState<string>(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          These are the official live demos of the two free pivot tables. Pick a tab and click
          around — nothing you do here is saved.
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
            <p className="max-w-2xl text-sm text-muted-foreground">{current.blurb}</p>
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open in a new tab
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
            <iframe
              key={current.id}
              src={current.url}
              title={`${current.name} live demo`}
              className="h-[75vh] min-h-[560px] w-full border-0 bg-white"
              loading="lazy"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The demo is loaded from the project&rsquo;s own website. If it does not appear, use
            &ldquo;Open in a new tab&rdquo;.
          </p>
        </section>
      </div>
    </main>
  );
}
