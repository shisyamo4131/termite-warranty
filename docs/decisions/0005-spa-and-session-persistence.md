# 0005 SPA and Browser-Session Persistence

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Users](../specification.md#users)
- Supersedes: None

## Context

The application is an internal staff system. Firebase Authentication's normal web persistence can retain a signed-in state after a browser is closed. That is not acceptable for an account that was left signed in on an external device after an employee leaves. Account disablement is also required, but it does not by itself make browser-close session persistence appropriate.

## Decision

Build the prototype as a Nuxt single-page application (SPA) with Vuetify.

Configure Firebase Authentication email/password sign-in to use browser-session persistence before the sign-in flow. Closing the browser window clears the authentication state; the next access requires a new login.

Use Firebase Hosting to host the Nuxt SPA and Cloud Functions for Firebase for Firebase Admin SDK account-management operations.

## Rationale

The SPA direction fits the selected Nuxt and Vuetify prototype approach. Browser-session persistence prevents the ordinary local-browser persistence behavior from retaining a usable sign-in state after the browser window is closed, while avoiding an unselected general session-timeout design.

## Impact

- The client must explicitly set the selected Firebase Authentication persistence before a staff member signs in.
- Acceptance testing must verify that closing the browser window requires a new login, and that explicit logout also clears access.
- Browser-session persistence is additional to, not a substitute for, the enabled-account Firestore check and server-side account-disable/revocation flow in [decision 0004](0004-account-lifecycle-enforcement.md).
- The Firebase Hosting and Cloud Functions deployment configuration, account-operation retry/recovery design, session-timeout policy, and package versions remain open.

## Alternatives

- Default local browser persistence: rejected for the initial release because it can retain the sign-in state after a browser is closed.
- A different rendering architecture: not selected; no server-rendering requirement is confirmed.

## Reconsider When

Reconsider if staff workflow requires a different session lifetime, if browser behavior conflicts with the required operational experience, or if a different architecture is chosen through a recorded decision.
