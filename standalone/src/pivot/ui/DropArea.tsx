import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { PivotArea } from "../dnd";

export interface DropAreaProps {
  area: PivotArea;
  title: string;
  hint: string;
  itemIds: string[];
  children: ReactNode;
}

/** One of the standard commercial-tool drop zones: Report filters, Columns, Rows, Measures. */
export function DropArea({ area, title, hint, itemIds, children }: DropAreaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `area-${area}` });

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      data-testid={`drop-area-${area}`}
      className={`rounded-md border p-2 transition-colors ${
        isOver ? "border-primary bg-accent" : "border-dashed border-border bg-surface"
      }`}
    >
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-9 flex-col gap-1">
          {itemIds.length === 0 ? (
            <p className="px-1 py-1.5 text-[11px] text-muted-foreground">{hint}</p>
          ) : (
            children
          )}
        </div>
      </SortableContext>
    </section>
  );
}
