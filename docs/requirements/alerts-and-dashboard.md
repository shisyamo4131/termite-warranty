# Alerts and Dashboard

## Status

These are provisional initial-release requirements. They do not prescribe visual design, query implementation, or notification delivery outside the system.

## Continuing Alert

- An on-screen alert begins 30 days before an applied warranty's expiry date on an active case and remains visible through that expiry date, even after that applied warranty's notification status becomes `notified`.
- Cancelled and invalid cases are not alert eligible. Cancelled and invalid applied warranties are also not alert eligible.
- The case list visually marks or emphasizes a case if any of its applied warranties is alert eligible.
- The application dashboard lists alert-eligible cases once per case.
- The case list and dashboard show a `not notified` marker when at least one applied warranty on the case has notification status `not notified`.

The list and dashboard do not need to display warranty-period or expiry-date information. Applied-warranty details are viewed on the case detail screen.

## Notification Operation

- Staff perform actual customer notification outside the system at this stage.
- Staff choose a notification status for each applied warranty from a combobox.
- Initial notification-status choices are `not notified`, `notified`, and `not required`. Values and transitions may be changed later if operations require it.
- Notification status belongs to the applied warranty, not the case.
- The initial release records only the current notification status; it does not record notification date/time or operator attribution.

## Required Dashboard Columns

- Case number
- Homeowner name
- Property address
- Construction-company name
- Responsible branch

The dashboard shows the `not notified` marker described above, rather than a case-level notification-status value.
## Unresolved-Matter Routing

See [HSC-005 notification workflow](house-solution-confirmations/HSC-005-notification-workflow.md) and [HSC-006 dashboard presentation](house-solution-confirmations/HSC-006-dashboard-presentation.md) in the central register.
