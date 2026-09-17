# HSC-017: Japan Post Postal Data and Lookup Operations

- Status: Resolved
- Decision owner: Project owner

## Confirmed Context

Postal-code lookup must help staff complete Japanese prefecture and municipality, and initialize the town-area portion of the existing `street/town and number` field while preserving manual correction. The former Google Maps Platform Geocoding API direction is withdrawn. The adopted source is Japan Post's official nationwide CSV, 「住所の郵便番号（1レコード1行、UTF-8形式）」. Japan Post's official download page states that nationwide data is published in UTF-8 with one postal code per record; its explanatory page states that the postal-code data is freely distributable. Source URLs and file URLs are intentionally not fixed here because they can change.

## Resolution

- Obtain the nationwide Japan Post CSV and transform it into search data. Split generated data by postal-code leading digits (or an equivalent bounded shard key) and serve shards from Firebase Hosting on the same origin.
- Complete prefecture and municipality and use the matched town-area as the initial value or leading portion of the existing `street/town and number` field. The user selects among multiple candidates, then appends or corrects chome and lot number in that same field; building name remains a separate manual field. All address fields remain editable after selection, and no new persisted address field is added.
- Always allow manual entry and correction, both before lookup and after automatic completion.
- Provide an initial-release manual update command and check for updates monthly. Automatic updates are a separate future decision.
- The published data must record the source/data basis date and `lastCheckedAt`. If the last update check is at least 60 days old, the system must show an administrator warning; a monthly check may update `lastCheckedAt` even when the source is unchanged. TR-009 adopts `generatedAt`, `schemaVersion`, shard/count, checksum, and related verifiable manifest metadata as the implementation design detail for validating publication.
- No external runtime API, API key, billing, quota allocation, App Check, Google attribution, or live Google request is part of this decision.
- The existing provider-neutral UI/domain foundation may remain reusable, but the update command, CSV transformation, shards, manifest, freshness warning, and Hosting data publication are not implemented by this decision.

## Evidence and Sources

- Evidence: Explicit user approval in the current Codex task.
- Japan Post official download page: <https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html>
- Japan Post official explanatory page: <https://www.post.japanpost.jp/service/search/zipcode/download/readme.html>

## Decision maker/date

Project owner, 2026-09-17.

## Affected Documents

Specification, branches and addresses, delivery and technology, operations, TR-009, ADR-0022/0031, HSC-018, and technical-remediation/initial-delivery roadmaps. Implementation remains pending.
