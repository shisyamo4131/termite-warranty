# HSC-016: Cutover, Parallel Operation, and Rollback

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

The new system is for a new service and does not replace the current FileMaker service. Existing-system data and accounts are not migrated.

## Resolution

- Decision: There is no business-data cutover, parallel system-of-record operation, or rollback between the current FileMaker service and the new service. Each service retains and manages its own records.
- Boundary: Deployment rollback, backup/recovery, and incident response for the new system remain production-operation matters; they are not a FileMaker cutover.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task, together with the confirmed independent-new-service boundary.
- Promoted to: `docs/specification.md`, delivery/technology, roadmap, and decision 0028.

## Affected Documents

Cutover runbook, system-of-record boundary, rollback, support, and acceptance criteria.
