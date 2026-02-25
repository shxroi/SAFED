import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "app"),
      "~": resolve(__dirname, "app"),
    },
  },
  assetsInclude: ["**/*.png", "**/*.webp", "**/*.jpg", "**/*.jpeg", "**/*.svg"],
  test: {
    // 1. Only include files in unit and api folders
    include: ["test/unit/**/*.spec.ts", "test/api/**/*.spec.ts"],
    // 2. Explicitly exclude the Playwright E2E folder
    exclude: ["test/e2e/**", "**/node_modules/**"],
    // 3. Environment (use 'node' for API/Unit, 'jsdom' if testing components)
    environment: "node",
  },
});
