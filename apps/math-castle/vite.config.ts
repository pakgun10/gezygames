import { defineConfig } from "vite";

export default defineConfig({
  base: "/math-castle/",
  build: {
    outDir: "../../dist/math-castle",
    emptyOutDir: false,
  },
});
