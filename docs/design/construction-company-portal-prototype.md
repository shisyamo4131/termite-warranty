# Construction-Company Portal Proposal Prototype

- Status: Implemented and technically deployed to Dev for proposal evaluation
- Decision: [0023](../decisions/0023-construction-company-portal-prototype.md)
- Open matter: [HSC-013](../requirements/house-solution-confirmations/HSC-013-construction-company-submission.md)

## Demonstrated Flow

1. A House Solution administrator selects an active construction company and issues its one shared account without setting a password.
2. The construction company uses the common login screen to request Firebase's standard password setup/reset email.
3. Staff create a renewal work item for an active case, or the company submits a new-case request.
4. The company-only surface lists at most 20 work items for the authenticated account's server-bound company ID.
5. The company saves an editable response or submits it. Submission locks editing and queues a staff notification record.
6. Staff return the response with a reason or approve it. Approval atomically creates registered data and marks the work item approved.

The staff navigation groups this feature under `工務店管理ポータル`, with `通知管理` first and `アカウント管理` second. Notification/work-item review and account issuance/lifecycle are separate routes; the former `/company-portal` route redirects to notification management.

## Identity and Access Boundary

- `constructionCompanyAccounts/{uid}` binds one Firebase UID to one construction-company master. A trusted-only `constructionCompanyAccountBindings/{constructionCompanyId}` reservation makes account issuance unique per construction company even under concurrent requests.
- The company ID is never accepted from a company request payload.
- Company users cannot render staff pages. Firestore Rules deny them access to registered cases, masters, staff profiles, other company accounts/work items, and the outbox.
- All account and work-item writes use Callables; Rules deny every direct client write to those collections.
- Disabling writes the account record disabled before disabling the Authentication user and revoking refresh tokens. Re-enabling reverses those two controls.

## One-to-One and State Contract

- Renewal: `constructionCompanyCaseWorkItems/{caseId}` uses the existing case ID. A second work item for the case is rejected.
- New case: the generated work-item ID is stored as `caseId` and becomes the registered `cases/{caseId}` ID on approval.
- Editable states are `awaiting_response`, `draft`, and `needs_correction`.
- Company submission moves to `submitted`; only staff can then move it to `needs_correction` or `approved`.
- Every mutable command compares a safe positive integer revision. A stale revision is rejected.
- This prototype intentionally supports one retained portal work item per case. Repeat renewal-cycle history is an HSC-013 production decision.

## Registered-Data Promotion

- A renewal approval adds an applied warranty using an active warranty-service master whose default period matches the requested five or ten years, rebuilds the parent projection, updates the parent timestamp, and approves the work item in one transaction.
- A new-case approval selects the responsible branch and matching warranty service, creates homeowner/property masters, reserves the next case number, creates the case under the reserved work-item ID, creates its first applied warranty, and approves the work item in one transaction.
- Declining renewal can be approved as a terminal company response without changing the case.

## Email Boundary

The prototype creates `notificationOutbox` documents with `queued` status at renewal creation, company submission, return, and approval. There is no sender, worker, retry policy, bounce handling, delivery status, real House Solution recipient, or external email write. Both portal surfaces disclose this limitation.

## Verification Contract

- Dependency-free source-contract tests cover exact Callable names, staff/company rendering separation, trusted-only writes, one-to-one IDs, revision/state wiring, and truthful queued-email presentation.
- Firestore Rules tests cover own-profile/own-work-item access, cross-company and registered-data denial, immediate enabled-record enforcement, staff review reads, and direct-write denial.
- Callable Emulator tests cover one account per company, password-free issuance, one-to-one renewal creation, company submission, cross-company rejection, renewal promotion, and new-case promotion under the reserved case ID.
- Typecheck and static build compile both staff and company surfaces.

## Known Prototype Limits

- House Solution has not accepted this workflow or field set.
- Actual email delivery and scheduled expiry-job creation are not implemented.
- Account creation failure recovery is best-effort across Authentication and Firestore; production needs an explicit retry/reconciliation procedure.
- The one-work-item-per-case rule does not model a second renewal cycle.
- Mobile support, accessibility acceptance, App Check, rate limiting, MFA, password policy, retention, monitoring, and incident response remain unverified.
