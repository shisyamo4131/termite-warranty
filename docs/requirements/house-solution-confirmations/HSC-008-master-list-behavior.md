# HSC-008: Master-List Behavior

- Status: Partially answered
- Decision owner: House Solution

## Confirmed Context

Construction-company, homeowner, property, and warranty-service masters have separate list and detail screens. Name search is available for selected masters. With no search/filter value, each list subscribes to at most the 20 freshest documents. A nonblank normalized name condition searches the complete master collection and displays every match in the approved prototype.

## Project Recommendation for Discussion — Not House Solution-Confirmed

- Choose a retrieval strategy per collection based on its measured possible document count and workflow. Do not mandate Firestore cursor pagination universally, and explicitly do not recommend server-side cursor pagination as the default.
- With no search, subscribe to the latest 20 documents in realtime. When search is present, subscribe to or load all matching master documents and paginate the in-memory result. This favors stable page navigation and automatic visibility of concurrent changes; the relatively low expected Firestore read cost is a project judgment, not a guaranteed price claim.
- If a master collection later becomes too large, add a mandatory or selective search axis based on that master (for example, require property area, prefecture, or municipality before property search) after measured thresholds. The threshold and axis remain HSC-026/HSC-023 decisions.
- Recommend common `all`/`active`/`inactive` filtering on management lists, defaulting to `all`; selectors remain active-only. Recommended columns are: construction company status, name, address, phone, and contact; homeowner status, name, address, and phone; property status, name, address, homeowner, company, and area; warranty service status, name, short name, type, and default period; and branch status and name if branch management remains.
- Exclude export, saved filters, per-user columns, bulk edit, arbitrary sorting, and automatic merge from initial release unless House Solution explicitly accepts them later.

These recommendations are provisional and do not change the confirmed prototype behavior until House Solution approves a production change.

## Questions

1. Does House Solution accept or revise the proposed filters, columns, common all/active/inactive behavior, and active-only selectors for each master list?
2. Does House Solution accept or revise collection-specific retrieval, latest-20 realtime behavior, in-memory pagination for matches, and the explicit rejection of server-side cursor pagination as the default?
3. What measured collection-size thresholds, selective search axes, and query/read-model fallback should apply under HSC-026 and HSC-023?
4. Does House Solution accept or revise the proposed exclusions for export, saved filters, per-user columns, bulk edit, arbitrary sorting, and automatic merge?

## Affected Documents

Master-management requirements, list UI, query design, and tests.

## Partial Resolution

- Decision: Blank conditions show the freshest 20 master records; a nonblank normalized name condition searches the complete collection and shows every match.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/master-management.md`, decision 0026, prototype data contract, operations, implementation, and tests.
