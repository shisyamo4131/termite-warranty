# 0024 Same-site Password Action Handler

- Date: 2026-09-13
- Status: Accepted
- Related specification: [Users](../specification.md#users)
- Supersedes: None

## Context

Firebase Authentication's default password action page has limited presentation control and may use a different origin from the application. In development acceptance, a password generated and saved by Chrome on that page was not offered on the application's login page.

## Decision

Keep Firebase Authentication's standard email delivery, but handle password setup and reset on a Japanese page hosted by this application at `/auth/action`. Configure the Firebase Authentication password-reset template's custom action URL to the matching application origin and this path for each environment.

The page accepts only Firebase's `resetPassword` action, verifies its one-time code with the Firebase Web SDK, lets the recipient choose a new password, confirms the reset, and returns the recipient to the common login page. Password fields declare `autocomplete="new-password"`.

## Rationale

Hosting the action page on the same application origin gives full control over Japanese wording and presentation and keeps password creation and login under one password-manager site association. Standard Firebase email delivery avoids adding SMTP credentials, deliverability operations, and a new email provider.

## Alternatives

- Retain the Firebase default action page: rejected because it does not address the observed presentation and origin mismatch.
- Send authentication email through custom SMTP or another provider: deferred because it adds operational and security scope not needed for this issue.
- Ask users to copy or manually reassign saved passwords: retained only as a recovery workaround, not the normal workflow.

## Impact

- The application must keep `/auth/action` available without a signed-in business profile.
- Password-setup and reset mail uses Japanese localization where Firebase supports it.
- Each Firebase environment needs its password-reset template action URL configured to that environment's application origin.
- Email sender identity and custom SMTP remain separate, unresolved concerns.

## Migration

Deploy the application page first, then configure the development Firebase Authentication template to use the development application's `/auth/action` URL. Existing unused or expired links are not migrated; a recipient can request a fresh message from the login page.

## Reconsider When

Reconsider if Firebase changes the email-action contract, if production uses a different identity provider, or if custom email delivery is separately approved.
