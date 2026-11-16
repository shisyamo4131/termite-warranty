import assert from 'node:assert/strict'
import {test} from 'node:test'
import {existsSync} from 'node:fs'
test('ordinary Dev, Prod and PR integration Actions are retired; recovery workflows remain separate',()=>{
 for(const name of ['deploy-production.yml','deploy-development-manual.yml','deploy-development.yml'])assert.equal(existsSync(new URL('../.github/workflows/'+name,import.meta.url)),false)
 assert.equal(existsSync(new URL('../.github/workflows/deploy-production-bootstrap.yml',import.meta.url)),true)
})
