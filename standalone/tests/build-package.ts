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
  execFileSync(command, args, {
    cwd: packageDir,
    stdio: "pipe",
    // Vitest sets NODE_ENV=test, which would give us a dev (jsxDEV) bundle.
    env: { ...process.env, NODE_ENV: "production" },
  });
}

/** bundle -> emit declarations -> copy CSS (mirrors `npm run build`). */
export function buildPackage(): Promise<void> {
  running ??= (async () => {

    // vite build empties dist/, so it must run before the declarations land.
    run("bunx", ["vite", "build", "--mode", "production"]);
    run("bunx", ["tsc", "-p", "tsconfig.build.json"]);
    run(process.execPath, [join(packageDir, "scripts", "copy-css.mjs")]);
  })();
  return running;
}
