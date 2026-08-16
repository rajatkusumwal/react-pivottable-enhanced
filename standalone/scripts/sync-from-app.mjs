/**
 * Copies src/components/pivot from the demo app into standalone/src/pivot,
 * dropping the *.test.* files. Run from the repo root:
 *
 *   node standalone/scripts/sync-from-app.mjs
 */
import { cp, rm, readdir, stat, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const source = join(repoRoot, "src", "components", "pivot");
const target = join(here, "..", "src", "pivot");

async function removeTests(dir) {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      await removeTests(full);
    } else if (/\.test\.(ts|tsx)$/.test(entry)) {
      await unlink(full);
    }
  }
}

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
await removeTests(target);
console.log(`Synced ${source} -> ${target} (tests excluded)`);
