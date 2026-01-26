import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 1. Only include files in unit and api folders
    include: [
      'test/unit/**/*.spec.ts',
      'test/api/**/*.spec.ts'
    ],
    // 2. Explicitly exclude the Playwright E2E folder
    exclude: [
      'test/e2e/**',
      '**/node_modules/**'
    ],
    // 3. Environment (use 'node' for API/Unit, 'jsdom' if testing components)
    environment: 'node',
  },
})