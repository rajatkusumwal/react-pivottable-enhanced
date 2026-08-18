/**
 * Guards on the shape of the published Angular package: the entry points that
 * consumers rely on, and the promise that React ships once (as a peer), not
 * bundled inside the wrapper.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "angular");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  name: string;
  main: string;
  types: string;
  exports: Record<string, unknown>;
  files: string[];
  peerDependencies: Record<string, string>;
  dependencies?: Record<string, string>;
};

describe("react-pivottable-enhanced-angular package", () => {
  it("is published under the expected name and entry points", () => {
    expect(pkg.name).toBe("react-pivottable-enhanced-angular");
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
    expect(pkg.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    });
  });

  it("ships only the build output and the licence", () => {
    expect(pkg.files.sort()).toEqual(["LICENSE", "README.md", "dist"]);
  });

  it("keeps Angular, React and the pivot library as peers, with no runtime dependencies", () => {
    expect(Object.keys(pkg.peerDependencies).sort()).toEqual([
      "@angular/common",
      "@angular/core",
      "react",
      "react-dom",
      "react-pivottable-enhanced",
    ]);
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it("imports React and the pivot library as bare specifiers so they stay external", () => {
    const source = readFileSync(join(root, "src", "react-mount.ts"), "utf8");
    expect(source).toContain('from "react"');
    expect(source).toContain('from "react-dom/client"');
    expect(source).toContain('from "react-pivottable-enhanced"');
    expect(source).not.toContain("../standalone");
  });
});
