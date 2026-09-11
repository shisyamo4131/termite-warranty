# HSC-014: Legacy FileMaker Data Delivery

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

House Solution retains the FileMaker data. The project previously planned to receive an export for a best-effort migration.

## Questions

No migration export is required because existing-system data will not be migrated into the new system.

## Resolution

- Decision: Do not require delivery of FileMaker data for migration or production-release acceptance.
- Decision maker: House Solution
- Decision date: 2026-09-11
- Evidence: User instruction in the current Codex task on 2026-09-11: existing-system data migration is not required. A task/thread identifier was not available to the repository authoring context.
- Effect: FileMaker export format, timing, permissions, completeness, and migration intake are outside the confirmed delivery scope. A later request to inspect legacy data for a separate purpose would require separate approval.
- Reflected in: `docs/specification.md`, delivery and environment requirements, roadmap, operations, ADR 0015, and this register.
- Revision: Pending commit.

## Affected Documents

Specification, delivery scope, roadmap, environment requirements, operations, and superseding decision record.
