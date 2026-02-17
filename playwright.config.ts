import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3001',
  },
  webServer: {
    command: 'pnpm run build && pnpm run start:test',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
