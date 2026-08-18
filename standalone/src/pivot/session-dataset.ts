/**
 * Keeps an uploaded dataset across page reloads (dev-server restarts, F5).
 *
 * Uses sessionStorage so the data never outlives the browser tab and never
 * leaves the machine. Anything too large to store is simply not persisted —
 * the grid still works, it just starts from the sample data after a reload.
 */
import type { UploadedDataset } from "./ui/DataSourceBar";
import { SESSION_DATASET_KEY, SESSION_DATASET_MAX_CHARS } from "./constants";

export function loadSessionDataset(): UploadedDataset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_DATASET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UploadedDataset;
    return parsed && Array.isArray(parsed.rows) && Array.isArray(parsed.fields) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSessionDataset(dataset: UploadedDataset | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!dataset) {
      window.sessionStorage.removeItem(SESSION_DATASET_KEY);
      return;
    }
    const raw = JSON.stringify(dataset);
    if (raw.length > SESSION_DATASET_MAX_CHARS) return;
    window.sessionStorage.setItem(SESSION_DATASET_KEY, raw);
  } catch {
    // Storage full or disabled: losing the cache is fine, the grid still works.
  }
}
