export type Support = "yes" | "partial" | "no";

export type Cell = {
  s: Support;
  note?: string;
};

export type FeatureRow = {
  feature: string;
  flexmonster: Cell;
  reactPivottable: Cell;
  /** Our Pivot Studio demo (see /demos). */
  studio: Cell;
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
    key: "studio" as const,
    name: "Pivot Studio (our demo)",
    subtitle: "Free • built on react-pivottable",
    url: "/demos",
  },
];

export type ProductKey = (typeof products)[number]["key"];

export const verdicts: Record<ProductKey, string> = {
  flexmonster:
    "Does everything on this list. You get exports, charts, big-data handling and paid support — but you pay a yearly licence fee.",
  reactPivottable:
    "Free and quick to drop into a React app. Good for simple internal dashboards, but there is no Excel/PDF export, no toolbar and no help desk if you get stuck.",
  studio:
    "Our demo: the free engine wrapped in a familiar shell — drag-and-drop field list, subtotals, expand/collapse, compact/classic/flat layouts, charts, exports, filters, calculated values and language packs. The maths can also be handed to your own backend service.",
};

type RawRow = Omit<FeatureRow, "studio">;
type RawCategory = { id: string; name: string; rows: RawRow[] };

const rawCategories: RawCategory[] = [
  {
    id: "grid",
    name: "Grid",
    rows: [
      {
        feature: "Virtual grid rendering thousands of rows",
        flexmonster: y("1M+ grouped rows"),
        reactPivottable: n("Renders full DOM table"),
      },
      {
        feature: "Compact pivot table form",
        flexmonster: y(),
        reactPivottable: n(),
      },
      {
        feature: "Classic (tabular) pivot form",
        flexmonster: y(),
        reactPivottable: y("Default renderer"),
      },
      {
        feature: "Flat table form",
        flexmonster: y(),
        reactPivottable: p("Table renderer only"),
      },
      { feature: "Grand totals and subtotals", flexmonster: y(), reactPivottable: y() },
      {
        feature: "Show/hide subtotals",
        flexmonster: y(),
        reactPivottable: n(),
      },
      {
        feature: "Show/hide grand totals per rows/columns",
        flexmonster: y(),
        reactPivottable: n(),
      },
      {
        feature: "Grand totals top or bottom (flat table)",
        flexmonster: y(),
        reactPivottable: n(),
      },
      { feature: "Sort field members", flexmonster: y(), reactPivottable: y() },
      {
        feature: "Sort values on the pivot table",
        flexmonster: y(),
        reactPivottable: p("Row/col order only"),
      },
      {
        feature: "Sort multiple columns in flat table",
        flexmonster: y(),
        reactPivottable: n(),
      },
      { feature: "Show/hide sorting controls", flexmonster: y(), reactPivottable: n() },
      {
        feature: "Repeat member labels in classic form",
        flexmonster: y(),
        reactPivottable: n(),
      },
      { feature: "Expand and collapse values", flexmonster: y(), reactPivottable: n() },
      {
        feature: "Drill up/down multilevel hierarchies",
        flexmonster: y(),
        reactPivottable: n(),
      },
      {
        feature: "Drag fields between rows, columns and filters",
        flexmonster: y(),
        reactPivottable: y(),
      },
      {
        feature: "Enable/disable drag and drop",
        flexmonster: y(),
        reactPivottable: p("Use non-interactive renderer"),
      },
      { feature: "Resize columns and rows", flexmonster: y(), reactPivottable: n() },
      { feature: "Select cells", flexmonster: y(), reactPivottable: n() },
      { feature: "Copy selected cells", flexmonster: y(), reactPivottable: n() },
      { feature: "Keyboard navigation shortcuts", flexmonster: y(), reactPivottable: n() },
      { feature: "Highlight rows and columns", flexmonster: y(), reactPivottable: n() },
      { feature: "Auto-calculation bar for selection", flexmonster: y(), reactPivottable: n() },
      { feature: "Editing cells inline", flexmonster: y(), reactPivottable: n() },
      { feature: "Grid title", flexmonster: y(), reactPivottable: n() },
      { feature: "Show/hide spreadsheet headers", flexmonster: y(), reactPivottable: n() },
      { feature: "Show/hide field captions", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "filters",
    name: "Filters",
    rows: [
      { feature: "Value filters (top/bottom N)", flexmonster: y(), reactPivottable: n() },
      { feature: "Conditional filter for number fields", flexmonster: y(), reactPivottable: n() },
      { feature: "Conditional filter for string fields", flexmonster: y(), reactPivottable: n() },
      { feature: "Conditional filter for date fields", flexmonster: y(), reactPivottable: n() },
      { feature: "Conditional filter for time fields", flexmonster: y(), reactPivottable: n() },
      { feature: "Selection (member checkbox) filter", flexmonster: y(), reactPivottable: y() },
      { feature: "Search box inside the filter", flexmonster: y(), reactPivottable: n() },
      { feature: "Report filter (page) area", flexmonster: y(), reactPivottable: n() },
      { feature: "Show/hide report filter area", flexmonster: y(), reactPivottable: n() },
      { feature: "Show/hide filter controls on the grid", flexmonster: y(), reactPivottable: n() },
      { feature: "Filter controls on charts", flexmonster: y(), reactPivottable: n() },
      { feature: "Server-side filtering (subqueries)", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "fieldlist",
    name: "Field List",
    rows: [
      { feature: "Dedicated Field List panel", flexmonster: y(), reactPivottable: p("Inline field pills, no panel") },
      { feature: "Multiple fields in columns", flexmonster: y(), reactPivottable: y() },
      { feature: "Multiple fields in rows", flexmonster: y(), reactPivottable: y() },
      { feature: "Multiple measures", flexmonster: y(), reactPivottable: n("One aggregator at a time") },
      { feature: "Same field with different aggregations", flexmonster: y(), reactPivottable: n() },
      { feature: "String field as a value", flexmonster: y(), reactPivottable: p("Via count aggregators") },
      { feature: "Date field as a value", flexmonster: y(), reactPivottable: n() },
      { feature: "Time field as a value", flexmonster: y(), reactPivottable: n() },
      { feature: "Drag fields inside the list", flexmonster: y(), reactPivottable: y() },
      { feature: "Field folders / grouping", flexmonster: y(), reactPivottable: n() },
      { feature: "Hierarchy levels shown in the list", flexmonster: y(), reactPivottable: n() },
      { feature: "Selecting sublevels of a hierarchy", flexmonster: y(), reactPivottable: n() },
      { feature: "Search in the Field List", flexmonster: y(), reactPivottable: n() },
      { feature: "Expand All button", flexmonster: y(), reactPivottable: n() },
      { feature: "UI for adding calculated values", flexmonster: y(), reactPivottable: n() },
      { feature: "Open/close the Field List from the API", flexmonster: y(), reactPivottable: n() },
      { feature: "Custom sorting of Field List items", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "aggregations",
    name: "Aggregation functions",
    rows: [
      { feature: "Sum", flexmonster: y(), reactPivottable: y() },
      { feature: "Count", flexmonster: y(), reactPivottable: y() },
      { feature: "Distinct count", flexmonster: y(), reactPivottable: y() },
      { feature: "Average", flexmonster: y(), reactPivottable: y() },
      { feature: "Median", flexmonster: y(), reactPivottable: y() },
      { feature: "Product", flexmonster: y(), reactPivottable: n() },
      { feature: "Min", flexmonster: y(), reactPivottable: y() },
      { feature: "Max", flexmonster: y(), reactPivottable: y() },
      { feature: "Population standard deviation", flexmonster: y(), reactPivottable: p("Var/stdev variants") },
      { feature: "Sample standard deviation", flexmonster: y(), reactPivottable: y() },
      { feature: "Percent of total", flexmonster: y(), reactPivottable: y() },
      { feature: "Percent of column", flexmonster: y(), reactPivottable: y() },
      { feature: "Percent of row", flexmonster: y(), reactPivottable: y() },
      { feature: "Percent of parent column total", flexmonster: y(), reactPivottable: n() },
      { feature: "Percent of parent row total", flexmonster: y(), reactPivottable: n() },
      { feature: "Index", flexmonster: y(), reactPivottable: n() },
      { feature: "Difference of column / row", flexmonster: y(), reactPivottable: n() },
      { feature: "% difference of column / row", flexmonster: y(), reactPivottable: n() },
      { feature: "Running totals of column / row", flexmonster: y(), reactPivottable: n() },
      { feature: "Custom aggregation functions", flexmonster: y(), reactPivottable: y("Custom aggregators") },
      { feature: "Restrict available aggregations per field", flexmonster: y(), reactPivottable: n() },
      { feature: "Show/hide the aggregation (sigma) icon", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "calculated",
    name: "Calculated values",
    rows: [
      { feature: "Calculated measures via API", flexmonster: y(), reactPivottable: p("Custom aggregator code") },
      { feature: "Formula editor in the UI", flexmonster: y(), reactPivottable: n() },
      { feature: "Formulas across multiple measures", flexmonster: y(), reactPivottable: n() },
      { feature: "Grand-total-aware formulas", flexmonster: y(), reactPivottable: n() },
      { feature: "KPIs from the data source", flexmonster: y("OLAP KPIs"), reactPivottable: n() },
    ],
  },
  {
    id: "charts",
    name: "Pivot charts",
    rows: [
      { feature: "Built-in charts (no extra library)", flexmonster: y(), reactPivottable: n("Requires Plotly add-on") },
      { feature: "Column / bar charts", flexmonster: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Line charts", flexmonster: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Scatter charts", flexmonster: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Pie charts", flexmonster: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Stacked column charts", flexmonster: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Combined column + line", flexmonster: y(), reactPivottable: n() },
      { feature: "Heatmap renderer", flexmonster: p("Via conditional formatting"), reactPivottable: y() },
      { feature: "Drillable / expandable axis and legend", flexmonster: y(), reactPivottable: n() },
      { feature: "Interactive filtering from the chart", flexmonster: y(), reactPivottable: n() },
      { feature: "Tooltips", flexmonster: y(), reactPivottable: y("Plotly") },
      { feature: "Split view: grid and chart together", flexmonster: y(), reactPivottable: n() },
      { feature: "Chart title and legend options", flexmonster: y(), reactPivottable: p("Plotly config") },
      { feature: "Integration with Highcharts / amCharts / FusionCharts / Google Charts", flexmonster: y(), reactPivottable: n("Plotly only") },
    ],
  },
  {
    id: "drillthrough",
    name: "Drill-through",
    rows: [
      { feature: "Drill-through view for grid cells", flexmonster: y(), reactPivottable: n() },
      { feature: "Drill-through from charts", flexmonster: y(), reactPivottable: n() },
      { feature: "Enable/disable drill-through", flexmonster: y(), reactPivottable: n() },
      { feature: "Field List inside drill-through", flexmonster: y(), reactPivottable: n() },
      { feature: "Configure the drill-through slice", flexmonster: y(), reactPivottable: n() },
      { feature: "Sort columns in drill-through", flexmonster: y(), reactPivottable: n() },
      { feature: "Limit maximum drill-through rows", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "toolbar",
    name: "Toolbar & UI",
    rows: [
      { feature: "Built-in toolbar", flexmonster: y(), reactPivottable: n() },
      { feature: "Save the report", flexmonster: y(), reactPivottable: n() },
      { feature: "Open a saved report", flexmonster: y(), reactPivottable: n() },
      { feature: "Share a report by link", flexmonster: y(), reactPivottable: n() },
      { feature: "Conditional formatting UI", flexmonster: y(), reactPivottable: n() },
      { feature: "Number formatting UI", flexmonster: y(), reactPivottable: n() },
      { feature: "Connect to a data source from the UI", flexmonster: y(), reactPivottable: n() },
      { feature: "Switch between grid and charts", flexmonster: y(), reactPivottable: p("Renderer dropdown") },
      { feature: "Fullscreen mode", flexmonster: y(), reactPivottable: n() },
      { feature: "Show/hide and customise the toolbar", flexmonster: y(), reactPivottable: n() },
      { feature: "Context menu", flexmonster: y("Customizable"), reactPivottable: n() },
    ],
  },
  {
    id: "export",
    name: "Export & print",
    rows: [
      { feature: "Export to Excel", flexmonster: y(), reactPivottable: n() },
      { feature: "Export to PDF", flexmonster: y(), reactPivottable: n() },
      { feature: "Export to CSV", flexmonster: y(), reactPivottable: n() },
      { feature: "Export to HTML", flexmonster: y(), reactPivottable: p("Rendered DOM can be copied") },
      { feature: "Export to PNG / image", flexmonster: y(), reactPivottable: p("Plotly image download") },
      { feature: "Export to a server endpoint", flexmonster: y(), reactPivottable: n() },
      { feature: "Export a specific grid form", flexmonster: y(), reactPivottable: n() },
      { feature: "Export the chart view", flexmonster: y(), reactPivottable: p("Plotly only") },
      { feature: "Export the drill-through view", flexmonster: y(), reactPivottable: n() },
      { feature: "Printing with the OS print manager", flexmonster: y(), reactPivottable: p("Browser print") },
      { feature: "Custom headers and footers on export/print", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "options",
    name: "Options & localisation",
    rows: [
      { feature: "Save/restore full report state as JSON", flexmonster: y(), reactPivottable: y("Controlled component state") },
      { feature: "Multilingual localisation packs", flexmonster: y(), reactPivottable: p("Community locales") },
      { feature: "Accessibility support (WCAG-oriented)", flexmonster: y(), reactPivottable: n() },
      { feature: "Keyboard navigation", flexmonster: y(), reactPivottable: n() },
      { feature: "Read-only mode", flexmonster: y(), reactPivottable: p("Non-interactive renderer") },
      { feature: "Default sorting type for members", flexmonster: y(), reactPivottable: p("Sorter functions") },
      { feature: "Custom member sorting", flexmonster: y(), reactPivottable: y("sorters prop") },
      { feature: "Date and time display patterns", flexmonster: y(), reactPivottable: n() },
      { feature: "Number formatting per measure", flexmonster: y(), reactPivottable: p("valueFilter/format fns") },
      { feature: "Conditional formatting rules", flexmonster: y(), reactPivottable: p("Heatmap renderers only") },
      { feature: "Global options applied to all reports", flexmonster: y(), reactPivottable: n() },
      { feature: "Show members with empty values", flexmonster: y(), reactPivottable: n() },
      { feature: "Expand/collapse nodes from the API", flexmonster: y(), reactPivottable: n() },
      { feature: "Custom alert pop-up", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "datasources",
    name: "Data sources",
    rows: [
      { feature: "In-browser JSON array", flexmonster: y(), reactPivottable: y() },
      { feature: "CSV files", flexmonster: y(), reactPivottable: n("Parse yourself") },
      { feature: "CSV separator / decimal / thousands options", flexmonster: y(), reactPivottable: n() },
      { feature: "SQL databases (MySQL, Postgres, MSSQL, Oracle, MariaDB)", flexmonster: y("Flexmonster Data Server"), reactPivottable: n() },
      { feature: "MongoDB", flexmonster: y("MongoDB Connector"), reactPivottable: n() },
      { feature: "Elasticsearch", flexmonster: y(), reactPivottable: n() },
      { feature: "Microsoft Analysis Services via XMLA", flexmonster: y(), reactPivottable: n() },
      { feature: "SSAS via Flexmonster Accelerator", flexmonster: y(), reactPivottable: n() },
      { feature: "OLAP multidimensional mode", flexmonster: y(), reactPivottable: n() },
      { feature: "OLAP tabular mode", flexmonster: y(), reactPivottable: n() },
      { feature: "Custom data source API for any backend", flexmonster: y(), reactPivottable: n() },
      { feature: "Server-side aggregation of large datasets", flexmonster: y(), reactPivottable: n("All in browser") },
      { feature: "1GB+ datasets", flexmonster: y(), reactPivottable: n() },
      { feature: "Field captions, types and hidden fields mapping", flexmonster: y(), reactPivottable: p("Pre-shape the data") },
      { feature: "Build multilevel hierarchies from flat data", flexmonster: y(), reactPivottable: n() },
      { feature: "Update data without resetting the report", flexmonster: y(), reactPivottable: y("Re-render with new props") },
    ],
  },
  {
    id: "styling",
    name: "Customization & styling",
    rows: [
      { feature: "Prebuilt CSS themes", flexmonster: y(), reactPivottable: p("Single default stylesheet") },
      { feature: "Theme builder tool", flexmonster: y(), reactPivottable: n() },
      { feature: "Customise individual grid cells", flexmonster: y("customizeCell"), reactPivottable: p("Custom renderer") },
      { feature: "Customise chart elements", flexmonster: y(), reactPivottable: p("Plotly config") },
      { feature: "Customise the toolbar", flexmonster: y(), reactPivottable: n() },
      { feature: "Customise the context menu", flexmonster: y(), reactPivottable: n() },
      { feature: "Fully custom renderers", flexmonster: p("Via API hooks"), reactPivottable: y("Pluggable renderers") },
    ],
  },
  {
    id: "security",
    name: "Security & authentication",
    rows: [
      { feature: "withCredentials on data requests", flexmonster: y(), reactPivottable: n("You fetch the data") },
      { feature: "Custom request headers", flexmonster: y(), reactPivottable: n() },
      { feature: "Basic authentication", flexmonster: y(), reactPivottable: n() },
      { feature: "Windows authentication", flexmonster: y(), reactPivottable: n() },
      { feature: "Role-based data access", flexmonster: y(), reactPivottable: n() },
      { feature: "HTTPS configuration for server tools", flexmonster: y(), reactPivottable: n() },
      { feature: "Custom authorization hooks", flexmonster: y(), reactPivottable: n() },
      { feature: "No data sent to vendor servers", flexmonster: y(), reactPivottable: y() },
    ],
  },
  {
    id: "integrations",
    name: "Framework integrations",
    rows: [
      { feature: "React", flexmonster: y(), reactPivottable: y("React-native API") },
      { feature: "Next.js", flexmonster: y(), reactPivottable: p("Client-only usage") },
      { feature: "Angular", flexmonster: y(), reactPivottable: n() },
      { feature: "Vue 3 / Nuxt", flexmonster: y(), reactPivottable: n() },
      { feature: "Vue 2", flexmonster: y(), reactPivottable: n() },
      { feature: "Svelte", flexmonster: y(), reactPivottable: n() },
      { feature: "Blazor", flexmonster: y(), reactPivottable: n() },
      { feature: "Python / Django / Jupyter", flexmonster: y(), reactPivottable: n() },
      { feature: "jQuery", flexmonster: y(), reactPivottable: y("jQuery build available") },
      { feature: "TypeScript typings", flexmonster: y("Official"), reactPivottable: p("DefinitelyTyped") },
      { feature: "Electron / Ionic / React Native / Flutter", flexmonster: y(), reactPivottable: p("Web view only") },
      { feature: "Module bundlers / npm package", flexmonster: y(), reactPivottable: y() },
    ],
  },
  {
    id: "api",
    name: "Developer API & support",
    rows: [
      { feature: "Documented public API (~100 methods)", flexmonster: y(), reactPivottable: n("Props-driven") },
      { feature: "Event system (on/off handlers)", flexmonster: y(), reactPivottable: p("onChange callback") },
      { feature: "Async API variants", flexmonster: y(), reactPivottable: n() },
      { feature: "Programmatic query / slice control", flexmonster: y("runQuery"), reactPivottable: y("Controlled props") },
      { feature: "CLI tooling", flexmonster: y(), reactPivottable: n() },
      { feature: "Official samples gallery", flexmonster: y("500+ samples"), reactPivottable: p("Storybook demos") },
      { feature: "Actively maintained releases", flexmonster: y(), reactPivottable: p("Low activity") },
      { feature: "Vendor technical support", flexmonster: y("Included with licence"), reactPivottable: n("Community issues") },
      { feature: "SLA / guaranteed response time", flexmonster: y(), reactPivottable: n() },
    ],
  },
  {
    id: "licensing",
    name: "Licensing & cost",
    rows: [
      { feature: "Free to use in production", flexmonster: n("Paid licence required"), reactPivottable: y("MIT") },
      { feature: "Source code available", flexmonster: n(), reactPivottable: y() },
      { feature: "Internal-use commercial licence", flexmonster: y("from ~$799/yr"), reactPivottable: y("MIT") },
      { feature: "SaaS / multi-tenant embedding licence", flexmonster: y("Paid tier"), reactPivottable: y("MIT") },
      { feature: "OEM / redistribution licence", flexmonster: y("Paid tier"), reactPivottable: y("MIT") },
      { feature: "Unlimited developer seats", flexmonster: y(), reactPivottable: y() },
      { feature: "Free trial before purchase", flexmonster: y("30 days, no signup"), reactPivottable: y("N/A — free") },
      { feature: "No runtime licence key needed", flexmonster: n("Key validated client-side"), reactPivottable: y() },
    ],
  },
];

/**
 * What the Pivot Studio demo (see /demos) actually ships, feature by feature.
 * Anything not listed falls back to the best of the two underlying free engines.
 */
const sharedStudioOverrides: Record<string, Cell> = {
  // Grid
  "Show/hide grand totals per rows/columns": y("Toolbar option"),
  "Grid title": y("title prop"),
  // Filters
  "Value filters (top/bottom N)": y("Top-N filter"),
  "Conditional filter for number fields": y(),
  "Conditional filter for string fields": y(),
  "Conditional filter for date fields": y("Date picker + before/after/between"),
  "Conditional filter for time fields": y("Time picker, compares clock time"),
  "Show/hide report filter area": y("Filter area toggle in the toolbar"),
  "Filter controls on charts": y("Member filter buttons above the chart"),
  "Server-side filtering (subqueries)": y("subquery filter → SQL HAVING"),
  "Selection (member checkbox) filter": y(),
  "Search box inside the filter": y(),
  "Report filter (page) area": y("Filters area in the sidebar"),
  "Show/hide filter controls on the grid": y(),
  // Field list
  "Dedicated Field List panel": y("Sidebar panel"),
  "Multiple measures": p("One measure rendered at a time"),
  "UI for adding calculated values": y("Formula box"),
  "Open/close the Field List from the API": y("showSidebar prop"),
  // Aggregations
  "Distinct count": y(),
  Median: y(),
  Product: y(),
  "Population standard deviation": y(),
  "Sample standard deviation": y(),
  "Percent of total": y("Display mode"),
  "Custom aggregation functions": y("registerAggregator()"),
  // Calculated values
  "Calculated measures via API": y(),
  "Formula editor in the UI": y("Safe formula parser"),
  "Formulas across multiple measures": y(),
  // Charts
  "Built-in charts (no extra library)": y("Bundled Recharts view"),
  "Column / bar charts": y(),
  "Line charts": y(),
  "Scatter charts": y(),
  "Pie charts": y(),
  "Stacked column charts": p("Grouped columns"),
  Tooltips: y(),
  "Chart title and legend options": y(),
  // Drill-through
  "Drill-through view for grid cells": y("Click a cell"),
  "Enable/disable drill-through": y("Permission flag"),
  "Configure the drill-through slice": p("Shows all source columns"),
  // Toolbar
  "Built-in toolbar": y(),
  "Save the report": y("Report JSON"),
  "Open a saved report": y("Report JSON"),
  "Switch between grid and charts": y(),
  "Show/hide and customise the toolbar": y("showToolbar prop"),
  // Export & print
  "Export to Excel": y(".xls export"),
  "Export to CSV": y(),
  "Export to HTML": y(),
  "Export to PDF": p("Through the print dialog"),
  "Printing with the OS print manager": y("Print view"),
  // Options & localisation
  "Save/restore full report state as JSON": y(),
  "Multilingual localisation packs": y("Bundled locales"),
  "Read-only mode": y("Permission flag"),
  "Number formatting per measure": y("Locale-aware formats"),
  "Conditional formatting rules": y("Rule-based cell colours"),
  // Data sources
  "CSV files": y("Built-in CSV loader"),
  "CSV separator / decimal / thousands options": p("Separator only"),
  "Field captions, types and hidden fields mapping": y("Field metadata + inference"),
  "Update data without resetting the report": y("Controlled config"),
  // Styling
  "Prebuilt CSS themes": p("Theme tokens you can override"),
  "Customise individual grid cells": y("Conditional formatting hooks"),
  "Customise the toolbar": y("Sub-components exported"),
  "Fully custom renderers": y("Compose your own shell"),
  // Security
  "Role-based data access": y("Row-level security + field masking"),
  "Custom authorization hooks": y("secureRows() predicates"),
  // Integrations & support
  "TypeScript typings": y("Typed source"),
  "Actively maintained releases": p("You own and maintain the code"),
  "Vendor technical support": n("No vendor"),
  "SLA / guaranteed response time": n(),
};

/** Grid features the custom PivotGrid renderer adds on top of the free engine. */
const gridStudioOverrides: Record<string, Cell> = {
  "Virtual grid rendering thousands of rows": y("Windowed rendering"),
  "Compact pivot table form": y("Indented hierarchy"),
  "Classic (tabular) pivot form": y("Layout switch"),
  "Flat table form": y("Layout switch"),
  "Show/hide subtotals": y("Toolbar option"),
  "Expand and collapse values": y("Click a row member"),
  "Show/hide sorting controls": y("Option"),
  "Sort values on the pivot table": y("Header sort control"),
  "Resize columns and rows": y("Column resize handles"),
  "Select cells": y("Click and shift-click"),
  "Copy selected cells": y("Copy button"),
  "Keyboard navigation shortcuts": y("Arrow keys and Enter"),
  "Highlight rows and columns": y("Hover highlight"),
  "Auto-calculation bar for selection": y("Sum/avg/min/max bar"),
  "Grid title": y("title prop"),
  "Show/hide spreadsheet headers": y("Option"),
  "Repeat member labels in classic form": y("Option"),
  "Show/hide field captions": y("Option"),
  "Drill up/down multilevel hierarchies": y("Row and column levels, plus drill all"),
  "Grand totals top or bottom (flat table)": y("Toolbar position selector"),
  "Sort multiple columns in flat table": y("Shift-click sort controls"),
  "Enable/disable drag and drop": y("Toolbar switch (config.dragAndDrop)"),
  "Editing cells inline": y("\u201cEdit cells\u201d switch, double-click a value"),
};

function studioCell(row: RawRow, base: Cell): Cell {
  const override = gridStudioOverrides[row.feature] ?? sharedStudioOverrides[row.feature];
  if (override) return override;
  return { s: base.s, ...(base.note ? { note: base.note } : {}) };
}

export const categories: FeatureCategory[] = rawCategories.map((c) => ({
  ...c,
  rows: c.rows.map((r) => ({
    ...r,
    studio: studioCell(r, r.reactPivottable),
  })),
}));

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
