# Search and List

## Status

These are provisional initial-release requirements. They do not prescribe screen layout, implementation, query design, or performance targets.

## Required Filters

The search/list view must filter registered cases by:

- Case number (exact match only)
- Homeowner (master-record selection)
- Property (master-record selection)
- Construction company (master-record selection)
- Property address: prefecture and municipality
- Responsible branch (master-record selection)
- Warranty-service name (master-record selection)
- Expiry date
- Notification status

The case list shows a `not notified` marker when at least one applied warranty on the case has notification status `not notified`; it does not show a case-level notification-status value.

For an expiry-date filter, return a case when at least one of its applied warranties meets the date condition.

For a notification-status filter, return a case when at least one of its applied warranties matches the selected status.

## Alert Emphasis

Cases that are within the alert period must be visually marked or emphasized in the case list. The exact visual treatment and eligibility rules are defined in [alerts and dashboard](alerts-and-dashboard.md).

## Required Case-List Columns

- Case number
- Homeowner name
- Property address
- Construction-company name
- Responsible branch

The list has one row per case. It does not need to display warranty-period or expiry-date information. Details of the case's applied warranties are viewed on the case detail screen.

## Default Ordering

- Sort by case update date in descending order.
- When update dates are equal, sort by case registration date in descending order.

## Open Decisions

- Date-search behavior, combined-filter behavior, pagination, export, and saved searches.
- Empty-result and validation behavior.
- Expected record count and response-time acceptance criteria.
