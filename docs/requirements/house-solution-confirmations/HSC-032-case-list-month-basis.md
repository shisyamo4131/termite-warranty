# HSC-032: Case-list Year/Month Basis

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

An unfiltered list subscribes to at most the 20 documents with the freshest server-maintained update timestamp. Mandatory year/month filtering was considered as a possible list behavior.

## Resolution

- Decision: Reject mandatory or default year/month filtering. Blank conditions show the freshest 20 cases. Any optional condition searches the complete collection and presents all matches in 20-record pages.
- Decision: Application date and handover date use optional inclusive start/end ranges under HSC-007. No dedicated mandatory month selector is added.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md`, search/list requirements, project list-query boundary, decisions 0017/0026/0027, and tests.

## Affected Documents

Case search/list requirements, dashboard behavior, Firestore query/read-model design, indexes, UI controls, and performance tests.
