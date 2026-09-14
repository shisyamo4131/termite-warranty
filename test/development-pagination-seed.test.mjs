import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { buildDevelopmentPaginationSeed, DEVELOPMENT_PROJECT_ID, PAGINATION_SEED_COUNT } from '../scripts/seed-development-pagination-data.mjs'

test('development pagination seed contains 25 consistent fictional relationships', () => {
  const seed = buildDevelopmentPaginationSeed()
  assert.equal(DEVELOPMENT_PROJECT_ID, 'termite-warranty-dev')
  for (const collection of ['constructionCompanies', 'homeowners', 'properties', 'cases']) {
    assert.equal(seed[collection].length, PAGINATION_SEED_COUNT)
    assert.equal(new Set(seed[collection].map(item => item.id)).size, PAGINATION_SEED_COUNT)
  }
  const companies = new Set(seed.constructionCompanies.map(item => item.id))
  const homeowners = new Set(seed.homeowners.map(item => item.id))
  const properties = new Map(seed.properties.map(item => [item.id, item]))
  for (const item of seed.cases) {
    const property = properties.get(item.propertyId)
    assert.ok(property)
    assert.equal(property.homeownerId, item.homeownerId)
    assert.equal(property.constructionCompanyId, item.constructionCompanyId)
    assert.equal(companies.has(item.constructionCompanyId), true)
    assert.equal(homeowners.has(item.homeownerId), true)
    assert.equal(item.responsibleBranchId, seed.branch.id)
    assert.equal(item.warrantyServiceId, seed.warrantyService.id)
    assert.equal(item.notificationStatus, 'not notified')
  }
  assert.equal(seed.constructionCompanies.every(item => item.name.includes('ページ確認')), true)
  assert.equal(seed.homeowners.every(item => item.name.includes('ページ確認')), true)
})

test('development pagination seed workflow is manual, fixed-target, and fail-closed', async () => {
  const workflow = await readFile(new URL('../.github/workflows/seed-development-pagination-data.yml', import.meta.url), 'utf8')
  assert.match(workflow, /workflow_dispatch:/)
  assert.doesNotMatch(workflow, /\n\s+push:/)
  assert.match(workflow, /environment:\s*development/)
  assert.match(workflow, /google-github-actions\/auth@v3/)
  assert.match(workflow, /--apply --confirm=termite-warranty-dev/)
  assert.doesNotMatch(workflow, /continue-on-error|--force/)
})
