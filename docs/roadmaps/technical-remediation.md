# Technical Remediation Backlog

## 2026-10-05 請求開始月・過去初回保険

オーナー承認範囲：延長請求対象月を保証開始月に変更し、初回未報告の過去保険を対象月基準で選ぶ。月内保証終了も候補に残してHSが選択する。ローカル実装・機能検証済み。完了条件は期間境界・終了・未選択保持・取消復元・請求取消後の除外の検証。2026-10-05にDev反映と指定データ初期化を完了（[実行記録](../design/evidence/dev-reset-104-2026-10-05.md)）。[保存契約](../design/meeting-prototype-2026-10-03.md)、[検証記録](../design/evidence/implementation-104-2026-10-05.md)。全体進捗の加点なし。

## 2026-10-04 状態遷移の設計レビュー（0.1.101実装・検証）

後続の改修・Dev配備指示により実装・全7ゲート・Dev反映・実画面確認を完了。[区間契約と検証記録](../design/evidence/lifecycle-101-2026-10-04.md)を現在地とする。下記は採用時点の経緯。ユーザーUI受入はまだ加点しない。

ユーザー依頼でサブエージェント3名と[状態遷移レビュー](../design/state-transition-review-2026-10-04.md)を実施後、オーナーが最小推奨案1〜3と取引単位の請求状態管理を採用。請求済み取消と延長依存の保険報告取消を延長取消の前提とし、外部訂正はHSに委ねる。全体取消の影響確認を追加。引渡日は初回分も含む有効な報告・請求・延長を戻せば訂正可能とし、処理経験だけの永久ロックは設けない。[仕様書](../specification.md)に実装待ちとして記録。連続取消に必要な記録と旧データの扱いは設計が必要。

完了条件：依存関係・既存データの扱いを確定し、必要な契約／画面／サーバー制御を反映。案内後の訂正・延長取消、請求済み延長取消の拒否と逆順取消、同月別保険区間、全体取消・復元の組合せ試験を行う。今回の文書更新で実装完了・受入加点はしない。UX-R07は受入済み。

## 0.1.100 — 2026-10-04 案内取消の文言と整合性確認

「未案内に戻す」、タイトル「保証満了案内を取り消す」、影響説明をv-alertへ変更。延長取消の既存復元動作の追加試験。全7ゲート成功、Dev Hosting反映・実画面確認済み。[記録](../design/evidence/ux-100-2026-10-04.md)。業務仕様・未確定事項の変更なし。

## 0.1.99 — 2026-10-04 案内状態・取消配置

カレンダー、報告/請求カード、延長配置はオーナーOK。保証満了案内の状態と操作を直近保証行へ集約し、全体取消を右上の色付きボタンへ変更。Dev Hosting反映・実画面確認済み。全7ゲートexit 0。[記録](../design/evidence/ux-099-2026-10-04.md)。保証上限到達時の保証/保険アラート除外はHSC-036で確認、抽出条件は不変。全体進捗の加点なし。

## 2026-10-04 UX-R追加回答

UX-R01/R06はオーナーOK、日付数値入力もOK。0.1.98でカレンダー配色・報告/請求のカード表示・延長ボタン位置を修正しDev反映・開発側確認済み。[差分受入手順](../runbooks/local-acceptance-2026-10-03.md)、[証跡](../design/evidence/ux-098-2026-10-04.md)。請求年月/未請求管理はHSC-010、保険満了一覧用途はHSC-036で確認。全体進捗の加点なし。

## 2026-10-04 UI/UX受入 U01〜U10

入力候補・余白・Vuetify既定フォーカス、日付文字入力、一括選択、取消確認とカード内操作、満了案内の専用表示を0.1.97で改修。[検証と配備](../design/evidence/ux-097-2026-10-04.md)、[再確認6項目](../runbooks/local-acceptance-2026-10-03.md#0197の要再確認ux-r0106)参照。U07/U09はユーザーOK。請求先単位の絞り込みは[HSC-010](../requirements/house-solution-confirmations/HSC-010-payer-contracting-party.md)でHS確認後の後発改修。単位は推定しない。

## 2026-10-04 パスワード設定メール・画面の後発改善

- 状態：改善要望を受領、後発作業。未実装。A01の機能受入を妨げない。
- 根拠：同日、ユーザーが設定メールの正常受信・パスワード設定・ログイン成功を報告し、初回設定／再設定時のメールと設定画面を整えることを希望。
- 対象：初回パスワード設定・再設定のメール、およびリンク先の設定画面。
- 検討案（未確定）：サービス名・送信者表示・日本語の案内文、初回設定と再設定の説明、画面の見た目、完了後のログイン導線、無効／期限切れリンクの案内を整理する。
- 着手時：利用中の認証サービスで変更できる範囲を確認し、文案と画面案を提示して具体化する。今回は認証設定・メール送信設定・実装を変更しない。
- 完了条件：採用した文案・画面を反映し、Devで初回設定／再設定のメール受信、設定、ログイン、無効リンク時の案内を確認する。

## 2026-10-04 A02-R追加指摘

郵便番号空欄登録は確認済み。入力エラーが背景一覧にも出る不具合とrules検証の不足を通常画面全体で改修する。[範囲・検証](../design/evidence/a02-r-input-validation-2026-10-04.md)を参照。2026-10-04にDev配備済み、ユーザー再確認待ち。

## 2026-10-04 Dev受入フィードバック A00〜A04

接頭辞区切り・住所拡張・工務店候補検索・本登録確認・期間表示を改修対象とする。コードの確認では背景ローディングは候補検索と一覧のbusy共有、本登録チェックの抜けは注意発生時だけ確認を要求する条件に起因。改修の自動検証とユーザー受入は[証跡](../design/evidence/dev-acceptance-a00-a04-2026-10-04.md)で区別する。旧画面残件と進捗率は変更しない。

- Status: Active
- Scope: Approved corrections and structural improvements identified during the 2026-09-11 implementation review, plus the TR-009 postal-lookup design added and independently reviewed on 2026-09-12
- Progress rule: An item is complete only when its implementation, required tests, affected contracts, and measured evidence all satisfy its completion contract. No elapsed-time or partial percentage is reported.
- Application-code baseline reviewed: `5f2a0fb47ce41d703a31cfbe7f29020c1a9d7c96`
- Repository baseline before this documentation change: `1b42ca682f423679e4345427705a25ddc12b022a` (the intervening commit from the application-code baseline changed documentation only)

This backlog records approved implementation work. It does not turn unresolved product choices into requirements. HSC-032 is resolved: no mandatory/default case-list year/month condition is used.

## Recommended Order

1. TR-001, TR-002, and TR-003: correct write semantics and make the verification/deploy path trustworthy.
2. TR-007: after that foundation phase is complete, remove the unnecessarily strong Callable boundary from the four master CUD paths before further master-form restructuring.
3. TR-008: remove the unused profile Callable while preserving the live staff-document subscription and the future server-enforced account-management boundary.
4. TR-004 and TR-006: remove duplicated form logic and split the central composable before adding more fields or screens.
5. TR-005: replace unbounded list reads after the query boundary exists; implement the common 20-document default independently of the unresolved case-month details where possible.
6. TR-009: implement the adopted Japan Post CSV transformation, Hosting shards, manifest, freshness warning, and provider-neutral lookup activation after the HSC-017 decision.

## TR-001: Align Master Writes with Last-write-wins

- Status: Implemented and accepted on `codex/tr-001-master-last-write-wins`; integration is recorded in Git history
- Detailed design: [TR-001 master last-write-wins](../design/tr-001-master-last-write-wins.md)
- Evidence: update/lifecycle DTOs and both Nuxt call sites omit `expectedRevision`; Functions derives the next safe revision from the current transaction snapshot; the registered Emulator gate covers all four masters, full-payload concurrent writes, lifecycle boundaries, invalid references/revisions, the Web Functions SDK callable boundary, and unchanged case/applied-warranty conflict behavior.
- Target: Master update, inactivation, and reactivation accept the latest trusted mutation that commits, while retaining server-side field/reference validation and atomic writes. Revision may remain as diagnostic/order metadata but not as a rejection precondition.
- Completion contract: callable DTOs, server transactions, UI calls, prototype data contract, and tests all use the rule in ADR 0016. Concurrent-write tests demonstrate last-write-wins. Case and applied-warranty stale-baseline behavior remains unchanged.
- Required validation: domain/type/build gates, master Emulator tests, Firestore Rules regression, and a UI or callable integration test that submits two edits opened from the same initial state.

## TR-002: Make Shared Domain Code Deterministic for Functions

- Status: Implemented and accepted on `codex/tr-002-functions-preparation`; integration is recorded in Git history
- Detailed design: [TR-002 deterministic Functions domain preparation](../design/tr-002-functions-domain-preparation.md)
- Purpose confirmed from repository evidence: `src/domain` contains Firebase-independent warranty, search, projection, and master-normalization logic used by both Nuxt and Functions. Because `firebase.json` declares `functions` as the Functions source directory, deployable Functions currently import a generated copy at `functions/domain`.
- Former risk: `functions/domain` was ignored by Git and generated only by selected paths. A clean checkout could not run every Functions path without manual preparation, and a developer could test an old generated copy before deployment replaced it.
- Recommended target for the current project: keep `src/domain` as the sole authored source; add one deterministic `prepare:functions` command; make every Functions syntax test, Functions Emulator start, callable integration test, and deploy path invoke it; then run a source/copy equality check that fails on drift. Never treat an existing ignored copy as test input without preparation.
- Longer-term option: evaluate a tracked internal workspace package consumed by both Nuxt and Functions. Adopt it only after proving that the Firebase deployment bundle installs and resolves the local package in a clean checkout; Firebase's documented deployment boundary remains the configured Functions source package.
- Completion contract: deleting `functions/domain` and starting from a clean checkout still permits the registered Functions tests and Emulator command to prepare the exact current source automatically; drift is detected; generated content remains excluded from commits.
- Required validation: clean-copy rehearsal, source/copy hash comparison, Functions syntax, callable integration, Emulator regression, and build/deploy dry preparation without an external deployment.
- Evidence: preparation is repository-anchored, staged, byte-compared, path-safe, and serialized with bounded lock waiting. Unit tests cover missing/stale/extra/type/content differences, byte preservation, bidirectional path containment, supported symlink boundaries, deterministic lock contention and timeout, post-lock recheck, and stage/lock cleanup. A missing real generated directory was rejected by the read-only check, then recreated by both the syntax path and the normal Emulator startup prehook; deliberate real-path content drift was rejected and repaired. The final gates passed: domain tests 48 passed/1 host-limited child-symlink fixture skipped, Firestore/Auth/Functions Emulator regression 82 passed, typecheck, build, Functions syntax, seed syntax, governance validation, canonical preparation, and independent equality check all exited 0. The normal Emulator command reached the all-ready state and was then intentionally stopped. No external deployment was performed.

## TR-003: Close Verification and Development-deploy Gaps

- Status: Implemented and accepted on `codex/tr-003-verification-deploy-gates`; integration is recorded in Git history
- Detailed design: [TR-003 verification and development-deploy gates](../design/tr-003-verification-deploy-gates.md)
- Former evidence: the existing Web Functions SDK applied-warranty test was not in a registered gate; the Functions syntax checker omitted `applied-warranty-management.js`; the development deployment workflow built and deployed without first running the project verification policy.
- Target: register an Auth+Firestore+Functions callable integration gate; cover callable wrappers and error mapping; discover or explicitly enumerate every maintained Functions module in syntax validation; make the development deploy job depend on all policy-selected gates. Review the current unconditional `--force` separately and retain it only with a documented deletion boundary.
- Completion contract: a deliberate failure in each gate blocks deployment; the callable test runs from a clean checkout using TR-002 preparation; every Functions service module is covered; deploy remains external-write gated.
- Required validation: fail-pass tests for the aggregate workflow, independent exit-status evidence for every gate, and a no-deploy workflow validation or pull-request run before enabling the changed deployment job.
- Evidence: the registered Emulator gate now covers all seven exported Callable endpoints and representative authentication, authorization, validation, stale-baseline, and atomic-rejection paths; 88 Emulator tests passed. Recursive syntax discovery checked all 10 current deployable JavaScript modules. The local workflow contract rejects every omitted comprehensive gate, conditional/non-failing gates, missing manual/`needs` boundaries, credential use in verification, missing or rebuilt revision-bound Hosting artifacts, extra/retargeted deploys, and `--force`. Domain tests passed 56 with 2 host-limited symlink fixtures skipped; typecheck, static Hosting generation with `index.html`, Functions syntax, seed syntax, and standalone workflow validation exited 0. Independent review accepted the repaired implementation. No workflow dispatch or external deployment was performed; GitHub Actions execution and remote Artifact Registry policy remain unverified.

## TR-004: Consolidate Master Form Fields and Payload Mapping

- Status: Implemented and independently accepted on `codex/tr-004-master-form-consolidation`; Git integration is recorded in repository history
- Detailed design: [TR-004 master form consolidation](../design/tr-004-master-form-consolidation.md)
- Former evidence: full creation, quick creation, and detail editing separately defined the same fields, initial state, conditional sections, and form-to-payload mapping in `MasterManagement.vue`, `QuickCreateMasterDialog.vue`, and `MasterEditDialog.vue`.
- Target: share typed form models, initialization, and pure payload mappers; reuse small field-section components for address, company contact, property references, and homeowner contact. Keep the existing list/detail shells and avoid a general metadata-driven form engine.
- Completion contract: each field is declared and mapped once per master type; full create, quick create, and edit produce the same validated payload shape; master-specific differences remain explicit and typed; no `Record<string, any>` form state remains.
- Required validation: parameterized mapper tests for every master type, component tests for the three entry points, typecheck, build, and Emulator master CRUD regression.
- Evidence: the four master types use a discriminated draft union, pure initialization/payload functions, explicit reusable field sections, and tested injectable submission adapters shared by the three entry points. Tests cover all draft/payload mappings, success callbacks, quick-create event/reset, edit saved/close, and inactive property-reference preservation; Nuxt compiles the SFC bindings. Domain/workflow tests passed 65 with 2 host-limited symbolic-link fixtures skipped; typecheck, static build, the 77-test Auth/Firestore/Functions Emulator suite, recursive Functions syntax, seed syntax, and governance validation exited 0. Independent review found no remaining High, Medium, or Low issue. DOM focus/click behavior was not automated, and no external deployment or data migration was performed.

## TR-005: Replace Unbounded List Subscriptions

- Status: Implemented and locally verified on `codex/tr-005-bounded-list-subscriptions`; mandatory case-month filtering was later rejected under HSC-032
- Detailed design: [TR-005 bounded list subscriptions](../design/tr-005-bounded-list-subscriptions.md)
- Former evidence: case and master lists subscribed to full collections, case listing created one applied-warranty listener per case, and repeated snapshots re-projected all cases in memory.
- Target: enforce ADR 0017. An unfiltered list subscribes to the freshest 20 documents using server-maintained `updatedAt` and a document-ID tie-breaker. Introduce a query/repository boundary, cursor support, and the indexes needed by bounded queries. Case warranty-derived filters use a bounded query or rebuildable list projection rather than per-case child listeners.
- Completion contract: instrumentation shows that initial listener count and reads are bounded by the visible query window rather than lifetime record count; no unfiltered full-collection fallback remains; all list types have a reliable freshness field; filtered query behavior is explicit.
- Required validation: query and index tests, listener cleanup/error tests, 20/21-record boundary tests, equal-timestamp tie-break tests, representative-volume read/listener/latency measurement, and tests for the confirmed optional case-date ranges.
- Evidence: all unfiltered case and managed-master lists use the shared `updatedAt DESC`, document-ID `DESC`, `limit(20)` query and tested cursor seam; construction-company linked properties use the corresponding bounded composite query. Case lists read an atomically maintained parent projection and create zero child-warranty listeners, while 10-ID exact-reference chunks keep visible old masters resolvable without lifetime collection reads. Unit instrumentation covers a 20-case reference plan, listener generation/cleanup/errors, projection shape, and cursor construction; Emulator tests cover equal-timestamp 20/21 boundaries and atomic registration/add/update projection paths. The seven comprehensive gates exited 0: 77 domain/workflow tests passed with 2 host-limited skips, typecheck and static build passed, 81 Emulator tests passed, recursive Functions syntax and seed syntax passed, and governance validation passed. Browser smoke confirmed the seeded dashboard, six case rows, case detail warranty, and 10-row construction-company list. The build retained its existing large-chunk and Nuxt/Nitro warnings. Optional application/handover date-range tests were added after HSC-032 rejected mandatory month filtering. Production backfill and a production-scale latency target remain outside this completed portion.

## TR-006: Split `usePrototypeData.ts` by Responsibility

- Status: Complete on `codex/tr-006-prototype-data-split`; independently reviewed
- Detailed design: [TR-006 prototype-data responsibility split](../design/tr-006-prototype-data-responsibility-split.md)
- Current evidence: one composable contains UI-facing types, date helpers, dialog draft logic, client transactions, callable gateways, master loading, case-list subscriptions, and case-detail subscriptions.
- Target: separate shared types and pure transformations, case command gateway, case list query repository, case detail query repository, and UI orchestration composables. Keep Firebase-free domain rules in the shared domain boundary. Do not add a global store unless a demonstrated cross-page state need exists.
- Completion contract: each module has one principal reason to change; UI components depend on query/command interfaces rather than raw Firestore assembly; list and detail loading expose explicit ready/error states; listener cleanup and retry behavior are testable independently.
- Required validation: existing domain and Emulator regressions, focused query/command tests, listener ordering/error/cleanup tests, component smoke tests, typecheck, and build.
- Completion evidence: the aggregate composable was removed and all consumers now use typed command, catalog, list-query, or detail-query boundaries. Dependency-free regressions cover readiness under reordered delivery, progressive data, retry generations, dynamic child cleanup, and removed-listener late callbacks. The full policy-selected gate set passed, local dashboard/list/detail smoke passed without browser console errors, and follow-up review reported no remaining High or Medium finding. See the [detailed design evidence](../design/tr-006-prototype-data-responsibility-split.md#validation).

## TR-007: Replace Master CUD Callables with Direct Firestore Writes

- Status: Implemented and independently accepted on `codex/tr-007-direct-master-writes`; integration is recorded in Git history
- Decision: [ADR 0018](../decisions/0018-direct-master-writes.md)
- Detailed design: [TR-007 direct master writes](../design/tr-007-direct-master-writes.md)
- Former evidence: direct client create/update was denied for construction-company, homeowner, property, and warranty-service masters, and every create, update, inactivation, and reactivation went through a trusted Callable. This boundary was introduced primarily so a server could derive name-search N-Gram maps and was later expanded to uniform revision, lifecycle, timestamp, and reference validation. The previously server-atomic property-to-case propagation requirement no longer exists.
- Target: enabled authenticated staff write the four master types directly through the Firestore client. As corrected by ADR 0025, Rules retain the enabled-account boundary but do not enforce staff business-data schemas or application workflow; the application generates and validates canonical fields and accepts that authenticated out-of-flow writes have no integrity guarantee.
- Boundary: keep Callable/Admin SDK paths whose server authority or multi-document transaction is separately justified, including account administration, atomic case registration and numbering, and current applied-warranty/parent-case mutation. Retain `revision` only as an atomic write-order diagnostic: direct writes neither read nor return it, so it adds no pre-write read or stale-write rejection.
- Completion contract: no master UI path invokes `createMaster`, `updateMaster`, or `setMasterActive`; the unused exported Functions and server master-mutation module are removed; direct client writes preserve current valid create/update/inactivate/reactivate behavior and reject unsupported shapes, invalid references, unauthenticated/missing/disabled staff, and physical deletion; the prototype data contract, rules, operations, tests, and deployment surface agree on the reduced boundary; accepted residual risk is documented without presenting the change as browser-external attack protection.
- Required validation: detailed design review, domain mapper/token tests, application CUD tests for all four masters, Firestore Rules authentication/enabled-account regression, application property-reference and lifecycle behavior, last-write-wins concurrency, typecheck, build, Functions syntax, clean-copy Functions preparation, and confirmation that retained Callable workflows still pass their integration tests.
- Evidence: the master UI writes all four master types through the Firestore Web SDK and no longer invokes the three removed master Callables. Rules tests cover all-four create/update/inactivate/reactivate, valid-revision legacy lifecycle-only changes, revision boundaries, enabled-account and exact-shape enforcement, active-property references, physical-delete denial, last-write-wins concurrency, and property-to-case non-propagation. The registered Emulator suite passed 78/78 and loaded only the four retained Callable exports (`getOwnProfile`, `registerCase`, `addAppliedWarranty`, and `updateAppliedWarranty`). Domain/workflow tests passed 56 with 2 host-limited symlink fixtures skipped; typecheck, static Hosting generation, recursive Functions syntax, seed syntax, Functions preparation, and governance validation exited 0. Independent review accepted the repaired implementation. No external deployment or data migration was performed.
- Subsequent correction: ADR 0025 superseded the Rules-based schema and invariant portion of this target. The historical validation above remains evidence for the implemented revision, not the current Rules contract.

## TR-008: Remove the Unused Profile Callable

- Status: Implemented and independently accepted on `codex/tr-008-remove-profile-callable`; Git integration is recorded in repository history
- Decision: [ADR 0019](../decisions/0019-remove-unused-profile-callable.md)
- Detailed design: [TR-008 remove unused profile Callable](../design/tr-008-remove-unused-profile-callable.md)
- Evidence: the local Functions inventory and Emulator load contain only `registerCase`, `addAppliedWarranty`, and `updateAppliedWarranty`; no repository client refers to `getOwnProfile`. The live `useSession` staff-document subscription and its self-read/other-user denial/staff-write denial/disabled-account regressions remain. Domain/workflow tests passed 59 with 2 host-limited symbolic-link fixture skips; typecheck, static Hosting generation, the 77-test aggregate Emulator suite, recursive Functions syntax, seed syntax, and governance validation exited 0. Independent follow-up review found no High or Medium issues. Remote existence, consumers, deployment, and deletion remain unverified and unperformed.
- Target: remove the redundant public export and wrapper test while retaining the direct self-profile Rules boundary, live session behavior, the registered aggregate Emulator gate, and future role-enforced account-management Callables.
- Completion contract: the local Functions inventory contains only `registerCase`, `addAppliedWarranty`, and `updateAppliedWarranty`; no repository client refers to `getOwnProfile`; self-read/other-user denial/staff-write denial/disabled-account regressions remain registered; affected design, decision, roadmap, indexes, operations, and changelog agree; remote existence, consumers, and deletion remain explicitly unverified and unperformed.
- Required validation: governance check, domain/workflow tests, application typecheck, aggregate Auth/Firestore/Functions Emulator regression, recursive Functions syntax, seed syntax, and independent review. Application build is omitted because no application, Nuxt, dependency, TypeScript, or build configuration changes.

## TR-009: Add Japan Post Postal-Data Lookup

- Status: Local retry correction, all three master persistence paths, and bounded visual/keyboard smoke verified on 2026-09-28; formal accessibility acceptance and deployment remain pending
- Decision: [ADR 0031](../decisions/0031-japan-post-postal-data.md)
- Detailed design: [TR-009 Japan Post postal-data lookup](../design/tr-009-japan-post-postal-data.md)
- Review evidence: the provider-neutral foundation was independently reviewed on 2026-09-12; its reusable concurrency protection and manual-entry boundary remain applicable, while the former Google-specific review gates are superseded by ADR-0031.
- Confirmed scope: transform Japan Post's nationwide UTF-8 CSV into bounded postal-code shards served from Firebase Hosting on the same origin for property, homeowner, and construction-company forms. Preserve manual entry, correction, current stored address fields, and no-match/ambiguous/failure fallbacks.
- Design boundary: the manifest records source/basis date, `lastCheckedAt`, `generatedAt`, schema version, shard/count/checksum metadata; monthly manual checking is planned and a 60-day stale-check administrator warning is required. No runtime external API, credential, billing, quota, App Check, or Google attribution is required.
- Evidence: the 2026-08-31 official source generated 124,522 normalized records across 948 deterministic shards (14,774,729 bytes including manifest); parser/generator/provider focused tests pass; all three master form types use same-origin lookup with candidate selection and manual fallback.
- Completion contract: the normalized CSV transformation and manifest are covered by synthetic fixtures; generated shards have verified counts/checksums; candidate selection and freshness warning work; late responses cannot overwrite newer field input; ambiguous results never silently choose a candidate; manual save always remains available; no runtime network request or credential is introduced; all policy-selected documentation, UI, application, syntax, and build gates pass independently.
- Foundation evidence: the provider-neutral domain/types, all three master UI paths, per-field/generation concurrency protection, provider replacement/removal handling, and synchronous full/quick/edit form cancellation are implemented with registered tests. Revision `1d113e5b3e719679ed8d7d82ac3c313b0e6daf71` was deployed to `termite-warranty-dev` by successful push verification run `35303358082` and workflow dispatch deployment run `35303604261`, including Firestore, Functions, and Hosting. Public smoke verified `/` HTTP 200 and manifest/shard integrity for representative shards `001`, `500`, and `999`. Authenticated Dev UI smoke verified lookup, candidate selection, manual correction, and cancellation in all three master dialogs; homeowner and construction-company lists were observed without test records, while property persistence was not independently rechecked. Responsive/layout and accessibility acceptance were not performed.

- 2026-09-28 checkpoint: a failed manifest load can now be retried in the same page session; regression and all selected local gates passed. All 948 shard checksums/counts were verified. Homeowner/company save and reload, property no-match/manual entry, and a temporary stale-metadata warning were observed. Browser-control timeouts blocked property save/reload and remaining visual checks. See the detailed design for commands, exit statuses, limitations and next work. No completion credit or deployment is claimed.

- Retry checkpoint (2026-09-28): the interrupted property save/reload succeeded for postal autofill/manual correction, no-match/manual saving, and multiple-candidate selection. Desktop/narrow dialog display, keyboard selection, dialog focus and cancellation were checked; screenshots are linked from the detailed design. No application code changed. Formal accessibility acceptance and deployment are not claimed.

## Earlier Remediation Evidence Source (TR-001–TR-008)

- Review: coordinator plus read-only architecture, frontend, data, and test reviewers on 2026-09-11.
- Approval and decisions: user instruction in the current Codex task on 2026-09-12. A task/thread identifier was not available to the repository authoring context.
- External documentation checked for TR-002: [Firebase Manage functions](https://firebase.google.com/docs/functions/manage-functions) documents that the CLI deploys Functions from the default/configured Functions source, and [Organize multiple functions](https://firebase.google.com/docs/functions/organize-functions) documents codebases and multiple source packages. These sources support the identified packaging purpose but do not by themselves validate a local workspace-package solution.


## TR-010: Presentation-Day Defect Record (2026-10-03)

- Status: Owner requested recording only; no implementation or deployment on presentation day. No completion credit.
- Evidence: static review of local commit `b45382f6ef92e9ab897cee59b1164766375aaa70` and current uncommitted prototype. Runtime reproduction and current hosted-version matching are unverified. Source: owner's review/deferral instruction in this Codex task.
- Scope boundary: current `app/app.vue` routes to `MeetingPrototype`; the legacy account/master/case screens below are not on the normal current route. Confirm future usage before repairing or retiring legacy code.

| Priority / scope | Finding | Later completion condition |
| --- | --- | --- |
| 1 / current shared login | `useSession.ts` does not catch rejection of initial account reads; loading remains true and no retry/subscription is established. | Release loading on failure, provide safe recovery, retain enabled checks and generation/race protection. Test failed read, recovery and sign-out/account-switch races. |
| 2 / legacy account UI and current selector review | Legacy `CompanyPortalAccountManagement.vue` limits companies and accounts to 20 with no search/paging. Current company/branch selectors also initially load 20 but settings search can reload candidates. | Make eligible companies/branches beyond 20 reachable; verify 21+ candidates, affiliation, existing accounts and account list access. Do not equate current UI with the unreachable legacy workflow. |
| 3 / legacy warranty-service properties | `useMasterManagement.ts` limits active warranties to 20 before filtering inactive cases/properties, without replenishing from later matches. | No false empty result when a qualifying property follows 20 rejected candidates; test cancellation, inactive property and duplicate references. |
| Follow-up / legacy detail | Only warranties are watched; parent cases/properties are read once. Parent-only changes do not refresh the result. | Adopt and test required refresh behaviour without prohibited per-row subscriptions. |
| Follow-up / legacy case edit | `CaseEditDialog.vue` applies new property ID/defaults against the stale catalog; `CaseDetail.vue` reloads only when opening dialogs. | Refresh/merge created property before applying defaults; verify label, homeowner and company immediately after creation. |

Presentation workaround: owner plans browser reload if login stalls. Code inspection supports reinitialization and retry on reload if communication has recovered, not a guaranteed cure; persistent connection/permission failures can recur. No runtime workaround verification was performed.

Later priority for current prototype: login recovery, company/branch selection, then list completeness. Persistent pagination under HSC-008 is a separate proposal and does not itself correct missing candidates or filtering after a limit. Implementation gates must be selected from the actual UI/application/data impact plus the regressions above. This record is documentation-only; no code, deploy or app test changes.

### 2026-10-03 プレゼン中にオーナーが観測した追加2件（後続対応）

両件とも本Codex会話でのユーザー報告に基づく。開発側での再現、ログ・送信内容確認、原因特定、稼働版照合は未実施。後発作業として記録する指示であり、今は改修・配備しない。以前の静的レビュー結果とは証拠を分ける。

| ID | 観測された手順と結果 | 後続の再現・改修完了条件 |
| --- | --- | --- |
| TR-010-06 | 物件／保証新規登録で物件名・住所等を入力し本登録。面積が未入力で「物件名、住所、建面積を入力してください」と表示。面積を追加入力して再度本登録しても同じエラー。ダイアログ終了・リロード・再登録で成功。 | 同じダイアログ内で不足項目を訂正後、最新入力値で本登録できること。フォーム値・保存済み下書き・送信内容・サーバー検証の各時点を比較し、エラー前後の部分保存の有無と再試行での重複登録・二重採番も確認。正常完了までリロード不要を実行検証する。 |
| TR-010-07 | 保証グループが存在しない状態で工務店登録を開くと「HSC」が選択済み。登録で「指定された保証グループが存在しない」旨のエラー。HSCを作成後も工務店登録が同じエラーになり、リロード・再登録で成功。 | グループ0件で存在しない候補を既定選択しない。実在する有効なグループを作成後、リロードなしで候補と選択IDが更新され、工務店を登録できること。同名再作成時の旧ID残存、削除・無効化後の選択、空データ時の初期値とキャッシュ更新を確認する。 |

原因候補（未確認）：入力値と保存・送信データのずれ、エラー後のフォーム再送状態、グループ候補・選択IDの更新不足。リロードによる解消だけで共通原因とは断定しない。実装時は変更範囲の検証ゲートに加え、上記の失敗→訂正／マスタ作成→再試行を同一画面で検証する。現在の記録変更は文書のみ。


### 2026-10-03 独立先行実装への追加承認

後続の「独立先行できる作業を開始」「Local受入はまとめて」により通常経路の改修を実施。前記の「記録のみ」は過去チェックポイント。共有ログインに読込失敗解除・15秒打切り・再試行、最新アカウント世代のみ採用する処理を追加。通常画面の会社選択に明示検索・選択会社の全支店取得を追加し、21件以降を到達可能にする。保証グループ作成後の再取得と実在ID選択を維持し、物件送信時は最新フォーム値を複製する。

TR-010-06は面積未入力→訂正→同じ要求ID再送をサーバー／HTTP Callableで回帰検証。画面での当初現象の原因特定や手動再現完了とは扱わない。TR-010-07の実画面受入も残る。通常経路外の旧画面3件（関連一覧欠落・追従不足・新規物件選択）と旧アカウントUIは今回変更しない。現行から利用する必要性の判断を待ち、解決済みにしない。

[実測](../design/evidence/independent-implementation-2026-10-03.md)／[Local受入](../runbooks/local-acceptance-2026-10-03.md)。配備・既存データ初期化は行わない。
