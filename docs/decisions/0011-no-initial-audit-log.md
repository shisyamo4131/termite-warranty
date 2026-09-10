# 0011 No Initial Operation-history or Audit Log

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Non-functional Requirements](../specification.md#non-functional-requirements)
- Supersedes: None

## Context

The initial delivery needs to meet a mandatory October 2026 operating deadline. The developer superuser can enter the system for support and investigation. The business does not currently require a separate record of who changed each case, applied warranty, or master record.

## Decision

Do not implement an operation-history or audit-log feature in the initial release.

This does not remove the required case registration and update timestamps used for list ordering, nor account-disablement controls.

## Rationale

It reduces delivery scope and avoids additional Firestore storage and write volume while the business need is not established.

## Alternatives

- Record full create/update/status-change history: deferred because it is not currently needed.
- Record only selected lifecycle events: deferred because no event set is currently required.

## Impact

- The system cannot initially answer which staff member made an individual business-data change.
- A future audit feature requires a new data contract, access design, retention decision, and user-interface requirements.

## Migration

No migration impact.

## Reconsider When

Reconsider when the business, support, security, or contractual need for change attribution is confirmed.
