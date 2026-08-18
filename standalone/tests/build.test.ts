/**
 * Slow packaging tests: run the real library build once, then assert on the
 * artifact a consumer would download. Run with `bun run test:package`.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { buildPackage, distDir } from "./build-package";

const exists = async (file: string) =>
  stat(join(distDir, file))
    .then(() => true)
    .catch(() => false);

describe("library build output", () => {
  let bundle = "";

  beforeAll(async () => {
    await buildPackage();
    bundle = await readFile(join(distDir, "index.js"), "utf8");
  }, 300_000);

  it("emits the bundle, the types and the theme CSS", async () => {
    expect(await exists("index.js")).toBe(true);
    expect(await exists("index.d.ts")).toBe(true);
    expect(await exists("pivot-theme.css")).toBe(true);
  });

  it("keeps peer and runtime dependencies external", () => {
    for (const dep of ["react", "react/jsx-runtime", "recharts", "@dnd-kit/core", "lucide-react"]) {
      expect(bundle, `${dep} should stay external`).toContain(`from"${dep}"`);
    }
  });

  it("does not inline a copy of React", () => {
    expect(bundle).not.toContain("react-dom.production");
    expect(bundle).not.toContain("__SECRET_INTERNALS");
  });

  it("declares the documented types", async () => {
    const types = await readFile(join(distDir, "index.d.ts"), "utf8");
    expect(types).toMatch(/PivotStudio/);
  });

  it("ships theme tokens the host app can import", async () => {
    const css = await readFile(join(distDir, "pivot-theme.css"), "utf8");
    expect(css.length).toBeGreaterThan(0);
    expect(css).toMatch(/--/); // CSS custom properties
  });

  it("produces a bundle of a sane size", async () => {
    const { size } = await stat(join(distDir, "index.js"));
    expect(size).toBeGreaterThan(50_000); // not an empty/failed build
    expect(size).toBeLessThan(3_000_000); // no accidental vendor inlining
  });
});
