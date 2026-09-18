import { normalizePostalLookupCode } from './postal-lookup.mjs'
/** @typedef {import('./postal-lookup.d.mts').PostalLookupProvider} PostalLookupProvider */

const manifestUrl = '/postal-data/manifest.json'

export function createHostedPostalLookupProvider({ fetcher = fetch } = {}) {
  let manifestPromise
  const cache = new Map()
  const loadManifest = async () => {
    if (!manifestPromise) manifestPromise = fetcher(manifestUrl).then(async (response) => {
    if (!response.ok) throw new Error(`postal manifest unavailable: ${response.status}`)
    const manifest = await response.json()
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.shards)) throw new Error('postal manifest invalid')
    return manifest
  })
    return manifestPromise
  }
  return Object.freeze({
    /** @param {{ postalCode: string }} request @returns {Promise<import('./postal-lookup.d.mts').PostalLookupResult>} */
    async lookup({ postalCode }) {
      const normalized = normalizePostalLookupCode(postalCode)
      if (!normalized) return { status: 'not_found' }
      try {
        const manifest = await loadManifest()
        const shardKey = normalized.slice(0, 3)
        const entry = manifest.shards.find((candidate) => candidate.key === shardKey)
        if (!entry) return { status: 'not_found' }
        let rows = cache.get(entry.file)
        if (!rows) {
          const response = await fetcher(`/postal-data/${entry.file}`)
          if (!response.ok) throw new Error(`postal shard unavailable: ${response.status}`)
          const text = await response.text()
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
          const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
          if (hash !== entry.sha256) throw new Error('postal shard integrity mismatch')
          rows = JSON.parse(text)
          if (!Array.isArray(rows) || rows.length !== entry.count) throw new Error('postal shard count mismatch')
          cache.set(entry.file, rows)
        }
        const matches = rows.filter((row) => row.postalCode === normalized)
        if (!matches.length) return { status: 'not_found' }
        if (matches.length > 1) return {
          status: 'ambiguous',
          address: { prefecture: matches[0].prefecture, municipality: matches[0].municipality },
          candidates: matches.map(({ prefecture, municipality, streetTownAndNumber }) => ({ prefecture, municipality, streetTownAndNumber })),
        }
        return { status: 'resolved', address: matches[0] }
      } catch { return { status: 'unavailable' } }
    },
  })
}

export const hostedPostalLookupProvider = createHostedPostalLookupProvider()
