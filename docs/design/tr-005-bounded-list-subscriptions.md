# TR-005 Bounded List Subscriptions

- Status: Implemented and verified locally
- Date: 2026-09-12
- Roadmap: [TR-005](../roadmaps/technical-remediation.md#tr-005-replace-unbounded-list-subscriptions)
- Decision: [ADR 0017](../decisions/0017-bounded-default-list-subscriptions.md)
- Baseline: `8063dcccf2cefa8fec019d0bc5beee31ce397696` on `codex/tr-005-bounded-list-subscriptions`

> Current behavior note: [decision 0026](../decisions/0026-complete-filtered-list-results.md) supersedes this increment's 20-document-window behavior while a search or filter condition is active. Its unfiltered freshest-20 boundary remains in force.

## Objective

Make default list cost depend on a 20-document visible window instead of retained collection size. Preserve realtime list updates and existing detail behavior without deciding the unresolved case year/month or final pagination semantics.

## Scope and Boundaries

- An unfiltered case or master screen subscribes with `updatedAt DESC`, document ID `DESC`, and `limit(20)`.
- Query sources accept an opaque last-document cursor and use the same ordered fields with `startAfter`. TR-005 tests the cursor contract but does not expose pagination controls because pagination behavior remains unresolved.
- Existing case and master filter controls operate only on the currently subscribed 20-document window. The UI states that bounded scope explicitly; it must not imply a complete cross-dataset search.
- A construction-company detail subscribes to at most its 20 freshest linked properties. Other detail documents continue to use exact-document subscriptions.
- Case-list master data combines bounded 20-freshest catalogs with exact referenced documents needed by the visible cases. Exact-reference queries are chunked, so no full master collection is used to resolve visible rows.
- Case-list warranty facts come from a rebuildable projection stored on the parent case. Registration and every applied-warranty mutation update the child record and projection in the same trusted transaction. The list creates no per-case applied-warranty listener; case detail retains its exact child collection listener.
- HSC-032 year/month meaning, final filtered-result limit, production pagination controls, export, saved search, alternate sorting, performance targets, and production backfill remain out of scope.
- `/.user-ui-workbench/` remains user-owned and is not read or modified.

## Data Contract

`cases/{caseId}.listProjection.appliedWarranties` is a deterministically ID-sorted array. Each item contains only the fields required by current bounded list filtering and alert evaluation:

- `id`
- `warrantyServiceId`
- `expiryDate`
- `notificationStatus`
- `status`

The projection is not an additional business record and is never edited by the browser. Trusted registration and applied-warranty transactions own it. Direct case editing must preserve it unchanged. Case details remain authoritative from `cases/{caseId}/appliedWarranties/{warrantyId}`.

Local synthetic cases are refreshed with the projection by the idempotent Seed. No production data operation or FileMaker migration is authorized. A pre-projection case remains readable but cannot produce warranty-derived list markers or filters until a trusted warranty mutation rebuilds the projection or an authorized new-system maintenance operation is defined.

## Query Contract

- The limit constant is one shared value: 20.
- A cursor contains the last document's `updatedAt` value and document ID. Missing or invalid freshness data fails the cursor rather than falling back to an unbounded query.
- Equal `updatedAt` values use descending document ID order, so page boundaries are stable.
- Case-list listener count consists of one bounded case listener, five bounded catalog listeners, and 10-ID chunks for master IDs referenced by the visible case window and its projection. Applied-warranty list listeners are zero; reference-listener growth is independent of lifetime case and master collection sizes.
- Initial case-list readiness waits for the case window, bounded catalogs, and the current exact-reference generation. Replaced or stopped subscriptions ignore late callbacks.

## Compatibility

- Existing list columns, rows, alerts, detail links, case filters, master lifecycle controls, and current-master display remain.
- Dashboard totals become totals for the current 20-document window, not lifetime totals, and are labelled accordingly.
- Registration, case editing, and applied-warranty conflict rules remain unchanged except for atomic projection maintenance by trusted transactions.
- Detail screens keep complete applied-warranty reads and are not truncated to the list projection.
- Case detail subscribes only to its exact case, complete child warranties, and the master IDs those records reference; edit dialogs load their full selectable catalog once when opened.

## Validation

- Pure projection tests cover deterministic shape, replacement, and legacy absence.
- Query tests cover 20/21 boundaries, equal-timestamp document-ID ordering, cursor continuation, bounded exact-reference chunks, listener replacement, error handling, cleanup, and zero case-list warranty listeners.
- Emulator tests verify ordered limits and atomic projection creation/rebuild for registration, add, update, and rejected stale mutations.
- Final validation follows the union of application-logic, data-contract/schema, UI, documentation, and build-configuration gates.

Local evidence on 2026-09-12:

- `npm test`: exit 0; 77 passed, 2 host-limited symbolic-link fixtures skipped, 0 failed.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; static Hosting artifact generated, with the existing large-chunk and Nuxt/Nitro warnings.
- `npm run test:rules`: exit 0; 81 Auth/Firestore/Functions Emulator tests passed, including 20/21 boundaries, equal-timestamp cursor continuation, projection ownership, and trusted atomic rebuilds.
- `node scripts/check-functions-syntax.mjs`: exit 0.
- `node --check scripts/seed-emulator.mjs`: exit 0.
- `.\scripts\check-governance.ps1`: exit 0.
- Browser smoke: the seeded dashboard reported 6 visible cases, the bounded-scope notice and all 6 projected case rows rendered, case detail showed the authoritative child warranty, and the construction-company list showed its 10 current synthetic records.

No deployment, production backfill, migration, or pagination UI was performed.

## Rollback

Revert the TR-005 commit to restore the prior list subscriptions and child-listener assembly. Local Emulator data can be cleared and reseeded. A rollback after any future real deployment would require retaining projection-compatible readers until a separately authorized production data plan exists; no such deployment is part of TR-005.
