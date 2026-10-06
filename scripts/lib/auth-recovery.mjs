import { createHash } from 'node:crypto'
import { RecoveryError, ACCESS_PATH, ACTIVATION_PATH, RUNTIME_PATH } from '../../src/domain/recovery.mjs'

const fail = () => { throw new RecoveryError('Auth recovery requires valid private evidence and current account authority. Inspect privately; no user data is printed.') }
const email = value => typeof value === 'string' ? value.trim().toLowerCase() : ''
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export async function readPrivateAuthObject(meta, request, {requirePinned = false} = {}) {
  if(meta?.bucket!=='termite-warranty-dev-recovery-auth'||typeof meta.object!=='string'||!meta.object)fail()
  const expected=meta.generation
  if(expected!==undefined&&(typeof expected!=='string'||!/^\d+$/.test(expected))||requirePinned&&expected===undefined)fail()
  const base=`https://storage.googleapis.com/storage/v1/b/${meta.bucket}/o/${encodeURIComponent(meta.object)}`
  const response=await request(base+(expected!==undefined?`?generation=${expected}`:''))
  if(!response.ok)fail()
  const metadata=await response.json()
  if(!/^\d+$/.test(metadata.generation??'')||expected!==undefined&&metadata.generation!==expected||!Number.isSafeInteger(Number(metadata.size))||Number(metadata.size)>16*1024*1024||Number(metadata.size)<0)fail()
  const content=await request(`${base}?alt=media&generation=${metadata.generation}`)
  if(!content.ok)fail()
  const result=Buffer.from(await content.arrayBuffer())
  if(result.length!==Number(metadata.size))fail()
  return {bytes:result,pinned:expected!==undefined}
}
function bytes(value, empty = false) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(value) || value.length % 4 === 1) fail()
  const result = Buffer.from(value, 'base64')
  if ((!empty && !result.length) || result.toString('base64').replace(/=+$/, '') !== value.replaceAll('-', '+').replaceAll('_', '/').replace(/=+$/, '')) fail()
  return result
}
export function authImportOptions(configuration, project) {
  const c = configuration?.hashConfig
  if (configuration?.schemaVersion !== 1 || configuration.project !== project || c?.algorithm !== 'SCRYPT'
    || !Number.isInteger(c.rounds) || c.rounds < 1 || c.rounds > 8
    || !Number.isInteger(c.memoryCost) || c.memoryCost < 1 || c.memoryCost > 14) fail()
  return { hash: { algorithm: 'SCRYPT', key: bytes(c.signerKey), saltSeparator: bytes(c.saltSeparator, true), rounds: c.rounds, memoryCost: c.memoryCost } }
}
export function missingAuthPlan(snapshot, profiles, liveUsers) {
  if (snapshot?.schemaVersion !== 1 || !Array.isArray(snapshot.users) || !snapshot.hashConfigurationEvidence
    || snapshot.users.length > 1000 || profiles.length > 1000 || liveUsers.length > 1000) fail()
  const current = new Map(), addresses = new Set(), backed = new Map(), live = new Map(), liveEmails = new Map()
  for (const profile of profiles) {
    if (typeof profile.uid !== 'string' || !profile.uid || profile.uid.length > 128 || current.has(profile.uid) || typeof profile.enabled !== 'boolean' || !/^\S+@\S+\.\S+$/.test(email(profile.email))
      || addresses.has(email(profile.email)) || !(profile.collection === 'staffAccounts' ? ['developer_superuser','house_solution_administrator','general_staff'].includes(profile.role) : profile.collection === 'constructionCompanyAccounts' && profile.role === 'construction_company')) fail()
    current.set(profile.uid, profile); addresses.add(email(profile.email))
  }
  for (const user of snapshot.users) { if (!user.uid || backed.has(user.uid)) fail(); backed.set(user.uid, user) }
  for (const user of liveUsers) {
    if (!user.uid || live.has(user.uid) || !email(user.email) || liveEmails.has(email(user.email)) || !current.has(user.uid)) fail()
    live.set(user.uid, user); liveEmails.set(email(user.email), user.uid)
  }
  const records = []
  for (const profile of profiles) {
    const existing = live.get(profile.uid)
    if (existing) {
      if (email(existing.email) !== email(profile.email) || existing.disabled !== !profile.enabled) fail()
      continue // Never import a UID that already exists.
    }
    const user = backed.get(profile.uid)
    if (!user || email(user.email) !== email(profile.email) || liveEmails.has(email(profile.email))
      || !Array.isArray(user.providerData) || !user.providerData.some(p => p.providerId === 'password')
      || user.providerData.some(p => p.providerId !== 'password') || user.customClaims && Object.keys(user.customClaims).length) fail()
    records.push({ uid: profile.uid, email: profile.email, disabled: !profile.enabled,
      emailVerified: user.emailVerified === true, ...(typeof user.displayName === 'string' ? {displayName:user.displayName} : {}),
      passwordHash: bytes(user.passwordHash), passwordSalt: bytes(user.passwordSalt, true) })
  }
  return { records, total: profiles.length, missing: records.length, preserved: live.size,
    ignoredHistorical: snapshot.users.filter(u => !current.has(u.uid)).length,
    authorityHash: hash(profiles), snapshotHash: hash(snapshot) }
}
export async function loadAuthAuthority(database, auth) {
  const profiles = []
  for (const collection of ['staffAccounts','constructionCompanyAccounts']) {
    const page = await database.collection(collection).limit(1001).get()
    if (page.size > 1000) fail()
    for (const row of page.docs) profiles.push({...row.data(),collection,uid:row.id})
  }
  const users = []; let pageToken
  do { const page = await auth.listUsers(1000,pageToken); users.push(...page.users.map(u => ({uid:u.uid,email:u.email,disabled:u.disabled}))); pageToken=page.pageToken; if(users.length>1000)fail() } while(pageToken)
  return { profiles: profiles.sort((a,b)=>a.uid.localeCompare(b.uid)), users }
}

// The shared operator lock blocks restore/cutover while Auth is being repaired.
// Any uncertain external effect leaves that lock and the private journal intact.
export async function restoreMissingAuth({ database, auth, controlId, project, revision, generation, operationId, approval, snapshot, configuration }) {
  if (!/^[a-f0-9]{40}$/.test(revision) || !/^[\w-]{8,80}$/.test(operationId) || !/^[\w./:-]{4,160}$/.test(approval)) fail()
  const control = database(controlId), lock = control.doc('recovery/operatorLock'), runtime = control.doc(RUNTIME_PATH)
  const receipt = control.doc(`recoveryAuthRepairs/${operationId}`)
  const options = authImportOptions(configuration,project)
  const snapshotHash = hash(snapshot)
  const initial = (await runtime.get()).data()
  if (initial?.phase !== 'recovering' || initial.generation !== generation || initial.controlDatabaseId !== controlId) fail()
  const business = database(initial.databaseId)
  const anchor = (await database('(default)').doc(ACTIVATION_PATH).get()).data()
  const marker = (await business.doc(ACCESS_PATH).get()).data()
  if (anchor?.controlDatabaseId !== controlId || marker?.databaseId !== initial.databaseId || marker.phase !== 'recovering' || marker.generation !== generation) fail()
  await control.runTransaction(async tx => {
    const [state, prior, exported, active, existing] = await Promise.all([tx.get(runtime),tx.get(lock),tx.get(control.doc('recovery/authExportLock')),tx.get(control.collection('recoveryOperations').limit(1)),tx.get(receipt)])
    if (hash(state.data()) !== hash(initial) || prior.exists || exported.exists || active.size || existing.exists) fail()
    tx.create(lock,{operationId,generation,startedAt:new Date(),intent:{kind:'auth-repair',databaseId:initial.databaseId,approval,revision,snapshotHash}})
  })
  let effectStarted = false
  try {
    const authority = await loadAuthAuthority(business,auth), plan = missingAuthPlan(snapshot,authority.profiles,authority.users)
    await receipt.create({status:'planned',generation,revision,approval,databaseId:initial.databaseId,snapshotHash,authorityHash:plan.authorityHash,missing:plan.missing,createdAt:new Date()})
    // Re-read all identity authority before making any Auth call.
    const current = await loadAuthAuthority(business,auth), fresh = missingAuthPlan(snapshot,current.profiles,current.users)
    if (fresh.authorityHash !== plan.authorityHash || fresh.missing !== plan.missing || fresh.preserved !== plan.preserved || hash((await runtime.get()).data()) !== hash(initial)) fail()
    if (plan.missing) {
      effectStarted = true
      await receipt.update({status:'importing'})
      const result = await auth.importUsers(fresh.records,options)
      if (result.failureCount || result.successCount !== fresh.missing || result.errors?.length) throw new RecoveryError('Auth import was partial or uncertain. Keep maintenance and inspect the private journal; do not delete or automatically retry accounts.')
    }
    const after = await loadAuthAuthority(business,auth), verified = missingAuthPlan(snapshot,after.profiles,after.users)
    if (verified.missing || verified.authorityHash !== plan.authorityHash || hash((await runtime.get()).data()) !== hash(initial)) fail()
    await receipt.update({status:'verified',imported:plan.missing,preserved:plan.preserved,completedAt:new Date()})
    await lock.delete()
    return {status:'verified',imported:plan.missing,preserved:plan.preserved,total:plan.total}
  } catch (error) {
    if (effectStarted) await lock.set({failed:true},{merge:true})
    else await lock.delete()
    // Never surface SDK errors that may contain private import payloads.
    throw new RecoveryError(effectStarted ? 'Auth repair is interrupted; maintenance and the private operator journal are retained for manual investigation.' : 'Auth repair was refused before import; inspect private evidence and authority.')
  }
}
