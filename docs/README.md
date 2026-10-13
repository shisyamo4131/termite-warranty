# Documentation Map

現行のProd準備は[事前構築ロードマップ](roadmaps/production-readiness.md)を参照。2026-10-13の追加指示で認証・通常配備CI・Prod接続に加え、初期化・管理者・初回投入・復旧／バックアップのLocal実装・事前検証を実施。実Cloudの構築・配備は未実施。以下の「実装未着手」は前工程の記録。

- [Prod対応棚卸し・具体手順](design/production-readiness-inventory-2026-10-13.md)：環境判定・独自CLI認証・初回初期化／Hosting照合・復旧・CIの対応箇所、棚卸し時点の推定と10月23日構築の条件。現在の実装状態・残工数11〜14時間は上記roadmapを参照。実Cloud構築は未実施。

2026-10-13現在：承認済みの全件読取り削減と保証延長申込日改修はDev反映・開発側受入れ済み。保険検索用2項目を442物件へ整備し、それ以外の業務値・番号は不変。以下の本件に関するDev禁止・指示待ち・未反映は各工程実施時点の記録であり、現在の状態はこの記載を優先する。HSの業務受入れとは区別する。月別対象全体取得の現状維持と工務店アカウント一覧の後発対応は変更なし。[検証・導入記録](operations.md)。

- [満了案内・物件検索の旧取得経路整理](design/legacy-property-list-retirement.md)：旧条件の拒否、工務店・本支店の所属付き候補取得を採用。L1〜L5工程と、その他旧取得整理の追加O1〜O4工程（O1〜O3 Local受入れ済み）。対象全体の取得は現状維持。Dev反映禁止。

- [保証グループ・本支店の読取り削減ロードマップ](roadmaps/master-code-read-reduction.md)：保証グループは完全一致・使用先記録なし・既存ID維持、本支店／CSVは既存コード管理記録による対象取得を採用しLocal改修・検証を承認。Dev反映禁止。

- [満了案内の読取り削減](roadmaps/expiry-notice-read-reduction.md)：保証のLocal受入れ済み、保険のLocal実装・補完試験・保全復帰済みと、延長申込日の確定仕様・改修工程。Dev反映は別途明示指示待ち。

- [HS会社設定・保証グループ請求先・保証書CSVの確定設計](design/company-settings-and-document-csv.md)：自社10項目＋振込先5項目・編集ダイアログ、請求先8項目、共通21列と年月日分割、再取込み時の保全。請求先はDev受入れOK。自社情報の表示は「分類カード」を採用。[検証・Dev反映記録](operations.md)。

- [ダッシュボード検討・実装ロードマップ](roadmaps/dashboard.md)：質疑による指標定義から集計設計・検証・受入まで。[詳細設計](design/dashboard.md)はQ30で確定。実装・Local検証・Dev導入済み。ログイン後の操作確認・業務受入は残る。

- [UH加盟店コードの確認用PDF](../deliverables/uh-code-review-2026-10-09/README.md)：コード昇順で全重複50組100行を掲載した5ページの一覧。修正順序・状況判断はHSに委ねる。10月9日送付済みの当時の重複一覧。修正後のコード重複は解消、所属の残件は受領資料台帳を参照。

- [過去物件取込みの確認資料](../deliverables/historical-intake-review-2026-10-09/README.md)：回答前の5ページPDF・回答用Googleフォームと回答後の状態。HSC2件・SHS3件は確定、UH追加一覧の重複と所属対応等は継続確認。
- [過去物件取込みロードマップ](roadmaps/historical-property-intake.md)：資料確定から一括処理・再取込み・Dev検証・HS試験までの工程と完了条件。

- [過去物件のDev初期化・一括取込み](runbooks/historical-property-intake.md)：442件の取込み・全件照合・通常再開・開発検証済み。実行結果、検証物件の削除と次番号100への訂正、次のHS試験運用。

- [保証書CSV・期間別発行管理](design/warranty-certificates.md)：月別抽出・保存／導入契約と、採用済み共通21列への実装。旧仮6列の経緯は区別して保持。

- [Dev／Prod環境設定・権限仕様](requirements/environment-configuration.md)：実設定と構築時の照合条件。
- [保険／請求の月別取得・移行](design/monthly-queries.md)：HSC-042の前月基準・処理済み表示、検索用項目の限定補完、互換性・差戻し手順。保証書を含む3一覧の共通設計。

- [Prod準備・Dev容量／検索／CSV実測（2026-10-08）](design/evidence/prod-readiness-2026-10-08.md)


- [共有参照Store・処理別計測](design/reference-store-metrics.md)：有効／無効購読、Functionsログ、計測の限界と検証。

- Status: Active
- Last verified: 2026-10-03 (post-presentation documentation routing)
- Authority: Navigation only. `docs/specification.md` is authoritative for confirmed requirements and `docs/roadmaps/` for verified progress.

## Project and Governance Entry Points

- [増分CSV・保証グループ入力条件](design/property-bulk-import.md)：現行14列と任意項目の空欄保存。[検証／Dev反映記録](design/evidence/increment-import-2026-10-08.md)、[R2架空CSVと受入手順](../deliverables/dev-import-acceptance-2026-10-08/README.md)。

- [物件名統合・Dev移行](design/property-name-unification.md)：現在名称一項目の実装契約。 [移行手順](runbooks/property-name-migration.md)、[一括取込みのDev受入手順・架空CSV](../deliverables/dev-import-acceptance-2026-10-08/README.md)。

- [UH運用ルール確認フォーム・6問の文面](../deliverables/hs-uh-questions-2026-10-07/README.md)：2026-10-07のオーナー指定範囲。追加の不足事項は後発。編集用リンクと公開／送信状態を記録。

- [HS共有用・本番稼働の目標スケジュール](../deliverables/production-schedule-2026-10-05/README.md)：10月13日棚卸し後改訂。HS試験とProd準備を並行調整し、23日構築・30日納品判定を目指す条件付き計画。HS日程未合意。旧11月順次試算は現行計画ではない。

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
| Select validation for a daily change or Dev deployment | [検証方針JSON](../governance/verification-policy.json)、[目的別・変更別判断と現行ツールの制約](operations.md#dev反映で確認する目的と範囲)、[検証の進め方](operations.md#検証の進め方) | 実差分・依存・配備対象から必要ゲートを選び、[証拠の有効性](operations.md#evidence-validity-and-retry)で今回実行・再利用・未充足を判定。データ移行と成果物／環境照合を区別し、理由を[既存記録](operations.md#検証結果と文書の記録先)へ残す |
| Plan or report the 2026 delivery | `docs/specification.md`, `docs/requirements/delivery-and-technology.md`, and `docs/roadmaps/2026-initial-delivery.md` | Record only verified progress; revise milestone scope, evidence, and risks together when the plan changes |
| バックアップ・復旧の作業／残件確認 | [操作手順](runbooks/backup-recovery.md)の現在の例外と該当手順、[検証／実行記録](design/evidence/recovery-implementation-2026-10-06.md)の対象版・実行分 | 設計変更時は[設計索引](design/README.md)から該当設計・仕様へ進む。過去の成功記録と現在の復元可能性を区別する |
| 共通CSV取込み・住所統合・外部キーの作業／受入確認 | [共通設計](design/property-bulk-import.md)、[検証／Dev実行記録](design/evidence/common-import-address-2026-10-07.md)の該当箇所 | 資料の再照合は[受領資料台帳](requirements/source-materials.md)の既存結果と資料の更新を確認。UH固有の検討は[入口](design/uh-integration-proposal-2026-10-06.md)から該当論点へ進む |
| Author or integrate a user-designed UI component | `docs/runbooks/custom-ui-component-collaboration.md` and the component file under `docs/design/ui-component-contracts/` | User authors JavaScript only under ignored `/.user-ui-workbench/`; coordinator reviews, adapts, integrates, and validates the tracked implementation |
| `容量チェック` / `タスク容量確認` / `セッション容量確認` / `session size / handoff threshold確認` | `docs/runbooks/project-coordination.md` | `scripts/check-codex-session-size.ps1`; use the current task ID and never infer the newest session |

## Document Authority

| Document | Authoritative content |
| --- | --- |
| `governance/common-governance.md` | Project-owned governance source; edit locally and regenerate AGENTS with the local renderer |
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

- [Prod初期構築・権限引渡し手順](runbooks/production-bootstrap-review.md): 10月23日までの準備・Aで組織なしの先行構築・後日HS引継ぎ・利用開始条件。オーナー交代は試験済み、請求先変更は未検証。WIFは都度の人の認証不要を条件に採用。実Prod構築は未実行。

- [確定仕様改修のDev受入手順](runbooks/local-acceptance-2026-10-03.md)：HS業務一巡、保険報告・取消、入力再試行、例外・未実装境界。
- [独立先行改修の検証記録](design/evidence/independent-implementation-2026-10-03.md)：対象ファイル、互換性、各ゲートの実測と残件。
