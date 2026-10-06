import { databaseId, RecoveryError } from '../../src/domain/recovery.mjs'
const commands = ['status','initialize','enter','baseline','quarantine','reconcile','verify','cutover','reopen','resume-operator','scan','backups','configure-backups','restore','restore-status']
const valueOptions = ['project','control','revision','generation','operation-id','expected-operation','expected-recovery-owner','target','baseline','restore-operation','recovery-point','snapshot-hash','approval','verification','backup','snapshot-time','confirm']
export function recoveryOptions(args) {
  const options = { command: args[0], apply: false, emulator: false }
  if (!commands.includes(options.command)) throw new RecoveryError('Unknown recovery command.')
  for (let i = 1; i < args.length; i++) {
    const name = args[i].replace(/^--/, '')
    if (!args[i].startsWith('--') || Object.hasOwn(options, name) && !['apply','emulator'].includes(name)) throw new RecoveryError('Unknown or duplicate option.')
    if (['apply','emulator','confirm-worker-stopped','confirm-recovery-worker-stopped'].includes(name)) { if (options[name]) throw new RecoveryError('Duplicate option.'); options[name] = true }
    else if (valueOptions.includes(name) && args[i + 1] && !args[i + 1].startsWith('--')) options[name] = args[++i]
    else throw new RecoveryError('Unknown option or missing value.')
  }
  if (options.project !== (options.emulator ? 'demo-termite-warranty' : 'termite-warranty-dev')) throw new RecoveryError('Explicit approved project/environment required.')
  databaseId(options.control)
  if (options.control === '(default)') throw new RecoveryError('Separate control database required.')
  if (!/^[a-f0-9]{40}$/.test(options.revision ?? '')) throw new RecoveryError('Inspected revision required.')
  const readOnly = ['status','scan','backups'].includes(options.command)
  if (options.apply && (readOnly || options.confirm !== 'recovery' || !/^[\w-]{8,80}$/.test(options['operation-id'] ?? ''))) throw new RecoveryError('Apply requires operation ID and recovery confirmation.')
  if (options.command !== 'initialize' && !readOnly) {
    options.generation = Number(options.generation)
    if (!Number.isSafeInteger(options.generation) || options.generation < 1) throw new RecoveryError('Inspected generation required.')
  }
  if (['quarantine','reconcile','verify','scan','restore','restore-status'].includes(options.command)) databaseId(options.target)
  for (const name of ['baseline','verification']) if (options[name] && !/^[\w-]{8,80}$/.test(options[name])) throw new RecoveryError('Invalid evidence identifier.')
  if (options.approval && !/^[\w./:-]{4,160}$/.test(options.approval)) throw new RecoveryError('Use a non-secret external approval reference, without personal information.')
  if (options.emulator && ['backups','configure-backups','restore','restore-status'].includes(options.command)) throw new RecoveryError('Managed backup APIs are unavailable in the emulator.')
  return { ...options, readOnly }
}
