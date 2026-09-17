# 2026 Initial-Delivery Roadmap

- Status: Active
- Scope: Mandatory production operation by the end of October 2026, starting without data migration from the current system.
- Progress: 0% — no milestone completion evidence has been recorded.
- Progress method: Milestone weights total 100%. Partial credit is not allowed; credit is earned only when the stated completion criteria are verified.

## Milestones

| ID | Milestone | Target period | Weight | Completion criteria | Evidence |
| --- | --- | --- | ---: | --- | --- |
| M1 | Development-environment prototype | Mid-September 2026 | 25% | A prototype implementing the confirmed initial-release requirements in the [specification](../specification.md), using Nuxt, Vuetify, and Firestore with the selected N-Gram search approach, including editable case registration with required application/handover dates, master management with construction-company address/contact fields, branch and five-part-address support, a working same-origin Hosting shard lookup with candidate selection and manual fallback, search/list, continuing on-screen expiry alerts/dashboard, and the accepted construction-company portal workflow, is first verified locally with Firebase Emulator Suite and then provided in the development environment for user review. M1 cannot receive credit while the working shard lookup is absent. The initial-release manual update command, manifest integrity metadata, and 60-day administrator freshness warning remain explicit incomplete conditions for M1/production readiness and must be implemented and verified before release acceptance. Unresolved units for multiple applied warranties must remain explicitly identified. | Verified partial slice: login, dashboard Navigation Drawer, trusted reversible CRUD and create/edit dialogs for four masters, case-registration dialog with four-master quick creation, required application/handover dates, Vuetify date selection, construction-company address/contact fields, property-defaulted and independently editable case homeowner/company references, non-propagating property-party edits, atomic case/first-warranty registration, transactional active-case editing, case filters, and list/alert display. Revision `967bd1cc37fb025ee7356274c60a94a550fc8270` passed the comprehensive gates and was deployed to the development environment by [run 22](https://github.com/shisyamo4131/termite-warranty/actions/runs/34676802182); Hosting HTTP and authenticated construction-company-list technical smoke checks passed on 2026-09-12. Full criteria and House Solution development-environment review remain incomplete, so no milestone credit. |
| M2 | Requests and defect corrections | Through late September 2026 | 15% | Agreed prototype feedback and identified defects within the agreed scope are addressed and their verification is recorded. | Planned; none yet |
| M3 | Production-readiness development and release rehearsal | Through early October 2026 | 25% | Remaining agreed production-readiness functionality is implemented, the empty-start and initial master-data setup procedure is verified, and a release rehearsal records the agreed test results and outstanding items. | Planned; none yet |
| M4 | Production preparation | Through mid-October 2026 | 15% | The production environment is built and release preparation is verified. | Planned; none yet |
| M5 | Official production release | End of October 2026 | 20% | The new service's production system is officially released without importing existing-system data, after its deployment rollback, backup/recovery, incident, and operating procedures are approved. No FileMaker system-of-record transition is required. | Planned; none yet |

## Confirmed Delivery Constraints

- The end-of-October 2026 target is mandatory because users' work cannot be stopped for an extended period.
- The current FileMaker service and new service remain independent. No business-data cutover or parallel system-of-record operation connects them.

## Open Dependencies and Risks

- Prototype scope is limited to staff registration, search/list views, and expiry alerts. Their acceptance criteria and detailed staff roles are not yet confirmed.
- The shared-account construction-company portal workflow is accepted for the initial scope. It does not yet have real email delivery, scheduled renewal generation, repeat-cycle history, or production external-access controls.
- Firebase Emulator Suite remains the local regression environment. The developer-owned `termite-warranty-dev` environment is provisioned and revision `503d062bb250e2cf0ea997d38fb0650c073f208c` is technically deployed with successful verification and authenticated smoke evidence. The next work is continued prototype polish and House Solution development-environment review; full development-environment acceptance remains incomplete.
- House Solution retains the FileMaker data outside the new system. Initial master-data setup and the new system's deployment rollback/recovery behavior remain unverified.
- Nuxt SPA, Vuetify, Firebase Hosting, Firestore with its N-Gram approach, Firebase Authentication email/password with browser-session persistence, and Cloud Functions for Firebase account administration/enabled-account enforcement are selected. Local verification uses the fictional `demo-termite-warranty` Emulator Suite identifier; the provisioned development project is `termite-warranty-dev`. Production uses a separate Firebase project whose ownership is under confirmation. Transaction/retry/recovery details, production package promotion, monitoring, authentication-email sending mechanism, and production operations are not yet designed. Firestore remains subject to a production reassessment against PostgreSQL.
- The provisional business-data access posture starts with the same CRUD access for all enabled authenticated users, defers browser-external attack mitigation, and requires a later enforcement decision if another business-data role-specific restriction is confirmed. Account management is already a server-enforced exception.
- Actual registration volume, historic record count, and concurrent-user count are unknown. The current upper-bound planning assumption is 40 telephone contacts per day, or approximately 1,200 per 30-day month and 14,400 per year if every contact is a new case.
- The approved [technical remediation backlog](technical-remediation.md) must be completed in the affected areas before production acceptance. In particular, verification/deploy wiring and bounded list-query work are production-readiness dependencies. Mandatory case-month filtering was rejected; production filtered-query scalability remains open under HSC-026.

## Evidence and Change Rules

- Link completed milestones to the relevant design, implementation, test, review, deployment, or acceptance evidence when it exists.
- When scope, weights, completion criteria, or risks change, record the reason and update affected specification and requirement records in the same change.
- Do not report progress based solely on calendar time or an unverified self-report.
