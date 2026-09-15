# HSC-002: Initial-Release Acceptance Scope

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Production operation is mandatory by the end of October 2026. Existing-system data migration is excluded from release acceptance. The roadmap and specification define the currently planned capabilities, but the remaining minimum acceptance boundary has not been confirmed.

## Project Recommendation for Discussion — Not House Solution-Confirmed

Recommend defining initial-release acceptance as end-to-end operability for new cases, with the following mandatory acceptance scope:

1. Staff authentication and account lifecycle, plus construction-company account lifecycle including disabled-account enforcement.
2. Registration and editing of construction-company, homeowner, property, warranty-service, and responsible-branch masters, including safe display of existing references after a master is inactivated.
3. Case and applied-warranty creation, reading, and editing; multiple warranties; date calculation and correction; active/cancelled/invalid changes; and automatic case numbering.
4. Search and filtering, expiry alerts, notification-status updates, dashboard, and case detail.
5. Construction-company portal new-case submission and renewal response, submission, approval/needs-correction flow, and tenant isolation.
6. The production release procedure, backup and recovery, incident contact and response, rollback, and initial master/administrator setup.

Recommended exclusions from initial-release acceptance are FileMaker migration, attachments, an audit log, a custom email-delivery provider, the newly proposed response-record feature, deferred UI or otherwise unconfirmed features, and items House Solution explicitly accepts for later delivery. Proposed response records remain excluded until House Solution confirms them and UI design is completed.

Recommended acceptance roles are: final approval by the House Solution business owner; operational review by actual staff; and review by representative construction-company user(s). Development supplies evidence but cannot be the sole business acceptor.

Recommended pass/fail criteria are:

- All mandatory scenarios pass.
- No security, privacy, data-loss, or work-blocking defects remain.
- Minor issues may remain only with a documented workaround, owner, due date, and acceptance of the residual risk.
- Release, recovery, and rollback rehearsals are completed and their results are recorded.

Use synthetic data in development. Production smoke testing should use only the minimum non-personal setup data needed to verify the release. This recommendation preserves the confirmed mandatory production-operation deadline by the end of October 2026 and does not add FileMaker migration to acceptance.

## Questions

1. Does House Solution accept or revise the recommended mandatory end-to-end scope for initial-release acceptance?
2. Does House Solution accept or revise the recommended exclusions, including FileMaker migration, attachments, audit log, custom email delivery, proposed response records, deferred/unconfirmed features, and explicitly deferred items?
3. Does House Solution accept or revise the proposed acceptance roles, synthetic/development and production-smoke data boundaries, pass/fail criteria, and release/recovery/rollback rehearsal requirement?

## Affected Documents

`docs/specification.md`, the delivery roadmap, acceptance procedures, and release operations.
