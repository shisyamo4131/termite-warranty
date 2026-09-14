# Business Workflow

## Current FileMaker-Service Workflow — Context Only

1. A construction company enters new-case or renewal information in a web form on a simply authenticated shared member page.
2. The form delivers the entered information to staff by email.
3. The staff member manually registers the information in the legacy system.

The new service does not reuse this member page because it does not identify construction companies individually and does not satisfy the new service requirements.

## Proposal-Prototype Workflow — House Solution Review Pending

1. A House Solution administrator issues or disables one shared account per construction company; the construction company sets or resets its own password.
2. For renewal, staff create a case-linked pending work item and the system queues an email notification. For a new case, the construction company starts a new request.
3. The authenticated construction company enters a response and submits it. The current operator enters a name, while the response email is derived from the authenticated shared account. Only its own provisional data can be accessed or changed.
4. Submission locks company editing and queues a House Solution notification.
5. Staff review the structured response and either atomically promote it to registered data or return it with a reason.
6. A return reopens company editing and queues a construction-company notification.
7. Before approval, the construction company may withdraw its own new-case request with a required reason. The work item remains as an audit record and cannot be reopened.

This workflow is approved for a proposal prototype. It is not yet an accepted House Solution production requirement. Email delivery, reminder timing, retention, detailed audit needs, and final screen behavior remain open.

## Initial Release — Confirmed Scope

- Staff perform warranty registration.
- Staff can search and list registered information.
- The system alerts for warranty services nearing expiry.

The initial registration screen requires application date and handover date as case-level business dates, in addition to the required property, homeowner, construction company, responsible branch, and applied warranty information. No ordering rule between application date and handover date is currently specified. Remaining fields and validation rules remain open.

Entering or changing the handover date auto-fills the warranty start date while that start date is blank or still equal to the prior auto-filled handover date. A manually changed warranty start date is preserved. The same interaction applies to the construction-company new-case form.

Selecting a property automatically selects its registered homeowner and construction company for the case. Staff can change either selection before registration and while the case remains active. Changing the selected property on an active case reselects the homeowner and construction company registered on that property; staff can then change either value before saving.

## Alerting — Confirmed Need

The system must show an on-screen alert from 30 days before an applied warranty expiry through expiry. A case is visually emphasized and listed once when any of its applied warranties is alert eligible. Warranty-period and expiry-date details are viewed on the case detail screen. Staff carry out the actual notification at this stage and select `not notified`, `notified`, or `not required` for each applied warranty from a combobox; timestamp/user attribution and repeat behavior remain open.
