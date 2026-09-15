# HSC-035: Case Cancellation and Invalidation Criteria

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Case statuses are `active`, `cancelled`, and `invalid`. Active cases are editable. Cancelled and invalid cases are currently specified to share the following behavior: they are retained rather than physically deleted, are not editable, require a free-text reason, cannot be restored to active, and have no alert effects. The same status set and terminal behavior currently apply to applied warranties.

The business distinction between a cancelled case and an invalid case, including the events and criteria that lead to each status, is not confirmed.

## Questions

1. Which business events and criteria should result in a case being cancelled versus invalidated?
2. Should the system adopt the following clearly labeled proposed interpretation: cancellation means a valid case that was later terminated, while invalidation means an erroneous or duplicate case that should not have been valid? If not, what definitions should be used?
3. Should the same cancellation/invalidation distinction and criteria apply to applied warranties within a case?
4. Should display, search, reporting, or reason categories differ between cancelled and invalid cases?

## Recommended Proposal or Working Interpretation — Awaiting House Solution Decision

- Proposed interpretation for discussion only: use `cancelled` for a case that was valid but later terminated, and `invalid` for an erroneous or duplicate case that should not have been valid.
- Keep both statuses retained, non-editable, reason-required, non-restorable, and excluded from alert eligibility unless House Solution confirms different lifecycle or alert behavior.
- Preserve a free-text reason for both statuses, with distinct reason categories or reporting treatment only if House Solution confirms that the operational distinction is needed.
- Apply the same distinction to applied warranties only after House Solution confirms that warranty-level cancellation and invalidation have the same business meaning.

This proposal is explicitly awaiting decision and must not be promoted into the specification, data contract, or implementation before confirmation.

## Affected Documents

- [Initial data model](../initial-data-model.md), especially case and applied-warranty lifecycle requirements.
- [Case warranties](../case-warranties.md), especially terminal applied-warranty states and alert eligibility.
- Current specification and any case search, display, reporting, validation, and user-explanation requirements affected by the confirmed distinction.
- Related implementation, data-contract, and test surfaces after the decision is confirmed.
