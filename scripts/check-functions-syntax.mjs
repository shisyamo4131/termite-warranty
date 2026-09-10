import { spawnSync } from 'node:child_process'

for (const file of [
  'functions/index.js',
  'functions/register-case.js',
  'functions/master-management.js',
  'functions/local-runtime.js',
]) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
