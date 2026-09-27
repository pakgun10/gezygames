import { defineConfig } from "vite";

export default defineConfig({
  base: "/science-lab/",
  build: {
    outDir: "../../dist/science-lab",
    emptyOutDir: false,
  },
});
