export type Support = "yes" | "partial" | "no";

export type Cell = {
  s: Support;
  note?: string;
};

export type FeatureRow = {
  feature: string;
  commercial: Cell;
  reactPivottable: Cell;
  /** react-pivottable-enhanced (see /demos). */
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

export const products: {
  key: "commercial" | "reactPivottable" | "studio";
  name: string;
  subtitle: string;
  url?: string;
}[] = [
  {
    key: "commercial",
    name: "Commercial pivot table",
    subtitle: "Commercial • paid licence",
  },
  {
    key: "reactPivottable",
    name: "react-pivottable",
    subtitle: "Open source • MIT",
    url: "https://react-pivottable.js.org/",
  },
  {
    key: "studio",
    name: "react-pivottable-enhanced",
    subtitle: "Free • in-house React grid",
    url: "/demos",
  },
];

export type ProductKey = (typeof products)[number]["key"];

export const verdicts: Record<ProductKey, string> = {
  commercial:
    "Does everything on this list. You get exports, charts, big-data handling and paid support — but you pay a licence fee.",
  reactPivottable:
    "Free and quick to drop into a React app. Good for simple internal dashboards, but there is no Excel/PDF export, no toolbar and no help desk if you get stuck.",
  studio:
    "react-pivottable-enhanced: a commercial-style React grid with no third-party pivot dependency — drag-and-drop field list, subtotals, expand/collapse, compact/classic/flat layouts, charts, exports, filters, calculated values and language packs. The maths can also be handed to your own backend service.",
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
        commercial: y("1M+ grouped rows"),
        reactPivottable: n("Renders full DOM table"),
      },
      {
        feature: "Compact pivot table form",
        commercial: y(),
        reactPivottable: n(),
      },
      {
        feature: "Classic (tabular) pivot form",
        commercial: y(),
        reactPivottable: y("Default renderer"),
      },
      {
        feature: "Flat table form",
        commercial: y(),
        reactPivottable: p("Table renderer only"),
      },
      { feature: "Grand totals and subtotals", commercial: y(), reactPivottable: y() },
      {
        feature: "Show/hide subtotals",
        commercial: y(),
        reactPivottable: n(),
      },
      {
        feature: "Show/hide grand totals per rows/columns",
        commercial: y(),
        reactPivottable: n(),
      },
      {
        feature: "Grand totals top or bottom (flat table)",
        commercial: y(),
        reactPivottable: n(),
      },
      { feature: "Sort field members", commercial: y(), reactPivottable: y() },
      {
        feature: "Sort values on the pivot table",
        commercial: y(),
        reactPivottable: p("Row/col order only"),
      },
      {
        feature: "Sort multiple columns in flat table",
        commercial: y(),
        reactPivottable: n(),
      },
      { feature: "Show/hide sorting controls", commercial: y(), reactPivottable: n() },
      {
        feature: "Repeat member labels in classic form",
        commercial: y(),
        reactPivottable: n(),
      },
      { feature: "Expand and collapse values", commercial: y(), reactPivottable: n() },
      {
        feature: "Drill up/down multilevel hierarchies",
        commercial: y(),
        reactPivottable: n(),
      },
      {
        feature: "Drag fields between rows, columns and filters",
        commercial: y(),
        reactPivottable: y(),
      },
      {
        feature: "Enable/disable drag and drop",
        commercial: y(),
        reactPivottable: p("Use non-interactive renderer"),
      },
      { feature: "Resize columns and rows", commercial: y(), reactPivottable: n() },
      { feature: "Select cells", commercial: y(), reactPivottable: n() },
      { feature: "Copy selected cells", commercial: y(), reactPivottable: n() },
      { feature: "Keyboard navigation shortcuts", commercial: y(), reactPivottable: n() },
      { feature: "Highlight rows and columns", commercial: y(), reactPivottable: n() },
      { feature: "Auto-calculation bar for selection", commercial: y(), reactPivottable: n() },
      { feature: "Editing cells inline", commercial: y(), reactPivottable: n() },
      { feature: "Grid title", commercial: y(), reactPivottable: n() },
      { feature: "Show/hide spreadsheet headers", commercial: y(), reactPivottable: n() },
      { feature: "Show/hide field captions", commercial: y(), reactPivottable: n() },
      {
        feature: "Rename fields and measures (custom captions)",
        commercial: y(),
        reactPivottable: n(),
      },
    ],
  },
  {
    id: "filters",
    name: "Filters",
    rows: [
      { feature: "Value filters (top/bottom N)", commercial: y(), reactPivottable: n() },
      { feature: "Conditional filter for number fields", commercial: y(), reactPivottable: n() },
      { feature: "Conditional filter for string fields", commercial: y(), reactPivottable: n() },
      { feature: "Conditional filter for date fields", commercial: y(), reactPivottable: n() },
      { feature: "Conditional filter for time fields", commercial: y(), reactPivottable: n() },
      { feature: "Selection (member checkbox) filter", commercial: y(), reactPivottable: y() },
      { feature: "Search box inside the filter", commercial: y(), reactPivottable: n() },
      { feature: "Report filter (page) area", commercial: y(), reactPivottable: n() },
      { feature: "Show/hide report filter area", commercial: y(), reactPivottable: n() },
      { feature: "Show/hide filter controls on the grid", commercial: y(), reactPivottable: n() },
      { feature: "Filter controls on charts", commercial: y(), reactPivottable: n() },
      { feature: "Server-side filtering (subqueries)", commercial: y(), reactPivottable: n() },
    ],
  },
  {
    id: "fieldlist",
    name: "Field List",
    rows: [
      {
        feature: "Dedicated Field List panel",
        commercial: y(),
        reactPivottable: p("Inline field pills, no panel"),
      },
      { feature: "Multiple fields in columns", commercial: y(), reactPivottable: y() },
      { feature: "Multiple fields in rows", commercial: y(), reactPivottable: y() },
      {
        feature: "Multiple measures",
        commercial: y(),
        reactPivottable: n("One aggregator at a time"),
      },
      { feature: "Same field with different aggregations", commercial: y(), reactPivottable: n() },
      {
        feature: "String field as a value",
        commercial: y(),
        reactPivottable: p("Via count aggregators"),
      },
      { feature: "Date field as a value", commercial: y(), reactPivottable: n() },
      { feature: "Time field as a value", commercial: y(), reactPivottable: n() },
      { feature: "Drag fields inside the list", commercial: y(), reactPivottable: y() },
      { feature: "Field folders / grouping", commercial: y(), reactPivottable: n() },
      { feature: "Hierarchy levels shown in the list", commercial: y(), reactPivottable: n() },
      { feature: "Selecting sublevels of a hierarchy", commercial: y(), reactPivottable: n() },
      { feature: "Search in the Field List", commercial: y(), reactPivottable: n() },
      { feature: "Expand All button", commercial: y(), reactPivottable: n() },
      { feature: "UI for adding calculated values", commercial: y(), reactPivottable: n() },
      { feature: "Open/close the Field List from the API", commercial: y(), reactPivottable: n() },
      { feature: "Custom sorting of Field List items", commercial: y(), reactPivottable: n() },
    ],
  },
  {
    id: "aggregations",
    name: "Aggregation functions",
    rows: [
      { feature: "Sum", commercial: y(), reactPivottable: y() },
      { feature: "Count", commercial: y(), reactPivottable: y() },
      { feature: "Distinct count", commercial: y(), reactPivottable: y() },
      { feature: "Average", commercial: y(), reactPivottable: y() },
      { feature: "Median", commercial: y(), reactPivottable: y() },
      { feature: "Product", commercial: y(), reactPivottable: n() },
      { feature: "Min", commercial: y(), reactPivottable: y() },
      { feature: "Max", commercial: y(), reactPivottable: y() },
      {
        feature: "Population standard deviation",
        commercial: y(),
        reactPivottable: p("Var/stdev variants"),
      },
      { feature: "Sample standard deviation", commercial: y(), reactPivottable: y() },
      { feature: "Percent of total", commercial: y(), reactPivottable: y() },
      { feature: "Percent of column", commercial: y(), reactPivottable: y() },
      { feature: "Percent of row", commercial: y(), reactPivottable: y() },
      { feature: "Percent of parent column total", commercial: y(), reactPivottable: n() },
      { feature: "Percent of parent row total", commercial: y(), reactPivottable: n() },
      { feature: "Index", commercial: y(), reactPivottable: n() },
      { feature: "Difference of column / row", commercial: y(), reactPivottable: n() },
      { feature: "% difference of column / row", commercial: y(), reactPivottable: n() },
      { feature: "Running totals of column / row", commercial: y(), reactPivottable: n() },
      {
        feature: "Custom aggregation functions",
        commercial: y(),
        reactPivottable: y("Custom aggregators"),
      },
      {
        feature: "Restrict available aggregations per field",
        commercial: y(),
        reactPivottable: n(),
      },
      { feature: "Show/hide the aggregation (sigma) icon", commercial: y(), reactPivottable: n() },
    ],
  },
  {
    id: "calculated",
    name: "Calculated values",
    rows: [
      {
        feature: "Calculated measures via API",
        commercial: y(),
        reactPivottable: p("Custom aggregator code"),
      },
      { feature: "Formula editor in the UI", commercial: y(), reactPivottable: n() },
      { feature: "Formulas across multiple measures", commercial: y(), reactPivottable: n() },
      { feature: "Grand-total-aware formulas", commercial: y(), reactPivottable: n() },
      { feature: "KPIs from the data source", commercial: y("OLAP KPIs"), reactPivottable: n() },
    ],
  },
  {
    id: "charts",
    name: "Pivot charts",
    rows: [
      {
        feature: "Built-in charts (no extra library)",
        commercial: y(),
        reactPivottable: n("Requires Plotly add-on"),
      },
      { feature: "Column / bar charts", commercial: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Line charts", commercial: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Scatter charts", commercial: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Pie charts", commercial: y(), reactPivottable: y("Plotly renderers") },
      {
        feature: "Stacked column charts",
        commercial: y(),
        reactPivottable: y("Plotly renderers"),
      },
      { feature: "Combined column + line", commercial: y(), reactPivottable: n() },
      {
        feature: "Heatmap renderer",
        commercial: p("Via conditional formatting"),
        reactPivottable: y(),
      },
      { feature: "Drillable / expandable axis and legend", commercial: y(), reactPivottable: n() },
      { feature: "Interactive filtering from the chart", commercial: y(), reactPivottable: n() },
      { feature: "Tooltips", commercial: y(), reactPivottable: y("Plotly") },
      { feature: "Split view: grid and chart together", commercial: y(), reactPivottable: n() },
      {
        feature: "Chart title and legend options",
        commercial: y(),
        reactPivottable: p("Plotly config"),
      },
      {
        feature: "Integration with Highcharts / amCharts / FusionCharts / Google Charts",
        commercial: y(),
        reactPivottable: n("Plotly only"),
      },
    ],
  },
  {
    id: "drillthrough",
    name: "Drill-through",
    rows: [
      { feature: "Drill-through view for grid cells", commercial: y(), reactPivottable: n() },
      { feature: "Drill-through from charts", commercial: y(), reactPivottable: n() },
      { feature: "Enable/disable drill-through", commercial: y(), reactPivottable: n() },
      { feature: "Field List inside drill-through", commercial: y(), reactPivottable: n() },
      { feature: "Configure the drill-through slice", commercial: y(), reactPivottable: n() },
      {
        feature: "Select / deselect all drill-through columns",
        commercial: y(),
        reactPivottable: n(),
      },
      { feature: "Sort columns in drill-through", commercial: y(), reactPivottable: n() },
      { feature: "Limit maximum drill-through rows", commercial: y(), reactPivottable: n() },
    ],
  },
  {
    id: "toolbar",
    name: "Toolbar & UI",
    rows: [
      { feature: "Built-in toolbar", commercial: y(), reactPivottable: n() },
      { feature: "Save the report", commercial: y(), reactPivottable: n() },
      { feature: "Open a saved report", commercial: y(), reactPivottable: n() },
      { feature: "Share a report by link", commercial: y(), reactPivottable: n() },
      { feature: "Conditional formatting UI", commercial: y(), reactPivottable: n() },
      { feature: "Number formatting UI", commercial: y(), reactPivottable: n() },
      { feature: "Connect to a data source from the UI", commercial: y(), reactPivottable: n() },
      {
        feature: "Switch between grid and charts",
        commercial: y(),
        reactPivottable: p("Renderer dropdown"),
      },
      { feature: "Fullscreen mode", commercial: y(), reactPivottable: n() },
      { feature: "Show/hide and customise the toolbar", commercial: y(), reactPivottable: n() },
      { feature: "Context menu", commercial: y("Customizable"), reactPivottable: n() },
    ],
  },
  {
    id: "export",
    name: "Export & print",
    rows: [
      { feature: "Export to Excel", commercial: y(), reactPivottable: n() },
      { feature: "Export to PDF", commercial: y(), reactPivottable: n() },
      { feature: "Export to CSV", commercial: y(), reactPivottable: n() },
      {
        feature: "Export to HTML",
        commercial: y(),
        reactPivottable: p("Rendered DOM can be copied"),
      },
      {
        feature: "Export to PNG / image",
        commercial: y(),
        reactPivottable: p("Plotly image download"),
      },
      { feature: "Export to a server endpoint", commercial: y(), reactPivottable: n() },
      { feature: "Export a specific grid form", commercial: y(), reactPivottable: n() },
      { feature: "Export the chart view", commercial: y(), reactPivottable: p("Plotly only") },
      { feature: "Export the drill-through view", commercial: y(), reactPivottable: n() },
      {
        feature: "Printing with the OS print manager",
        commercial: y(),
        reactPivottable: p("Browser print"),
      },
      {
        feature: "Custom headers and footers on export/print",
        commercial: y(),
        reactPivottable: n(),
      },
    ],
  },
  {
    id: "options",
    name: "Options & localisation",
    rows: [
      {
        feature: "Save/restore full report state as JSON",
        commercial: y(),
        reactPivottable: y("Controlled component state"),
      },
      {
        feature: "Multilingual localisation packs",
        commercial: y(),
        reactPivottable: p("Community locales"),
      },
      { feature: "Accessibility support (WCAG-oriented)", commercial: y(), reactPivottable: n() },
      { feature: "Keyboard navigation", commercial: y(), reactPivottable: n() },
      {
        feature: "Read-only mode",
        commercial: y(),
        reactPivottable: p("Non-interactive renderer"),
      },
      {
        feature: "Default sorting type for members",
        commercial: y(),
        reactPivottable: p("Sorter functions"),
      },
      { feature: "Custom member sorting", commercial: y(), reactPivottable: y("sorters prop") },
      { feature: "Date and time display patterns", commercial: y(), reactPivottable: n() },
      {
        feature: "Number formatting per measure",
        commercial: y(),
        reactPivottable: p("valueFilter/format fns"),
      },
      {
        feature: "Conditional formatting rules",
        commercial: y(),
        reactPivottable: p("Heatmap renderers only"),
      },
      { feature: "Global options applied to all reports", commercial: y(), reactPivottable: n() },
      { feature: "Show members with empty values", commercial: y(), reactPivottable: n() },
      { feature: "Expand/collapse nodes from the API", commercial: y(), reactPivottable: n() },
      { feature: "Custom alert pop-up", commercial: y(), reactPivottable: n() },
    ],
  },
  {
    id: "datasources",
    name: "Data sources",
    rows: [
      { feature: "In-browser JSON array", commercial: y(), reactPivottable: y() },
      { feature: "CSV files", commercial: y(), reactPivottable: n("Parse yourself") },
      {
        feature: "CSV separator / decimal / thousands options",
        commercial: y(),
        reactPivottable: n(),
      },
      {
        feature: "SQL databases (MySQL, Postgres, MSSQL, Oracle, MariaDB)",
        commercial: y("vendor data server"),
        reactPivottable: n(),
      },
      { feature: "MongoDB", commercial: y("MongoDB Connector"), reactPivottable: n() },
      { feature: "Elasticsearch", commercial: y(), reactPivottable: n() },
      { feature: "Microsoft Analysis Services via XMLA", commercial: y(), reactPivottable: n() },
      { feature: "SSAS via a vendor accelerator", commercial: y(), reactPivottable: n() },
      { feature: "OLAP multidimensional mode", commercial: y(), reactPivottable: n() },
      { feature: "OLAP tabular mode", commercial: y(), reactPivottable: n() },
      { feature: "Custom data source API for any backend", commercial: y(), reactPivottable: n() },
      {
        feature: "Server-side aggregation of large datasets",
        commercial: y(),
        reactPivottable: n("All in browser"),
      },
      { feature: "1GB+ datasets", commercial: y(), reactPivottable: n() },
      {
        feature: "Field captions, types and hidden fields mapping",
        commercial: y(),
        reactPivottable: p("Pre-shape the data"),
      },
      {
        feature: "Build multilevel hierarchies from flat data",
        commercial: y(),
        reactPivottable: n(),
      },
      {
        feature: "Update data without resetting the report",
        commercial: y(),
        reactPivottable: y("Re-render with new props"),
      },
    ],
  },
  {
    id: "styling",
    name: "Customization & styling",
    rows: [
      {
        feature: "Prebuilt CSS themes",
        commercial: y(),
        reactPivottable: p("Single default stylesheet"),
      },
      { feature: "Theme builder tool", commercial: y(), reactPivottable: n() },
      {
        feature: "Customise individual grid cells",
        commercial: y("customizeCell"),
        reactPivottable: p("Custom renderer"),
      },
      {
        feature: "Customise chart elements",
        commercial: y(),
        reactPivottable: p("Plotly config"),
      },
      { feature: "Customise the toolbar", commercial: y(), reactPivottable: n() },
      { feature: "Customise the context menu", commercial: y(), reactPivottable: n() },
      {
        feature: "Fully custom renderers",
        commercial: p("Via API hooks"),
        reactPivottable: y("Pluggable renderers"),
      },
    ],
  },
  {
    id: "security",
    name: "Security & authentication",
    rows: [
      {
        feature: "withCredentials on data requests",
        commercial: y(),
        reactPivottable: n("You fetch the data"),
      },
      { feature: "Custom request headers", commercial: y(), reactPivottable: n() },
      { feature: "Basic authentication", commercial: y(), reactPivottable: n() },
      { feature: "Windows authentication", commercial: y(), reactPivottable: n() },
      { feature: "Role-based data access", commercial: y(), reactPivottable: n() },
      { feature: "HTTPS configuration for server tools", commercial: y(), reactPivottable: n() },
      { feature: "Custom authorization hooks", commercial: y(), reactPivottable: n() },
      { feature: "No data sent to vendor servers", commercial: y(), reactPivottable: y() },
    ],
  },
  {
    id: "integrations",
    name: "Framework integrations",
    rows: [
      { feature: "React", commercial: y(), reactPivottable: y("React-native API") },
      { feature: "Next.js", commercial: y(), reactPivottable: p("Client-only usage") },
      { feature: "Angular", commercial: y(), reactPivottable: n() },
      { feature: "Vue 3 / Nuxt", commercial: y(), reactPivottable: n() },
      { feature: "Vue 2", commercial: y(), reactPivottable: n() },
      { feature: "Svelte", commercial: y(), reactPivottable: n() },
      { feature: "Blazor", commercial: y(), reactPivottable: n() },
      { feature: "Python / Django / Jupyter", commercial: y(), reactPivottable: n() },
      { feature: "jQuery", commercial: y(), reactPivottable: y("jQuery build available") },
      {
        feature: "TypeScript typings",
        commercial: y("Official"),
        reactPivottable: p("DefinitelyTyped"),
      },
      {
        feature: "Electron / Ionic / React Native / Flutter",
        commercial: y(),
        reactPivottable: p("Web view only"),
      },
      { feature: "Module bundlers / npm package", commercial: y(), reactPivottable: y() },
    ],
  },
  {
    id: "api",
    name: "Developer API & support",
    rows: [
      {
        feature: "Documented public API (~100 methods)",
        commercial: y(),
        reactPivottable: n("Props-driven"),
      },
      {
        feature: "Event system (on/off handlers)",
        commercial: y(),
        reactPivottable: p("onChange callback"),
      },
      { feature: "Async API variants", commercial: y(), reactPivottable: n() },
      {
        feature: "Programmatic query / slice control",
        commercial: y("runQuery"),
        reactPivottable: y("Controlled props"),
      },
      { feature: "CLI tooling", commercial: y(), reactPivottable: n() },
      {
        feature: "Official samples gallery",
        commercial: y("500+ samples"),
        reactPivottable: p("Storybook demos"),
      },
      {
        feature: "Actively maintained releases",
        commercial: y(),
        reactPivottable: p("Low activity"),
      },
      {
        feature: "Vendor technical support",
        commercial: y("Included with licence"),
        reactPivottable: n("Community issues"),
      },
      { feature: "SLA / guaranteed response time", commercial: y(), reactPivottable: n() },
    ],
  },
  {
    id: "licensing",
    name: "Licensing & cost",
    rows: [
      {
        feature: "Free to use in production",
        commercial: n("Paid licence required"),
        reactPivottable: y("MIT"),
      },
      { feature: "Source code available", commercial: n(), reactPivottable: y() },
      {
        feature: "Internal-use commercial licence",
        commercial: y("from ~$799/yr"),
        reactPivottable: y("MIT"),
      },
      {
        feature: "SaaS / multi-tenant embedding licence",
        commercial: y("Paid tier"),
        reactPivottable: y("MIT"),
      },
      {
        feature: "OEM / redistribution licence",
        commercial: y("Paid tier"),
        reactPivottable: y("MIT"),
      },
      { feature: "Unlimited developer seats", commercial: y(), reactPivottable: y() },
      {
        feature: "Free trial before purchase",
        commercial: y("30 days, no signup"),
        reactPivottable: y("N/A — free"),
      },
      {
        feature: "No runtime licence key needed",
        commercial: n("Key validated client-side"),
        reactPivottable: y(),
      },
    ],
  },
];

/**
 * What react-pivottable-enhanced (see /demos) actually ships, feature by feature.
 * Anything not listed falls back to the best of react-pivottable.
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
  "Multiple measures": y("Any number of measures side by side"),
  "Same field with different aggregations": y("Drop a field twice, pick an aggregation each"),
  "String field as a value": y("Count / distinct count / first / last"),
  "Date field as a value": y("Min, max, count on dates"),
  "Time field as a value": y("Earliest / latest clock time"),
  "Field folders / grouping": y("folder on each field"),
  "Hierarchy levels shown in the list": y("Indented L1…Ln levels"),
  "Selecting sublevels of a hierarchy": y("Pick one level or add all"),
  "Search in the Field List": y("Matches fields, folders and hierarchies"),
  "Expand All button": y("Expand all / collapse all groups"),
  "Custom sorting of Field List items": y("Data order, A-Z, Z-A"),

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
  "Stacked column charts": y("Chart type: stacked columns"),
  "Combined column + line": y("Chart type: columns + line"),
  "Drillable / expandable axis and legend": y("Click an axis label or legend entry"),
  "Interactive filtering from the chart": y("Legend hides series; axis click filters the report"),
  "Split view: grid and chart together": y("Chart position: side by side"),
  Tooltips: y(),
  "Chart title and legend options": y(),
  // Drill-through
  "Drill-through view for grid cells": y("Click a cell"),
  "Drill-through from charts": y("Click a bar, point or slice"),
  "Enable/disable drill-through": y("Permission flag"),
  "Field List inside drill-through": y("Columns button with search"),
  "Configure the drill-through slice": y("drillThrough.fields"),
  "Select / deselect all drill-through columns": y(
    "Select all / Deselect all buttons in the Columns list",
  ),
  "Sort columns in drill-through": y("Click a column header"),
  "Limit maximum drill-through rows": y("drillThrough.maxRows, toolbar preset"),
  // Toolbar
  "Built-in toolbar": y(),
  "Save the report": y("Report JSON"),
  "Open a saved report": y("Report JSON"),
  "Switch between grid and charts": y(),
  "Show/hide and customise the toolbar": y("showToolbar prop"),
  "Share a report by link": y("Copies a self-contained URL"),
  "Conditional formatting UI": y("Format dialog: cell rules"),
  "Number formatting UI": y("Format dialog: decimals, currency, prefix"),
  "Fullscreen mode": y("Toolbar toggle, Esc to leave"),
  "Context menu": y("Right-click a value"),
  // Export & print
  "Export to Excel": y(".xls export"),
  "Export to CSV": y(),
  "Export to HTML": y(),
  "Export to PDF": p("Through the print dialog"),
  "Printing with the OS print manager": y("Print view"),
  "Export the drill-through view": y("Export, print and copy in the dialog"),
  "Custom headers and footers on export/print": y("Set in the Format dialog"),

  // Options & localisation
  "Save/restore full report state as JSON": y(),
  "Multilingual localisation packs": y("Bundled locales"),
  "Read-only mode": y("Permission flag"),
  "Number formatting per measure": y("Locale-aware formats"),
  "Conditional formatting rules": y("Rule-based cell colours"),
  // Data sources
  "CSV files": y("Built-in CSV loader"),
  "CSV separator / decimal / thousands options": y(
    "Separator, decimal and thousands marks (read + export)",
  ),
  "Custom data source API for any backend": y("createCustomEngine(): query, aggregate or raw rows"),
  "Server-side aggregation of large datasets": y("createServerAggregationEngine() with paging"),
  "1GB+ datasets": y("Streaming CSV reader + remote dataset registration"),
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

/** Grid features the react-pivottable-enhanced renderer adds on top of react-pivottable. */
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
  "Rename fields and measures (custom captions)": y(
    "Double-click a chip, or right-click \u2192 Rename measure",
  ),
  "Drill up/down multilevel hierarchies": y("Row and column levels, plus drill all"),
  "Grand totals top or bottom (flat table)": y("Toolbar position selector"),
  "Sort multiple columns in flat table": y("Shift-click sort controls"),
  "Enable/disable drag and drop": y("Toolbar switch (config.dragAndDrop)"),
  "Editing cells inline": y("\u201cEdit cells\u201d switch, double-click a value"),
  "Percent of parent column total": y("\u201cShow values as\u201d menu"),
  "Percent of parent row total": y("\u201cShow values as\u201d menu"),
  Index: y("\u201cShow values as\u201d menu"),
  "Difference of column / row": y("\u201cShow values as\u201d menu"),
  "% difference of column / row": y("\u201cShow values as\u201d menu"),
  "Running totals of column / row": y("Down a column or across a row"),
  "Restrict available aggregations per field": y("field.aggregators allow-list"),
  "Grand-total-aware formulas": y(
    "Aggregate-scope formulas with grandTotal(), rowTotal(), columnTotal() and parent totals",
  ),
  "KPIs from the data source": y(
    "field.kpi goal, direction and at-risk band, shown as status arrows in the grid",
  ),
  "Show/hide the aggregation (sigma) icon": y("Toolbar \u201c\u03a3 icon\u201d switch"),
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
