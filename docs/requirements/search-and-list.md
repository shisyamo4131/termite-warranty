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

## Default Bounded Result

- When no search or filter value is specified, every business-record list subscribes to at most the 20 documents with the freshest server-maintained update timestamp.
- Use document ID as the stable tie-breaker when freshness timestamps are equal.
- Do not load an entire collection or create one child listener per listed parent as the fallback for an unfiltered list.
- When at least one condition is specified, the current prototype reads the complete corresponding collection in freshness order and evaluates every matching record. The UI shows the total count and presents the matches in pages of 20 records. Changing the applied conditions returns to page one. Clearing all conditions returns the list to the freshest-20 subscription.
- The case-list conditions are edited in a dialog and take effect only when applied. The dialog can initialize all draft conditions without immediately changing the active list.
- This complete filtered read is an approved prototype tradeoff. Production pagination and a scalable filtered query/index model remain to be confirmed from measured volume, response time, and cost. Case-list filtering by a selected year and month is likely, including a possible applied-warranty expiry-month condition, but the date meaning and default month are unresolved under HSC-032.

## Unresolved-Matter Routing

See [HSC-007 case search/list behavior](house-solution-confirmations/HSC-007-case-search-list.md), [HSC-026 scale/performance targets](house-solution-confirmations/HSC-026-scale-performance-targets.md), and [HSC-032 case-list month basis](house-solution-confirmations/HSC-032-case-list-month-basis.md) in the central register.
