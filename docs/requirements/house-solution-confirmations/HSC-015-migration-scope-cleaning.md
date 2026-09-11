# HSC-015: Migration Scope and Data Cleaning

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

The project previously planned a best-effort migration of a feasible subset of legacy records.

## Questions

No existing records, periods, fields, or relationships will be migrated into the new system.

## Resolution

- Decision: Do not migrate data from the current system into the new system.
- Decision maker: House Solution
- Decision date: 2026-09-11
- Evidence: User instruction in the current Codex task on 2026-09-11: existing-system data migration is not required. A task/thread identifier was not available to the repository authoring context.
- Effect: Migration mapping, data cleaning, migrated-count reconciliation, migration exception reporting, and migration acceptance tests are not release requirements. Existing FileMaker data remains outside the new-system datastore.
- Reflected in: `docs/specification.md`, delivery and environment requirements, roadmap, operations, ADR 0015, and this register.
- Revision: Pending commit.

## Affected Documents

Specification, delivery scope, roadmap, environment requirements, operations, and superseding decision record.
