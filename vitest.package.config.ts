/**
 * Packaging tests: they run the real library build, so they live outside the
 * fast unit suite. Run with `bun run test:package`.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["standalone/tests/{build,consumer}.test.{ts,tsx}"],
    css: false,
    testTimeout: 300_000,
    hookTimeout: 300_000,
    // A single process so the shared build runs once.
    fileParallelism: false,
  },
});
