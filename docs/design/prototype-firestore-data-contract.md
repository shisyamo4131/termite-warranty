# Prototype Firestore Data Contract

- Status: Approved for local prototype implementation only
- Approved: 2026-09-10
- Production authority: None; this is not the production schema or migration mapping
- Local Firebase demo ID: `demo-termite-warranty` (fictional `demo-*` identifier with no live resources)

## Scope and Safety Boundary

This contract supports the first local vertical slice: emulator authentication, enabled-staff access, master selection, trusted callable-function registration with one applied warranty, case list, dashboard alert evaluation, and current-master display. It may change after representative FileMaker data is inspected.

It must not be used to select or create a real Firebase project, deploy Hosting or Functions, call the postal-code API, or store real customer, property, account, or credential data.

## Prototype Collections

All generated document IDs and field names are prototype choices.

| Path | Fields |
| --- | --- |
| `staffAccounts/{firebaseUid}` | `email: string`, `displayName: string`, `role: developer_superuser \| house_solution_administrator \| general_staff`, `enabled: boolean` |
| `branches/{branchId}` | `name: string`, `active: boolean` |
| `constructionCompanies/{companyId}` | `name: string`, `active: boolean`, `nameSearch.normalized: string`, `nameSearch.one: map<string, true>`, `nameSearch.two: map<string, true>` |
| `homeowners/{homeownerId}` | Same common and name-search fields as construction companies |
| `properties/{propertyId}` | `name: string`, `homeownerId: string`, `constructionCompanyId: string`, `address.postalCode: string`, `address.prefecture: string`, `address.municipality: string`, `address.streetTownAndNumber: string`, `address.buildingName: string \| null`, `active: boolean`, and the same name-search fields |
| `warrantyServices/{serviceId}` | `name: string`, `defaultPeriodYears: positive integer`, `active: boolean` |
| `cases/{caseId}` | `caseNumber: six-digit string`, `sequenceValue: integer`, `propertyId: string`, `homeownerId: string`, `constructionCompanyId: string`, `responsibleBranchId: string`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `registrationWarrantyId: string`, `registeredAt: Timestamp`, `updatedAt: Timestamp` |
| `cases/{caseId}/appliedWarranties/{warrantyId}` | `warrantyServiceId: string`, `periodYears: positive integer`, `startDate: YYYY-MM-DD string`, `expiryDate: YYYY-MM-DD string`, `notificationStatus: not notified \| notified \| not required`, `status: active \| cancelled \| invalid`, `statusReason: string \| null`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `systemCounters/caseNumber` | `nextValue: integer`, `lastCaseId: string \| null` (atomic-registration rules linkage) |
| `caseNumberReservations/{caseNumber}` | `caseId: string` |

Business dates use ISO calendar-date strings in the prototype to avoid timezone conversion. Final date representation and business-timezone rules remain open.

## Required Prototype Invariants

- The callable registration path verifies the enabled staff account and the selected property's active homeowner, then uses one Admin SDK Firestore transaction to reserve and increment the case number, create its reservation, create the case, and create the first applied warranty referenced by `registrationWarrantyId`.
- New cases copy homeowner and construction-company IDs from the selected active property. The construction company may then be changed while the case remains active; the homeowner ID is not directly editable.
- New applied warranties copy the selected active service's positive whole-year default period, start as `active` and `not notified`, and calculate expiry using the confirmed domain rule.
- Case and applied-warranty records are never physically deleted. Terminal states require a nonblank reason and cannot return to active.
- Each applied-warranty mutation and its parent case `updatedAt` change must be atomic.
- Displayed homeowner, property, construction-company, branch, and service values are resolved from current master records. No name/address snapshot is stored on the case.
- Case documents do not store case-wide expiry, warranty period, enrolment date, notification status, or alert status.
- Master name and N-Gram search fields are written together. Search uses the confirmed normalization and unique one- and two-character tokens.

## Access Rules

- Business reads and writes require Firebase Authentication plus an existing enabled `staffAccounts/{uid}` record.
- Direct client writes to staff accounts are denied. An enabled user may read only their own staff record in this slice.
- Direct client writes to construction-company, homeowner, and property masters are denied in this slice because Security Rules cannot prove that dynamic N-Gram token maps match the name. The synthetic seed uses the Admin SDK; a later trusted master-write function must generate both atomically before master management is exposed.
- Direct client creation of cases and applied warranties, and all client writes to case-number counters and reservations, are denied. Only the local trusted callable registration path may perform the initial atomic registration.
- The UI registers cases through a callable function so concurrent counter contention uses the Admin SDK transaction retry path; the function independently verifies an enabled staff account and active referenced masters.
- Physical deletes of cases, applied warranties, masters, counters, and reservations are denied.
- Account-management role enforcement remains a Cloud Functions responsibility and is not implemented by general business-data rules.

## Slice Queries

- The minimum slice subscribes to cases, current master records, and each returned case's applied warranties; it then sorts by `updatedAt` descending and `registeredAt` descending and produces one row per case in the client.
- The same in-memory rows evaluate the confirmed 30-day alert rule and `not notified` marker. Collection-group query, pagination, batching, and final index design remain deferred pending representative-data evidence.
- Master search data is written in this slice. The final Firestore token-query/index strategy remains open and must not be inferred from this contract.

## Explicitly Deferred

- Production schema and Firebase identifiers, Hosting/deployment configuration, migration mapping, legacy-number collision handling, pagination, combined filters, and performance targets.
- Property-homeowner propagation after a property is already referenced; its retry/recovery design must be selected first.
- Final account-disable partial-failure recovery and full account-management Functions.
- Postal-code external API calls, production monitoring, backup/recovery, broader authorization, audit logs, attachments, and construction-company submission.

## Local Verification Required

- Unauthenticated, Authentication-only, missing-staff, and disabled-staff access is denied; enabled staff can use the intended business paths.
- Direct staff-account mutation and all physical deletes are denied.
- Concurrent registration produces distinct reservations and complete case/warranty records.
- Alert boundaries, one-row dashboard behavior, current-master joins, N-Gram normalization, and case ordering match the confirmed requirements.
- Emulator evidence does not replace later verification in the provided development Firebase environment.
