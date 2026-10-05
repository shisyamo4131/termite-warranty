# Dev受入A00〜A04 改修証跡（2026-10-04）

- 根拠：オーナーのA00〜A04報告。仕様書0.1.91、[改修契約](../meeting-prototype-2026-10-03.md)、[Dev再確認手順](../../runbooks/local-acceptance-2026-10-03.md)。
- 基準：primary作業ツリー、HEAD b45382f6ef92e9ab897cee59b1164766375aaa70に既存未コミット改修がある状態。既存変更を保持。改修完了時は未コミット・未配備。その後の承認によるDev配備は末尾に記録。Devデータ操作なし。
- 対象コード：app/components/MeetingPrototype.vue、app/components/MasterAddressFields.vue、src/domain/property-warranty.mjs、src/domain/property-warranty.d.mts、functions/property-warranty.js。
- 試験：test/property-warranty.test.mjs、test/emulator/property-warranty.test.mjs。接頭辞新旧互換・重複防止・住所往復・必須確認・採番なし失敗・ダイアログ候補の隔離・通信失敗復帰を確認する。
- 文書：docs/specification.md、docs/design/meeting-prototype-2026-10-03.md、docs/requirements/branches-and-addresses.md、docs/requirements/master-management.md、docs/runbooks/local-acceptance-2026-10-03.md、docs/roadmaps/technical-remediation.md、docs/design/README.md、docs/operations.md、CHANGELOG.md、本記録。
- ADR・未決事項台帳・ロードマップ進捗率・配布PDF・過去の配備指紋・Firestore Rules・ガバナンスは変更なし。新たな永続アーキテクチャ判断や未決の採用はない。共有住所部品の任意表示整理は旧画面にも反映するが、旧画面の保存仕様は変更しない。

## 検証

文書/UI/アプリロジック/データ契約の和集合として全7ゲートを選択。全7ゲート終了コード0。省略なし。手動の外観確認とDev受入は未実施。

| ゲート | コマンド | 結果 | 終了コード |
| --- | --- | --- | --- |
| governance-check | pwsh -NoProfile -File ./scripts/check-governance.ps1 | 成功（最終文書更新後も再実行） | 0 |
| domain-test | npm test | 137件中135成功、既存環境依存2件skip | 0 |
| app-typecheck | npm run typecheck | 成功 | 0 |
| app-build | npm run build | 成功 | 0 |
| firestore-rules-test | npm run test:rules | 83件成功、失敗・skipなし、終了後Emulator停止 | 0 |
| functions-syntax | node scripts/check-functions-syntax.mjs | 成功 | 0 |
| seed-syntax | node --check scripts/seed-emulator.mjs | 成功 | 0 |

npmはpackageManager指定の11.19.1を既存ローカルキャッシュから使用。コマンド終了コードは個別に確認。ログはtmp/a00-a04-{governance,test,typecheck,build,rules,functions}.log（seed構文チェックは標準出力なし）。文書の最終更新はアプリの各ゲートを無効化しないためgovernanceのみ再実行する。ブラウザの表示・Dev上の操作確認は未実施であり、ユーザー受入完了とはしない。

## 最終コード・試験のSHA-256

既存差分を含む作業ツリーの対象ファイルに証拠を紐付ける。配備成果物の指紋ではない。

| ファイル | SHA-256 |
| --- | --- |
| app/components/MeetingPrototype.vue | 03c15186f01cd2685cea574b60f9cdf6a71df553f1d2427b2f6c3d49faefb6ac |
| app/components/MasterAddressFields.vue | 57e7812c2ef474b9220e897b963f632e642893088e58dcf0ddfd5d9ed4fcb9d5 |
| src/domain/property-warranty.mjs | 539a9340a262cd3af812808da056f54c2e5afbd75ab90db91e3ad6ef509a1126 |
| src/domain/property-warranty.d.mts | d778eaf2125ace9dcc3deff3dd48cbfb8c2b9a563315e01ee960393285b18543 |
| functions/property-warranty.js | a993e1764e39bc14b7e82180e45fc8d085e5c795d846a0775ec05dd27707b219 |
| test/property-warranty.test.mjs | a04311068bf877968127c86c9307ac0a474f16520033946ea2d1614cd588d2f0 |
| test/emulator/property-warranty.test.mjs | ba99d0c680256cadcb0d1c1261dceb030ac82960afd78df5239c7b94b13b64f3 |


## 2026-10-04 Dev配備の実行記録

追加指示「Devへの反映実施」「手順書に検証結果を追記」を受領。FunctionsとHostingのみを同じ検証済み作業ツリーから配備する。Firestore Rules/索引・実データ・Authアカウント・マスタ・採番の更新／初期化は行わない。Prod・Git pushなし。

配備前に全7ゲートを再実行し成功（通常135成功・2skip、Emulator83成功、各exit 0）。ログはtmp/deploy-1004-{test,typecheck,build,rules,functions,governance}.log。seed構文チェックもexit 0。Emulatorは試験終了後停止。直前の改修証跡7ファイルのハッシュ一致を確認。配備対象の[ソース・Hosting指紋](dev-release-2026-10-04.json)は以前の配備記録を上書きせず別ファイルに保存した。

手順書は34項目すべてに結果列を追加。A00/A02/A03/A04の報告範囲だけを記録し、A01とA05以降の未報告を未実施と断定しない。修正4項目の再確認は別表。配備は以下のとおり完了。


### 配備・照合結果

- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only functions,hosting --non-interactive`：exit 0。Functions15件更新、Hosting1,024ファイル公開。検証時と同じnpm11.19.1。Firebase CLI15.29.0。ログtmp/deploy-1004-release.log。
- `node tmp/verify-dev-release-2026-10-04.mjs`：exit 0。公開HTML200、SHA-256は7b27abeb9b1c512755a4fee96e6db1d4dad0d521c8ee89fcef2ef2df2b52cf3a。参照アセット33件一致、Firebaseプロジェクト一致、未認証Callable401。記録tmp/deploy-1004-public-verification.json。
- `node tmp/fingerprint-dev-release-2026-10-04.mjs --check`：exit 0。配備後もソース118ファイル・Hosting1,024ファイルの指紋は準備時と一致。
- この配備ターンの変更ファイル：docs/runbooks/local-acceptance-2026-10-03.md、docs/operations.md、docs/specification.md（状態のみ）、docs/design/meeting-prototype-2026-10-03.md（状態のみ）、docs/design/README.md、CHANGELOG.md、本証跡、dev-release-2026-10-04.json。アプリコード・ガバナンス・未決事項・ADR・進捗率は変更なし。既存未コミット差分を保持し、commit/pushなし。
- 制約：公開ファイル・認証境界の確認まで。ログイン後の画面外観・操作・業務受入はユーザーの再確認待ち。次はA00-R/A02-R/A03-R/A04-Rの修正確認、通常の続きはA05。A01結果は未報告。
