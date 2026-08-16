export type Support = "yes" | "partial" | "no";

export type Cell = {
  s: Support;
  note?: string;
};

export type FeatureRow = {
  feature: string;
  flexmonster: Cell;
  reactPivottable: Cell;
  orb: Cell;
};

export type FeatureCategory = {
  id: string;
  name: string;
  rows: FeatureRow[];
};

const y = (note?: string): Cell => ({ s: "yes", ...(note ? { note } : {}) });
const p = (note?: string): Cell => ({ s: "partial", ...(note ? { note } : {}) });
const n = (note?: string): Cell => ({ s: "no", ...(note ? { note } : {}) });

export const products = [
  {
    key: "flexmonster" as const,
    name: "Flexmonster",
    subtitle: "Commercial • from $799/yr",
    url: "https://www.flexmonster.com/technical-specifications/",
  },
  {
    key: "reactPivottable" as const,
    name: "react-pivottable",
    subtitle: "Open source • MIT",
    url: "https://react-pivottable.js.org/",
  },
  {
    key: "orb" as const,
    name: "Orb.js",
    subtitle: "Open source • MIT, unmaintained",
    url: "https://nnajm.github.io/orb/index.html",
  },
];

export type ProductKey = (typeof products)[number]["key"];

export const verdicts: Record<ProductKey, string> = {
  flexmonster:
    "Enterprise-grade component with the widest surface area: server-side data sources, OLAP, exports, drill-through, accessibility and a ~100-method API, backed by paid support and regular releases.",
  reactPivottable:
    "Lightweight React drag-and-drop pivot UI with solid aggregators and Plotly chart renderers. No exports, toolbar, server-side sources or enterprise features — ideal for internal dashboards and prototypes.",
  orb: "Standalone JS pivot grid with drag-and-drop, subtotals, expand/collapse and a themeable grid. No charts and no calculated-field UI; the repository has seen no meaningful activity in years.",
};

export const categories: FeatureCategory[] = [
  {
    id: "grid",
    name: "Grid",
    rows: [
      {
        feature: "Virtual grid rendering thousands of rows",
        flexmonster: y("1M+ grouped rows"),
        reactPivottable: n("Renders full DOM table"),
        orb: y("React grid with virtual scroll"),
      },
      {
        feature: "Compact pivot table form",
        flexmonster: y(),
        reactPivottable: n(),
        orb: y(),
      },
      {
        feature: "Classic (tabular) pivot form",
        flexmonster: y(),
        reactPivottable: y("Default renderer"),
        orb: y(),
      },
      {
        feature: "Flat table form",
        flexmonster: y(),
        reactPivottable: p("Table renderer only"),
        orb: n(),
      },
      { feature: "Grand totals and subtotals", flexmonster: y(), reactPivottable: y(), orb: y() },
      {
        feature: "Show/hide subtotals",
        flexmonster: y(),
        reactPivottable: n(),
        orb: y(),
      },
      {
        feature: "Show/hide grand totals per rows/columns",
        flexmonster: y(),
        reactPivottable: n(),
        orb: y(),
      },
      {
        feature: "Grand totals top or bottom (flat table)",
        flexmonster: y(),
        reactPivottable: n(),
        orb: n(),
      },
      { feature: "Sort field members", flexmonster: y(), reactPivottable: y(), orb: y() },
      {
        feature: "Sort values on the pivot table",
        flexmonster: y(),
        reactPivottable: p("Row/col order only"),
        orb: y(),
      },
      {
        feature: "Sort multiple columns in flat table",
        flexmonster: y(),
        reactPivottable: n(),
        orb: n(),
      },
      { feature: "Show/hide sorting controls", flexmonster: y(), reactPivottable: n(), orb: n() },
      {
        feature: "Repeat member labels in classic form",
        flexmonster: y(),
        reactPivottable: n(),
        orb: n(),
      },
      { feature: "Expand and collapse values", flexmonster: y(), reactPivottable: n(), orb: y() },
      {
        feature: "Drill up/down multilevel hierarchies",
        flexmonster: y(),
        reactPivottable: n(),
        orb: p("Nested fields expand only"),
      },
      {
        feature: "Drag fields between rows, columns and filters",
        flexmonster: y(),
        reactPivottable: y(),
        orb: y(),
      },
      {
        feature: "Enable/disable drag and drop",
        flexmonster: y(),
        reactPivottable: p("Use non-interactive renderer"),
        orb: n(),
      },
      { feature: "Resize columns and rows", flexmonster: y(), reactPivottable: n(), orb: y("Columns") },
      { feature: "Select cells", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Copy selected cells", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Keyboard navigation shortcuts", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Highlight rows and columns", flexmonster: y(), reactPivottable: n(), orb: y("Hover highlight") },
      { feature: "Auto-calculation bar for selection", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Editing cells inline", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Grid title", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Show/hide spreadsheet headers", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Show/hide field captions", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "filters",
    name: "Filters",
    rows: [
      { feature: "Value filters (top/bottom N)", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Conditional filter for number fields", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Conditional filter for string fields", flexmonster: y(), reactPivottable: n(), orb: p("Contains match in filter box") },
      { feature: "Conditional filter for date fields", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Conditional filter for time fields", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Selection (member checkbox) filter", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Search box inside the filter", flexmonster: y(), reactPivottable: n(), orb: y() },
      { feature: "Report filter (page) area", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Show/hide report filter area", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Show/hide filter controls on the grid", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Filter controls on charts", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Server-side filtering (subqueries)", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "fieldlist",
    name: "Field List",
    rows: [
      { feature: "Dedicated Field List panel", flexmonster: y(), reactPivottable: p("Inline field pills, no panel"), orb: y("Configuration dialog") },
      { feature: "Multiple fields in columns", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Multiple fields in rows", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Multiple measures", flexmonster: y(), reactPivottable: n("One aggregator at a time"), orb: y() },
      { feature: "Same field with different aggregations", flexmonster: y(), reactPivottable: n(), orb: y() },
      { feature: "String field as a value", flexmonster: y(), reactPivottable: p("Via count aggregators"), orb: n() },
      { feature: "Date field as a value", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Time field as a value", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Drag fields inside the list", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Field folders / grouping", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Hierarchy levels shown in the list", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Selecting sublevels of a hierarchy", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Search in the Field List", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Expand All button", flexmonster: y(), reactPivottable: n(), orb: y() },
      { feature: "UI for adding calculated values", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Open/close the Field List from the API", flexmonster: y(), reactPivottable: n(), orb: p("Toggle config dialog") },
      { feature: "Custom sorting of Field List items", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "aggregations",
    name: "Aggregation functions",
    rows: [
      { feature: "Sum", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Count", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Distinct count", flexmonster: y(), reactPivottable: y(), orb: n() },
      { feature: "Average", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Median", flexmonster: y(), reactPivottable: y(), orb: n() },
      { feature: "Product", flexmonster: y(), reactPivottable: n(), orb: y() },
      { feature: "Min", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Max", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Population standard deviation", flexmonster: y(), reactPivottable: p("Var/stdev variants"), orb: n() },
      { feature: "Sample standard deviation", flexmonster: y(), reactPivottable: y(), orb: n() },
      { feature: "Percent of total", flexmonster: y(), reactPivottable: y(), orb: n() },
      { feature: "Percent of column", flexmonster: y(), reactPivottable: y(), orb: n() },
      { feature: "Percent of row", flexmonster: y(), reactPivottable: y(), orb: n() },
      { feature: "Percent of parent column total", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Percent of parent row total", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Index", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Difference of column / row", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "% difference of column / row", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Running totals of column / row", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Custom aggregation functions", flexmonster: y(), reactPivottable: y("Custom aggregators"), orb: y("Custom aggregate func") },
      { feature: "Restrict available aggregations per field", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Show/hide the aggregation (sigma) icon", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "calculated",
    name: "Calculated values",
    rows: [
      { feature: "Calculated measures via API", flexmonster: y(), reactPivottable: p("Custom aggregator code"), orb: p("Custom aggregate func") },
      { feature: "Formula editor in the UI", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Formulas across multiple measures", flexmonster: y(), reactPivottable: n(), orb: p("In custom code") },
      { feature: "Grand-total-aware formulas", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "KPIs from the data source", flexmonster: y("OLAP KPIs"), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "charts",
    name: "Pivot charts",
    rows: [
      { feature: "Built-in charts (no extra library)", flexmonster: y(), reactPivottable: n("Requires Plotly add-on"), orb: n() },
      { feature: "Column / bar charts", flexmonster: y(), reactPivottable: y("Plotly renderers"), orb: n() },
      { feature: "Line charts", flexmonster: y(), reactPivottable: y("Plotly renderers"), orb: n() },
      { feature: "Scatter charts", flexmonster: y(), reactPivottable: y("Plotly renderers"), orb: n() },
      { feature: "Pie charts", flexmonster: y(), reactPivottable: y("Plotly renderers"), orb: n() },
      { feature: "Stacked column charts", flexmonster: y(), reactPivottable: y("Plotly renderers"), orb: n() },
      { feature: "Combined column + line", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Heatmap renderer", flexmonster: p("Via conditional formatting"), reactPivottable: y(), orb: p("Via cell theming") },
      { feature: "Drillable / expandable axis and legend", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Interactive filtering from the chart", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Tooltips", flexmonster: y(), reactPivottable: y("Plotly"), orb: n() },
      { feature: "Split view: grid and chart together", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Chart title and legend options", flexmonster: y(), reactPivottable: p("Plotly config"), orb: n() },
      { feature: "Integration with Highcharts / amCharts / FusionCharts / Google Charts", flexmonster: y(), reactPivottable: n("Plotly only"), orb: n() },
    ],
  },
  {
    id: "drillthrough",
    name: "Drill-through",
    rows: [
      { feature: "Drill-through view for grid cells", flexmonster: y(), reactPivottable: n(), orb: y("Row details on cell click") },
      { feature: "Drill-through from charts", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Enable/disable drill-through", flexmonster: y(), reactPivottable: n(), orb: y() },
      { feature: "Field List inside drill-through", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Configure the drill-through slice", flexmonster: y(), reactPivottable: n(), orb: p("Column config") },
      { feature: "Sort columns in drill-through", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Limit maximum drill-through rows", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "toolbar",
    name: "Toolbar & UI",
    rows: [
      { feature: "Built-in toolbar", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Save the report", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Open a saved report", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Share a report by link", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Conditional formatting UI", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Number formatting UI", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Connect to a data source from the UI", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Switch between grid and charts", flexmonster: y(), reactPivottable: p("Renderer dropdown"), orb: n() },
      { feature: "Fullscreen mode", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Show/hide and customise the toolbar", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Context menu", flexmonster: y("Customizable"), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "export",
    name: "Export & print",
    rows: [
      { feature: "Export to Excel", flexmonster: y(), reactPivottable: n(), orb: y("Requires xlsx plugin") },
      { feature: "Export to PDF", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Export to CSV", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Export to HTML", flexmonster: y(), reactPivottable: p("Rendered DOM can be copied"), orb: n() },
      { feature: "Export to PNG / image", flexmonster: y(), reactPivottable: p("Plotly image download"), orb: n() },
      { feature: "Export to a server endpoint", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Export a specific grid form", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Export the chart view", flexmonster: y(), reactPivottable: p("Plotly only"), orb: n() },
      { feature: "Export the drill-through view", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Printing with the OS print manager", flexmonster: y(), reactPivottable: p("Browser print"), orb: p("Browser print") },
      { feature: "Custom headers and footers on export/print", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "options",
    name: "Options & localisation",
    rows: [
      { feature: "Save/restore full report state as JSON", flexmonster: y(), reactPivottable: y("Controlled component state"), orb: y("Config object") },
      { feature: "Multilingual localisation packs", flexmonster: y(), reactPivottable: p("Community locales"), orb: n() },
      { feature: "Accessibility support (WCAG-oriented)", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Keyboard navigation", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Read-only mode", flexmonster: y(), reactPivottable: p("Non-interactive renderer"), orb: n() },
      { feature: "Default sorting type for members", flexmonster: y(), reactPivottable: p("Sorter functions"), orb: y() },
      { feature: "Custom member sorting", flexmonster: y(), reactPivottable: y("sorters prop"), orb: y() },
      { feature: "Date and time display patterns", flexmonster: y(), reactPivottable: n(), orb: p("Via formatting func") },
      { feature: "Number formatting per measure", flexmonster: y(), reactPivottable: p("valueFilter/format fns"), orb: y("Format functions") },
      { feature: "Conditional formatting rules", flexmonster: y(), reactPivottable: p("Heatmap renderers only"), orb: n() },
      { feature: "Global options applied to all reports", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Show members with empty values", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Expand/collapse nodes from the API", flexmonster: y(), reactPivottable: n(), orb: p("Programmatic config") },
      { feature: "Custom alert pop-up", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "datasources",
    name: "Data sources",
    rows: [
      { feature: "In-browser JSON array", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "CSV files", flexmonster: y(), reactPivottable: n("Parse yourself"), orb: n("Parse yourself") },
      { feature: "CSV separator / decimal / thousands options", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "SQL databases (MySQL, Postgres, MSSQL, Oracle, MariaDB)", flexmonster: y("Flexmonster Data Server"), reactPivottable: n(), orb: n() },
      { feature: "MongoDB", flexmonster: y("MongoDB Connector"), reactPivottable: n(), orb: n() },
      { feature: "Elasticsearch", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Microsoft Analysis Services via XMLA", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "SSAS via Flexmonster Accelerator", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "OLAP multidimensional mode", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "OLAP tabular mode", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Custom data source API for any backend", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Server-side aggregation of large datasets", flexmonster: y(), reactPivottable: n("All in browser"), orb: n("All in browser") },
      { feature: "1GB+ datasets", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Field captions, types and hidden fields mapping", flexmonster: y(), reactPivottable: p("Pre-shape the data"), orb: y("Field config") },
      { feature: "Build multilevel hierarchies from flat data", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Update data without resetting the report", flexmonster: y(), reactPivottable: y("Re-render with new props"), orb: p("Re-init required") },
    ],
  },
  {
    id: "styling",
    name: "Customization & styling",
    rows: [
      { feature: "Prebuilt CSS themes", flexmonster: y(), reactPivottable: p("Single default stylesheet"), orb: y("Bundled themes") },
      { feature: "Theme builder tool", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Customise individual grid cells", flexmonster: y("customizeCell"), reactPivottable: p("Custom renderer"), orb: y("Cell styling hooks") },
      { feature: "Customise chart elements", flexmonster: y(), reactPivottable: p("Plotly config"), orb: n() },
      { feature: "Customise the toolbar", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Customise the context menu", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Fully custom renderers", flexmonster: p("Via API hooks"), reactPivottable: y("Pluggable renderers"), orb: n() },
    ],
  },
  {
    id: "security",
    name: "Security & authentication",
    rows: [
      { feature: "withCredentials on data requests", flexmonster: y(), reactPivottable: n("You fetch the data"), orb: n("You fetch the data") },
      { feature: "Custom request headers", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Basic authentication", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Windows authentication", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Role-based data access", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "HTTPS configuration for server tools", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Custom authorization hooks", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "No data sent to vendor servers", flexmonster: y(), reactPivottable: y(), orb: y() },
    ],
  },
  {
    id: "integrations",
    name: "Framework integrations",
    rows: [
      { feature: "React", flexmonster: y(), reactPivottable: y("React-native API"), orb: y("React build") },
      { feature: "Next.js", flexmonster: y(), reactPivottable: p("Client-only usage"), orb: p("Client-only usage") },
      { feature: "Angular", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Vue 3 / Nuxt", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Vue 2", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Svelte", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Blazor", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Python / Django / Jupyter", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "jQuery", flexmonster: y(), reactPivottable: y("jQuery build available"), orb: y("jQuery build") },
      { feature: "TypeScript typings", flexmonster: y("Official"), reactPivottable: p("DefinitelyTyped"), orb: n() },
      { feature: "Electron / Ionic / React Native / Flutter", flexmonster: y(), reactPivottable: p("Web view only"), orb: n() },
      { feature: "Module bundlers / npm package", flexmonster: y(), reactPivottable: y(), orb: y() },
    ],
  },
  {
    id: "api",
    name: "Developer API & support",
    rows: [
      { feature: "Documented public API (~100 methods)", flexmonster: y(), reactPivottable: n("Props-driven"), orb: p("Small JS API") },
      { feature: "Event system (on/off handlers)", flexmonster: y(), reactPivottable: p("onChange callback"), orb: p("A few callbacks") },
      { feature: "Async API variants", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Programmatic query / slice control", flexmonster: y("runQuery"), reactPivottable: y("Controlled props"), orb: y("Config object") },
      { feature: "CLI tooling", flexmonster: y(), reactPivottable: n(), orb: n() },
      { feature: "Official samples gallery", flexmonster: y("500+ samples"), reactPivottable: p("Storybook demos"), orb: p("Demo page") },
      { feature: "Actively maintained releases", flexmonster: y(), reactPivottable: p("Low activity"), orb: n("Unmaintained") },
      { feature: "Vendor technical support", flexmonster: y("Included with licence"), reactPivottable: n("Community issues"), orb: n() },
      { feature: "SLA / guaranteed response time", flexmonster: y(), reactPivottable: n(), orb: n() },
    ],
  },
  {
    id: "licensing",
    name: "Licensing & cost",
    rows: [
      { feature: "Free to use in production", flexmonster: n("Paid licence required"), reactPivottable: y("MIT"), orb: y("MIT") },
      { feature: "Source code available", flexmonster: n(), reactPivottable: y(), orb: y() },
      { feature: "Internal-use commercial licence", flexmonster: y("from ~$799/yr"), reactPivottable: y("MIT"), orb: y("MIT") },
      { feature: "SaaS / multi-tenant embedding licence", flexmonster: y("Paid tier"), reactPivottable: y("MIT"), orb: y("MIT") },
      { feature: "OEM / redistribution licence", flexmonster: y("Paid tier"), reactPivottable: y("MIT"), orb: y("MIT") },
      { feature: "Unlimited developer seats", flexmonster: y(), reactPivottable: y(), orb: y() },
      { feature: "Free trial before purchase", flexmonster: y("30 days, no signup"), reactPivottable: y("N/A — free"), orb: y("N/A — free") },
      { feature: "No runtime licence key needed", flexmonster: n("Key validated client-side"), reactPivottable: y(), orb: y() },
    ],
  },
];

export const totalFeatures = categories.reduce((acc, c) => acc + c.rows.length, 0);

export function scoreFor(key: ProductKey) {
  let full = 0;
  let partial = 0;
  for (const c of categories) {
    for (const r of c.rows) {
      const cell = r[key];
      if (cell.s === "yes") full++;
      else if (cell.s === "partial") partial++;
    }
  }
  return { full, partial, none: totalFeatures - full - partial };
}
