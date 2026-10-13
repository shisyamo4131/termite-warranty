# Design Index

Prodの[事前構築ロードマップ](../roadmaps/production-readiness.md)で、基盤先行作成と認証実証を初回アプリ配備から分離。最優先のLocal実装へ着手、実Cloudは未実施。

- [Prod対応棚卸し・配備準備計画](production-readiness-inventory-2026-10-13.md)：実ファイル別の不足・再利用・対象外、WIF／初回配備／復旧／検証手順と工数。10月23日構築・月末納品の条件を整理。調査のみ、実装・構築未着手。

2026-10-13現在：承認済みの全件読取り削減と保証延長申込日改修はDev反映・開発側受入れ済み。保険検索用2項目を442物件へ整備し、それ以外の業務値・番号は不変。以下の本件に関するDev禁止・指示待ち・未反映は各工程実施時点の記録であり、現在の状態はこの記載を優先する。HSの業務受入れとは区別する。月別対象全体取得の現状維持と工務店アカウント一覧の後発対応は変更なし。[検証・導入記録](../operations.md)。

- [満了案内・物件検索の旧取得経路整理](legacy-property-list-retirement.md)：R5残件の具体案。現行条件の限定、旧条件拒否、工務店保証案内の所属付き候補取得。先行改修はLocal受入れ済み。その他旧取得の追加整理もO1〜O3のLocal受入れまで完了。O4は明示指示待ち。Dev反映禁止。

- [保証グループ・本支店の読取り削減](master-code-read-reduction.md)：保証グループは完全一致検索・使用先記録なし・既存ID維持・末尾ハイフン保持。本支店／CSVは既存コード管理記録による対象取得を採用。[工程](../roadmaps/master-code-read-reduction.md)。Dev反映禁止。

- [全件読み込みの棚卸しと削減案](full-read-audit-2026-10-12.md)：共有store、現行画面、旧経路、移行・保全を分けた調査。HS通常満了案内は2026-10-13に欠落非救済・開始時条件を採用しLocal改修・技術検証済み。他の改善案は未採用・未実装。

- [既存保証延長の申込日補完](extension-application-migration.md)：確認済み日付だけの補完、請求検索再計算、一括確定と結果不明時の再確認。Dev更新は別途明示指示待ち。

- [保険満了案内の検索・補完](insurance-notice-queries.md)：現行業務を維持する独立検索項目、全更新経路、補完・復旧・差戻し。Local実装承認、Dev未反映。

- [ダッシュボード詳細設計](dashboard.md)：対応優先・共有Store、4指標の集計／状態遷移／導入。Q30で設計確定、実装・Local検証・Dev導入済み。ログイン後の操作確認・業務受入は残る。

- [保証書CSV・期間別発行管理](warranty-certificates.md)：月別抽出・仮6列・保存／導入契約。

- [Prod準備・Dev容量／検索／CSV実測（2026-10-08）](evidence/prod-readiness-2026-10-08.md)


- [共有参照Store・処理別計測](reference-store-metrics.md)：初期方式②と操作別ログ。

- [共通CSV一括取込み・物件住所統合](property-bulk-import.md)：14列の増分初回10年登録、外部キー必須グループ限定、任意の住所・資材名の空欄保存、単一住所への移行・差戻しの設計。
- [増分取込みとグループ入力条件の検証記録](evidence/increment-import-2026-10-08.md)：最終Local検証、独立レビュー、Dev配備照合と受入の残件。
- [共通取込み・住所統合の検証／Dev実行記録](evidence/common-import-address-2026-10-07.md)：適用版別の検証結果、配備・移行・再開の記録、オーナー受入手順と残件。

- [UH併載の検討資料・入口](uh-integration-proposal-2026-10-06.md)：UH新規一括取込み・全件本登録・通常編集・任意支店コードを確定。後続の共通CSVと任意項目の空欄保存は上記共通設計を優先し、資料修正は依頼中。6問フォーム原文は履歴として維持。
- [UHの所属・請求先・施工加盟店](uh-integration-organization.md)：工務店＝ユニバーサルホーム、加盟店＝支店とコード保持の要件、回答待ち条件、請求先・出力・ポータルとの区別。
- [UH一括取込みの設計・実装準備](uh-integration-import.md)：外部キー、新規専用全件確定、支店コード変更、通常編集、再送・復旧・取得効率、実装単位と未実施の検証。
- [UHの日付・帳票・確認順序](uh-integration-dates-and-outputs.md)：従前の申込月初日・上棟日＋92日の経緯と出力条件。現行CSVは担当者が用意した申込日・引渡日を取り込む。HS側での日付準備は10月8日のメールで了承済み。
- [UHの2026-10-06当初案・質問文](uh-integration-initial-proposal-2026-10-06.md)：履歴のみ。現在の推奨・仕様・送付文面として使わない。

- [(default)固定の全体復旧設計](default-database-recovery.md)：Cの完全同期と失敗回復、Read/Write見積、採用時点の実装境界とDev移行計画。後続の実行結果は下記の検証／実行記録を参照。

- [バックアップ・復旧の実装設計](backup-recovery-implementation.md)：管理状態と復元データの分離、外部コマンド、Auth別復旧の実装と検証範囲。
- [バックアップ・復旧操作手順](../runbooks/backup-recovery.md)：現在のDev例外、実行対象・承認境界、外部コマンド、失敗回復と通常再開の手順。
- [バックアップ・復旧の検証／実行記録](evidence/recovery-implementation-2026-10-06.md)：Local／Devの実測、適用版・実行時点ごとの成功／失敗、Auth等の未検証範囲。現在の運用状態は上記の操作手順を参照。

- [アカウント競合と取得効率改善](account-concurrency-read-efficiency-2026-10-05.md)：承認された改修と5分参照キャッシュ、Local／Dev検証・復旧境界。

- [現行実装の点検とバックアップ準備](evidence/current-implementation-audit-2026-10-05.md)：旧画面撤去、サブエージェントによる不具合・Read/Write調査、オフラインモックと未実装境界。

- [0.1.106 保険報告カード](evidence/ux-106-2026-10-05.md)：報告対象月・初回／延長保証と保険期間の表示、キャッシュ相談。

- [0.1.105 年月選択・物件一覧](evidence/ux-105-2026-10-05.md)：月のみで確定する選択、申込日順、保険期間と詳細リンクのDev検証。

- [0.1.104 Dev反映・入力準備の初期化](evidence/dev-reset-104-2026-10-05.md)：保証グループ・アカウントを保持した業務データ初期化、配備と検証結果。

- [保証区間と逆順取消0.1.101](evidence/lifecycle-101-2026-10-04.md)：採用済み状態遷移の実装・検証・Dev配備記録。

- [保証・保険・案内・請求の状態遷移レビュー](state-transition-review-2026-10-04.md)：サブエージェント3名との壁打ち、現行との差分と未採用の改善案。改修・配備なし。

- [案内取消表現0.1.100](evidence/ux-100-2026-10-04.md)：文言調整と案内済み延長取消の整合性確認。

- [案内状態・取消配置0.1.99](evidence/ux-099-2026-10-04.md)：現在の案内状態と対象満了日の明示、Dev検証。

- [UX-R追加改修0.1.98](evidence/ux-098-2026-10-04.md)：配色・閲覧カード・延長操作配置とDev検証。

- [UI/UX受入改修0.1.97](evidence/ux-097-2026-10-04.md): 入力・選択・確認・案内画面の変更、検証と配備状況。

- [A02-R入力検証・エラー表示](evidence/a02-r-input-validation-2026-10-04.md): rules検証と画面内エラー分離。Dev配備済み・ユーザー再確認待ち。

- [Dev受入A00〜A04の改修証跡](evidence/dev-acceptance-a00-a04-2026-10-04.md): 2026-10-04の指摘・変更・自動検証・Dev配備と再確認待ちの状態。

- Status: Active
- Authority: Design records describe implementation choices and assumptions; they do not override confirmed requirements in `docs/specification.md`.

- [Prototype Firestore data contract](prototype-firestore-data-contract.md): local-emulator contract for the first vertical slice. All schema choices remain provisional until representative legacy data and production constraints are assessed.
- [TR-001 master last-write-wins](tr-001-master-last-write-wins.md): approved implementation and acceptance contract for removing caller revision preconditions from the four trusted master mutations.
- [TR-002 deterministic Functions domain preparation](tr-002-functions-domain-preparation.md): approved implementation and acceptance contract for preparing and verifying the generated Functions copy of shared domain modules.
- [TR-003 verification and development-deploy gates](tr-003-verification-deploy-gates.md): implementation and acceptance contract for complete Callable/syntax coverage and fail-closed development deployment prerequisites.
- [TR-004 master form consolidation](tr-004-master-form-consolidation.md): implementation contract for typed shared form drafts, pure payload mapping, and explicit reusable field sections across three master entry points.
- [TR-005 bounded list subscriptions](tr-005-bounded-list-subscriptions.md): implementation contract for 20-document list windows, stable cursors, exact-reference master resolution, and a parent-case warranty projection.
- [TR-006 prototype-data responsibility split](tr-006-prototype-data-responsibility-split.md): implementation contract for separating case commands, master catalogs, list/detail queries, pure helpers, and UI orchestration.
- [TR-007 direct master writes](tr-007-direct-master-writes.md): implementation contract for replacing the four master CUD Callables with direct, Rules-governed Firestore writes.
- [TR-008 remove unused profile Callable](tr-008-remove-unused-profile-callable.md): implementation contract for removing the redundant self-profile endpoint while preserving live account-disable handling.
- [TR-009 Japan Post postal-data lookup](tr-009-japan-post-postal-data.md): pre-implementation design for Japan Post CSV transformation, same-origin Hosting shards, manifest metadata, freshness warnings, and manual-entry fallback.
- [Construction-company portal workflow](construction-company-portal-prototype.md): accepted shared-company-account, case-linked work-item, review/promotion, and queued-notification design.
- [UI component contracts](ui-component-contracts/README.md): one durable integration contract per user-authored JavaScript component.

- [2026-10-03 meeting prototype](meeting-prototype-2026-10-03.md): approved demonstration implementation contract.

- [入力通知・Autocomplete・重複判定廃止の検証](evidence/autocomplete-validation-2026-10-04.md): 2026-10-04の追加指示、ローカル実装、Dev未配備。

- [延長取消とDev機能受入](evidence/extension-undo-dev-2026-10-04.md)：0.1.96の実装・自動検証とDev実画面結果。

- [物件名・施主名の統合](property-name-unification.md)：現在名称の契約、限定移行・競合・差戻し。[Local・Dev実行記録](evidence/property-name-unification-2026-10-08.md)、[ユーザー受入とCSV7本](../../deliverables/dev-import-acceptance-2026-10-08/README.md)。
