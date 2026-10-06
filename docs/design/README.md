# Design Index

- [バックアップ・復旧の実装設計](backup-recovery-implementation.md)：採用済み運用の実装開始、管理状態と復元データの分離、外部コマンド、Local検証と未実施の実設定／Dev予行。
- [バックアップ・復旧操作手順](../runbooks/backup-recovery.md)：導入設定、外部コマンド、限定補正、途中失敗の再開、通常Devの停止予行と未実装のAuth取込。
- [バックアップ・復旧のLocal検証](evidence/recovery-implementation-2026-10-06.md)：最終ゲート、独立レビュー、画面確認、未コミット差分と実運用前の残作業。

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
