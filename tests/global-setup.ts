import { execSync } from 'node:child_process'

// Tes memakai basis data terpisah agar tabel boleh dikosongkan dengan aman.
export default function setup() {
  process.env.DATABASE_URL = 'file:./test.db'
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  })
}
