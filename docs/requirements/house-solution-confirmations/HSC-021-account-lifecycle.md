# HSC-021: Account Creation, Deletion, and Recovery

- Status: Resolved
- Decision owner: House Solution, then project

## Confirmed Context

- Staff and construction-company account creation, editing where supported, disabling, re-enabling, password setup, and password reset are implemented. Physical deletion is not implemented.
- The provisional requirements say that a developer superuser manages House Solution administrators and a House Solution administrator manages general-staff accounts. Account creation sends a password-setup email, and disabling must make an account unusable immediately.
- A physical account-deletion rule and recovery behavior have not been confirmed or implemented.

## Resolution

- Decision: Account removal means reversible disablement and re-enablement. Do not physically delete the Firebase Authentication user or its account document in the initial scope.
- Decision: A disabled account retains its identity, role/binding, and email address. That email remains reserved and is not reused for another account.
- Decision: Password setup and reset are self-service through Firebase Authentication email. No disable reason, separate approval, or lifecycle-notification workflow is required in the initial scope.
- Boundary: Partial Authentication/Firestore failure recovery and reconciliation remain production-operation/error-handling matters and do not alter the lifecycle meaning.
- Decision maker/date: Project owner, then project, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md`, security/access, operations, and decisions 0003/0004.

## Affected Documents

Account lifecycle requirements, roles, Functions, Firestore data contract, UI, security, operations, and tests.
