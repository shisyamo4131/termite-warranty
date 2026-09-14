# 0026 Complete Filtered List Results in the Prototype

- Date: 2026-09-14
- Status: Accepted
- Related specification: [Search and list](../requirements/search-and-list.md#default-bounded-result)
- Supersedes: The filtered-list bound in [decision 0017](0017-bounded-default-list-subscriptions.md)

## Context

The current screens subscribed to the 20 freshest records and then filtered only that window. Users reasonably interpreted a specified condition as a search across the available records, so valid older matches could be omitted without an obvious error.

## Decision

Keep the freshest-20 realtime subscription when no condition is specified. When any search or filter condition is active, subscribe to the complete corresponding case or master collection in the same freshness order and apply the condition in the application. Clearing every condition restores the bounded subscription.

Case conditions are edited as a draft in a dialog. Cancel leaves the active conditions unchanged, initialize clears the draft, and apply replaces the active conditions and selects the appropriate subscription mode.

## Rationale

For the current prototype and expected presentation dataset, complete matching is more important than silently omitting older matches. The interaction also gives House Solution a concrete workflow to evaluate before a production query and pagination design is selected.

## Impact

- Filtered reads, client memory, and projection work grow with the retained collection size.
- Opening the case-filter dialog performs one complete read of each selectable master collection so records outside the default 20 can be selected.
- A filtered case list uses the parent warranty projection and complete master catalogs; it does not create one applied-warranty listener per case or redundant exact-reference listeners.
- Firestore Rules, stored schemas, indexes, and existing data require no migration.

## Alternatives

- Continue filtering only the freshest 20: rejected because it does not meet the confirmed list behavior.
- Implement every filter as a server-side Firestore query now: deferred because combined conditions, pagination, indexes, scale, and HSC-032 month semantics remain unresolved.

## Verification

Verify the bounded/unbounded source switch, filtered case assembly without child listeners, master search including one-character input, dialog apply/cancel/initialize behavior, type checking, build, and existing Emulator regressions.

## Rollback

Revert the application and documentation change to restore 20-record-window filtering. No data rollback is required.

## Reconsider When

Replace complete subscriptions with indexed server queries, pagination, or another bounded read model before production if representative data or measured latency/read cost shows the prototype approach is unsuitable.
