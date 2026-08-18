/**
 * `standalone/src/pivot` is generated, not committed, so the package tests sync
 * it before any test file is imported.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

export default function setup() {
  execFileSync(process.execPath, [join(repoRoot, "standalone", "scripts", "sync-from-app.mjs")], {
    cwd: repoRoot,
    stdio: "pipe",
  });
}
