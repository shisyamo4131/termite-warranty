# HSC-018: Construction-Company Postal-Code Lookup

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

Automatic postal-code lookup is planned for property and homeowner entry. Construction-company entry currently uses manual address input.

## Resolution

- Decision: Construction-company creation and editing use the same postal-code lookup behavior as property and homeowner forms, including multiple-match, no-match, manual correction, and failure fallback behavior.
- Boundary: Live lookup remains unavailable until HSC-017's provider response mapping, credentials, quota, and operating conditions are resolved. The prototype exposes the same replaceable lookup seam and retains manual entry.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md`, branches/addresses, TR-009 design, prototype implementation, and tests.

## Affected Documents

Construction-company requirements, address component behavior, UI, and tests.
