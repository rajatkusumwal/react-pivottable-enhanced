export type Support = "yes" | "partial" | "no";

export type Cell = {
  s: Support;
  note?: string;
};

export type FeatureRow = {
  feature: string;
  advanced: Cell;
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
  key: "advanced" | "reactPivottable" | "studio";
  name: string;
  subtitle: string;
  url?: string;
}[] = [
  {
    key: "advanced",
    name: "Advanced pivot table features",
    subtitle: "advanced • paid licence",
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
  advanced:
    "Does everything on this list. You get exports, charts, big-data handling and paid support — but you pay a licence fee.",
  reactPivottable:
    "Free and quick to drop into a React app. Good for simple internal dashboards, but there is no Excel/PDF export, no toolbar and no help desk if you get stuck.",
  studio:
    "react-pivottable-enhanced: an advanced-style React grid with no third-party pivot dependency — drag-and-drop field list, subtotals, expand/collapse, compact/classic/flat layouts, charts, exports, filters, calculated values and language packs. The maths can also be handed to your own backend service.",
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
        advanced: y("1M+ grouped rows"),
        reactPivottable: n("Renders full DOM table"),
      },
      {
        feature: "Compact pivot table form",
        advanced: y(),
        reactPivottable: n(),
      },
      {
        feature: "Classic (tabular) pivot form",
        advanced: y(),
        reactPivottable: y("Default renderer"),
      },
      {
        feature: "Flat table form",
        advanced: y(),
        reactPivottable: p("Table renderer only"),
      },
      { feature: "Grand totals and subtotals", advanced: y(), reactPivottable: y() },
      {
        feature: "Show/hide subtotals",
        advanced: y(),
        reactPivottable: n(),
      },
      {
        feature: "Show/hide grand totals per rows/columns",
        advanced: y(),
        reactPivottable: n(),
      },
      {
        feature: "Grand totals top or bottom (flat table)",
        advanced: y(),
        reactPivottable: n(),
      },
      { feature: "Sort field members", advanced: y(), reactPivottable: y() },
      {
        feature: "Sort values on the pivot table",
        advanced: y(),
        reactPivottable: p("Row/col order only"),
      },
      {
        feature: "Sort multiple columns in flat table",
        advanced: y(),
        reactPivottable: n(),
      },
      { feature: "Show/hide sorting controls", advanced: y(), reactPivottable: n() },
      {
        feature: "Repeat member labels in classic form",
        advanced: y(),
        reactPivottable: n(),
      },
      { feature: "Expand and collapse values", advanced: y(), reactPivottable: n() },
      {
        feature: "Drill up/down multilevel hierarchies",
        advanced: y(),
        reactPivottable: n(),
      },
      {
        feature: "Drag fields between rows, columns and filters",
        advanced: y(),
        reactPivottable: y(),
      },
      {
        feature: "Enable/disable drag and drop",
        advanced: y(),
        reactPivottable: p("Use non-interactive renderer"),
      },
      { feature: "Resize columns and rows", advanced: y(), reactPivottable: n() },
      { feature: "Select cells", advanced: y(), reactPivottable: n() },
      { feature: "Copy selected cells", advanced: y(), reactPivottable: n() },
      { feature: "Keyboard navigation shortcuts", advanced: y(), reactPivottable: n() },
      { feature: "Highlight rows and columns", advanced: y(), reactPivottable: n() },
      { feature: "Auto-calculation bar for selection", advanced: y(), reactPivottable: n() },
      { feature: "Editing cells inline", advanced: y(), reactPivottable: n() },
      { feature: "Grid title", advanced: y(), reactPivottable: n() },
      { feature: "Show/hide spreadsheet headers", advanced: y(), reactPivottable: n() },
      { feature: "Show/hide field captions", advanced: y(), reactPivottable: n() },
      {
        feature: "Rename fields and measures (custom captions)",
        advanced: y(),
        reactPivottable: n(),
      },
    ],
  },
  {
    id: "filters",
    name: "Filters",
    rows: [
      { feature: "Value filters (top/bottom N)", advanced: y(), reactPivottable: n() },
      { feature: "Conditional filter for number fields", advanced: y(), reactPivottable: n() },
      { feature: "Conditional filter for string fields", advanced: y(), reactPivottable: n() },
      { feature: "Conditional filter for date fields", advanced: y(), reactPivottable: n() },
      { feature: "Conditional filter for time fields", advanced: y(), reactPivottable: n() },
      { feature: "Selection (member checkbox) filter", advanced: y(), reactPivottable: y() },
      { feature: "Search box inside the filter", advanced: y(), reactPivottable: n() },
      { feature: "Report filter (page) area", advanced: y(), reactPivottable: n() },
      { feature: "Show/hide report filter area", advanced: y(), reactPivottable: n() },
      { feature: "Show/hide filter controls on the grid", advanced: y(), reactPivottable: n() },
      { feature: "Filter controls on charts", advanced: y(), reactPivottable: n() },
      { feature: "Server-side filtering (subqueries)", advanced: y(), reactPivottable: n() },
    ],
  },
  {
    id: "fieldlist",
    name: "Field List",
    rows: [
      {
        feature: "Dedicated Field List panel",
        advanced: y(),
        reactPivottable: p("Inline field pills, no panel"),
      },
      { feature: "Multiple fields in columns", advanced: y(), reactPivottable: y() },
      { feature: "Multiple fields in rows", advanced: y(), reactPivottable: y() },
      {
        feature: "Multiple measures",
        advanced: y(),
        reactPivottable: n("One aggregator at a time"),
      },
      { feature: "Same field with different aggregations", advanced: y(), reactPivottable: n() },
      {
        feature: "String field as a value",
        advanced: y(),
        reactPivottable: p("Via count aggregators"),
      },
      { feature: "Date field as a value", advanced: y(), reactPivottable: n() },
      { feature: "Time field as a value", advanced: y(), reactPivottable: n() },
      { feature: "Drag fields inside the list", advanced: y(), reactPivottable: y() },
      { feature: "Field folders / grouping", advanced: y(), reactPivottable: n() },
      { feature: "Hierarchy levels shown in the list", advanced: y(), reactPivottable: n() },
      { feature: "Selecting sublevels of a hierarchy", advanced: y(), reactPivottable: n() },
      { feature: "Search in the Field List", advanced: y(), reactPivottable: n() },
      { feature: "Expand All button", advanced: y(), reactPivottable: n() },
      { feature: "UI for adding calculated values", advanced: y(), reactPivottable: n() },
      { feature: "Open/close the Field List from the API", advanced: y(), reactPivottable: n() },
      { feature: "Custom sorting of Field List items", advanced: y(), reactPivottable: n() },
    ],
  },
  {
    id: "aggregations",
    name: "Aggregation functions",
    rows: [
      { feature: "Sum", advanced: y(), reactPivottable: y() },
      { feature: "Count", advanced: y(), reactPivottable: y() },
      { feature: "Distinct count", advanced: y(), reactPivottable: y() },
      { feature: "Average", advanced: y(), reactPivottable: y() },
      { feature: "Median", advanced: y(), reactPivottable: y() },
      { feature: "Product", advanced: y(), reactPivottable: n() },
      { feature: "Min", advanced: y(), reactPivottable: y() },
      { feature: "Max", advanced: y(), reactPivottable: y() },
      {
        feature: "Population standard deviation",
        advanced: y(),
        reactPivottable: p("Var/stdev variants"),
      },
      { feature: "Sample standard deviation", advanced: y(), reactPivottable: y() },
      { feature: "Percent of total", advanced: y(), reactPivottable: y() },
      { feature: "Percent of column", advanced: y(), reactPivottable: y() },
      { feature: "Percent of row", advanced: y(), reactPivottable: y() },
      { feature: "Percent of parent column total", advanced: y(), reactPivottable: n() },
      { feature: "Percent of parent row total", advanced: y(), reactPivottable: n() },
      { feature: "Index", advanced: y(), reactPivottable: n() },
      { feature: "Difference of column / row", advanced: y(), reactPivottable: n() },
      { feature: "% difference of column / row", advanced: y(), reactPivottable: n() },
      { feature: "Running totals of column / row", advanced: y(), reactPivottable: n() },
      {
        feature: "Custom aggregation functions",
        advanced: y(),
        reactPivottable: y("Custom aggregators"),
      },
      {
        feature: "Restrict available aggregations per field",
        advanced: y(),
        reactPivottable: n(),
      },
      { feature: "Show/hide the aggregation (sigma) icon", advanced: y(), reactPivottable: n() },
    ],
  },
  {
    id: "calculated",
    name: "Calculated values",
    rows: [
      {
        feature: "Calculated measures via API",
        advanced: y(),
        reactPivottable: p("Custom aggregator code"),
      },
      { feature: "Formula editor in the UI", advanced: y(), reactPivottable: n() },
      { feature: "Formulas across multiple measures", advanced: y(), reactPivottable: n() },
      { feature: "Grand-total-aware formulas", advanced: y(), reactPivottable: n() },
      { feature: "KPIs from the data source", advanced: y("OLAP KPIs"), reactPivottable: n() },
    ],
  },
  {
    id: "charts",
    name: "Pivot charts",
    rows: [
      {
        feature: "Built-in charts (no extra library)",
        advanced: y(),
        reactPivottable: n("Requires Plotly add-on"),
      },
      { feature: "Column / bar charts", advanced: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Line charts", advanced: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Scatter charts", advanced: y(), reactPivottable: y("Plotly renderers") },
      { feature: "Pie charts", advanced: y(), reactPivottable: y("Plotly renderers") },
      {
        feature: "Stacked column charts",
        advanced: y(),
        reactPivottable: y("Plotly renderers"),
      },
      { feature: "Combined column + line", advanced: y(), reactPivottable: n() },
      {
        feature: "Heatmap renderer",
        advanced: p("Via conditional formatting"),
        reactPivottable: y(),
      },
      { feature: "Drillable / expandable axis and legend", advanced: y(), reactPivottable: n() },
      { feature: "Interactive filtering from the chart", advanced: y(), reactPivottable: n() },
      { feature: "Tooltips", advanced: y(), reactPivottable: y("Plotly") },
      { feature: "Split view: grid and chart together", advanced: y(), reactPivottable: n() },
      {
        feature: "Chart title and legend options",
        advanced: y(),
        reactPivottable: p("Plotly config"),
      },
      {
        feature: "Integration with Highcharts / amCharts / FusionCharts / Google Charts",
        advanced: y(),
        reactPivottable: n("Plotly only"),
      },
    ],
  },
  {
    id: "drillthrough",
    name: "Drill-through",
    rows: [
      { feature: "Drill-through view for grid cells", advanced: y(), reactPivottable: n() },
      { feature: "Drill-through from charts", advanced: y(), reactPivottable: n() },
      { feature: "Enable/disable drill-through", advanced: y(), reactPivottable: n() },
      { feature: "Field List inside drill-through", advanced: y(), reactPivottable: n() },
      { feature: "Configure the drill-through slice", advanced: y(), reactPivottable: n() },
      {
        feature: "Select / deselect all drill-through columns",
        advanced: y(),
        reactPivottable: n(),
      },
      { feature: "Sort columns in drill-through", advanced: y(), reactPivottable: n() },
      { feature: "Limit maximum drill-through rows", advanced: y(), reactPivottable: n() },
    ],
  },
  {
    id: "toolbar",
    name: "Toolbar & UI",
    rows: [
      { feature: "Built-in toolbar", advanced: y(), reactPivottable: n() },
      { feature: "Save the report", advanced: y(), reactPivottable: n() },
      { feature: "Open a saved report", advanced: y(), reactPivottable: n() },
      { feature: "Share a report by link", advanced: y(), reactPivottable: n() },
      { feature: "Conditional formatting UI", advanced: y(), reactPivottable: n() },
      { feature: "Number formatting UI", advanced: y(), reactPivottable: n() },
      { feature: "Connect to a data source from the UI", advanced: y(), reactPivottable: n() },
      {
        feature: "Switch between grid and charts",
        advanced: y(),
        reactPivottable: p("Renderer dropdown"),
      },
      { feature: "Fullscreen mode", advanced: y(), reactPivottable: n() },
      { feature: "Show/hide and customise the toolbar", advanced: y(), reactPivottable: n() },
      { feature: "Context menu", advanced: y("Customizable"), reactPivottable: n() },
    ],
  },
  {
    id: "export",
    name: "Export & print",
    rows: [
      { feature: "Export to Excel", advanced: y(), reactPivottable: n() },
      { feature: "Export to PDF", advanced: y(), reactPivottable: n() },
      { feature: "Export to CSV", advanced: y(), reactPivottable: n() },
      {
        feature: "Export to HTML",
        advanced: y(),
        reactPivottable: p("Rendered DOM can be copied"),
      },
      {
        feature: "Export to PNG / image",
        advanced: y(),
        reactPivottable: p("Plotly image download"),
      },
      { feature: "Export to a server endpoint", advanced: y(), reactPivottable: n() },
      { feature: "Export a specific grid form", advanced: y(), reactPivottable: n() },
      { feature: "Export the chart view", advanced: y(), reactPivottable: p("Plotly only") },
      { feature: "Export the drill-through view", advanced: y(), reactPivottable: n() },
      {
        feature: "Printing with the OS print manager",
        advanced: y(),
        reactPivottable: p("Browser print"),
      },
      {
        feature: "Custom headers and footers on export/print",
        advanced: y(),
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
        advanced: y(),
        reactPivottable: y("Controlled component state"),
      },
      {
        feature: "Multilingual localisation packs",
        advanced: y(),
        reactPivottable: p("Community locales"),
      },
      { feature: "Accessibility support (WCAG-oriented)", advanced: y(), reactPivottable: n() },
      { feature: "Keyboard navigation", advanced: y(), reactPivottable: n() },
      {
        feature: "Read-only mode",
        advanced: y(),
        reactPivottable: p("Non-interactive renderer"),
      },
      {
        feature: "Default sorting type for members",
        advanced: y(),
        reactPivottable: p("Sorter functions"),
      },
      { feature: "Custom member sorting", advanced: y(), reactPivottable: y("sorters prop") },
      { feature: "Date and time display patterns", advanced: y(), reactPivottable: n() },
      {
        feature: "Number formatting per measure",
        advanced: y(),
        reactPivottable: p("valueFilter/format fns"),
      },
      {
        feature: "Conditional formatting rules",
        advanced: y(),
        reactPivottable: p("Heatmap renderers only"),
      },
      { feature: "Global options applied to all reports", advanced: y(), reactPivottable: n() },
      { feature: "Show members with empty values", advanced: y(), reactPivottable: n() },
      { feature: "Expand/collapse nodes from the API", advanced: y(), reactPivottable: n() },
      { feature: "Custom alert pop-up", advanced: y(), reactPivottable: n() },
    ],
  },
  {
    id: "datasources",
    name: "Data sources",
    rows: [
      { feature: "In-browser JSON array", advanced: y(), reactPivottable: y() },
      { feature: "CSV files", advanced: y(), reactPivottable: n("Parse yourself") },
      {
        feature: "CSV separator / decimal / thousands options",
        advanced: y(),
        reactPivottable: n(),
      },
      {
        feature: "SQL databases (MySQL, Postgres, MSSQL, Oracle, MariaDB)",
        advanced: y("vendor data server"),
        reactPivottable: n(),
      },
      { feature: "MongoDB", advanced: y("MongoDB Connector"), reactPivottable: n() },
      { feature: "Elasticsearch", advanced: y(), reactPivottable: n() },
      { feature: "Microsoft Analysis Services via XMLA", advanced: y(), reactPivottable: n() },
      { feature: "SSAS via a vendor accelerator", advanced: y(), reactPivottable: n() },
      { feature: "OLAP multidimensional mode", advanced: y(), reactPivottable: n() },
      { feature: "OLAP tabular mode", advanced: y(), reactPivottable: n() },
      { feature: "Custom data source API for any backend", advanced: y(), reactPivottable: n() },
      {
        feature: "Server-side aggregation of large datasets",
        advanced: y(),
        reactPivottable: n("All in browser"),
      },
      { feature: "1GB+ datasets", advanced: y(), reactPivottable: n() },
      {
        feature: "Field captions, types and hidden fields mapping",
        advanced: y(),
        reactPivottable: p("Pre-shape the data"),
      },
      {
        feature: "Build multilevel hierarchies from flat data",
        advanced: y(),
        reactPivottable: n(),
      },
      {
        feature: "Update data without resetting the report",
        advanced: y(),
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
        advanced: y(),
        reactPivottable: p("Single default stylesheet"),
      },
      { feature: "Theme builder tool", advanced: y(), reactPivottable: n() },
      {
        feature: "Customise individual grid cells",
        advanced: y("customizeCell"),
        reactPivottable: p("Custom renderer"),
      },
      {
        feature: "Customise chart elements",
        advanced: y(),
        reactPivottable: p("Plotly config"),
      },
      { feature: "Customise the toolbar", advanced: y(), reactPivottable: n() },
      { feature: "Customise the context menu", advanced: y(), reactPivottable: n() },
      {
        feature: "Fully custom renderers",
        advanced: p("Via API hooks"),
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
        advanced: y(),
        reactPivottable: n("You fetch the data"),
      },
      { feature: "Custom request headers", advanced: y(), reactPivottable: n() },
      { feature: "Basic authentication", advanced: y(), reactPivottable: n() },
      { feature: "Windows authentication", advanced: y(), reactPivottable: n() },
      { feature: "Role-based data access", advanced: y(), reactPivottable: n() },
      { feature: "HTTPS configuration for server tools", advanced: y(), reactPivottable: n() },
      { feature: "Custom authorization hooks", advanced: y(), reactPivottable: n() },
      { feature: "No data sent to vendor servers", advanced: y(), reactPivottable: y() },
    ],
  },
  {
    id: "integrations",
    name: "Framework integrations",
    rows: [
      { feature: "React", advanced: y(), reactPivottable: y("React-native API") },
      { feature: "Next.js", advanced: y(), reactPivottable: p("Client-only usage") },
      { feature: "Angular", advanced: y(), reactPivottable: n() },
      { feature: "Vue 3 / Nuxt", advanced: y(), reactPivottable: n() },
      { feature: "Vue 2", advanced: y(), reactPivottable: n() },
      { feature: "Svelte", advanced: y(), reactPivottable: n() },
      { feature: "Blazor", advanced: y(), reactPivottable: n() },
      { feature: "Python / Django / Jupyter", advanced: y(), reactPivottable: n() },
      { feature: "jQuery", advanced: y(), reactPivottable: y("jQuery build available") },
      {
        feature: "TypeScript typings",
        advanced: y("Official"),
        reactPivottable: p("DefinitelyTyped"),
      },
      {
        feature: "Electron / Ionic / React Native / Flutter",
        advanced: y(),
        reactPivottable: p("Web view only"),
      },
      { feature: "Module bundlers / npm package", advanced: y(), reactPivottable: y() },
    ],
  },
  {
    id: "api",
    name: "Developer API & support",
    rows: [
      {
        feature: "Documented public API (~100 methods)",
        advanced: y(),
        reactPivottable: n("Props-driven"),
      },
      {
        feature: "Event system (on/off handlers)",
        advanced: y(),
        reactPivottable: p("onChange callback"),
      },
      { feature: "Async API variants", advanced: y(), reactPivottable: n() },
      {
        feature: "Programmatic query / slice control",
        advanced: y("runQuery"),
        reactPivottable: y("Controlled props"),
      },
      { feature: "CLI tooling", advanced: y(), reactPivottable: n() },
      {
        feature: "Official samples gallery",
        advanced: y("500+ samples"),
        reactPivottable: p("Storybook demos"),
      },
      {
        feature: "Actively maintained releases",
        advanced: y(),
        reactPivottable: p("Low activity"),
      },
      {
        feature: "Vendor technical support",
        advanced: y("Included with licence"),
        reactPivottable: n("Community issues"),
      },
      { feature: "SLA / guaranteed response time", advanced: y(), reactPivottable: n() },
    ],
  },
  {
    id: "licensing",
    name: "Licensing & cost",
    rows: [
      {
        feature: "Free to use in production",
        advanced: n("Paid licence required"),
        reactPivottable: y("MIT"),
      },
      { feature: "Source code available", advanced: n(), reactPivottable: y() },
      {
        feature: "Internal-use advanced licence",
        advanced: y("Paid tier"),
        reactPivottable: y("MIT"),
      },
      {
        feature: "SaaS / multi-tenant embedding licence",
        advanced: y("Paid tier"),
        reactPivottable: y("MIT"),
      },
      {
        feature: "OEM / redistribution licence",
        advanced: y("Paid tier"),
        reactPivottable: y("MIT"),
      },
      { feature: "Unlimited developer seats", advanced: y(), reactPivottable: y() },
      {
        feature: "Free trial before purchase",
        advanced: y("30 days, no signup"),
        reactPivottable: y("N/A — free"),
      },
      {
        feature: "No runtime licence key needed",
        advanced: n("Key validated client-side"),
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
