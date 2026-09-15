# Unresolved-Matter Register

- Status: Active
- Purpose: Provide the sole index of current unresolved matters, including House Solution confirmations and project technical decisions.
- Detail rule: Store one matter per file under `house-solution-confirmations/`.

This register records questions and their status. It is not a source of confirmed requirements. After an answer or technical decision is explicitly approved, update the affected authoritative documents through the normal specification-change process. When asked to present unresolved matters, use this index and its linked files rather than chat history or a separate topic-document list.

When a matter is resolved, retain its detail file with the decision, decision maker/date, evidence, affected authoritative documents, and reflected revision when available. Move the row to the resolved table without deleting or reusing the ID. A chat instruction is acceptable evidence when its decision is summarized durably in the matter file and its date and available task/thread or share identifier are recorded.

## Unresolved Matters

| ID | Matter | Status | Decision owner |
| --- | --- | --- | --- |
| HSC-001 | [Case, applied-warranty, and referenced-master data retention](house-solution-confirmations/HSC-001-data-retention-policy.md) | Not yet asked | House Solution |
| HSC-002 | [Initial-release acceptance scope](house-solution-confirmations/HSC-002-release-acceptance-scope.md) | Not yet asked | House Solution |
| HSC-003 | [Case field validation](house-solution-confirmations/HSC-003-case-field-validation.md) | Not yet asked | House Solution |
| HSC-004 | [Production case-number rules](house-solution-confirmations/HSC-004-case-number-rules.md) | Not yet asked | House Solution |
| HSC-005 | [Notification workflow and history](house-solution-confirmations/HSC-005-notification-workflow.md) | Partially answered | House Solution |
| HSC-006 | [Dashboard presentation and accessibility](house-solution-confirmations/HSC-006-dashboard-presentation.md) | Not yet asked | House Solution |
| HSC-008 | [Master-list behavior](house-solution-confirmations/HSC-008-master-list-behavior.md) | Partially answered | House Solution |
| HSC-009 | [Editing masters already used by cases](house-solution-confirmations/HSC-009-used-master-editing.md) | Not yet asked | House Solution |
| HSC-011 | [Legal and operational data ownership](house-solution-confirmations/HSC-011-data-ownership.md) | Not yet asked | House Solution |
| HSC-012 | [Homeowner system access](house-solution-confirmations/HSC-012-homeowner-access.md) | Not yet asked | House Solution |
| HSC-017 | [Postal-code API operating conditions](house-solution-confirmations/HSC-017-postal-api-conditions.md) | Partially answered | Project, with House Solution production input |
| HSC-020 | [Production Firebase environment and operations](house-solution-confirmations/HSC-020-production-firebase-operations.md) | Open technical decision | Project, with House Solution input |
| HSC-022 | [Production database selection](house-solution-confirmations/HSC-022-production-database-selection.md) | Open technical decision | Project, with House Solution input |
| HSC-023 | [Firestore N-Gram query and consistency design](house-solution-confirmations/HSC-023-ngram-query-consistency.md) | Open technical decision | Project technical decision |
| HSC-024 | [Role types and functional permissions](house-solution-confirmations/HSC-024-role-business-data-access.md) | Not yet asked | House Solution, then project |
| HSC-025 | [Production service and risk requirements](house-solution-confirmations/HSC-025-production-service-requirements.md) | Not yet asked | House Solution |
| HSC-026 | [Scale and response-time targets](house-solution-confirmations/HSC-026-scale-performance-targets.md) | Not yet asked | House Solution |
| HSC-027 | [Business success measures](house-solution-confirmations/HSC-027-business-success-measures.md) | Not yet asked | House Solution |
| HSC-028 | [Business-flow error handling](house-solution-confirmations/HSC-028-error-handling.md) | Not yet asked | House Solution |
| HSC-029 | [Remaining data-model rules](house-solution-confirmations/HSC-029-remaining-data-model-rules.md) | Open decision | House Solution, then project |
| HSC-030 | [Custom authentication-email sender](house-solution-confirmations/HSC-030-custom-auth-email-sender.md) | Deferred | House Solution, if requested |
| HSC-031 | [Mobile-device usage and support scope](house-solution-confirmations/HSC-031-mobile-device-support.md) | Not yet asked | House Solution |
| HSC-033 | [Branch management necessity](house-solution-confirmations/HSC-033-branch-management-necessity.md) | Not yet asked | House Solution |
| HSC-034 | [Deterioration countermeasure grade and warranty limit](house-solution-confirmations/HSC-034-deterioration-countermeasure-grade.md) | Not yet asked | House Solution |
| HSC-035 | [Case cancellation and invalidation criteria](house-solution-confirmations/HSC-035-case-cancellation-invalidation-criteria.md) | Not yet asked | House Solution |

## Resolved Matters

| ID | Matter | Decision date | Decision owner | Evidence |
| --- | --- | --- | --- | --- |
| HSC-007 | [Case search and list behavior](house-solution-confirmations/HSC-007-case-search-list.md) | 2026-09-14 | Project owner | Current Codex task: date-range and list-behavior approval |
| HSC-010 | [Warranty payer and contracting party](house-solution-confirmations/HSC-010-payer-contracting-party.md) | 2026-09-14 | Project owner | Current Codex task: financial and contracting-party scope boundary |
| HSC-013 | [Construction-company submission and review](house-solution-confirmations/HSC-013-construction-company-submission.md) | 2026-09-14 | Project owner | Current Codex task: initial portal workflow acceptance |
| HSC-014 | [Legacy FileMaker data delivery](house-solution-confirmations/HSC-014-legacy-data-delivery.md) | 2026-09-11 | House Solution | Current Codex task instruction: existing-system data migration is not required |
| HSC-015 | [Migration scope and data cleaning](house-solution-confirmations/HSC-015-migration-scope-cleaning.md) | 2026-09-11 | House Solution | Current Codex task instruction: existing-system data migration is not required |
| HSC-016 | [Cutover, parallel operation, and rollback](house-solution-confirmations/HSC-016-cutover-rollback.md) | 2026-09-14 | Project owner | Current Codex task: independent-service boundary |
| HSC-018 | [Construction-company postal-code lookup](house-solution-confirmations/HSC-018-company-postal-lookup.md) | 2026-09-14 | Project owner | Current Codex task: same lookup behavior as property/homeowner |
| HSC-019 | [Address and contact-field validation](house-solution-confirmations/HSC-019-address-contact-validation.md) | 2026-09-14 | Project owner | Current Codex task: address, TEL/FAX, and email validation rules |
| HSC-021 | [Account creation, deletion, and recovery](house-solution-confirmations/HSC-021-account-lifecycle.md) | 2026-09-14 | Project owner, then project | Current Codex task: reversible account lifecycle |
| HSC-032 | [Case-list year/month basis](house-solution-confirmations/HSC-032-case-list-month-basis.md) | 2026-09-14 | Project owner | Current Codex task: reject mandatory year/month filtering |
