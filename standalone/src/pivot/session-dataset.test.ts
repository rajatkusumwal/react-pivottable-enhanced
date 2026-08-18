import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadSessionDataset, saveSessionDataset } from "./session-dataset";
import { SESSION_DATASET_KEY, SESSION_DATASET_MAX_CHARS } from "./constants";
import type { UploadedDataset } from "./ui/DataSourceBar";

const dataset: UploadedDataset = {
  name: "sales.csv",
  rows: [{ region: "North", amount: 10 }],
  fields: [
    { name: "region", type: "string" },
    { name: "amount", type: "number" },
  ],
};

describe("session dataset cache", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("round-trips an uploaded dataset", () => {
    saveSessionDataset(dataset);
    expect(loadSessionDataset()).toEqual(dataset);
  });

  it("clears the cache when saving null", () => {
    saveSessionDataset(dataset);
    saveSessionDataset(null);
    expect(window.sessionStorage.getItem(SESSION_DATASET_KEY)).toBeNull();
    expect(loadSessionDataset()).toBeNull();
  });

  it("returns null when nothing was ever stored", () => {
    expect(loadSessionDataset()).toBeNull();
  });

  it("skips datasets larger than the size budget", () => {
    const big: UploadedDataset = {
      ...dataset,
      rows: [{ region: "x".repeat(SESSION_DATASET_MAX_CHARS + 1), amount: 1 }],
    };
    saveSessionDataset(big);
    expect(loadSessionDataset()).toBeNull();
  });

  it("ignores corrupt JSON left behind by an older version", () => {
    window.sessionStorage.setItem(SESSION_DATASET_KEY, "{not json");
    expect(loadSessionDataset()).toBeNull();
  });

  it("ignores stored values with the wrong shape", () => {
    window.sessionStorage.setItem(SESSION_DATASET_KEY, JSON.stringify({ name: "x" }));
    expect(loadSessionDataset()).toBeNull();
  });

  it("survives storage being disabled by the browser", () => {
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveSessionDataset(dataset)).not.toThrow();
  });
});
