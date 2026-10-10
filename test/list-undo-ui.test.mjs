import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../app/components/MeetingPrototype.vue', import.meta.url), 'utf8')
const save = source.split('\n').find(line => line.startsWith('async function saveProperty('))
const code = ts.transpileModule(save, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

test('each list admits only its own existing operations', async () => {
  for (const [mode, allowed] of Object.entries({report:['undoReport'],certificate:['undoCertificate'],billing:['bill','undoBill','confirmUnbilled'],insurance:[],warranty:['notify']})) {
    for (const action of ['undoReport','undoCertificate','bill','undoBill','confirmUnbilled','notify','extend','cancel','save']) {
      let entered = false
      const invoke = new Function('noticeMode','run',`${code}; return saveProperty;`)({value:mode}, async () => { entered=true })
      await invoke(action)
      assert.equal(entered, allowed.includes(action), `${mode}/${action}`)
    }
  }
})
test('list undo controls require staff, active property, and writable recovery state', () => {
  const certificate = source.match(/:allow-certificate-undo="([^"]+)"/)[1]
  const insurance = source.match(/<template v-if="([^"]+)" #insurance-actions>/)[1]
  for (const [expression, target] of [[certificate,'certificate'],[insurance,'report']]) {
    const visible = new Function('noticeMode','recoveryReadOnly','staff','current',`return Boolean(${expression})`)
    for (const mode of ['',target,'billing','insurance','warranty']) {
      assert.equal(visible(mode,false,true,{status:'active',insuranceLastReport:{}}), mode==='' || mode===target)
    }
    assert.equal(visible(target,true,true,{status:'active',insuranceLastReport:{}}),false)
    assert.equal(visible(target,false,false,{status:'active',insuranceLastReport:{}}),false)
    assert.equal(visible(target,false,true,{status:'cancelled',insuranceLastReport:{}}),false)
  }
})
