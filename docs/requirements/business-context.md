# Business Context and Terms

## Confirmed Facts

- Intended user organization: House Solution Co., Ltd. (ハウスソリューション株式会社).
- Development target: a termite-warranty business management system (白蟻保証業務管理システム).
- A construction company (工務店) is an organization that builds homes.
- A homeowner/client (施主) is the person who commissions construction of a home.
- A warranty service has one of several service types. Its warranty period can differ by type and it has an expiry date.

## Product Outcome

The system is intended to alert staff when a homeowner’s subscribed warranty service is approaching its expiry date.

## Planning Volume

- The peak telephone-contact volume is approximately 40 per day. Treat approximately 1,200 new cases per 30-day month and 14,400 per year as a planning upper-bound only if every contact is a new case; actual registration volume and all historical counts are unknown.

## Staff Access

- House Solution staff use Firebase Authentication email-address and password authentication with browser-session persistence; closing the browser window requires a new login on the next access.
- The application roles are developer superuser, House Solution administrator, and general staff. The developer superuser manages House Solution administrator accounts; a House Solution administrator manages general-staff accounts. Detailed permissions outside account management are not yet confirmed.
- Account creation sends a password-setup email; email-address verification is not required initially, and staff can reset their passwords. Disabled accounts must immediately become unusable, including existing signed-in sessions.

## Open Decisions

- Construction-company accounts are not yet decided. See [external submission options](external-submission-options.md).
- The legal and operational ownership of customer, property, and warranty data.
- Whether homeowners themselves will access the system.
