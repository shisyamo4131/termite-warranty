# 0031 Japan Post Postal Data for Postal-Code Lookup

- Date: 2026-09-17
- Status: Accepted
- Related specification: [Postal-code requirements](../specification.md#functional-requirements)
- Supersedes: [0022 Google Geocoding for postal-code lookup](0022-google-geocoding-postal-lookup.md)

## Context

The project previously selected a Google Maps Platform Geocoding API direction, but that would require a runtime external API, credentials, billing, quota, and provider-policy decisions. Japan Post publishes the authoritative nationwide postal-code CSV in UTF-8 with one postal code per record, and its explanatory page states the data is freely distributable. The project needs predictable Japanese postal-code completion while preserving manual correction and avoiding runtime external dependencies.

## Decision

- Adopt Japan Post's official nationwide 「住所の郵便番号（1レコード1行、UTF-8形式）」 CSV.
- Transform the nationwide data for search, split it into bounded postal-code shards, and serve it from Firebase Hosting on the same origin.
- Complete prefecture and municipality and use the matched town-area as the initial value or leading portion of the existing `street/town and number` field; let staff select among multiple candidates. Chome and lot number are appended or corrected in that same field, while building name remains a separate manual field. All address fields remain editable after selection, and no new persisted address field is added.
- Provide a manual update command for the initial release and check monthly. Record source/basis date, `lastCheckedAt`, `generatedAt`, schema version, shard/count/checksum metadata, and warn administrators after 60 days without an update check. Automatic updates are not included in this decision.
- Do not use a runtime external API or require an API key, billing, quota allocation, App Check, or Google attribution.

## Rationale

The source is authoritative for Japanese postal-code data, while generated same-origin shards provide bounded client reads and deterministic publication. Manual correction remains available for address portions that postal-code data cannot determine.

## Alternatives Considered

- Google Maps Platform Geocoding API: superseded because it introduced runtime credentials, billing, quota, provider-policy, and attribution boundaries that are unnecessary for this requirement.
- Japan Post Postal Code and Digital Address API: not selected; the adopted source is the official nationwide CSV with project-controlled transformation and publication.

## Impact

HSC-017 is resolved and ADR-0022 is superseded. TR-009, the specification, address/delivery requirements, operations, HSC-018, indexes, and roadmaps now describe the CSV/shard/manifest direction. Existing provider-neutral UI/domain foundation remains reusable. CSV update, transformation, publication, manifest, and freshness-warning implementation are not complete.

## Migration / Rollout

No application data migration is required. Implement the update command and generated Hosting data before enabling lookup. Until then, retain manual address entry and the current zero-network foundation.

## Reconsideration Trigger

Reconsider if Japan Post source format, distribution conditions, lookup accuracy, shard performance, freshness operations, or Hosting publication cannot satisfy measured requirements. Any replacement requires a new approved decision.

## Evidence

- Explicit user approval in the current Codex task.
- [Japan Post UTF-8 postal-code data download](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)
- [Japan Post postal-code data notes](https://www.post.japanpost.jp/service/search/zipcode/download/readme.html)
