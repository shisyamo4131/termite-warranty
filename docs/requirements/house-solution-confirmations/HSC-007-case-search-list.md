# HSC-007: Case Search and List Behavior

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

Required filters, columns, default ordering, and the unfiltered 20-document subscription limit are specified. When any condition is active, the approved prototype displays all matching records from the complete collection in 20-record pages. Case conditions are edited in an apply/cancel dialog whose initialization action clears the draft.

## Resolution

- Decision: Blank conditions show the freshest 20 cases; one or more applied conditions search the complete collection and show every match. Conditions use a dialog with apply, cancel, and draft initialization actions.
- Decision: Application date and handover date each have inclusive start/end range conditions. Either boundary may be omitted, the two date ranges are ANDed with all other conditions, and a start later than its end blocks application of the draft conditions.
- Decision: Mandatory/default year-month filtering is not adopted. Export, saved searches, selectable columns, and alternate sorting are outside the initial scope. Production query scalability remains a separate HSC-026 decision and does not keep this product-behavior matter open.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/search-and-list.md`, decisions 0026 and 0027, prototype implementation, and tests.

## Affected Documents

Search/list requirements, UI behavior, query design, and tests.
