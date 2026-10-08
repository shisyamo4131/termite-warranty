# 増分一括取込み・保証グループ入力条件の改修

## BRANCH-05・DISABLED-01 Local改修

2026-10-08、開始HEAD dd80a12721d9c0e627d29434acc3bb61a8f21149、前作業の未ステージ26ファイル差分を保全。ユーザーの番号5採用により本支店用語・コード桁数チェック撤廃を実装し、後続の「無効のまま編集可能はバグ」という指示で3マスタ／無効スタッフプロフィールの編集禁止を追加した。共有Storeは全件購読・標準Autocomplete filter・購読外5分TTLを採用済み、詳細設計までで実装はしていない。

通常保存は最新無効状態を拒否し、再有効化は状態だけを更新する専用操作へ分離。本支店コード重複検査は同じtransaction、スタッフprofileはAuth操作・ロック作成前に拒否する。旧unused master composableは現行画面からの呼出なし・旧Callable廃止済みで今回変更しない。保証の取消／復元、無効親を参照する既存保証の処理は維持する。

CSVの新見出しだけ本支店コードへ変更し、旧見出し・元CSV再送・保存済みsourceValuesのキーを保全。コード文字数上限なし、制御文字拒否とCSV全体制限は維持。コードの完全比較に会社範囲の取得を使い、会社内の本支店件数によってReadが増え得る。実データ移行・Dev配備／初期化・Cloud操作なし。

分類はUI・logic・data contract・docsに、採用された参照Store購読例外のproject-rules変更を加えた和集合。全7ゲートを選択、省略なし。最終コード固定後の独立レビューと各コマンドの結果は確定後に記録する。通常本支店必須／コード条件必須・Store実装は後続。既存HSC台帳・納品進捗は今回未変更。

最終結果：コード固定後の全7ゲート成功、独立再レビュー指摘なし。BRANCH-05とDISABLED-01のLocal実装・検証を完了。既存差分を含めtracked34変更＋新規2ファイル、未ステージ・未コミット、pushなし。最終文書追記後のgovernanceとdiff確認はタスク終了報告でも結果を確定する。

今回の製品／試験差分：app/components/MeetingPrototype.vue、PropertyBulkImportDialog.vue、WarrantyOrganizationManagement.vue、StaffAccountManagement.vue；functions/property-warranty.js、property-bulk-import.js、account-mutation.js；src/domain/property-bulk-import.mjs、新規branch-code.mjs／branch-code.d.mts；test/property-bulk-import.test.mjs、catalog-efficiency.test.mjs、account-mutation.test.mjs、emulator/property-warranty.test.mjs、emulator/isolated-property-import.test.mjs、emulator/staff-account-management.test.mjs。functions/domainは正規prepareで33 entriesを生成、直接編集なし。

文書はspecification、master-management、branches-and-addresses、meeting-prototype、property-bulk-import、operations、technical-remediation、user-explanation-items、CHANGELOG、本記録、配布CSVのREADMEとgovernance/project-rulesを更新。新規文書なしで既存索引から到達可能。ADRの直列化方式、Rules／物理schema／依存／配備設定は変更せず、managed AGENTSは不変。旧配布CSV／ZIPは旧見出し互換の履歴資料として保全。

独立レビューはUIとサーバーを分離。サーバーでreenableMasterが正規runtimeGeneration／runtimeProtocolを拒否するP1を検出し、許可項目を修正。Web SDK→実Callableで3種再有効化・編集混入拒否・旧世代拒否・内容保全を追加した。再レビューは追加指摘なし。最初の結合試験は実行中にこの修正を行ったため最終証拠には再利用せず、固定後に再実行する。

| コマンド | 最終結果 | exit |
| --- | --- | --- |
| npm test | 317成功、失敗0、既存symlink権限制限2skip | 0 |
| npm run typecheck | 型検査成功 | 0 |
| npm run build | SPA9経路生成成功、既存Nitro警告あり | 0 |
| npm run test:rules | 最終コード固定後132成功、失敗／skipなし、専用エミュレータ停止確認 | 0 |
| ./scripts/check-governance.ps1 | 管理成果物・購読例外・検証方針の整合成功 | 0 |
| node scripts/check-functions-syntax.mjs | 通信情報修正後のFunctions構文成功 | 0 |
| node --check scripts/seed-emulator.mjs | seed構文成功 | 0 |
| node tmp/disabled-ui/verify.mjs | 実コンポーネント／抽出ダイアログの6チェック成功、browser errors 0 | 0 |

上表のbuild／型／seed後の変更はサーバーの通信項目検査・対象試験・文書だけで、各証拠の失効条件に非該当。Local実装の差分と全ゲートの結果を報告し、Dev適用と実データ検証を完了とは扱わない。

ブラウザ補足：実WarrantyOrganizationManagement.vueで無効3種の編集なし・表示と有効化イベントを確認。実MeetingPrototypeのdialogテンプレートを機械抽出し実MasterAddressFieldsと組み合わせ、無効group8／company11／branch11入力がすべてdisabled、保存なし、新規無効／有効既存では編集と保存ありを検証。状態と保存関数は架空fixtureで、全画面openSettingからAPI保存までの一巡試験ではない。初回sandboxのEdge起動はexit1、同じLocal専用scriptを制限外で実行しexit0。127.0.0.1以外のpage要求は遮断、専用EdgeとViteを終了。setup.mjsもexit0。ignored tmp/disabled-uiに結果を保持し、製品差分は追加していない。

最終ログはignored branch-05-final.local.log、branch-05-build.local.log、branch-05-rules-final.local.log。初回の結合結果（132成功exit0）は途中修正のため参考値に留め、最終固定版の132成功exit0だけを完了証拠に使う。

## BRANCH-03 Local改修

2026-10-08、開始HEAD dd80a12721d9c0e627d29434acc3bb61a8f21149。オーナーの番号1〜3の指示で、CSV有効コード照合、無効化／再有効化と重複防止、会社所属グループ固定を改修。番号4はN-Gram候補と共有キャッシュ／listenerの検討、番号5は既存の名称／200文字制限の説明。Dev配備・実データ変更なし。既存13ファイル差分を保全した。

今回の製品・試験対象はapp/components/MeetingPrototype.vue、functions/property-warranty.js、functions/property-bulk-import.js、scripts/lib/recovery-controller.mjs、test/default-recovery.test.mjs、test/property-bulk-import.test.mjs、test/catalog-efficiency.test.mjs、test/emulator/property-warranty.test.mjs、test/emulator/isolated-property-import.test.mjs。文書は仕様、branches-and-addresses、master-management、meeting-prototype、共通取込設計、ADR0034と索引、operations、technical-remediation、user-explanation-items、CHANGELOG、本記録へ反映。物理フィールド／Rules／依存／設定／ガバナンスは不変。未決台帳・納品全体の進捗・HS説明資料全体は今回変更対象外。

分類はUI・application logic・data contract・documentationの和集合。全7ゲートを選定、除外なし。独立レビューで旧CSV単体fixtureの予約不足を発見し修正、catalog試験も新規会社のID衝突を修正。再レビューは指摘なし。初回npm testはexit1。fixture修正後もsandboxのTEMP rename EPERMで7失敗・3skipだったが、同じLocal試験を制限外で再実行して312成功・失敗0・既存symlink権限制限2skip、exit0。sandbox内Rules起動はLocalポート待機のtimeoutでexit1となり、専用Localエミュレータで再試行した。実データの予約整合は未実施で、将来適用前に必要。通常物件本支店必須・コード条件必須・名称／桁数変更・Autocomplete実装は後続作業。

| コマンド | 結果 | exit |
| --- | --- | --- |
| npm test | 312成功、失敗0、既存2skip | 0 |
| npm run typecheck | 型検査成功 | 0 |
| npm run build | SPA9経路生成成功。Nitro既存構成の警告あり | 0 |
| npm run test:rules | 132成功、失敗／skipなし。専用エミュレータ停止確認 | 0 |
| ./scripts/check-governance.ps1 | 管理成果物・検証方針の整合成功 | 0 |
| node scripts/check-functions-syntax.mjs | Functions構文成功 | 0 |
| node --check scripts/seed-emulator.mjs | seed構文成功 | 0 |

製品コード確定後の追加変更はunit fixtureと文書だけで、型／build／Functions／seedの証拠を失効させない。全7ゲートexit0を確認し、番号1〜3のLocal実装・検証を完了。Rulesはshared130件＋isolated-import2件で、同時再有効化・無効同コード複数・CSVプレビュー後の対応先変更も含む。検証ログはignoredのbranch-03-final.local.log。未ステージの共有26ファイル差分を保全、コミット／pushなし。最終文書追記後のgovernance／diff確認はタスク終了報告で確定する。

## PM-08 Local表示修正と検討

2026-10-08、開始HEADをdd80a12721d9c0e627d29434acc3bb61a8f21149、主リポジトリの変更なしを実測。引継ぎの指示範囲でPropertyBulkImportDialog.vueだけ製品変更した。テンプレート下の説明4段落を削除し、通常／再送のファイル入力をprepend-icon=""・append-inner-icon="$file"へ変更。不要になったUH説明用computedを削除。保存・再送制御・検証表・エラー理由・共通アラート設定は不変。Dev配備・push・データ変更・バックアップ操作なし。

文書は仕様、共通設計、支店要件、HS説明事項、HSC-015／HSC-036と索引の該当2行、Clear Skyの未採用カード案、technical-remediation、operations、CHANGELOGと本記録を更新。台帳は編集前に変更なしを確認し、履歴・IDを保全。HS支店指定の説明文案は作成済み・未提供で、資料全体の完成とはしない。カード11宣言の対象候補とサンプルは確認待ち。通常物件／支店マスタ必須化はBRANCH-01の静的読取調査とコーディネータ確認に基づく提案で、業務実装なし。

分類はui-css-layout＋documentation-only。選定完了ゲートはgovernance-check・app-typecheck・app-build。domain／Rules／Functions・seed構文はロジック、永続化、データ契約、依存、権限、配備を変更していないため選択外であり、過去の全7ゲートを今回のUI検証の代わりには使わない。既存UI回帰8件と架空Local描画を補足実施した。型・build後の追加は文書／製品非依存のサンプルだけで、両ゲートを失効させない。最終governanceとdiffチェックの独立終了結果は本タスク最終報告に記す。

| 実行コマンド | 確認結果 | exit |
| --- | --- | --- |
| npm run typecheck | 型検査成功 | 0 |
| npm run build | SPA・9経路生成成功。既存構成に関するNitro import等の警告あり | 0 |
| node --test test/property-bulk-import-ui.test.mjs | 8成功、失敗・skipなし。未確認結果の保全と再送を含む | 0 |
| node tmp/pm08-ui/verify.mjs | 実コンポーネント＋架空props、幅1280／390。アイコンが欄内、クリックで選択開始、ファイル選択・クリア、再送用選択、エラー／結果の2表、横はみ出しなし。ブラウザ例外0 | 0 |
| node tmp/pm08-ui/preview-visual.mjs | カード案の736／320幅、3カード、横はみ出しなし。736幅の画像を目視確認 | 0 |

Local描画はインストール済みEdgeを専用一時プロファイルで使用し、127.0.0.1以外へのページ通信を遮断。CompanyAutocompleteだけfixtureへ置換し、認証・実DB・Cloudに接続していない。既存Local／Emulatorの停止・初期化なし。検証終了時に専用ブラウザとサーバーを終了した。実業務一巡・HS受入の代替ではない。検証用コードと画像はignored tmp/pm08-ui、サンプルはタスク専用visualizations内に保存。

初回はPlaywright既定ブラウザが見つからずexit1、既存Edgeのsandbox内起動もexit1。制約外でのLocal実行では提案カードのelevation=0が「none」ではなく寸法0のshadow値だったため検証停止exit1。製品CSSは変更せず、検証用提案をflat＋対象限定のshadow:noneへ整えて最終exit0。border=true単独は現行共通CSSの影0 3px 12px・枠#DDE7F0が残り、提案はshadow:none・枠#C7CBD1になることを測定した。

互換性：データ／API変更なし、移行不要。差戻しは上記コンポーネントの表示差分のみ。データ契約・ADR・ガバナンス／構成・バックアップ運用・納品全体の進捗は変更対象外。実資料取込み・追加受入・300件Dev試験・HS説明資料全体は未完了。新しいDev反映、支店必須化、カード外観の製品適用はオーナー指示を待つ。

## 対象と承認

2026-10-08のオーナーが14列のテンプレート、増分の初回10年登録、保証グループの最長期間、必須マーク、外部キー必須グループだけの取込みを採用し、文書整理・実装・Dev反映を指示。同日追加訂正で任意の住所・資材名は空欄のまま保存し、「不明」の補完を撤回した。既存の「不明」は書き換えない。HS原資料の取込み、健康なDevの停止、Auth／IAM／Rules／索引／バックアップ設定変更は範囲外。

実装版：a9e90e497a4375de84fae667fc05c59615c4a491。先行版：6b2573d26862f90d9183bdb780659b5cca20199c。runtime対象はclean、既存の別作業の文書差分は保全。新規取込の旧17列・旧UH日付補完は拒否して再取得を案内し、成功済み旧操作のstatus／一致再確認は保持する。

## 変更ファイルと文書

実装・テスト・受入資料27ファイルを上記版へ統合。

- app/components/MeetingPrototype.vue、PropertyBulkImportDialog.vue。
- src/domain/property-bulk-import.mjs／d.mts、property-warranty.mjs／d.mts、新property-field-requirements.mjs／d.mts。
- functions/property-bulk-import.js、property-warranty.js。functions/domainは生成同期し、直接編集しない。
- test/property-bulk-import.test.mjs、property-bulk-import-ui.test.mjs、property-warranty.test.mjs、emulator/property-warranty.test.mjs。
- deliverables/dev-import-acceptance-2026-10-08のCSV10本、README、verification.json、ZIP。

仕様0.1.128、case-warranties、master-management、initial-data-model、meeting-prototype物理契約、共通取込設計、operations、technical-remediation／initial-delivery、CHANGELOGを更新。既存索引から共通設計・受入手順へ到達でき、新証拠は共通設計とoperationsからリンクする。アーキテクチャ／ADR・復旧／配備の承認境界・ガバナンスは変更なし。未決事項台帳は既存別作業差分があるため更新禁止規則に従い触らず、確定仕様は上記正本へ反映する。

## Local検証

分類はUI／application logic／data contract／documentation／deploy。verification-policy.jsonの和集合で全7ゲート、除外なし。

| コマンド | 結果 | exit |
| --- | --- | --- |
| ./scripts/check-governance.ps1 | 配備前の整合確認済み。配備後文書の再確認は下記追記を参照 | 0 |
| npm test | 292件、290成功・既存2skip、失敗0 | 0 |
| npm run typecheck | 型検査成功 | 0 |
| npm run build | SPA生成成功 | 0 |
| npm run test:rules | 最終ソース固定後131件成功、失敗0・skip0 | 0 |
| node scripts/check-functions-syntax.mjs | 全Functions構文と生成domain照合成功 | 0 |
| node --check scripts/seed-emulator.mjs | 構文成功 | 0 |
| 同梱Nodeでtmp/name-csv-authoring/create.mjs | 架空CSV10本・14列・文字列往復・期待件数／拒否理由一致、Cloud投入なし | 0 |
| npm run build:recovery-release -- --revision a9e90e497a4375de84fae667fc05c59615c4a491 | clean runtimeから決定的成果物を作成しfresh build照合 | 0 |

初回sandboxでは一時ディレクトリ置換のEPERMとLocalポート起動拒否が発生し、Local検証だけ権限を調整して再実行。旧仕様のvolume fixtureで1件失敗した回は未採用。更新後131件成功の回も、実行途中の「不明」撤回による変更で最終証拠には再利用せず、ソース固定後に全検証を再実行し、exit0を確認した。

独立レビューで旧UHの安全棄却後にformat=uhが残り、新CSVへ移れないP2を発見し修正。実Vueの旧要求→棄却→入力見直し→同じグループで共通CSV再プレビューの回帰試験を追加。追加訂正後の再レビューは指摘なし、関連30件の独立実行exit0。通常保存・取込条件・全件棄却・一意予約・採番・設定不変・旧記録保全も確認。

## Devと残件

配備前読取でtermite-warranty-devの(default)／recovery-control、normal世代10・ロックなし・既存物件16件を確認。HSC／SHSは外部キー任意・住所／資材名必須、UHは外部キー必須・住所／資材名任意。旧未保存フラグを互換読取するため既存データ移行なし。前Hosting版はsites/termite-warranty-dev/versions/e71043ed17793dd4。バックアップ自動取得false全19、Scheduler PAUSED、PITR停止、予定0・バックアップ0。

Dev19 Functions／Hostingを反映し、正式照合全10項目pass。新Hostingはsites/termite-warranty-dev/versions/88db7150d630b648。Functions原本19archive、配信993ファイル（アプリ991＋provider初期化2）、Rules双方・必要索引11／除外30を照合。normal世代10・操作0・ロックなし。inspectのready=falseは実変更の入場判定であり、10件の技術チェックは全pass。今回停止・移行は実行しない。

| コマンド | 結果 | exit |
| --- | --- | --- |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project termite-warranty-dev --non-interactive | 既存19件すべて更新成功 | 0 |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project termite-warranty-dev --non-interactive | 上記新版を公開成功 | 0 |
| node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision a9e90e497a4375de84fae667fc05c59615c4a491 --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/e71043ed17793dd4 --dev-inspect | 最終回は全10項目pass、Cloud書込みなし | 0 |
| node tmp/increment-dev-readonly.mjs after | 配備前後の10コレクションが文書ID・型付き値hash一致、物件16件不変 | 0 |
| node tmp/verify-paused-backups-after-release.mjs | 全19自動取得false・Scheduler PAUSED・PITR停止・予定0／像0を維持 | 0 |
| ./scripts/check-governance.ps1 | 配備後の現行仕様・索引・運用・進捗記録の整合確認成功 | 0 |
| git diff --check | 既存差分を含め空白検査成功。改行形式の注意のみ | 0 |

初回正式照合はコマンドexit0でもHostingだけblockedだったため未完了と判断した。読取診断で991アプリファイルの一致とprovider専用2件だけがLocal外であることを確認し、同じ対象・版・ソースで再照合。最終回にprovider来歴を含む全チェックpassを確認した。初回blockedの直接原因は確認できていない。配備失敗／不一致では完了扱いせず、必要なら画面とFunctionsを先行版へ揃えて差し戻す。無断の業務データ修復・削除はしない。

ユーザー実画面の受入・300件のDev容量試験・HS日時準備の回答・実HS資料取込みは未完了。[受入手順と架空CSV](../../../deliverables/dev-import-acceptance-2026-10-08/README.md)。

## 支店未登録時の誤表示修正（2026-10-08）

オーナーのDev検証で未登録支店3件の全件棄却を確認したが、結果表で空のbranchLabelを「本店」に置換する表示不具合が報告された。結果列を「支店コード」へ修正し、Functionsのpreviewへ入力branchCodeを追加して既知・未知ともそのまま表示する。旧branchLabelは互換性のため残す。コード不明時も本店と推測しない。支店コード空欄は既存の必須エラーを維持し、本店登録への仕様変更は行わない。

対象はapp/components/PropertyBulkImportDialog.vue、functions/property-bulk-import.js、test/property-bulk-import.test.mjs。既知・未知コードの返却、空欄／未知コードの全件棄却・採番を含むWrite0を検証。影響は表示とpreview応答へのフィールド追加のみで、保存契約・採番・検証条件・権限・Read数は不変。仕様・データモデル・ADR・ガバナンス・移行手順の変更は不要。共通設計とchangelogへ表示修正を記録し、既存文書差分を保全する。独立レビューは非選択（単一表示項目と応答項目追加、更新・権限の変更なし）。

分類はUI＋application logic＋documentation＋deploy、選定全7ゲート、除外なし。実装3ファイルのみ709fec527a5f6174252322dfdd4aec395bfa81d7へ統合し、他作業の文書差分は保全。対象node --test test/property-bulk-import.test.mjsは25件exit0。初回sandbox内npm testは一時ファイルrenameのEPERMにより7失敗、npm run test:rulesは起動timeoutで各exit1となったため、制約外で再実行し成功した結果だけを完了証拠にする。

| コマンド | 最終結果 | exit |
| --- | --- | --- |
| ./scripts/check-governance.ps1 | 影響文書整合 | 0 |
| npm test | 295件中293成功・既存2skip・失敗0 | 0 |
| npm run typecheck | 型検査成功 | 0 |
| npm run build | 画面生成成功 | 0 |
| npm run test:rules | 132件すべて成功・失敗0・skip0 | 0 |
| node scripts/check-functions-syntax.mjs | 構文・生成domain同期成功 | 0 |
| node --check scripts/seed-emulator.mjs | 構文成功 | 0 |
| npm run build:recovery-release -- --revision 709fec527a5f6174252322dfdd4aec395bfa81d7 | 固定版の決定的成果物・fresh build成功 | 0 |

Dev反映前の読取確認はnode tmp/increment-dev-readonly.mjs beforeとnode tmp/increment-hosting-version.mjsが各exit0。通常(default)／normal世代10・ロックなし・16物件、Hosting旧版sites/termite-warranty-dev/versions/59e0e66e32f12f9cを確認。日付対応の承認済みDev反映に続く受入不具合修正として、同じ既存19 FunctionsとHostingへ反映を完了した。node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project termite-warranty-dev --non-interactiveと同hostingは各exit0。

正式照合node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 709fec527a5f6174252322dfdd4aec395bfa81d7 --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/59e0e66e32f12f9c --dev-inspectは最終全10項目pass／exit0、19 Functions原本・配信993ファイル一致。初回はexit0でもHostingのみblockedのため未完了と扱い、ソース・配備・条件を変えず再照合して通過。初回の直接原因は未確認。

配備前後のnode tmp/increment-dev-readonly.mjs afterは支店マスタの変化によりexit1であり、全データ不変とは報告しない。読取診断node tmp/branch-preview-diagnose-data.mjs after（exit0）の変更rootはcompanyBranchesのみで1件→2件。他9root・既存16物件・採番・アカウント権限・制御runtime／accessは一致した。こちらはマスタ追加・業務データ変更を実行していないため、変更の実行者は未確認として既存変更を保全した。添付の再照合node tmp/excel-date-check-target.mjs（exit0）は入力3件・既存キー0・支店3204が現在登録済みを確認。したがって同じCSVで未登録支店の全件棄却を再検証する期待は現状に適用できない。表示のユーザー再確認は未実施。読取診断の初回はhelperの生成先パス誤りで実行不能だったため、正しいtmpパスで作成して再実行した診断だけを根拠とする。

node tmp/verify-paused-backups-after-release.mjsはexit0、19件の自動取得停止・Scheduler PAUSED・PITR停止を維持。停止・CSV実登録・Auth／IAM／Rules／索引／バックアップ変更なし。最終文書の./scripts/check-governance.ps1とgit diff --checkは各exit0。runtime関連の作業差分はなし、既存文書差分は保全。差戻しは前版359b14cのFunctionsと画面を揃え、データは変更しない。

## Excel編集CSVの日付対応（2026-10-08）

オーナーがExcel編集した入力済みCSVを提示し、取り込めるよう改修・Dev反映を指示した。YYYY/M/D（各月日1〜2桁）をYYYY-MM-DDへ正規化して既存の実在日検証を行い、従来形式も維持。年月のみ・存在しない日付・月日年順・Excelシリアル値・時刻付きは拒否する。受領sourceValuesと元CSVのdigestを変えず、成功済み同一実行の再確認を維持する。初回10年・必須条件・全件棄却・採番・番号保全は不変。既存データ移行は不要。

実装版は359b14c71e474b3292eb9b1a0c95fc50f4dfa7cb、先行版はa9e90e497a4375de84fae667fc05c59615c4a491。今回の実装対象はsrc/domain/property-bulk-import.mjs、app/components/PropertyBulkImportDialog.vue、test/property-bulk-import.test.mjs、test/emulator/property-warranty.test.mjs、受入READMEと同梱ZIP（CSV10本自体は不変）の6ファイルのみをGit統合。functions/domainは生成同期。仕様0.1.129・case-warranties・meeting-prototype物理契約・共通設計・technical-remediation・user-explanation-items・CHANGELOGを更新。業務データの保存形状、Rules／索引、ガバナンス、復旧、ADRは変わらない。混在する既存文書差分は保全し、一括stageしない。台帳の既存未統合差分は編集しない。

添付はUTF-8／14列／3件。元ファイルは変更せず、Local入力検証で3件成功・エラー0、日付をISO化し任意空欄を保持（exit0）。個人・物件情報をテストや文書へ転記しない。Devの読取照合で既存キー0件、対象支店コード未登録を確認。オーナー補足により支店未登録はエラー検証のための意図した状態であり、登録案内・マスタ追加をしない。受入の期待結果は日付エラー解消後、未登録支店による全件棄却。今回Cloud本登録は実施しない。

独立レビューEXCEL-DATE-01は対象4ファイルに具体的指摘なし。関連24テストを独立実行してexit0。実在日検証、受領値保全、全件棄却、日付保存、2018年度採番、同一再送と復旧整合を追加検証する。

分類はUI＋application logic＋documentation＋deploy。選定は全7ゲート、除外なし。

| コマンド | 結果 | exit |
| --- | --- | --- |
| ./scripts/check-governance.ps1 | 仕様・設計文書整合成功、配備後記録も再確認済み | 0 |
| npm test | 最終試験修正後294件、292成功・既存2skip・失敗0 | 0 |
| npm run typecheck | 型検査成功 | 0 |
| npm run build | 画面生成成功 | 0 |
| npm run test:rules | 最終132件すべて成功・失敗0・skip0。初回の試験準備の失敗は下記に区別 | 0 |
| node scripts/check-functions-syntax.mjs | Functions構文・生成domain照合成功 | 0 |
| node --check scripts/seed-emulator.mjs | 構文成功 | 0 |
| npm run build:recovery-release -- --revision 359b14c71e474b3292eb9b1a0c95fc50f4dfa7cb | clean runtimeから決定的成果物を作成しfresh build照合成功 | 0 |

初回エミュレータ試験は132件中131成功・1失敗／exit1。失敗は新しい試験が支店を直接作りコード予約を用意していなかったため。実装側の支店保存で準備するよう修正し、未登録支店3行の全件棄却と全業務Write0の確認も追加。独立追加レビューで指摘なし。修正後の全132件成功／exit0を最終証拠とし、初回の成功件数を再利用していない。

Devの既存19 FunctionsとHostingを359b14cへ反映し、正式照合全10項目pass。前Hostingは読取でsites/termite-warranty-dev/versions/88db7150d630b648、新版はsites/termite-warranty-dev/versions/59e0e66e32f12f9cを確認。通常(default)／recovery-control・normal世代10・ロックなし。既存16物件を含む10コレクションの文書ID・型付き値hashが反映前後で一致した。支店3204は意図した未登録状態を維持し、添付の外部キー3件は未登録、Cloud本登録・マスタ追加なし。全19件の自動取得false・Scheduler PAUSED・PITR停止・予定0／像0も維持。

| コマンド | 結果 | exit |
| --- | --- | --- |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project termite-warranty-dev --non-interactive | 既存19件更新成功 | 0 |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project termite-warranty-dev --non-interactive | 上記新版公開成功 | 0 |
| node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 359b14c71e474b3292eb9b1a0c95fc50f4dfa7cb --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/88db7150d630b648 --dev-inspect | 最終全10項目pass、Functions19archive・配信993ファイル・Rules双方・必要索引11／除外30を照合 | 0 |
| node tmp/increment-dev-readonly.mjs after | 10コレクション／16物件・制御状態が反映前後で不変 | 0 |
| node tmp/verify-paused-backups-after-release.mjs | バックアップ／PITR停止維持 | 0 |
| node tmp/excel-date-check-target.mjs | 添付の入力3件成功、既存キー0、支店3204未登録維持、Cloud書込みなし | 0 |

正式照合の初回はexit0でもHostingだけblockedのため未完了と判断。読取診断で991アプリファイル一致とprovider専用2件のみLocal外であることを確認し、ソース・配備を変えず正式再照合。最終回でprovider来歴を含む全項目passを確認した。初回blockedの直接原因は確認できていない。

ユーザー受入・Excelアプリでの入力／保存操作・添付CSVのCloud本登録は未実施。受入はDev再読込→一括取込みでUHと対象工務店を選択→同じCSVで「内容を検証」。期待結果は日付エラーなし、未登録支店の理由で3件全件棄却・登録0件。支店登録や本登録に進む必要はない。先行版へ戻す場合はFunctionsと画面を揃え、既存データは書き換えない。
