import { ChevronRight, RotateCcw } from "lucide-react";

export interface ChartDrillBarProps {
  /** Members already drilled into on the category axis. */
  categoryPath: string[];
  /** Members already drilled into on the legend. */
  seriesPath: string[];
  categoryField?: string | undefined;
  seriesField?: string | undefined;
  /** Drill the axis back up to `level` members. */
  onCategoryUp: (level: number) => void;
  onSeriesUp: (level: number) => void;
  hint?: string;
}

/** Breadcrumbs showing where the drillable chart axis / legend currently sit. */
export function ChartDrillBar({
  categoryPath,
  seriesPath,
  categoryField,
  seriesField,
  onCategoryUp,
  onSeriesUp,
  hint,
}: ChartDrillBarProps) {
  const crumb = (
    label: string,
    path: string[],
    onUp: (level: number) => void,
    current: string | undefined,
    testid: string,
  ) => (
    <span className="inline-flex items-center gap-1" data-testid={testid}>
      <span className="font-medium">{label}:</span>
      <button
        type="button"
        className="rounded px-1 hover:bg-accent"
        onClick={() => onUp(0)}
        aria-label={`${label} back to top level`}
      >
        All
      </button>
      {path.map((member, i) => (
        <span key={`${member}-${i}`} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <button type="button" className="rounded px-1 hover:bg-accent" onClick={() => onUp(i + 1)}>
            {member}
          </button>
        </span>
      ))}
      {current && <span className="text-muted-foreground/80">({current})</span>}
    </span>
  );

  return (
    <div
      data-testid="chart-drill-bar"
      className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
    >
      {crumb("Axis", categoryPath, onCategoryUp, categoryField, "chart-axis-crumbs")}
      {crumb("Legend", seriesPath, onSeriesUp, seriesField, "chart-legend-crumbs")}
      {(categoryPath.length > 0 || seriesPath.length > 0) && (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 hover:bg-accent"
          onClick={() => {
            onCategoryUp(0);
            onSeriesUp(0);
          }}
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset drill
        </button>
      )}
      {hint && <span className="text-muted-foreground/80">{hint}</span>}
    </div>
  );
}
