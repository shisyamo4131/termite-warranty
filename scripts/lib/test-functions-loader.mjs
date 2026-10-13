let source, target
export function initialize(data) { ({ source, target } = data) }
export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context)
  return result.url.startsWith(source) ? { ...result, url: target + result.url.slice(source.length) } : result
}
