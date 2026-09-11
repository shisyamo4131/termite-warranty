# Case Warranties

## Confirmed Structure

- A case is associated with one property.
- A case can contain multiple applied warranty services.
- The same warranty-service product can be added as more than one applied warranty in the same case.
- Each applied warranty belongs to a case and holds a warranty-service product, a positive-integer whole-year warranty period, and a warranty start date. Its warranty-service name is displayed from the master, not stored as a snapshot.
- A case itself does not hold warranty-period or case-wide expiry-date information. Its applied warranties are the source for expiry and alert judgment.
- Calculate an applied warranty's initial expiry date as the day before the anniversary reached by adding its whole-year warranty period to its warranty start date. For a February 29 start date, the expiry date is February 28. Staff can manually correct it without entering a reason.
- If an initial enrolment date is needed, calculate it as the oldest warranty start date among active applied warranties; do not store it on the case.
- An applied warranty preserves its product and period even if the warranty-service master changes later.
- An applied warranty has statuses `active`, `cancelled`, and `invalid`. `cancelled` and `invalid` require a free-text reason, are retained rather than physically deleted, cannot be restored to active, and are not alert eligible.
- A case can remain active even when none of its applied warranties is active.
- Notification status belongs to each applied warranty.
- Initial notification-status choices are `not notified`, `notified`, and `not required`; they may be changed later if operations require it.
- A newly added applied warranty starts with notification status `not notified`.
- An applied warranty's period is fixed after creation and cannot be edited. Its warranty start date is editable; changing it recalculates the expiry date, which staff can then manually correct again.
- A warranty-service master's default positive-integer period change affects only newly added applied warranties; it does not alter existing applied warranties' periods or expiry dates.
- Extend coverage by adding a new applied warranty to the same case. Do not overwrite or replace the existing applied warranty; it remains a historical record with its own status and notification state.
- Initialize an extension warranty's start date to the day after the existing warranty's expiry date. Staff can edit the start date, and the system permits its coverage period to overlap with another applied warranty in the same case.
- Each case-list row links to a separate detail screen at `/cases/{id}`. The screen shows current resolved case masters and every applied warranty's current service name, fixed period, start date, expiry date, notification status, state, and any terminal-state reason. It provides a link back to the dashboard/list.
- Cancelled and invalid cases remain readable on their detail URL, including their case reason and applied-warranty history, but have no edit action. A missing case ID shows an in-app not-found message and dashboard/list link; a read failure is shown separately.
