import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}

export interface GridContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** Right-click menu used by the grid (a advanced pivot table's context menu equivalent). */
export function GridContextMenu({ x, y, items, onClose }: GridContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Grid actions"
      data-testid="grid-context-menu"
      className="fixed z-50 min-w-44 rounded-md border border-border bg-card py-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled ?? false}
          className="block w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-accent disabled:opacity-50"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
