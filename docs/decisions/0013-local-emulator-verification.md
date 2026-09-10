# 0013 Local Emulator Verification Before Development Environment

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Environment and Boundaries](../specification.md#environment-and-boundaries)
- Supersedes: None

## Context

The development Firebase environment will be provided later. Prototype implementation needs a local verification path before that environment is available.

## Decision

Use Firebase Emulator Suite locally for prototype verification until the development Firebase environment is provided.

Do not create, select, deploy to, or use a real Firebase project merely to support this temporary local verification. Reverify the prototype in the provided development environment before offering it for user review.

## Rationale

This permits implementation to start immediately while preserving the planned separation of development and production Firebase projects.

## Alternatives

- Wait for the development Firebase environment: rejected because it delays prototype implementation.
- Use a real Firebase project before it is provided: rejected because its ownership and identifiers are not yet established.

## Impact

- Local setup must include only the required emulated services for prototype verification.
- External services such as the postal-code API need a controlled local test strategy; do not send real customer data to an external service during local testing.
- Development-environment verification remains a separate milestone condition.

## Migration

No data migration impact.

## Reconsider When

Reconsider if Firebase Emulator Suite cannot support a confirmed prototype requirement or once the development Firebase environment is available.
