import assert from 'node:assert/strict'
import { cp, mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'
import { assertFunctionsDomainSynchronized, prepareFunctionsDomain, withFunctionsDomainStage } from '../scripts/functions-domain.mjs'

const checkScript = fileURLToPath(new URL('../scripts/check-functions-domain.mjs', import.meta.url))

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'termite-functions-domain-'))
  const sourceDirectory = join(root, 'source')
  const outputDirectory = join(root, 'output')
  await mkdir(join(sourceDirectory, 'nested'), { recursive: true })
  await writeFile(join(sourceDirectory, 'alpha.mjs'), Buffer.from([0, 13, 10, 255]))
  await writeFile(join(sourceDirectory, 'nested', 'beta.mjs'), 'export const beta = true\n')
  return { root, sourceDirectory, outputDirectory }
}

const withFixture = async (run) => {
  const value = await fixture()
  try {
    await run(value)
  } finally {
    await rm(value.root, { recursive: true, force: true })
  }
}

test('prepare creates an exact nested byte copy and is a no-op when current', async () => {
  await withFixture(async ({ sourceDirectory, outputDirectory }) => {
    const first = await prepareFunctionsDomain({ sourceDirectory, outputDirectory })
    assert.equal(first.changed, true)
    assert.deepEqual(await readFile(join(outputDirectory, 'alpha.mjs')), Buffer.from([0, 13, 10, 255]))
    await assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory })
    const second = await prepareFunctionsDomain({ sourceDirectory, outputDirectory })
    assert.equal(second.changed, false)
  })
})

test('prepare replaces stale content and removes extra entries', async () => {
  await withFixture(async ({ sourceDirectory, outputDirectory }) => {
    await mkdir(outputDirectory, { recursive: true })
    await writeFile(join(outputDirectory, 'alpha.mjs'), 'stale')
    await writeFile(join(outputDirectory, 'extra.mjs'), 'extra')
    const result = await prepareFunctionsDomain({ sourceDirectory, outputDirectory })
    assert.equal(result.changed, true)
    await assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory })
    await assert.rejects(readFile(join(outputDirectory, 'extra.mjs')), { code: 'ENOENT' })
  })
})

test('concurrent preparation serializes replacement and leaves one exact output', async () => {
  await withFixture(async ({ sourceDirectory, outputDirectory }) => {
    await mkdir(outputDirectory, { recursive: true })
    await writeFile(join(outputDirectory, 'stale.mjs'), 'stale')
    const results = await Promise.all([
      prepareFunctionsDomain({ sourceDirectory, outputDirectory }),
      prepareFunctionsDomain({ sourceDirectory, outputDirectory }),
    ])
    assert.deepEqual(results.map(({ changed }) => changed).sort(), [false, true])
    await assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory })
    assert.deepEqual((await readdir(join(outputDirectory, '..'))).filter((name) => name.startsWith('.domain-')), [])
  })
})

test('a waiting preparation rechecks and keeps an exact output made by the lock holder', async () => {
  await withFixture(async ({ sourceDirectory, outputDirectory }) => {
    const outputParent = join(outputDirectory, '..')
    const lockPath = join(outputParent, '.domain-sync.lock')
    await writeFile(lockPath, 'test lock\n')
    let contentionObserved = false
    const waitingPreparation = prepareFunctionsDomain({
      sourceDirectory,
      outputDirectory,
      onLockContention: async () => {
        contentionObserved = true
        await cp(sourceDirectory, outputDirectory, { recursive: true })
        await rm(lockPath)
      },
    })
    const result = await waitingPreparation
    assert.equal(contentionObserved, true)
    assert.equal(result.changed, false)
    await assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory })
    assert.deepEqual((await readdir(outputParent)).filter((name) => name.startsWith('.domain-')), [])
  })
})

test('lock timeout fails closed without deleting the existing output or lock', async () => {
  await withFixture(async ({ sourceDirectory, outputDirectory }) => {
    const outputParent = join(outputDirectory, '..')
    const lockPath = join(outputParent, '.domain-sync.lock')
    await mkdir(outputDirectory, { recursive: true })
    await writeFile(join(outputDirectory, 'existing.mjs'), 'preserve me')
    await writeFile(lockPath, 'abandoned test lock\n')
    await assert.rejects(
      prepareFunctionsDomain({ sourceDirectory, outputDirectory, lockTimeoutMs: 20, lockRetryMs: 5 }),
      /Timed out waiting for another Functions domain preparation/,
    )
    assert.equal(await readFile(join(outputDirectory, 'existing.mjs'), 'utf8'), 'preserve me')
    assert.equal(await readFile(lockPath, 'utf8'), 'abandoned test lock\n')
    assert.deepEqual((await readdir(outputParent)).filter((name) => name.startsWith('.domain-stage-')), [])
  })
})

test('staging cleanup runs when the staged operation fails', async () => {
  await withFixture(async ({ root }) => {
    await assert.rejects(
      withFunctionsDomainStage(root, async () => { throw new Error('intentional staged failure') }),
      /intentional staged failure/,
    )
    assert.deepEqual((await readdir(root)).filter((name) => name.startsWith('.domain-stage-')), [])
  })
})

test('path safety rejects same or nested paths without removing source data', async () => {
  await withFixture(async ({ sourceDirectory }) => {
    const marker = join(sourceDirectory, 'alpha.mjs')
    for (const outputDirectory of [
      sourceDirectory,
      join(sourceDirectory, '..'),
      join(sourceDirectory, '..cache'),
      join(sourceDirectory, 'nested', 'output'),
    ]) {
      await assert.rejects(
        prepareFunctionsDomain({ sourceDirectory, outputDirectory }),
        /separate, non-nested directories/,
      )
      assert.deepEqual(await readFile(marker), Buffer.from([0, 13, 10, 255]))
    }

    if (process.platform === 'win32') {
      await assert.rejects(
        prepareFunctionsDomain({ sourceDirectory, outputDirectory: sourceDirectory.toUpperCase() }),
        /separate, non-nested directories/,
      )
      assert.deepEqual(await readFile(marker), Buffer.from([0, 13, 10, 255]))
    }
  })
})

test('standalone comparison returns nonzero for drift and works outside the repository cwd', async () => {
  await withFixture(async ({ root, sourceDirectory, outputDirectory }) => {
    const runCheck = () => spawnSync(process.execPath, ['--input-type=module'], {
      input: `const { main } = await import(${JSON.stringify(pathToFileURL(checkScript).href)}); await main({ sourceDirectory: process.env.TEST_FUNCTIONS_DOMAIN_SOURCE, outputDirectory: process.env.TEST_FUNCTIONS_DOMAIN_OUTPUT });`,
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        TEST_FUNCTIONS_DOMAIN_SOURCE: sourceDirectory,
        TEST_FUNCTIONS_DOMAIN_OUTPUT: outputDirectory,
      },
    })

    const missing = runCheck()
    assert.equal(missing.status, 1)
    assert.match(missing.stderr, /Generated Functions domain is missing/)

    await prepareFunctionsDomain({ sourceDirectory, outputDirectory })
    const synchronized = runCheck()
    assert.equal(synchronized.status, 0)

    await writeFile(join(outputDirectory, 'alpha.mjs'), 'drift')
    const drifted = runCheck()
    assert.equal(drifted.status, 1)
    assert.match(drifted.stderr, /content: alpha\.mjs/)
  })
})

test('comparison rejects missing, extra, different, and type-mismatched entries', async () => {
  await withFixture(async ({ sourceDirectory, outputDirectory }) => {
    await prepareFunctionsDomain({ sourceDirectory, outputDirectory })

    await rm(join(outputDirectory, 'nested', 'beta.mjs'))
    await assert.rejects(
      assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory }),
      /missing: nested\/beta\.mjs/,
    )

    await prepareFunctionsDomain({ sourceDirectory, outputDirectory })
    await writeFile(join(outputDirectory, 'extra.mjs'), 'extra')
    await assert.rejects(
      assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory }),
      /extra: extra\.mjs/,
    )

    await prepareFunctionsDomain({ sourceDirectory, outputDirectory })
    await writeFile(join(outputDirectory, 'alpha.mjs'), 'different')
    await assert.rejects(
      assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory }),
      /content: alpha\.mjs/,
    )

    await prepareFunctionsDomain({ sourceDirectory, outputDirectory })
    await rm(join(outputDirectory, 'nested'), { recursive: true })
    await writeFile(join(outputDirectory, 'nested'), 'not a directory')
    await assert.rejects(
      assertFunctionsDomainSynchronized({ sourceDirectory, outputDirectory }),
      /type: nested/,
    )
  })
})

test('source symbolic links are rejected when the host permits creating them', async (context) => {
  await withFixture(async ({ root, sourceDirectory, outputDirectory }) => {
    const target = join(root, 'outside.mjs')
    await writeFile(target, 'outside')
    try {
      await symlink(target, join(sourceDirectory, 'linked.mjs'), 'file')
    } catch (error) {
      if (error?.code === 'EPERM') {
        context.skip('The host does not permit symbolic-link fixtures.')
        return
      }
      throw error
    }
    await assert.rejects(
      prepareFunctionsDomain({ sourceDirectory, outputDirectory }),
      /unsupported symbolic link/,
    )
  })
})

test('a symbolic-link source root is rejected when the host permits creating it', async (context) => {
  await withFixture(async ({ root, sourceDirectory, outputDirectory }) => {
    const linkedSource = join(root, 'linked-source')
    try {
      await symlink(sourceDirectory, linkedSource, 'junction')
    } catch (error) {
      if (error?.code === 'EPERM') {
        context.skip('The host does not permit symbolic-link fixtures.')
        return
      }
      throw error
    }
    await assert.rejects(
      prepareFunctionsDomain({ sourceDirectory: linkedSource, outputDirectory }),
      /root cannot be a symbolic link/,
    )
  })
})
