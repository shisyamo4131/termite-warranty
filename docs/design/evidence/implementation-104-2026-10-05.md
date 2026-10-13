# 0.1.104 請求開始月・過去物件の初回保険 — 2026-10-05

状態：実装・機能検証済み。後続の承認により2026-10-05にDev反映・指定業務データ初期化済み。[配備記録](dev-reset-104-2026-10-05.md)。Googleフォームは同日の別作業で作成・公開・質問追加済み。現在の状態は[運用記録](../../operations.md)を参照。以下のローカル検証・Git未操作は実装時点の記録。

## 承認・変更

オーナーが①②の作業開始を指示。追加回答で、保証終了月の報告は翌月に操作しても対象とし、対象外にしたい物件はHSがチェックを外す運用を採用。
延長請求は延長開始月へ変更、新規は申込月。CSV第2列は請求対象基準日。
初回保険候補は報告対象月末（当月保証終了の場合は満了日）を含む5年期間。終了翌月は対象外。報告時だけ期間を保存、未選択を変更せず、初回で飛ばす期間の報告履歴は作らない。報告取消で直前4項目を復元。通常更新、採番、全体取消、未請求フィルター、アラートの条件は変更なし。

## 検証

最終アプリ・テスト変更後の各コマンドを個別実行。終了コードはそれぞれ直接確認。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| npm test | 152件中150成功・既存Windows関連2スキップ | 0 |
| npm run typecheck | 成功 | 0 |
| npm run build | 成功 | 0 |
| npm run test:rules | 88件成功、Emulator終了済み | 0 |
| node scripts/check-functions-syntax.mjs | 全Functions構文成功 | 0 |
| node --check scripts/seed-emulator.mjs | 成功、seed変更なしで実行結果を再利用 | 0 |

governance-checkは文書最終更新後に実行し、このタスクの完了報告で結果を記録する。ログ：tmp/ux104-test.log、tmp/ux104-typecheck.log、tmp/ux104-build.log、tmp/ux104-rules.log、tmp/ux104-functions-syntax.log。対象月・5年境界・うるう日・終了月・翌月・未選択保持・古いtarget拒否・再送・報告取消・請求取消を検証。

## 変更ファイルと状態

以下6ファイルの変更に加え、docs/specification.md、docs/requirements/search-and-list.md、docs/requirements/insurance-reporting.md、docs/design/meeting-prototype-2026-10-03.md、docs/roadmaps/technical-remediation.md、docs/operations.md、CHANGELOG.md、docs/requirements/house-solution-confirmations/HSC-010-payer-contracting-party.md、docs/requirements/house-solution-confirmations/HSC-036-insurance-reporting-cycle.md、台帳の対応2行、および本記録を更新。台帳は1事項ずつ直列更新。既存の他事項は維持。
既存の大量の変更・未追跡ファイルを保持。Git commit/pushなし。Functions用共有ドメインは既存prepare処理で生成。依存・Rules・権限・governance変更なし。
既存の期間ID・履歴契約を維持するため新ADRなし、データ形状の変更なし。保存する期間の意味は試作契約を更新。ロードマップは残作業を記録し全体進捗は加点しない。

| アプリ・試験ファイル | SHA-256 |
| --- | --- |
| src/domain/property-warranty.mjs | e5e8dffb480f24366778834c693a15bcb3558662acd9f2de1ba068e87d4e71f0 |
| src/domain/property-warranty.d.mts | d4bbc29407387f47b60d47308d67f4f1889967898b1cb6fe193998d29ee727cb |
| functions/property-warranty.js | 961a317ab376d8211cb8d2e1376e950d05ce1d7febd58c69bcccdf4a0b71e53c |
| app/components/MeetingPrototype.vue | 2dad2b07d979e25345d746f26cdecd2893bf1553a9071f0688bd000cedd90e13 |
| test/property-warranty.test.mjs | 93acb502efda3c017363968d198e2a1a611affb1899f018e59e80ab0542337bc |
| test/emulator/property-warranty.test.mjs | fcfbfe6aff8c91e576eaa85fe35b719735487e4fc2f43b9ab7903efe3c601a6b |

## 未実施・次の作業

Dev反映は後続の[配備記録](dev-reset-104-2026-10-05.md)で完了。今回差分のログイン後の実画面受入、実データ取込・本番アカウント設定・Prod操作は未実施。新しい期間の報告履歴を旧規則で書換えないこと。必要時は履歴を保持した互換修正とする。HS向けフォームは承認・公開済みだが回答事項は未確定。
