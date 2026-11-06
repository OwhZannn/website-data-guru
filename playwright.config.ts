import { defineConfig } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  // Server dev menyusun halaman saat pertama dibuka; di mesin yang sibuk itu bisa lebih dari 5 detik.
  expect: { timeout: 10_000 },
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 360, height: 740 } },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/masuk`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: 'file:./e2e.db', DRIVE_PALSU: '1', NODE_ENV: 'development' },
  },
})
