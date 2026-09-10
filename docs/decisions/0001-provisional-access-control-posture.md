# 0001 Provisional Access-Control Posture

- Date: 2026-09-10
- Status: Provisional
- Related specification: [Security and Sensitive Information](../specification.md#security-and-sensitive-information)
- Supersedes: None

## Context

The initial delivery has a fixed end-of-October 2026 production target. Application accounts use Firebase Authentication email/password sign-in and have developer-superuser, House Solution-administrator, and general-staff roles. Account management is server-enforced; the current direction is to limit all other role differences to the UI and avoid role-specific business-data CRUD authorization work. Customer names and addresses are in scope.

## Provisional Decision

- Use UI and button visibility to present role-specific functions other than account management.
- Enforce account management in Cloud Functions: the developer superuser creates, edits, and disables House Solution administrators only; House Solution administrators create, edit, and disable general-staff accounts. For general staff, editable fields are email address, display name, and enabled/disabled state; the role is currently fixed to `general staff`. Future roles selectable by a House Solution administrator must exclude `House Solution administrator` and `developer superuser`. Account disable must immediately block access, including existing sessions. See [decision 0006](0006-account-management-roles.md).
- Do not provisionally enforce business-data CRUD permissions by role in an API or domain layer.
- Require Firebase Authentication and an enabled staff-account record for direct Cloud Firestore clients, but do not add role- or record-level authorization in Firestore rules beyond that bounded disabled-account enforcement.
- Defer controls intended specifically to mitigate malicious browser-external access.
- Start with all enabled authenticated users having the same business-data CRUD access and tighten access only as role-specific business-data requirements are confirmed.

## Rationale

This is a provisional scope choice intended to avoid expanding authorization work before the initial delivery. It is not a claim that client-side visibility or authenticated-only access prevents unauthorized data operations.

## Impact and Residual Risk

Any authenticated user permitted by an authentication-only Firestore rule can attempt direct reads and writes regardless of UI visibility. This includes access or modification risks for customer names and addresses. The [security and access posture](../requirements/security-and-access.md) records the full limitations and official technical references.

## Reconsider When

- When a role-specific functional restriction is confirmed; the enforcement method must then be decided.
- If external construction-company accounts or any other external identities are introduced.
- If Firebase is not selected, or server-side clients are introduced.
- If customer, legal, contractual, or insurance requirements require stronger controls.
