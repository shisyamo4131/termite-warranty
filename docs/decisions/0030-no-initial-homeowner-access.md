# 0030: No Initial Homeowner Access

- Date: 2026-09-17
- Status: Accepted
- Related specification: [Specification — Users and Scope](../specification.md#users)
- Supersedes: None

## Context

The initial service is operated by House Solution staff and uses the adopted construction-company portal for new applications and renewals. Homeowners are the personal-information subjects, but a homeowner-facing account, self-service page, or direct workflow would require identity, relationship, support, and security decisions that are not part of the initial delivery.

## Decision

- Do not provide homeowner accounts, login, my pages, warranty viewing or editing, document download, application, or response functions in the initial release.
- Use the construction-company portal and House Solution review/confirmation work as the canonical new-application and renewal routes.
- Handle homeowner disclosure, correction, restriction-of-use, and similar requests through a House Solution contact channel rather than direct system access.
- This decision does not choose the contact method or email-notification behavior; those remain open under HSC-005 and related matters.
- Reconsider future homeowner access as a new scope covering purpose, identity verification, permitted data/actions, sale or inheritance relationship changes, account recovery and expiry, unauthorized viewing, and support. Read-only access may be evaluated first, without pre-confirming future behavior.

## Rationale

This keeps the initial release aligned with the staff-operated and construction-company response workflow while leaving a controlled path for a later, explicitly designed homeowner service.

## Alternatives Considered

- Provide read-only homeowner pages initially: rejected for the initial release because identity verification, account lifecycle, support, and permitted-data decisions remain unconfirmed.
- Provide homeowner application or renewal actions: rejected because the adopted canonical routes are the construction-company portal and House Solution confirmation work.

## Impact

The initial product scope, user list, workflow, and security boundary explicitly exclude direct homeowner access. Homeowner requests are routed to House Solution. No change is made to data retention, detailed staff permissions, or notification delivery decisions.

## Migration / Rollout

None. Existing staff and construction-company workflows remain unchanged. Any future homeowner feature requires a separate approved scope, design, security review, and implementation.

## Reconsideration Trigger

Reconsider if House Solution requests homeowner self-service or if an approved operational/legal need requires direct access; record the resulting identity, support, security, and data-scope decisions before implementation.
