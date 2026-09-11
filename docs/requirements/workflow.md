# Business Workflow

## Current Workflow — Confirmed

1. A construction company sends warranty-service and contracting-homeowner information by email.
2. A staff member reads the email.
3. The staff member manually registers the information in the legacy system.

## Deferred Target Workflow — Confirmed Direction

1. A construction company enters the information in a form.
2. The new system creates a provisional registration.
3. A staff member reviews the provisional registration.
4. The staff member promotes the approved information to a registered record.

This direction is confirmed as a desired future workflow, but construction-company form submission and provisional-registration review are deferred from the initial release. Detailed screen behavior, review states, rejection/correction flow, audit trail, notifications, and authentication method are not yet requirements.

## Initial Release — Confirmed Scope

- Staff perform warranty registration.
- Staff can search and list registered information.
- The system alerts for warranty services nearing expiry.

The initial registration screen's remaining fields and validation rules remain open.

Selecting a property automatically selects its registered homeowner and construction company for the case. Staff can change either selection before registration and while the case remains active. Changing the selected property on an active case reselects the homeowner and construction company registered on that property; staff can then change either value before saving.

## Alerting — Confirmed Need

The system must show an on-screen alert from 30 days before an applied warranty expiry through expiry. A case is visually emphasized and listed once when any of its applied warranties is alert eligible. Warranty-period and expiry-date details are viewed on the case detail screen. Staff carry out the actual notification at this stage and select `not notified`, `notified`, or `not required` for each applied warranty from a combobox; timestamp/user attribution and repeat behavior remain open.
