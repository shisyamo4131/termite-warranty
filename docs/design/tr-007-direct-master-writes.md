# TR-007 Direct Master Writes

- Status: Implemented and independently accepted
- Date: 2026-09-12
- Roadmap: [TR-007](../roadmaps/technical-remediation.md#tr-007-replace-master-cud-callables-with-direct-firestore-writes)
- Baseline: `cca2c5194dff415dc6ac6a61b3cd9d689831e5ec` on `codex/tr-007-direct-master-writes`

## Objective

Remove the unnecessary Callable boundary and its invocation cost from construction-company, homeowner, property, and warranty-service create/update/lifecycle operations while preserving the approved enabled-staff and data-integrity boundary in Firestore Rules.

## Design

- `useMasterManagement` normalizes the submitted business fields with the shared domain mapper and writes the canonical fields directly through the Firestore Web SDK.
- Create uses a generated document reference, `active: true`, `revision: 1`, and server timestamps in one write.
- Update and lifecycle writes use Firestore's atomic `increment(1)` transform and server timestamp. The revision remains write-order diagnostic metadata, is not read before writing, is not returned, and is never a stale-write precondition. This avoids a transaction and an extra billed read while preserving compatibility with existing documents.
- Rules require an enabled authenticated staff account, exact collection-specific shapes for normal edits, basic types, immutable `createdAt`, `updatedAt == request.time`, a safe one-step revision increment, property-reference existence and active references for active properties, and no physical deletion. A lifecycle-only update may change only `active`, `revision`, and `updatedAt`; this narrow path lets a valid-revision legacy record be inactivated or reactivated without admitting unrelated field changes. Property reactivation still requires active references.
- Rules validate the N-Gram container shape but intentionally do not prove semantic equality with the name, matching ADR 0018's accepted provisional risk.
- Remove the three master Callable exports, their server transaction module, and obsolete Callable/server-transaction tests. Keep profile, case-registration, and applied-warranty Callables.

Existing master documents retain their revision. A legacy master with valid revision metadata may use only the lifecycle path until its business fields are brought to the current shape. A legacy master without valid revision metadata remains readable but must be repaired through an explicitly authorized data procedure before it can be edited or change lifecycle state; no migration is added here.

## Validation

- Shared mapper/token unit tests and application type/build gates.
- Emulator Rules tests for all four direct creates, update/lifecycle, revision transforms, exact shape, disabled staff, property references, physical deletion, and representative concurrency.
- Retained Callable Emulator regression for profile, case registration, and applied warranties.
- Functions syntax/preparation confirms removed master code is absent and retained Callables load.
- No external deployment or data mutation.

## Rollback

Revert the TR-007 commit. No stored data migration is required because the retained document shape and revision field are compatible with the former Callable implementation.

## Subsequent Disposition

TR-008 removes the unused profile Callable after confirming that the UI uses the Rules-governed live staff-document subscription. Case registration and applied-warranty Callables remain unchanged.
