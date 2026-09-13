# HSC-013: Construction-Company Submission and Review

- Status: Proposal prototype approved; House Solution review pending
- Decision owner: House Solution

## Confirmed Context

The current FileMaker-service member page is context only and cannot meet the new service's requirements. It appears to use one simple shared authentication account rather than one account per construction company; its exact implementation is unverified.

## Approved Prototype Proposal — Not Yet a House Solution Requirement

- Issue one shared account per construction company. House Solution administrators issue and disable it; the construction company sets and resets its password itself.
- Bind each account to one construction-company ID and restrict it to its own portal and provisional work items.
- Use one case-linked work item per registered/future case in the prototype. Company updates are limited by revision, state transitions, and submission locking.
- Queue company email notifications for renewal work and House Solution notifications after submission. Email is not the data source.
- Staff approve and atomically reflect the response in registered data or return it with a reason.
- The planning premise is low procedure volume and very unlikely simultaneous same-company updates to one property because warranties are five or ten years. This remains an unmeasured assumption.
- The prototype intentionally records company-level authentication and a self-declared current contact, not individual authenticated attribution.

## Questions

1. Does House Solution accept one shared account per company and company-level rather than individual-level attribution?
2. Who supplies and maintains the shared company email, and what is the password-rotation procedure when company personnel change?
3. Does the proposed new-case/renewal field set and approve/return workflow match actual operations?
4. When and how should pending renewal work be generated, reminded, expired, or recreated after a prior approval?
5. What production abuse-prevention, retention, audit, email-delivery, support, and incident requirements apply?

## Affected Documents

External-submission options, workflow, roles, security, data states, UI, and tests.

## Decision Evidence

- 2026-09-13 Codex task instruction: implement this direction as a provisional prototype for presentation with supporting material. House Solution has not reviewed or accepted it.
