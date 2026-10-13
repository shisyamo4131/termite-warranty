import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mockBackupMetadata, runBackupRestore } from '../scripts/lib/backup-restore.mjs';
import { runCli } from '../scripts/backup-restore.mjs';

test('status describes adopted policies without claiming configured backups', () => {
  const result = runCli(['status', '--mode', 'mock']);
  assert.equal(result.status, 'simulated');
  assert.deepEqual(result.capabilities, { realBackup: false, realRestore: false });
  assert.deepEqual(result.availableBackups, []);
  assert.equal(result.plannedPolicy.firestore.pitrDays, 7);
  assert.equal(result.plannedPolicy.firestore.strategy, 'managed-firestore-backup');
  assert.equal(result.plannedPolicy.auth.strategy, 'private-auth-export');
});

test('backup and restore produce deterministic metadata and never report data operations', () => {
  for (const resource of ['firestore', 'auth']) {
    const result = runCli(['backup', '--mode', 'mock', '--resource', resource]);
    const before = structuredClone(result.backup);
    const restored = runBackupRestore({ operation: 'restore', mode: 'mock', resource, backup: result.backup, rehearsal: true });
    assert.deepEqual(result.backup, before);
    assert.deepEqual(result.backup, mockBackupMetadata(resource));
    for (const output of [result, restored]) {
      assert.equal(output.operationPerformed, false);
      assert.equal(output.dataRead, false);
      assert.equal(output.dataWritten, false);
      assert.equal(output.status, 'simulated');
    }
  }
});

test('restore requires explicit rehearsal and rejects incompatible or real metadata', () => {
  const request = { operation: 'restore', mode: 'mock', resource: 'firestore', backup: mockBackupMetadata('firestore'), rehearsal: true };
  assert.throws(() => runBackupRestore({ ...request, rehearsal: undefined }), /explicit rehearsal/);
  for (const backup of [undefined, mockBackupMetadata('auth'), { ...request.backup, provider: 'real' }, { ...request.backup, formatVersion: 2 }, { ...request.backup, synthetic: false }, { ...request.backup, id: 'live-backup' }, { ...request.backup, projectId: 'unknown' }]) {
    assert.throws(() => runBackupRestore({ ...request, backup }), /compatible synthetic/);
  }
  assert.throws(() => runCli(['restore', '--mode', 'mock', '--resource', 'auth', '--backup-id', 'mock-firestore-backup', '--rehearsal']), /compatible synthetic/);
});

test('CLI rejects real/apply, missing/duplicate flags and inappropriate arguments', () => {
  for (const args of [[], ['status'], ['status', '--mode', 'real'], ['status', '--mode', 'mock', '--apply'], ['status', '--mode', 'mock', '--project', 'anything'], ['status', '--mode'], ['status', '--mode', 'mock', '--mode', 'mock'], ['backup', '--mode', 'mock', '--resource', 'unknown'], ['status', '--mode', 'mock', '--resource', 'auth'], ['backup', '--mode', 'mock', '--resource', 'auth', '--rehearsal'], ['restore', '--mode', 'mock', '--resource', 'auth', '--rehearsal']]) assert.throws(() => runCli(args));
  assert.throws(() => runBackupRestore({ operation: 'status', mode: 'mock', apply: false }), /unavailable/);
});

test('offline provider has no filesystem, Firebase, network or process execution dependency', () => {
  const providerSource = readFileSync(new URL('../scripts/lib/backup-restore.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(providerSource, /\b(?:import|require|fetch|process|XMLHttpRequest)\b/);
  const cliSource = readFileSync(new URL('../scripts/backup-restore.mjs', import.meta.url), 'utf8');
  const imports = [...cliSource.matchAll(/from '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(imports, ['node:url', './lib/backup-restore.mjs']);
});

test('operator CLI returns simulated JSON and exit 1 without output for real operations', () => {
  const script = new URL('../scripts/backup-restore.mjs', import.meta.url);
  const run = (args) => spawnSync(process.execPath, [fileURLToPath(script), ...args], { encoding: 'utf8' });
  const mock = run(['restore', '--mode', 'mock', '--resource', 'firestore', '--backup-id', 'mock-firestore-backup', '--rehearsal']);
  assert.equal(mock.status, 0, mock.stderr);
  assert.equal(JSON.parse(mock.stdout).operationPerformed, false);
  const real = run(['restore', '--mode', 'real', '--resource', 'firestore', '--backup-id', 'mock-firestore-backup', '--rehearsal']);
  assert.equal(real.status, 1);
  assert.equal(real.stdout, '');
  assert.match(real.stderr, /unavailable/);
});
