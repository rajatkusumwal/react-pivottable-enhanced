import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Two build shapes:
//  - default: React and the runtime deps stay external so the host app keeps a
//    single copy of each (smallest install, normal npm behaviour).
//  - BUNDLE_DEPS=1: an "uber" build where every dependency except React itself
//    is inlined, so the tarball installs with zero transitive dependencies.
//    React must stay external — two copies break hooks.
const bundleDeps = process.env["BUNDLE_DEPS"] === "1";

const reactExternals = ["react", "react-dom", "react/jsx-runtime", "react-dom/client"];

const runtimeExternals = [
  "@dnd-kit/core",
  "@dnd-kit/sortable",
  "@dnd-kit/utilities",
  "lucide-react",
  "recharts",
];

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: !bundleDeps,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => (bundleDeps ? "index.bundled.js" : "index.js"),
    },
    rollupOptions: {
      external: bundleDeps ? reactExternals : [...reactExternals, ...runtimeExternals],
    },
  },
});
