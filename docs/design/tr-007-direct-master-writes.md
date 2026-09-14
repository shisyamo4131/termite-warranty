# TR-007 Direct Master Writes

- Status: Implemented and independently accepted
- Date: 2026-09-12
- Roadmap: [TR-007](../roadmaps/technical-remediation.md#tr-007-replace-master-cud-callables-with-direct-firestore-writes)
- Baseline: `cca2c5194dff415dc6ac6a61b3cd9d689831e5ec` on `codex/tr-007-direct-master-writes`

## Objective

Remove the unnecessary Callable boundary and its invocation cost from construction-company, homeowner, property, and warranty-service create/update/lifecycle operations while preserving the enabled-staff access boundary.

## Design

- `useMasterManagement` normalizes the submitted business fields with the shared domain mapper and writes the canonical fields directly through the Firestore Web SDK.
- Create uses a generated document reference, `active: true`, `revision: 1`, and server timestamps in one write.
- Update and lifecycle writes use Firestore's atomic `increment(1)` transform and server timestamp. The revision remains write-order diagnostic metadata, is not read before writing, is not returned, and is never a stale-write precondition. This avoids a transaction and an extra billed read while preserving compatibility with existing documents.
- As subsequently corrected by ADR 0025, Rules require an enabled authenticated staff account but do not enforce master shapes, metadata, references, lifecycle transitions, or deletion behavior. Those remain supported-application responsibilities.
- Remove the three master Callable exports, their server transaction module, and obsolete Callable/server-transaction tests. Keep profile, case-registration, and applied-warranty Callables.

Existing master documents retain their revision. The supported application normalizes a record to the current shape when it performs a normal edit; Rules do not guarantee or repair legacy shape compatibility.

## Validation

- Shared mapper/token unit tests and application type/build gates.
- Emulator Rules tests for unauthenticated, Authentication-only, disabled, and enabled-staff access. Application tests cover create/update/lifecycle shapes, revisions, references, and soft deletion.
- Retained Callable Emulator regression for profile, case registration, and applied warranties.
- Functions syntax/preparation confirms removed master code is absent and retained Callables load.
- No external deployment or data mutation.

## Rollback

Revert the TR-007 commit. No stored data migration is required because the retained document shape and revision field are compatible with the former Callable implementation.

## Subsequent Disposition

TR-008 removes the unused profile Callable after confirming that the UI uses the Rules-governed live staff-document subscription. Case registration and applied-warranty Callables remain unchanged.

ADR 0025 supersedes TR-007's original Rules-based data-integrity boundary without reverting its direct-master-write architecture.
