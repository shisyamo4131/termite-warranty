# 0006 Account-Management Roles

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Users](../specification.md#users)
- Supersedes: None

## Context

The application needs a controlled way to create House Solution staff accounts from the production environment. The developer also needs an account for production verification and investigation of reported defects or complaints. The former two-role model cannot express who may create House Solution administrators without allowing those administrators to create peers.

## Decision

Use three application-account roles:

- `developer superuser`: an account controlled by the developer. It creates, edits, and disables House Solution administrator accounts only.
- `House Solution administrator`: creates, edits, and disables general-staff accounts. Editable fields are email address, display name, and enabled/disabled state. The role is currently fixed to `general staff`; future selectable roles must exclude `House Solution administrator` and `developer superuser`.
- `general staff`: has no account-management capability.

Account-management operations must be Cloud Functions and must enforce both the caller role and the target account role on the server. This is a specific exception to the provisional UI-only access posture.

All enabled authenticated accounts retain the same provisional business-data CRUD access. This decision does not introduce role- or record-level authorization for cases, masters, alerts, or other business data.

The initial developer superuser account is bootstrapped manually in Firebase Console, without custom claims, by creating a Firebase Authentication email/password user and its matching enabled staff-account record with the `developer superuser` role. No real account, email address, Firebase project, or credential is created or stored through this requirements decision.

No inactivity-time automatic logout is required for the initial release. Browser-session persistence and account-disable enforcement remain mandatory.

## Rationale

The separation lets the developer safely bootstrap and support the production system while allowing House Solution to manage its ordinary users. Server-side enforcement prevents a general user, or an administrator targeting an administrator-level account, from bypassing UI visibility through a direct request.

## Impact

- The staff-account data contract must encode the three roles and an enabled state.
- Cloud Functions need authorization tests for each caller/target-role combination, as well as failure and retry/recovery tests for account disabling.
- The production-bootstrap runbook must verify that both matching records are created, that no custom claim is required, and that the account can access only its intended account-management surface.
- Role selection is not presently available because `general staff` is the only role a House Solution administrator may assign. If further roles are introduced, the function must exclude `House Solution administrator` and `developer superuser`.

## Alternatives

- Let all administrators manage all staff accounts: rejected because it does not preserve the developer-controlled administrative boundary.
- Enforce the boundary only by hiding UI controls: rejected because a direct function request could bypass the UI.

## Reconsider When

Reconsider if House Solution needs to administer its own administrator accounts, if the developer support model changes, or if broader business-data authorization is required.
