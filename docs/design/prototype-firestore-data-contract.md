# Prototype Firestore Data Contract

- Status: Approved for local prototype implementation only
- Approved: 2026-09-10
- Production authority: None; this is not the production schema or migration mapping
- Local Firebase demo ID: `demo-termite-warranty` (fictional `demo-*` identifier with no live resources)

## Scope and Safety Boundary

This contract supports the local vertical slice: emulator authentication, enabled-staff access, trusted dialog-based management of construction-company, homeowner, warranty-service, and property masters, master selection, trusted callable-function case registration with one applied warranty, direct transactional editing of active case fields, case search/list, dashboard alert evaluation, and current-master display. It may change after representative FileMaker data is inspected.

It must not be used to select or create a real Firebase project, deploy Hosting or Functions, call the postal-code API, or store real customer, property, account, or credential data.

## Prototype Collections

All generated document IDs and field names are prototype choices.

| Path | Fields |
| --- | --- |
| `staffAccounts/{firebaseUid}` | `email: string`, `displayName: string`, `role: developer_superuser \| house_solution_administrator \| general_staff`, `enabled: boolean` |
| `branches/{branchId}` | `name: string`, `active: boolean` |
| `constructionCompanies/{companyId}` | `name: string`, `active: boolean`, `nameSearch.normalized: string`, `nameSearch.one: map<string, true>`, `nameSearch.two: map<string, true>`, `revision: positive integer`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `homeowners/{homeownerId}` | Same common, lifecycle, revision, timestamp, and name-search fields as construction companies |
| `properties/{propertyId}` | `name: string`, `homeownerId: string`, `constructionCompanyId: string`, `address.postalCode: normalized seven-digit string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `active: boolean`, the same name-search fields, `revision: positive integer`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `warrantyServices/{serviceId}` | `name: string`, `defaultPeriodYears: positive integer`, `active: boolean`, `revision: positive integer`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `cases/{caseId}` | `caseNumber: six-digit string`, `sequenceValue: integer`, `propertyId: string`, `homeownerId: string`, `constructionCompanyId: string`, `responsibleBranchId: string`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `registrationWarrantyId: string`, `registeredAt: Timestamp`, `updatedAt: Timestamp` |
| `cases/{caseId}/appliedWarranties/{warrantyId}` | `warrantyServiceId: string`, `periodYears: positive integer`, `startDate: YYYY-MM-DD string`, `expiryDate: YYYY-MM-DD string`, `notificationStatus: not notified \| notified \| not required`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `systemCounters/caseNumber` | `nextValue: integer`, `lastCaseId: string \| null` (atomic-registration rules linkage) |
| `caseNumberReservations/{caseNumber}` | `caseId: string` |

Business dates use ISO calendar-date strings in the prototype to avoid timezone conversion. Final date representation and business-timezone rules remain open.

## Required Prototype Invariants

- The callable registration path verifies the enabled staff account, the selected active property and its active default homeowner/construction company, and any independently submitted active homeowner/construction-company overrides. Per-field override-intent booleans distinguish explicit staff choices from property-derived form values: an unoverridden field uses the property's value read inside the registration transaction, while an overridden field uses the validated submitted value. The transaction then reserves and increments the case number, creates its reservation, creates the case with the effective references, and creates the first applied warranty referenced by `registrationWarrantyId`. Override-intent booleans are request metadata and are not stored on the case.
- Selecting a property initially selects its homeowner and construction-company IDs. Both selections remain editable before registration and while the case is active.
- New applied warranties copy the selected active service's positive whole-year default period, start as `active` and `not notified`, and calculate expiry using the confirmed domain rule.
- Case and applied-warranty records are never physically deleted. Terminal states require a nonblank reason and cannot return to active.
- Each applied-warranty mutation and its parent case `updatedAt` change must be atomic.
- Displayed homeowner, property, construction-company, branch, and service values are resolved from current master records. No name/address snapshot is stored on the case.
- Case documents do not store case-wide expiry, warranty period, enrolment date, notification status, or alert status.
- Master name and N-Gram search fields are written together. Search uses the confirmed normalization and unique one- and two-character tokens.
- Trusted master callables allow only the four declared master types and server-defined fields. Create sets `revision` to 1 and server timestamps; update, inactivation, and reactivation require the caller's current revision, increment it once, and reject stale changes unchanged.
- Master removal is reversible inactivation, not physical deletion. Management lists include inactive records; new-case selectors include only active masters and exclude properties whose referenced homeowner or construction company is inactive.
- Changing a property's homeowner uses one Admin SDK transaction to update the property and every referencing case, including cancelled and invalid cases. It preserves each case's `updatedAt` and all other fields. Changing the property's construction company does not update existing cases.
- The local prototype supports at most 400 case-reference updates in one property-homeowner change. Larger fan-out is rejected before writes so no partial state remains; production-scale retry or job processing remains deferred.

## Access Rules

- Business reads and writes require Firebase Authentication plus an existing enabled `staffAccounts/{uid}` record.
- Direct client writes to staff accounts are denied. An enabled user may read only their own staff record in this slice.
- Direct client writes to construction-company, homeowner, warranty-service, and property masters are denied. Local-only trusted master callables validate fields, derive N-Gram maps where applicable, enforce optimistic revisions, and perform lifecycle changes.
- Direct client creation of cases and applied warranties, and all client writes to case-number counters and reservations, are denied. Only the local trusted callable registration path may perform the initial atomic registration.
- The UI registers cases through a callable function so concurrent counter contention uses the Admin SDK transaction retry path; the function independently verifies an enabled staff account and active referenced masters.
- Enabled staff edit only active case-level fields through a client Firestore transaction. The transaction rejects a stale `updatedAt` baseline and a changed homeowner baseline, verifies a property selected after the dialog opened and its default references, and validates independently changed homeowner/construction-company references. After any such property selection, including selecting another property and returning to the original one, an unoverridden field uses the property's value read inside the transaction and an explicitly overridden field uses its validated submitted value. A request-only selection-intent boolean preserves that distinction when the final property ID equals the original ID. The transaction writes the effective references with a server timestamp and does not edit immutable identifiers or applied warranties.
- Physical deletes of cases, applied warranties, masters, counters, and reservations are denied.
- Account-management role enforcement remains a Cloud Functions responsibility and is not implemented by general business-data rules.

## Slice Queries

- The minimum slice subscribes to cases, current master records, and each returned case's applied warranties; it then sorts by `updatedAt` descending and `registeredAt` descending and produces one row per case in the client.
- The same in-memory rows evaluate the confirmed 30-day alert rule and `not notified` marker. Collection-group query, pagination, batching, and final index design remain deferred pending representative-data evidence.
- Master search data is written in this slice. The final Firestore token-query/index strategy remains open and must not be inferred from this contract.
- The local case list filters its subscribed rows in memory. As reversible prototype assumptions, populated filters are combined with AND, an expiry-date value is an exact calendar-date match, and combined warranty-service, notification-status, and expiry-date criteria must be satisfied by the same applied warranty. These assumptions are not production requirements and remain replaceable when the open search behavior is confirmed.

## Explicitly Deferred

- Production schema and Firebase identifiers, Hosting/deployment configuration, migration mapping, legacy-number collision handling, pagination, final combined-filter semantics, and performance targets.
- Production-scale property-homeowner propagation, batching, retry, and recovery beyond the local 400-case atomic limit.
- Final account-disable partial-failure recovery and full account-management Functions.
- Postal-code external API calls, production monitoring, backup/recovery, broader authorization, audit logs, attachments, and construction-company submission.

## Local Verification Required

- Unauthenticated, Authentication-only, missing-staff, and disabled-staff access is denied; enabled staff can use the intended business paths.
- Direct staff-account mutation and all physical deletes are denied.
- Four-master create, read, update, inactivate, and reactivate behavior preserves IDs, validates references, regenerates search tokens, and rejects stale revisions unchanged.
- Property-homeowner changes atomically propagate to all locally supported referencing cases regardless of case status, while property construction-company changes do not propagate.
- Registration and active-case property changes initially select the property's homeowner and construction company, while active independently selected overrides persist exactly when saved.
- Concurrent registration produces distinct reservations and complete case/warranty records.
- Alert boundaries, one-row dashboard behavior, current-master joins, N-Gram normalization, and case ordering match the confirmed requirements.
- Emulator evidence does not replace later verification in the provided development Firebase environment.
