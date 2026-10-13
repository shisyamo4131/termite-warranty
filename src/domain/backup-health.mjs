export function backupHealth(backups, database, now, maximumAgeMs = 36 * 60 * 60 * 1000) {
  const available = backups.filter(row => row.database === database && row.state === 'READY' && Date.parse(row.expireTime) > now)
    .sort((a,b) => Date.parse(b.snapshotTime) - Date.parse(a.snapshotTime))
  const latest = available[0]
  if (!latest) return { status: 'missing', backupTime: null }
  const age = now - Date.parse(latest.snapshotTime)
  return { status: Number.isFinite(age) && age >= 0 && age <= maximumAgeMs ? 'success' : 'failed', backupTime: latest.snapshotTime }
}
export function assertPrivateAuthBucket(metadata, policy, expectedProjectNumber) {
  if(expectedProjectNumber!==undefined&&(!/^[1-9]\d*$/.test(expectedProjectNumber)||String(metadata.projectNumber)!==expectedProjectNumber))throw new Error('The Auth backup bucket must belong to the configured project.')
  if (metadata.iamConfiguration?.publicAccessPrevention !== 'enforced' || metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled !== true
    || policy.bindings?.some(binding => binding.members?.some(member => ['allUsers','allAuthenticatedUsers'].includes(member)))
    || !metadata.lifecycle?.rule?.some(rule => rule.action?.type === 'Delete' && rule.condition?.age === 30 && rule.condition?.matchesPrefix?.includes('auth/'))) throw new Error('A private, uniform-access bucket with explicit 30-day Auth lifecycle is required.')
}
