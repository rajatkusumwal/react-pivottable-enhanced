/**
 * Ships the theme tokens inside dist/, so `inhouse-grid-monster/styles.css`
 * resolves from the published tarball without depending on src/.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");
await mkdir(dist, { recursive: true });
await copyFile(join(here, "..", "src", "pivot-theme.css"), join(dist, "pivot-theme.css"));
console.log("Copied pivot-theme.css -> dist/pivot-theme.css");
