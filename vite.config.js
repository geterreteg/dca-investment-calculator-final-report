import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use("/api/etf-return", async (request, response) => {
        const requestUrl = new URL(request.url || "", "http://localhost");
        const { default: handler } = await import("./api/etf-return.js");

        await handler(
          {
            query: Object.fromEntries(requestUrl.searchParams.entries()),
          },
          {
            setHeader(name, value) {
              response.setHeader(name, value);
            },
            status(code) {
              response.statusCode = code;
              return this;
            },
            json(payload) {
              response.setHeader("Content-Type", "application/json; charset=utf-8");
              response.end(JSON.stringify(payload));
            },
          }
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
        },
      },
    },
  },
});
