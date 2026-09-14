# 0012 Parallel Cutover Strategy

- Date: 2026-09-10
- Status: Superseded
- Related specification: [Delivery and Technology](../requirements/delivery-and-technology.md)
- Supersedes: None

The migration-specific clauses were superseded on 2026-09-11 by [0015 No legacy-data migration](0015-no-legacy-data-migration.md). The remaining parallel-operation direction was superseded on 2026-09-14 by [0028 Independent-service release boundary](0028-independent-service-release-boundary.md), because the two systems serve different services and have no shared system-of-record transition.

## Context

The end-of-October 2026 production deadline is mandatory, but an incorrect migration could interrupt operations. Users may accept temporary additional workload to reduce this risk.

## Decision

Use temporary parallel operation of FileMaker and the new system before official production release. A final migration in the evening or at night is permitted when normal operations have stopped.

The parallel-operation duration, final data-freeze time, exact migration window, reconciliation sequence, rollback decision, and official cutover procedure are not yet decided.

## Rationale

Parallel operation provides a safety measure before retiring the legacy process while keeping the final interruption short.

## Alternatives

- Single-cutover migration without parallel operation: not selected because it has less operational safety margin.
- Indefinite dual operation: not selected because it increases user workload and creates data-consistency risk.

## Impact

- Migration design must account for data entered during the parallel period.
- The final cutover runbook must define the data-freeze, final migration, reconciliation, rollback decision, and operator communication.

## Migration

Validate the procedure using representative data before the final production cutover. This decision does not authorize a production migration or stop of FileMaker.

## Reconsider When

Reconsider if the supplied data, prototype evidence, or operating constraints show that parallel operation is not feasible.
