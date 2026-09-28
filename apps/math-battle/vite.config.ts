import { defineConfig } from "vite";

export default defineConfig({
  base: "/math-battle/",
  build: {
    outDir: "../../dist/math-battle",
    emptyOutDir: false,
  },
});
