import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {parse,stringify} from 'yaml'
import {validatePipeline,validateManualDevelopment} from '../scripts/lib/pipeline-contract.mjs'
const policy=JSON.parse(readFileSync(new URL('../governance/verification-policy.json',import.meta.url)))
const load=kind=>parse(readFileSync(new URL('../.github/workflows/deploy-'+kind+'.yml',import.meta.url),'utf8'))
test('integration, manual Dev and existing Prod meet their respective contracts',()=>{
 assert.equal(validatePipeline(stringify(load('development')),policy,'development'),true)
 assert.equal(validateManualDevelopment(stringify(load('development-manual'))),true)
 assert.equal(validatePipeline(stringify(load('production')),policy,'production'),true)
})
test('required check survives while dev push deployment and full test repetition are forbidden',()=>{
 for(const mutate of [w=>w.on.push={branches:['dev']},w=>w.jobs.verify.name='Other',w=>w.jobs.verify.if='false',w=>w.jobs.verify.environment='development',w=>w.jobs.verify.steps.push({run:'npm test'}),w=>w.jobs.verify.steps.pop(),w=>w.jobs.verify.steps[0].with.ref='main',w=>w.permissions.contents='write']){
  const w=load('development');mutate(w);assert.throws(()=>validatePipeline(stringify(w),policy,'development'))
 }
})
test('manual Dev rejects credentialed builds, skipped guards, stale authority and broken artifact handoff',()=>{
 for(const mutate of [w=>w.on.push={branches:['dev']},w=>w.jobs.build.environment='development',w=>w.jobs.deploy.if='true',w=>w.jobs.deploy.needs=[],w=>w.jobs.deploy.environment='production',w=>w.concurrency['cancel-in-progress']=true,w=>w.jobs.build.steps.find(s=>s.with?.path==='candidate').with.ref='main',w=>w.jobs.deploy.steps.find(s=>s.run==='node scripts/development-candidate.mjs').if='false',w=>w.jobs.deploy.steps.find(s=>s.run==='node scripts/development-deployment.mjs check').run='echo pass',w=>w.jobs.deploy.steps.find(s=>s.uses?.startsWith('actions/download-artifact')).with.name='other',w=>w.jobs.deploy.steps.find(s=>s.run?.includes('firebase.js deploy')).run+=' --force',w=>w.jobs.deploy.steps.push({run:'npm run build'})]){
  const w=load('development-manual');mutate(w);assert.throws(()=>validateManualDevelopment(stringify(w)))
 }
})
test('production retains target, WIF, build transfer, serialization and post-deployment checks',()=>{
 for(const mutate of [w=>w.jobs.deploy.if='true',w=>w.jobs.deploy.environment='development',w=>w.jobs.deploy.concurrency['cancel-in-progress']=true,w=>w.jobs.deploy.steps.find(s=>s.run==='node scripts/check-production-release.mjs cloud .production-release').if='false',w=>w.jobs.deploy.steps.push({run:'npm run build'}),w=>w.jobs.verify.steps.push({uses:'google-github-actions/auth@v3'})]){
  const w=load('production');mutate(w);assert.throws(()=>validatePipeline(stringify(w),policy,'production'))
 }
})

test('candidate build cannot inherit the controller tsconfig from an ancestor checkout',()=>{
 for(const mutate of [w=>delete w.jobs.build.steps[0].with.path,w=>w.jobs.build.steps[0].with.path='candidate/controller',w=>delete w.jobs.build.steps.find(s=>s.id==='candidate')['working-directory'],w=>delete w.jobs.build.steps.find(s=>s.uses?.startsWith('actions/setup-node@')).with['cache-dependency-path']]){
  const w=load('development-manual');mutate(w);assert.throws(()=>validateManualDevelopment(stringify(w)))
 }
})


test('manual Dev uses only the candidate CLI after install and before authentication',()=>{
 const cli='node candidate/node_modules/firebase-tools/lib/bin/firebase.js'
 const publish=w=>w.jobs.deploy.steps.find(s=>s.run?.startsWith(cli+' deploy '))
 const version=w=>w.jobs.deploy.steps.find(s=>s.run===cli+' --version')
 const moveBefore=(w,step,before)=>{const steps=w.jobs.deploy.steps;steps.splice(steps.indexOf(step),1);steps.splice(steps.indexOf(before),0,step)}
 for(const mutate of [
  w=>publish(w).run=publish(w).run.replace(cli,'npx --no-install firebase'),
  w=>publish(w).run=publish(w).run.replace('candidate/node_modules','node_modules'),
  w=>publish(w)['working-directory']='candidate',
  w=>version(w)['working-directory']='candidate',
  w=>w.defaults={run:{'working-directory':'candidate'}},
  w=>w.jobs.deploy.defaults={run:{'working-directory':'candidate'}},
  w=>version(w).run='node node_modules/firebase-tools/lib/bin/firebase.js --version',
  w=>moveBefore(w,version(w),w.jobs.deploy.steps.find(s=>s.run==='npx --yes npm@11.19.1 ci'&&s['working-directory']==='candidate')),
  w=>moveBefore(w,publish(w),w.jobs.deploy.steps.find(s=>s.run==='npx --yes npm@11.19.1 ci'&&s['working-directory']==='candidate')),
  w=>{const steps=w.jobs.deploy.steps,install=steps.find(s=>s.run==='npx --yes npm@11.19.1 ci'&&s['working-directory']==='candidate');steps.splice(steps.indexOf(install),1);steps.push(install)},
  w=>{const steps=w.jobs.deploy.steps,v=version(w);steps.splice(steps.indexOf(v),1);steps.push(v)},
  w=>publish(w).run+=' --force'
 ]){
  const w=load('development-manual');mutate(w);assert.throws(()=>validateManualDevelopment(stringify(w)))
 }
})
