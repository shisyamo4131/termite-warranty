# 0015 No Legacy-data Migration

- Date: 2026-09-11
- Status: Accepted
- Related specification: [Scope](../specification.md#scope)
- Supersedes: [0010 Best-effort legacy-data migration](0010-best-effort-legacy-migration.md) and the migration-specific clauses of [0012 Parallel cutover strategy](0012-parallel-cutover-strategy.md)

## Context

The project previously planned to inspect the current FileMaker data and migrate the feasible subset before production release. House Solution has confirmed that migration from the current system is not required.

## Decision

Do not import current-system records, fields, relationships, case numbers, or user accounts into the new system. The new system begins with data entered for its own operation.

House Solution retains the FileMaker data outside the new-system datastore. Production-release acceptance does not require a FileMaker export, migration tooling, data cleaning, migrated-count reconciliation, a migration report, or migration acceptance tests.

Operational cutover and rollback remain necessary decisions, but they must be designed without a final data migration.

## Rationale

This follows House Solution's confirmed operating decision and removes delivery work that is not needed for the new system to begin operation.

## Alternatives

- Best-effort migration of a feasible subset: superseded because House Solution confirmed that migration is unnecessary.
- Full historical migration: not selected because no current-system data migration is required.

## Impact

- Remove migration implementation and testing from the release scope and roadmap.
- Do not require FileMaker data delivery or CSV intake for release.
- Do not preserve legacy case numbers through import; production numbering for new cases remains a separate decision.
- Reframe parallel operation and rollback around the date new registrations move to the new system, the system-of-record boundary, and treatment of records entered after that switch.
- Validate the production schema and performance with confirmed workflows and representative synthetic volumes rather than a legacy migration dataset.

## Migration

No data migration is performed. Existing prototype or development-environment synthetic data is not production data and follows the separately approved environment setup procedure.

## Reconsider When

Reconsider only if House Solution explicitly requests a later import as a new scope change, with separate mapping, security, acceptance, schedule, and rollback approval.
