# 0023 Construction-Company Portal Workflow

- Date: 2026-09-13
- Status: Accepted
- Related specification: [Construction-company portal workflow](../specification.md#construction-company-portal-workflow)

## Context

The repository supports a new termite-warranty service rather than replacing the current FileMaker service. The current service's simply authenticated shared member page sends form contents by email and cannot establish a construction-company identity suitable for the new service. House Solution review may take time, so a working proposal prototype is needed before production requirements are settled.

The planning assumption is low request volume, five- or ten-year warranty cycles, and very unlikely simultaneous same-company updates to one case. This is not measured production evidence.

## Decision

Use one shared Firebase Authentication account per construction company. A House Solution administrator issues and disables accounts; the construction company sets and resets its own password. Server-owned account data binds the authenticated UID to one construction-company ID.

Use one provisional work item per existing or future case. An approved work item may be reinitialized in place for the next renewal request with an incremented revision, while an unfinished item blocks duplicate creation. Company users can access only their own work items and change only permitted response fields in editable states through trusted Callables. Submission locks editing. Staff approve and atomically reflect the result in registered data, or return it with a reason. Basic conflict control is revision comparison, one current item per case, approved-record-only reinitialization, state validation, and submission locking.

Write notification-outbox records to demonstrate email-trigger points without connecting an email-delivery provider.

## Rationale

Company-level accounts limit account administration to the number of participating companies. Structured responses remove email transcription, while staff approval retains the business judgment boundary. The work-item/case relationship and trusted mutation boundary keep the demonstrator understandable without designing collaborative editing for a workload where it is not expected.

## Alternatives

- Individual user accounts per company provide better attribution and offboarding but add administration beyond the current proposal premise.
- Public forms, organization links, and email one-time codes reduce password handling but do not provide the selected persistent portal and pending-work experience.
- Direct Firestore writes were rejected because company identity, allowed-field changes, state transitions, and registered-data promotion require a trusted boundary.

## Impact

The workflow adds a construction-company account profile, company-only portal, staff management/review page, case-linked work items, notification outbox, trusted Callables, Rules boundaries, synthetic data, and tests. Company-level authentication cannot identify the individual operator; each response therefore records a self-declared contact.

Actual email delivery, scheduled renewal generation, reminders, retained portal-response history across renewal cycles, attachments, production abuse controls, retention, and audit requirements remain unresolved under their respective matters. These do not change the accepted response-intake workflow.

## Migration

No legacy data or member-page account is imported. Prototype accounts and work items are created independently for the new service.

## Rollback

Remove the portal menu and company rendering branch, stop exporting the six portal Callables, deny the portal collections, and retain existing staff case/master behavior. No current FileMaker data is affected.

## Reconsider When

House Solution requires individual attribution, multiple users per company, repeat work-item history for one case, different notification channels, materially higher concurrency, or production-grade external access controls.
