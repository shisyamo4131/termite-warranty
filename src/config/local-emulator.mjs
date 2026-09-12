export const LOCAL_RUNTIME = Object.freeze({
  host: '127.0.0.1',
  nuxtPort: 23600,
  workbenchPreviewPort: 23610,
  authPort: 29099,
  firestorePort: 28080,
  functionsPort: 25001,
  emulatorUiPort: 24000,
  emulatorHubPort: 24400,
  emulatorLoggingPort: 24500,
})

export const localRuntimeUrl = (port) => `http://${LOCAL_RUNTIME.host}:${port}`
export const localRuntimeHost = (port) => `${LOCAL_RUNTIME.host}:${port}`

export const resolveDedicatedEmulatorHost = (environmentValue, port, variableName) => {
  const expected = localRuntimeHost(port)
  if (environmentValue !== undefined && environmentValue !== expected) {
    throw new Error(`${variableName} must be ${expected}; received ${environmentValue}.`)
  }
  return expected
}
