# Prototype Firestore Data Contract

- Status: Approved for local prototype implementation only
- Approved: 2026-09-10
- Production authority: None; this is not the production schema or migration mapping
- Local Firebase demo ID: `demo-termite-warranty` (fictional `demo-*` identifier with no live resources)

## Scope and Safety Boundary

This contract supports the local vertical slice: emulator authentication, enabled-staff access, direct Rules-governed management of construction-company, homeowner, warranty-service, and property masters, master selection, trusted callable-function case registration and applied-warranty management, direct transactional editing of active case fields, case search/list and detail reads, dashboard alert evaluation, current-master display, and the provisional construction-company portal proposal. Existing FileMaker data is not a migration input; production validation uses confirmed workflows and representative synthetic volumes.

It must not be used to select or create a real Firebase project, deploy Hosting or Functions, call the postal-code API, or store real customer, property, account, or credential data.

## Prototype Collections

All generated document IDs and field names are prototype choices.

| Path | Fields |
| --- | --- |
| `staffAccounts/{firebaseUid}` | `email: string`, `displayName: string`, `role: developer_superuser \| house_solution_administrator \| general_staff`, `enabled: boolean` |
| `constructionCompanyAccounts/{firebaseUid}` | `constructionCompanyId: string`, `companyName: string`, `email: string`, `role: construction_company`, `enabled: boolean`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `constructionCompanyAccountBindings/{constructionCompanyId}` | `uid: string`; trusted account issuance reserves this document atomically so one construction company cannot receive two accounts |
| `branches/{branchId}` | `name: string`, `active: boolean` |
| `constructionCompanies/{companyId}` | `name: string`, `address.postalCode: normalized seven-digit string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `telephone: string \| null`, `fax: string \| null`, `contactPerson: string \| null`, `contactDetails: string \| null`, `email: string \| null`, `notes: string \| null`, `active: boolean`, `nameSearch.normalized: string`, `nameSearch.one: map<string, true>`, `nameSearch.two: map<string, true>`, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `homeowners/{homeownerId}` | `name: string`, `address.postalCode: normalized seven-digit string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `telephone: string \| null`, `fax: string \| null`, `notes: string \| null`, `active: boolean`, `nameSearch.normalized: string`, `nameSearch.one: map<string, true>`, `nameSearch.two: map<string, true>`, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `properties/{propertyId}` | `name: string`, `homeownerId: string`, `constructionCompanyId: string`, `address.postalCode: normalized seven-digit string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `active: boolean`, the same name-search fields, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `warrantyServices/{serviceId}` | `name: string`, `defaultPeriodYears: positive integer`, `active: boolean`, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `cases/{caseId}` | `caseNumber: six-digit string`, `sequenceValue: integer`, `applicationDate: YYYY-MM-DD string`, `handoverDate: YYYY-MM-DD string`, `propertyId: string`, `homeownerId: string`, `constructionCompanyId: string`, `responsibleBranchId: string`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `registrationWarrantyId: string`, `listProjection.appliedWarranties: array<{ id, warrantyServiceId, expiryDate, notificationStatus, status }>`, `registeredAt: Timestamp`, `updatedAt: Timestamp` |
| `cases/{caseId}/appliedWarranties/{warrantyId}` | `warrantyServiceId: string`, `periodYears: positive integer`, `startDate: YYYY-MM-DD string`, `expiryDate: YYYY-MM-DD string`, `notificationStatus: not notified \| notified \| not required`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `systemCounters/caseNumber` | `nextValue: integer`, `lastCaseId: string \| null` (atomic-registration rules linkage) |
| `caseNumberReservations/{caseNumber}` | `caseId: string` |
| `constructionCompanyCaseWorkItems/{caseId}` | `caseId: string` equal to the document ID, `kind: new_case \| renewal`, `constructionCompanyId: string`, `caseNumber: string \| null`, display-only property/homeowner/expiry context, `status: awaiting_response \| draft \| submitted \| needs_correction \| approved`, typed company `response \| null`, `reviewComment: string \| null`, `revision: positive integer`, nullable submission/approval timestamps, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `notificationOutbox/{notificationId}` | `audience: construction_company \| house_solution`, `recipientEmail: string \| null`, `template: string`, `workItemId: string`, `status: queued`, `createdAt: Timestamp` |

Business dates use valid ISO calendar-date strings in the prototype to avoid timezone conversion. Application date and handover date are required and editable case fields; no ordering rule between them is specified. Final date representation and business-timezone rules remain open.

## Required Prototype Invariants

- A construction-company account is issued only by an enabled House Solution administrator or developer superuser and is associated with exactly one active construction-company master. A company can have at most one account. The construction company uses Firebase's self-service password setup/reset flow; no password is stored in Firestore or handled by House Solution.
- Firestore Rules allow a company account to read only its own account record and work items whose `constructionCompanyId` equals the server-owned account mapping. Company accounts cannot directly read registered cases or masters. Direct account, work-item, and notification-outbox writes are denied for every browser client.
- Renewal work-item document IDs equal existing case IDs. New-case work items reserve their generated document ID as the future registered case ID. Company updates require an enabled matching account, editable state, exact current revision, and validated response; submission locks further company edits.
- Staff approval of a renewal adds the matching five- or ten-year applied warranty and updates the parent case projection. Staff approval of a new request creates the homeowner, property, case under the reserved ID, and first applied warranty. The registered writes and work-item approval are atomic. A declined renewal approval changes no registered case data.
- Notification outbox documents demonstrate intended email trigger points only. `queued` does not mean sent or delivered, and no delivery worker exists in this prototype.

- The callable registration path requires valid application and handover dates, verifies the enabled staff account, the selected active property and its active default homeowner/construction company, and any independently submitted active homeowner/construction-company overrides. Per-field override-intent booleans distinguish explicit staff choices from property-derived form values: an unoverridden field uses the property's value read inside the registration transaction, while an overridden field uses the validated submitted value. The transaction then reserves and increments the case number, creates its reservation, creates the case with the dates and effective references, and creates the first applied warranty referenced by `registrationWarrantyId`. Override-intent booleans are request metadata and are not stored on the case.
- Selecting a property initially selects its homeowner and construction-company IDs. Both selections remain editable before registration and while the case is active.
- A callable applied-warranty transaction verifies the enabled staff account, active case, current parent `updatedAt` baseline, and active selected service. The callable boundary carries the baseline only as the exact DTO `{ seconds: integer, nanoseconds: integer }`; the function validates and reconstructs it before comparing both timestamp fields. It creates a new warranty with that service's current positive whole-year default period, `active`/`not notified` state, and the latest retained warranty expiry plus one day as the editable initial start date. It updates an existing warranty only when its fixed service, period, and creation timestamp are unchanged; start-date recalculation, manual expiry correction, notification changes, and one-way terminal transitions are permitted. Every applied-warranty create/update changes the parent case `updatedAt` in the same transaction.
- Case and applied-warranty records are never physically deleted. Terminal states require a nonblank reason and cannot return to active.
- Case registration and each applied-warranty mutation atomically rebuild the parent case's ID-sorted `listProjection.appliedWarranties` from the authoritative child records. A normal browser case edit must preserve this projection unchanged. The projection is rebuildable list data, not an additional business record.
- Each applied-warranty mutation, its parent projection rebuild, and the parent case `updatedAt` change must be atomic.
- Displayed homeowner, property, construction-company, branch, and service values are resolved from current master records. No name/address snapshot is stored on the case.
- Case documents do not store case-wide expiry, warranty period, enrolment date, notification status, or alert status.
- Master name and N-Gram search fields are written together. Search uses the confirmed normalization and unique one- and two-character tokens.
- Direct master writes allow only the four declared master types and normalized fields. Construction-company create/update requires its name and four required address parts, normalizes the postal code, and stores optional building/contact values as trimmed text or null without additional telephone, fax, or email format validation. Create sets `revision` to 1 and server timestamps. Update, inactivation, and reactivation use last-write-wins and an atomic revision increment without a revision precondition or pre-write read. A lifecycle-only write may change only `active`, `revision`, and `updatedAt`, allowing a valid-revision legacy master to be disabled or re-enabled without changing its legacy fields; active properties still require active references. Rules reject a missing, invalid, unsafe, or non-incrementable stored revision.
- Master removal is reversible inactivation, not physical deletion. Management lists include inactive records; new-case selectors include only active masters and exclude properties whose referenced homeowner or construction company is inactive.
- Changing a property's homeowner or construction-company reference updates only the property document. Existing cases retain their own stored references regardless of status. See [decision 0014](../decisions/0014-preserve-case-party-references.md).
- Pre-change local synthetic company, homeowner, or case documents remain readable. A normal company or homeowner edit must supply the newly required address fields; a normal case edit must supply case dates. No production backfill or migration is authorized by this prototype contract.

## Access Rules

- Business reads and writes require Firebase Authentication plus an existing enabled `staffAccounts/{uid}` record.
- Direct client writes to staff accounts are denied. An enabled user may read only their own staff record in this slice.
- Enabled staff write construction-company, homeowner, warranty-service, and property masters directly. The shared domain mapper validates/normalizes fields and derives N-Gram maps; Rules independently enforce exact shapes, basic values, timestamps, revision progression, property references, and physical-delete denial. Under the provisional threat posture, Rules do not prove N-Gram semantic equality with the name.
- Direct client creation of cases and applied warranties, and all client writes to case-number counters and reservations, are denied. Only the local trusted callable registration path may perform the initial atomic registration.
- The UI registers cases through a callable function so concurrent counter contention uses the Admin SDK transaction retry path; the function independently verifies an enabled staff account and active referenced masters.
- Enabled staff edit only active case-level fields through a client Firestore transaction. The transaction rejects a stale `updatedAt` baseline, requires valid application and handover dates, verifies a property selected after the dialog opened and its default references, and validates independently changed homeowner/construction-company references. After any such property selection, including selecting another property and returning to the original one, an unoverridden field uses the property's value read inside the transaction and an explicitly overridden field uses its validated submitted value. A request-only selection-intent boolean preserves that distinction when the final property ID equals the original ID. The transaction writes the effective dates and references with a server timestamp and does not edit immutable identifiers or applied warranties.
- Physical deletes of cases, applied warranties, masters, counters, and reservations are denied.
- Account-management role enforcement remains a Cloud Functions responsibility and is not implemented by general business-data rules.

## Slice Queries

- An unfiltered case or master list subscribes to at most 20 documents ordered by `updatedAt DESC` and document ID `DESC`. The cursor contains those same last-document values; the UI does not yet expose pagination controls.
- The case list reads warranty facts from the parent projection and creates no per-case applied-warranty listener. It combines five bounded master catalogs with chunked exact-reference reads for the visible cases' property, homeowner, construction company, branch, and projected warranty service. Case detail retains the authoritative child-warranty subscription and exact warranty-service resolution.
- The same bounded case rows evaluate the confirmed 30-day alert rule and `not notified` marker. Dashboard totals describe the current 20-document window, not lifetime totals.
- Master search data is written in this slice. The final Firestore token-query/index strategy remains open and must not be inferred from this contract.
- The local case and master filters operate on the subscribed 20-document window. As reversible prototype assumptions, populated case filters are combined with AND, an expiry-date value is an exact calendar-date match, and combined warranty-service, notification-status, and expiry-date criteria must be satisfied by the same applied warranty. These assumptions are not production requirements and remain replaceable when the open search behavior is confirmed.
- HSC-032 owns the unresolved case-list year/month meaning. Final filtered-query limits, pagination controls, and production backfill remain deferred.
- Detail reads use the same enabled-staff read access: inactive masters and cancelled or invalid cases remain readable. A missing document is an application-level not-found result, not a request to create or infer data. The construction-company detail derives at most its 20 freshest linked properties by stored construction-company ID and includes inactive properties.
- The case detail resolves the current warranty-service master name at display time and shows each applied warranty's stored period, dates, notification state, status, and terminal reason. It does not add a service-name snapshot to an applied-warranty document.
- Case detail uses exact subscriptions for the selected case, its complete child-warranty collection, and only their referenced master IDs. Full master catalogs are loaded as one-shot edit-dialog inputs only when an edit/add dialog is opened.

## Explicitly Deferred

- Production schema and Firebase identifiers, Hosting/deployment configuration, initial production-data setup, pagination, final combined-filter semantics, and performance targets.
- Final account-disable partial-failure recovery, Authentication/Firestore reconciliation, and account-email change or account replacement operations.
- Postal-code external API calls, production monitoring, backup/recovery, broader authorization, audit logs, attachments, production adoption of the construction-company workflow, and its final field set.

## Local Verification Required

- Unauthenticated, Authentication-only, missing-staff, and disabled-staff access is denied; enabled staff can use the intended business paths.
- Direct staff-account mutation and all physical deletes are denied.
- Four-master create, read, update, inactivate, and reactivate behavior preserves IDs, validates references, regenerates search tokens, atomically increments diagnostic revisions, and permits concurrent valid master mutations under last-write-wins.
- Property homeowner and construction-company changes leave every existing case reference unchanged regardless of case status.
- Case registration and normal case edits require valid application and handover dates; legacy date-less cases remain readable and require date completion before a normal edit.
- Construction-company and homeowner creation/editing enforce their required address parts, preserve their optional contact values, and tolerate readable legacy name-only records. With valid revision metadata, those records may use lifecycle-only changes; a normal edit must bring the record to the current shape.
- Registration and active-case property changes initially select the property's homeowner and construction company, while active independently selected overrides persist exactly when saved.
- Concurrent registration produces distinct reservations and complete case/warranty records.
- The company portal enforces one account per construction company, password-free administrator issuance, company self-service password setup/reset, company-scoped reads, trusted-only mutations, revision/state checks, one-to-one work-item/case IDs, and atomic staff approval.
- Alert boundaries, one-row dashboard behavior, current-master joins, N-Gram normalization, and case ordering match the confirmed requirements.
- Unfiltered list queries return at most 20 documents with a stable equal-timestamp tie-break, case-list listener count does not grow per applied-warranty child collection, and trusted warranty mutations keep the parent projection atomic and browser-immutable.
- Emulator evidence does not replace later verification in the provided development Firebase environment.
