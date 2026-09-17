# HSC-012: Homeowner System Access

- Status: Resolved
- Decision owner: Project owner

## Confirmed Context

The initial-release application users are House Solution staff and participating construction companies through the adopted portal workflow. Homeowners are personal-information subjects but are not direct application users in this release.

## Resolution

- Decision: The initial release provides no homeowner-facing account, login, my page, warranty viewing or editing, document download, application, or response function.
- Decision: The canonical routes for new applications and renewals are the adopted construction-company portal and House Solution review/confirmation work.
- Decision: A homeowner's disclosure, correction, restriction-of-use, or similar personal-information request is handled through a House Solution contact channel rather than direct system access. This decision does not select a contact method or email-notification behavior; those remain under HSC-005 and related matters.
- Decision: If House Solution later requests homeowner access, it is a new scope requiring decisions on purpose, identity verification, data/actions, relationship changes such as sale or inheritance, account recovery and expiry, unauthorized viewing, and support. Read-only access may be evaluated first, but no future behavior is confirmed here.
- Decision maker/date: Project owner, 2026-09-17.
- Evidence: Explicit user approval in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/business-context.md`, `docs/requirements/security-and-access.md`, `docs/requirements/workflow.md`, and [decision 0030](../../decisions/0030-no-initial-homeowner-access.md).

## Affected Documents

Users, authentication, authorization, privacy, workflow, and product scope.
