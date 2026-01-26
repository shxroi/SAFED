import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    // 1. Ensure this matches the port your app uses (usually 3000 for Nuxt)
    baseURL: 'http://localhost:3000', 
    trace: 'on-first-retry',
  },

  // 2. Add this webServer block
  webServer: {
    command: 'npm run dev', // The command to start your app
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // You can comment out firefox/webkit during development to speed things up
  ],
});