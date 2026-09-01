import { defineConfig, devices } from "@playwright/test"

const isCI = Boolean(process.env.CI)
const e2ePort = isCI ? "3000" : (process.env.E2E_PORT ?? "3100")
const baseURL = `http://localhost:${e2ePort}`

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  globalTeardown: "./e2e/global-teardown.ts",
  outputDir: "test-results",
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    storageState: ".auth/user.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isCI
      ? `npm run start -- -p ${e2ePort}`
      : `npm run dev -- -p ${e2ePort}`,
    url: `${baseURL}/auth/login`,
    env: isCI ? {} : { NEXT_DIST_DIR: ".next-e2e" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
