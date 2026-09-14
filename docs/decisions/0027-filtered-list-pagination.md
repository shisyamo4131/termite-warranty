# 0027 Filtered-List Pagination

- Date: 2026-09-14
- Status: Accepted
- Related specification: [Search and list](../requirements/search-and-list.md#default-bounded-result)
- Supersedes: The unpaginated presentation portion of [decision 0026](0026-complete-filtered-list-results.md)

## Context

The prototype correctly searches the complete collection while a condition is active, but rendering every match in one table becomes difficult to operate when more than 20 records match.

## Decision

Keep the complete ordered collection as the filtered search scope for the prototype. Present matching results in pages of 20 records, show the total match count, and return to page one whenever the applied condition changes. No-condition lists continue to show only the freshest 20 records without offering access to older unfiltered records.

## Rationale

Search completeness and display size are separate concerns. Client-side pagination preserves complete prototype matching while keeping table height and navigation predictable for presentation and evaluation.

## Impact

- This bounds rendered rows, not Firestore reads, client memory, or filtering work.
- Production still requires a measured server-query, index, and cursor-pagination decision.
- Firestore Rules, indexes, and stored records do not change.

## Rollback

Remove the page slice and controls to render every filtered result again. No data rollback is required.

## Reconsider When

Replace the complete subscription and client-side paging together when representative volume, latency, or read cost justifies indexed server-side pagination.
