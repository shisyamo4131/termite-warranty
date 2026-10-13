# A02-R 入力検証とエラー表示の改修（2026-10-04）

## 範囲と状態

オーナーは郵便番号空欄の登録成功と、8桁のエラーが一覧／編集ダイアログ双方に表示された問題を報告。仕様書0.1.92にrulesによる検証と画面別エラー表示の共通原則を追加した。通常経路のMeetingPrototype（物件・グループ・工務店・支店・工務店担当者・検索・アラート設定・確認ダイアログ）、共通住所欄、HS担当者管理、ログインに反映する。旧案件／旧マスタ等の通常経路外の画面全体の再設計は含めない。共有住所欄のrulesは旧画面でも適用されるが、旧画面の保存処理まで一括改修したとは扱わない。

必須、文字数、郵便番号、電話FAX、メール、接頭辞、日付、面積などのrulesを共有し、保存前にv-form.validate()を待つ。物件は下書き／本登録で必須検証を切り替える。サーバー検証・データ契約は維持。入力不正で通信しないこと、ダイアログ読込の分離に加えエラーの所属を非同期処理開始時に固定し、別の画面へ漏れないことを検証する。

後続の明示指示によりDev配備済み（下の実行記録）。現在のDevデータは変更しない。コードは既存未コミット改修を保全。ロールバックは今回のUI／rules差分だけを戻せばよく、データ移行不要。仕様判断・採番・保険期間等の変更なし。ADR・未決事項台帳・ガバナンス・配布PDF・進捗率は未変更。

## 変更ファイル

- app/components/MeetingPrototype.vue、MasterAddressFields.vue、StaffAccountManagement.vue、LoginPanel.vue
- src/domain/input-rules.mjs、input-rules.d.mts
- test/property-warranty.test.mjs
- docs/specification.md、docs/runbooks/local-acceptance-2026-10-03.md、docs/design/README.md、docs/roadmaps/technical-remediation.md、CHANGELOG.md、本記録

## 検証

UI／アプリロジック／文書の和集合で全7ゲートを実行し、最終状態で成功。手動UI受入はDev配備後。初回typecheckはテンプレート式のエスケープ不正で失敗し修正。最終状態の結果は後述する。


| コマンド | 最終結果 | 終了コード |
| --- | --- | --- |
| pwsh -NoProfile -File ./scripts/check-governance.ps1 | 成功 | 0 |
| npm test | 140件中138成功、既存環境依存2skip | 0 |
| npm run typecheck | 成功（初回エラー修正後） | 0 |
| npm run build | 成功 | 0 |
| npm run test:rules | 83件成功、失敗・skipなし、終了後Emulator停止 | 0 |
| node scripts/check-functions-syntax.mjs | 成功 | 0 |
| node --check scripts/seed-emulator.mjs | 成功 | 0 |

ログはtmp/a02-r-{governance,test,typecheck,build,rules,functions}.log。npm11.19.1を使用。省略ゲートなし。最終文書更新はgovernanceのみ再実行し、コード未変更のため他ゲートは有効。git diff --checkもexit 0。未コミットの既存差分を保持し、Git操作・配備・Devデータ操作は行っていない。

## 最終コードのSHA-256

| ファイル | SHA-256 |
| --- | --- |
| app/components/MeetingPrototype.vue | cd43c2a8832fd7cb367aa593c82127aab4da0dbfa883c168bb9288dba5460449 |
| app/components/MasterAddressFields.vue | 452df22296b010fad0bc2f3e43f639d9b123dfbc136916c2b33b96a392532c67 |
| app/components/StaffAccountManagement.vue | bf10b384a588114a9436a2b53448ac4138bbed9afe272cd0fabfd49ad9147670 |
| app/components/LoginPanel.vue | 6863210774092b20349a00305b8900bdd9dec571834c4407f8bc36394a072cbd |
| src/domain/input-rules.mjs | 91a1e33533b8be22271e7baa43be47c68188730df17ff2caf98dcb3d368f044a |
| src/domain/input-rules.d.mts | 76b5a65e386bcedad37847c633c2792cee0b27aa08ac9a57babb95cc46dd170f |
| test/property-warranty.test.mjs | af90faa658d28edfd28cd4679413bdb966d89f6296c764fc1481c5dba8f18f93 |


## A02-R修正版のDev配備

後続の「Dev反映して」によりHosting公開を承認。配備前に全7ゲートを再実行し各exit 0。ログはtmp/a02-release-{test,typecheck,build,rules,functions,governance}.log。改修時に記録した7ファイルのSHA-256は現在のソースと一致。サーバーpropertyPrototypeも前回配備時のハッシュと一致し、通信契約は変更なしのためHostingのみ更新する。

[作業ツリー・Hosting指紋](dev-release-a02-r-2026-10-04.json)は前回の証跡を上書きせず保存。ソース指紋はローカル作業ツリー全体の同定用で、今回はFunctionsを公開しない。初期化・データ訂正・アカウント操作・Prod配備・Git pushなし。配備後の確認結果は以下に追記する。


### 配備結果

- Hosting配備：exit 0、公開ファイル1,027件。ログtmp/a02-release-deploy.log。Firebase CLI15.29.0。
- `node tmp/verify-a02-release.mjs`：exit 0。公開HTML200、SHA-256は023a16dbf310bd6e6e62ae47480a1acfe96b57ceedd3892e2dd73a4f45b31e42。参照JS/CSS等36件一致、Firebase設定Dev、未認証Callable401。記録tmp/a02-release-public.json。
- `node tmp/fingerprint-a02-release.mjs --check`：exit 0。配備後もソース・Hosting指紋は不変。
- 再実行した通常テストは138成功・既存2skip、Emulator83成功。全7コマンド個別exit 0。最終文書更新後のgovernance-checkも確認対象。文書以外の変更はなく他ゲートは有効。
- この配備ターンはアプリ未変更。変更文書はdocs/specification.md、docs/runbooks/local-acceptance-2026-10-03.md、docs/operations.md、docs/design/README.md、docs/roadmaps/technical-remediation.md、CHANGELOG.md、本証跡と配備指紋JSON。既存未コミット差分を保持、commit/pushなし。ガバナンス・ADR・データ契約・未決事項・進捗率は変更なし。
- 未検証：ログイン後の実画面操作とユーザー受入。手順書ではA02-Rを再確認待ちとして維持。公開検証を受入完了に置き換えない。
