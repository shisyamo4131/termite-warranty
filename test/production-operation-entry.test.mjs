import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {gzipSync} from 'node:zlib'
import {readFileSync} from 'node:fs'
import {parse} from 'yaml'
import {admit,createAccounts,workflowRef} from '../.github/production-operation-entry.mjs'
import {operatorTarget} from '../scripts/production-operator-probe.mjs'
const target={project:operatorTarget.project,projectNumber:operatorTarget.number,site:operatorTarget.project,appId:'1:988295873733:web:aaaa',control:'recovery-control',serviceAccount:'prod-deployer@termite-warranty-prod.iam.gserviceaccount.com',audience:'//iam.googleapis.com/projects/988295873733/locations/global/workloadIdentityPools/github-production/providers/github',repositoryId:'1363463339',ownerId:'72244713'}
const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:'shisyamo4131/termite-warranty',GITHUB_REPOSITORY_ID:'1363463339',GITHUB_REPOSITORY_OWNER_ID:'72244713',GITHUB_WORKFLOW_REF:workflowRef,GITHUB_SHA:'a'.repeat(40)}
const base={target,operatorIdentity:{audience:operatorTarget.audience,serviceAccount:operatorTarget.serviceAccount},revision:env.GITHUB_SHA,command:'observe'}
function payload(o){const b=Buffer.from(JSON.stringify(o));return[gzipSync(b).toString('base64'),createHash('sha256').update(b).digest('hex')]}
test('production dispatch binds approved content, main and identity before credentials',()=>{
 assert.equal(admit(env,...payload(base)).command,'observe')
 for(const patch of [{GITHUB_REF:'refs/heads/dev'},{GITHUB_REPOSITORY_ID:'wrong'},{GITHUB_EVENT_NAME:'push'},{GITHUB_WORKFLOW_REF:operatorTarget.workflowRef},{FIRESTORE_EMULATOR_HOST:'localhost:1'},{FIREBASE_TOKEN:'token'}])assert.throws(()=>admit({...env,...patch},...payload(base)))
 for(const patch of [{revision:'b'.repeat(40)},{command:'configure-backups'},{target:{...target,project:'termite-warranty-dev'}},{operatorIdentity:{...base.operatorIdentity,serviceAccount:target.serviceAccount}}])assert.throws(()=>admit(env,...payload({...base,...patch})))
 assert.throws(()=>admit(env,payload(base)[0],'b'.repeat(64)))
 assert.throws(()=>admit(env,'x'.repeat(65537),'a'.repeat(64)))
})
const users=[{uid:'fictional-hs',email:'hs@example.invalid',displayName:'架空HS',role:'house_solution_administrator'},{uid:'fictional-dev',email:'dev@example.invalid',displayName:'架空開発',role:'developer_superuser'}]
const authRequest={...base,command:'auth-create',generation:1,operation:'fictional-auth',approval:'fictional-approval',users}
test('initial Auth creation admits exactly two distinct reviewed administrators',()=>{
 assert.equal(admit(env,...payload(authRequest)).users.length,2)
 for(const value of [[users[0]],[users[0],users[0]],[users[0],{...users[1],role:'general_staff'}],[users[0],{...users[1],password:'secret'}]])assert.throws(()=>admit(env,...payload({...authRequest,users:value})))
})
function database(phase='recovering'){
 const state={protocol:2,phase,generation:1,databaseId:'(default)',controlDatabaseId:'recovery-control'}
 return ()=>({doc:path=>({get:async()=>({exists:['_recovery/access','recovery/runtime'].includes(path),data:()=>state})}),collection:()=>({limit:()=>({get:async()=>({size:0})})})})
}
test('Auth creates fixed identities without passwords or verified-email claims; unknown outcomes retain identity',async()=>{
 const rows=new Map(),created=[]
 const auth={getUser:async id=>{if(!rows.has(id))throw Object.assign(Error(),{code:'auth/user-not-found'});return rows.get(id)},createUser:async u=>{created.push(u);rows.set(u.uid,u)}}
 assert.equal((await createAccounts(authRequest,{auth,database:database()})).accounts,2)
 await createAccounts(authRequest,{auth,database:database()});assert.equal(created.length,2)
 assert.ok(created.every(u=>u.emailVerified===false&&!('password'in u)))
 rows.set(users[0].uid,{...users[0],email:'wrong@example.invalid'})
 await assert.rejects(()=>createAccounts(authRequest,{auth,database:database()}))
 await assert.rejects(()=>createAccounts(authRequest,{auth,database:database('normal')}))
})
test('workflow requires main, serialized operations, input admission before WIF and cleanup',()=>{
 const w=parse(readFileSync(new URL('../.github/workflows/execute-production-operation.yml',import.meta.url),'utf8')),j=w.jobs.operate
 assert.deepEqual(Object.keys(w.on),['workflow_dispatch']);assert.equal(j.if,"github.ref == 'refs/heads/main'");assert.equal(j.environment,'production-operations');assert.equal(w.concurrency['cancel-in-progress'],false)
 assert.ok(j.steps.findIndex(s=>s.run==='node .github/production-operation-entry.mjs admit')<j.steps.findIndex(s=>s.uses==='google-github-actions/auth@v3'))
 assert.equal(j.steps.find(s=>s.uses==='google-github-actions/auth@v3').with.cleanup_credentials,true)
 assert.ok(!JSON.stringify(w).includes('upload-artifact'));assert.equal(j.steps.at(-1).if,'always()')
})
