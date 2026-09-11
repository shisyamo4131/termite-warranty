# Prototype Firestore Data Contract

- Status: Approved for local prototype implementation only
- Approved: 2026-09-10
- Production authority: None; this is not the production schema or migration mapping
- Local Firebase demo ID: `demo-termite-warranty` (fictional `demo-*` identifier with no live resources)

## Scope and Safety Boundary

This contract supports the local vertical slice: emulator authentication, enabled-staff access, trusted dialog-based management of construction-company, homeowner, warranty-service, and property masters, master selection, trusted callable-function case registration and applied-warranty management, direct transactional editing of active case fields, case search/list and detail reads, dashboard alert evaluation, and current-master display. Existing FileMaker data is not a migration input; production validation uses confirmed workflows and representative synthetic volumes.

It must not be used to select or create a real Firebase project, deploy Hosting or Functions, call the postal-code API, or store real customer, property, account, or credential data.

## Prototype Collections

All generated document IDs and field names are prototype choices.

| Path | Fields |
| --- | --- |
| `staffAccounts/{firebaseUid}` | `email: string`, `displayName: string`, `role: developer_superuser \| house_solution_administrator \| general_staff`, `enabled: boolean` |
| `branches/{branchId}` | `name: string`, `active: boolean` |
| `constructionCompanies/{companyId}` | `name: string`, `address.postalCode: normalized seven-digit string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `telephone: string \| null`, `fax: string \| null`, `contactPerson: string \| null`, `contactDetails: string \| null`, `email: string \| null`, `notes: string \| null`, `active: boolean`, `nameSearch.normalized: string`, `nameSearch.one: map<string, true>`, `nameSearch.two: map<string, true>`, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `homeowners/{homeownerId}` | `name: string`, `address.postalCode: normalized seven-digit string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `telephone: string \| null`, `fax: string \| null`, `notes: string \| null`, `active: boolean`, `nameSearch.normalized: string`, `nameSearch.one: map<string, true>`, `nameSearch.two: map<string, true>`, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `properties/{propertyId}` | `name: string`, `homeownerId: string`, `constructionCompanyId: string`, `address.postalCode: normalized seven-digit string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `active: boolean`, the same name-search fields, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `warrantyServices/{serviceId}` | `name: string`, `defaultPeriodYears: positive integer`, `active: boolean`, `revision: safe positive integer below Number.MAX_SAFE_INTEGER`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `cases/{caseId}` | `caseNumber: six-digit string`, `sequenceValue: integer`, `applicationDate: YYYY-MM-DD string`, `handoverDate: YYYY-MM-DD string`, `propertyId: string`, `homeownerId: string`, `constructionCompanyId: string`, `responsibleBranchId: string`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `registrationWarrantyId: string`, `registeredAt: Timestamp`, `updatedAt: Timestamp` |
| `cases/{caseId}/appliedWarranties/{warrantyId}` | `warrantyServiceId: string`, `periodYears: positive integer`, `startDate: YYYY-MM-DD string`, `expiryDate: YYYY-MM-DD string`, `notificationStatus: not notified \| notified \| not required`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `systemCounters/caseNumber` | `nextValue: integer`, `lastCaseId: string \| null` (atomic-registration rules linkage) |
| `caseNumberReservations/{caseNumber}` | `caseId: string` |

Business dates use valid ISO calendar-date strings in the prototype to avoid timezone conversion. Application date and handover date are required and editable case fields; no ordering rule between them is specified. Final date representation and business-timezone rules remain open.

## Required Prototype Invariants

- The callable registration path requires valid application and handover dates, verifies the enabled staff account, the selected active property and its active default homeowner/construction company, and any independently submitted active homeowner/construction-company overrides. Per-field override-intent booleans distinguish explicit staff choices from property-derived form values: an unoverridden field uses the property's value read inside the registration transaction, while an overridden field uses the validated submitted value. The transaction then reserves and increments the case number, creates its reservation, creates the case with the dates and effective references, and creates the first applied warranty referenced by `registrationWarrantyId`. Override-intent booleans are request metadata and are not stored on the case.
- Selecting a property initially selects its homeowner and construction-company IDs. Both selections remain editable before registration and while the case is active.
- A callable applied-warranty transaction verifies the enabled staff account, active case, current parent `updatedAt` baseline, and active selected service. The callable boundary carries the baseline only as the exact DTO `{ seconds: integer, nanoseconds: integer }`; the function validates and reconstructs it before comparing both timestamp fields. It creates a new warranty with that service's current positive whole-year default period, `active`/`not notified` state, and the latest retained warranty expiry plus one day as the editable initial start date. It updates an existing warranty only when its fixed service, period, and creation timestamp are unchanged; start-date recalculation, manual expiry correction, notification changes, and one-way terminal transitions are permitted. Every applied-warranty create/update changes the parent case `updatedAt` in the same transaction.
- Case and applied-warranty records are never physically deleted. Terminal states require a nonblank reason and cannot return to active.
- Each applied-warranty mutation and its parent case `updatedAt` change must be atomic.
- Displayed homeowner, property, construction-company, branch, and service values are resolved from current master records. No name/address snapshot is stored on the case.
- Case documents do not store case-wide expiry, warranty period, enrolment date, notification status, or alert status.
- Master name and N-Gram search fields are written together. Search uses the confirmed normalization and unique one- and two-character tokens.
- Trusted master callables allow only the four declared master types and server-defined fields. Construction-company create/update requires its name and four required address parts, normalizes the postal code, and stores the optional building/contact values as trimmed text or null without additional telephone, fax, or email format validation. Create sets `revision` to 1 and server timestamps. Update, inactivation, and reactivation use last-write-wins: the client sends no revision precondition, and the transaction increments the current stored safe positive revision while retaining server-side validation and atomic writes. A missing, invalid, unsafe, or non-incrementable stored revision rejects the mutation unchanged.
- Master removal is reversible inactivation, not physical deletion. Management lists include inactive records; new-case selectors include only active masters and exclude properties whose referenced homeowner or construction company is inactive.
- Changing a property's homeowner or construction-company reference updates only the property document. Existing cases retain their own stored references regardless of status. See [decision 0014](../decisions/0014-preserve-case-party-references.md).
- Pre-change local synthetic company, homeowner, or case documents remain readable. A normal company or homeowner edit must supply the newly required address fields; a normal case edit must supply case dates. No production backfill or migration is authorized by this prototype contract.

## Access Rules

- Business reads and writes require Firebase Authentication plus an existing enabled `staffAccounts/{uid}` record.
- Direct client writes to staff accounts are denied. An enabled user may read only their own staff record in this slice.
- Direct client writes to construction-company, homeowner, warranty-service, and property masters are denied. Local-only trusted master callables validate fields, derive N-Gram maps where applicable, apply server-transaction last-write-wins with monotonically increasing revision metadata, and perform lifecycle changes.
- Direct client creation of cases and applied warranties, and all client writes to case-number counters and reservations, are denied. Only the local trusted callable registration path may perform the initial atomic registration.
- The UI registers cases through a callable function so concurrent counter contention uses the Admin SDK transaction retry path; the function independently verifies an enabled staff account and active referenced masters.
- Enabled staff edit only active case-level fields through a client Firestore transaction. The transaction rejects a stale `updatedAt` baseline, requires valid application and handover dates, verifies a property selected after the dialog opened and its default references, and validates independently changed homeowner/construction-company references. After any such property selection, including selecting another property and returning to the original one, an unoverridden field uses the property's value read inside the transaction and an explicitly overridden field uses its validated submitted value. A request-only selection-intent boolean preserves that distinction when the final property ID equals the original ID. The transaction writes the effective dates and references with a server timestamp and does not edit immutable identifiers or applied warranties.
- Physical deletes of cases, applied warranties, masters, counters, and reservations are denied.
- Account-management role enforcement remains a Cloud Functions responsibility and is not implemented by general business-data rules.

## Slice Queries

- The minimum slice subscribes to cases, current master records, and each returned case's applied warranties; it then sorts by `updatedAt` descending and `registeredAt` descending and produces one row per case in the client.
- The same in-memory rows evaluate the confirmed 30-day alert rule and `not notified` marker. Collection-group query, pagination, batching, and final index design remain deferred pending representative-data evidence.
- Master search data is written in this slice. The final Firestore token-query/index strategy remains open and must not be inferred from this contract.
- The local case list filters its subscribed rows in memory. As reversible prototype assumptions, populated filters are combined with AND, an expiry-date value is an exact calendar-date match, and combined warranty-service, notification-status, and expiry-date criteria must be satisfied by the same applied warranty. These assumptions are not production requirements and remain replaceable when the open search behavior is confirmed.
- Approved target divergence: ADR 0017 requires every unfiltered list to subscribe only to the 20 freshest documents and prohibits the current unbounded case/master subscriptions and per-case warranty-listener pattern. TR-005 tracks the implementation and HSC-032 owns the unresolved case-list year/month meaning.
- Detail reads use the same enabled-staff read access: inactive masters and cancelled or invalid cases remain readable. A missing document is an application-level not-found result, not a request to create or infer data. The construction-company detail derives linked properties by their stored construction-company ID and includes inactive properties.
- The case detail resolves the current warranty-service master name at display time and shows each applied warranty's stored period, dates, notification state, status, and terminal reason. It does not add a service-name snapshot to an applied-warranty document.

## Explicitly Deferred

- Production schema and Firebase identifiers, Hosting/deployment configuration, initial production-data setup, pagination, final combined-filter semantics, and performance targets.
- Final account-disable partial-failure recovery and full account-management Functions.
- Postal-code external API calls, production monitoring, backup/recovery, broader authorization, audit logs, attachments, and construction-company submission.

## Local Verification Required

- Unauthenticated, Authentication-only, missing-staff, and disabled-staff access is denied; enabled staff can use the intended business paths.
- Direct staff-account mutation and all physical deletes are denied.
- Four-master create, read, update, inactivate, and reactivate behavior preserves IDs, validates references, regenerates search tokens, increments server-managed revisions, and permits concurrent valid master mutations under last-write-wins. Concurrent full-payload tests bind the final stored values to the mutation with the highest committed revision.
- Property homeowner and construction-company changes leave every existing case reference unchanged regardless of case status.
- Case registration and normal case edits require valid application and handover dates; legacy date-less cases remain readable and require date completion before a normal edit.
- Construction-company and homeowner creation/editing enforce their required address parts, preserve their optional contact values, and tolerate readable legacy name-only records until they are edited.
- Registration and active-case property changes initially select the property's homeowner and construction company, while active independently selected overrides persist exactly when saved.
- Concurrent registration produces distinct reservations and complete case/warranty records.
- Alert boundaries, one-row dashboard behavior, current-master joins, N-Gram normalization, and case ordering match the confirmed requirements.
- Emulator evidence does not replace later verification in the provided development Firebase environment.
