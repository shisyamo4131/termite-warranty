const REMOVED_CHARACTER_PATTERN = /[~*\[\].\s]/gu
const SURROGATE_PAIR_PATTERN = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g
const HIRAGANA_PATTERN = /[\u3041-\u3096\u309D\u309E]/g
const LATIN_PATTERN = /\p{Script=Latin}/gu

export function normalizeSearchText(value) {
  if (typeof value !== 'string') {
    throw new TypeError('search text must be a string')
  }

  return value
    .normalize('NFKC')
    .replace(LATIN_PATTERN, (character) => character.toLowerCase())
    .replace(HIRAGANA_PATTERN, (character) =>
      String.fromCharCode(character.charCodeAt(0) + 0x60),
    )
    .replace(SURROGATE_PAIR_PATTERN, '')
    .replace(REMOVED_CHARACTER_PATTERN, '')
}

export function generateSearchTokens(value) {
  const normalized = normalizeSearchText(value)
  const oneCharacter = new Set()
  const twoCharacter = new Set()

  for (let index = 0; index < normalized.length; index += 1) {
    oneCharacter.add(normalized[index])
    if (index + 1 < normalized.length) {
      twoCharacter.add(normalized.slice(index, index + 2))
    }
  }

  return Object.freeze({
    normalized,
    oneCharacter: Object.freeze([...oneCharacter]),
    twoCharacter: Object.freeze([...twoCharacter]),
  })
}

export function createSearchPlan(value) {
  const tokens = generateSearchTokens(value)
  if (tokens.normalized.length < 2) {
    throw new RangeError('search text must contain at least two normalized characters')
  }

  return Object.freeze({
    normalized: tokens.normalized,
    requiredTwoCharacterTokens: tokens.twoCharacter,
  })
}
