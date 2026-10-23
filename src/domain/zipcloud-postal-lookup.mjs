import { normalizePostalLookupCode } from './postal-lookup.mjs'

// Application safety ceiling, not a claimed service quota.
const RESULT_LIMIT = 1000
export function createZipcloudPostalLookupProvider({ fetcher = fetch, timeoutMs = 8000 } = {}) {
  return Object.freeze({
    /** @returns {Promise<import('./postal-lookup.d.mts').PostalLookupResult>} */
    async lookup({ postalCode }) {
      const code = normalizePostalLookupCode(postalCode)
      if (!code) return { status: 'not_found' }
      const controller = new AbortController()
      let timer
      try {
        const data = await Promise.race([
          (async () => {
            const response = await fetcher(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}&limit=${RESULT_LIMIT}`, {
              signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
              cache: 'no-store', redirect: 'error',
            })
            if (!response.ok) throw new Error('Lookup unavailable')
            return response.json()
          })(),
          new Promise((_, reject) => {
            timer = setTimeout(() => { controller.abort(); reject(new Error('Lookup timed out')) }, timeoutMs)
          }),
        ])
        if (data?.status !== 200) return { status: 'unavailable' }
        if (data.results === null || (Array.isArray(data.results) && data.results.length === 0)) return { status: 'not_found' }
        // Do not silently show a potentially truncated candidate list.
        if (!Array.isArray(data.results) || data.results.length >= RESULT_LIMIT) return { status: 'unavailable' }
        const candidates = []
        for (const row of data.results) {
          if (row?.zipcode !== code || !['address1', 'address2', 'address3'].every(key =>
            typeof row[key] === 'string' && row[key].length <= 200)
            || !row.address1.trim() || !row.address2.trim()) return { status: 'unavailable' }
          const address = {
            prefecture: row.address1.trim(), municipality: row.address2.trim(), streetTownAndNumber: row.address3.trim(),
          }
          if (!candidates.some(candidate => JSON.stringify(candidate) === JSON.stringify(address))) candidates.push(address)
        }
        if (candidates.length === 1) return { status: 'resolved', address: candidates[0] }
        // The UI selects a whole candidate. Never infer a shared city from the first row.
        return { status: 'ambiguous', address: {}, candidates }
      } catch {
        return { status: 'unavailable' }
      } finally {
        clearTimeout(timer)
      }
    },
  })
}

export const zipcloudPostalLookupProvider = createZipcloudPostalLookupProvider()
