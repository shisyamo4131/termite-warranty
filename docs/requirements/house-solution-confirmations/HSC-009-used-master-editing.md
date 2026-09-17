# HSC-009: Editing Masters Already Used by Cases

- Status: Resolved
- Decision owner: Project owner

## Confirmed Context

Referenced masters are inactivated rather than physically deleted. Property homeowner and construction-company references remain editable and do not rewrite existing cases. Use by a case does not by itself impose additional edit restrictions; ordinary validation, reference integrity, and existing master and case lifecycle rules continue to apply.

## Resolution

- Decision: Do not adopt application-time snapshots or other historical preservation for masters used by cases at this time. Do not add a pre-edit warning, reason input, approval step, or master edit history solely because a master is already used. Cases continue to display the current master values.
- Decision: Preserve ordinary input validation, reference integrity, and existing master and case lifecycle rules. A property's homeowner and construction-company link changes do not rewrite existing case references, and an applied warranty retains its saved period and dates.
- Decision: Reconsider past-value display or history management only as a new scope if House Solution explicitly requests it.
- Decision maker/date: Project owner, 2026-09-17.
- Evidence: Explicit user approval in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/master-management.md`, `docs/requirements/initial-data-model.md`, and the related retention question in `HSC-001-data-retention-policy.md`.

## Affected Documents

Master lifecycle requirements, data contract, edit UI, authorization, and tests.
