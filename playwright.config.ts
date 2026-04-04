import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Component Tests
 * 
 * Tests critical UI components to prevent QA bug recurrence.
 * Focuses on 4 key scenarios from Cycle 3 QA findings.
 */
export default defineConfig({
  testDir: './tests/component',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://127.0.0.1:5173',
    
    // Collect trace on retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on retry
    video: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    ...(
      process.env.CI
        ? []
        : [
            {
              name: 'firefox',
              use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1280, height: 720 },
              },
            },
            {
              name: 'webkit',
              use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1280, height: 720 },
              },
            },
            {
              name: 'Mobile Chrome',
              use: {
                ...devices['Pixel 5'],
              },
            },
            {
              name: 'Mobile Safari',
              use: {
                ...devices['iPhone 12'],
              },
            },
          ]
    ),
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'pnpm run test:e2e:server',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
