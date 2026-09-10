# Construction-Company Submission Options

## Status

Construction-company form submission is deferred from the initial release. No authentication or anti-abuse approach has been selected. This record is a comparison aid, not a decision or implementation plan.

## Constraints to Resolve

- An unauthenticated public form can receive spam and does not establish the sender's organization.
- Requiring every construction company to maintain an ID and password may create an unacceptable administrative burden for a business partner.
- Staff review after submission can prevent unreviewed records from becoming registered data, but it does not by itself prevent spam or impersonation attempts.

## Alternatives

| Option | How it works | Benefits | Main trade-offs |
| --- | --- | --- | --- |
| Public form with anti-abuse controls | Anyone can submit; use rate limits, bot detection, a honeypot, and staff review. | Lowest sender friction; no partner onboarding. | Does not verify the organization; controls reduce abuse but cannot establish sender identity. |
| Organization-specific submission link | Give each known construction company a distinct, revocable link or token to open the form; combine it with anti-abuse controls and staff review. | No password for the partner; submissions can be associated with a known organization; a compromised link can be revoked. | A shared or forwarded link can be used by others; token lifecycle and partner-contact management are required. |
| Email one-time passcode or magic link | The form is accessible after a code or link is sent to a pre-registered company contact email address; combine it with anti-abuse controls and staff review. | Avoids a remembered password while confirming control of an approved contact email. | Requires a maintained contact-email registry and adds a verification step; it verifies email control, not necessarily the individual sender. |
| Partner account | Issue accounts to construction-company users, with passwordless or password-based sign-in and permission management. | Strongest ongoing identity and audit model; supports future partner self-service. | Highest onboarding, support, and account-management burden. |

## Working Recommendation — Not Approved

If the form is introduced after the initial release, first evaluate email one-time passcodes or organization-specific, revocable links, each combined with rate limiting, bot detection, and staff review. These options avoid routine partner password management while providing more control than a fully public form. The acceptable friction, partner-contact data, security requirements, and operating cost must be confirmed before selection.

## Decision Inputs Needed

- Number of construction companies and frequency of submissions.
- Whether each company has a stable, controlled business email address.
- Acceptable onboarding and support burden for House Solution staff and partners.
- Required auditability, impersonation risk tolerance, and handling of a compromised contact email or link.
