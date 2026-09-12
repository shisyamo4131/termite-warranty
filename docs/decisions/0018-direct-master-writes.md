# 0018 Direct Master Writes Under the Provisional Access Posture

- Date: 2026-09-12
- Status: Accepted; TR-001 through TR-003 are complete and TR-007 implementation is next
- Related specification: [Security and access posture](../requirements/security-and-access.md), [master management](../requirements/master-management.md)
- Supersedes: None

## Context

The local prototype denies direct client writes to construction-company, homeowner, property, and warranty-service masters. Their create, update, inactivation, and reactivation operations use trusted Callable Functions that validate input, generate application-maintained N-Gram search maps, manage timestamps and revisions, and validate property references.

The Callable boundary was introduced primarily because Firestore Rules cannot prove that arbitrary dynamic N-Gram maps match a submitted name. It was later used for uniform master lifecycle and revision handling and, historically, a property-to-case propagation transaction that is no longer required. The approved provisional access posture instead gives every enabled authenticated staff account the same business-data CRUD access, adds no role- or record-level business-data authorization, and defers controls aimed specifically at malicious browser-external clients.

## Decision

After TR-001, TR-002, and TR-003 complete the current write-semantics and verification/deployment foundation phase, replace the four master CUD Callable paths with direct Cloud Firestore client writes.

Firestore Rules will continue to require an enabled authenticated staff account and will enforce the supported document shape, basic types and invariants, immutable creation metadata, server update timestamps, required property-reference validity, and denial of physical deletes. They will not add role- or record-level business-data permissions.

The client will generate application-maintained name-search fields using the shared domain implementation and write them atomically with the canonical master fields. Under the provisional threat posture, Rules are not required to prove that a submitted dynamic N-Gram map is semantically equal to the submitted name. This limitation is an accepted residual risk, not a security guarantee.

This decision does not remove Callable or Admin SDK operations that have a separate server-authority or multi-document consistency requirement. Account administration, atomic case registration and numbering, and the current applied-warranty plus parent-case mutation remain outside this refactor.

Whether master `revision` remains useful diagnostic metadata or is removed will be settled in TR-007 detailed design. It must not be retained as a stale-write rejection precondition because master updates use last-write-wins.

## Rationale

The existing master boundary is stronger and more operationally complex than the approved threat posture requires. Direct writes remove unnecessary Functions invocations, deployment surface, duplicated validation boundaries, and avoidable latency while preserving the confirmed access rule and business-data invariants appropriate to the current scope.

## Alternatives

- Keep all master CUD in Callable Functions. Rejected because its additional integrity guarantee for derived search data does not currently justify the Functions cost and complexity.
- Accept canonical master writes directly and rebuild search maps asynchronously with a Firestore trigger. Rejected for now because it retains Functions cost and introduces an eventual-consistency window.
- Relax Rules to authentication-only writes with no structural checks. Rejected because the provisional authorization posture does not require abandoning basic data integrity, immutable metadata, or physical-delete protection.

## Impact

- TR-007 must change the client command boundary, Firestore Rules, master tests, Functions exports/modules, prototype data contract, and operations documentation together.
- Direct writes will remain callable from non-UI clients holding valid credentials; this is already an explicit residual risk of the provisional access posture.
- Functions invocations for master CUD will cease after the refactor. Firestore read/write billing still applies.

## Migration

No data migration is authorized by this decision. TR-007 detailed design must determine compatibility for existing master documents and any retained or removed `revision` field before implementation.

## Reconsider When

- Role- or record-level business-data permissions are confirmed.
- The system must defend derived search integrity against malicious authenticated clients.
- Search indexing moves to a server-owned index or another database.
- Regulatory, contractual, or customer requirements require a stronger server-side command boundary.
