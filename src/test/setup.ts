import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  // Recharts needs a size in jsdom.
  Object.defineProperty(window.HTMLElement.prototype, "offsetWidth", { value: 800, configurable: true });
  Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", { value: 400, configurable: true });
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  URL.createObjectURL ??= () => "blob:mock";
  URL.revokeObjectURL ??= () => {};
}
