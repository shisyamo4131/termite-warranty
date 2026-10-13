import { databaseId, RecoveryError } from '../../src/domain/recovery.mjs'
import {validateProductionTarget} from './production-deployment-plan.mjs'

export function firestoreRecoveryProvider({ projectId, request, now = () => Date.now(), productionTarget }) {
  if (productionTarget ? validateProductionTarget(productionTarget).project!==projectId : projectId !== 'termite-warranty-dev') throw new RecoveryError('An explicit inspected project is required.')
  const root = `projects/${projectId}`
  const resource = id => `${root}/databases/${databaseId(id)}`
  const api = (path, method = 'GET', body) => request(`https://firestore.googleapis.com/v1/${path}`, method, body)
  const list = async (path, key) => {
    const rows = [], seen=new Set(); let pageToken
    do { const result = await api(path + (pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '')); if(result[key]!==undefined&&!Array.isArray(result[key]))throw new RecoveryError('Invalid listing.');rows.push(...(result[key] ?? [])); pageToken = result.nextPageToken;if(rows.length>10000||seen.size>=100||pageToken&&(typeof pageToken!=='string'||seen.has(pageToken)))throw new RecoveryError('Listing budget exceeded.');if(pageToken)seen.add(pageToken) } while (pageToken)
    return rows
  }
  return {
    describe: id => api(resource(id)),
    schedules: id => list(`${resource(id)}/backupSchedules`, 'backupSchedules'),
    async backups(id) { const description = await api(resource(id)); return (await list(`${root}/locations/${description.locationId}/backups`, 'backups')).filter(backup => backup.database === resource(id)) },
    async configure(id) {
      const description = await api(resource(id))
      const schedules = await list(`${resource(id)}/backupSchedules`, 'backupSchedules')
      const daily = schedules.filter(schedule => schedule.dailyRecurrence)
      if (daily.length > 1 || daily.some(schedule => schedule.retention !== '2592000s')) throw new RecoveryError('Existing backup policy differs; inspect before changing it.')
      if (!daily.length) await api(`${resource(id)}/backupSchedules`, 'POST', { retention: '2592000s', dailyRecurrence: {} })
      if (description.pointInTimeRecoveryEnablement !== 'POINT_IN_TIME_RECOVERY_ENABLED') return api(`${resource(id)}?updateMask=pointInTimeRecoveryEnablement`, 'PATCH', { name: resource(id), etag: description.etag, pointInTimeRecoveryEnablement: 'POINT_IN_TIME_RECOVERY_ENABLED' })
      return { configured: true }
    },
    async restore({ source, target, backup, snapshotTime }) {
      if(productionTarget&&(source!=='(default)'||target===productionTarget.control))throw new RecoveryError('Production restore scope mismatch.')
      if (source === target || target === '(default)') throw new RecoveryError('Restoration requires a new named database.')
      databaseId(target)
      // Do not retry POST after an unknown outcome. Inspect the new target and LRO.
      try { await api(resource(target)); throw new RecoveryError('Restore target already exists.') } catch (error) { if (error.status !== 404) throw error }
      if (backup && snapshotTime || !backup && !snapshotTime) throw new RecoveryError('Choose exactly one backup or PITR point.')
      if (backup) {
        if (!backup.startsWith(`${root}/locations/`) || !/^projects\/[\w-]+\/locations\/[\w-]+\/backups\/[\w-]+$/.test(backup)) throw new RecoveryError('Backup must belong to this project.')
        const selected = await api(backup)
        if (selected.database !== resource(source) || selected.state !== 'READY' || !Number.isFinite(Date.parse(selected.expireTime)) || Date.parse(selected.expireTime) <= now() || !Number.isFinite(Date.parse(selected.snapshotTime))) throw new RecoveryError('The selected backup is not ready or has expired.')
        return { operation: await api(`${root}/databases:restore`, 'POST', { databaseId: target, backup }), recoveryPoint: selected.snapshotTime }
      }
      const description = await api(resource(source)), point = Date.parse(snapshotTime)
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/.test(snapshotTime) || !Number.isFinite(point) || point < Date.parse(description.earliestVersionTime) + 60_000 || point > now() - 60_000) throw new RecoveryError('PITR point must be eligible, minute-aligned and within the inspected retention window.')
      return { operation: await api(`${root}/databases:clone`, 'POST', { databaseId: target, pitrSnapshot: { database: resource(source), snapshotTime } }), recoveryPoint: snapshotTime }
    },
    async operation(name, target, expected) {
      if (!name?.startsWith(`${root}/databases/`) || !/^projects\/[\w-]+\/databases\/[()\w-]+\/operations\/[\w-]+$/.test(name)) throw new RecoveryError('Invalid operation resource.')
      const result = await api(name)
      if (result.error) throw new RecoveryError('Restore operation failed.')
      if(expected?.backup && result.metadata?.backup!==expected.backup && result.response?.sourceInfo?.backup?.backup!==expected.backup)throw new RecoveryError('Operation backup does not match the recorded restore request.')
      if(expected?.snapshotTime && (result.metadata?.pitrSnapshot?.database!==resource(expected.source)||result.metadata?.pitrSnapshot?.snapshotTime!==expected.snapshotTime))throw new RecoveryError('Operation PITR point does not match the recorded restore request.')
      if (!result.done) return { done: false }
      if (result.response?.name !== resource(target)) throw new RecoveryError('Operation response does not match the target database.')
      return { done: true }
    },
    async recoveryPoint(expected) {
      if(expected.snapshotTime)return expected.snapshotTime
      if(!expected.backup?.startsWith(`${root}/locations/`))throw new RecoveryError('Recorded backup provenance is unavailable.')
      const selected=await api(expected.backup)
      if(selected.database!==resource(expected.source))throw new RecoveryError('Backup source mismatch.')
      return selected.snapshotTime
    },
  }
}
