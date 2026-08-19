/**
 * Compiles the published stylesheet.
 *
 * dist/styles.css is self-contained: Tailwind preflight, every utility the
 * pivot source uses, the theme tokens and the component CSS. Consuming apps
 * (React or Angular) import that one file and need no Tailwind setup.
 *
 * dist/pivot-theme.css keeps shipping the raw tokens for apps that already run
 * Tailwind and want to theme the grid themselves.
 */
import { copyFile, mkdir, rm, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, "..");
const dist = join(pkgDir, "dist");
const cssBuild = join(pkgDir, "css-build");

await mkdir(dist, { recursive: true });
await copyFile(join(pkgDir, "src", "pivot-theme.css"), join(dist, "pivot-theme.css"));

// Call Vite through its JS API instead of a `bunx`/`npx` subprocess: bun is not
// installed on every machine, and npm workspaces do not always expose the vite
// bin to a nested package script.
const require = createRequire(join(pkgDir, "package.json"));
const { build } = await import(require.resolve("vite"));

process.env.NODE_ENV = "production";
await build({ configFile: join(pkgDir, "vite.css.config.ts"), root: pkgDir, mode: "production" });

const compiled = join(cssBuild, "styles.css");
const css = await readFile(compiled, "utf8");
if (!css.includes(".pivot-fm")) {
  throw new Error("Compiled stylesheet is missing the pivot component rules");
}
await copyFile(compiled, join(dist, "styles.css"));
await rm(cssBuild, { recursive: true, force: true });

console.log(`Compiled dist/styles.css (${(css.length / 1024).toFixed(1)} kB)`);
