/**
 * Guards on the shape of the published Angular package: the entry points that
 * consumers rely on, and the promise that React ships once (as a peer), not
 * bundled inside the wrapper.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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

/**
 * Angular libraries must be compiled by ngc in partial mode. Plain tsc output
 * makes consuming apps fail with TS-992012 ("Component imports must be
 * standalone components"), because the Angular compiler cannot read legacy
 * __decorate() metadata.
 */
describe("Angular partial compilation", () => {
  const scripts = (
    JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    }
  ).scripts;
  const tsconfig = JSON.parse(
    readFileSync(join(root, "tsconfig.build.json"), "utf8").replace(/^\s*\/\/.*$/gm, ""),
  ) as { angularCompilerOptions?: { compilationMode?: string } };

  it("builds and typechecks with ngc, never plain tsc", () => {
    expect(scripts["build"]).toContain("run-ngc.mjs -p tsconfig.build.json");
    expect(scripts["build"]).not.toMatch(/\btsc -p tsconfig\.build\.json/);
    expect(scripts["typecheck"]).toContain("run-ngc.mjs -p tsconfig.build.json");
  });

  // `ngc` is only on PATH when npm links the compiler-cli bin where the script
  // can see it; in workspace installs it often is not (sh: ngc: command not found).
  it("invokes the compiler through the resolver script, not a bare `ngc` binary", () => {
    expect(existsSync(join(root, "scripts", "run-ngc.mjs"))).toBe(true);
    expect(scripts["build"]).not.toMatch(/(^|&&\s*)ngc\s/);
    expect(scripts["typecheck"]).not.toMatch(/(^|&&\s*)ngc\s/);
  });


  it("asks the compiler for partial (publishable) output", () => {
    expect(tsconfig.angularCompilerOptions?.compilationMode).toBe("partial");
  });

  it("emits linker metadata and no legacy decorators once built", () => {
    const built = join(root, "dist", "pivot-studio.component.js");
    if (!existsSync(built)) return; // dist is only present after `bun run angular:build`
    const js = readFileSync(built, "utf8");
    expect(js).toContain("ngDeclareComponent");
    expect(js).toContain("standalone: true");
    expect(js).not.toContain("__decorate(");
    // React, Angular and the pivot library stay external.
    expect(js).not.toContain("createRoot(");
  });
});
