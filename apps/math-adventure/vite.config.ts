import { defineConfig } from "vite";

export default defineConfig({
  base: "/math-adventure/",
  build: {
    outDir: "../../dist/math-adventure",
    emptyOutDir: false,
  },
});
