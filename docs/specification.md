# termite-warranty Specification

- Last updated: 2026-09-13
- Specification version: 0.1.12
- Status: Prototype implementation
- Current phase: Deploy and verify the confirmed initial-release prototype in the provisioned Firebase development environment while retaining local Emulator Suite verification

## Requirement Records

The following topic records support this specification. They distinguish confirmed facts from open decisions.

- [Business context](requirements/business-context.md)
- [Workflow](requirements/workflow.md)
- [Legacy system and objectives](requirements/legacy-and-objectives.md)
- [Delivery and technology](requirements/delivery-and-technology.md)
- [Environments and authentication email](requirements/environments-and-authentication-email.md)
- [Search architecture](requirements/search-architecture.md)
- [Unresolved-matter register](requirements/house-solution-confirmations.md)
- [2026 initial-delivery roadmap](roadmaps/2026-initial-delivery.md)

## Purpose

Provide House Solution Co., Ltd. with a management system for a new termite-warranty service. The new service is not a replacement or migration of the current FileMaker service.

## Users

- House Solution Co., Ltd. staff who receive and review warranty enrolment information.
- Participating construction companies (工務店), who are expected to submit enrolment information through a form in the target workflow.

Staff roles are `developer superuser`, `House Solution administrator`, and `general staff`. The proposal prototype also has one shared `construction company` account per construction company. Detailed permissions are described in the provisional [security and access posture](requirements/security-and-access.md).

Staff sign in with Firebase Authentication email/password using browser-session persistence. A closed browser window clears the authentication state, so the next access requires login again. The developer superuser creates, edits, and disables House Solution administrator accounts only; House Solution administrators create, edit, and disable general-staff accounts. For a general-staff account, an administrator can edit email address, display name, and enabled state; its role is currently fixed to `general staff`. If additional roles are introduced later, an administrator may select only roles other than `House Solution administrator` and `developer superuser`. Staff can reset their passwords. Account creation sends a password-setup email through Firebase's standard delivery, and its action opens a Japanese password page on the same application origin; email-address verification is not an initial-release requirement. Disabled accounts must become unusable immediately, including an existing signed-in session. The initial developer-superuser account is bootstrapped manually in Firebase Console without custom claims, by creating matching Firebase Authentication and enabled staff-account records.

For the proposal prototype, a House Solution administrator issues and disables one shared account per construction company. The construction company sets and resets its own password through Firebase Authentication email. The account is server-bound to exactly one construction-company master and cannot access staff screens or another company's work items. Authentication identifies the company, not the individual operator; each response therefore requires the current contact person's name and email address.

## Scope

### In Scope

- Register warranty information.
- Manage construction-company, homeowner, property, and warranty-service master information.
- Manage House Solution branch master information.
- Manage House Solution staff accounts.
- Alert on warranty services that are approaching their expiry date.
- Provide search and list views for registered information.
- Start the new system without importing data from the current FileMaker system. Existing-system data migration is not a production-release requirement.
- Demonstrate the provisional construction-company portal described below for House Solution evaluation; production adoption remains subject to House Solution review.

### Not Yet a Confirmed Production Requirement

- The construction-company portal is approved as a proposal prototype, not yet accepted by House Solution for production operation.
- File attachment is not included in the initial release.

### Provisional Construction-Company Portal Prototype

- A House Solution administrator issues, disables, and re-enables one shared Firebase Authentication account per construction company. Self-sign-up is not provided.
- The construction company requests password setup or reset from the login screen and completes it on the Japanese `/auth/action` page under the same application origin. House Solution does not select or handle the password.
- A company account is associated with one construction-company ID on the server. The client cannot select or override that identity.
- Staff create a renewal work item for an existing case. The work-item document ID equals the case ID, so one portal record corresponds to one case in this prototype.
- A construction company can submit a new-case request. Its generated work-item ID is reserved as the future case ID so approval preserves a one-to-one relationship.
- A company can view and update only its own work items. It may edit only while the state is `awaiting response`, `draft`, or `needs correction`; submission locks editing until staff returns the item.
- Basic conflict protection consists of a revision check, idempotent one-item-per-case creation, valid state transitions, and submission locking. Collaborative editing is not included.
- After submission, House Solution staff either approve and atomically reflect the response in registered data or return it with a reason.
- Authentication records the company account. The response separately records the current contact person's self-declared name and email.
- The prototype creates durable queued-email records for renewal creation, company submission, return, and approval. It does not connect to an email-delivery provider or claim delivery.

## Environment and Boundaries

- The legacy system is FileMaker-based and is used concurrently by multiple locations and users.
- Authentication, database, and Firebase Hosting are selected for the prototype. Local verification continues to use the fictional `demo-termite-warranty` identifier, whose `demo-*` prefix has no live Firebase resources. The verified developer-owned development project is `termite-warranty-dev`; its default Firestore database and deployed Functions use `asia-northeast1` (Tokyo), and its registered Hosting site is `termite-warranty-dev`. Production remains a separate, unprovisioned Firebase project whose ownership, identifiers, and regions are under confirmation. External-service boundaries remain unconfirmed.

## Functional Requirements

- Warranty services have types and may have different warranty periods.
- The system must show an on-screen alert when an applied warranty service is 30 days from expiry.
- An alert remains visible through expiry even when notification status is `notified`. The case list visually marks an active case when any of its applied warranties is alert eligible, and the dashboard lists that case.
- Staff perform the actual customer notification at this stage. For each applied warranty, staff select notification status from `not notified`, `notified`, and `not required` through a combobox. The values and transitions may be changed later if operations require it.
- A newly added applied warranty starts with notification status `not notified`.
- A case can contain multiple applied warranty services. Each applied warranty holds its warranty-service product and whole-year warranty period.
- When warranty coverage is extended, add a new applied warranty to the existing case rather than overwriting an existing applied warranty. Set its warranty start date initially to the day after the existing warranty's expiry date; staff may change the date, and overlapping warranty periods are allowed. The product and period are therefore retained as warranty history within the case.
- A case itself does not hold warranty-period or case-wide expiry-date information. Alert eligibility is determined from its applied warranties.
- Each applied warranty holds a warranty start date. Calculate its initial expiry date as the day before the anniversary reached by adding its whole-year warranty period to that start date. Staff can manually correct the calculated expiry date.
- If an initial enrolment date is needed, calculate it as the oldest warranty start date among active applied warranties; do not store it on the case.
- The initial search/list view must filter by homeowner name, property address, construction-company name, warranty-service name, expiry date, and notification status. An expiry-date filter returns a case when at least one of its applied warranties matches the date condition.
- A property has a required property name. The case list is narrowed by selecting construction-company, homeowner, and property master records; it does not directly free-text-search their names. Property address is narrowed by prefecture and municipality. Responsible branch and warranty service are also filtered by selecting master records.
- The initial case list and dashboard use one row per case. They need not display warranty-period or expiry-date information; an alert-eligible case must be visually identifiable. Applied-warranty details are viewed on the case detail screen.
- With no search or filter value, every business-record list subscribes to at most the 20 documents with the freshest server-maintained update timestamp, using document ID as a stable tie-breaker. Unbounded full-collection and per-parent child-listener fallbacks are not permitted. Case year/month semantics remain unresolved under HSC-032.
- The current local prototype case list links to `/cases/{id}`. That detail screen is readable for active, cancelled, and invalid cases, shows all applied-warranty details and terminal reasons, returns to the dashboard/list, and offers the existing edit dialog only for an active case. A missing ID is reported in the signed-in application with a return link rather than being treated as a case record.
- Assign a case number automatically when registering a case using a fixed-width sequential number, initially represented as `000001`. Display it in the case list and dashboard. The production format remains unresolved under HSC-004.
- Display responsible branch in the case list and dashboard.
- The case list and dashboard display a marker when a case has at least one applied warranty with notification status `not notified`.
- The fixed default ordering is case update date descending, then case registration date descending when update dates are equal.
- Adding, editing, cancelling, invalidating, or changing notification status on an applied warranty updates its parent case's update date.
- Staff can create required master records from a case-registration flow and can separately access list/management screens for each master. Master creation/editing and case creation/editing open as button-triggered dialogs rather than permanent inline forms.
- The four current master lists link to `/masters/{master-type}/{id}` detail screens. These screens reuse the existing edit dialog, remain readable for inactive records, and provide a list-return link. A construction-company detail screen labels all of its linked properties, including inactive properties, as `担当物件`. A homeowner detail screen labels all of its linked properties, including inactive properties, as `所有物件`. A warranty-service detail screen lists up to 20 `対象物件` linked through active cases and active applied warranties and includes only active property masters. Every listed property name links to its detail screen. A missing ID is reported in the signed-in application with a list-return link.
- The application opens on the dashboard after login and uses a Navigation Drawer that is initially closed. Every business-menu title has an appropriate icon on its left, and the compact list spacing keeps the icon-to-title gap small enough for menu titles to remain readable. The current local prototype increment exposes separate drawer entries for construction-company, homeowner, warranty-service, and property management; branch management remains part of the broader initial-release scope but is not included in this increment.
- Show transient operation results, such as successful registration, update, account issuance, enable/disable, submission, approval, return, and their operation errors, in one shared bottom-positioned snackbar across staff and construction-company screens. Keep contextual guidance, validation errors inside an open dialog, review comments, missing-record states, and persistent data-load failures inline where the user needs them.
- Use a Vuetify date-selection component for warranty date entry instead of relying only on the browser-native date field, while preserving the canonical `YYYY-MM-DD` value sent to the registration service.
- Master records referenced by a case are not physically deleted. They can be changed between active and inactive states.
- Inactive masters are unavailable for new case selection while remaining displayed on existing cases.
- An existing applied warranty displays its warranty-service name from the master and therefore follows a master-name change. It does not retain a product-name snapshot.
- Each warranty-service master has a default warranty period expressed as a positive integer number of whole years. Change to that default affects only newly added applied warranties; it does not alter the period or expiry date of existing applied warranties.
- An applied warranty's period is not editable after it is created. Its warranty start date is editable; changing it recalculates the expiry date, after which staff can manually correct the expiry date without entering a reason.
- An `active` case is editable. Case statuses are `active`, `cancelled`, and `invalid`. A cancelled or invalid case is not physically deleted, requires a free-text reason, is excluded from alert eligibility, and is not editable.
- A cancelled or invalid case cannot be restored to active.
- An applied warranty can independently be set to `cancelled` or `invalid`, without physically deleting it. This requires a free-text reason, cannot be restored to active, and makes that applied warranty ineligible for alerts.
- A case remains active even when it has no active applied warranties.
- Case registration requires an application date, handover date, property, homeowner, construction company, responsible branch, and at least one applied warranty service. Application date and handover date are required case-level business dates. No ordering rule between them is currently specified. Each applied warranty separately requires a warranty start date and has an automatically calculated expiry date that staff may manually correct.
- Each case carries its responsible House Solution branch. Construction companies, homeowners, and properties do not carry a responsible-branch reference.
- A case holds homeowner, construction-company, and property IDs. Selecting a property during registration, or changing it while the case is active, initially applies that property's current homeowner and construction-company IDs. Staff can then change either case reference before saving. Construction-company and homeowner names, and the property name and address, are displayed from their masters and follow subsequent master changes; they are not stored as case snapshots.
- A property's homeowner and construction-company references remain editable after the property has been used by a case. Changing either property reference changes only the property and does not rewrite any existing case, regardless of case status.
- Master update, inactivation, and reactivation use last-write-wins. This rule does not change the separately implemented stale-baseline checks for case and applied-warranty multi-record workflows.
- A property holds a construction-company ID. At case registration and when an active case's property is changed, the property supplies the initially selected construction company; the case construction company remains editable before saving and while the case is active.
- When an active case's property is changed, initially select the newly selected property's homeowner and construction company, while allowing staff to change either value before saving. A later change to a property master's construction-company ID does not alter existing cases.
- A construction-company name, postal code, prefecture, municipality, and street/town and number are required. Building name, telephone, fax, contact person, contact details, and notes are optional. Email does not belong to the construction-company master; when a company account exists, the construction-company detail screen displays that account's email address.
- A homeowner name, postal code, prefecture, municipality, and street/town and number are required. Building name, telephone, fax, and notes are optional.
- A property name, postal code, prefecture, municipality, and street/town and number are required property fields. Building name is optional.
- Property and homeowner addresses are split into postal code, prefecture, municipality, street/town and number, and building name. Postal-code entry accepts seven digits with an optional hyphen and normalizes the stored value. Automatic lookup is a future API integration in the local prototype; until its API agreement and credentials are available, staff enter or correct the address manually.
- Postal-code address lookup uses Google Maps Platform Geocoding API. Restrict lookup to Japan and the entered postal code, parse typed address components rather than the formatted-address string, and keep the provider behind a replaceable application boundary. For multiple locality or town-area candidates, auto-fill only values that can be resolved unambiguously and let staff select or enter the remaining street/town and number. Where the API has no reliable match, allow staff to enter the address manually. When lookup fails, show an address-lookup failure message, retain existing input, and allow manual entry and saving. Staff may correct auto-filled values. Billing, project/key ownership, quota, restrictions, availability, and detailed response mapping remain open under HSC-017.
- The current FileMaker service receives new-enrolment and renewal information through a web form in a simply authenticated shared member page; the form sends email that staff manually process. This is context only: that member page does not meet the new service's requirements and is not reused.
- The proposal prototype uses a dedicated construction-company account, structured provisional data, company update, staff review, and promotion to registered data.
- Data from the current system will not be migrated into the new system. The new system begins with records entered for its own operation.
- Legacy case numbers are not imported. Production case-number rules for newly registered cases remain subject to HSC-004.

## Non-functional Requirements

- The system must support concurrent use by multiple locations and users. Required scale and performance targets are not yet confirmed.
- Actual registration volume is not measured. The proposal assumes that five- and ten-year warranty cycles and building-based cases make hundreds of daily procedures and simultaneous same-company updates to one case very unlikely. This assumption requires House Solution confirmation before production sizing.
- Reducing manual-entry work and human error is a confirmed business objective.
- Do not implement an operation-history or audit-log feature in the initial release. Registration and update timestamps required for list ordering remain in scope.

## Data and State

- Legacy-system data is sought during September 2026 for analysis, but its provision and quality are not yet confirmed.
- The initial provisional entities and fields are listed in [initial data model](requirements/initial-data-model.md). This is not an approved database schema or data contract.
- A property is a separate entity from a homeowner and carries the address. The detailed relationship mapping remains provisional.
- The initial search/list requirements are in [search and list](requirements/search-and-list.md).
- Master-management requirements are in [master management](requirements/master-management.md).
- Alert and dashboard requirements are in [alerts and dashboard](requirements/alerts-and-dashboard.md).
- Case-warranty requirements are in [case warranties](requirements/case-warranties.md).
- Branch and address requirements are in [branches and addresses](requirements/branches-and-addresses.md).
- Homeowners and construction companies do not have a parent-child relationship. A case directly references its homeowner, construction company, and property. The property supplies both initial selections, after which the active case may store independently selected references. Later changes to the property's homeowner or construction-company reference do not alter any existing case reference. See [decision 0014](decisions/0014-preserve-case-party-references.md).
- House Solution retains the FileMaker data outside the new-system datastore. No migration mapping, cleaning, reconciliation report, or migration acceptance test is required for release. Operational cutover and rollback remain open under HSC-016.

## Error Handling

Not yet confirmed.

## Security and Sensitive Information

Customer names and addresses are in scope. Existing-system homeowner data is not required for migration testing. Any use of actual homeowner data in the developer-owned development environment for another approved purpose still requires a separate confidentiality agreement. The provisional access-control approach and its residual risks are documented in [security and access](requirements/security-and-access.md). Do not commit real records or credentials.

## Current Phase Completion Criteria

- Confirm the minimum usable scope, roles, data fields, and alert rules needed for initial operation.
- Decide the no-migration operational cutover and rollback procedure before production release.
- Make explicit technology and deployment decisions before implementation begins.

## Unresolved Matters

The sole current list is the [unresolved-matter register](requirements/house-solution-confirmations.md). It separates House Solution confirmations from project technical decisions and links to one file per matter. Topic records may describe confirmed context but do not maintain separate open-decision lists.

## Specification Change Rules

After explicit user approval, Codex updates this file only when confirmed requirements or acceptance criteria change, and updates only affected roadmaps, relevant ADRs and index, `CHANGELOG.md`, implementation, tests, operations, data-contract, and user documentation in the same task. Specification and data-contract versions remain independent unless this project explicitly couples them. ADRs record durable decisions, not routine adjustments. A roadmap needs no `+0` history entry when scope, completion criteria, evidence, and progress are unchanged. If the roadmap denominator or earned credit changes, the next progress report states the previous percentage, new percentage, and reason.

This file always represents the current specification. Previous specification text is retained through Git history, not copied into versioned files.
