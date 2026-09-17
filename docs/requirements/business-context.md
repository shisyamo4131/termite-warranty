# Business Context and Terms

## Confirmed Facts

- Intended user organization: House Solution Co., Ltd. (ハウスソリューション株式会社).
- Development target: a termite-warranty business management system (白蟻保証業務管理システム).
- A construction company (工務店) is an organization that builds homes.
- A homeowner/client (施主) is the person who commissions construction of a home.
- A warranty service has one of several service types. Its warranty period can differ by type and it has an expiry date.

## Product Outcome

The system supports a newly established termite-warranty service; it is not a replacement or migration of the current FileMaker service. It is intended to alert staff when a homeowner’s subscribed warranty service is approaching its expiry date and to structure construction-company submissions and renewals.

## Provisional Planning Volume

- The peak telephone-contact volume is approximately 40 per day. Treat approximately 1,200 new cases per 30-day month and 14,400 per year as a planning upper-bound only if every contact is a new case; actual registration volume and all historical counts are unknown.
- The portal proposal assumes that five- and ten-year warranty cycles make hundreds of daily procedures and simultaneous same-company updates to one property very unlikely. This is not measured production evidence.

## Staff Access

- House Solution staff use Firebase Authentication email-address and password authentication with browser-session persistence; closing the browser window requires a new login on the next access.
- The application roles are developer superuser, House Solution administrator, and general staff. The developer superuser manages House Solution administrator accounts; a House Solution administrator manages general-staff accounts. Detailed permissions outside account management are not yet confirmed.
- Account creation sends a password-setup email; email-address verification is not required initially, and staff can reset their passwords. Disabled accounts must immediately become unusable, including existing signed-in sessions.

## Data Responsibility and Decision Authority

- House Solution has operational authority and is the final decision-maker for business data in the new system, including cases, applied warranties, masters, notifications, and staff accounts. It decides purpose, approved access, correction, retention, and deletion.
- A homeowner is the personal-information subject, not a database-record owner. Disclosure, correction, restriction-of-use, and similar requests are received through House Solution and handled under applicable law, contracts, and retention duties.
- Construction companies are responsible for the lawful acquisition context and content submitted through the portal. Development and maintenance providers act under House Solution instruction and may handle only the necessary scope. House Solution production ownership and operations are resolved under HSC-020; exact Google/Firebase provider contract terms, subprocessors, and termination conditions remain subject to HSC-025.

## Homeowner Access — Initial Release

- Homeowners are personal-information subjects, not direct application users. The initial release provides no homeowner account, login, my page, warranty viewing or editing, document download, application, or response function.
- New applications and renewals use the construction-company portal and House Solution review/confirmation workflow. Homeowner disclosure, correction, restriction-of-use, and similar requests are handled through House Solution rather than direct system access.
- This does not select a homeowner contact method or email-notification behavior; those remain open under HSC-005 and related matters. Any future homeowner access is a new scope requiring purpose, identity verification, data/actions, relationship changes, recovery/expiry, unauthorized viewing, and support decisions.

## Unresolved-Matter Routing

See [HSC-011 data ownership](house-solution-confirmations/HSC-011-data-ownership.md), [HSC-012 homeowner access](house-solution-confirmations/HSC-012-homeowner-access.md), and [HSC-013 construction-company submission](house-solution-confirmations/HSC-013-construction-company-submission.md) in the central register.
