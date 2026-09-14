# HSC-008: Master-List Behavior

- Status: Partially answered
- Decision owner: House Solution

## Confirmed Context

Construction-company, homeowner, property, and warranty-service masters have separate list and detail screens. Name search is available for selected masters. With no search/filter value, each list subscribes to at most the 20 freshest documents. A nonblank normalized name condition searches the complete master collection and displays every match in the approved prototype.

## Questions

1. Which filters and columns are required for each master list?
2. Beyond the confirmed unfiltered freshness ordering, 20-document limit, and prototype complete name matching, what production query and pagination behavior is required?
3. Are export, saved filters, or active/inactive presets required?

## Affected Documents

Master-management requirements, list UI, query design, and tests.

## Partial Resolution

- Decision: Blank conditions show the freshest 20 master records; a nonblank normalized name condition searches the complete collection and shows every match.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/master-management.md`, decision 0026, prototype data contract, operations, implementation, and tests.
