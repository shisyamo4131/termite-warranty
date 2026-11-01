import {configureProductionProtection,protectionBucket} from './production-protection.mjs'
const refuse=()=>{throw Error('Backup job refused; inspect retained operation before retrying.')}
export const backupJobName=t=>`projects/${t.project}/locations/asia-northeast1/jobs/firebase-schedule-recoveryBackupMonitor-asia-northeast1`
export function backupJobRequestAllowed(url,method,t,body){
  const root=`https://cloudscheduler.googleapis.com/v1/${backupJobName(t)}`
  return method==='GET'&&url===root||method==='POST'&&url===root+':run'&&body&&Object.keys(body).length===0
}
export async function runProductionBackupJob(o,c){
  const root=`https://cloudscheduler.googleapis.com/v1/${backupJobName(o.target)}`
  const inspect=async()=>{
    if(!(await c.protection.inspect()).foundationReady)refuse()
    const service=await c.request(`https://run.googleapis.com/v2/projects/${o.target.project}/locations/asia-northeast1/services/recoverybackupmonitor`)
    const env=Object.fromEntries((service.template?.containers?.[0]?.env??[]).map(x=>[x.name,x.value]))
    if(service.template?.serviceAccount!==`prod-backup@${o.target.project}.iam.gserviceaccount.com`||service.reconciling||!service.uri||env.RECOVERY_BACKUP_AUTOMATION!=='true'||env.RECOVERY_AUTH_BACKUP_BUCKET!==protectionBucket(o.target)||env.RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE!=='recovery/hashConfigurationEvidence'||!env.RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE)refuse()
    const job=await c.request(root)
    if(job.name!==backupJobName(o.target)||job.state!=='ENABLED'||job.httpTarget?.httpMethod!=='POST'||job.httpTarget?.uri!==service.uri||!job.httpTarget?.oidcToken?.serviceAccountEmail)refuse()
    return {foundationReady:true}
  }
  // Admission and durable journal precede the single run request. Unknown
  // outcomes retain the journal/lock. Submission is NOT execution success.
  await configureProductionProtection(o,{...c,protection:{inspect,configure:async()=>{
    await inspect()
    const job=await c.request(root+':run','POST',{})
    if(job.name!==backupJobName(o.target))refuse()
    return {foundationReady:true}
  }}})
  return {jobSubmitted:true}
}
