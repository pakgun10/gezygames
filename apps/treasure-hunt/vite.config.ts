import { defineConfig } from "vite";

export default defineConfig({
  base: "/treasure-hunt/",
  build: {
    outDir: "../../dist/treasure-hunt",
    emptyOutDir: false,
  },
});
