# Environments and Authentication Email

## Confirmed Environment Requirements

- Provide the mid-September 2026 prototype in a development environment.
- Use separate Firebase projects for the development and production environments.
- The development Firebase project is owned by the developer. Production Firebase-project ownership is under confirmation.
- The provisioned and verified development Firebase project ID is `termite-warranty-dev`; its registered web app is `TermiteWarranty Dev Web`, its Hosting site is `termite-warranty-dev`, and its default Firestore location is `asia-northeast1` (Tokyo). These identifiers do not authorize or imply any production target.
- Cloud Functions for the development prototype use `asia-northeast1` so callable operations are colocated with the development Firestore database. Production regions remain open.
- Production deployment configuration, regions, monitoring, backup/recovery, and release procedure remain open.
- Existing-system homeowner data is not required for migration testing. Any use of actual homeowner data in the developer-owned development environment for another separately approved purpose requires a confidentiality agreement. Do not place that data in source control, documentation, test fixtures, or logs.

## Confirmed Authentication-Email Requirements

- Password-setup and password-reset messages use Firebase Authentication's standard email-delivery configuration in the initial release. Do not introduce custom SMTP, a custom sender domain, or a custom reply address merely to use the developer-designated Gmail address.
- The developer-owned Firebase project's contract identity is a Gmail address. This does not by itself establish the actual `From` value of Firebase Authentication messages; verify the rendered message in the development environment before production release.
- A custom sender identity, including the previous `株式会社AIR` display-name request, is deferred and may be introduced later.
- Firebase Console manual creation is accepted for the initial developer-superuser bootstrap. It must create a Firebase Authentication email/password user and a matching enabled staff-account record with the `developer superuser` role; then use the Console's password-reset email to let the developer set the password. Custom claims are not required for this bootstrap.
- Email-address verification is not an initial-release requirement. The password-setup email confirms that the recipient can receive the account setup message; sending a Firebase email-verification message is deferred.
- Do not store SMTP credentials, access tokens, or private email addresses in source control.

## Construction-Company Proposal Prototype

- A construction-company account is created without House Solution selecting a password. The construction company uses the common login screen's password setup/reset action and Firebase Authentication's standard password-reset email.
- Password setup/reset is self-service so access restoration does not wait for a House Solution administrator. House Solution retains account issue, disable, and re-enable authority.
- Business-workflow email delivery is not configured. The proposal prototype writes synthetic `queued` outbox records without a real recipient for House Solution notifications and with the configured company account email for company notifications. Delivery, retry, sender identity, bounce handling, and monitoring remain unimplemented.

## Implementation Constraint — Open Decision

Firebase Authentication supports configurable email templates and custom domains for authentication emails. A custom Gmail sender may require a supported custom SMTP or custom email-delivery implementation; its feasibility, credentials, delivery security, and operating cost are deferred. Revisit this only when a custom sender identity is again required.

## Migration Intake — Provisional Requirement

- No FileMaker export or CSV intake is required for the new-system release because existing-system data will not be migrated.
- House Solution retains the FileMaker data outside the new-system datastore.
- Operational cutover and rollback still require a procedure, but they do not include export, mapping, reconciliation, or migration-report acceptance.

## Technical References

- [Claris: Exporting data from FileMaker Pro](https://help.claris.com/en/pro-help/content/exporting-data.html)
- [Firebase: Use a custom domain for Authentication emails](https://firebase.google.com/docs/auth/email-custom-domain)
- [Firebase: Manage Users](https://firebase.google.com/docs/auth/web/manage-users)
- [Google Cloud Identity Platform: email configuration reference](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config)
