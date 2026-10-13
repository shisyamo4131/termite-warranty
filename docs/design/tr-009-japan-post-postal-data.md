# TR-009 Japan Post Postal-Data Lookup

- Status: Local retry fix and bounded UI smoke verified on 2026-09-28, including all three master persistence paths; formal accessibility acceptance and deployment remain pending
- Roadmap: [TR-009](../roadmaps/technical-remediation.md#tr-009-japan-post-postal-data)
- Decision: [ADR 0031](../decisions/0031-japan-post-postal-data.md)
- Resolved matter: [HSC-017](../requirements/house-solution-confirmations/HSC-017-postal-api-conditions.md); HSC-018 is resolved

## Purpose and Boundary

2026-10-05追加検討：オーナーが月次の開発者作業を減らす自動更新を希望。[HSC-040](../requirements/house-solution-confirmations/HSC-040-postal-data-automatic-update.md)で方式・公開・失敗通知・差戻しを判断する。以下の手動更新方式を現時点で置き換えず、自動ジョブ・IAM・Hosting設定は未変更。

Use Japan Post's official nationwide 「住所の郵便番号（1レコード1行、UTF-8形式）」 CSV as the source for postal-code address completion on property, homeowner, and construction-company forms. Transform the source into bounded search shards served from Firebase Hosting on the same origin. The local implementation downloads only during the explicit manual update command; raw source archives are temporary and are not published.

The provider-neutral lookup foundation already in the prototype may be reused for matching, candidate selection, stale-response protection, and manual correction. The hosted provider is implemented; runtime lookup reads only same-origin generated data. No runtime external API, API key, billing, quota, App Check, or Google attribution is part of the adopted design.

## Data and Publication Design

- Keep the source CSV outside application runtime and transform it into a normalized search representation.
- Split published data by postal-code leading digits or another bounded deterministic shard key so lookup downloads only the relevant shard.
- Serve generated shards and a manifest from Firebase Hosting on the same application origin.
- The manifest provides verifiable metadata: source/basis date, source URL, `lastCheckedAt`, `generatedAt`, `schemaVersion`, shard list, record counts, and per-shard and aggregate checksums.
- A monthly manual update command checks the official source, records the check date even when content is unchanged, regenerates only after a reviewed source change, and preserves an auditable basis date. Automatic updates remain future scope.
- If `lastCheckedAt` is at least 60 days old, the staff/admin UI shows a freshness warning. Its visible message was smoke-verified locally on 2026-09-28 with temporary stale metadata, then the original manifest was restored byte-for-byte.

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
- Focused parser, deterministic-generator, and provider integrity tests pass. Revision `1d113e5b3e719679ed8d7d82ac3c313b0e6daf71` was deployed to `termite-warranty-dev` by successful push verification [run 35303358082](https://github.com/shisyamo4131/termite-warranty/actions/runs/35303358082) and workflow dispatch deployment [run 35303604261](https://github.com/shisyamo4131/termite-warranty/actions/runs/35303604261), including Firestore, Functions, and Hosting. Public smoke returned HTTP 200 for `/`; the deployed manifest reported schema 1, normalization 2, 124,522 records, 948 shards, source SHA-256 `7d42728c4c9023e30668b1ef144fd5ffd831a417011c82d3e85ca3c35db43b15`, and aggregate SHA-256 `413f822cd3b23d723826a5d560049bd80efbaf69564c5804c812c2fb9af0c8aa`; representative shards `001`, `500`, and `999` returned HTTP 200 with matching counts and hashes. On 2026-09-18, authenticated Dev UI smoke in an administrator session (`デモ管理者`) opened property, homeowner, and construction-company new-registration dialogs: `1000001` filled `東京都`/`千代田区`/`千代田`, homeowner town correction to fictional `テスト手修正` remained editable, and `0287302` presented `松川温泉`/`松尾寄木`/`八幡平温泉郷`; selecting `岩手県`/`八幡平市`/`松尾寄木` populated the fields. All three dialogs were canceled without a save action; homeowner and construction-company lists were observed without test records, while property persistence was not independently rechecked. Responsive/layout and accessibility acceptance were not performed.

## Operational and Security Notes

The source page and file URL may change; do not hard-code a volatile URL as a permanent requirement. Review the source before each monthly check. Generated data must be integrity-checked against manifest metadata before publication. Use no customer data in fixtures or update verification. A failed or stale update must leave the last known-good published data available and expose its basis/check date to administrators.

## References

- [Japan Post UTF-8 postal-code data download](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)
- [Japan Post postal-code data notes](https://www.post.japanpost.jp/service/search/zipcode/download/readme.html)

## Local Remediation and Verification (2026-09-28)

The project owner authorized postal lookup remediation independently of the unanswered HS business questions. On the primary repository, based on `b45382f`, only `src/domain/hosted-postal-lookup.mjs` and `test/postal-data.test.mjs` change application behavior/tests: a rejected manifest promise is cleared so a later lookup retries without a page reload. Successful caching and all address/storage shapes remain unchanged. The regression reproduced the former failure before the fix (focused postal-data run: exit 1, four passed and one failed).

### Completed checks

| Command | Observed result | Exit |
| --- | --- | --- |
| `node --test test/postal-data.test.mjs test/postal-lookup.test.mjs` | 19 passed | 0 |
| `npm test` | 126 total, 124 passed, 2 existing host-limited symlink skips | 0 |
| `npm run typecheck` | Passed | 0 |
| `npm run test:rules` | 67 passed; fictional local emulators only | 0 |
| `node scripts/check-functions-syntax.mjs` | Passed | 0 |
| `node --check scripts/seed-emulator.mjs` | Passed | 0 |
| `npm run build` | Static generation passed; existing chunk-size/Nitro warnings remain | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | Governance/policy alignment passed | 0 |
| `git diff --check` | No whitespace errors | 0 |

The first sandboxed Rules command failed because Firebase CLI could not update its local settings (EPERM); the local-only elevated retry above completed successfully. No live Firebase write or deployment occurred. Application-logic and documentation gates were selected from `governance/verification-policy.json`; build was also run for the postal completion contract. No selected completion gate was omitted. Subsequent edits are documentation-only, so the policy's application-test invalidation triggers do not invalidate these code results.

A read-only `node --input-type=module` audit loaded the published manifest and every listed shard, recomputed each SHA-256/count and the aggregate SHA-256, and compared total counts: 948 shards and 124,522 records passed, exit 0. No postal-source download or data update was performed.

### Local UI observations

Only fictional data in `demo-termite-warranty` was used:

- Homeowner: `100-0001` filled Tokyo/Chiyoda/Chiyoda; a fictional street correction and building name were saved, shown in detail, and remained after full reload. Postal code was normalized to `1000001`.
- Construction company: `0287302` offered three town candidates. Selecting Matsuo-yoriki by keyboard, adding a fictional street suffix, saving and reloading preserved the chosen address.
- Property: a temporary stale `lastCheckedAt` displayed the 60-day warning. `0000000` showed the no-match message and allowed manual address/area entry. The original manifest was immediately restored with identical bytes/SHA-256 (`dab51b1abc94a80687dbe39d6893df5b2c11561cbcd2e48deb59e3eb280ce1e3`).
- In-app-browser clicks did not activate some buttons; keyboard Enter did. The cause is unconfirmed and is not recorded as an application defect. During property reference selection the browser-control tool timed out twice; property save/reload, screenshot evidence, responsive layout and full accessibility acceptance could not be completed. Keyboard operation alone is not accessibility acceptance.

### Remaining work and boundaries

TR-009 is **not complete**. The retry checkpoint below closes the interrupted property persistence and bounded visual/keyboard smoke checks. Formal accessibility acceptance remains outside this smoke evidence. The retry fix has not been pushed or deployed; live verification requires separately authorized deployment. The monthly source-check workflow exists but no new source freshness claim is made by this turn.

The retry fix has no migration and can be rolled back by reverting its two-file diff. Confirmed product semantics were unchanged by this defect correction, so no postal ADR, data-contract/schema or permissions change is required. Related requirement text that still said the already-implemented postal provider was unimplemented was corrected; this does not imply all acceptance checks passed.

## Successful UI Retry (2026-09-28)

The user explicitly requested retrying the interrupted checks. The browser session was reset and the primary repository's unchanged application diff was served with `npm run dev`; `npm run emulators:start` used only `demo-termite-warranty`. `npm run emulators:seed` completed with exit 0. No application, schema, authorization, dependency or postal-data changes were made during this retry.

- A new fictional property was created by clicking New registration, selecting fictional homeowner/company references, and saving. `100-0001` completed Tokyo/Chiyoda/Chiyoda; manual street/building corrections and area `100.25` were retained in the detail page after a full reload. The stored postal code was `1000001`.
- Editing the same fictional property to `0000000` displayed the no-match message without clearing the existing address. A manually corrected street was saved and retained after a full reload.
- Editing to `0287302` displayed three town candidates. Actual focus movement with ArrowDown and Enter selected Matsuo-yoriki. The selected town plus a manual suffix was saved and retained after reload.
- Registration, reference selection, save and detail buttons responded to clicks. The earlier click/no-response symptom was not reproduced in this fresh session; its original cause remains undetermined.
- At viewport overrides `1280 x 900` and `390 x 844`, the property form, address values and update/cancel controls were visually inspected. The narrow dialog scrolls its fields while retaining the actions; no clipping preventing these tested operations was observed. Candidate instructions wrapped visibly. Input labels and the candidate combobox were present in the accessibility tree, keyboard selection worked, and Tab from the last action stayed inside the dialog. These are bounded smoke checks, not a screen-reader audit or a conformance certification. The viewport override was reset.
- Canceling a new unsaved street edit left the last saved address unchanged. Browser error-log inspection returned no error entries for this session.

Evidence (fictional local data only): [saved property after reload](evidence/tr-009-2026-09-28/postal-property-reloaded.png), [narrow dialog](evidence/tr-009-2026-09-28/postal-mobile-retry.png), [desktop dialog](evidence/tr-009-2026-09-28/postal-desktop-dialog.png).

This retry updates only this evidence record, the technical roadmap, operations summary, changelog, and the three screenshots. The earlier specification/questionnaire changes remain untouched and uncommitted. The retry is documentation-only under the verification policy: application tests/build from the preceding checkpoint remain applicable because none of their invalidation inputs changed. Governance validation and whitespace checks are rerun for the final documentation state. No specification, ADR, data-contract, permissions, or release changes are needed; no production acceptance, push or deployment is claimed.
