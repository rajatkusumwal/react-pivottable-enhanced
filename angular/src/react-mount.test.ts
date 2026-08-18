/**
 * The mount controller is the only piece of glue with real behaviour, so it is
 * tested on its own: normal render, re-render, and destroy/edge cases.
 */
import { describe, expect, it } from "vitest";
import { sampleData, sampleFields } from "react-pivottable-enhanced";
import { createPivotMount } from "./react-mount";
import { act } from "react";

function host() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

describe("createPivotMount", () => {
  it("renders the pivot grid into the host element", async () => {
    const el = host();
    const mount = createPivotMount(el);
    await act(async () => mount.render({ data: sampleData, fields: sampleFields }));
    expect(el.querySelector("[role='grid']")).not.toBeNull();
    await act(async () => mount.destroy());
  });

  it("re-renders when props change", async () => {
    const el = host();
    const mount = createPivotMount(el);
    await act(async () => mount.render({ data: sampleData, fields: sampleFields, title: "One" }));
    expect(el.textContent).toContain("One");
    await act(async () => mount.render({ data: sampleData, fields: sampleFields, title: "Two" }));
    expect(el.textContent).toContain("Two");
    expect(el.textContent).not.toContain("One");
    await act(async () => mount.destroy());
  });

  it("renders empty input without crashing", async () => {
    const el = host();
    const mount = createPivotMount(el);
    await act(async () => mount.render({ data: [], fields: [] }));
    expect(el.querySelector("[role='grid']")).not.toBeNull();
    await act(async () => mount.destroy());
  });

  it("clears the DOM on destroy and reports it is no longer alive", async () => {
    const el = host();
    const mount = createPivotMount(el);
    await act(async () => mount.render({ data: sampleData, fields: sampleFields }));
    expect(mount.alive).toBe(true);
    await act(async () => mount.destroy());
    expect(mount.alive).toBe(false);
    expect(el.querySelector("[role='grid']")).toBeNull();
  });

  it("ignores a render scheduled after destroy", async () => {
    const el = host();
    const mount = createPivotMount(el);
    await act(async () => mount.destroy());
    expect(() => mount.render({ data: sampleData, fields: sampleFields })).not.toThrow();
    expect(el.querySelector("[role='grid']")).toBeNull();
  });

  it("survives a double destroy", async () => {
    const el = host();
    const mount = createPivotMount(el);
    await act(async () => mount.render({ data: sampleData, fields: sampleFields }));
    await act(async () => mount.destroy());
    expect(() => mount.destroy()).not.toThrow();
  });

  it("survives rapid successive renders", async () => {
    const el = host();
    const mount = createPivotMount(el);
    await act(async () => {
      for (let i = 0; i < 10; i += 1) {
        mount.render({ data: sampleData, fields: sampleFields, title: `Run ${i}` });
      }
    });
    expect(el.textContent).toContain("Run 9");
    await act(async () => mount.destroy());
  });
});
