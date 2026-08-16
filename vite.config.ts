// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin, ViteDevServer } from "vite";

// A bad HMR websocket frame (browser extension, proxy, or another client on the
// dev port) emits an unhandled 'error' event that kills the whole Node process.
// Swallowing it keeps `bun run dev` alive; HMR simply reconnects.
function keepHmrSocketAlive(): Plugin {
  return {
    name: "keep-hmr-socket-alive",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.ws.on("connection", (socket: { on: (e: string, cb: (err: Error) => void) => void }) => {
        socket.on("error", (error) => {
          server.config.logger.warn(`[hmr] ignored websocket error: ${error.message}`);
        });
      });
      process.on("uncaughtException", (error: NodeJS.ErrnoException) => {
        if (error.code === "WS_ERR_UNEXPECTED_RSV_1" || /Invalid WebSocket frame/.test(error.message)) {
          server.config.logger.warn(`[hmr] ignored websocket error: ${error.message}`);
          return;
        }
        throw error;
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // orb's UMD bundle references the Node `global` object.
    define: { global: "globalThis" },
    plugins: [keepHmrSocketAlive()],
    // A slow/proxied websocket used to time out after ~30s, which made the
    // browser reload the whole page (and drop the imported data).
    server: { hmr: { timeout: 120_000 } },
  },
});

