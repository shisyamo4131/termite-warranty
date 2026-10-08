export function isolatedImportDatabase(getFirestore, app, id) {
  if (app.options.projectId !== 'demo-termite-warranty' || !['test-external-keys','test-import-volume'].includes(id)) {
    throw new Error('Isolated import tests cannot access shared databases.')
  }
  return getFirestore(app, id)
}
export const isolatedImportAuth = new Proxy(Object.freeze({}), {
  get() { throw new Error('Isolated import tests cannot access shared Auth.') },
})
