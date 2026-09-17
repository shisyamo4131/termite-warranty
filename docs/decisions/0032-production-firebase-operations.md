# 0032 Production Firebase Environment and Operations

- Date: 2026-09-17
- Status: Accepted
- Related specification: [Environment and Boundaries](../specification.md#environment-and-boundaries)
- Supersedes: None

## Context

ADR-0007 established separate development and production Firebase projects, but production ownership, provisioning, deployment, monitoring, backup, and recovery remained open. The development project is developer-owned and technically deployed; production has not been provisioned or configured. HSC-022 production database selection and HSC-025 detailed service/risk requirements remain unresolved.

## Decision

- House Solution owns and contractually controls the production Firebase/Google Cloud project, billing, and final administrative decisions. The project ID, accounts, IAM bindings, and settings are recorded during provisioning.
- Initial provisioning may use a temporary account supplied by House Solution. House Solution retains recovery access; after verification it changes the password, revokes active sessions, and the temporary credentials are destroyed. Ongoing maintenance uses individually assigned developer Google accounts with only necessary permissions. A House Solution backup administrator is recommended, not mandatory; routine maintenance cannot delete the project.
- Keep development and production as separate Firebase projects. If Firestore is selected under HSC-022, production Firestore and Cloud Functions use `asia-northeast1`; production uses the Blaze plan.
- Use environment-fixed separate workflows for future `dev` push→Dev and `main` push/merge→Prod deployment. Each verifies the explicit target, authenticates for that environment, deploys a verified revision-bound artifact, prevents concurrent deployments, and has a reviewed rollback procedure.
- Prefer GitHub Actions Workload Identity Federation, contingent on successful Firestore/Functions/Hosting Firebase CLI verification. If unavailable, use a restricted, rotated, monitored service-account key.
- Within production, use 7-day Firestore PITR, 30-day daily managed backups, and weekly/important-change Firebase Authentication exports to private production Storage retained 30 days. Managed backups are Firestore-managed and are not a Storage bucket.
- Target a maximum 24-hour data-loss window and restoration of critical business operations within 4 business hours. Send automatic email alerts for production unavailability, repeated severe Functions errors, deployment failure, backup/Auth-export failure, and budget levels 50%, 80%, and 100%.
- Development/maintenance handles first technical response; House Solution handles business decisions. Codex is a support tool, not the accountable operator. Full restoration from House Solution-controlled deletion/suspension/change is not guaranteed and requires separate discussion if possible.

## Rationale

This assigns production control to the operating business, preserves development isolation, and gives a small project a bounded deployment and recovery baseline without assuming a production database or adding active-active infrastructure. WIF reduces long-lived CI credentials when the actual Firebase CLI path supports it; the restricted key fallback preserves a practical path if compatibility blocks adoption.

## Impact

HSC-020 is resolved. Specification, environment, delivery, security, and operations documents record the decision. Production provisioning, IAM, billing, monitoring, backup, Auth export, deployment workflow, and rollback remain implementation/setup work. HSC-022 and HSC-025 remain open.

## Migration / Rollout

No production migration is authorized. Provision the separate project, record its identifiers and settings, establish ownership/recovery, verify deployment authentication, and rehearse backup/restore and rollback before production release.

## Reconsideration Trigger

Reconsider if HSC-022 selects another production database, HSC-025 establishes incompatible service/risk targets, Firebase CLI/WIF verification fails, or House Solution changes ownership, recovery, region, retention, or cost requirements.
