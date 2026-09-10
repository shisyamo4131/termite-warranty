# 0003 Firebase Authentication and Account Lifecycle

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Users](../specification.md#users)
- Supersedes: None

## Context

House Solution staff require email/password sign-in, role-bounded account management, password setup/reset, browser-window-close session clearing, and immediate account disable. Firestore is selected for the prototype database.

## Decision

Use Firebase Authentication email/password for staff authentication, configured with browser-session persistence.

The developer superuser creates, edits, and disables House Solution administrator accounts only. House Solution administrators create, edit, and disable general-staff accounts; their editable fields are email address, display name, and enabled/disabled state. The role is currently fixed to `general staff`; future roles selectable by a House Solution administrator must exclude `House Solution administrator` and `developer superuser`. Account creation sends a password-setup email. Email-address verification is not initially required. Staff can reset their password. Disabling an account must make it unusable immediately, including an already signed-in session.

## Rationale

The provider fits the selected Firestore prototype stack and the developer's Firebase experience.

## Impact

- Firebase Authentication user administration uses elevated privileges from a secure server environment; client-only account administration is not an approved implementation approach.
- Closing the browser window clears the authentication state; accessing the system again requires a new login. This reduces the risk of a former employee using an account left signed in on an external device, but it does not replace account disablement.
- Firebase's documentation states that ID tokens can remain valid for up to one hour after disable/revocation. The existing authentication-only Firestore-rule posture is therefore insufficient for the immediate-disable requirement.
- The selected disabled-account enforcement is recorded in [decision 0004](0004-account-lifecycle-enforcement.md). It is an exception to the otherwise UI-only role restriction posture, not a general role-based CRUD authorization decision.
- The account-management role boundary is recorded in [decision 0006](0006-account-management-roles.md).

## Alternatives

- Another email/password identity provider.
- Manual account and password administration outside the application.

## Migration

No existing identity migration is approved. Legacy-system user-account data has not been supplied or assessed.

## Reconsider When

Reconsider if identity-provider cost, operational requirements, password-email delivery, secure server-side administration, or immediate-disable enforcement cannot meet the required delivery and safety constraints.
