# 0025 Authentication-Focused Firestore Rules

- Date: 2026-09-14
- Status: Accepted
- Related specification: [Security and access posture](../requirements/security-and-access.md)
- Supersedes: [0018 Direct master writes](0018-direct-master-writes.md), only where it assigns staff business-schema and workflow validation to Firestore Rules

## Context

The provisional access posture gives every enabled authenticated House Solution staff account the same business-data access and defers defenses aimed at malicious authenticated clients outside the supported UI. Later direct-master-write work nevertheless placed exact field lists, types, revisions, references, lifecycle transitions, and physical-delete prevention in Firestore Rules. Continuing that pattern makes the Rules grow with the application schema and risks complexity and expression limits without providing a security guarantee adopted for this prototype.

## Decision

For staff-facing business collections, Firestore Rules enforce only Firebase Authentication and the live enabled `staffAccounts/{uid}` boundary. Canonical schemas, field types, business invariants, lifecycle transitions, soft deletion, and supported workflows are application responsibilities. The prototype does not guarantee integrity for authenticated Create, Update, or Delete requests made outside the supported application flow.

Rules retain explicit boundaries for staff and construction-company accounts, construction-company ownership, account bindings, work-item and notification writes, and server-owned numbering state. Those controls protect identity, tenant scope, or trusted server state rather than validating staff business schemas.

## Rationale

This restores the earlier approved risk posture, keeps Rules proportional to their intended access-control role, and prevents routine field additions from expanding security rules and migration coupling. Supported application behavior remains validated in domain, component, callable, and integration tests.

## Alternatives

- Keep exact schemas and business invariants in Rules: rejected because it contradicts the adopted risk posture and couples every field change to Rules complexity.
- Remove every Rules restriction after sign-in: rejected because enabled-account revocation, construction-company ownership, account administration, and server-owned state are explicit access boundaries.

## Impact

- Enabled staff credentials can be used outside the UI to create, modify, or delete staff business records into unsupported states.
- The UI continues to use soft deletion and trusted Callables where required by its supported atomic workflows, but Rules do not turn those workflows into a malicious-client guarantee.
- Rules tests focus on authentication, enabled state, construction-company scope, and server-owned boundaries. Schema and workflow behavior remains covered outside Rules tests.

## Migration

No stored-data migration is required by this security change. Separately, the warranty-service short-name feature requires a one-time development-data backfill.

## Reconsider When

- Production threat modeling, contractual requirements, or role-specific business authorization requires stronger enforcement.
- A trusted API becomes the sole business-data mutation boundary.
