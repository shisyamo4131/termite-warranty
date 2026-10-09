# Documentation Map

- [保証書CSV・期間別発行管理](design/warranty-certificates.md)：月別抽出・仮5列・保存／導入契約。

- [Dev／Prod環境設定・権限仕様](requirements/environment-configuration.md)：実設定と構築時の照合条件。
- [保険／請求の月別取得・移行](design/monthly-queries.md)：月条件、検索用項目、まとめ読み。

- [Prod準備・Dev容量／検索／CSV実測（2026-10-08）](design/evidence/prod-readiness-2026-10-08.md)


- [共有参照Store・処理別計測](design/reference-store-metrics.md)：有効／無効購読、Functionsログ、計測の限界と検証。

- Status: Active
- Last verified: 2026-10-03 (post-presentation documentation routing)
- Authority: Navigation only. `docs/specification.md` is authoritative for confirmed requirements and `docs/roadmaps/` for verified progress.

## Project and Governance Entry Points

- [増分CSV・保証グループ入力条件](design/property-bulk-import.md)：現行14列と任意項目の空欄保存。[検証／Dev反映記録](design/evidence/increment-import-2026-10-08.md)、[R2架空CSVと受入手順](../deliverables/dev-import-acceptance-2026-10-08/README.md)。

- [物件名統合・Dev移行](design/property-name-unification.md)：現在名称一項目の実装契約。 [移行手順](runbooks/property-name-migration.md)、[一括取込みのDev受入手順・架空CSV](../deliverables/dev-import-acceptance-2026-10-08/README.md)。

- [UH運用ルール確認フォーム・6問の文面](../deliverables/hs-uh-questions-2026-10-07/README.md)：2026-10-07のオーナー指定範囲。追加の不足事項は後発。編集用リンクと公開／送信状態を記録。

- [HS共有用・10月末本番稼働の目標スケジュール](../deliverables/production-schedule-2026-10-05/README.md)：2026-10-05起点の目標日程案。遅延時の納期後ろ倒しを明記。

- [Project governance index](../governance/README.md): project-specific governance, approval boundaries, and document routing.
- [Current specification](specification.md): authoritative summary of confirmed requirements and open decisions.
- [現在の運用・受入状況](operations.md#現在地と参照先): 最新のDev配備記録・受入手順への入口。過去の未配備記録と現在地を区別する。
- [Requirements index](requirements/README.md): topic-specific requirement records used during discovery.
- [受領資料台帳](requirements/source-materials.md): 2026-09-28基準の資料4点と2026-09-29追加回答・LINE回答の保管先、照合情報、仕様との位置付け。
- [Insurance reporting](requirements/insurance-reporting.md): confirmed monthly reporting and basic fields, with unresolved selection/cycle rules.
- [2026-09-28 追加確認事項](../deliverables/hs-questions-2026-09-28/README.md): HS・AriLabo向け質問PDFと未決事項登録先の対応。未送付。
- [External submission options](requirements/external-submission-options.md): unapproved alternatives for future construction-company form submission.
- [Initial data model](requirements/initial-data-model.md): provisional business entities and fields; not an implemented schema.
- [Search and list](requirements/search-and-list.md): initial-release search filters and list requirements.
- [Search architecture](requirements/search-architecture.md): proposed approaches for free-text search and their selection criteria.
- [Master management](requirements/master-management.md): master screens and case-registration creation flow.
- [User explanation items](requirements/user-explanation-items.md): confirmed behavior that must be explained during acceptance, training, or release preparation.
- [Alerts and dashboard](requirements/alerts-and-dashboard.md): continuing expiry alerts, list emphasis, and dashboard cases.
- [Permanent-warranty decision](decisions/0033-permanent-property-warranty.md): confirmed identity/renewal model, insurance boundary, migration precautions and pending implementation.
- [承認待ちなしの工務店登録・延長](decisions/0034-company-registration-without-hs-review.md): HSによるアカウント発行を維持し、新規登録・延長の都度承認を省く確定方針。実装・移行は未完了。
- [Case warranties](requirements/case-warranties.md): one permanent warranty per property, renewal history, and the existing prototype implementation gap.
- [Branches and addresses](requirements/branches-and-addresses.md): branch master, split addresses, and postal-code lookup.
- [Security and access posture](requirements/security-and-access.md): provisional access policy and explicitly recorded residual risks.
- [Unresolved-matter register](requirements/house-solution-confirmations.md): sole index of current unresolved matters, with one linked file per matter and an explicit decision owner.
- [Delivery roadmap](roadmaps/2026-initial-delivery.md): planned milestones and verified progress for the mandatory 2026 release.
- [Technical remediation](roadmaps/technical-remediation.md): approved implementation corrections and structural work, with completion contracts and dependencies.
- [Environments and authentication email](requirements/environments-and-authentication-email.md): Firebase project separation and password-email delivery requirements.
- [Design index](design/README.md): implementation designs and explicitly provisional contracts.
- [Prototype Firestore data contract](design/prototype-firestore-data-contract.md): local-emulator-only collection and invariant assumptions for the first vertical slice.
- [TR-001 detailed design](design/tr-001-master-last-write-wins.md): implementation and acceptance contract for master last-write-wins.
- [TR-002 detailed design](design/tr-002-functions-domain-preparation.md): implementation and acceptance contract for deterministic shared-domain preparation and drift detection in Functions workflows.
- [TR-003 detailed design](design/tr-003-verification-deploy-gates.md): implementation and acceptance contract for complete Callable/syntax coverage and fail-closed development deployment prerequisites.
- [TR-005 detailed design](design/tr-005-bounded-list-subscriptions.md): implementation contract for bounded freshest-20 lists and parent-case warranty projections.
- [TR-007 detailed design](design/tr-007-direct-master-writes.md): implementation contract for the reduced direct-Firestore master mutation boundary.
- [TR-008 detailed design](design/tr-008-remove-unused-profile-callable.md): implementation contract for removing the unused profile Callable without changing session or account-management behavior.
- [TR-009 detailed design](design/tr-009-japan-post-postal-data.md): implementation design and measured verification for Japan Post CSV transformation, same-origin Hosting shards, manifest metadata, and freshness warnings.
- [Construction-company portal workflow](design/construction-company-portal-prototype.md): implemented shared-company-account flow for provisional case data, review, and queued notifications.
- [UI component contracts](design/ui-component-contracts/README.md): durable contracts for user-authored JavaScript UI components before tracked integration.
- [Custom UI component collaboration](runbooks/custom-ui-component-collaboration.md): ownership, concurrency, handoff, and integration procedure for the ignored local UI workbench.

## How to Start Work

1. Read `AGENTS.md`.
2. Read `governance/project-rules.md`.
3. Select the current work type from the routing table below.
4. Read the relevant roadmap and ADRs.
5. Inspect linked design, implementation, tests, and evidence before changing anything.

For project-specific verification or operations, select the applicable procedure from the routing table. Do not wait for each assignment to repeat the procedure path or its steps.

## Work Routing

| Work type | Required documents | Additional implementation or evidence |
| --- | --- | --- |
| Delegate or act on package, repository, environment, deploy, or data identifiers | Authoritative specification, manifest, data contract, release evidence, or operations source | Verify exact source/location/command and value in the current turn; stop on mismatch before state change |
| Select validation for a daily change | [検証方針JSON](../governance/verification-policy.json)、[検証の進め方](operations.md#検証の進め方)と同書の検証マトリクス | 変更箇所の試験から全体検証へ進み、[証拠の有効性](operations.md#evidence-validity-and-retry)で再利用を判断。[記録先](operations.md#検証結果と文書の記録先)に結果と省略理由をまとめる |
| Plan or report the 2026 delivery | `docs/specification.md`, `docs/requirements/delivery-and-technology.md`, and `docs/roadmaps/2026-initial-delivery.md` | Record only verified progress; revise milestone scope, evidence, and risks together when the plan changes |
| バックアップ・復旧の作業／残件確認 | [操作手順](runbooks/backup-recovery.md)の現在の例外と該当手順、[検証／実行記録](design/evidence/recovery-implementation-2026-10-06.md)の対象版・実行分 | 設計変更時は[設計索引](design/README.md)から該当設計・仕様へ進む。過去の成功記録と現在の復元可能性を区別する |
| 共通CSV取込み・住所統合・外部キーの作業／受入確認 | [共通設計](design/property-bulk-import.md)、[検証／Dev実行記録](design/evidence/common-import-address-2026-10-07.md)の該当箇所 | 資料の再照合は[受領資料台帳](requirements/source-materials.md)の既存結果と資料の更新を確認。UH固有の検討は[入口](design/uh-integration-proposal-2026-10-06.md)から該当論点へ進む |
| Author or integrate a user-designed UI component | `docs/runbooks/custom-ui-component-collaboration.md` and the component file under `docs/design/ui-component-contracts/` | User authors JavaScript only under ignored `/.user-ui-workbench/`; coordinator reviews, adapts, integrates, and validates the tracked implementation |
| `容量チェック` / `タスク容量確認` / `セッション容量確認` / `session size / handoff threshold確認` | `docs/runbooks/project-coordination.md` | `scripts/check-codex-session-size.ps1`; use the current task ID and never infer the newest session |

## Document Authority

| Document | Authoritative content |
| --- | --- |
| `governance/common-governance.md` | Managed cross-project governance; do not edit in the project |
| `governance/project-rules.md` | Project-specific instructions, ownership, safety, and approval boundaries |
| `governance/verification-policy.json` | Machine-readable change classes, gate stages, inclusion, invalidation, fallback, and omission routing |
| `docs/specification.md` | Current confirmed requirements and explicitly separated open decisions |
| `docs/requirements/` | Topic-specific requirement records that support the current specification; each record identifies confirmed facts and open decisions |
| `docs/roadmaps/` | Goals, remaining work, completion criteria, and verified progress |
| `docs/decisions/` | Material decision status and rationale |
| `docs/design/` | Product design, proposals, and evidence, classified by status |
| `docs/operations.md` | Implemented, planned, and unavailable operational behavior |
| `CHANGELOG.md` | Concise visible change history |

The current local UI palette is documented in [Clear Sky theme](design/clear-sky-theme.md).

## Documentation Completion Criteria

- Every important document is linked from this map or a product/domain index.
- Roadmap milestones link to their principal evidence.
- Confirmed, partially confirmed, proposed, evidence, and historical material are distinguishable.
- Relative links, index coverage, roadmap progress, and ADR statuses pass the repository documentation check.
- The verification matrix covers every required change class, documents aggregate inclusion and invalidation, and routes omission reasons and completion evidence.

- [HSへの追加質問・相談用メモ](requirements-review-2026-09-29.md): 試作前の27項目・旧質問の根拠記録。現行の確認事項は未決台帳とプレゼン後資料を参照。

- [打ち合わせ用試作の仕様・データ契約](design/meeting-prototype-2026-10-03.md): 27項目の採用範囲、初期化、検証と本番未決事項の境界。

- [2026-10-03 打ち合わせ資料](../deliverables/meeting-2026-10-03/README.md): プレゼン後の現行説明・確認PDF（仕様書0.1.90）と旧資料の用途を整理した索引。Word用CSV・初期HS入力を前提とし、旧当日手順／質問PDFとは区別する。

- [緊急操作用アプリ管理者台帳と選択的Dev初期化](operations.md#2026-10-02-dev配備マスタ保持の試験データ削除): 識別情報・復旧境界。秘密情報は記録しない。

- [Prod初期構築・権限引渡し手順案](runbooks/production-bootstrap-review.md): HS所有アカウントでの設定支援、一時預託終了と開発者IAMへの切替。未実行。

- [確定仕様改修のDev受入手順](runbooks/local-acceptance-2026-10-03.md)：HS業務一巡、保険報告・取消、入力再試行、例外・未実装境界。
- [独立先行改修の検証記録](design/evidence/independent-implementation-2026-10-03.md)：対象ファイル、互換性、各ゲートの実測と残件。
