import { TEST_RUNTIME, testRuntimeHost, isIsolatedTestEnvironment } from '../../functions/test-emulator-profile.js'
if (!isIsolatedTestEnvironment()) throw Error('Tests require the runner-owned disposable emulator; user Local is refused.')
export { TEST_RUNTIME as LOCAL_RUNTIME, testRuntimeHost as localRuntimeHost }
export const localRuntimeUrl = port => `http://${testRuntimeHost(port)}`
