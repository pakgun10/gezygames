import { defineConfig } from "vite";

export default defineConfig({
  base: "/quiz-runner/",
  build: {
    outDir: "../../dist/quiz-runner",
    emptyOutDir: false,
  },
});
