import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    globalSetup: ["./standalone/tests/global-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "standalone/tests/{sync,exports}.test.ts"],
    css: false,
  },
});
