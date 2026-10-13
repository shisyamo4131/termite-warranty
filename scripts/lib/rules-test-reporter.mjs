import {Readable} from 'node:stream'
import {spec} from 'node:test/reporters'
import {rulesWorker,rulesEventResult,assertRulesResult} from './rules-test-plan.mjs'

export default async function* rulesReporter(source) {
  const worker=rulesWorker(process.env.RULES_TEST_WORKER),events=[]
  async function* observed() {
    for await(const event of source) {
      if(['test:pass','test:fail'].includes(event.type))events.push(event)
      yield event
    }
  }
  yield* Readable.from(observed()).compose(new spec())
  const result=rulesEventResult(events,worker,process.cwd())
  yield 'RULES_WORKER_RESULT '+JSON.stringify({worker:worker.id,nonce:process.env.FOCUSED_TEST_NONCE,...result})+'\n'
  assertRulesResult(result,worker)
}
