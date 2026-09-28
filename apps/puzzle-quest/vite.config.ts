import { defineConfig } from "vite";

export default defineConfig({
  base: "/puzzle-quest/",
  build: {
    outDir: "../../dist/puzzle-quest",
    emptyOutDir: false,
  },
});
