import { generateSearchTokens } from './search-tokens.mjs'

export const MASTER_TYPES = Object.freeze({
  CONSTRUCTION_COMPANY: 'constructionCompany',
  HOMEOWNER: 'homeowner',
  WARRANTY_SERVICE: 'warrantyService',
  PROPERTY: 'property',
})

const MASTER_TYPE_VALUES = Object.freeze(Object.values(MASTER_TYPES))
const BASE_FIELDS = Object.freeze(['name'])
const CONSTRUCTION_COMPANY_FIELDS = Object.freeze([
  'name', 'address', 'telephone', 'fax', 'contactPerson', 'contactDetails', 'notes',
])
const HOMEOWNER_FIELDS = Object.freeze(['name', 'address', 'telephone', 'fax', 'notes'])
const PROPERTY_FIELDS = Object.freeze(['name', 'homeownerId', 'constructionCompanyId', 'address', 'notes'])
const WARRANTY_FIELDS = Object.freeze(['name', 'shortName', 'defaultPeriodYears', 'notes'])
const ADDRESS_FIELDS = Object.freeze([
  'postalCode',
  'prefecture',
  'municipality',
  'streetTownAndNumber',
  'buildingName',
])
const shortNameSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
  : null

export const countDisplayCharacters = value => {
  const normalized = String(value ?? '').normalize('NFC')
  return shortNameSegmenter
    ? [...shortNameSegmenter.segment(normalized)].length
    : Array.from(normalized).length
}

export class MasterDataError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'MasterDataError'
    this.code = code
  }
}

const invalid = (message) => {
  throw new MasterDataError('invalid-argument', message)
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const assertOnlyKeys = (value, allowed, label) => {
  if (!isPlainObject(value)) invalid(`${label} must be an object.`)
  const keys = Object.keys(value)
  if (keys.length !== allowed.length || keys.some((key) => !allowed.includes(key))) {
    invalid(`${label} contains missing or unsupported fields.`)
  }
}

const requiredText = (value, label) => {
  if (typeof value !== 'string' || value.trim().length === 0) invalid(`${label} is required.`)
  return value.trim()
}

const nullableText = (value, label) => {
  if (value === null || value === '') return null
  if (typeof value !== 'string') invalid(`${label} must be text or null.`)
  return value.trim() || null
}

const normalizeAddress = (address) => {
  assertOnlyKeys(address, ADDRESS_FIELDS, 'address')
  if (typeof address.postalCode !== 'string') invalid('Postal code is required.')
  const postalCode = address.postalCode.replace('-', '')
  if (!/^\d{7}$/.test(postalCode)) invalid('Postal code must contain seven digits with an optional hyphen.')
  return {
    postalCode,
    prefecture: requiredText(address.prefecture, 'Prefecture'),
    municipality: requiredText(address.municipality, 'Municipality'),
    streetTownAndNumber: requiredText(address.streetTownAndNumber, 'Street/town and number'),
    buildingName: nullableText(address.buildingName, 'Building name'),
  }
}

export const assertMasterType = (value) => {
  if (!MASTER_TYPE_VALUES.includes(value)) invalid('Unsupported master type.')
  return value
}

export const normalizeDocumentId = (value) => requiredText(value, 'Document ID')

export const createNameSearch = (name) => {
  const tokens = generateSearchTokens(name)
  if (tokens.normalized.length === 0) invalid('Name must contain searchable characters.')
  return {
    normalized: tokens.normalized,
    one: Object.fromEntries(tokens.oneCharacter.map((token) => [token, true])),
    two: Object.fromEntries(tokens.twoCharacter.map((token) => [token, true])),
  }
}

export function normalizeMasterFields(masterType, fields) {
  assertMasterType(masterType)
  const allowed = masterType === MASTER_TYPES.PROPERTY
    ? PROPERTY_FIELDS
    : masterType === MASTER_TYPES.CONSTRUCTION_COMPANY
      ? CONSTRUCTION_COMPANY_FIELDS
      : masterType === MASTER_TYPES.WARRANTY_SERVICE
        ? WARRANTY_FIELDS
        : masterType === MASTER_TYPES.HOMEOWNER
          ? HOMEOWNER_FIELDS
          : BASE_FIELDS
  assertOnlyKeys(fields, allowed, 'fields')
  const name = requiredText(fields.name, 'Name')

  if (masterType === MASTER_TYPES.WARRANTY_SERVICE) {
    if (!Number.isInteger(fields.defaultPeriodYears) || fields.defaultPeriodYears < 1) {
      invalid('Default warranty period must be a positive integer.')
    }
    const shortName = requiredText(fields.shortName, 'Short name')
    if (countDisplayCharacters(shortName) > 6) invalid('略称は6文字以内で入力してください。')
    return {
      name,
      shortName,
      defaultPeriodYears: fields.defaultPeriodYears,
      notes: nullableText(fields.notes, 'Notes'),
    }
  }

  if (masterType === MASTER_TYPES.CONSTRUCTION_COMPANY) {
    return {
      name,
      address: normalizeAddress(fields.address),
      telephone: nullableText(fields.telephone, 'Telephone'),
      fax: nullableText(fields.fax, 'Fax'),
      contactPerson: nullableText(fields.contactPerson, 'Contact person'),
      contactDetails: nullableText(fields.contactDetails, 'Contact details'),
      notes: nullableText(fields.notes, 'Notes'),
      nameSearch: createNameSearch(name),
    }
  }

  if (masterType === MASTER_TYPES.PROPERTY) {
    return {
      name,
      homeownerId: requiredText(fields.homeownerId, 'Homeowner'),
      constructionCompanyId: requiredText(fields.constructionCompanyId, 'Construction company'),
      address: normalizeAddress(fields.address),
      notes: nullableText(fields.notes, 'Notes'),
      nameSearch: createNameSearch(name),
    }
  }

  if (masterType === MASTER_TYPES.HOMEOWNER) {
    return {
      name,
      address: normalizeAddress(fields.address),
      telephone: nullableText(fields.telephone, 'Telephone'),
      fax: nullableText(fields.fax, 'Fax'),
      notes: nullableText(fields.notes, 'Notes'),
      nameSearch: createNameSearch(name),
    }
  }

  return { name, nameSearch: createNameSearch(name) }
}

export function masterFieldMigrationPatch(collectionName, data) {
  if (!isPlainObject(data)) invalid('Master data must be an object.')
  if (collectionName === 'warrantyServices') {
    const patch = {}
    if (typeof data.shortName !== 'string' || data.shortName.trim().length === 0) {
      const shortName = requiredText(data.name, 'Name')
      if (countDisplayCharacters(shortName) > 6) invalid('A short name of six displayed characters or fewer must be selected manually.')
      patch.shortName = shortName
    } else if (countDisplayCharacters(data.shortName.trim()) > 6) {
      invalid('A short name of six displayed characters or fewer must be selected manually.')
    }
    return Object.keys(patch).length > 0 ? patch : null
  }
  invalid('Unsupported migration collection.')
}

export function parseCreateMasterRequest(input) {
  assertOnlyKeys(input, ['masterType', 'fields'], 'request')
  const masterType = assertMasterType(input.masterType)
  return { masterType, fields: normalizeMasterFields(masterType, input.fields) }
}

export function parseUpdateMasterRequest(input) {
  assertOnlyKeys(input, ['masterType', 'id', 'fields'], 'request')
  const masterType = assertMasterType(input.masterType)
  return {
    masterType,
    id: normalizeDocumentId(input.id),
    fields: normalizeMasterFields(masterType, input.fields),
  }
}

export function parseSetMasterActiveRequest(input) {
  assertOnlyKeys(input, ['masterType', 'id', 'active'], 'request')
  const masterType = assertMasterType(input.masterType)
  if (typeof input.active !== 'boolean') invalid('active must be boolean.')
  return {
    masterType,
    id: normalizeDocumentId(input.id),
    active: input.active,
  }
}
