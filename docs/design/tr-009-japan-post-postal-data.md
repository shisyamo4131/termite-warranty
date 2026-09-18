# TR-009 Japan Post Postal-Data Lookup

- Status: Implemented locally; Dev publication and browser smoke remain pending
- Roadmap: [TR-009](../roadmaps/technical-remediation.md#tr-009-japan-post-postal-data)
- Decision: [ADR 0031](../decisions/0031-japan-post-postal-data.md)
- Resolved matter: [HSC-017](../requirements/house-solution-confirmations/HSC-017-postal-api-conditions.md); HSC-018 is resolved

## Purpose and Boundary

Use Japan Post's official nationwide 「住所の郵便番号（1レコード1行、UTF-8形式）」 CSV as the source for postal-code address completion on property, homeowner, and construction-company forms. Transform the source into bounded search shards served from Firebase Hosting on the same origin. The local implementation downloads only during the explicit manual update command; raw source archives are temporary and are not published.

The provider-neutral lookup foundation already in the prototype may be reused for matching, candidate selection, stale-response protection, and manual correction. Its existing no-network behavior remains until this design is implemented and verified. No runtime external API, API key, billing, quota, App Check, or Google attribution is part of the adopted design.

## Data and Publication Design

- Keep the source CSV outside application runtime and transform it into a normalized search representation.
- Split published data by postal-code leading digits or another bounded deterministic shard key so lookup downloads only the relevant shard.
- Serve generated shards and a manifest from Firebase Hosting on the same application origin.
- The manifest provides verifiable metadata: source/basis date, source URL, `lastCheckedAt`, `generatedAt`, `schemaVersion`, shard list, record counts, and per-shard and aggregate checksums.
- A monthly manual update command checks the official source, records the check date even when content is unchanged, regenerates only after a reviewed source change, and preserves an auditable basis date. Automatic updates remain future scope.
- If `lastCheckedAt` is at least 60 days old, the staff/admin UI shows a freshness warning. This warning is not yet visually smoke-verified.

## Matching and UI Behavior

- Normalize seven-digit postal-code input, preserving the existing optional-hyphen handling.
- Complete prefecture and municipality and use the matched town-area as the initial value or leading portion of the existing `street/town and number` field. Append or correct chome and lot number in that same field; building name remains a separate manual field. Keep all address fields editable after candidate selection and add no new persisted address field.
- When multiple candidates exist, present candidates for staff selection rather than silently choosing.
- Always permit full manual entry and correction before lookup and after automatic completion.
- No reliable match leaves existing input available for manual entry. Lookup errors preserve input, show an inline failure message, and permit saving after manual correction.

## Reuse and Disposal Boundary

The existing provider-neutral application/domain seam, field-level stale-response protection, generation invalidation, and cancellation behavior are reusable implementation assets. The former external-provider adapter, credentials, proxy, attribution, provider-policy, and runtime-request design are not part of this direction and must not be added. No raw external response or provider credential is needed in the new design.

## Implementation Evidence (2026-09-18)

- `scripts/postal-data.mjs` parses the official UTF-8 CSV, deduplicates and sorts normalized rows, creates leading-three-digit shards, and writes checksummed manifest metadata.
- The 2026-08-31 source generated 124,522 records in 948 shards under `public/postal-data/` (14,774,729 bytes including manifest); source SHA-256 is recorded in the manifest.
- `src/domain/hosted-postal-lookup.mjs` loads only the relevant same-origin shard and checks schema, count, and SHA-256 before caching it.
- Property, homeowner, and construction-company forms use the provider-neutral seam; multiple candidates require selection and no-match/error leaves manual editing available.
- The safe source-check path is `npm run postal-data:check` (or `node scripts/postal-data.mjs --check-only`). Applying a reviewed source update uses `npm run postal-data:update -- --confirm=postal-data --basis-date=YYYY-MM-DD`; the script passes `--apply`, while the command still requires the explicit confirmation token and basis date. The apply path is read-only unless all required arguments are present. The parser treats the official one-record-per-line UTF-8 format as a line boundary and rejects an unclosed quoted field rather than guessing.
- Focused parser, deterministic-generator, and provider integrity tests pass. Dev deployment and browser smoke are pending.

## Operational and Security Notes

The source page and file URL may change; do not hard-code a volatile URL as a permanent requirement. Review the source before each monthly check. Generated data must be integrity-checked against manifest metadata before publication. Use no customer data in fixtures or update verification. A failed or stale update must leave the last known-good published data available and expose its basis/check date to administrators.

## References

- [Japan Post UTF-8 postal-code data download](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)
- [Japan Post postal-code data notes](https://www.post.japanpost.jp/service/search/zipcode/download/readme.html)
