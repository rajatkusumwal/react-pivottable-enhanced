/**
 * Framework-free glue between a plain DOM element and the React PivotStudio.
 *
 * Keeping this here (instead of inside the Angular component) means the mount
 * logic can be read and tested without Angular in the picture.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { PivotStudio } from "react-pivottable-enhanced";
import type { PivotStudioProps } from "react-pivottable-enhanced";

export interface PivotMount {
  /** Render (or re-render) the pivot table with the given props. */
  render(props: PivotStudioProps): void;
  /** Unmount React and release the DOM node. */
  destroy(): void;
  /** True until destroy() has run. */
  readonly alive: boolean;
}

export function createPivotMount(host: HTMLElement): PivotMount {
  let root: Root | null = createRoot(host);

  return {
    render(props: PivotStudioProps) {
      // A render scheduled after destroy() (Angular can emit one during teardown)
      // must be a no-op rather than a crash.
      if (!root) return;
      root.render(createElement(PivotStudio, props));
    },
    destroy() {
      if (!root) return;
      const current = root;
      root = null;
      current.unmount();
    },
    get alive() {
      return root !== null;
    },
  };
}
