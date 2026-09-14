import type { MasterAddressDraft, MasterType } from './master-form.mjs'

export type PostalLookupSubject = Extract<MasterType, 'property' | 'homeowner' | 'constructionCompany'>
export type PostalLookupAddress = Pick<MasterAddressDraft, 'prefecture' | 'municipality' | 'streetTownAndNumber'>

export type PostalLookupResult =
  | { status: 'resolved'; address: Partial<PostalLookupAddress> }
  | { status: 'ambiguous'; address: Partial<Pick<PostalLookupAddress, 'prefecture' | 'municipality'>> }
  | { status: 'not_found' }
  | { status: 'unavailable' }

export interface PostalLookupProvider {
  lookup(request: { postalCode: string }): Promise<PostalLookupResult>
}

export const unavailablePostalLookupProvider: PostalLookupProvider

export type PostalLookupField = keyof PostalLookupAddress

export type PostalLookupOutcome =
  | { state: 'skipped' }
  | { state: 'stale'; result: PostalLookupResult }
  | { state: 'current'; result: PostalLookupResult; appliedFields: PostalLookupField[] }

export interface PostalLookupCoordinator {
  cancel(): void
  lookup(postalCode?: string): Promise<PostalLookupOutcome>
  markFieldEdited(field: PostalLookupField): void
}

export function normalizePostalLookupCode(value: unknown): string | null
export function supportsPostalLookupSubject(subject: MasterType): subject is PostalLookupSubject
export function createPostalLookupCoordinator(options: {
  subject?: MasterType
  getSubject?: () => MasterType | undefined
  getAddress: () => MasterAddressDraft
  provider?: PostalLookupProvider
  getProvider?: () => PostalLookupProvider | undefined
}): PostalLookupCoordinator
