# Delivery and Technology

## Confirmed Delivery Direction

- Development will use an agile approach because there is insufficient time to fully fix every specification before the production operating deadline.
- The system must officially operate in production by the end of October 2026. Data migration is included in that deadline because the users' work cannot be stopped for an extended period.
- Legacy-system data is sought during September 2026. The project will migrate records and fields to the extent feasible after inspection; complete historical migration is not required. House Solution retains the FileMaker data.

## Confirmed Delivery Milestones

The detailed schedule and progress basis are in the [2026 initial-delivery roadmap](../roadmaps/2026-initial-delivery.md).

- Mid-September 2026: provide a prototype in the development environment.
- Through late September 2026: address additional requests and defects.
- Through early October 2026: develop and test data-migration functionality.
- Through mid-October 2026: build the production environment and prepare the release.
- End of October 2026: briefly stop the legacy system, migrate data, and officially release to production.

## Confirmed Cutover Direction

- Use temporary parallel operation of FileMaker and the new system as a safety measure before official release, despite the additional user workload.
- A final migration in the evening or at night is acceptable when normal operations are stopped.
- The duration of parallel operation, final data-freeze timing, final migration window, reconciliation sequence, rollback decision, and official cutover procedure remain open.

## Confirmed Prototype Stack

- Nuxt is adopted as a single-page application (SPA) with Vuetify for the prototype.
- Firestore is adopted for the prototype database, with an application-maintained 1- and 2-character N-Gram token map for selected free-text searches.
- Firebase Authentication email/password is adopted for staff authentication.
- Cloud Functions for Firebase is adopted for server-side Firebase Admin SDK account-management operations.
- Firebase Hosting is adopted to host the Nuxt SPA.
- Japan Post's official Postal Code and Digital Address API is adopted for postal-code address lookup.
- Provide the prototype in a developer-owned development environment. Development and production use separate Firebase projects; production project ownership and project identifiers are not selected yet.
- File attachment is outside the initial-release scope, so storage for attachments is not an initial-release selection criterion.
- This is not approval of Firebase project identifiers, deployment configuration, package versions, or a complete production architecture. Browser-session persistence is required for staff sign-in. Password emails use standard Firebase Authentication delivery initially; Cloud Functions account-management transaction/retry/recovery design remains open. See [decision 0004](../decisions/0004-account-lifecycle-enforcement.md), [decision 0005](../decisions/0005-spa-and-session-persistence.md), [decision 0006](../decisions/0006-account-management-roles.md), [decision 0007](../decisions/0007-development-and-production-isolation.md), and [environments and authentication email](environments-and-authentication-email.md).

## Confirmed Local Verification Direction

- Until the development Firebase environment is provided, use Firebase Emulator Suite for local prototype verification.
- Local emulator use does not authorize creation, selection, deployment, or use of a real Firebase project, Firebase Hosting site, or production resource.
- The implementation must later be verified again against the provided development environment before it is offered as the development-environment prototype.

## Database Reassessment

- PostgreSQL may replace Firestore for production if prototype evidence or legacy-data assessment shows that the Firestore schema, N-Gram search behavior, running cost, migration, or delivery risk is unsuitable.
- Any replacement requires a recorded architecture decision and updates to the schema, migration, search, security, operations, and delivery-risk documents that it affects.

## Decision Gates Before Implementation

- Confirm the minimum usable scope and release acceptance criteria for the mandatory operational deadline.
- Inspect representative legacy data before approving the schema and migration approach.
- Confirm Firebase Admin SDK deployment/failure recovery, Firebase Hosting and Cloud Functions deployment configuration, monitoring, package versions, and the production database based on prototype evidence, operating cost, security, and delivery constraints.
