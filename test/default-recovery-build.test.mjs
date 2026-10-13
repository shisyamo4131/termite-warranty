import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {buildReleaseArtifacts,assertFreshBuild,normalizeReleaseManifest,normalizeSpaHtml} from '../scripts/lib/default-recovery-build.mjs'
import {releaseRevision} from '../scripts/build-recovery-release.mjs'
import {localReleaseInputs} from '../scripts/lib/default-recovery-release-proof.mjs'
const revision='a'.repeat(40)
const spa=timestamp=>`<html><p>Preserved 123</p><script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false" id="__NUXT_DATA__">[{"prerenderedAt":1,"serverRendered":2},${timestamp},false]</script><p>tail</p></html>`
async function manifests(root,id=revision,timestamp=123) {
 const base=join(root,'.output/public/_nuxt/builds');await mkdir(join(base,'meta'),{recursive:true});await writeFile(join(base,'latest.json'),JSON.stringify({id,timestamp}));await writeFile(join(base,'meta',id+'.json'),JSON.stringify({id,timestamp,prerendered:[]}))
}
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'fictional-recovery-build-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'app'));await mkdir(join(root,'.output/public'),{recursive:true});await writeFile(join(root,'app','page.vue'),'new source');await writeFile(join(root,'.output/public','index.html'),'old artifact');return {root,revision,environment:{FICTIONAL:'value'},repository:async()=>({head:revision,dirty:false}),generate:async()=>{await writeFile(join(root,'.output/public','index.html'),spa(123));await manifests(root)}}}
test('old artifact or hand-written receipt is rejected without executing a build',async t=>{const f=await fixture(t);await assert.rejects(()=>assertFreshBuild({},f));await assert.rejects(()=>localReleaseInputs(f.root));await assert.rejects(()=>assertFreshBuild(JSON.parse('{}'),f))})
test('fresh successful build yields only in-memory evidence, tampering invalidates it',async t=>{const f=await fixture(t),receipt=await buildReleaseArtifacts(f);assert.deepEqual(receipt,{});await assert.doesNotReject(()=>assertFreshBuild(receipt,f));await writeFile(join(f.root,'.output/public','index.html'),'tampered');await assert.rejects(()=>assertFreshBuild(receipt,f))})
test('failed build, changed input or revision cannot mint accepted evidence',async t=>{for(const mode of ['failure','input','revision']){const f=await fixture(t);if(mode==='failure')f.generate=async()=>{throw Error('private canary')};if(mode==='input'){const generate=f.generate;f.generate=async()=>{await generate();await writeFile(join(f.root,'app','page.vue'),'changed')}}if(mode==='revision'){let calls=0;f.repository=async()=>({head:++calls===1?revision:'b'.repeat(40),dirty:false})}await assert.rejects(()=>buildReleaseArtifacts(f),e=>!e.message.includes('private canary'))}})
test('changed public data, ignored environment and source invalidate consumed receipt',async t=>{for(const path of ['public','env','source']){const f=await fixture(t);await mkdir(join(f.root,'public'));await writeFile(join(f.root,'.env.local'),'FICTIONAL=x');const receipt=await buildReleaseArtifacts(f);if(path==='public')await writeFile(join(f.root,'public','data.json'),'changed');if(path==='env')await writeFile(join(f.root,'.env.local'),'FICTIONAL=y');if(path==='source')await writeFile(join(f.root,'app','page.vue'),'changed');await assert.rejects(()=>assertFreshBuild(receipt,f))}})
test('recovery profile fixes verified ID and normalizes manifest timestamps before receipt',async t=>{
 const f=await fixture(t);let captured
 f.generate=async(root,env)=>{captured=env;await manifests(root,env.RECOVERY_RELEASE_REVISION,987654);await writeFile(join(root,'.output/public','index.html'),spa(987654))}
 const receipt=await buildReleaseArtifacts(f);assert.equal(captured.RECOVERY_RELEASE_REVISION,revision);assert.equal(captured.NUXT_TELEMETRY_DISABLED,'1');assert.equal(f.environment.RECOVERY_RELEASE_REVISION,undefined)
 const base=join(f.root,'.output/public/_nuxt/builds');assert.deepEqual(JSON.parse(await readFile(join(base,'latest.json'),'utf8')),{id:revision,timestamp:0});assert.equal(JSON.parse(await readFile(join(base,'meta',revision+'.json'),'utf8')).timestamp,0)
 await assert.doesNotReject(()=>assertFreshBuild(receipt,f));f.environment.FICTIONAL='changed';await assert.rejects(()=>assertFreshBuild(receipt,f))
})
test('malformed manifest, foreign revision, extra metadata and conflicting environment fail closed',async t=>{
 for(const mode of ['missing','wrong-id','timestamp','extra-meta','unknown-shape','conflicting-env','invalid-revision']) {
  const f=await fixture(t)
  if(mode==='conflicting-env')f.environment.RECOVERY_RELEASE_REVISION='b'.repeat(40)
  if(mode==='invalid-revision')f.revision='unverified'
  f.generate=async root=>{if(mode==='missing')return;await manifests(root);const base=join(root,'.output/public/_nuxt/builds');if(mode==='wrong-id')await writeFile(join(base,'latest.json'),JSON.stringify({id:'b'.repeat(40),timestamp:1}));if(mode==='timestamp')await writeFile(join(base,'latest.json'),JSON.stringify({id:revision,timestamp:'invalid'}));if(mode==='extra-meta')await writeFile(join(base,'meta','old.json'),'{}');if(mode==='unknown-shape')await writeFile(join(base,'latest.json'),JSON.stringify({id:revision,timestamp:1,unknown:true}))}
  await assert.rejects(()=>buildReleaseArtifacts(f))
 }
 assert.equal(releaseRevision(['--revision',revision]),revision);assert.throws(()=>releaseRevision(['--revision','HEAD']));assert.throws(()=>releaseRevision(['--revision',revision,'--deploy']))
})
test('repeated generated timestamps normalize to identical artifacts and ID checks are never skipped',async t=>{
 const f=await fixture(t),base=join(f.root,'.output/public/_nuxt/builds');await manifests(f.root,revision,10);await normalizeReleaseManifest(f.root,revision);const first=await readFile(join(base,'latest.json'));await manifests(f.root,revision,20);await normalizeReleaseManifest(f.root,revision);assert.deepEqual(await readFile(join(base,'latest.json')),first);await assert.rejects(()=>normalizeReleaseManifest(f.root,'b'.repeat(40)))
})
test('known SPA payload timestamp alone is normalized, preserving surrounding content and prerender truthiness',()=>{
 assert.equal(normalizeSpaHtml(spa(1791266033480)),spa(1));assert.equal(normalizeSpaHtml(spa(999)),spa(1));assert.equal(normalizeSpaHtml(spa(1)),spa(1))
 for(const value of [spa(0),spa('null'),spa('9007199254740992'),spa(123).replace('serverRendered":2','serverRendered":1'),spa(123).replace(',false]',',true]'),spa(123).replace(',false]',',false,"extra"]'),spa(123).replace('data-ssr="false"','data-ssr="true"'),spa(123)+spa(123),'<html>unknown</html>'])assert.throws(()=>normalizeSpaHtml(value))
})
