import { defineConfig } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: 'list',
  // Runner CI jauh lebih lambat dari laptop (±2×); beri ruang agar tes yang sah tidak habis waktu.
  timeout: process.env.CI ? 60_000 : 30_000,
  retries: process.env.CI ? 2 : 0,
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
    env: {
      DATABASE_URL: 'file:./e2e.db',
      DRIVE_PALSU: '1',
      NODE_ENV: 'development',
      NODE_OPTIONS: '--max-old-space-size=4096',
    },
  },
})
