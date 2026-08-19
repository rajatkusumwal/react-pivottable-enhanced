/**
 * Runs the Angular compiler (ngc) without relying on it being on PATH.
 *
 * Why: `ngc` only exists in PATH when npm links @angular/compiler-cli's bin into
 * a node_modules/.bin folder that the running script can see. In a workspace
 * install the package is usually hoisted to the repo root, and some npm versions
 * do not expose that bin to a nested workspace script, which fails with
 * "sh: ngc: command not found". Resolving the JS entry point ourselves works in
 * every layout (hoisted, nested, npm, pnpm, bun).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../package.json"));

/** Candidate bin paths inside @angular/compiler-cli, newest layout first. */
const binCandidates = [
  "bundles/src/bin/ngc.js",
  "bin/ngc.js",
  "bundles/bin/ngc.js",
  "src/bin/ngc.js",
];

function resolveNgc() {
  let pkgJson;
  try {
    pkgJson = require.resolve("@angular/compiler-cli/package.json");
  } catch {
    console.error(
      "Cannot find @angular/compiler-cli. Install it first:\n  npm install\n" +
        "  (or) npm install --save-dev @angular/compiler-cli",
    );
    process.exit(1);
  }
  const pkgDir = dirname(pkgJson);
  for (const candidate of binCandidates) {
    const full = join(pkgDir, candidate);
    if (existsSync(full)) return full;
  }
  console.error(`Found @angular/compiler-cli at ${pkgDir} but no ngc entry point inside it.`);
  process.exit(1);
}

const child = spawn(process.execPath, [resolveNgc(), ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: join(here, ".."),
});
child.on("exit", (code) => process.exit(code ?? 1));
