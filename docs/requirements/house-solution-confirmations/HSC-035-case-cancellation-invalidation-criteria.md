# HSC-035: Case Cancellation and Invalidation Criteria

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Case statuses are `active`, `cancelled`, and `invalid`. Active cases are editable. Cancelled and invalid cases are currently specified to share the following behavior: they are retained rather than physically deleted, are not editable, require a free-text reason, cannot be restored to active, and have no alert effects. The same status set and terminal behavior currently apply to applied warranties.

The business distinction between a cancelled case and an invalid case, including the events and criteria that lead to each status, is not confirmed.

Any currently reported UI presentation of these statuses is not, by itself, a confirmed business rule. If observed UI behavior differs from the confirmed specification, the specification remains authoritative until the discrepancy is reviewed.

The current prototype appears to expose a general case-status selector containing `active`, `cancelled`, and `invalid` in `app/components/CaseEditDialog.vue` (and a similar applied-warranty selector in `app/components/AppliedWarrantyDialog.vue`). That implementation behavior conflicts with the confirmed non-restoration and non-editability requirements for terminal records; it is recorded here as an unresolved implementation discrepancy, not as an approved exception.

## Questions

1. Which business events and criteria should result in a case being cancelled versus invalidated?
2. Should the system adopt the following clearly labeled proposed interpretation: cancellation means a normally valid case that was actually cancelled, for example during a cooling-off period, while invalidation means an erroneous or duplicate registration that should not have been established? If not, what definitions should be used?
3. Should the same cancellation/invalidation distinction and criteria apply to applied warranties within a case?
4. Should display, search, reporting, or reason categories differ between cancelled and invalid cases?

## Recommended Proposal or Working Interpretation — Awaiting House Solution Decision

- Project recommendation for discussion only: use `cancelled` for a normally valid case that was actually cancelled, for example during a cooling-off period. Use `invalid` for an erroneous or duplicate registration that should not have been established.
- Do not infer additional transition, restoration, or UI rules from these proposed definitions. Retain only the behavior already confirmed in the authoritative requirements until House Solution decides whether the business distinction changes any of it.
- Preserve a free-text reason for both statuses, with distinct reason categories or reporting treatment only if House Solution confirms that the operational distinction is needed.
- Apply the same distinction to applied warranties only after House Solution confirms that warranty-level cancellation and invalidation have the same business meaning.

This proposal is explicitly awaiting decision and must not be promoted into the specification, data contract, or implementation before confirmation.

## Affected Documents

- [Initial data model](../initial-data-model.md), especially case and applied-warranty lifecycle requirements.
- [Case warranties](../case-warranties.md), especially terminal applied-warranty states and alert eligibility.
- Current specification and any case search, display, reporting, validation, and user-explanation requirements affected by the confirmed distinction.
- Related implementation, data-contract, and test surfaces after the decision is confirmed.
