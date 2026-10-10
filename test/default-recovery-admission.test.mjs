import test from 'node:test'
import assert from 'node:assert/strict'
import {options} from '../scripts/default-recovery.mjs'
import {admitDev,sanitizeCommand,dispatchDev} from '../scripts/lib/default-recovery-admission.mjs'
import {infrastructureChecks} from '../scripts/lib/default-recovery-preflight.mjs'
import {observeFixedRecovery} from '../scripts/lib/default-recovery-observation.mjs'
const revision='a'.repeat(40),project='termite-warranty-dev',control='recovery-control',source='fictional-copy'
const args=['--project',project,'--control',control,'--source',source,'--generation','5','--revision',revision,'--operation','operation-123','--site','fictional-site','--dev-execute','--apply','--confirm','fixed-recovery','--approval','private:approval']
test('incident discovery accepts no guessed generation and cannot be promoted to writes',()=>{
 const base=['--project',project,'--control',control,'--revision',revision,'--dev-inspect']
 assert.equal(options(['observe',...base]).source,'(default)')
 for(const extra of [['--apply'],['--dev-execute'],['--generation','7'],['--source','(default)'],['--site','fictional-site']])assert.throws(()=>options(['observe',...base,...extra]))
 assert.throws(()=>options(['preflight',...base,'--source','(default)','--generation','7','--site','fictional-site','--hosting-provider-version','sites/foreign/versions/one']))
})
test('incident discovery is bounded, sanitized and distinguishes closure from drain',async()=>{
 const f=fixture(),input={project,control,request:async url=>({...await f.request(url),uid:'fictional-uid'}),readDocument:f.readDocument,listOperations:async()=>[]}
 const normal={...f.state,phase:'normal',privateCanary:'must-not-appear'}
 f.documents.set(`${control}/recovery/runtime`,normal);f.documents.set('(default)/_recovery/access',normal)
 const report=await observeFixedRecovery(input)
 assert.equal(report.nextAction,'enter-maintenance');assert.equal(report.cloudWrites,false);assert.equal(JSON.stringify(report).includes('must-not-appear'),false)
 f.documents.set(`${control}/recovery/runtime`,f.state);f.documents.set('(default)/_recovery/access',f.state)
 assert.equal((await observeFixedRecovery({...input,listOperations:async()=>[true]})).nextAction,'await-drain')
 assert.equal((await observeFixedRecovery(input)).nextAction,'select-recovery-point')
 f.documents.set(`${control}/recovery/operatorLock`,{operationId:'operation-123',owner:'owner-123',intent:{kind:'default-enter'},privateCanary:'must-not-appear'})
 const held=await observeFixedRecovery(input);assert.equal(held.nextAction,'inspect-interruption');assert.equal(held.interruptedOperation.owner,'owner-123')
 f.documents.set('(default)/_recovery/access',normal);assert.equal((await observeFixedRecovery(input)).aligned,false)
 await assert.rejects(()=>observeFixedRecovery({...input,request:async()=>({name:'wrong'})}))
})
function fixture(command='apply'){
 const state={protocol:2,phase:'recovering',generation:5,databaseId:'(default)',controlDatabaseId:control}
 const plan={source,target:'(default)',controlId:control,revision,generation:5,status:'sealed',approval:'private:approval'}
 const documents=new Map([[`${control}/recovery/runtime`,state],['(default)/_recovery/access',{...state}],[`${source}/_recovery/access`,{phase:'recovering',generation:5,databaseId:source}],[`${control}/defaultRecoveryPlans/operation-123`,plan]])
 return {options:options([command,...args]),repository:{head:revision,dirty:false},documents,plan,state,request:async url=>({name:url.split('/v1/')[1],locationId:'fictional-location',type:'FIRESTORE_NATIVE'}),readDocument:async(id,path)=>documents.get(`${id}/${path}`)??null,listOperations:async()=>[]}
}
test('execution flags require explicit confirmation, evidence and command-specific metadata',()=>{
 assert.doesNotThrow(()=>options(['apply',...args]))
 for(const key of ['--confirm','--approval','--operation','--source','--revision','--generation','--site']){const changed=[...args],i=changed.indexOf(key);changed.splice(i,2);assert.throws(()=>options(['apply',...changed]))}
 for(const command of ['initialize','emergency-close','reconcile-emergency','status'])assert.throws(()=>options([command,...args]))
 assert.throws(()=>options(['resume',...args]));assert.throws(()=>options(['plan',...args]));assert.throws(()=>options(['enter',...args]))
})
test('address publication requires default-only explicit journal hash and pre-migration baseline',()=>{
 const addressArgs=args.map(value=>value===source?'(default)':value)
 const extra=['--baseline','address-baseline','--address-operation','address-migration','--address-plan-hash','d'.repeat(64)]
 assert.equal(options(['plan-address',...addressArgs,...extra]).command,'plan-address')
 for(const key of ['--baseline','--address-operation','--address-plan-hash']){const changed=[...extra],i=changed.indexOf(key);changed.splice(i,2);assert.throws(()=>options(['plan-address',...addressArgs,...changed]))}
 assert.throws(()=>options(['plan-address',...args,...extra]))
 assert.throws(()=>options(['plan-address',...addressArgs,...extra,'--verification','fictional-B-evidence']))
 assert.throws(()=>options(['plan-address',...addressArgs,...extra,'--migration']))
 assert.throws(()=>options(['publish',...addressArgs,...extra]))
})
test('historical intake publication requires completed intake identity and cannot accept restore/address evidence',async()=>{
 const base=args.map(value=>value===source?'(default)':value),extra=['--intake-operation','fictional-intake','--intake-plan-hash','e'.repeat(64)]
 const parsed=options(['plan-intake',...base,...extra]);assert.equal(parsed.command,'plan-intake')
 for(const addition of [['--baseline','fictional-baseline'],['--migration'],['--verification','fictional-verify']])assert.throws(()=>options(['plan-intake',...base,...extra,...addition]))
 assert.throws(()=>options(['publish',...base,...extra]));assert.throws(()=>options(['plan-intake',...args,...extra]))
 const f=fixture();f.options=parsed;await admitDev(f)
 let closed=0,called=0
 await dispatchDev(parsed,{admission:async()=>{},verifyClosedRules:async()=>{closed++},factory:{planIntake:async(g,id,data)=>{called++;assert.equal(data.intakePlanHash,'e'.repeat(64));return {status:'verified'}}}})
 assert.equal(closed,1);assert.equal(called,1)
})
test('publication-only plans cannot enter generic apply/resume and verified seal recovery stays closed',async()=>{
 const f=fixture(),normalSource=f.options.source
 f.options.source='(default)';f.plan.source='(default)';f.plan.kind='address-migration';f.plan.publicationOnly=true;f.plan.status='verified'
 await assert.rejects(admitDev(f))
 f.options.command='plan-address';f.options.baseline='address-baseline';f.options['address-operation']='address-migration';f.options['address-plan-hash']='d'.repeat(64)
 await assert.doesNotReject(admitDev(f))
 f.options.source=normalSource;await assert.rejects(admitDev(f));f.options.source='(default)'
 f.options.command='recover-operator';f.options['worker-stopped']=true;f.options['expected-owner']='owner-123'
 f.documents.set(`${control}/recovery/operatorLock`,{operationId:f.options.operation,owner:'owner-123',intent:{kind:'default-seal'}})
 await assert.doesNotReject(admitDev(f))
 f.plan.publicationOnly=false;await assert.rejects(admitDev(f))
})
test('address plan dispatch uses closed Rules check and no restore verifier/copy operation',async()=>{
 const calls=[]
 const input={command:'plan-address',generation:5,operation:'address-publish',baseline:'address-baseline','address-operation':'address-migration','address-plan-hash':'d'.repeat(64),approval:'external/address'}
 const result=await dispatchDev(input,{admission:async()=>calls.push('admission'),verifyClosedRules:async()=>calls.push('closed'),factory:{planAddress:async(...values)=>{calls.push(values);return {status:'verified'}}}})
 assert.equal(result.status,'verified');assert.deepEqual(calls.slice(0,3),['admission','closed','admission'])
 assert.deepEqual(calls[3],[5,'address-publish',{baselineId:'address-baseline',addressOperationId:'address-migration',addressPlanHash:'d'.repeat(64),approval:'external/address'}])
})
test('wrong revision, generation, DB, source, plan, active leases and lock are refused before mutation',async()=>{
 const changes=[f=>f.repository.dirty=true,f=>f.repository.head='b'.repeat(40),f=>f.state.generation=6,f=>f.request=async()=>({name:'wrong',type:'FIRESTORE_NATIVE',locationId:'x'}),f=>f.plan.source='wrong-copy',f=>f.plan.revision='b'.repeat(40),f=>f.documents.set(`${control}/recovery/operatorLock`,{owner:'other'}),f=>f.documents.set(`${control}/recovery/authExportLock`,{owner:'other'}),f=>f.listOperations=async()=>[true],f=>f.documents.get(`${source}/_recovery/access`).phase='normal',f=>f.documents.get(`${source}/_recovery/access`).generation=4]
 await assert.doesNotReject(()=>admitDev(fixture()))
 for(const change of changes){const f=fixture();change(f);let mutations=0;await assert.rejects(async()=>{await admitDev(f);mutations++});assert.equal(mutations,0)}
})
test('expected held apply lock is admitted only with exact stopped-worker owner',async()=>{
 const f=fixture();f.options=options(['resume',...args,'--worker-stopped','--expected-owner','owner-123']);f.documents.set(`${control}/recovery/operatorLock`,{operationId:'operation-123',owner:'owner-123',intent:{kind:'default-apply'}})
 await assert.doesNotReject(()=>admitDev(f));f.options['expected-owner']='wrong';await assert.rejects(()=>admitDev(f))
})
test('recover interrupted publication admits exact next/prior pair and retained plan source',async()=>{
 const f=fixture();f.options=options(['recover-operator',...args,'--worker-stopped','--expected-owner','owner-123']);f.plan.status='verified';const prior={...f.state};f.state.phase='verification';f.documents.set(`${control}/recovery/operatorLock`,{operationId:'operation-123',owner:'owner-123',intent:{kind:'default-publish',prior,next:{...f.state},approval:'private:approval'}})
 await assert.doesNotReject(()=>admitDev(f));f.documents.get('(default)/_recovery/access').generation=99;await assert.rejects(()=>admitDev(f))
})
test('D recovery accepts source retired at prior generation and binds held approval',async()=>{
 const f=fixture();f.options=options(['recover-operator',...args,'--worker-stopped','--expected-owner','owner-123']);f.plan.status='verified';f.state.phase='normal';f.state.generation=7;f.options.generation=7
 const prior={...f.state,phase:'verification',generation:6};f.documents.set('(default)/_recovery/access',prior);f.documents.set(`${source}/_recovery/access`,{databaseId:source,phase:'retired',generation:6});f.documents.set(`${control}/recovery/operatorLock`,{operationId:'operation-123',owner:'owner-123',intent:{kind:'default-publish',prior,next:{...f.state},approval:'private:approval'}})
 await assert.doesNotReject(()=>admitDev(f));f.options.approval='wrong:approval';await assert.rejects(()=>admitDev(f))
})
test('infrastructure proof ignores runtime pairing but blocks partial release evidence',async()=>{
 const request=async url=>url.includes('/indexes')?{indexes:[]}:url.includes('/releases')?{rulesetName:'projects/p/rulesets/r'}:{source:{files:[{content:'bytes'}]}}
 const checks=await infrastructureChecks({project:'p',request,expectedRules:{default:'bytes',control:'bytes',controlId:'c'},indexConfig:{indexes:[],fieldOverrides:[]},releaseChecks:async()=>[{id:'functions-release-proof',status:'pass'},{id:'hosting-release-proof',status:'blocked'}]})
 assert.equal(checks.length,5);assert.equal(checks.every(c=>c.status==='pass'),false)
 assert.deepEqual(sanitizeCommand({phase:'verification',generation:6,private:'secret',owner:'private'},'publish'),{mode:'execute',command:'publish',phase:'verification',generation:6})
})
test('closed recovery remains dispatchable during partial deployment; publication still uses the factory exposure guard',async()=>{
 let proofs=0,closedRules=0,writes=0
 const proof=async()=>{proofs++;return false}
 const factory={enter:async()=>{writes++;return {phase:'recovering'}},apply:async()=>{writes++;return {status:'verified'}},recoverOperator:async()=>{writes++;return {status:'aborted-before-application'}},publish:async()=>{if(!await proof())throw Error('deployment blocked');writes++}}
 const dependencies={factory,admission:async()=>{},verifyClosedRules:async()=>{closedRules++}}
 await dispatchDev({command:'enter'},dependencies);await dispatchDev({command:'apply'},dependencies);await dispatchDev({command:'recover-operator'},dependencies)
 assert.equal(writes,3);assert.equal(proofs,0);assert.equal(closedRules,1)
 await assert.rejects(()=>dispatchDev({command:'publish'},dependencies));await assert.rejects(()=>dispatchDev({command:'reopen'},dependencies));assert.equal(writes,3);assert.equal(proofs,2)
 const brokenRules={...dependencies,verifyClosedRules:async()=>{throw Error('rules blocked')}}
 await assert.rejects(()=>dispatchDev({command:'apply'},brokenRules));assert.equal(writes,3)
})
test('A closes admission before existing updates drain; later data/publication operations still require drain',async()=>{
 const f=fixture();f.options.command='enter';f.options.source='(default)';f.state.phase='normal';f.documents.set('(default)/_recovery/access',{...f.state});f.listOperations=async()=>[true];f.documents.set(`${control}/recovery/authExportLock`,{owner:'active'})
 await assert.doesNotReject(()=>admitDev(f))
 const prior={...f.state};f.state.phase='recovering';f.state.generation=6;f.options.generation=6;f.options.command='recover-operator';f.options['worker-stopped']=true;f.options['expected-owner']='owner-123';f.documents.set(`${control}/recovery/operatorLock`,{operationId:'operation-123',owner:'owner-123',intent:{kind:'default-enter',prior,next:{...f.state}}})
 await assert.doesNotReject(()=>admitDev(f))
 f.documents.get(`${control}/recovery/operatorLock`).intent.kind='unknown';await assert.rejects(()=>admitDev(f))
 for(const command of ['plan','apply','publish']){const pending=fixture();pending.options.command=command;pending.listOperations=async()=>[true];pending.documents.set(`${control}/recovery/authExportLock`,{owner:'active'});await assert.rejects(()=>admitDev(pending))}
})
test('already committed publication cleanup permits legitimate active updates but uncommitted exposure does not',async()=>{
 const f=fixture();f.options.command='recover-operator';f.options['worker-stopped']=true;f.options['expected-owner']='owner-123';f.options.generation=7;f.state.generation=7;f.state.phase='normal';f.plan.status='verified';const prior={...f.state,phase:'verification',generation:6}
 f.documents.set('(default)/_recovery/access',{...f.state});f.documents.set(`${source}/_recovery/access`,{databaseId:source,phase:'retired',generation:7});f.documents.set(`${control}/recovery/operatorLock`,{operationId:'operation-123',owner:'owner-123',intent:{kind:'default-publish',prior,next:{...f.state},approval:'private:approval'}});f.listOperations=async()=>[true];f.documents.set(`${control}/recovery/authExportLock`,{owner:'active'})
 await assert.doesNotReject(()=>admitDev(f))
 f.documents.set('(default)/_recovery/access',prior);await assert.rejects(()=>admitDev(f))
})
