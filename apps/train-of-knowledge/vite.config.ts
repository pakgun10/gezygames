import { defineConfig } from "vite";

export default defineConfig({
  base: "/train-of-knowledge/",
  build: {
    outDir: "../../dist/train-of-knowledge",
    emptyOutDir: false,
  },
});
