import { defineConfig, devices } from "@playwright/test";

/**
 * The end-to-end journey (ARCHITECTURE §23). It runs against a live app and a real database:
 * `npm run dev` first, or set E2E_BASE_URL. It is not part of CI, which has no database.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: process.env.E2E_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL ?? "chrome", viewport: { width: 1360, height: 900 } } }],
});
