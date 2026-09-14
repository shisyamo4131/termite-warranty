# Security and Access Posture

## Status

This is a provisional, explicitly risk-bearing posture for the initial delivery. It is not evidence that the production system has adequate authorization, data protection, or attack resistance.

## Confirmed Provisional Requirements

- House Solution staff accounts are required.
- The application roles are developer superuser, House Solution administrator, and general staff.
- Staff sign in with Firebase Authentication email/password using browser-session persistence. Closing the browser window clears the authentication state and requires login at the next access. No inactivity-time automatic logout is required in the initial release.
- The developer-owned developer superuser account can create, edit, and disable House Solution administrator accounts only; it does not manage general-staff accounts.
- A House Solution administrator can create, edit, and disable general-staff accounts through the system. A general-staff account's editable fields are email address, display name, and enabled/disabled state; its role is currently fixed to `general staff`. If additional roles are introduced later, a House Solution administrator may select only roles other than `House Solution administrator` and `developer superuser`.
- Account creation sends a password-setup email; email-address verification is not required initially, and staff can reset their passwords.
- Bootstrap the initial developer-superuser account manually in Firebase Console without custom claims. Create both its Firebase Authentication user and the matching enabled staff-account record; do not grant business-data access to an Authentication-only record.
- Disabling an account must make it unusable immediately, including for an already signed-in session.
- Cloud Functions for Firebase with Firebase Admin SDK performs Firebase Authentication user administration and enforces the account-management role boundary.
- Role-based feature restrictions are limited to controlling the UI and button visibility.
- The application does not provisionally restrict business-data CRUD operations in an API or domain layer by role. Every enabled authenticated account is intended to have the same business-data-operation access.
- For direct Cloud Firestore client access, require authentication and an enabled staff-account record for application collections/documents. This is the bounded control needed to enforce immediate disabled-account access revocation; do not add role- or record-level authorization.
- Introduction of controls intended to block malicious browser-external access is deferred.
- For staff-facing business collections, do not use Firestore Rules for document schemas, field allowlists, types, business invariants, lifecycle transitions, soft deletion, or supported-workflow enforcement. Authenticated Create, Update, or Delete requests made outside the supported application flow have no integrity guarantee in this prototype.
- Start with all enabled authenticated users having the same business-data CRUD access. Account management is the bounded, server-enforced role-specific exception. Tighten other access only as role-specific functional requirements are confirmed.
- Existing-system homeowner data is not required for migration testing. Any use of actual homeowner data in the developer-owned development environment for another separately approved purpose requires a confidentiality agreement. Do not commit it to source control or place it in documentation, test fixtures, or logs.
- Operation-history and audit-log records are not an initial-release requirement. This does not remove the existing registration and update timestamps or the account-disable controls.

## Construction-Company Proposal Prototype

- Each construction company has at most one enabled shared Firebase Authentication account in the prototype. Self-sign-up is disabled.
- A House Solution administrator issues, disables, and re-enables the account. The construction company sets and resets its own password through Firebase Authentication email; House Solution does not handle the password.
- `constructionCompanyAccounts/{uid}` is the server-side source for the account's construction-company ID and enabled state. A client-submitted company ID is never an authorization source.
- A construction-company account can read only its own profile and its own bounded provisional work-item list. It cannot read staff pages, registered case/master collections, another company's work items, or the notification outbox.
- All work-item mutations use trusted Callables. Direct browser writes to account, work-item, registered-data, and notification-outbox collections are denied.
- A work item uses a revision check, permitted state transitions, and submission locking. Approval performs the corresponding registered-data writes and terminal work-item update in one transaction.
- Shared authentication establishes company-level attribution only. Each response stores a self-declared contact name and contact email for operational follow-up; it is not an independently authenticated individual identity.
- App Check, rate limits, password policy, multi-factor authentication, notification delivery controls, retention, and production incident procedures remain unconfirmed. This prototype does not claim production-grade external access security.

## Consequences and Residual Risks

- Shared construction-company credentials reduce account-administration cost but prevent individual operator attribution and require password rotation when access within the company changes.

- UI visibility is not an authorization boundary. An authenticated user can use a browser's developer tools or a direct client request to attempt operations that the UI hides. Account-management Cloud Functions must independently reject a caller whose role is not permitted to manage the target account.
- With a Firestore rule equivalent to `request.auth != null`, every signed-in account permitted by that rule can read and write the matched data. It does not distinguish administrator from general staff, and it does not validate intended business operations.
- The provisional approach therefore exposes customer names and addresses to any authenticated account that can access the relevant data, and permits unintended modification or deletion if the rules allow it.
- Firebase documents state that Firestore client access is governed by Security Rules; authentication-only read/write access for all signed-in users is not recommended for an entire database. Server client libraries bypass Firestore Security Rules and require separate IAM control if they are later used.
- Firebase documentation states that disabled users and revoked refresh tokens can leave a previously issued ID token valid for up to its one-hour lifetime. To meet the immediate-disable requirement, the implemented server-side operation first marks the staff-account record disabled so Firestore denies subsequent access, then disables the Firebase Authentication user and revokes refresh tokens. The inverse enable flow enables Authentication first and exposes the enabled Firestore state only after that succeeds. These paths have Emulator regression coverage; development-environment and production operator-recovery verification remain outstanding.

## Unresolved-Matter Routing

Account-management screens are a confirmed role-specific function. The account-lifecycle controls needed for creation, password setup/reset, immediate disable, and browser-session persistence are a bounded, server-enforced exception to the UI-only posture. When another business-data role-specific functional restriction is confirmed, decide its enforcement method and update this posture. No general access-control hardening milestone is currently committed before production release. This does not remove the stated residual risks or make UI visibility an authorization boundary.

See [HSC-021 account lifecycle](house-solution-confirmations/HSC-021-account-lifecycle.md) and [HSC-024 role types and functional permissions](house-solution-confirmations/HSC-024-role-business-data-access.md) in the central unresolved-matter register.

## Technical References

- [Firebase: Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firebase: Fix insecure rules](https://firebase.google.com/docs/firestore/security/insecure-rules)
- [Firebase: Secure data in Cloud Firestore](https://firebase.google.com/docs/firestore/security/overview)
- [Firebase: Manage Users](https://firebase.google.com/docs/auth/admin/manage-users)
- [Firebase: Manage User Sessions](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Firebase: Authentication State Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
