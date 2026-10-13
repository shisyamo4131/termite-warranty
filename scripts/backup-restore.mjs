import { pathToFileURL } from 'node:url';
import { mockBackupMetadata, runBackupRestore } from './lib/backup-restore.mjs';

export const usage = 'node scripts/backup-restore.mjs <status|backup|restore> --mode mock [--resource firestore|auth] [--backup-id mock-<resource>-backup --rehearsal]';

export function runCli(args) {
  const [operation, ...flags] = args;
  const values = {};
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (!['--mode', '--resource', '--backup-id', '--rehearsal'].includes(flag)) throw new Error(`Unsupported option: ${flag}`);
    if (Object.hasOwn(values, flag)) throw new Error(`Duplicate option: ${flag}`);
    if (flag === '--rehearsal') values[flag] = true;
    else {
      const value = flags[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value: ${flag}`);
      values[flag] = value;
    }
  }
  const request = { operation, mode: values['--mode'], resource: values['--resource'], rehearsal: values['--rehearsal'] };
  if (values['--backup-id'] !== undefined) {
    request.backup = { ...mockBackupMetadata(request.resource), id: values['--backup-id'] };
  }
  return runBackupRestore(request);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(`${JSON.stringify(runCli(process.argv.slice(2)), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage}\n`);
    process.exitCode = 1;
  }
}
