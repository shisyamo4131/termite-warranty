import test from 'node:test'
import assert from 'node:assert/strict'
import {deflateRawSync} from 'node:zlib'
import {crc32,readSourceZip,hostingHash,hostingConfig,releaseProof} from '../scripts/lib/default-recovery-release-proof.mjs'

function zip(files) {
  const locals=[],central=[];let offset=0
  for(const [name,data] of files){const n=Buffer.from(name),bytes=Buffer.from(data),packed=deflateRawSync(bytes),crc=crc32(bytes),local=Buffer.alloc(30),entry=Buffer.alloc(46)
    local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(n.length,26)
    entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(8,10);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(packed.length,20);entry.writeUInt32LE(bytes.length,24);entry.writeUInt16LE(n.length,28);entry.writeUInt32LE(offset,42)
    locals.push(local,n,packed);central.push(entry,n);offset+=30+n.length+packed.length
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.size??files.length,8);end.writeUInt16LE(files.size??files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16)
  return Buffer.concat([...locals,directory,end])
}
function fixture() {
  const project='fictional-dev',projectNumber='123',control='recovery-control',site='fictional-site',region='asia-northeast1'
  const sourceFiles=new Map(['package.json','index.js','recovery-runtime.js','domain/fixed-recovery.mjs'].map(p=>[p,Buffer.from(p)]))
  const archive=zip(sourceFiles),inputs={functionNames:['one','two'],sourceFiles,region,hostingFiles:new Map([['/index.html',hostingHash(Buffer.from('page'))]]),servingConfig:{}}
  const functions=inputs.functionNames.map(name=>({name:`projects/${project}/locations/${region}/functions/${name}`,state:'ACTIVE',environment:'GEN_2',buildConfig:{entryPoint:name,runtime:'nodejs22',sourceProvenance:{resolvedStorageSource:{bucket:`gcf-v2-sources-${projectNumber}-${region}`,object:'source.zip',generation:'1'}}},serviceConfig:{environmentVariables:{RECOVERY_CONTROL_DATABASE:control},allTrafficOnLatestRevision:true,service:`projects/${project}/locations/${region}/services/${name}`,revision:`${name}-0001`}}))
  const channel={name:`sites/${site}/channels/live`,release:{name:'release-1',type:'DEPLOY',version:{name:`sites/${site}/versions/version1`}}}
  const env=[{name:'RECOVERY_CONTROL_DATABASE',value:control}],values=new Map([
    [`https://firebase.googleapis.com/v1beta1/projects/${project}`,{projectId:project,projectNumber}],
    [`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/-/functions`,{functions}],
    [`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${site}`,{name:`projects/${project}/sites/${site}`}],
    [`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/channels/live`,channel],
    [`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/versions/version1`,{name:channel.release.version.name,status:'FINALIZED',config:{},fileCount:'1'}],
    [`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/versions/version1/files`,{files:[{path:'/index.html',status:'ACTIVE',hash:inputs.hostingFiles.get('/index.html')}]}],
  ])
  for(const f of functions){const name=f.serviceConfig.service,revision=`${name}/revisions/${f.serviceConfig.revision}`;values.set(`https://run.googleapis.com/v2/${name}`,{name,generation:'2',observedGeneration:'2',terminalCondition:{state:'CONDITION_SUCCEEDED'},latestReadyRevision:revision,latestCreatedRevision:revision,traffic:[{revision,percent:100}],trafficStatuses:[{revision,percent:100}],template:{containers:[{env}]}});values.set(`https://run.googleapis.com/v2/${revision}`,{name:revision,conditions:[{type:'Ready',state:'CONDITION_SUCCEEDED'}],containers:[{env}]})}
  return {project,control,site,inputs,functions,values,archive,request:async url=>{if(!values.has(url))throw Error('private canary');return structuredClone(values.get(url))},readArchive:async()=>archive}
}
test('native ZIP verifies compressed bytes and rejects malformed/private paths',()=>{
  const bytes=zip(new Map([['index.js',Buffer.from('hello')]]));assert.equal(readSourceZip(bytes).get('index.js').toString(),'hello')
  for(const names of [[['../secret','x']],[['/secret','x']],[['a','x'],['A','y']],[['a\\b','x']]])assert.throws(()=>readSourceZip(zip(names)))
  const corrupt=Buffer.from(bytes);corrupt.writeUInt32LE(0,14);assert.throws(()=>readSourceZip(corrupt))
  const encrypted=Buffer.from(bytes);encrypted.writeUInt16LE(1,6);assert.throws(()=>readSourceZip(encrypted))
  assert.throws(()=>readSourceZip(bytes.subarray(0,-1)))
})
test('gzip hash/config canonical conversion matches reviewed deployment contract',()=>{
  assert.equal(hostingHash(Buffer.from('x')).length,64)
  assert.deepEqual(hostingConfig({public:'x',headers:[{source:'**',headers:[{key:'A',value:'B'}]}],rewrites:[{source:'**',destination:'/index.html'}]}),{headers:[{glob:'**',headers:{A:'B'}}],rewrites:[{glob:'**',path:'/index.html'}]})
  assert.throws(()=>hostingConfig({rewrites:[{source:'**',function:'f'}]}))
})
test('complete provider proof checks all functions and live Hosting independently',async()=>{
  const f=fixture(),checks=await releaseProof(f);assert.deepEqual(checks.map(c=>c.status),['pass','pass']);assert.equal(checks[0].summary.functions,2)
})
test('partial Functions, wrong provenance/control and unstable Cloud Run stay blocked',async()=>{
  for(const alter of [f=>f.functions.pop(),f=>f.functions[0].buildConfig.sourceProvenance.resolvedStorageSource.generation='',f=>f.functions[0].serviceConfig.environmentVariables.RECOVERY_CONTROL_DATABASE='wrong',f=>f.functions[0].state='DEPLOYING',f=>{const run=f.values.get('https://run.googleapis.com/v2/'+f.functions[0].serviceConfig.service);run.observedGeneration='1'},f=>{const run=f.values.get('https://run.googleapis.com/v2/'+f.functions[0].serviceConfig.service);run.trafficStatuses[0].percent=99},f=>{f.readArchive=async()=>zip(new Map([...f.inputs.sourceFiles,['extra.js',Buffer.from('x')]]))}]){const f=fixture();alter(f);const result=await releaseProof(f);assert.deepEqual(result.map(c=>c.status),['blocked','pass']);assert.ok(!JSON.stringify(result).includes('private canary'))}
})
test('partial Hosting, wrong hash/config/site and mixed release remain blocked',async()=>{
  for(const alter of [f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1/files`).files.pop(),f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1/files`).files[0].hash='wrong',f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1`).config={cleanUrls:true},f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/projects/${f.project}/sites/${f.site}`).name='projects/other/sites/x',f=>{const request=f.request;let count=0;f.request=async u=>{const value=await request(u);if(u.endsWith('/channels/live')&&++count===2)value.release.name='changed';return value}}]){const f=fixture();alter(f);assert.deepEqual((await releaseProof(f)).map(c=>c.status),['pass','blocked'])}
  const f=fixture();f.functions.pop();f.site=undefined;assert.deepEqual((await releaseProof(f)).map(c=>c.status),['blocked','blocked'])
})
