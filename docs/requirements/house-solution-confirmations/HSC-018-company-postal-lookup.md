# HSC-018: Construction-Company Postal-Code Lookup

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

Japan Post's official nationwide postal-code CSV is the resolved lookup direction for property and homeowner entry. Construction-company entry uses the same planned data behavior; implementation remains pending.

## Resolution

- Decision: Construction-company creation and editing use the same postal-code lookup behavior as property and homeowner forms, including multiple-match, no-match, manual correction, and failure fallback behavior.
- Boundary: HSC-017's data-source decision is resolved, but CSV transformation, Hosting shards, update command, manifest, and freshness warning are not implemented. The prototype retains the provider-neutral lookup seam and manual entry.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md`, branches/addresses, TR-009 design, the provider-neutral construction-company seam, and its tests. Japan Post CSV-backed live lookup, update, and freshness behavior remain pending.

## Affected Documents

Construction-company requirements, address component behavior, UI, and tests.
