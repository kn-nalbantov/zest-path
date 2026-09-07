import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const prisma = new PrismaClient()

const count = await prisma.skill.count()
if (count === 0) {
  console.log('[prepare-db] No skills found — running seed')
  const result = spawnSync(process.execPath, [path.join(serverRoot, 'prisma', 'seed.js')], {
    cwd: serverRoot,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    await prisma.$disconnect()
    process.exit(result.status ?? 1)
  }
} else {
  console.log(`[prepare-db] Skills already present (${count}) — skip seed`)
}

await prisma.$disconnect()
