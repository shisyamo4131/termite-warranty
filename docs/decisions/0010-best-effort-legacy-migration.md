# 0010 Best-effort Legacy-data Migration

- Date: 2026-09-10
- Status: Superseded
- Related specification: [Scope](../specification.md#scope)
- Supersedes: None

Superseded on 2026-09-11 by [0015 No legacy-data migration](0015-no-legacy-data-migration.md).

## Context

The FileMaker data has not yet been provided, and its structure may differ substantially from the confirmed target model. The production deadline remains the end of October 2026 and user operations cannot stop for an extended period.

## Decision

House Solution retains the FileMaker data. The project migrates only the records and fields that can feasibly be mapped after the supplied data is inspected. Complete historical migration is not an acceptance condition.

The migration implementation and cutover evidence must identify migrated counts, unsupported or omitted items, and their reasons. House Solution confirms this migration report before cutover.

## Rationale

This protects the delivery deadline while preserving access to the legacy history outside the new system.

## Alternatives

- Require complete migration of all available history: rejected because the source data and structural fit are not yet known.
- Omit migration entirely: rejected because a feasible migration remains required for the production release.

## Impact

- Data inspection defines the achievable source records, fields, mapping, and reconciliation report.
- Roadmap migration milestones are measured against agreed feasible scope, not total historic-record coverage.
- This decision does not authorize deletion of FileMaker data or remove House Solution's responsibility to retain it.

## Migration

Before cutover, document the feasible scope, mapping outcomes, migrated counts, outstanding items and their reasons, tests, recovery procedure, and House Solution's confirmation.

## Reconsider When

Reconsider if source-data inspection demonstrates that a wider, complete migration is practical without endangering the mandatory production deadline.
