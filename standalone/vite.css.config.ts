/**
 * CSS-only build: compiles src/styles.entry.css (Tailwind + theme + component
 * rules) into a single self-contained stylesheet. scripts/build-css.mjs runs
 * this and copies the result to dist/styles.css.
 */
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "css-build",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/styles.entry.css"),
      output: { assetFileNames: "styles.css" },
    },
  },
});
