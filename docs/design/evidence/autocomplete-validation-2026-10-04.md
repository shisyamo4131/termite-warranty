# 入力通知・工務店Autocomplete・同名同住所判定廃止

2026-10-04。本Codex会話のオーナー明示指示。仕様書0.1.93、ローカルのみ・Dev未配備。既存データ・アカウント・採番を変更しない。

## 変更と互換性

- 入力エラー：通常導線の物件、マスタ、工務店担当者、HS担当者、ログイン等でrules検証後の失敗を共通Snackbarの上部表示で通知。入力欄のエラーは維持。8秒／閉じる操作、再操作で再表示。従来の成功通知は下部表示を維持。
- 工務店Autocomplete：物件・工務店担当者登録で別の検索欄を廃止。2文字以上、300ms、IME変換中抑止、古い検索応答破棄、エラー時再試行、選択後は解除して変更。空検索の最新20件・既存の名前検索方式を維持。背後の一覧を変更しない。
- 参照：`C:/Users/seven/projects/AirGuard/air-guard-v3/apps/web/app/components/MasterAutocomplete.vue`、CustomerAutocomplete.vue、SiteAutocomplete.vue。参照先は変更していない。候補取得件数や検索方式はこのプロジェクトの既定を優先。
- 同名同住所判定をサーバーから削除。保証番号一意性、二重操作防止、日付注意確認は維持。保存形式変更なし。復旧時は該当UIとサーバーの変更を対で戻す。既存の無関係な作業差分を巻き戻さない。

## 対象ファイル

`app/components/CompanyAutocomplete.vue`（新規）、MeetingPrototype.vue、LoginPanel.vue、StaffAccountManagement.vue、AppSnackbar.vue、`app/composables/useAppSnackbar.ts`、`functions/property-warranty.js`。試験：`test/property-warranty.test.mjs`、`test/master-data.test.mjs`、`test/emulator/property-warranty.test.mjs`。

文書：仕様書、case-warranties、search-and-list、HSC-003と対応索引行、試作契約、運用、変更履歴、Dev受入手順、本記録と設計索引。ADR・データ契約・スキーマ・governance設定は変更しない（永続構造・運用権限の変更なし）。ロードマップの進捗加算なし。既存の多数の未コミット差分を維持し、この作業でGitコミット・配備はしない。

## 検証

UI＋アプリロジック＋文書として7ゲートを選定、省略なし。実行結果は以下に追記。途中の型エラーと既存Snackbar位置を固定した試験は修正後に再検証する。ブラウザの手動操作は未検証。ユーザーのDev受入は[手順書](../../runbooks/local-acceptance-2026-10-03.md)に記録し、自動試験と区別する。


最終対象ソース・試験の上記順連結SHA-256：`e39cce8e5cee9351bdcfcdba7f4bebd2d42a7c55dbe0388d10fd4532f9d39398`。既存差分を含むローカル作業ツリーで実施。

| コマンド | 実測結果 | 終了コード |
| --- | --- | --- |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | 文書・規約チェック成功 | 0 |
| `npm test` | 143件中141成功、既存Windows symlink試験2件skip、失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | Emulator試験83成功、終了後Emulator停止 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |

実行ログはローカル `tmp/autocomplete-*.log`。Emulator用の隔離設定を使用。Functions構文ゲートはEmulator終了後に実行。ブラウザ操作／Dev配備／HS受入は未実施。改修済みUIの受入は手順書の「追加修正の受入」から、通常業務はA05から再開できる。


## 2026-10-04 A05〜A10追補（仕様書0.1.94・Dev未配備）

オーナーの同日受入結果を記録。A05〜A10は業務処理OK、A05（年月以外削除）・A09（完了通知）・A10（保証満了表示）に追加改修指示。

- `app/components/MeetingPrototype.vue`：報告一覧は年月のみ表示・送信。非表示の条件が残っていても送信しない。物件保存、マスタ、設定、アカウント発行、メール再送、報告処理の完了は共通Snackbarへ統一。既存のStaffAccountManagement・LoginPanel・旧マスタ／ポータルの一時通知もSnackbarであることをコード確認。パスワード設定完了ページのログイン案内は一時通知ではないため画面内に維持。
- 保険満了日が保証満了日以降なら次回更新年月欄を「保証満了」と表示。延長後は再評価する。内部日付・採番・保険報告ロジックの変更なし。スキーマ・既存データ移行なし。
- `test/property-warranty.test.mjs`：年月だけの要求、同日／超過／保証延長後の表示、保存後にダイアログを保持したSnackbar通知を実コードで検証。
- 文書：仕様書、保険報告要件、受入手順、運用、変更履歴、本記録。ADR・データ契約・権限・governance・ロードマップ進捗は変更しない。既存差分は保持、Git操作・配備なし。

復旧は当該UI差分を戻すだけでデータ復元不要。A05-R／A09-R／A10-Rの実画面受入は配備後。次の通常業務はA11。


追補の上記2ソース順連結SHA-256：`f86e65651a0e69baefdee270b87e7477620783ca344abca3ee5b6e147947ae79`。UI・ロジック・文書として7ゲート選定、省略なし。

| コマンド | 最終結果 | exit |
| --- | --- | --- |
| `npm test` | 145件中143成功、既存Windows symlink2件skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 83成功、Emulator停止済み | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | 成功 | 0 |

ログ：`tmp/a05-a10-*.log`。実画面の見た目・Dev配備は未検証／未実施。


## 2026-10-04 A11〜A16追補（仕様書0.1.95・Dev未配備）

- ユーザー確認：A11・A12・A16 OK。A13は上限30年保存・追加延長OKだが、30年保証を上限20年で保存できたとの報告。A14は詳細手順依頼。A15は履歴の別ダイアログ化と日付ラベルを指示（所有者履歴の値自体の合否は未報告）。
- 調査事実：ローカル `functions/property-warranty.js` には `old.years > fields.maxYears` の保存拒否が既存。元のEmulator試験にも拒否試験あり。今回エラー理由・拒否後のyears/maxYears/revision不変まで強化。Devで保存できた原因、当時の保存値／稼働コードは未照合。原因解決済みとはしない。
- 変更：`app/components/MeetingPrototype.vue` で保存済み保証期間未満の上限候補を無効にし、rulesでも拒否。履歴はボタンから開く別ダイアログ。操作日時と変更前の申込日・引渡日・保証開始／満了日・所有者情報を明示。保存形式変更なし。
- 試験：`test/property-warranty.test.mjs` と `test/emulator/property-warranty.test.mjs`。文書：仕様書、case-warranties、受入手順、変更履歴、運用、本記録。ADR・データ契約・governance・ロードマップ進捗変更なし。
- A14：専用3物件、新規と延長2回、月別の行数、選択CSVの具体手順を追記。実データは作成・変更していない。A16の取消済み物件の復元も不要。
- 復旧は今回のUI差分だけ戻す。データ移行なし。既存未コミット差分を保持。ブラウザ操作・Dev配備・データ修復は未実施。A13とA15は配備後に再確認する。


当該3ソース（上記順）の連結SHA-256：`e029d0f13aea5178881bf6783dcaaf22d05bfb4bf61e81c45585c50f2690ac4c`。UI・ロジック・文書の7ゲート、省略なし。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 146件中144成功、既存Windows symlink2件skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 83成功、Emulator終了済み | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | 成功 | 0 |

ログ `tmp/a11-a16-*.log`。A13のDev原因・既存保存値の整合性は未確認のまま残る。


## 2026-10-04 Dev配備（0.1.95）

明示依頼「Devに反映」で実施。過去節の未配備は当時の状態。実装追加なし、前節までの変更をまとめて配備。一次作業ディレクトリの既存未コミット差分を保持し、Git操作なし。ソース123ファイルとHosting1027ファイルの[指紋](dev-release-095-2026-10-04.json)を配備前に保存、配備後一致確認exit 0。Devの物件・マスタ・アカウント・採番には書込みなし。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 146件中144成功、既存Windows symlink2件skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 83成功、Emulator停止済み | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | 成功 | 0 |
| `node tmp/fingerprint-095-release.mjs --check` | 配備前後ソース・成果物不変 | 0 |
| `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only functions:propertyPrototype,hosting --non-interactive` | Functions更新・Hosting公開成功 | 0 |
| `node tmp/verify-095-release.mjs` | 公開HTML200・参照アセット一致、接続先Dev、未認証Callable401 | 0 |

配備ゲートは包括7項目、省略なし。初回配備コマンドはsandboxのFirebaseログイン設定読取EPERMでexit 1、初回公開照合も通信EACCESでexit 1。いずれも権限昇格で同じ限定操作を再実行し成功。認証情報を表示・コピーしていない。ログ `tmp/release-095-*`。A13の当初原因は未確定で、配備後の上限変更制限と実画面はユーザー確認待ち。ロールバックは必要時に承認済みの前版ソースからFunctions／Hostingを復元する。データ復元を伴わない。
