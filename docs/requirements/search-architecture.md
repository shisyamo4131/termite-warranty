# Search Architecture

## Status

The initial prototype technology decision is recorded in [decision 0002](../decisions/0002-prototype-stack-and-search.md). This record defines its scope and remaining design decisions.

## Confirmed Constraint

- The initial release requires case filtering by selected homeowner, property, construction-company, responsible-branch, and warranty-service master records; property-address prefecture and municipality; expiry date; notification status; and exact case number. It does not require direct free-text matching of construction-company, homeowner, or property names from the case list. See [search and list](search-and-list.md).
- The prototype uses Firestore with a developer-maintained 1- and 2-character N-Gram `tokenMap` for construction-company, homeowner, and property master lists and their case-filter selection dialogs.
- File attachment is not part of the initial release.

## Research Finding

At the time this record was updated, Firebase's native Firestore text-search documentation states that its text-search feature requires the Enterprise edition and text indexes. This does not establish its suitability, cost, or compatibility for this project. Source: [Firebase: Use text search](https://firebase.google.com/docs/firestore/solutions/search).

## Prototype Design Direction

- Normalize each construction-company, homeowner, and property name, generate its 1- and 2-character tokens, and maintain those tokens when the name changes.
- Do not create a case-level name-search projection solely to search construction-company, homeowner, or property names in the case list.
- Do not treat the N-Gram token map as a general-purpose text-search engine. Prototype it using representative legacy data before accepting it for production.

## Confirmed Normalization and Token Generation

Apply the same normalization function when creating N-Gram tokens and when normalizing a search string:

1. Apply Unicode NFKC normalization.
2. Convert Latin alphabetic characters to lowercase.
3. Convert hiragana to katakana.
4. Remove surrogate-pair characters, `~`, `*`, `[`, `]`, `.`, and whitespace.
5. Generate unique one-character and two-character N-Gram tokens from the resulting string.

When a free-text feature accepts three or more characters, require all of its two-character tokens to match (AND search).

This follows the normalization and token-generation method in the user-designated `C:\Users\seven\projects\AirGuard\air-firebase-v2\src\utils\tokenMap.js`, inspected with the associated `C:\Users\seven\projects\AirGuard\air-firebase-v2\src\BaseClass.js` on 2026-09-10. It is a behavioral reference only: no schema, class design, or code is imported from that project. Hyphens are not removed by this normalization method.

## Decision Criteria

- Exact token-map structure, Firestore query design, composite-index needs, and update consistency for the adopted master-name targets.
- Representative legacy-data volume, expected concurrent users, response-time acceptance criterion, and budget.
- Consistency rule after master data changes, because cases display current master values.
- Delivery risk before the mandatory end-of-October 2026 release.

## Open Decisions

- Whether the prototype's Firestore search behavior, cost, and schema/migration fit warrant retaining Firestore for production. PostgreSQL remains a possible database replacement.
