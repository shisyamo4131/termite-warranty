# Initial Data Model

## Status

This is a provisional business-record model for requirements discovery. It is not a database schema, data contract, migration mapping, or implemented collection design.

## Provisional Entities and Minimum Fields

| Entity | Minimum fields |
| --- | --- |
| Branch (支店) | Name |
| Staff account (利用者アカウント) | Firebase Authentication UID, email address, display name, role (`developer superuser`, `House Solution administrator`, or `general staff`), enabled/disabled state; system-issued records also have registration/update timestamps |
| Construction-company account (工務店アカウント) | Firebase Authentication UID, construction-company ID, shared email address, role (`construction company`), enabled/disabled state, registration/update timestamps |
| Construction company (工務店) | Name, postal code, prefecture, municipality, street/town and number, optional building name, optional telephone, optional fax, optional contact person, optional contact details, optional notes, active/inactive state |
| Homeowner (施主) | Name, required postal code, prefecture, municipality, street/town and number, optional building name, optional telephone, optional fax, optional notes, active/inactive state |
| Property (物件) | Required name, required positive building area in square metres with at most two decimal places, homeowner ID, construction-company ID, five-part address, optional notes, active/inactive state |
| Warranty service / product (保証サービス) | Required name, required short name of at most six displayed characters after trimming, required type (`保証` or `保険`), default warranty period in positive integer whole years, optional notes, active/inactive state |
| Case (案件) | Fixed-width auto-assigned case number (initially `000001` sequence; preserve legacy number when available), required application date, required handover date, homeowner ID, property ID, construction-company ID, responsible branch ID, case status, cancellation/invalidation reason when applicable, registration timestamp, update timestamp |
| Applied warranty (案件内適用保証) | Case ID, warranty-service ID, warranty period in whole years, warranty start date, expiry date, notification status, status, cancellation/invalidation reason when applicable |
| Construction-company case work item (工務店対応データ) | Reserved/current case ID, construction-company ID, new-case/renewal kind, workflow status including retained new-case withdrawal, revision, displayed case/property/homeowner context, company response, review/withdrawal reason, submission/approval/withdrawal and registration/update timestamps |
| Notification outbox item (通知送信待ち) | Audience, optional recipient email, template, work-item ID, queued state, creation timestamp |

The current model holds separate property and case references. A case directly references its homeowner, property, and construction company. The selected property supplies the initial homeowner and construction-company values, but an active case may store independently selected values.

The initial construction-company workflow uses one shared account per construction company. A renewal work-item ID equals its existing case ID. A new-case work item reserves its generated ID as the future case ID, and approval creates the registered case under that same ID. This is the accepted one-current-work-item constraint; retained response history across multiple renewal cycles remains outside the current model.

Staff accounts use Firebase Authentication email-address and password sign-in with browser-session persistence. The developer-owned developer superuser account creates, edits, and disables House Solution administrator accounts only. A House Solution administrator creates, edits, and disables general-staff accounts; editable fields are email address, display name, and enabled/disabled state. The role is currently fixed to `general staff`; if more roles are added later, a House Solution administrator can select only roles other than `House Solution administrator` and `developer superuser`. Account creation sends a password-setup email; email-address verification is not initially required, and staff can reset their password. Account email is trimmed, lowercased, and checked by a minimal regular expression before Firebase Authentication validation. The initial developer-superuser account is manually bootstrapped in Firebase Console without custom claims by creating matching Firebase Authentication and enabled staff-account records. Disabling an account must immediately end use, including an existing session. Cloud Functions for Firebase with Firebase Admin SDK manages subsequent account lifecycle. Account removal is reversible disablement/re-enablement: no account is physically deleted, and its identity, role or company binding, and email remain reserved while disabled. The prototype cleans up an Authentication user when account-record creation fails, writes the disabled Firestore state before disabling Authentication, and enables Authentication before exposing the enabled Firestore state. Production retry and operator-recovery procedures remain unconfirmed.

The model does not include monetary transfers, invoices, payment state, payer identity, or a separate contracting party. A homeowner is not inferred to be the contracting party.

## Notification Requirement

- Show an on-screen alert for an active case when any of its applied warranties has an expiry date 30 days away.
- Staff conduct the actual notification in the initial release.
- Staff select a notification status for each applied warranty from `not notified`, `notified`, and `not required` through a combobox to record progress. A newly added applied warranty starts as `not notified`.

Staff can change notification status in the initial release. Do not record notification timestamp or operator attribution at this stage; notification method, responses, transition rules, and repeat-alert behavior remain deferred.

## Case Lifecycle Requirement

- An `active` case is editable.
- Case statuses are `active`, `cancelled`, and `invalid`.
- A cancelled or invalid case is retained rather than physically deleted, is excluded from alert eligibility, and is not editable.
- Cancelling or invalidating a case requires a free-text reason.
- A cancelled or invalid case cannot be restored to active.
- Applied warranties have the same `active`, `cancelled`, and `invalid` statuses. Cancelling or invalidating an applied warranty requires a free-text reason, cannot be restored, retains the record, and excludes that applied warranty from alert eligibility.
- A case can remain active even when it has no active applied warranties.
- Adding, editing, cancelling, invalidating, or changing notification status on an applied warranty updates its parent case's update date.
- Editing an active case's own fields also updates its case update date.

Cancelled or invalid cases do not allow any edit, including adding or editing applied warranties.

Permitted edits not explicitly confirmed below remain open decisions.

## Case Registration Requirement

- Application date, handover date, property, homeowner, construction company, responsible branch, and at least one applied warranty service are required. Selecting a property initially selects its homeowner and construction-company IDs for the case. No ordering rule between application date and handover date is currently specified.
- Assign a case number automatically when registering a case using a fixed-width sequential number, initially represented as `000001`. Legacy case numbers are not imported. The production format remains open under HSC-004.
- Selecting a property automatically selects its homeowner and construction-company IDs for a new case. Staff may change either selection before registration and while the case remains active.
- Changing the property on an active case initially selects the newly selected property's homeowner and construction-company IDs. Staff may change either value before saving. Changing a property master's construction-company ID does not alter existing cases.
- Each applied warranty requires a warranty start date. Initialize its fixed period from the warranty-service master's default period. Its expiry date is calculated as the day before the anniversary reached by adding that period to the start date; staff may manually correct it without a reason.
- For a coverage extension, add a new applied warranty to the existing case; do not overwrite the prior applied warranty.

See [case warranties](case-warranties.md) for applied-warranty requirements, including expiry calculation.

See [branches and addresses](branches-and-addresses.md) for branch and property-address requirements.

## Confirmed Relationship Behavior and Open Schema Decisions

- The working direction is that a homeowner and a construction company have no parent-child relationship.
- A case directly references its homeowner, construction company, and property. The property supplies the initial homeowner and construction-company selections, after which the active case can retain independently selected references. Construction-company and homeowner names, plus the property name and address, are read from their masters and follow master changes; they are not stored as case snapshots.
- Except for fields explicitly specified as required or optional, identifiers, field types, uniqueness, normalization, and validation are unconfirmed. Operation-history and audit-log records are outside the initial-release scope; registration and update timestamps remain required.
- A master referenced by a case is not physically deleted. It can be set inactive and later restored to active; the exact permitted edit rules are unconfirmed.
- A case-wide enrolment date is not stored. If required, derive the initial enrolment date from the oldest warranty start date among active applied warranties.
- A case's responsible-branch reference is editable. A branch name is displayed from the branch master and is not retained as a case snapshot.
- A property's homeowner and construction-company references are editable even after the property is used by a case. Changing either property reference changes only the property and does not rewrite any existing case reference. See [decision 0014](../decisions/0014-preserve-case-party-references.md).
- An applied warranty's fixed period is not editable. Its start date is editable; changing it recalculates its expiry date before any subsequent manual correction.
- A warranty-service name follows the master name. A master default positive-integer period change affects only newly added applied warranties and does not alter existing applied-warranty periods or expiry dates.
- Do not import records or fields from the current FileMaker system into the new system.
