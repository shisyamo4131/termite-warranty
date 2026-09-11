# termite-warranty Specification

- Last updated: 2026-09-11
- Specification version: 0.1.5
- Status: Prototype implementation
- Current phase: Implement the confirmed initial-release prototype and verify it locally with Firebase Emulator Suite until the development Firebase environment is provided

## Requirement Records

The following topic records support this specification. They distinguish confirmed facts from open decisions.

- [Business context](requirements/business-context.md)
- [Workflow](requirements/workflow.md)
- [Legacy system and objectives](requirements/legacy-and-objectives.md)
- [Delivery and technology](requirements/delivery-and-technology.md)
- [Environments and authentication email](requirements/environments-and-authentication-email.md)
- [Search architecture](requirements/search-architecture.md)
- [Open decisions](requirements/open-decisions.md)
- [2026 initial-delivery roadmap](roadmaps/2026-initial-delivery.md)

## Purpose

Provide House Solution Co., Ltd. with a replacement management system for termite-warranty operations.

## Users

- House Solution Co., Ltd. staff who receive and review warranty enrolment information.
- Participating construction companies (工務店), who are expected to submit enrolment information through a form in the target workflow.

Application roles are `developer superuser`, `House Solution administrator`, and `general staff`. Detailed permissions are described in the provisional [security and access posture](requirements/security-and-access.md).

Staff sign in with Firebase Authentication email/password using browser-session persistence. A closed browser window clears the authentication state, so the next access requires login again. The developer superuser creates, edits, and disables House Solution administrator accounts only; House Solution administrators create, edit, and disable general-staff accounts. For a general-staff account, an administrator can edit email address, display name, and enabled state; its role is currently fixed to `general staff`. If additional roles are introduced later, an administrator may select only roles other than `House Solution administrator` and `developer superuser`. Staff can reset their passwords. Account creation sends a password-setup email; email-address verification is not an initial-release requirement. Disabled accounts must become unusable immediately, including an existing signed-in session. The initial developer-superuser account is bootstrapped manually in Firebase Console without custom claims, by creating matching Firebase Authentication and enabled staff-account records.

## Scope

### In Scope

- Register warranty information.
- Manage construction-company, homeowner, property, and warranty-service master information.
- Manage House Solution branch master information.
- Manage House Solution staff accounts.
- Alert on warranty services that are approaching their expiry date.
- Provide search and list views for registered information.
- Perform the best feasible migration from the legacy system for the mandatory production release. House Solution retains the FileMaker data; complete historical migration is not an acceptance condition.

### Deferred from the Initial Release

- Construction-company form submission and staff review of provisional registrations are deferred. They remain a desired future workflow, not an exclusion from the overall product.
- File attachment is not included in the initial release.

## Environment and Boundaries

- The legacy system is FileMaker-based and is used concurrently by multiple locations and users.
- Authentication, database, and Firebase Hosting are selected for the prototype. Until the development Firebase environment is provided, use Firebase Emulator Suite locally for prototype verification; do not use or create a real Firebase project for this purpose. The local implementation uses the fictional `demo-termite-warranty` identifier, whose `demo-*` prefix has no live Firebase resources. The development and production environments use separate real Firebase projects when provisioned; the development project is owned by the developer, while production ownership is under confirmation. Detailed migration method and external-service boundaries remain unconfirmed.

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
- Assign a case number automatically when registering a case using a fixed-width sequential number, initially represented as `000001`. Display it in the case list and dashboard. The format may be revised after legacy-data inspection.
- Display responsible branch in the case list and dashboard.
- The case list and dashboard display a marker when a case has at least one applied warranty with notification status `not notified`.
- The fixed default ordering is case update date descending, then case registration date descending when update dates are equal.
- Adding, editing, cancelling, invalidating, or changing notification status on an applied warranty updates its parent case's update date.
- Staff can create required master records from a case-registration flow and can separately access list/management screens for each master. Master creation/editing and case creation/editing open as button-triggered dialogs rather than permanent inline forms.
- The application opens on the dashboard after login and uses a Navigation Drawer for business menus. The current local prototype increment exposes separate drawer entries for construction-company, homeowner, warranty-service, and property management; branch management remains part of the broader initial-release scope but is not included in this increment.
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
- A property holds a construction-company ID. At case registration and when an active case's property is changed, the property supplies the initially selected construction company; the case construction company remains editable before saving and while the case is active.
- When an active case's property is changed, initially select the newly selected property's homeowner and construction company, while allowing staff to change either value before saving. A later change to a property master's construction-company ID does not alter existing cases.
- A construction-company name, postal code, prefecture, municipality, and street/town and number are required. Building name, telephone, fax, contact person, contact details, email, and notes are optional.
- A property name, postal code, prefecture, municipality, and street/town and number are required property fields. Building name is optional.
- Property addresses are split into postal code, prefecture, municipality, street/town and number, and building name. Postal-code entry accepts seven digits with an optional hyphen, normalizes and looks up on field focus loss, and auto-fills address information.
- Postal-code address lookup uses Japan Post's official Postal Code and Digital Address API. For multiple town-area matches, auto-fill prefecture and municipality only, and let staff select or enter street/town and number. Where the API has no match or the postal code is business/other special, allow staff to enter the address manually. When API lookup fails, show an address-lookup failure message, retain existing input, and allow manual entry and saving. Staff may correct auto-filled prefecture and municipality. API agreement/credentials, availability, and cost remain open.
- Construction companies currently send enrolment information by email; staff read those emails and manually register it in the legacy system.
- The desired target process is form submission by the construction company, provisional registration, staff review, then promotion to a registered record.
- Data migration from the current system is required for the mandatory production release at the end of October 2026.
- The migration target is the subset of legacy data that can feasibly be mapped after data inspection. Complete historical migration is not required.
- Where available, retain a legacy case number as the new system's case number during migration.

## Non-functional Requirements

- The system must support concurrent use by multiple locations and users. Required scale and performance targets are not yet confirmed.
- The current operational upper-bound estimate is 40 telephone contacts per day. If every contact became a new case, this is approximately 1,200 new cases per 30-day month and 14,400 per year. This is a planning assumption, not a measured registration volume or a legacy-data count.
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
- House Solution retains the FileMaker data. After data inspection, report migrated counts, unsupported or omitted items, and their reasons; House Solution confirms this migration report before cutover. The feasible migration scope, data quality, recovery, and detailed migration method remain open decisions.

## Error Handling

Not yet confirmed.

## Security and Sensitive Information

Customer names and addresses are in scope. Actual homeowner data may be used in the developer-owned development environment and for migration testing after a separate confidentiality agreement is concluded. The provisional access-control approach and its residual risks are documented in [security and access](requirements/security-and-access.md). Do not commit real records or credentials.

## Current Phase Completion Criteria

- Confirm the minimum usable scope, roles, data fields, and alert rules needed for initial operation.
- Decide the data migration approach and complete its development and testing before production release.
- Make explicit technology and deployment decisions before implementation begins.

## Open Decisions

- The approved prototype stack is Nuxt SPA, Vuetify, Firebase Hosting, Firestore with an application-maintained 1- and 2-character N-Gram token map for selected free-text fields, Firebase Authentication email/password with browser-session persistence, and Cloud Functions for Firebase. See [decision 0002](decisions/0002-prototype-stack-and-search.md), [decision 0005](decisions/0005-spa-and-session-persistence.md), and [search architecture](requirements/search-architecture.md).
- Development and production use separate Firebase projects. The development project is developer-owned; production project ownership, Firebase project/region, deployment configuration, production package promotion, and production monitoring are not yet selected. Exact local-prototype dependencies are pinned in `package.json` and `package-lock.json`; this does not approve production versions.
- Firebase Admin SDK in a secure server-side mechanism manages staff accounts. Firestore access requires an authenticated and enabled staff account, the bounded exception necessary to make a disabled account immediately unusable. See [decision 0004](decisions/0004-account-lifecycle-enforcement.md).
- PostgreSQL may replace Firestore after a documented reassessment of the data schema, migration method, search behavior, cost, and delivery impact.
- The end of October 2026 is the mandatory production operating deadline, including data migration. See the [delivery roadmap](roadmaps/2026-initial-delivery.md).
- The cutover strategy initially uses a temporary parallel operation of FileMaker and the new system as a safety measure. The final migration may occur in the evening or at night after normal operations stop; the exact parallel-operation duration, final migration window, and cutover procedure remain open.
- Construction-company submission authentication is not decided. See [external submission options](requirements/external-submission-options.md); no option is selected.
- Whether the warranty-service payer or contracting party needs a separate field or entity from the property homeowner remains open. Property homeowner and construction-company changes are confirmed not to propagate to existing cases; see [decision 0014](decisions/0014-preserve-case-party-references.md).
- Cloud Functions enforces account-management boundaries: the developer superuser manages House Solution administrators, and House Solution administrators manage general-staff accounts. The current provisional posture remains that all enabled authenticated users have the same business-data CRUD access. See [decision 0006](decisions/0006-account-management-roles.md).
- Notification status belongs to each applied warranty. A notification-status filter returns a case when at least one of its applied warranties matches the selected status.
- See [open decisions](requirements/open-decisions.md) for the decision list.

## Specification Change Rules

After explicit user approval, Codex updates this file only when confirmed requirements or acceptance criteria change, and updates only affected roadmaps, relevant ADRs and index, `CHANGELOG.md`, implementation, tests, operations, data-contract, and user documentation in the same task. Specification and data-contract versions remain independent unless this project explicitly couples them. ADRs record durable decisions, not routine adjustments. A roadmap needs no `+0` history entry when scope, completion criteria, evidence, and progress are unchanged. If the roadmap denominator or earned credit changes, the next progress report states the previous percentage, new percentage, and reason.

This file always represents the current specification. Previous specification text is retained through Git history, not copied into versioned files.
