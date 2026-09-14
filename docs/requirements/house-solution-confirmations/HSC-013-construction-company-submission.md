# HSC-013: Construction-Company Submission and Review

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

The current FileMaker-service member page is context only and cannot meet the new service's requirements. It appears to use one simple shared authentication account rather than one account per construction company; its exact implementation is unverified.

## Approved Initial Workflow

- Issue one shared account per construction company. House Solution administrators issue and disable it; the construction company sets and resets its password itself.
- Bind each account to one construction-company ID and restrict it to its own portal and provisional work items.
- Use one case-linked work item per registered/future case in the prototype. Company updates are limited by revision, state transitions, and submission locking.
- Queue company email notifications for renewal work and House Solution notifications after submission. Email is not the data source.
- Staff approve and atomically reflect the response in registered data or return it with a reason.
- The planning premise is low procedure volume and very unlikely simultaneous same-company updates to one property because warranties are five or ten years. This remains an unmeasured assumption.
- The prototype intentionally records company-level authentication and a self-declared current contact, not individual authenticated attribution.

## Resolution

- Decision: Adopt the implemented shared-account, company-bound portal, provisional work-item, submission lock, and House Solution approval/return workflow as the initial workflow.
- Boundary: Actual email delivery, scheduled renewal generation and reminders remain under HSC-005 and production service/security/operations matters. They do not change the accepted structured response-intake workflow.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task, following Dev prototype use.
- Promoted to: `docs/specification.md`, workflow, security/access, decision 0023, portal design, implementation, and tests.

## Affected Documents

External-submission options, workflow, roles, security, data states, UI, and tests.

## Decision Evidence

- 2026-09-13 Codex task instruction: implement this direction as a provisional prototype for presentation with supporting material.
- 2026-09-14 Codex task instruction: accept the implemented portal workflow as the initial workflow and resolve HSC-013.
