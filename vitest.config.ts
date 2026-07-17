import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for the assessment engine (spec §9.4 requires a test per gate).
// Node environment — the engine is pure with no DOM dependency.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
