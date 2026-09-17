# HSC-020: Production Firebase Environment and Operations

- Status: Resolved
- Decision owner: Project owner

## Confirmed Context

Development and production use separate Firebase projects. The development project exists and remains developer-owned. Production provisioning, identifiers, and settings remain to be performed and recorded.

## Resolution

- House Solution owns and contractually controls the production Firebase/Google Cloud project, billing, and final administrative decisions. The production project ID, actual accounts, IAM bindings, and settings must be recorded during provisioning.
- Initial provisioning may use a temporary account supplied by House Solution. House Solution retains a recovery method; after verification, House Solution changes the password, revokes active sessions, and the temporary credentials are destroyed.
- Ongoing development/maintenance uses the responsible developer's own Google account with only the necessary IAM permissions. A House Solution backup administrator is recommended but not mandatory. The routine maintenance account must not have project-deletion permission.
- The production project is separate from development. If Firestore is selected for production under HSC-022, Firestore and Cloud Functions use `asia-northeast1`; production Firebase Hosting and other service settings are recorded at provisioning. Use the Blaze plan for production.
- Future deployment uses environment-fixed, separate workflows: `dev` push to Dev and `main` push/merge to Prod. Each environment verifies the intended project explicitly, uses environment-specific authentication, deploys only a verified revision-bound artifact, prevents concurrent deployments, and has a reviewed rollback procedure.
- Workload Identity Federation is the first-choice GitHub Actions authentication. Adoption requires successful verification of Firestore, Functions, and Hosting deployment. If it is not viable for the actual Firebase CLI path, use a restricted, rotated, and monitored service-account key as a bounded fallback.
- Backups remain within the production project: Firestore point-in-time recovery for 7 days and daily managed backups for 30 days. Managed backups are a Firestore-managed service and are not a Cloud Storage bucket. Firebase Authentication is exported weekly and after important changes to a private production Storage location and retained for 30 days.
- The recovery objective is a maximum 24-hour data-loss window and restoration of business operations within 4 hours during business hours for a critical incident. Monitoring sends automatic email alerts for production unavailability, repeated severe Functions errors, deployment failure, backup/Auth-export failure, and budget thresholds of 50%, 80%, and 100%.
- Development/maintenance staff provide the first technical response; House Solution makes business decisions. Codex is only a support tool and is not the accountable operator.
- House Solution-controlled deletion, suspension, or changes to the project, IAM, billing, or resources are not guaranteed to be fully reversible by the routine maintenance account. If recovery is possible, it is handled by separate discussion and approval.
- These operational decisions do not resolve HSC-022 production database selection or HSC-025 detailed security, privacy, support, and cost requirements. They do not replace final legal or contract confirmation.

## Decision maker/date

Project owner, 2026-09-17.

## Evidence

Explicit user adoption of the HSC-020 recommendation in the current Codex task.

- Reflected revision: pending current commit.

## Affected Documents

Specification, environment/authentication requirements, delivery and technology, security and access, operations, ADR-0007, ADR-0032, and the central register. Production provisioning and implementation remain pending.
