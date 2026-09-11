# Changelog

## Unreleased

### Added

- Added button-triggered create/edit dialogs for the four supported masters and case registration, including nested four-master creation that preserves the current case draft.
- Added active-case editing with stale-update protection and property-derived homeowner/company references, plus exact case/master/address/warranty filters with Vuetify expiry-date input.
- Added required case application and handover dates to registration, active-case editing, and the local Firestore contract.
- Added required construction-company address fields and optional building, telephone, fax, contact-person, contact-details, email, and notes fields to full and quick-create dialogs.
- Added dashboard-first Navigation Drawer navigation, trusted create/edit/inactivate/reactivate screens for construction-company, homeowner, warranty-service, and property masters, and Vuetify date selection for case registration.
- Added optimistic master revisions and server-derived N-Gram updates.
- Approved and documented a local-prototype-only Firestore data contract and fictional `demo-termite-warranty` emulator identifier without selecting a real Firebase project or production schema.
- Pinned the official-package local prototype baseline for Nuxt 4, Vuetify 3, Firebase Web, Firebase CLI, Cloud Functions, Admin SDK, and rules testing in the manifest and lockfile.
- Added a local-emulator-only Nuxt/Vuetify vertical slice with synthetic authentication, enabled-staff Firestore access, seeded master selection, atomic case/first-warranty registration, current-master list display, alert evaluation, and Firestore Rules regression tests.
- Added the first dependency-free prototype domain slice for warranty expiry and alert calculations, extension start dates, initial enrolment dates, and confirmed N-Gram search normalization/token generation, with Node.js unit tests and a machine-readable domain-test verification gate.

### Changed

- Made case homeowner and construction-company references independently editable after property-driven initial selection in both registration and active-case editing, with active-reference validation and stale-update protection.
- Preserved every existing case's homeowner and construction-company references when either corresponding property reference changes; explicit property selection in case registration/editing still supplies editable defaults.
- Moved the project into prototype implementation and selected Firebase Emulator Suite for local verification until the developer-owned development Firebase environment is provided.
- Recorded the peak-call planning upper bound of 40 per day (approximately 1,200 per 30-day month and 14,400 per year if every call is a new case), adopted temporary parallel operation before cutover, and excluded operation-history/audit-log records from the initial release.
- Defined extension-warranty start-date default as the day after the existing expiry, while permitting staff edits and overlap; required a House Solution-confirmed migration report before cutover; allowed actual homeowner data in development and migration testing after a separate confidentiality agreement.
- Adopted manual Firebase Console bootstrap for the initial developer superuser without custom claims, deferred email-address verification, and retained password-setup email delivery.
- Defined warranty extension as adding a new applied warranty to the existing case, preserving the prior applied warranty as history.
- Changed legacy-data migration to best effort after source inspection; House Solution retains the FileMaker data and complete historical migration is not a release acceptance condition.
- Adopted Nuxt, Vuetify, and Firestore with a 1- and 2-character N-Gram token map for the prototype; added property names and defined two-character free-text matching for names.
- Made property name required, fixed branch/service case filters as master-record selections, and recorded the reference N-Gram normalization behavior.
- Replaced direct case-list name search with master-record filtering; retained the N-Gram capability and three-or-more-character AND-match rule for a future selected free-text feature.
- Added homeowner ID to cases as an independently retained case reference.
- Defined N-Gram master-name search for construction companies, homeowners, and properties, including case-filter selection dialogs.
- Added email/password staff authentication, administrator account lifecycle UI, and password-reset requirements while retaining the provisional access-control boundary.
- Adopted Firebase Authentication; required password-setup emails and immediate disabled-account access revocation, with enforcement design explicitly pending.
- Adopted Nuxt SPA and Cloud Functions for Firebase; approved Firebase Admin SDK account management, enabled-account Firestore access checks, and non-deleting account disablement.
- Made browser-session persistence an initial-release requirement: closing the browser window clears staff authentication, while account disablement remains separately enforced.
- Adopted Firebase Hosting and defined the developer-superuser, House Solution-administrator, and general-staff account-management boundary; no inactivity-time logout is required initially.
- Allowed the developer superuser to disable House Solution administrators and defined the editable general-staff account fields.
- Fixed House Solution administrator account assignment to general staff; future selectable roles exclude administrator and developer-superuser roles.
- Required separate Firebase projects for development and production, set CSV as the planned FileMaker-data reception format, and recorded provisional authentication-email identity requirements.
- Recorded developer ownership of the development Firebase project while production ownership remains under confirmation.
- Deferred custom Gmail authentication-email delivery and selected the standard Firebase Authentication email configuration for the initial release.
- Replaced imported Japan Post postal-code data and monthly manual updates with automatic external-API lookup; retained a replaceable provider boundary.
- Defined seven-digit postal-code validation with optional hyphen, focus-loss lookup, multiple-town-area handling, manual no-match/special-code entry, and post-lookup address correction.
- Defined postal-code API-failure behavior: show a message, preserve input, and permit manual address entry and saving.
- Adopted Japan Post's official Postal Code and Digital Address API for postal-code address lookup.
- Excluded file attachments from the initial release and recorded free-text-search architecture as an unresolved technology decision.
- Recorded the mandatory end-of-October 2026 production release target, including data migration, and its initial delivery roadmap.
- Defined the initial-release scope and the full-history migration target; recorded deferred construction-company submission alternatives.
- Added provisional alert, data-model, role, and access-control requirements, including documented security residual risks.
- Defined the initial notification-state flow and recorded the working case-based construction-company snapshot direction.
- Added provisional property management, expiry-date calculation/override, and initial search-filter requirements.
- Added whole-year warranty periods, separate case-per-service registration, and master-management entry requirements.
- Defined expiry-date calculation, reversible master inactivation, and default expiry-date-descending ordering.
- Defined case-list columns, inactive-master selection behavior, and non-retroactive warranty-period changes.
- Added editable but non-deletable case handling, continuing expiry alerts, list emphasis, and dashboard alert listing.
- Defined active/cancelled/invalid case statuses, alert eligibility, and dashboard columns.
- Defined irreversible cancelled/invalid cases and required case-registration fields.
- Defined warranty-period snapshots on cases, with the service period as the new-case default.
- Added branches, five-part property addresses with postal-code auto-fill, duplicate-master acceptance, and multiple applied warranties per case.
- Changed alert and list/dashboard requirements to one case per row: applied warranties determine alert eligibility, while warranty-period and expiry-date details are shown only on the case detail screen.
- Removed case-wide warranty-period, expiry-date, and enrolment-date requirements; each applied warranty supplies its own expiry calculation.
- Added applied-warranty start dates, applied-warranty cancellation/invalidation, and case-level expiry-date filtering when any applied warranty matches.
- Defined initial-enrolment-date derivation from the oldest active applied warranty, retention of cases without active applied warranties, and applied-warranty-level notification status.
- Defined initial notification-status choices, a case-level `not notified` marker, and fixed case ordering by update date then registration date in descending order.
- Moved responsible-branch ownership from construction-company, homeowner, and property masters to the case.
- Defined case-level notification-status filtering by any matching applied warranty, editable case branch assignment, and branch-master-name tracking on existing cases.
- Defined warranty-service name tracking, default-period behavior for newly added applied warranties, and immutable applied-warranty periods with start-date-triggered expiry recalculation.
- Added responsible-branch search, positive-integer warranty periods, and case update-date propagation from applied-warranty changes.
- Replaced case-level construction-company snapshots with direct construction-company, homeowner, and property references whose displayed values follow master changes.
- Permitted repeated applied-warranty products and defined the February-29 expiry rule.
- Defined free-text cancellation/invalidation reasons and deferred notification timestamps, attribution, and response handling.
- Locked cancelled/invalid cases against all edits while allowing confirmed active-case reference changes.
- Defined non-propagation from property-master homeowner and company changes and required property-address components.
- Added automatic case numbering with list/dashboard display, responsible-branch display, and `not notified` as the default for newly added applied warranties.
- Defined provisional fixed-width case numbering, legacy case-number retention during migration, and exact-match case-number search.

### Fixed

### Removed

### Security
