import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSearchPlan,
  generateSearchTokens,
  normalizeSearchText,
} from '../src/domain/search-tokens.mjs'

test('normalization applies NFKC, Latin lowercase, and katakana conversion', () => {
  assert.equal(normalizeSearchText('ＡＢｃ É しろあり'), 'abcéシロアリ')
  assert.equal(normalizeSearchText('くゝ くゞ'), 'クヽクヾ')
})

test('normalization removes specified punctuation, whitespace, and surrogate pairs', () => {
  assert.equal(normalizeSearchText('白~蟻* [保].証\n😀'), '白蟻保証')
})

test('hyphens remain in normalized text', () => {
  assert.equal(normalizeSearchText('Ａ-Ｂ'), 'a-b')
})

test('one- and two-character tokens are unique and ordered by first appearance', () => {
  assert.deepEqual(generateSearchTokens('あいうあ'), {
    normalized: 'アイウア',
    oneCharacter: ['ア', 'イ', 'ウ'],
    twoCharacter: ['アイ', 'イウ', 'ウア'],
  })
})

test('search requires two normalized characters and ANDs all bigrams', () => {
  assert.deepEqual(createSearchPlan(' しろあり '), {
    normalized: 'シロアリ',
    requiredTwoCharacterTokens: ['シロ', 'ロア', 'アリ'],
  })
  assert.throws(() => createSearchPlan(' あ '), RangeError)
})

test('exactly two normalized characters are accepted', () => {
  assert.deepEqual(createSearchPlan('ＡＢ'), {
    normalized: 'ab',
    requiredTwoCharacterTokens: ['ab'],
  })
})
