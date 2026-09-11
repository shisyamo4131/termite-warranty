# Delivery and Technology

## Confirmed Delivery Direction

- Development will use an agile approach because there is insufficient time to fully fix every specification before the production operating deadline.
- The system must officially operate in production by the end of October 2026. Existing-system data migration is not included in that deadline.
- The new system starts without importing FileMaker records. House Solution retains the FileMaker data outside the new-system datastore.

## Confirmed Delivery Milestones

The detailed schedule and progress basis are in the [2026 initial-delivery roadmap](../roadmaps/2026-initial-delivery.md).

- Mid-September 2026: provide a prototype in the development environment.
- Through late September 2026: address additional requests and defects.
- Through early October 2026: complete production-readiness functionality and release rehearsal.
- Through mid-October 2026: build the production environment and prepare the release.
- End of October 2026: switch new registrations to the new system and officially release to production.

## Confirmed Cutover Direction

- Use temporary parallel operation of FileMaker and the new system as a safety measure before official release, despite the additional user workload.
- No final data migration is performed. The purpose and necessity of parallel operation must be reconsidered on that basis.
- The duration of parallel operation, system-of-record boundary, new-registration switch timing, rollback decision, and official cutover procedure remain open.

## Confirmed Prototype Stack

- Nuxt is adopted as a single-page application (SPA) with Vuetify for the prototype.
- Firestore is adopted for the prototype database, with an application-maintained 1- and 2-character N-Gram token map for selected free-text searches.
- Firebase Authentication email/password is adopted for staff authentication.
- Cloud Functions for Firebase is adopted for server-side Firebase Admin SDK account-management operations.
- Firebase Hosting is adopted to host the Nuxt SPA.
- Japan Post's official Postal Code and Digital Address API is adopted for postal-code address lookup.
- Provide the prototype in a developer-owned development environment. Development and production use separate Firebase projects; production project ownership and project identifiers are not selected yet.
- File attachment is outside the initial-release scope, so storage for attachments is not an initial-release selection criterion.
- Exact prototype dependency versions are pinned in `package.json` and `package-lock.json`. The verified development deployment target is `termite-warranty-dev`, with Firestore, callable Functions, and Hosting configured for the development prototype; this is not approval of production identifiers, production package promotion, or a complete production architecture. Browser-session persistence is required for staff sign-in. Password emails use standard Firebase Authentication delivery initially; Cloud Functions account-management transaction/retry/recovery design remains open. See [decision 0004](../decisions/0004-account-lifecycle-enforcement.md), [decision 0005](../decisions/0005-spa-and-session-persistence.md), [decision 0006](../decisions/0006-account-management-roles.md), [decision 0007](../decisions/0007-development-and-production-isolation.md), and [environments and authentication email](environments-and-authentication-email.md).

## Confirmed Local Verification Direction

- Continue using Firebase Emulator Suite with `demo-termite-warranty` for local regression verification. Local commands must not resolve to a real project.
- Deploy only with an explicit `--project termite-warranty-dev` target. No default project alias is recorded, reducing accidental production deployment risk.
- Verify the implementation against the development environment before offering its Hosting URL for user review.

## Database Reassessment

- PostgreSQL may replace Firestore for production if prototype evidence shows that the Firestore schema, N-Gram search behavior, running cost, consistency, or delivery risk is unsuitable.
- Any replacement requires a recorded architecture decision and updates to the schema, search, security, operations, and delivery-risk documents that it affects.

## Decision Gates Before Implementation

- Confirm the minimum usable scope and release acceptance criteria for the mandatory operational deadline.
- Validate the production schema against confirmed workflows and representative synthetic volumes before approval.
- Confirm Firebase Admin SDK deployment/failure recovery, Firebase Hosting and Cloud Functions deployment configuration, monitoring, production package promotion, and the production database based on prototype evidence, operating cost, security, and delivery constraints.
