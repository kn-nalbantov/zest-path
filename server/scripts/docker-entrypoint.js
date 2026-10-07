import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: serverRoot,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run('npx', ['prisma', 'generate'])

const push = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})
if (push.status !== 0) {
  console.warn('prisma db push did not apply; starting API with the existing database')
}

run(process.execPath, [path.join(serverRoot, 'scripts', 'ensure-seed.js')])
run(process.execPath, [path.join(serverRoot, 'src', 'index.js')])
