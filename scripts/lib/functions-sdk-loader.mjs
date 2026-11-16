// Tests share the same SDK instances as the actual Functions package.
let packageUrl, modulesUrl
export function initialize(data) {
  packageUrl = data.packageUrl
  modulesUrl = new URL('./node_modules/', packageUrl).href
}
export async function resolve(specifier, context, nextResolve) {
  if (/^firebase-(admin|functions)(\/|$)/.test(specifier)) {
    // Preserve native ESM conditions; require.resolve selects a different
    // firebase-functions implementation and would mask production behavior.
    const result = await nextResolve(specifier, { ...context, parentURL: packageUrl })
    if (!result.url.startsWith(modulesUrl)) throw Error('Functions SDK is not installed; refusing root dependency fallback.')
    return result
  }
  return nextResolve(specifier, context)
}
