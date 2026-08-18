import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "standalone/src/**/*.test.{ts,tsx}",
      "standalone/tests/package.test.ts",
    ],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      // Only the shipped library is graded; the demo site is exercised by hand.
      include: ["standalone/src/pivot/**/*.{ts,tsx}"],
      exclude: [
        "standalone/src/pivot/**/*.test.{ts,tsx}",
        "standalone/src/pivot/index.ts",
        "standalone/src/pivot/sample-data.ts",
        "standalone/src/pivot/constants.ts",
      ],
      // Floors, not targets: they exist so a new untested module is noticed.
      thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
    },
  },
});
