import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        zeroKnowledge: resolve(__dirname, "zero-knowledge.html"),
        howAiWorks: resolve(__dirname, "how-ai-works.html"),
      },
    },
  },
  server: {
    port: 4321,
    strictPort: false,
  },
  preview: {
    port: 4321,
    strictPort: false,
  },
});
