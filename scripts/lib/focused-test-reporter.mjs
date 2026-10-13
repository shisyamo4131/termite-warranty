import {focusedProfile,focusedEventResult,assertFocusedResult} from '../test-rules-focused.mjs'
import {Readable} from 'node:stream'
import {spec} from 'node:test/reporters'

export default async function* focusedReporter(source) {
  const profile=focusedProfile(process.env.FOCUSED_TEST_PROFILE),events=[]
  async function* observed() {
    for await(const event of source) {
      if(['test:pass','test:fail'].includes(event.type))events.push(event)
      yield event
    }
  }
  // Keep Node's ordinary failure details, so a failed focused run needs no diagnostic rerun.
  yield* Readable.from(observed()).compose(new spec())
  const result=focusedEventResult(events,profile,process.cwd())
  yield 'FOCUSED_RESULT '+JSON.stringify({profile:process.env.FOCUSED_TEST_PROFILE,nonce:process.env.FOCUSED_TEST_NONCE,...result})+'\n'
  assertFocusedResult(result)
}
