import { gzipSync, gunzipSync } from 'node:zlib'

// Copied into a temporary private Function. SDK clients are injected there;
// importing this module locally never reads Auth or starts a Cloud operation.
export async function manualAuthBackupProbe({ config, project, sdkVersion, control, auth, storage, assertPrivateAuthBucket }) {
  const { operation, bucket: bucketName, projectNumber } = config
  let phase = 'target', generation = null, acquired = false, objectGone = true
  const object = `auth/sdk-verification/${operation}.json.gz`
  const lock = control.doc('recovery/authExportLock'), epochRef = control.doc('recovery/authBackupEpoch'), runtime = control.doc('recovery/runtime')
  const active = control.collection('recoveryOperations').where('accountMutation', '==', true).limit(1)
  let binding
  try {
    if (project !== config.project || config.project !== 'termite-warranty-dev' || projectNumber !== '1039792105037' || bucketName !== 'termite-warranty-dev-recovery-auth' || !/^s4-[a-f0-9]{24}$/.test(operation) || !config.sdkVersion || sdkVersion !== config.sdkVersion) throw Error()
    phase = 'bucket'
    const bucket = storage.bucket(bucketName)
    const [metadata] = await bucket.getMetadata(), [policy] = await bucket.iam.getPolicy()
    assertPrivateAuthBucket(metadata, policy, projectNumber)
    if (metadata.location !== 'ASIA-NORTHEAST1' || Number(metadata.softDeletePolicy?.retentionDurationSeconds) !== 604800 || metadata.versioning?.enabled || metadata.defaultEventBasedHold || metadata.retentionPolicy?.retentionPeriod) throw Error()
    const permissions = ['storage.objects.create', 'storage.objects.get', 'storage.objects.delete']
    const [allowed] = await bucket.iam.testPermissions(permissions)
    if (permissions.some(permission => allowed[permission] !== true)) throw Error()
    phase = 'lock'
    binding = await control.runTransaction(async tx => {
      const [held, epoch, state, mutations, operator] = await Promise.all([tx.get(lock), tx.get(epochRef), tx.get(runtime), tx.get(active), tx.get(control.doc('recovery/operatorLock'))])
      if (held.exists || operator.exists || mutations.size || state.data()?.phase !== 'normal' || !Number.isSafeInteger(state.data()?.generation)) throw Error()
      const value = { owner: operation, epoch: epoch.data()?.epoch ?? 0, generation: state.data().generation, startedAt: new Date() }
      tx.create(lock, value)
      acquired = true // A commit error can still have created our lock.
      return value
    })
    acquired = true
    phase = 'auth-read'
    const users = []; let pageToken
    do {
      const page = await auth.listUsers(1000, pageToken)
      for (const user of page.users) {
        if (user.providerData.some(p => p.providerId === 'password') && (!user.passwordHash || user.passwordSalt === undefined)) throw Error()
        users.push(user.toJSON())
      }
      pageToken = page.pageToken
    } while (pageToken)
    const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, users }))
    const file = bucket.file(object)
    phase = 'save'; objectGone = false
    // An uncertain save leaves the lock and object for operator investigation.
    await file.save(gzipSync(bytes), { resumable: false, metadata: { contentType: 'application/gzip', metadata: { operation } }, preconditionOpts: { ifGenerationMatch: 0 } })
    phase = 'generation'
    const [saved] = await file.getMetadata()
    if (saved.metadata?.operation !== operation || !/^[1-9][0-9]*$/.test(String(saved.generation))) throw Error()
    generation = String(saved.generation)
    phase = 'readback'
    const exact = bucket.file(object, { generation })
    const [stored] = await exact.download({ validation: 'crc32c' })
    if (!gunzipSync(stored).equals(bytes)) throw Error()
    phase = 'consistency'
    await control.runTransaction(async tx => {
      const [held, epoch, state, mutations] = await Promise.all([tx.get(lock), tx.get(epochRef), tx.get(runtime), tx.get(active)])
      if (held.data()?.owner !== operation || (epoch.data()?.epoch ?? 0) !== binding.epoch || state.data()?.generation !== binding.generation || state.data()?.phase !== 'normal' || mutations.size) throw Error()
    })
    phase = 'delete'
    await exact.delete({ ifGenerationMatch: generation })
    phase = 'absence'
    try { await file.getMetadata(); throw Error() } catch (error) { if (Number(error.code) !== 404) throw error }
    objectGone = true
    phase = 'unlock'
    await control.runTransaction(async tx => {
      const held = await tx.get(lock)
      if (held.data()?.owner !== operation) throw Error()
      tx.delete(lock)
    })
    acquired = false
    return { operation, status: 'pass', phase: 'complete', generation, cleanupComplete: true, softDeleteSeconds: 604800, sdkVersion }
  } catch {
    // Do not delete a possibly in-flight save or a generation not observed by us.
    // Ordinary failures before storage writes can release only this operation's lock.
    if (acquired && objectGone) {
      try {
        await control.runTransaction(async tx => {
          const held = await tx.get(lock)
          if (held.data()?.owner !== operation) throw Error()
          tx.delete(lock)
        })
        acquired = false
      } catch { /* retained for bounded operator cleanup */ }
    }
    return { operation, status: 'failed', phase, generation, cleanupComplete: objectGone && !acquired, softDeleteSeconds: 604800 }
  }
}
