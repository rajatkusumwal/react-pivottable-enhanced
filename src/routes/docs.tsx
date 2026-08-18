import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PivotStudio, createDefaultConfig, sampleData, sampleFields } from "inhouse-grid-monster";

const TITLE = "inhouse-grid-monster Docs: Install the React Pivot Table in Minutes";
const DESCRIPTION =
  "Install inhouse-grid-monster from npm, add one Tailwind import and render a commercial-style pivot table in your React app. Props, theming and backend engine reference.";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

interface PropRow {
  name: string;
  type: string;
  fallback: string;
  what: string;
}

const props: PropRow[] = [
  { name: "data", type: "PivotRow[]", fallback: "required", what: "The records to summarise." },
  {
    name: "fields",
    type: "FieldDef[]",
    fallback: "required",
    what: "Field names and types. inferFields(rows) can build this for you.",
  },
  {
    name: "initialConfig",
    type: "Partial<PivotConfig>",
    fallback: "—",
    what: "The report to start from: rows, columns, values, filters, chart.",
  },
  {
    name: "config / onConfigChange",
    type: "PivotConfig / callback",
    fallback: "—",
    what: "Drive the report from your own state instead.",
  },
  {
    name: "engine",
    type: "PivotEngineAdapter",
    fallback: "in-browser",
    what: "Move aggregation to your backend service.",
  },
  {
    name: "fieldsUi",
    type: '"dialog" | "sidebar"',
    fallback: '"dialog"',
    what: "Popup field list (commercial-style) or a docked panel.",
  },
  {
    name: "showToolbar / showSidebar",
    type: "boolean",
    fallback: "true",
    what: "Hide the built-in chrome when your app has its own.",
  },
  {
    name: "allowFileUpload",
    type: "boolean",
    fallback: "true",
    what: "Let users drop in their own CSV or JSON file.",
  },
  {
    name: "permissions",
    type: "Permissions",
    fallback: "everything on",
    what: "Turn off export, drill-through or inline editing.",
  },
  {
    name: "onDataChange",
    type: "(rows) => void",
    fallback: "—",
    what: "Called when an inline edit writes values back.",
  },
];

const deps = [
  ["@dnd-kit/core, /sortable, /utilities", "dragging fields between areas"],
  ["lucide-react", "toolbar and grid icons"],
  ["recharts", "the chart tab"],
  ["react, react-dom (18.2+ or 19)", "peer dependencies — your copy is used"],
];

function Code({ children, label }: { children: string; label?: string }) {
  return (
    <figure className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
      {label ? (
        <figcaption className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
          {label}
        </figcaption>
      ) : null}
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

const toc = [
  ["install", "Install"],
  ["quick-start", "Quick start"],
  ["examples", "Live examples"],
  ["tailwind", "Tailwind setup"],
  ["theming", "Theming"],
  ["props", "Props"],
  ["backend", "Backend aggregation"],
  ["ssr", "Next.js / SSR"],
  ["publish", "Publish your own copy"],
];

/** Report configs used by the live examples below; each one matches its code sample. */
const exampleConfigs = {
  basic: createDefaultConfig({
    rows: ["region", "country"],
    cols: ["year"],
    values: [
      {
        field: "revenue",
        aggregator: "sum",
        caption: "Revenue",
        format: { currency: "USD", decimals: 0 },
      },
    ],
  }),
  measures: createDefaultConfig({
    rows: ["category", "subcategory"],
    cols: ["quarter"],
    values: [
      {
        field: "revenue",
        aggregator: "sum",
        caption: "Revenue",
        format: { currency: "USD", decimals: 0 },
      },
      { field: "orderId", aggregator: "distinctCount", caption: "Orders" },
      {
        field: "margin",
        aggregator: "sum",
        caption: "Margin",
        format: { currency: "USD", decimals: 0 },
      },
    ],
    calculated: [{ name: "margin", caption: "Margin", formula: "[revenue] - [cost]" }],
    conditionalFormats: [
      { field: "margin", operator: "lt", value: 0, color: "#7f1d1d", background: "#fee2e2" },
    ],
  }),
  chart: createDefaultConfig({
    rows: ["region"],
    cols: ["year"],
    values: [
      {
        field: "revenue",
        aggregator: "sum",
        caption: "Revenue",
        format: { currency: "USD", decimals: 0 },
      },
    ],
    chart: {
      visible: true,
      type: "stackedBar",
      position: "right",
      drillRows: [],
      drillCols: [],
      hiddenSeries: [],
    },
  }),
  locked: createDefaultConfig({
    rows: ["channel"],
    values: [
      {
        field: "revenue",
        aggregator: "sum",
        caption: "Revenue",
        format: { currency: "USD", decimals: 0 },
      },
      {
        field: "revenue",
        aggregator: "sum",
        caption: "Share",
        displayMode: "percentOfGrandTotal",
        format: { decimals: 1, suffix: "%" },
      },
    ],
    dragAndDrop: false,
  }),
};

function LiveExample({
  id,
  title,
  blurb,
  code,
  children,
}: {
  id: string;
  title: string;
  blurb: string;
  code: string;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <article
      id={id}
      className="min-w-0 scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card p-4"
    >
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{blurb}</p>

      <div
        role="tablist"
        aria-label={`${title} preview and code`}
        className="mt-3 inline-flex rounded-lg border border-border p-0.5"
      >
        {(["preview", "code"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t === "preview" ? "Live preview" : "Code"}
          </button>
        ))}
      </div>

      {tab === "preview" ? (
        <div className="mt-3 min-w-0 max-w-full overflow-x-auto">
          {mounted ? (
            children
          ) : (
            <div className="h-80 animate-pulse rounded-lg border border-border bg-surface" />
          )}
        </div>
      ) : (
        <Code>{code}</Code>
      )}
    </article>
  );
}

function DocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the comparison
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Add the pivot table to your app
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            <code className="rounded bg-surface px-1.5 py-0.5 text-base">inhouse-grid-monster</code>{" "}
            is one npm package and one CSS import. It ships five small runtime dependencies, uses
            Tailwind classes for layout, and needs no router, component library or backend.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/demos"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              See it running
            </Link>
          </div>
        </header>

        <nav aria-label="On this page" className="mt-8 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            On this page
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-primary underline-offset-4 hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 space-y-10">
          <Section id="install" title="1. Install">
            <p>One command. Everything the grid needs comes with it.</p>
            <Code>npm i inhouse-grid-monster</Code>
            <table className="mt-4 w-full border-collapse text-sm">
              <caption className="sr-only">Runtime dependencies and what they are used for</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-4 font-medium text-foreground">
                    Package
                  </th>
                  <th scope="col" className="py-2 font-medium text-foreground">
                    Used for
                  </th>
                </tr>
              </thead>
              <tbody>
                {deps.map(([pkg, use]) => (
                  <tr key={pkg} className="border-b border-border/60 align-top">
                    <th scope="row" className="py-2 pr-4 text-left font-normal text-foreground">
                      <code>{pkg}</code>
                    </th>
                    <td className="py-2 text-muted-foreground">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="quick-start" title="2. Quick start">
            <p>Render the component with your rows. That is the whole integration.</p>
            <Code label="Reports.tsx">{`import { PivotStudio, sampleData, sampleFields } from "inhouse-grid-monster";
import "inhouse-grid-monster/styles.css";

export function Reports() {
  return <PivotStudio data={sampleData} fields={sampleFields} />;
}`}</Code>
            <p>With your own data, let the field types be inferred and pick a starting report:</p>
            <Code>{`import { PivotStudio, inferFields, createDefaultConfig } from "inhouse-grid-monster";

const fields = inferFields(rows);
const config = createDefaultConfig({
  rows: ["region", "country"],
  cols: ["year"],
  values: [{ field: "revenue", aggregator: "sum", caption: "Revenue" }],
});

<PivotStudio data={rows} fields={fields} initialConfig={config} />;`}</Code>
          </Section>

          <Section id="examples" title="Live examples">
            <p>
              Each example below is the real component running on this page, next to the exact code
              that produced it. Drag fields, expand rows, sort and export — then copy the snippet
              into your app.
            </p>

            <div className="mt-4 space-y-6">
              <LiveExample
                id="example-basic"
                title="A. Revenue by region and year"
                blurb="The smallest useful report: two row levels, one column level, one currency measure. Click a row to expand it."
                code={`import { PivotStudio, createDefaultConfig, sampleData, sampleFields } from "inhouse-grid-monster";
import "inhouse-grid-monster/styles.css";

const config = createDefaultConfig({
  rows: ["region", "country"],
  cols: ["year"],
  values: [
    { field: "revenue", aggregator: "sum", caption: "Revenue",
      format: { currency: "USD", decimals: 0 } },
  ],
});

<PivotStudio data={sampleData} fields={sampleFields}
  initialConfig={config} title="Revenue by region" />;`}
              >
                <PivotStudio
                  data={sampleData}
                  fields={sampleFields}
                  initialConfig={exampleConfigs.basic}
                  title="Revenue by region"
                  showSidebar={false}
                />
              </LiveExample>

              <LiveExample
                id="example-measures"
                title="B. Several measures, a formula and colour rules"
                blurb="Revenue, a distinct count of orders, and a calculated Margin field that turns red when it goes negative."
                code={`const config = createDefaultConfig({
  rows: ["category", "subcategory"],
  cols: ["quarter"],
  values: [
    { field: "revenue", aggregator: "sum", caption: "Revenue",
      format: { currency: "USD", decimals: 0 } },
    { field: "orderId", aggregator: "distinctCount", caption: "Orders" },
    { field: "margin", aggregator: "sum", caption: "Margin",
      format: { currency: "USD", decimals: 0 } },
  ],
  calculated: [
    { name: "margin", caption: "Margin", formula: "[revenue] - [cost]" },
  ],
  conditionalFormats: [
    { field: "margin", operator: "lt", value: 0,
      color: "#7f1d1d", background: "#fee2e2" },
  ],
});

<PivotStudio data={rows} fields={fields} initialConfig={config} />;`}
              >
                <PivotStudio
                  data={sampleData}
                  fields={sampleFields}
                  initialConfig={exampleConfigs.measures}
                  title="Margin by category"
                  showSidebar={false}
                />
              </LiveExample>

              <LiveExample
                id="example-chart"
                title="C. Grid and chart side by side"
                blurb="Turn the chart on and put it to the right for a split view. Click a legend entry to hide a series, or a column to drill in."
                code={`const config = createDefaultConfig({
  rows: ["region"],
  cols: ["year"],
  values: [{ field: "revenue", aggregator: "sum", caption: "Revenue" }],
  chart: { visible: true, type: "stackedBar", position: "right" },
});

<PivotStudio data={rows} fields={fields} initialConfig={config} />;`}
              >
                <PivotStudio
                  data={sampleData}
                  fields={sampleFields}
                  initialConfig={exampleConfigs.chart}
                  title="Revenue trend"
                  showSidebar={false}
                />
              </LiveExample>

              <LiveExample
                id="example-locked"
                title="D. A locked-down dashboard tile"
                blurb="No toolbar, no field list, no drag & drop, customer names masked and export switched off — a fixed report for viewers."
                code={`<PivotStudio
  data={rows}
  fields={fields}
  initialConfig={createDefaultConfig({
    rows: ["channel"],
    values: [
      { field: "revenue", aggregator: "sum", caption: "Revenue" },
      { field: "revenue", aggregator: "sum", caption: "Share",
        displayMode: "percentOfGrandTotal", format: { decimals: 1, suffix: "%" } },
    ],
    dragAndDrop: false,
  })}
  showToolbar={false}
  showSidebar={false}
  permissions={{
    readOnly: true,
    allowExport: false,
    allowDrillThrough: false,
    maskedFields: ["customerName"],
  }}
/>;`}
              >
                <PivotStudio
                  data={sampleData}
                  fields={sampleFields}
                  initialConfig={exampleConfigs.locked}
                  title="Revenue by channel"
                  showToolbar={false}
                  showSidebar={false}
                  permissions={{
                    readOnly: true,
                    allowExport: false,
                    allowDrillThrough: false,
                    maskedFields: ["customerName"],
                  }}
                />
              </LiveExample>
            </div>

            <p className="mt-4">
              Want the full screen with uploads, drill-through and every toolbar button?{" "}
              <Link to="/demos" className="text-primary underline-offset-4 hover:underline">
                Open the full demo
              </Link>
              .
            </p>
          </Section>

          <Section id="tailwind" title="3. Tailwind setup">
            <p>
              The layout is plain Tailwind utility classes, so your app must scan the package and
              load the colour tokens. Tailwind v4:
            </p>
            <Code label="app.css">{`@import "tailwindcss";
@source "../node_modules/inhouse-grid-monster/dist";
@import "inhouse-grid-monster/styles.css";`}</Code>
            <p>
              On Tailwind v3, add <code>./node_modules/inhouse-grid-monster/dist/**/*.js</code> to{" "}
              <code>content</code> and map the same token names in <code>theme.extend.colors</code>{" "}
              — the package README has the exact block to paste.
            </p>
          </Section>

          <Section id="theming" title="4. Theming">
            <p>
              Colours are semantic CSS variables (<code>--background</code>, <code>--card</code>,{" "}
              <code>--primary</code>, <code>--border</code>, <code>--surface</code>, …) with a{" "}
              <code>.dark</code> block. Override any of them after the import and the grid follows
              your brand — no component changes.
            </p>
            <Code label="app.css">{`:root {
  --primary: oklch(0.55 0.17 255);
  --radius: 0.5rem;
}`}</Code>
          </Section>

          <Section id="props" title="5. Props">
            <table className="mt-2 w-full border-collapse text-sm">
              <caption className="sr-only">PivotStudio props</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-4 font-medium text-foreground">
                    Prop
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium text-foreground">
                    Type
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium text-foreground">
                    Default
                  </th>
                  <th scope="col" className="py-2 font-medium text-foreground">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody>
                {props.map((p) => (
                  <tr key={p.name} className="border-b border-border/60 align-top">
                    <th scope="row" className="py-2 pr-4 text-left font-normal text-foreground">
                      <code>{p.name}</code>
                    </th>
                    <td className="py-2 pr-4 text-muted-foreground">
                      <code>{p.type}</code>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{p.fallback}</td>
                    <td className="py-2 text-muted-foreground">{p.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="backend" title="6. Backend aggregation">
            <p>
              By default everything is calculated in the browser. When the data grows, pass an
              engine and the same UI queries your service instead — every engine returns the same{" "}
              <code>PivotResult</code>, so they stay swappable.
            </p>
            <Code>{`import { PivotStudio, createBackendEngine } from "inhouse-grid-monster";

const engine = createBackendEngine({ baseUrl: "https://api.example.com/pivot" });

<PivotStudio data={[]} fields={fields} engine={engine} datasetId="sales" />;`}</Code>
            <p>
              <code>createMockPivotApi()</code> implements the same REST contract in memory, so you
              can write integration tests before the service exists.
            </p>
          </Section>

          <Section id="ssr" title="7. Next.js and SSR">
            <p>
              The component is client-side: it reads <code>window</code> and uses drag & drop. In
              the Next.js App Router add <code>&quot;use client&quot;</code> to the file that
              renders it, or import it with <code>next/dynamic</code> and{" "}
              <code>{"{ ssr: false }"}</code>.
            </p>
          </Section>

          <Section id="publish" title="8. Publish your own copy">
            <p>
              To ship a private build, the <code>standalone/</code> folder in this repo is the
              package: it syncs the component source, emits types and bundles ESM with React kept
              external.
            </p>
            <Code>{`cd standalone
npm install
npm run build   # sync + types + bundle + theme css -> dist/
npm publish     # or: npm publish --registry <your registry>`}</Code>
          </Section>
        </div>
      </div>
    </main>
  );
}
