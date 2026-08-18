/**
 * Runs the package build exactly once per test process, so the build test and
 * the consumer render test can share the artifact.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const packageDir = resolve(here, "..");
export const distDir = join(packageDir, "dist");

let running: Promise<void> | undefined;

function run(command: string, args: string[]) {
  execFileSync(command, args, { cwd: packageDir, stdio: "pipe" });
}

/** sync -> emit declarations -> bundle -> copy CSS (mirrors `npm run build`). */
export function buildPackage(): Promise<void> {
  running ??= (async () => {
    run(process.execPath, [join(packageDir, "scripts", "sync-from-app.mjs")]);
    // vite build empties dist/, so it must run before the declarations land.
    run("bunx", ["vite", "build"]);
    run("bunx", ["tsc", "-p", "tsconfig.build.json"]);
    run(process.execPath, [join(packageDir, "scripts", "copy-css.mjs")]);
  })();
  return running;
}
