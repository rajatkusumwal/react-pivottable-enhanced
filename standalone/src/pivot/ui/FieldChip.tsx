import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Filter, GripVertical, X } from "lucide-react";
import type { ReactNode } from "react";

export interface FieldChipProps {
  id: string;
  label: string;
  /** Small suffix such as the aggregation name, Flexmonster style. */
  hint?: string | undefined;
  disabled?: boolean | undefined;
  /** Hides the grab handle when drag & drop is switched off. */
  dragDisabled?: boolean | undefined;
  active?: boolean | undefined;
  onRemove?: (() => void) | undefined;
  onFilter?: (() => void) | undefined;
  /** Small leading glyph, e.g. the Σ aggregation icon. */
  icon?: ReactNode;
  /** Extra controls (e.g. the aggregation menu) rendered under the label. */
  children?: ReactNode;
}

/**
 * A draggable field chip. Looks like a Flexmonster field token: grab handle,
 * caption, optional filter funnel and a remove cross.
 */
export function FieldChip({
  id,
  label,
  hint,
  disabled,
  dragDisabled,
  active,
  icon,
  onRemove,
  onFilter,
  children,
}: FieldChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: disabled === true || dragDisabled === true,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group rounded-md border bg-card px-1.5 py-1 text-xs shadow-sm ${
        active ? "border-primary" : "border-border"
      } ${isDragging ? "opacity-50" : ""}`}
      data-testid={`field-chip-${id}`}
    >
      <div className="flex items-center gap-1">
        {!dragDisabled && (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground disabled:cursor-not-allowed"
            aria-label={`Drag ${label}`}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {icon}
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label}</span>
        {hint && (
          <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{hint}</span>
        )}
        {onFilter && (
          <button
            type="button"
            aria-label={`Filter ${label}`}
            disabled={disabled}
            onClick={onFilter}
            className="text-muted-foreground hover:text-primary disabled:opacity-40"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove ${label}`}
            disabled={disabled}
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {children && <div className="mt-1 flex flex-wrap gap-1">{children}</div>}
    </div>
  );
}
