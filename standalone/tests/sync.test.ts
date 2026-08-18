/**
 * The published package is a copy of src/components/pivot produced by the sync
 * script. These tests guard that copy: a file added to the app must reach the
 * package, and no test file (or stale leftover) may ship with it.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const appSource = join(repoRoot, "src", "components", "pivot");
const syncScript = join(repoRoot, "standalone", "scripts", "sync-from-app.mjs");
const packageSource = join(repoRoot, "standalone", "src", "pivot");

const isTestFile = (path: string) => /\.test\.(ts|tsx)$/.test(path);

async function listFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      found.push(...(await listFiles(full)));
    } else {
      found.push(relative(dir, full));
    }
  }
  return found.sort();
}

function runSync() {
  execFileSync(process.execPath, [syncScript], { cwd: repoRoot, stdio: "pipe" });
}

describe("sync-from-app", () => {
  let appFiles: string[];
  let packageFiles: string[];

  beforeAll(async () => {
    // A stale file that no longer exists in the app must not survive a re-sync.
    await mkdir(join(packageSource, "ghost"), { recursive: true });
    await writeFile(join(packageSource, "ghost", "stale.ts"), "export const stale = true;\n");
    runSync();
    appFiles = await listFiles(appSource);
    packageFiles = await listFiles(packageSource);
  });

  it("copies every non-test source file from the app", () => {
    expect(packageFiles).toEqual(appFiles.filter((file) => !isTestFile(file)));
  });

  it("ships no test files", () => {
    expect(packageFiles.filter(isTestFile)).toEqual([]);
  });

  it("removes files that were deleted from the app", () => {
    expect(existsSync(join(packageSource, "ghost", "stale.ts"))).toBe(false);
  });

  it("is idempotent", async () => {
    runSync();
    expect(await listFiles(packageSource)).toEqual(packageFiles);
  });

  it("copies the entry points a consumer needs", () => {
    for (const file of ["index.ts", "PivotStudio.tsx", "types.ts", "result.ts"]) {
      expect(packageFiles).toContain(file);
    }
    expect(existsSync(join(repoRoot, "standalone", "src", "pivot-theme.css"))).toBe(true);
  });

  it("leaves no empty directories behind after stripping tests", async () => {
    for (const dir of await readdir(packageSource, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      expect((await readdir(join(packageSource, dir.name))).length).toBeGreaterThan(0);
    }
    await rm(join(packageSource, "ghost"), { recursive: true, force: true });
  });
});
