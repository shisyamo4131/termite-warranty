# 0017 Bounded Default List Subscriptions

- Date: 2026-09-12
- Status: Accepted; filtered-list constraint superseded by [0026](0026-complete-filtered-list-results.md)
- Related specification: [Search and list](../requirements/search-and-list.md#default-bounded-result)
- Supersedes: Unbounded client-side collection subscription as the prototype default

## Context

The prototype subscribes to complete master and case collections and creates an applied-warranty listener for every case. That is convenient for a small demonstration dataset but grows reads, listeners, memory use, and repeated projection work with the total record count.

## Decision

When no search or filter value is specified, subscribe to at most the 20 documents with the freshest server-maintained update timestamp, descending, with document ID as a stable tie-breaker.

Do not use an unbounded full-collection subscription or one child listener per parent as the unfiltered fallback. The original requirement that filtered queries also remain bounded was superseded for the prototype by [decision 0026](0026-complete-filtered-list-results.md). Mandatory/default case-list year/month filtering was later rejected under resolved HSC-032.

## Rationale

The default cost and response time should depend on the visible result window rather than the total lifetime record count.

## Alternatives

- Keep all records subscribed and filter in memory: rejected because cost and processing grow with retained data.
- Disable realtime updates entirely: not selected; a bounded realtime query remains useful for operational lists.

## Impact

- Every listable record needs a reliable server-maintained freshness field.
- Queries and indexes must support descending freshness order, a stable cursor, and a limit of 20.
- Case rows that depend on applied-warranty facts need a bounded query or derived list projection rather than per-case child listeners.
- Filtered-result limits, pagination, and case month semantics require their own confirmed rules.

## Migration

No user-data migration is authorized by this decision. Implementation may require backfilling a freshness field only for records created by the new system if any lack one; that is a new-system schema maintenance operation, not migration from FileMaker.

## Reconsider When

Reconsider the window size or realtime behavior if measured workflows, response targets, or Firestore cost show that another bounded design is preferable.
