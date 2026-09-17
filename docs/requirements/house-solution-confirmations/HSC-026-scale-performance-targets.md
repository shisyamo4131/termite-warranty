# HSC-026: Scale and Response-Time Targets

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Forty telephone contacts per day is only a planning upper bound. Actual new-case rate, historical count, concurrent users, and response-time targets are unknown.

## Project Recommendation for Discussion — Not House Solution-Confirmed

- With no conditions, use a realtime subscription to the latest 20 cases.
- When conditions are present, the production target is to subscribe to or load all matching cases and paginate 20 rows at a time in the client. Require at least two search conditions to execute, except that exact case number may execute alone. The purpose is to avoid excessively broad result sets and results users cannot practically inspect.
- This two-condition rule reduces Firestore reads only when enough filtering is executed server-side or against an approved query/read model. The current prototype's complete-collection client-side filtering still reads the collection, so this is a proposed production target dependent on HSC-023 query/index design and measured HSC-026 scale. It is not implemented or confirmed.
- As a business assumption for discussion, case search appears secondary and construction-company interaction is expected to be property-centered; case search remains necessary. This is an observation/recommendation, not a confirmed fact.
- If volume becomes large, introduce stronger or selective mandatory axes, or another search architecture, after measured count, cost, and response evidence. Any such change must be approved and must supersede the relevant confirmed behavior before implementation; do not alter resolved HSC-032 or the current prototype rule that any optional condition may execute alone.

## Questions

1. Does House Solution accept or revise the latest-20 unfiltered behavior, 20-row matching pagination, two-condition minimum, and exact-case-number exception?
2. What active and historical case, warranty, master, and user volumes, peak concurrency, costs, and response-time targets should determine thresholds?
3. Does House Solution accept or revise the assumption that case search is secondary while property-centered construction-company interaction remains primary?
4. Which selective mandatory axes, query/read model, or alternative architecture should be adopted if measured scale makes the proposed target unsuitable?
5. What response-time targets apply to lists, search, registration, editing, and dashboard loading, and how should they be measured?

## Affected Documents

Non-functional requirements, database selection, query design, indexes, performance tests, and budget.
