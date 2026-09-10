# 0002 Prototype Stack and Free-Text Search

- Date: 2026-09-10
- Status: Accepted
- Related specification: [technology and search](../specification.md)
- Supersedes: None

## Context

The prototype adopts Firestore and must retain a usable N-Gram search capability. The case list, however, can be narrowed by selecting construction-company, homeowner, and property masters rather than directly free-text-searching their names. The required production release is at the end of October 2026. The developer has experience with Nuxt, Vuetify, Firebase, and a Firestore N-Gram token-map search approach.

## Decision

Use Nuxt and Vuetify for the development-environment prototype. Use Firestore as the prototype database and maintain a 1- and 2-character N-Gram token map for free-text features that are later selected. Require at least two characters for these free-text queries; when the input has three or more characters, all two-character tokens must match.

The case-list filters select required property, homeowner, construction-company, responsible-branch, and warranty-service master records. Property address is narrowed by prefecture and municipality. Case number remains an exact-match filter. N-Gram name search applies to construction-company, homeowner, and property master lists and their case-filter selection dialogs, not to a direct case-list name query.

Use the same N-Gram normalization at write and query time: Unicode NFKC normalization, Latin lowercasing, hiragana-to-katakana conversion, removal of surrogate-pair characters, `~`, `*`, `[`, `]`, `.`, and whitespace, then generation of unique one- and two-character tokens. This behavior is based only on the user-designated AirGuard reference implementation; no AirGuard schema or code is adopted.

## Rationale

This combination uses the developer's existing experience and provides a defined path to prototype the required Japanese partial-name search before the mandatory delivery date.

## Alternatives

- Firestore Enterprise text search.
- A PostgreSQL-based database/BaaS with text-search extensions.
- A dedicated search service synchronized from Firestore.
- A different web framework or component library.

## Impact

- The N-Gram target records, token-map layout, Firestore query/index design, and consistency/update strategy must be designed and tested with representative legacy data.
- Firebase Hosting was outside this decision's selection scope and is later selected in [decision 0005](0005-spa-and-session-persistence.md). Authentication, deployment configuration, monitoring, Firebase project identifiers, regions, package versions, and production security configuration remain unselected by this decision.
- File attachments are not in the initial-release scope.

## Migration

No database migration is approved by this decision. Assess supplied FileMaker data against the prototype schema and N-Gram behavior before agreeing the feasible production-migration scope.

## Reconsider When

Reconsider the production database if representative-data testing shows unacceptable Firestore search behavior, index/write/read cost, schema fit, migration complexity, or delivery risk. PostgreSQL is an allowed replacement candidate, but a replacement requires a new recorded decision and updates to affected design, migration, security, operations, and delivery documents.
