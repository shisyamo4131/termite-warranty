import { generateSearchTokens } from './search-tokens.mjs'

export const MASTER_TYPES = Object.freeze({
  CONSTRUCTION_COMPANY: 'constructionCompany',
  HOMEOWNER: 'homeowner',
  WARRANTY_SERVICE: 'warrantyService',
  PROPERTY: 'property',
})

const MASTER_TYPE_VALUES = Object.freeze(Object.values(MASTER_TYPES))
const BASE_FIELDS = Object.freeze(['name'])
const PROPERTY_FIELDS = Object.freeze(['name', 'homeownerId', 'constructionCompanyId', 'address'])
const WARRANTY_FIELDS = Object.freeze(['name', 'defaultPeriodYears'])
const ADDRESS_FIELDS = Object.freeze([
  'postalCode',
  'prefecture',
  'municipality',
  'streetTownAndNumber',
  'buildingName',
])

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

export const assertMasterType = (value) => {
  if (!MASTER_TYPE_VALUES.includes(value)) invalid('Unsupported master type.')
  return value
}

export const normalizeDocumentId = (value) => requiredText(value, 'Document ID')

export const normalizeExpectedRevision = (value) => {
  if (!Number.isInteger(value) || value < 1) invalid('expectedRevision must be a positive integer.')
  return value
}

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
    : masterType === MASTER_TYPES.WARRANTY_SERVICE
      ? WARRANTY_FIELDS
      : BASE_FIELDS
  assertOnlyKeys(fields, allowed, 'fields')
  const name = requiredText(fields.name, 'Name')

  if (masterType === MASTER_TYPES.WARRANTY_SERVICE) {
    if (!Number.isInteger(fields.defaultPeriodYears) || fields.defaultPeriodYears < 1) {
      invalid('Default warranty period must be a positive integer.')
    }
    return { name, defaultPeriodYears: fields.defaultPeriodYears }
  }

  if (masterType === MASTER_TYPES.PROPERTY) {
    assertOnlyKeys(fields.address, ADDRESS_FIELDS, 'address')
    if (typeof fields.address.postalCode !== 'string') invalid('Postal code is required.')
    const postalCode = fields.address.postalCode.replace('-', '')
    if (!/^\d{7}$/.test(postalCode)) invalid('Postal code must contain seven digits with an optional hyphen.')
    return {
      name,
      homeownerId: requiredText(fields.homeownerId, 'Homeowner'),
      constructionCompanyId: requiredText(fields.constructionCompanyId, 'Construction company'),
      address: {
        postalCode,
        prefecture: requiredText(fields.address.prefecture, 'Prefecture'),
        municipality: requiredText(fields.address.municipality, 'Municipality'),
        streetTownAndNumber: requiredText(fields.address.streetTownAndNumber, 'Street/town and number'),
        buildingName: nullableText(fields.address.buildingName, 'Building name'),
      },
      nameSearch: createNameSearch(name),
    }
  }

  return { name, nameSearch: createNameSearch(name) }
}

export function parseCreateMasterRequest(input) {
  assertOnlyKeys(input, ['masterType', 'fields'], 'request')
  const masterType = assertMasterType(input.masterType)
  return { masterType, fields: normalizeMasterFields(masterType, input.fields) }
}

export function parseUpdateMasterRequest(input) {
  assertOnlyKeys(input, ['masterType', 'id', 'expectedRevision', 'fields'], 'request')
  const masterType = assertMasterType(input.masterType)
  return {
    masterType,
    id: normalizeDocumentId(input.id),
    expectedRevision: normalizeExpectedRevision(input.expectedRevision),
    fields: normalizeMasterFields(masterType, input.fields),
  }
}

export function parseSetMasterActiveRequest(input) {
  assertOnlyKeys(input, ['masterType', 'id', 'expectedRevision', 'active'], 'request')
  const masterType = assertMasterType(input.masterType)
  if (typeof input.active !== 'boolean') invalid('active must be boolean.')
  return {
    masterType,
    id: normalizeDocumentId(input.id),
    expectedRevision: normalizeExpectedRevision(input.expectedRevision),
    active: input.active,
  }
}
