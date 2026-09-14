# HSC-007: Case Search and List Behavior

- Status: Partially answered
- Decision owner: House Solution

## Confirmed Context

Required filters, columns, default ordering, and the unfiltered 20-document subscription limit are specified. When any condition is active, the approved prototype displays all matching records from the complete collection. Case conditions are edited in an apply/cancel dialog whose initialization action clears the draft. Month semantics, production pagination/query design, and additional list utilities remain open.

## Questions

1. Should date filters be exact dates, ranges, or both?
2. Beyond the current prototype's AND combination, empty result, and draft application behavior, what production invalid-input behavior is required?
3. Beyond the confirmed unfiltered 20-document limit and prototype complete matching, what production pagination/query design, export, saved-search, column-selection, or alternate-sorting behavior is required?

## Partial Resolution

- Decision: Blank conditions show the freshest 20 cases; one or more applied conditions search the complete collection and show every match. Conditions use a dialog with apply, cancel, and draft initialization actions.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/search-and-list.md`, decision 0026, prototype data contract, operations, implementation, and tests.

## Affected Documents

Search/list requirements, UI behavior, query design, and tests.
