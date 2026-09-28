import { defineConfig } from "vite";

export default defineConfig({
  base: "/build-the-city/",
  build: {
    outDir: "../../dist/build-the-city",
    emptyOutDir: false,
  },
});
