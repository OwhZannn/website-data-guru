import { execSync } from 'node:child_process'

import { rmSync } from 'node:fs'

export default function setup() {
  for (const f of ['e2e.db', 'e2e.db-journal']) rmSync(`prisma/${f}`, { force: true })
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./e2e.db' },
  })
}
