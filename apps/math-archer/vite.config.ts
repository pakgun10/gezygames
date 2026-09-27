import { defineConfig } from "vite";

export default defineConfig({
  base: "/math-archer/",
  build: {
    outDir: "../../dist/math-archer",
    emptyOutDir: false,
  },
});
