import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@nestjs-port/core": path.resolve(__dirname, "packages/core/src"),
    },
  },
  test: {
    passWithNoTests: true,
    testTimeout: 30_000,
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
  },
});
