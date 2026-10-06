# Environments and Authentication Email

## Confirmed Environment Requirements

- Provide the mid-September 2026 prototype in a development environment.
- Use separate Firebase projects for the development and production environments.
- The development Firebase project is owned by the developer. House Solution owns and contractually controls the production Firebase/Google Cloud project and billing; its project ID, accounts, IAM bindings, and settings are recorded during provisioning.
- The provisioned and verified development Firebase project ID is `termite-warranty-dev`; its registered web app is `TermiteWarranty Dev Web`, its Hosting site is `termite-warranty-dev`, and its default Firestore location is `asia-northeast1` (Tokyo). These identifiers do not authorize or imply any production target.
- Cloud Functions for the development prototype use `asia-northeast1` so callable operations are colocated with the development Firestore database. If Firestore is selected for production under HSC-022, production Firestore and Functions use `asia-northeast1`. Production uses the Blaze plan.
- Production provisioning and implementation remain pending. The adopted operation plan covers environment-fixed deployment workflows, environment-specific authentication, verified artifacts, concurrency protection, rollback, monitoring, backups, and recovery; exact project settings and recorded identifiers are created during provisioning.
- Existing-system homeowner data is not required for migration testing. Any use of actual homeowner data in the developer-owned development environment for another separately approved purpose requires a confidentiality agreement. Do not place that data in source control, documentation, test fixtures, or logs.

## Confirmed Recovery Scope

- Superseding owner decision on 2026-10-06: business clients and Functions always use `(default)`. Named databases are temporary restore/developer-verification space. Apply the complete verified image back to default, preserving independent control/current account authority/issued numbers, verify it, open administrator read-only/non-mutating CSV confirmation, then reopen only after separate external HS consent. Redeployment is allowed in principle. Current Dev named-DB data must survive migration; stopping, writing/deleting current data and deployment are not broadly authorized. [Design and concrete migration boundaries](../design/default-database-recovery.md). This is a confirmed target, not current deployed behavior.

- Additional owner adoption on 2026-10-06: restore missing Auth accounts with their original UID, preserving surviving identities and current profile roles/enabled state. This covers total Auth loss when profile authority survives; corrupted credentials of surviving users are outside this increment. Implement/verify with fictional Local data first, without modifying normal Dev Auth. The [design](../design/backup-recovery-implementation.md#2026-10-06-missing-identity-auth-repair-increment) separates Local import from read-only Dev inspection and unverified live credential recovery.

- Implementation-start instruction on 2026-10-06: implement the adopted Q&A scope. Local runtime/maintenance controls, administrator status UI, external CLI, preserved authorization/numbering and automatic-backup/Auth-export monitoring code are verified. This replaces the Q&A-time offline-only/unimplemented descriptions below for that code scope. Dev configuration, deployment, notification delivery, PITR restoration/cutover and owner-approved reopening are verified in the linked evidence. First managed-backup restoration remains unverified. Missing-identity import is Local-verified only; live Auth import remains unavailable. See [implementation design](../design/backup-recovery-implementation.md) and [operator runbook](../runbooks/backup-recovery.md).

- Owner adoption on 2026-10-06: after cutover, retain the former database separately from normal business access until recovery verification and incident investigation are complete. Do not delete it immediately; decide deletion separately afterward. Retention duration, completion evidence and deletion procedure remain undecided. This policy is not authorization to execute live data deletion.

- Owner adoption on 2026-10-06: the Dev drill includes isolated restored-database/data/behavior verification followed by temporarily putting normal Dev into maintenance and rehearsing connection cutover, awaiting-HS-verification and reopening. Coordinate normal-Dev downtime before execution. This does not include overwriting the existing database or rolling back live Dev Authentication users. Verify exact targets, settings/permissions and stop/cutover/rollback procedures before execution. The drill has not run.

- Owner adoption on 2026-10-06: send automatic backup-failure email alerts to development, which investigates/responds and contacts HS outside the system when needed. Simultaneous automatic notification to HS administrators is not adopted. Verify actual recipients during production provisioning; detection, delivery/retry and monitoring are not implemented.

- Owner decisions in this Codex chat on 2026-10-06: whole-business-database recovery only, with individual property/warranty recovery outside this preparation scope. The stated rationale is that the system is not multi-tenant.
- Preserve ADR0032's automatic daily managed Firestore backups, PITR and separate Authentication backup policy. Real configuration/restoration remains unimplemented.
- Development enters maintenance mode, proposes a safe recovery time and explains registrations/updates after that point that will not be recovered. Obtain HS approval outside the system before restoration. After restoration, development validates and reports; HS verifies and approves reopening before development lifts maintenance. Pre-restoration and reopening approvals are separate.
- All recovery reporting, discussion and approval with HS occur outside the business system. An in-system approval button is not required. Specific external channels and approval evidence location/fields remain undecided.
- Maintenance has recovery-in-progress and awaiting-HS-verification phases. During recovery, HS administrators see a maintenance notice only. After restoration, technical validation and account consistency checks, development opens viewing and non-mutating CSV export. Business registration, editing, deletion and report/billing status writes remain stopped until approved reopening. Availability during an outage is not guaranteed.
- Preserve current Authentication users when only business data is damaged. Restore Authentication separately only when its own damage/loss requires recovery. In either case, development verifies identity correspondence, roles and disabled state against restored account documents. Unresolved inconsistencies block reopening. Technical restore and reconciliation procedures remain to be designed.
- Development operates maintenance transitions, restoration, validation and reopening through dedicated commands outside the business application. In-app UI provides state/backup-history viewing only, with no recovery-operation buttons. The existing CLI is an offline mock only; the real route must be verified during application outage.
- State/backup-history viewing is available to developer superusers and HS administrators, not general staff or construction-company accounts. Include the automatic backup last-success time, failure and absence of backups. During recovery in progress, HS administrators still receive a maintenance notice only. Screen and data-access controls are not implemented.
- Technical recovery-time assessment, command/IAM contracts, detailed screen fields, stop/cutover/rollback mechanisms, Auth reconciliation and Dev rehearsal remain to be designed. No live restore, database cutover, IAM change or production provisioning has been performed under these decisions. See [ADR0032](../decisions/0032-production-firebase-operations.md#2026-10-06-recovery-operation-amendment) and the [technical remediation plan](../roadmaps/technical-remediation.md#2026-10-06-回答待ち期間の優先順位バックアップ設計検討).

## Confirmed Authentication-Email Requirements

- Password-setup and password-reset messages use Firebase Authentication's standard email-delivery configuration in the initial release. Their action link opens the Japanese `/auth/action` page on the same application origin, where the Firebase one-time code is verified and the new password is confirmed. Do not introduce custom SMTP, a custom sender domain, or a custom reply address merely to use the developer-designated Gmail address.
- The developer-owned Firebase project's contract identity is a Gmail address. This does not by itself establish the actual `From` value of Firebase Authentication messages; verify the rendered message in the development environment before production release.
- A custom sender identity, including the previous `株式会社AIR` display-name request, is deferred and may be introduced later.
- Firebase Console manual creation is accepted for the initial developer-superuser bootstrap. It must create a Firebase Authentication email/password user and a matching enabled staff-account record with the `developer superuser` role; then use the Console's password-reset email to let the developer set the password. Custom claims are not required for this bootstrap.
- Email-address verification is not an initial-release requirement. The password-setup email confirms that the recipient can receive the account setup message; sending a Firebase email-verification message is deferred.
- Do not store SMTP credentials, access tokens, or private email addresses in source control.

## Construction-Company Proposal Prototype

- A construction-company account is created without House Solution selecting a password. The construction company uses the common login screen's password setup/reset action and Firebase Authentication's standard password-reset email.
- Password setup/reset is self-service so access restoration does not wait for a House Solution administrator. House Solution retains account issue, disable, and re-enable authority.
- Business-workflow email delivery is not configured. The proposal prototype writes synthetic `queued` outbox records without a real recipient for House Solution notifications and with the configured company account email for company notifications. Delivery, retry, sender identity, bounce handling, and monitoring remain unimplemented.

## Implementation Constraint — Remaining Open Decision

The same-site password action handler is accepted in [ADR 0024](../decisions/0024-same-site-password-action-handler.md). A custom Gmail sender may require a supported custom SMTP or custom email-delivery implementation; its feasibility, credentials, delivery security, and operating cost remain deferred. Revisit sender customization only when a custom sender identity is again required.

## Migration Intake — Provisional Requirement

- No FileMaker export or CSV intake is required for the new-system release because existing-system data will not be migrated.
- House Solution retains the FileMaker data outside the new-system datastore.
- Operational cutover and rollback still require a procedure, but they do not include export, mapping, reconciliation, or migration-report acceptance.

## Technical References

- [Claris: Exporting data from FileMaker Pro](https://help.claris.com/en/pro-help/content/exporting-data.html)
- [Firebase: Use a custom domain for Authentication emails](https://firebase.google.com/docs/auth/email-custom-domain)
- [Firebase: Manage Users](https://firebase.google.com/docs/auth/web/manage-users)
- [Google Cloud Identity Platform: email configuration reference](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config)
