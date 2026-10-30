import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    defaultBrowserType: 'chromium',
    browserName: 'chromium',
    channel: process.env.VIRTUAL_CLOSET_BROWSER_CHANNEL || (existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') ? 'chrome' : 'msedge'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer:
    process.env.VIRTUAL_CLOSET_EXTERNAL_SERVERS === '1'
      ? []
      : [
          {
            command: 'node scripts/serve-export.mjs .tools/web-setup 4173',
            url: 'http://127.0.0.1:4173',
            reuseExistingServer: !process.env.CI,
            timeout: 20000,
          },
          {
            command: 'node scripts/serve-export.mjs .tools/web-test 4174',
            url: 'http://127.0.0.1:4174',
            reuseExistingServer: !process.env.CI,
            timeout: 20000,
          },
          {
            command: 'node scripts/design-preview.mjs 4175',
            url: 'http://127.0.0.1:4175/preview',
            reuseExistingServer: !process.env.CI,
            timeout: 20000,
          },
        ],
});
