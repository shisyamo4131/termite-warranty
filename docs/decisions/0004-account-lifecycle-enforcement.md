# 0004 Account Lifecycle Enforcement

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Security and Sensitive Information](../specification.md#security-and-sensitive-information)
- Supersedes: None

## Context

Firebase Authentication ID tokens can remain valid after an account is disabled or its refresh tokens are revoked. The system requires a disabled account to become unusable immediately, including an existing session, while retaining the current policy of no general role-based CRUD authorization.

## Decision

Use Cloud Functions for Firebase with Firebase Admin SDK for staff-account creation after bootstrap, enable/disable, password-setup email handling, password reset support, and refresh-token revocation. Email-address verification is not an initial-release requirement.

For Firestore application data, require both an authenticated Firebase user and a corresponding enabled staff-account record. The enabled check is a narrow exception for account lifecycle only; it is not role- or record-level CRUD authorization.

On disable, first or atomically mark the staff-account record disabled so subsequent Firestore requests are denied, then disable the Firebase Authentication user and revoke its refresh tokens. Retain user accounts; do not physically delete them.

## Rationale

The enabled-account check closes the gap left by an otherwise valid issued ID token, while preserving the agreed all-enabled-users CRUD posture.

## Impact

- Account-management operations cannot be implemented only in a browser client.
- The prototype server path cleans up a newly created Authentication user if its staff record cannot be created, disables the Firestore record before Authentication/revocation, and enables Authentication before exposing the enabled Firestore record. Emulator tests cover the principal role and lifecycle paths; production retry and operator-recovery procedures remain to be defined.
- Browser-session persistence is an initial-release requirement and is recorded in [decision 0005](0005-spa-and-session-persistence.md). It does not replace immediate disabled-account enforcement.

## Alternatives

- Keep authentication-only Firestore rules and accept up to one hour of access after account disablement. Rejected because it conflicts with the immediate-disable requirement.
- Introduce general role- or record-level authorization. Deferred; it is outside this decision's scope.

## Reconsider When

Reconsider if the chosen secure server-side runtime cannot deliver atomic-enough disabled-account enforcement, or if broader role-based restrictions are later required.
