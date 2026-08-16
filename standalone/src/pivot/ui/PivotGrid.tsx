/**
 * Pure display grid.
 *
 * It knows nothing about where the numbers came from: give it a `PivotResult`
 * and it renders a Flexmonster-style grid with compact / classic / flat
 * layouts, subtotals, expand & collapse, sorting, column resizing, cell
 * selection with clipboard copy, keyboard navigation and row windowing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { KPI_ICONS, KPI_LABELS } from "../kpi";
import { formatNumber } from "../format";
import { keyOf } from "../result";
import type { HeaderNode, PivotCellValue, PivotLayout, PivotResult, PivotSort } from "../result";
import type { ConditionalFormatRule, PivotTheme } from "../types";
import { matchesCondition } from "../filters";
import { OVERSCAN, ROW_HEIGHT, WINDOW_THRESHOLD } from "../constants";



export interface SelectionStats {
  count: number;
  sum: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface PivotGridProps {
  result: PivotResult;
  layout: PivotLayout;
  locale: string;
  theme: PivotTheme;
  title?: string;
  showFieldCaptions?: boolean;
  showSpreadsheetHeaders?: boolean;
  repeatMemberLabels?: boolean;
  showSortingControls?: boolean;
  showRowTotals?: boolean;
  sort?: PivotSort | undefined;
  /** Active multi-column sort (flat layout). */
  sorts?: PivotSort[] | undefined;
  /** Enables shift-click to add a column to the sort. */
  multiSort?: boolean;
  onSortChange?: (sort: PivotSort | undefined) => void;
  onSortsChange?: (sorts: PivotSort[]) => void;
  onToggleCollapse?: (key: string[]) => void;
  /** Drill down / up on a column member hierarchy. */
  onToggleColumnCollapse?: (key: string[]) => void;
  conditionalFormats?: ConditionalFormatRule[];
  allowDrillThrough?: boolean;
  /** Enables inline cell editing (double-click a value to type a new one). */
  editable?: boolean;
  /** Called with the edited cell's coordinates, the typed number and the measure index. */
  onCellEdit?: (rowKey: string[], colKey: string[], value: number, measureIndex: number) => void;

  onDrill?: (rowKey: string[], colKey: string[], label: string) => void;
  /** Right-click on a value cell; the host renders the context menu. */
  onCellContextMenu?: (
    payload: { x: number; y: number; rowKey: string[]; colKey: string[]; label: string; value: PivotCellValue },
  ) => void;

  onSelectionChange?: (stats: SelectionStats | null) => void;
  emptyLabel?: string;
}

interface CellPos {
  row: number;
  col: number;
}

const columnLetter = (index: number) => {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};

function inRange(pos: CellPos, a: CellPos, b: CellPos) {
  return (
    pos.row >= Math.min(a.row, b.row) &&
    pos.row <= Math.max(a.row, b.row) &&
    pos.col >= Math.min(a.col, b.col) &&
    pos.col <= Math.max(a.col, b.col)
  );
}

export function PivotGrid({
  result,
  layout,
  locale,
  theme,
  title,
  showFieldCaptions = true,
  showSpreadsheetHeaders = false,
  repeatMemberLabels = false,
  showSortingControls = true,
  showRowTotals = true,
  sort,
  sorts,
  multiSort = false,
  onSortChange,
  onSortsChange,
  onToggleCollapse,
  onToggleColumnCollapse,
  conditionalFormats = [],
  allowDrillThrough = true,
  editable = false,
  onCellEdit,
  onDrill,
  onCellContextMenu,

  onSelectionChange,
  emptyLabel = "No data to show",
}: PivotGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<Record<number, number>>({});
  const [anchor, setAnchor] = useState<CellPos | null>(null);
  const [focus, setFocus] = useState<CellPos | null>(null);
  const [hover, setHover] = useState<CellPos | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState<CellPos | null>(null);
  const [draft, setDraft] = useState("");
  const [viewport, setViewport] = useState(600);

  const rowHeaders = result.rowHeaders;
  const colLeaves = result.colLeaves;
  const measures = result.measures?.length ? result.measures : [result.measure];
  const measureCount = measures.length;
  /** Measure behind a leaf column (leaves repeat once per measure). */
  const measureIndexAt = useCallback(
    (col: number) => result.measureIndexByLeaf?.[col] ?? col % measureCount,
    [result.measureIndexByLeaf, measureCount],
  );
  const totalColumns = colLeaves.length + (showRowTotals ? measureCount : 0);
  const windowed = rowHeaders.length > WINDOW_THRESHOLD;

  /**
   * A backend (or an in-flight result produced before drill-up) may retain a
   * rowSpan based on the configured hierarchy depth. Clamp it to the header
   * rows that are actually present so the browser's table-placement algorithm
   * cannot push sort/total cells into phantom columns on the right.
   */
  const visibleColumnRowSpan = useCallback(
    (node: HeaderNode) =>
      Math.max(1, Math.min(node.rowSpan ?? 1, result.colHeaderRows.length - node.depth)),
    [result.colHeaderRows.length],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewport(el.clientHeight || 600);
  }, [rowHeaders.length]);

  const start = windowed ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const end = windowed
    ? Math.min(rowHeaders.length, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN)
    : rowHeaders.length;

  const totalAt = useCallback(
    (row: number, measureIndex: number): PivotCellValue =>
      result.rowTotalsByMeasure?.[row]?.[measureIndex] ?? result.rowTotals[row] ?? null,
    [result],
  );

  const valueAt = useCallback(
    (row: number, col: number): PivotCellValue =>
      col < colLeaves.length
        ? (result.cells[row]?.[col] ?? null)
        : totalAt(row, col - colLeaves.length),
    [result, colLeaves.length, totalAt],
  );

  const selection = useMemo(() => {
    if (!anchor || !focus) return null;
    const values: number[] = [];
    for (let r = Math.min(anchor.row, focus.row); r <= Math.max(anchor.row, focus.row); r++) {
      for (let c = Math.min(anchor.col, focus.col); c <= Math.max(anchor.col, focus.col); c++) {
        const v = valueAt(r, c);
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
    }
    if (!values.length) return { count: 0, sum: 0, average: null, min: null, max: null };
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      sum,
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    } satisfies SelectionStats;
  }, [anchor, focus, valueAt]);


  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  const copySelection = useCallback(async () => {
    if (!anchor || !focus) return;
    const lines: string[] = [];
    for (let r = Math.min(anchor.row, focus.row); r <= Math.max(anchor.row, focus.row); r++) {
      const cells: string[] = [];
      for (let c = Math.min(anchor.col, focus.col); c <= Math.max(anchor.col, focus.col); c++) {
        const v = valueAt(r, c);
        cells.push(
          typeof v === "string"
            ? v
            : formatNumber(v, measures[measureIndexAt(c)]?.format ?? result.measure.format, locale),
        );
      }
      lines.push(cells.join("\t"));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      /* clipboard unavailable (e.g. tests) */
    }
  }, [anchor, focus, valueAt, measures, measureIndexAt, result.measure.format, locale]);


  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      void copySelection();
      return;
    }
    if (!focus) return;
    const move = (dr: number, dc: number) => {
      event.preventDefault();
      const next = {
        row: Math.min(Math.max(focus.row + dr, 0), rowHeaders.length - 1),
        col: Math.min(Math.max(focus.col + dc, 0), totalColumns - 1),
      };
      setFocus(next);
      if (!event.shiftKey) setAnchor(next);
    };
    switch (event.key) {
      case "ArrowDown":
        return move(1, 0);
      case "ArrowUp":
        return move(-1, 0);
      case "ArrowRight":
        return move(0, 1);
      case "ArrowLeft":
        return move(0, -1);
      case "Home":
        return move(0, -totalColumns);
      case "End":
        return move(0, totalColumns);
      default:
        return;
    }
  };

  const startResize = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widths[index] ?? 110;
    const onMove = (e: MouseEvent) =>
      setWidths((w) => ({ ...w, [index]: Math.max(48, startWidth + e.clientX - startX) }));
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const activeSorts: PivotSort[] = sorts?.length ? sorts : sort ? [sort] : [];
  const sortIndexOf = (by: PivotSort["by"]) => activeSorts.findIndex((s) => s.by === by);
  const sortFor = (by: PivotSort["by"]) => activeSorts.find((s) => s.by === by);

  const toggleSort = (by: PivotSort["by"], additive = false) => {
    // Shift-click in the flat layout appends the column to the sort order.
    if (additive && multiSort && onSortsChange) {
      const index = sortIndexOf(by);
      if (index === -1) {
        onSortsChange([...activeSorts, { by, direction: "asc" }]);
        return;
      }
      const current = activeSorts[index]!;
      const next = [...activeSorts];
      if (current.direction === "asc") next[index] = { by, direction: "desc" };
      else next.splice(index, 1);
      onSortsChange(next);
      return;
    }
    if (!onSortChange) return;
    const current = sortFor(by);
    if (current && activeSorts.length === 1) {
      onSortChange(current.direction === "asc" ? { by, direction: "desc" } : undefined);
    } else onSortChange({ by, direction: "asc" });
  };

  const sortGlyph = (by: PivotSort["by"]) => {
    const index = sortIndexOf(by);
    if (index === -1) return "↕";
    const arrow = activeSorts[index]!.direction === "asc" ? "▲" : "▼";
    return activeSorts.length > 1 ? `${arrow}${index + 1}` : arrow;
  };

  const canEdit = editable && Boolean(onCellEdit);
  const isEditing = (row: number, col: number) => editing?.row === row && editing?.col === col;

  const commitEdit = (rowKey: string[], colKey: string[], measureIndex: number) => {
    const parsed = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(parsed))
      onCellEdit?.(rowKey, colKey, parsed, measureIndex);
    setEditing(null);
  };

  const formatCell = (value: PivotCellValue, measureIndex = 0) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    return formatNumber(value, measures[measureIndex]?.format ?? result.measure.format, locale);
  };

  /** KPI status behind a cell, when the measure is a KPI. */
  const kpiAt = (rowIndex: number, colIndex: number) =>
    result.kpiStatuses?.[rowIndex]?.[colIndex] ?? null;

  const cellStyle = (value: PivotCellValue, measureIndex = 0): React.CSSProperties => {
    if (typeof value !== "number") return {};
    const field = measures[measureIndex]?.field ?? result.measure.field;
    for (const rule of conditionalFormats) {
      if (rule.field && rule.field !== field) continue;
      if (matchesCondition(value, rule.operator, rule.value)) {
        return { color: rule.color, background: rule.background };
      }
    }
    return {};
  };


  // Row header columns: compact collapses everything into one column.
  const headerCols =
    layout === "compact" ? 1 : layout === "flat" ? Math.max(result.rowFields.length, 1) : result.rowFields.length || 1;

  const rowLabelCells = (header: HeaderNode, index: number) => {
    if (layout === "compact") {
      return (
        <th
          scope="row"
          className="pivot-row-header sticky left-0 z-10"
          style={{ paddingLeft: 8 + header.depth * 14 }}
          data-kind={header.kind}
        >
          {header.expandable && onToggleCollapse ? (
            <button
              type="button"
              className="mr-1 inline-flex align-middle text-muted-foreground hover:text-foreground"
              aria-label={`${header.expanded ? "Collapse" : "Expand"} ${header.label}`}
              onClick={() => onToggleCollapse(header.key)}
            >
              {header.expanded ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          ) : null}
          {header.label}
        </th>
      );
    }
    const parts =
      layout === "flat"
        ? header.kind === "grand"
          ? ["Grand total"]
          : header.key
        : header.key;
    const previous = index > 0 ? rowHeaders[index - 1] : undefined;
    return Array.from({ length: headerCols }).map((_, level) => {
      const raw = parts[level] ?? "";
      const repeated =
        !repeatMemberLabels &&
        layout !== "flat" &&
        previous &&
        previous.kind === "member" &&
        header.kind === "member" &&
        previous.key[level] === raw &&
        level < parts.length - 1;
      const text =
        header.kind !== "member" && level === Math.max(parts.length - 1, 0) ? header.label : raw;
      return (
        <th
          key={level}
          scope="row"
          className="pivot-row-header"
          data-kind={header.kind}
          style={level === 0 ? { position: "sticky", left: 0, zIndex: 10 } : undefined}
        >
          {repeated ? "" : text}
        </th>
      );
    });
  };

  if (!rowHeaders.length && !colLeaves.length) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const visible = rowHeaders.slice(start, end);
  const padTop = start * ROW_HEIGHT;
  const padBottom = (rowHeaders.length - end) * ROW_HEIGHT;

  return (
    <div
      ref={scrollRef}
      data-testid="pivot-grid"
      className="pivot-fm pivot-engine-surface max-h-[65vh] overflow-auto outline-none"
      tabIndex={0}
      role="grid"
      aria-label={title ?? "Pivot table"}
      onKeyDown={onKeyDown}
      onScroll={(e) => windowed && setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={
        {
          "--pivot-accent": theme.accent,
          "--pivot-cell-padding": theme.density === "compact" ? "0.15rem 0.35rem" : "0.3rem 0.55rem",
          fontSize: theme.fontSize,
        } as React.CSSProperties
      }
    >
      <table className="pivot-table w-full border-collapse">
        {title ? <caption className="pivot-caption">{title}</caption> : null}
        <thead>
          {showSpreadsheetHeaders && (
            <tr className="pivot-sheet-headers">
              <th aria-hidden="true" />
              {Array.from({ length: totalColumns }).map((_, i) => (
                <th key={i} scope="col">
                  {columnLetter(i + 1)}
                </th>
              ))}
            </tr>
          )}
          {showFieldCaptions && (result.rowFields.length > 0 || result.colFields.length > 0) && (
            <tr className="pivot-caption-row">
              <th colSpan={headerCols} scope="col" className="text-left">
                {result.colHeaderRows.length ? " " : result.rowFields.join(" / ") || " "}
              </th>

              <th colSpan={totalColumns} scope="col" className="text-left">
                {result.colFields.length
                  ? `${result.colFields.join(" / ")} — ${result.measure.caption}`
                  : result.measure.caption}
              </th>
            </tr>
          )}
          {result.colHeaderRows.length ? (
            result.colHeaderRows.map((level, levelIndex) => (
              <tr key={levelIndex}>
                {levelIndex === 0 && (
                  <th
                    colSpan={headerCols}
                    rowSpan={result.colHeaderRows.length}
                    scope="col"
                    className="pivot-corner sticky left-0 z-20 text-left"
                  >
                    {showSortingControls && onSortChange ? (
                      <button
                        type="button"
                        onClick={(e) => toggleSort("rows", e.shiftKey)}
                        className="font-medium"
                      >
                        {result.rowFields.join(" / ") || result.measure.caption}
                        {sortIndexOf("rows") === -1 ? "" : ` ${sortGlyph("rows")}`}
                      </button>
                    ) : (
                      (result.rowFields.join(" / ") || result.measure.caption)
                    )}
                  </th>
                )}
                {level.map((node, i) => (
                  <th
                    key={`${node.key.join("/")}-${i}`}
                    colSpan={node.span}
                    rowSpan={visibleColumnRowSpan(node)}
                    scope="col"
                  >
                    {node.expandable && onToggleColumnCollapse ? (
                      <button
                        type="button"
                        className="mr-1 inline-flex align-middle text-muted-foreground hover:text-foreground"
                        aria-label={`${node.expanded ? "Collapse" : "Expand"} ${node.label}`}
                        onClick={() => onToggleColumnCollapse(node.key)}
                      >
                        {node.expanded ? (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    ) : null}
                    {node.label}
                  </th>
                ))}
                {levelIndex === 0 && showRowTotals && (
                  <th
                    rowSpan={result.colHeaderRows.length}
                    colSpan={measureCount}
                    scope="col"
                    className="pivot-total-header"
                  >
                    Grand total
                    {measureCount > 1 ? ` (${measures.map((m) => m.caption).join(", ")})` : ""}
                  </th>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <th colSpan={headerCols} scope="col" className="pivot-corner sticky left-0 z-20 text-left">
                {result.rowFields.join(" / ") || " "}
              </th>
              {showRowTotals &&
                measures.map((m, mi) => (
                  <th key={`${m.field}-${mi}`} scope="col" className="pivot-total-header">
                    {m.caption}
                  </th>
                ))}
            </tr>
          )}

          {showSortingControls && onSortChange && colLeaves.length > 0 && (
            <tr className="pivot-sort-row">
              <th
                colSpan={headerCols}
                scope="col"
                className="text-left text-[11px] text-muted-foreground"
              >
                {layout === "flat" && multiSort ? (
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true">⇧</span>
                    Shift-click a sort arrow to sort by several columns
                  </span>
                ) : (
                  <span aria-hidden="true">&nbsp;</span>
                )}
              </th>
              {colLeaves.map((leaf, i) => (
                <th
                  key={`${keyOf(leaf.key)}-${i}`}
                  scope="col"
                  style={widths[i] ? { width: widths[i] } : undefined}
                >
                  <span className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={
                        multiSort ? `Sort by ${leaf.label} (shift-click to add)` : `Sort by ${leaf.label}`
                      }
                      onClick={(e) => toggleSort(i, e.shiftKey)}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {sortGlyph(i)}
                    </button>
                    <span
                      role="separator"
                      aria-label={`Resize ${leaf.label}`}
                      className="pivot-resize-handle"
                      onMouseDown={(e) => startResize(i, e)}
                    />
                  </span>
                </th>
              ))}
              {showRowTotals && <th aria-hidden="true" colSpan={measureCount} />}

            </tr>
          )}
        </thead>
        <tbody>
          {padTop > 0 && (
            <tr style={{ height: padTop }} aria-hidden="true">
              <td colSpan={headerCols + totalColumns} />
            </tr>
          )}
          {visible.map((header, offset) => {
            const rowIndex = start + offset;
            return (
              <tr
                key={`${keyOf(header.key)}-${header.kind}-${rowIndex}`}
                data-kind={header.kind}
                className={
                  hover?.row === rowIndex ? "pivot-row-hover" : theme.stripe && rowIndex % 2 ? "pivot-stripe" : ""
                }
              >
                {rowLabelCells(header, rowIndex)}
                {colLeaves.map((leaf, colIndex) => {
                  const value = result.cells[rowIndex]?.[colIndex] ?? null;
                  const mi = measureIndexAt(colIndex);
                  const numericMeasure = (measures[mi]?.type ?? "number") === "number";
                  const selected =
                    anchor && focus && inRange({ row: rowIndex, col: colIndex }, anchor, focus);
                  return (
                    <td
                      key={keyOf(leaf.key) + colIndex}
                      data-testid={`cell-${rowIndex}-${colIndex}`}
                      className={`pivot-value ${selected ? "pivot-selected" : ""} ${
                        hover?.col === colIndex ? "pivot-col-hover" : ""
                      }`}
                      style={{
                        ...cellStyle(value, mi),
                        ...(widths[colIndex] ? { width: widths[colIndex] } : {}),
                      }}
                      onMouseEnter={() => setHover({ row: rowIndex, col: colIndex })}
                      onMouseLeave={() => setHover(null)}
                      onContextMenu={(e) => {
                        if (!onCellContextMenu) return;
                        e.preventDefault();
                        const pos = { row: rowIndex, col: colIndex };
                        setAnchor(pos);
                        setFocus(pos);
                        onCellContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          rowKey: header.kind === "grand" ? [] : header.key,
                          colKey: leaf.key,
                          label: [...header.key, ...leaf.key].join(" · ") || "All records",
                          value,
                        });
                      }}

                      onMouseDown={(e) => {
                        const pos = { row: rowIndex, col: colIndex };
                        setFocus(pos);
                        if (!e.shiftKey) setAnchor(pos);
                      }}
                      onDoubleClick={() => {
                        if (canEdit && numericMeasure && header.kind === "member") {
                          setEditing({ row: rowIndex, col: colIndex });
                          setDraft(value === null ? "" : String(value));
                          return;
                        }
                        if (allowDrillThrough)
                          onDrill?.(
                            header.kind === "grand" ? [] : header.key,
                            leaf.key,
                            [...header.key, ...leaf.key].join(" · ") || "All records",
                          );
                      }}
                      onClick={() => {
                        if (canEdit && numericMeasure) return;
                        if (allowDrillThrough)
                          onDrill?.(
                            header.kind === "grand" ? [] : header.key,
                            leaf.key,
                            [...header.key, ...leaf.key].join(" · ") || "All records",
                          );
                      }}
                    >
                      {kpiAt(rowIndex, colIndex) ? (
                        <span
                          className="pivot-kpi mr-1"
                          data-kpi={kpiAt(rowIndex, colIndex)?.state}
                          title={`${KPI_LABELS[kpiAt(rowIndex, colIndex)!.state]} — goal ${formatCell(
                            kpiAt(rowIndex, colIndex)?.goal ?? null,
                            mi,
                          )}`}
                          aria-label={KPI_LABELS[kpiAt(rowIndex, colIndex)!.state]}
                        >
                          {KPI_ICONS[kpiAt(rowIndex, colIndex)!.state]}
                        </span>
                      ) : null}
                      {isEditing(rowIndex, colIndex) ? (
                        <input
                          autoFocus
                          type="number"
                          className="pivot-cell-input w-full bg-transparent text-right outline-none"
                          aria-label={`Edit value for ${[...header.key, ...leaf.key].join(" · ") || "cell"}`}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onBlur={() => commitEdit(header.key, leaf.key, mi)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") commitEdit(header.key, leaf.key, mi);
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                      ) : (
                        formatCell(value, mi)
                      )}
                    </td>
                  );
                })}
                {showRowTotals &&
                  measures.map((_, mi) => (
                    <td
                      key={`total-${mi}`}
                      className="pivot-value pivot-total"
                      data-testid={mi === 0 ? `total-${rowIndex}` : `total-${rowIndex}-${mi}`}
                      onMouseDown={() => {
                        const pos = { row: rowIndex, col: colLeaves.length + mi };
                        setFocus(pos);
                        setAnchor(pos);
                      }}
                    >
                      {result.kpiRowTotals?.[rowIndex]?.[mi] ? (
                        <span
                          className="pivot-kpi mr-1"
                          data-kpi={result.kpiRowTotals[rowIndex]![mi]!.state}
                          aria-label={KPI_LABELS[result.kpiRowTotals[rowIndex]![mi]!.state]}
                        >
                          {KPI_ICONS[result.kpiRowTotals[rowIndex]![mi]!.state]}
                        </span>
                      ) : null}
                      {formatCell(totalAt(rowIndex, mi), mi)}
                    </td>
                  ))}

              </tr>
            );
          })}
          {padBottom > 0 && (
            <tr style={{ height: padBottom }} aria-hidden="true">
              <td colSpan={headerCols + totalColumns} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
