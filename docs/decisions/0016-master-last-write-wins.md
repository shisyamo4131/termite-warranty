# 0016 Master Last-write-wins

- Date: 2026-09-12
- Status: Accepted
- Related specification: [Master management](../requirements/master-management.md#master-update-concurrency)
- Supersedes: The optimistic-revision rejection rule for master update, inactivation, and reactivation in the prototype data contract

## Context

The prototype assigns each managed master a revision and rejects a write when its expected revision is stale. The edit dialog currently receives live master updates while it is open, which also makes the intended conflict behavior difficult to explain consistently. House Solution selected last-write-wins as the basic rule for master changes.

## Decision

Master update, inactivation, and reactivation use last-write-wins. The last trusted mutation that commits is retained. A mutation must not be rejected solely because the master changed after the user opened the form.

This decision is limited to master changes. Existing stale-baseline protection for case and applied-warranty multi-record workflows remains unchanged until separately decided.

## Rationale

Master forms are ordinary administrative edits, and the selected operating rule favors accepting the latest submitted change over presenting a conflict-resolution workflow.

## Alternatives

- Reject stale master writes using optimistic revisions: superseded for master changes.
- Field-by-field automatic merge: not selected because it introduces additional rules and can combine changes into a state that no user submitted.

## Impact

- Remove expected-revision rejection from trusted master update and lifecycle operations.
- A revision or update timestamp may remain for diagnostics and ordering, but not as a rejection precondition.
- Concurrent full-form edits can overwrite earlier field changes; this is the accepted consequence of last-write-wins.
- Update UI messaging, callable request contracts, Firestore data contract, and concurrency tests.

## Migration

Existing revision fields may remain. No stored master data rewrite is required merely to stop using revision as a precondition.

## Reconsider When

Reconsider if House Solution requires change review, field-level merging, audit history, or protection for specific high-impact master fields.
