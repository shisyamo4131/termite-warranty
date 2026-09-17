# TR-009 Japan Post Postal-Data Lookup

- Status: Design accepted; implementation not started
- Roadmap: [TR-009](../roadmaps/technical-remediation.md#tr-009-japan-post-postal-data)
- Decision: [ADR 0031](../decisions/0031-japan-post-postal-data.md)
- Resolved matter: [HSC-017](../requirements/house-solution-confirmations/HSC-017-postal-api-conditions.md); HSC-018 is resolved

## Purpose and Boundary

Use Japan Post's official nationwide 「住所の郵便番号（1レコード1行、UTF-8形式）」 CSV as the source for postal-code address completion on property, homeowner, and construction-company forms. Transform the source into bounded search shards served from Firebase Hosting on the same origin. This design does not authorize downloading during this task or claim that the update command, transformation, publication, or warning is implemented.

The provider-neutral lookup foundation already in the prototype may be reused for matching, candidate selection, stale-response protection, and manual correction. Its existing no-network behavior remains until this design is implemented and verified. No runtime external API, API key, billing, quota, App Check, or Google attribution is part of the adopted design.

## Data and Publication Design

- Keep the source CSV outside application runtime and transform it into a normalized search representation.
- Split published data by postal-code leading digits or another bounded deterministic shard key so lookup downloads only the relevant shard.
- Serve generated shards and a manifest from Firebase Hosting on the same application origin.
- The manifest should provide verifiable metadata: source/basis date, source identifier or URL as available, `lastCheckedAt`, `generatedAt`, `schemaVersion`, shard list, record counts, and per-shard or aggregate checksum.
- A monthly manual update command checks the official source, records the check date even when content is unchanged, regenerates only after a reviewed source change, and preserves an auditable basis date. Automatic updates remain future scope.
- If `lastCheckedAt` is at least 60 days old, the staff/admin UI should show a freshness warning. This warning is not implemented yet.

## Matching and UI Behavior

- Normalize seven-digit postal-code input, preserving the existing optional-hyphen handling.
- Complete prefecture and municipality and use the matched town-area as the initial value or leading portion of the existing `street/town and number` field. Append or correct chome and lot number in that same field; building name remains a separate manual field. Keep all address fields editable after candidate selection and add no new persisted address field.
- When multiple candidates exist, present candidates for staff selection rather than silently choosing.
- Always permit full manual entry and correction before lookup and after automatic completion.
- No reliable match leaves existing input available for manual entry. Lookup errors preserve input, show an inline failure message, and permit saving after manual correction.

## Reuse and Disposal Boundary

The existing provider-neutral application/domain seam, field-level stale-response protection, generation invalidation, and cancellation behavior are reusable implementation assets. The former external-provider adapter, credentials, proxy, attribution, provider-policy, and runtime-request design are not part of this direction and must not be added. No raw external response or provider credential is needed in the new design.

## Implementation Sequence (Not Yet Done)

1. Define the normalized row and manifest schema and add synthetic fixture coverage.
2. Implement the manual source-check/update command with deterministic transformation, shards, counts, checksums, basis date, and `lastCheckedAt` recording.
3. Publish generated data through the Hosting artifact and load the relevant shard from the same origin.
4. Connect the existing provider-neutral UI seam to shard lookup and implement candidate selection/fallback behavior.
5. Add the 60-day administrator warning and verify monthly unchanged-source handling.
6. Run the documentation, application, and focused workflow gates selected by the verification policy when implementation is authorized.

## Operational and Security Notes

The source page and file URL may change; do not hard-code a volatile URL as a permanent requirement. Review the source before each monthly check. Generated data must be integrity-checked against manifest metadata before publication. Use no customer data in fixtures or update verification. A failed or stale update must leave the last known-good published data available and expose its basis/check date to administrators.

## References

- [Japan Post UTF-8 postal-code data download](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)
- [Japan Post postal-code data notes](https://www.post.japanpost.jp/service/search/zipcode/download/readme.html)
