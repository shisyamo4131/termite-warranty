# 2026 Initial-Delivery Roadmap

- Status: Active
- Scope: Mandatory production operation by the end of October 2026, starting without data migration from the current system.
- Progress: 0% — no milestone completion evidence has been recorded.
- Progress method: Milestone weights total 100%. Partial credit is not allowed; credit is earned only when the stated completion criteria are verified.

## Milestones

| ID | Milestone | Target period | Weight | Completion criteria | Evidence |
| --- | --- | --- | ---: | --- | --- |
| M1 | Development-environment prototype | Mid-September 2026 | 25% | A prototype implementing the confirmed initial-release requirements in the [specification](../specification.md), using Nuxt, Vuetify, and Firestore with the selected N-Gram search approach, including editable case registration with required application/handover dates, master management with construction-company address/contact fields, branch and five-part-address support, postal-code auto-fill, search/list, and continuing on-screen expiry alerts/dashboard, is first verified locally with Firebase Emulator Suite and then provided in the development environment for user review. Unresolved units for multiple applied warranties must remain explicitly identified. | Verified partial local slice: login, dashboard Navigation Drawer, trusted reversible CRUD and create/edit dialogs for four masters, case-registration dialog with four-master quick creation, required application/handover dates, Vuetify date selection, construction-company address/contact fields, property-defaulted and independently editable case homeowner/company references, non-propagating property-party edits, atomic case/first-warranty registration, transactional active-case editing, case filters, and list/alert display. Verification includes domain/rules/emulator tests and external-browser smoke checks. Full criteria and development-environment review remain incomplete, so no milestone credit. |
| M2 | Requests and defect corrections | Through late September 2026 | 15% | Agreed prototype feedback and identified defects within the agreed scope are addressed and their verification is recorded. | Planned; none yet |
| M3 | Production-readiness development and release rehearsal | Through early October 2026 | 25% | Remaining agreed production-readiness functionality is implemented, the empty-start and initial master-data setup procedure is verified, and a release rehearsal records the agreed test results and outstanding items. | Planned; none yet |
| M4 | Production preparation | Through mid-October 2026 | 15% | The production environment is built and release preparation is verified. | Planned; none yet |
| M5 | Operational cutover and official production release | End of October 2026 | 20% | After the agreed transition period, new registrations switch to the new system under the approved system-of-record and rollback procedure, and the production system is officially released without importing existing-system data. | Planned; none yet |

## Confirmed Delivery Constraints

- The end-of-October 2026 target is mandatory because users' work cannot be stopped for an extended period.
- Temporary parallel operation remains the initial safety direction, but its necessity, timing, authority boundary, and duration must be reconfirmed because no final data migration will occur.

## Open Dependencies and Risks

- Prototype scope is limited to staff registration, search/list views, and expiry alerts. Their acceptance criteria and detailed staff roles are not yet confirmed.
- Firebase Emulator Suite remains the local regression environment. The developer-owned `termite-warranty-dev` environment is provisioned; deployment and development-environment acceptance remain incomplete.
- House Solution retains the FileMaker data outside the new system. Initial master-data setup, the system-of-record transition, and rollback behavior remain unverified.
- Nuxt SPA, Vuetify, Firebase Hosting, Firestore with its N-Gram approach, Firebase Authentication email/password with browser-session persistence, and Cloud Functions for Firebase account administration/enabled-account enforcement are selected. Local verification uses the fictional `demo-termite-warranty` Emulator Suite identifier; the provisioned development project is `termite-warranty-dev`. Production uses a separate Firebase project whose ownership is under confirmation. Transaction/retry/recovery details, production package promotion, monitoring, authentication-email sending mechanism, and production operations are not yet designed. Firestore remains subject to a production reassessment against PostgreSQL.
- The provisional business-data access posture starts with the same CRUD access for all enabled authenticated users, defers browser-external attack mitigation, and requires a later enforcement decision if another business-data role-specific restriction is confirmed. Account management is already a server-enforced exception.
- The timing of the new-registration switch and any permitted legacy-system stop are not yet confirmed.
- Actual registration volume, historic record count, and concurrent-user count are unknown. The current upper-bound planning assumption is 40 telephone contacts per day, or approximately 1,200 per 30-day month and 14,400 per year if every contact is a new case.

## Evidence and Change Rules

- Link completed milestones to the relevant design, implementation, test, review, deployment, or acceptance evidence when it exists.
- When scope, weights, completion criteria, or risks change, record the reason and update affected specification and requirement records in the same change.
- Do not report progress based solely on calendar time or an unverified self-report.
