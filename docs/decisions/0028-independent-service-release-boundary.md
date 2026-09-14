# 0028 Independent-Service Release Boundary

- Date: 2026-09-14
- Status: Accepted
- Related specification: [Purpose and environment boundaries](../specification.md#purpose)
- Supersedes: The remaining parallel-operation direction in [0012 Parallel cutover strategy](0012-parallel-cutover-strategy.md)

## Context

The new system supports a newly established termite-warranty service. It does not replace the current FileMaker service, and current-service records or accounts are not migrated.

## Decision

Do not perform a business-data cutover, parallel system-of-record operation, or rollback between FileMaker and the new system. Each service retains and manages its own records.

Treat deployment rollback, backup/recovery, and incident response for the new system as production operations for that system, not as a return to FileMaker.

## Rationale

A cutover assumes that two systems successively manage the same service and records. That premise does not exist here, so a parallel-entry period would add work without creating a valid reconciliation or rollback path.

## Impact

- Release planning no longer requires a FileMaker data freeze, new-registration transfer date, shared system-of-record boundary, reconciliation, or legacy rollback.
- Production preparation still requires new-system deployment rollback, backup/recovery, incident response, and initial-data setup.
- No data model, Firestore document, or existing development data changes.

## Migration

No migration is performed. Existing FileMaker data remains outside the new-system datastore.

## Reconsider When

Reconsider only if House Solution later requests that the new system take over the current service or import its records as an explicit scope change.
