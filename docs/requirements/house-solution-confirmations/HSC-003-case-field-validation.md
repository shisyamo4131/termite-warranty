# HSC-003: Case Field Validation

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Case registration requires application date, handover date, property, homeowner, construction company, responsible branch, and at least one applied warranty. No ordering rule between application and handover dates is currently specified.

Confirmed concurrency behavior remains outside field-validation policy: master updates, inactivation, and reactivation use last-write-wins; case and applied-warranty multi-record workflows protect against a stale baseline; and the construction-company portal uses revision and state-transition checks. No concurrency change is proposed here.

## Project Recommendation for Discussion — Not House Solution-Confirmed

Recommend two validation tiers. Both the UI and server should validate, with the server authoritative. Validation errors should identify the affected field and be written in Japanese.

### Hard save blockers

Saving should be blocked for:

- A missing application date, handover date, property, homeowner, construction company, responsible branch, or at least one valid applied warranty.
- An invalid calendar date or an expiry date before its warranty start date.
- Selecting a nonexistent master or warranty service, or newly selecting an inactive master or service.
- Setting a case or applied warranty to `cancelled` or `invalid` without a reason.

An existing case may retain an inactive referenced master, but an inactive reference cannot be newly selected.

### Warnings or confirmation, but allow save

The following should warn or request confirmation while still allowing save:

- Application date after handover date.
- A future application date.
- Warranty start date before handover date.
- A manually corrected expiry date that differs from the calculated result; preserve the confirmed behavior that no reason is required for this correction.
- A possible duplicate with the same property, warranty service, and start date.
- A case homeowner or construction company that differs from the property's defaults; preserve the confirmed ability to override those defaults.

Exceptional, late, and future business cases are why date relationships are recommended as warnings until House Solution confirms stricter blockers. UI presentation and exact Japanese message wording remain to be designed and confirmed, but messages should remain field-specific and Japanese.

## Questions

1. Does House Solution accept or revise the recommended hard save blockers, including required fields, calendar and expiry checks, active/nonexistent reference checks, and required cancellation/invalidation reasons?
2. Does House Solution accept or revise the recommended warning/confirmation cases, including date relationships, manual expiry correction, possible duplicates, and property-default overrides?
3. Which exact Japanese field-specific messages and UI confirmation patterns should be used, and does House Solution accept server-authoritative validation with the UI as an immediate feedback layer?

## Affected Documents

Workflow, case requirements, validation logic, UI, and tests.
