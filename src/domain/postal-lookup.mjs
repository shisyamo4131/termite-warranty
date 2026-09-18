const LOOKUP_SUBJECTS = new Set(['property', 'homeowner', 'constructionCompany'])
const WRITABLE_FIELDS = ['prefecture', 'municipality', 'streetTownAndNumber']

export function normalizePostalLookupCode(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^\d{3}-?\d{4}$/.test(trimmed)) return null
  return trimmed.replace('-', '')
}

export function supportsPostalLookupSubject(subject) {
  return LOOKUP_SUBJECTS.has(subject)
}

const unavailableResult = () => ({ status: 'unavailable' })

export const unavailablePostalLookupProvider = Object.freeze({
  lookup: async () => unavailableResult(),
})

function safeResult(result) {
  if (!result || typeof result !== 'object') return unavailableResult()
  if (result.status === 'not_found' || result.status === 'unavailable') {
    return { status: result.status }
  }
  if (result.status !== 'resolved' && result.status !== 'ambiguous') return unavailableResult()

  const address = {}
  const allowedFields = result.status === 'ambiguous'
    ? ['prefecture', 'municipality']
    : WRITABLE_FIELDS
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(result.address ?? {}, field) && typeof result.address[field] === 'string') {
      const value = result.address[field].trim()
      if (value !== '') address[field] = value
    }
  }
  const candidates = result.status === 'ambiguous' && Array.isArray(result.candidates)
    ? result.candidates.map((candidate) => {
      const value = {}
      for (const field of WRITABLE_FIELDS) {
        if (typeof candidate?.[field] === 'string' && candidate[field].trim()) value[field] = candidate[field].trim()
      }
      return value
    }).filter((candidate) => Object.keys(candidate).length > 0)
    : undefined
  return Object.keys(address).length > 0
    ? { status: result.status, address, ...(candidates ? { candidates } : {}) }
    : unavailableResult()
}

export function createPostalLookupCoordinator({ subject, getSubject, getAddress, provider, getProvider }) {
  let generation = 0
  const fieldVersions = Object.fromEntries(WRITABLE_FIELDS.map((field) => [field, 0]))
  const resolveSubject = getSubject ?? (() => subject)
  const resolveProvider = getProvider ?? (() => provider)

  const cancel = () => {
    generation += 1
  }

  const markFieldEdited = (field) => {
    if (Object.hasOwn(fieldVersions, field)) fieldVersions[field] += 1
  }

  const lookup = async (postalCode = getAddress().postalCode) => {
    const requestGeneration = ++generation
    const normalizedPostalCode = normalizePostalLookupCode(postalCode)
    const requestSubject = resolveSubject()
    const requestProvider = resolveProvider()
    if (!normalizedPostalCode || !supportsPostalLookupSubject(requestSubject) || !requestProvider) {
      return { state: 'skipped' }
    }

    const dispatchAddress = getAddress()
    const baseline = Object.fromEntries(WRITABLE_FIELDS.map((field) => [
      field,
      { value: dispatchAddress[field], version: fieldVersions[field] },
    ]))

    let result
    try {
      result = safeResult(await requestProvider.lookup({ postalCode: normalizedPostalCode }))
    } catch {
      result = unavailableResult()
    }

    const currentAddress = getAddress()
    if (
      requestGeneration !== generation
      || resolveSubject() !== requestSubject
      || resolveProvider() !== requestProvider
      || normalizePostalLookupCode(currentAddress.postalCode) !== normalizedPostalCode
    ) {
      return { state: 'stale', result }
    }

    const appliedFields = []
    if (result.status === 'resolved' || result.status === 'ambiguous') {
      for (const [field, value] of Object.entries(result.address)) {
        if (
          baseline[field]
          && fieldVersions[field] === baseline[field].version
          && currentAddress[field] === baseline[field].value
        ) {
          currentAddress[field] = value
          appliedFields.push(field)
        }
      }
    }

    return { state: 'current', result, appliedFields }
  }

  return { cancel, lookup, markFieldEdited }
}
