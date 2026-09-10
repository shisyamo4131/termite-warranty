# 0007 Development and Production Isolation

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Environment and Boundaries](../specification.md#environment-and-boundaries)
- Supersedes: None

## Context

The mid-September prototype must be provided in a development environment, while the production system must officially operate by the end of October. The product handles customer and property information, and a prototype must not share operational data or account state with production by default.

## Decision

Use separate Firebase projects for development and production.

The prototype is deployed to the developer-owned development Firebase project. Firebase Hosting, Authentication, Firestore, and Cloud Functions configuration is maintained separately for each project. Production-project ownership, project identifiers, regions, deployment settings, and credentials are not selected or recorded by this decision.

## Rationale

Separating projects provides a firm boundary between prototype activity and production data, accounts, functions, and hosting configuration. It supports user review in development without treating prototype behavior as production release evidence.

## Impact

- Deployment procedures must target the intended project explicitly and verify that target before a state-changing deployment.
- Production-only credentials and customer data must not be used in development.
- Environment-specific configuration, release promotion, backup/recovery, monitoring, and incident procedures must be designed before production deployment.

## Alternatives

- One Firebase project with development and production distinguished only by configuration: rejected because it weakens the isolation between prototype work and production operations.

## Reconsider When

Reconsider only if a documented platform constraint makes separate Firebase projects infeasible and an equivalent isolation control is approved.
