# Operations

## 2026-10-09 Dev設定照合・保証書CSV着手

Devの実一覧4サービスアカウントの個別IAMと全21関数の実行主体、祖先組織なし、GitHub development保護なしを読取専用で確認。[設定仕様の追加照合](requirements/environment-configuration.md#2026-10-09-dev設定権限の追加照合)に確認値・未確認範囲・コマンド終了状態を反映。通知メールはCLI操作者メールと不一致だが、指定先との不一致と断定せず、本人照合／実受信は未確認。設定・権限変更や通知送信は行っていない。

保証書CSVの仮項目・発行済み管理は[HSC-037](requirements/house-solution-confirmations/HSC-037-warranty-groups.md)に実装指示を記録。年月基準と保証延長時の状態を確認中で、製品実装／Dev配備は未着手。回答後に仕様・データ契約・検索要件・実装・試験・関連記録を更新する。今回ここまでの差分は文書のみ、必須gateはgovernance-check。runtime各gateはコード／設定変更がなく対象外。

## 月別取得・環境設定の照合

月別取得とgetAllはDev反映済み（最終索引／Hosting版68e2eed、Functions実体f23c2a2、正式照合全10pass）。307件補完・業務値不変・6か月12条件の実Firestore対象一致、読取単体中央値6272→111msを確認。既存Chrome管理者で2026-10の保険一覧・CSV・Functions物件取得305件一致を確認。新規アカウント不要。元タブへ再接続済み。CSV保存は成功する一方で操作ツールのdownload待機だけが失敗することを再現し、認証付き再取得成功も確認。300件プレビューは3回成功、Functions中央値1,031ms（改修前18,248ms）、全300行照合・書込み0を確認。保険／請求の月切替12条件で画面とDB取得数が一致し、請求CSV全305行・延長1行・個別選択1行も照合完了。さらに10月9日、異なる2アカウントの実画面で採番競合・同一CSV二重登録防止・同一物件の保存競合を確認。3ケースともFunctions処理時間の重複と一方だけの成立を照合した。架空8件を追加し、既存307件の業務値は不変。実初期規模・多数利用者の長時間負荷は未検証。[移行と検証状態](design/monthly-queries.md)。Dev／Prodの設定・権限は[環境設定仕様](requirements/environment-configuration.md)を照合表とする。Prod構築は未実施。認証サービスは変更せず実装済み診断で観測を続ける。

## 認証失敗の調査

2026-10-08、`f29f4a3`のFunctions21件・HostingをDevへ配備、正式照合10項目pass。実画面での通信エラー再発と合成再送試験の両方をFunctionsログで受信済み。元のエラー原因は未解明。

ブラウザ診断の受付は`reportAuthDiagnostics`、Functionsログの検索条件は`jsonPayload.event="auth_client_failure"`。発生時刻at、stage/code、online、事象IDを照合する。クライアント申告であり、online=trueは接続成功を意味しない。個人情報や資格情報を補ってログに出さない。[送信・上限・消失条件](design/reference-store-metrics.md#認証失敗の診断経路)、[実行結果](design/evidence/prod-readiness-2026-10-08.md)を参照。

Devの認証サービス側activity loggingはIdentity Platformが必要として拒否され、未有効。サービス変更は未実施。元の通信エラー原因も未特定で[HSC-041](requirements/house-solution-confirmations/HSC-041-authentication-diagnostics.md)に集約する。新規管理者アカウントなしで診断経路を検証する。

## 2026-10-08 Dev容量・検索・CSVの実測完了範囲

配備基準b5bcb354の実画面で300件CSV本登録・301件拒否、保険報告／請求CSV各300件の完全性、20件外候補・面積訂正再保存・新規グループ反映を確認。最終物件307件、一時アカウント削除済み。Functionsログ119件を確認し、月別一覧の全307件取得と300件取込約20秒を改善候補として記録。[詳細・実行コマンド・限界](design/evidence/prod-readiness-2026-10-08.md)。保証書CSVは別の未完了機能。Prod作成・配備・課金設定・Git pushは実行しない。


## 2026-10-08 Prod構築前の整理

本番DBはFirestoreに確定。Prod workflow作成は以下の実環境情報が揃ってから。Dev検証の実施範囲は上記実測を参照。Prod作成・IAM・課金・通知設定の実行は今回の範囲外。

| 項目 | 確認済み事項 | 構築時に必要な情報／作業 |
| --- | --- | --- |
| 所有者・管理者 | HS所有。メール受領・正式氏名確定は資料台帳に記録済み | 原回答／オーナー指定の値を非公開で再照合し、Googleアカウントでの利用・回復手段を確認 |
| Prod識別情報 | Devとは別、Firestore/Functionsはasia-northeast1、Blaze | 実project ID/number、Web App ID、Hosting site、Auth domain、control DB、Auth退避先Storageを作成時に確定 |
| 請求 | HS管理者メール紐付け後に登録 | HSが使用する請求先の実登録・紐付け。予算設定は後発 |
| 開発者権限 | オーナー指示でHS管理者と同等 | 対象Googleアカウントと同等にする具体的IAMを構築時照合。実付与は未実施 |
| 通知 | オーナーのGoogleアカウント | 正確な通知先を非公開で照合し、構築後に通知経路・到達を確認 |
| GitHub配備 | 現行はmain pushで検証、workflow_dispatchでDev配備。Prod workflowなし | Prod環境名・保護条件・対象ブランチ、WIF provider/サービスアカウント、実行権限、環境固有設定、同時実行排他、版固定・差戻しを設定。構築情報確定まで実装保留 |
| Prod接続・Functions・復旧CLI | 現行のfirebase.client.ts／nuxt.config.tsはDev projectを固定照合。functions/local-runtime.jsとdefault-recovery.mjsもLocal／Dev以外を拒否 | 実Prod ID確定後、環境別の明示照合へ対応し、取り違え拒否・配備確認・復旧手順を検証する。workflowの新設だけではProd利用可能にならない |
| バックアップ | Prod構築後にPITR・日次バックアップ・Auth退避等を設定 | 初回取得・失敗通知・復元互換性を提供前に検証。Devの停止設定は維持 |
| 初期投入 | 資料は揃ったとのオーナー報告 | オーナーの投入準備データ提供まで保留。現行増分CSVを過去番号保持の初期投入と混同しない |

管理者情報の根拠は[資料台帳](requirements/source-materials.md#2026-10-06-読取結果に対するオーナーの追加回答)。正確な氏名・メール値を今回取得したという主張ではない。保証書出力・予算設定・HS向けシステム利用説明資料は後発。保証書印刷品質を現行CSV検証の成功条件にしない。

## 2026-10-08 一括取込み対象の本支店コード必須

最新Dev配備は `b5bcb354800ec89a6ca1629e1f73ebe8c0ab3390`。全7ゲート・独立レビュー・正式照合全10項目pass、対象／対象外の登録・編集と再有効化を実画面検証。既存データに欠落がなく移行・初期化なし。架空本支店2件追加、物件6件維持。Functionsログ18件（server 14／client 4）、一時アカウント削除済み。正常世代10、自動バックアップ停止維持。[正確なコマンド・一時blocked原因・結果](design/property-bulk-import.md#branch-code-required-01-条件付き必須)。以下の旧版と条件付き必須残件は過去の時点。Prod配備なし。

## 2026-10-08 本支店必須・Dev初期化・HS実画面検証

最新配備は `1800e018e98a91b759e143be67e7c3cc90ae5a14`。物件／保証は下書きから工務店・本支店必須、本店も明示選択。全7Localゲート、Functions20件／Hostingの正式照合全10項目を通過。オーナー承認によりDev物件／採番／取込み関連52文書を初期化した後、架空データで業務を検証した。API直接検証を実画面検証とみなさず、指摘後にブラウザからマスタ、受付、本登録、CSV取込み・実ダウンロード、報告、請求、延長、取消復元、満了案内を実行。残した物件は6件、全件本支店所属あり。検証専用アカウントはログアウト・削除済み。

実画面操作時間帯のFunctionsログは132件（server_observed 115／client_reported 17）。正常世代10、自動バックアップ停止維持。正確な実行範囲・コマンド・exit・一時失敗・残件は[HS業務フローと検証記録](requirements/workflow.md#2026-10-08-hs業務フローとdev検証)。本支店コードのグループ条件付き必須化、正式保証書用CSV、終了保証の退避運用は今回の成功に含めない。下記の旧版・通常本支店必須未実装の記述は過去の時点。

- [共有参照Store・処理別計測](design/reference-store-metrics.md)：Functionsログの利用・配備境界。

## 2026-10-08 共有Store・計測・組織レイアウトのDev反映

レイアウト修正完了後の明示指示で `ebd9c45` をDevへ配備。Functions20件とHosting991ファイルの正式照合全10項目pass。最終単体347成功／既存2skip、Emulator138成功、全7Localゲート成功。架空fixtureのDev機能9項目と後始末成功、Functionsログでserver_observed／client_reportedの両方を受信。既存19物件を含む10rootのhash・制御状態は配備前後一致、normal世代10・ロックなし。自動バックアップ／PITR停止維持。初回Hosting照合のblockedと再確認結果、正確なコマンド・exitは[実測](design/reference-store-metrics.md#2026-10-08-dev配備と実受信)を参照。

本支店コードの有効間重複防止、無効編集禁止、用語／桁数、Store②、処理別計測、組織階層レイアウトを含む。通常物件の本支店必須化・コード条件必須化は完了扱いにしない。配備前の「Dev未反映」「①購読外TTL設計中」は下記の履歴であり、現在は②の全件購読。次はユーザーによる[UI/UX確認](design/reference-store-metrics.md#ユーザーのuiux確認手順)。機能・ログ検証は開発側で実施済み。Prod・課金比較は未実施。

## 2026-10-08 本支店用語・コード長と無効編集禁止

オーナーがBRANCH-05（本支店への用語統一、コード桁数チェック撤廃）とDISABLED-01（無効データは再有効化後に編集）を指示。Localで改修・全7ゲート・独立レビューを実施して報告する。無効マスタは専用再有効化で状態だけ変更し、通常編集や再有効化と改名の同時保存は不可。本支店の有効重複コードは再有効化を拒否。旧CSVの支店コード見出しは引き続き受理し、新規テンプレートは本支店コードへ変更。既存データ移行・Dev配備／初期化・Cloud操作なし。[契約](design/property-bulk-import.md#branch-05-本支店の用語とコード長)、[無効データ](requirements/master-management.md#2026-10-08-無効データの編集を禁止)。共有参照Storeは方式と購読外5分TTLを採用済み、詳細設計中で未実装。

## 2026-10-08 BRANCH-03 Local改修

本支店コードの重複防止を有効本支店だけに限定し、無効化・再有効化、CSV照合、復旧検査を一体で改修。工務店の所属保証グループは登録後変更不可とする。[承認範囲・互換性・検証](design/property-bulk-import.md#branch-03-有効コードと会社所属固定)。旧無効本支店のコード予約が残るデータは新しい復旧検査に通らないため、適用前に整合が必要。Local移行は許可済み、Devはデモデータ初期化方針で移行不要だが、今回データ操作・Dev配備は行わない。旧有効コードの予約欠落も黙って補完しない。下記PM-08時点の未承認表記は履歴で、最新の承認範囲はBRANCH-03を参照。

## 2026-10-08 PM-08 Local作業の現在地

テンプレート下説明の削除とファイル選択アイコンの右側欄内配置をLocal実装。型検査・build・UI回帰8件・架空Local描画を実行し各exit0。[対象差分・検証・残件](design/evidence/increment-import-2026-10-08.md#pm-08-local表示修正と検討)。通常支店／支店コードの必須化は[調査と未承認案](design/property-bulk-import.md#2026-10-08-pm-08local表示修正と支店必須化の検討)。[カード対象一覧](design/clear-sky-theme.md#2026-10-08-カード外観の確認案未承認製品未変更)とサンプルはオーナー確認待ち。HSへの支店指定説明文案を既存説明事項へ追加し、HSC-015／HSC-036の現在表示を履歴保全のうえ整合した。Dev反映・Cloud再照合・本取込み・バックアップ操作は行っていない。下の交代指示は今回作業開始前の記録。

## 2026-10-08 PM（白蟻）-08への交代・次の作業

オーナーがPM（白蟻）-07から新しい非forkタスクPM（白蟻）-08への交代を指示。Astra・推論Medium、同じ主リポジトリを使用する。**以降のDev反映は毎回の明示指示まで行わない。Local改修・検証後に報告する。過去の配備承認を新しい改修へ流用しない。** 交代元は文書・既存差分の統合だけを行い、新しい製品改修・配備・データ変更は行わない。

- Dev直近確認は709fec5、通常(default)／normal世代10。16物件・採番・権限・取込記録は一致、支店マスタだけ1件→2件となり3204は登録済み。こちらで支店変更は実行していない。交代時のCloud再照合はしない。[実測](design/evidence/increment-import-2026-10-08.md#支店未登録時の誤表示修正2026-10-08)。実HS資料取込み・追加ユーザー受入・300件のDev容量試験は未完了。
- 検証ツールの安全な対象試験、配信設定のキー順比較、非秘密診断、fixture効率化と専用DB2試験の分離はGOVERNANCE-MANAGERでLocal実装・検証済み、Dev未反映。完了ターン01a119dd-5aa4-7ee1-8b96-b490da6b1537の実行出力を交代元が直接読み取り、全7コマンドの独立したexit0を確認（npm test 311成功／既存2skip、Rules132成功、型検査・build・構文2件・governance）。差分も確認し統合する。交代で追加する変更は文書のみ、既存6製品ゲートの失効条件には非該当のため証拠を再利用し、文書用governance・差分検査は実行する。検証の入口と安全条件は本書の検証節を参照。
- 統合時の補足：検証ツールは989ea67へ保存。staged diff検査でランナー末尾の空行を検出し、その1行だけ整えて再検査exit0。動作・準備／終了条件は無変更。交代元でnpm testを再実行し311成功／既存2skip・exit0を確認した。型検査・build・Rules・Functions／seedの5ゲートはその入力・試験本体・設定への変更がなく既存証拠を再利用し、文書検査は最終記録に対して再実行する。新しい業務コードの検証を代替する証拠ではない。
- Devバックアップ／PITRは停止中。基盤は保持するが、取得済み像を削除済みのため復元元があるとは扱わない。Prod提供前の取得開始・互換性・通知確認は残件。[運用例外](runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)。

新タスクへの指示（未実装・未検証）：

1. CSV支店コード必須を維持し、HS向け制約資料へ反映する。取込み可能グループでは通常の物件／保証管理の支店選択も必須にすべきか、サブエージェントでUI・サーバー・既存文書への影響を検証して提案する。現行の取込み可否はexternalKeyRequired=trueによる。独立の一括取込みフラグを実装済みと推測しない。
2. 取込み可能グループの配下工務店で、支店登録時の支店コードも必須にすべきか検討する（現行は任意）。既存空欄・所属変更・コード変更・無効化との整合を含め、検討を採用済みや実装済みに読み替えない。
3. 共通テンプレートダウンロードボタンの下の説明文をすべて削除する。共通機能をUH専用として扱わない。検証結果・エラー理由は保持する。
4. 画面内カードの対象一覧とvisualizeによる「影なし・elevationなし・グレー枠線」のサンプルを先に提示する。ダイアログ内レイアウト用カードは維持し、ユーザー確認前に外観を変更しない。Vuetifyの枠線設定は実装を確認する。
5. 一括取込みのファイル指定アイコンをappend-innerへ配置する。現行のプロパティ・既定位置を確認し、入力欄内の配置で検証する。

台帳には古い状態表示（HSC-015の「不明」補完、HSC-036の10年保留・配備状態等）が残る。現行契約は[共通設計](design/property-bulk-import.md)と[仕様書](specification.md)の2026-10-08節。既存台帳差分は保全して統合し、新タスクは同時編集がないことを確認して各事項と対応行だけを最新の決定へ整合する。

## 2026-10-08 CSV検証結果の支店コード表示

709fec5の支店コード誤表示修正を全7Local検証後、Devの既存19 FunctionsとHostingへ反映し正式照合全10項目を通過。未登録支店を「本店」にせず、入力コードを表示する。空欄は引き続き必須エラー。配備前後で支店が1件→2件となり3204は現在登録済みだが、こちらからマスタ変更は行っていない。物件16件・採番・権限・取込記録など他9rootと制御状態は一致。表示のユーザー再確認は未実施。[検証・配備とデータ差異の記録](design/evidence/increment-import-2026-10-08.md#支店未登録時の誤表示修正2026-10-08)。

## 2026-10-08 Excel編集CSVの日付対応

オーナー承認の359b14cを全7Local検証・独立レビュー後、Dev19 Functions／Hostingへ反映し正式照合全10項目pass。Excelの日付表示YYYY/M/Dを受け付け、物件保存とプレビューをISOへ統一し受領値は保持する。Local通常テスト292成功／既存2skip、Firestore132成功、各exit0。初回試験準備の失敗と修正後の全体再実行、初回Hosting照合未確定と最終通過は[実行記録](design/evidence/increment-import-2026-10-08.md#excel編集csvの日付対応2026-10-08)を参照。既存16物件を含む10コレクション不変、normal世代10・ロックなし、自動バックアップ／PITR停止維持。支店3204はエラー検証のため未登録のまま、添付CSVのCloud本登録なし。ユーザー受入は日付エラーなし／未登録支店による全件棄却を確認する。Excelでの操作・ユーザー受入は未実施。

## 2026-10-08 増分CSV改修の現在地

オーナー承認の改修a9e90e4を、全7Local検証・独立レビュー後にDev19 FunctionsとHostingへ反映。正式照合は全10項目pass、Functions19原本と配信993ファイルを確認。14列、初回10年・新規採番、外部キー必須グループ限定、通常キー非表示、住所／資材名の作成後不変設定を実装した。任意の住所・資材名は空欄のまま保存し、「不明」を補完しない。既存16物件を含む10コレクションが配備前後で一致し、normal世代10・ロックなし、自動バックアップ／PITR停止を維持。停止・Auth／IAM／Rules／索引変更・HS原資料取込みなし。旧UH pendingの入力見直し不具合も修正し実Vue回帰を追加。[実行記録と残件](design/evidence/increment-import-2026-10-08.md)、[現行設計](design/property-bulk-import.md)、[R2架空CSV10本と受入手順](../deliverables/dev-import-acceptance-2026-10-08/README.md)。ユーザーのDev受入・300件のDev容量試験は未実施。

## 2026-10-08 物件名統合の現在地

6b2573dの全7Local検証・独立レビュー後、Dev19 Functions／Hosting反映・正式全項目照合と16件の名称移行を完了。16件すべて厳密な完成像hash一致、nameと全その他項目不変、root ownerName0、旧名称履歴8件保持。normal／世代10・ロックなし。バックアップ停止・Auth／IAM／Rulesは維持。[実行記録](design/evidence/property-name-unification-2026-10-08.md)、[移行と中断回復](runbooks/property-name-migration.md)、[架空CSV7本・ユーザー受入](../deliverables/dev-import-acceptance-2026-10-08/README.md)。ユーザー実画面／CSV受入・任意300件のDev実行は未完了、HS実資料の投入は回答まで保留。


## 2026-10-07 外部キー改修のDev配備・受入待ち

オーナーの住所確認・別再開了承後に通常Devを再開。追加cbb5859を19 FunctionsとHostingへ反映し、provider原本19件／配信993件・runtime normal10／(default)・未認証拒否を確認した。UHの外部キー必須trueと名称「お施主様契約No」を実文書へ保存・readback済み。バックアップ自動取得／PITRは停止維持。正確な13ファイル・各コマンドexit・初回不一致／最終通過・残件は[実行記録](design/evidence/common-import-address-2026-10-07.md#2026-10-07-外部キー改修のdev反映通常再開)、オーナーの次の作業は[受入手順](design/evidence/common-import-address-2026-10-07.md#外部キー改修の受入手順と残件)。HS追加受入・実Cloud容量／障害試験・原UH資料取込みは未完了。以下の住所確認待ちは再開前の記録。


## 現在地と参照先

本書の日付付き記録から、対象作業の実行結果・配備・受入・残件を確認する。各記録の「現在」「未配備」「次の作業」はその時点の記述であり、同日を含む後続記録も照合する。過去の操作承認を再利用しない。

確定要件は[仕様書](specification.md)、進行・完了条件は[納品ロードマップ](roadmaps/2026-initial-delivery.md)と[技術改修台帳](roadmaps/technical-remediation.md)、未決事項は[台帳](requirements/house-solution-confirmations.md)を参照する。個別の検証結果は各運用記録からリンクし、この入口には特定版の状態を重複記載しない。

## 2026-10-07 共通CSV・物件住所とDevバックアップ停止

Devの保護停止・取得済み像の削除は[現行例外](runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)の範囲で実行／再確認済み。バックアップ停止自体は通常業務normal・世代7を維持した。Cloud変更・verifyは各exit 0。現時点でバックアップ／PITRを用いた復元元はない。

共通CSV、支店コード、単一住所、移行／差戻しはLocal実装・全7ゲート／独立レビュー済み。オーナーの具体計画承認後、f9c275bを19 FunctionsとHostingへ反映し、停止・更新収束・全体54文書の事前保全後に、計画hashが不変の16件を住所限定で移行。全体・権限・採番・参照の照合と実配備照合を通過し、現在は(default)の**HS確認待ち／世代9**。移行・publish・observe・statusは各exit0、運用ロックなし。通常業務の更新は停止を維持し、HS管理者の閲覧と非更新CSVのみ許可。[コマンド別結果・正確なファイルと残件](design/evidence/common-import-address-2026-10-07.md)。[設計と具体計画](design/property-bulk-import.md)、[提供前作業](runbooks/production-bootstrap-review.md#提供前の必須保護ゲート2026-10-07追加)。

追加照合で見つかった住所移行後のHS確認待ちへの操作不足を、専用公開計画で補った。最終domainは277件中275成功／既存2skip、Rules／emulatorは125成功、各exit0。実装不変のLocal証拠はpolicyに照合して再利用。Devでは19 Functionsの実ソース19archive、Hosting993path、Rules双方、必要索引11・除外30の正式照合が全pass。全19件の自動取得false、Scheduler PAUSED、PITR無効も維持。HS実画面確認・別再開了承、実Cloudの合成容量試験、原UHデータ取込みは未完了。後続で採用したグループ別外部キー必須設定・名称設定は追加Local改修で、f9c275bの配備には含まれない。[現在の追加改修と検証](design/evidence/common-import-address-2026-10-07.md#2026-10-07-追加local改修外部キー必須設定表示名)。

## 2026-10-05 アカウント排他制御・参照キャッシュの運用

同日、Local全7ゲートと独立レビュー後に下記Dev配備を完了。索引READY・公開24参照ファイル一致・専用合成データの8群とcleanup成功、各検証コマンドexit 0。既存業務データは試験更新せず、合成データは残存なし。詳細は[実測記録](design/account-concurrency-read-efficiency-2026-10-05.md)。

ACCOUNT-01の三入口を同じUIDロックへ統一する。Dev配備対象はupdateStaffAccount、setStaffAccountEnabled、setConstructionCompanyAccountEnabled、propertyPrototypeとRules/索引/Hosting。全入口の反映確認後に合成専用データで受入する。既存物件・管理者の更新、初期化、Prod/IAM操作なし。[設計と実測](design/account-concurrency-read-efficiency-2026-10-05.md)。

参照候補とアラート設定は画面内で5分共有され、別管理者の更新は最大5分遅れる。最新の値が必要なら「最新の設定を取得」を使用。設定保存成功、認証scope変更、ログアウトで破棄。権限の即時停止と保存時検証は従来どおり最新を確認する。

アカウント更新が継続してaborted/failed-preconditionになる場合、管理者は旧Functions実行が停止済みか確認し、`node scripts/account-mutation-recovery.mjs --project termite-warranty-dev --uid <実環境で照合したUID>`で読取確認する。出力は操作ID・所有者・状態・整合判定に限り、メールや変更値を出さない。時間経過だけでロックを削除しない。

実復旧は対象と停止証拠を確認して別途承認した後だけ実行する：`node scripts/account-mutation-recovery.mjs --project termite-warranty-dev --uid <照合済みUID> --apply --confirm account-mutation-recovery --expected-operation <確認したoperationId> --confirm-worker-stopped`。既にrecoveryOwnerがある場合は旧復旧プロセスも停止したことを確認し、`--expected-recovery-owner <確認したrecoveryOwner> --confirm-recovery-worker-stopped`を追加する。復旧自身の所有者はAuth操作前に取得する。中断した再開処理はFirestoreの現在値（無効）へAuthを揃え、勝手に再開しない。失敗・状態変化では記録を保持し、無条件削除や自動再試行をしない。実復旧・旧プロセスの強制停止は今回の配備承認に含めない。

差戻しはアカウント更新を止めて記録を保全し、排他制御を理解する互換修正版で対応する。ロックを無視する旧版へ戻さない。参照取得だけの差戻しは旧catalog応答を維持しているが、HostingとFunctionsの対応を確認する。新しいサーバー専用コレクションは既存リセットツールでも保持分類に追加したが、リセット自体は実行していない。

## 2026-10-05 現行実装点検とバックアップ／リストアのモック

現行MeetingPrototypeを継続改修の基礎とし、通常経路外の旧案件・旧マスタ画面を撤去。今回の変更はローカルにまとめ、単体166件・Emulator88件成功（既存2skip）、型検査・build成功。Devは直前の検索ボタン修正版のまま。実データ・Firebase設定・実バックアップには変更なし。[点検記録とオフライン実行手順](design/evidence/current-implementation-audit-2026-10-05.md)参照。模擬結果を実バックアップ成功や復旧検証と扱わない。

## 2026-10-05 現在地・次の確認

検索ボタン配置の推奨案をオーナー採用。入力欄本体に合わせた56pxのボタン領域内で中央揃えするローカル修正を実施。メッセージ領域は保持し、検索・開閉処理は不変。今回Dev Hosting反映済み（deploy exit 0）、公開HTML HTTP200・35参照資産一致・Dev設定一致（verify exit 0）。保存・終了後に再読込し実画面の配置を確認する。HSC-039は記録のみ、回答や項目統合はなし。変更ファイルはapp/components/MeetingPrototype.vue、docs/specification.md、docs/requirements/search-and-list.md、docs/design/clear-sky-theme.md、CHANGELOG.md、本書。分類はUI/layout＋文書、npm run typecheck・npm run buildは各exit 0。node tmp/check-search-button-alignment.cjsはexit 0、950px／320px幅とメッセージ高さ22px／42pxの4ケースでボタン領域中央一致・横はみ出しなし、950pxで入力欄本体中央一致とボタン位置不変を確認。独立fixtureでありDev実画面・モバイル実機確認ではない。最終文書でgovernance-checkとdiff checkを実行する。保存・データ契約・ADR・ロードマップ・governance/configuration・索引は影響なし。domain-test・Rules・Functions/seed構文は今回の選択クラス外、追加単体テストなし。差戻しは今回のラッパーとCSSを戻す。Hosting以外のデータ・Functions・Rules・Prod操作なし。以下の選択クラス外の記載はローカル修正時の結果で、配備時は全7ゲートを選択し既存の有効証拠も再利用。[検索要件](requirements/search-and-list.md#2026-10-05-検索ボタンの中央揃え)。

追加是正：前回の上下中央揃えではVuetifyの2段グリッドが残り、ユーザー画像でずれを確認。共通アラートを1段グリッドへ変更し、ブラウザfixtureの単行・複数行・見出し付き3ケースで中心差0pxを確認。Dev Hosting反映済み（deploy exit 0）。公開HTML HTTP200・35参照資産一致・Dev設定一致（verify exit 0）。保存・終了後のユーザー再読込による実画面受入が次。[最新記録](design/evidence/ux-106-2026-10-05.md#アラートの2段グリッドによるずれの是正)。

追加修正：アラートのアイコンをメッセージ全体の上下中央へ変更し、オーナーの再試行指示でDev Hosting反映済み（deploy exit 0）。公開HTML HTTP200・35参照資産一致・Dev接続先一致（verify exit 0）。入力を保存・終了後に再読込して実画面を確認する。色・サイズ・処理は不変。[最新記録](design/evidence/ux-106-2026-10-05.md#アラートアイコンの上下中央揃え)。

オーナー採用のアラート共通デザインをDev Hostingへ反映済み。全67箇所は共通設定を継承し、tonal・compact・本文14px相当・アイコン20px。先行の入力欄auto廃止と案内文修正も配備。全7ゲートが各exit 0（npm test 157成功・2既存スキップ、Rules88成功）、公開HTML HTTP200・35参照資産一致・Dev接続先一致。今後の画面向けルールをproject-rulesとClear Sky themeへ記録し、共通設定の上書き・auto再導入を検出する試験を追加。[実行記録](design/evidence/ux-106-2026-10-05.md#アラート共通デザインの採用dev反映pm-07)と[配備指紋](design/evidence/dev-release-alert-design-2026-10-05.json)。次はユーザーが入力を保存・終了後に再読込して実画面を確認する。データ・Functions・Rules・Prod変更なし。以下の「ローカルのみ」「未コミット」等は今回の配備前の履歴。

全67箇所のアラートをtonal・compact・アイコン20pxへ統一。本文と見出しは0.875rem、アイコン間隔12px、既存の上下余白指定16px。ローカルのみ、Dev未反映。サンプルは色と文字の比較用で、実アプリの画面検証を代替しない。

対象：`app/components/AppliedWarrantyDialog.vue`, `app/components/CaseDetail.vue`, `app/components/CaseEditDialog.vue`, `app/components/CompanyPortalAccountManagement.vue`, `app/components/CompanyPortalNotificationManagement.vue`, `app/components/ConstructionCompanyPortal.vue`, `app/components/DashboardOverview.vue`, `app/components/LoginPanel.vue`, `app/components/MasterAddressFields.vue`, `app/components/MasterDetail.vue`, `app/components/MasterEditDialog.vue`, `app/components/MasterFormFields.vue`, `app/components/MasterManagement.vue`, `app/components/MeetingPrototype.vue`, `app/components/PrototypeDashboard.vue`, `app/components/QuickCreateMasterDialog.vue`, `app/components/StaffAccountManagement.vue`, `app/components/WarrantyLifecycleDetails.vue`, `app/components/WarrantyOrganizationManagement.vue`, `app/pages/auth/action.vue`, `app/assets/clear-sky-theme.css`、`docs/design/clear-sky-theme.md`、`docs/specification.md`、`CHANGELOG.md`、本書。UI/layout＋文書のゲートとして `npm run typecheck` と `npm run build`、`pwsh -NoProfile -File scripts/check-governance.ps1` が個別exit 0。Vue ASTで全67箇所のvariant/density/icon-size一致もexit 0。最終文書更新後にgovernanceと差分チェックを再確認する。domain-test・Rules・Functions/seed構文は表示属性とCSS・文書のみのため選択外、追加単体テストなし。nuxt設定・依存・governance・データ契約・ADR・進捗・索引は変更不要。旧デザインへ戻す場合は今回のアラート属性とCSSのみを戻す。先行の入力欄・文言差分を保持。未コミット、Dev配備・実画面確認・データ操作なし。

追加指示により、入力欄のメッセージ領域を常に確保する修正をローカルで実施。Devは下記の配備版のまま。今回のDev配備・実画面確認は未実施。

変更対象は `app/components/MeetingPrototype.vue`（auto指定12箇所をfalseへ変更）、`docs/specification.md`、`docs/requirements/search-and-list.md`、`CHANGELOG.md`、本書。分類はUI/layout＋文書。`npm run typecheck`、`npm run build` はそれぞれexit 0。`pwsh -NoProfile -File scripts/check-governance.ps1` は文書更新後exit 0。`git diff --check` もexit 0。コードのauto指定はappとnuxt.config.tsを検索して0件を確認。ビルドにはプラグイン処理時間・Nitro外部参照等の警告があるがexit 0。単純な表示属性変更のため追加単体テストは作成せず、domain-test・Rules・Functions/seed構文は今回の選択クラスに含まれず未実行。保存処理・データ契約・ADR・ロードマップ・governance/configuration・索引は影響なし。差戻しは当該属性と今回の文書差分を戻す。Gitコミット・配備・データ変更なし。メッセージが長い場合の折返し高さまで固定する変更ではない。

物件・保証一覧のモック①（詳細条件の折りたたみ）を採用しDev Hostingへ反映済み。常設テキスト検索、適用済み条件Chip、検索成功後の収納、入力エラー時の展開、Chip削除で再検索。条件なし最新20件・ページネーション維持。156試験成功・2既存スキップ、型検査・ビルド・governance・35配信資産照合成功。[最新実装・検証](design/evidence/ux-106-2026-10-05.md)、[配備指紋](design/evidence/dev-release-search-fold-2026-10-05.json)。今回の配備はHostingのみ。

次はユーザーによるDevでの検索UI確認（保存・終了後に再読み込み、詳細開閉、条件検索、Chip解除、条件クリア）。実画面・モバイル実機の見た目は未確認。既存の入力中ダイアログは無断で閉じない。Devにはユーザーが過去物件の確認用に入力したデータがあるため、初期化・削除・テスト用更新は禁止（別途明示承認が必要）。Prod作業・キャッシュ設定変更・更新通知実装は未実施。キャッシュ設定変更は未採用の相談段階。

直近の反映済み事項：カード内操作ボタンの背景／枠線、全一覧の物件名リンク、保証満了案内は未案内固定、保険満了案内は既存満了日判定で検索欄除去、保険報告一覧の保険／保証2段表示、本登録確認のv-alertと登録内容カード、本登録・下書き保存成功時の自動終了。本登録済み編集保存は従来どおり開いたまま。保険の案内済み状態は追加していない。最終満了のアラート扱い等は未決台帳参照。

HS確認の正本は[未確定事項一覧](requirements/house-solution-confirmations.md)、確定仕様は[仕様書](specification.md)。Googleフォームと過去データに関する現状は本書の2026-10-05記録参照。回答済みと推測せず実際に受領してから判断する。[本番目標スケジュール](../deliverables/production-schedule-2026-10-05/README.md)は作成・共有用PDF化済みだがHSとの日程合意や工程完了を意味しない。

オーナーの明示指示でPM（白蟻）-06からPM（白蟻）-07へ新規タスク交代。希望設定はgpt-6.1-sol／medium。引継ぎ専用ファイルは作らず、この運用記録と通常の正本文書を入口とする。新タスクはAGENTS.mdとproject-rules、文書マップを読んでから現在地を確認し、独断で未確定要件を実装しない。

## 2026-10-05 本登録・下書き保存後の終了

成功後に入力ダイアログを自動終了する修正をDev Hosting反映済み。155試験成功・2既存スキップ、型検査・ビルド・governance・35資産照合成功。[記録](design/evidence/ux-106-2026-10-05.md)。

## 2026-10-05 本登録確認レイアウト

説明をv-alert、物件・日付・期間を登録内容カードへ整理しDev Hosting反映済み。型検査・ビルド・governance・35資産照合成功。[記録](design/evidence/ux-106-2026-10-05.md)。保存後に再読込して実画面を確認する。

## 2026-10-05 保険報告一覧の期間表示

保険期間と対応する保証期間をラベル付き2段表示へ修正し、Dev Hosting反映済み。型検査・ビルド・governance・35資産照合成功。[記録](design/evidence/ux-106-2026-10-05.md)。

## 2026-10-05 一覧の詳細リンク修正

保険報告・請求・保証／保険満了案内の物件名を、物件一覧と同じリンクへ統一。Dev Hosting反映・型検査・ビルド・governance・35配信資産一致確認済み。[記録](design/evidence/ux-106-2026-10-05.md)。

## 2026-10-05 満了案内の対応対象固定

Dev Hosting反映済み。保証は未案内固定、保険は満了日によるアラート対象固定。両画面の検索欄を撤去。153試験成功・2既存スキップ、型検査・ビルド・governance成功、公開35資産一致。[記録](design/evidence/ux-106-2026-10-05.md)。保存・終了後に再読込して画面確認。

## 2026-10-05 保証満了案内の検索整理

Dev Hostingへ反映済み。案内状態だけで絞り込み、他画面の検索条件を送信しない。152試験成功・2既存スキップ、型検査・ビルド・governance成功、35公開資産一致。[検証記録](design/evidence/ux-106-2026-10-05.md)。実画面の受入は保存後の再読込で確認。

## 0.1.106 保険報告カード

同日、カード内・ダイアログの操作ボタンを標準flat／outlinedへ調整しDev Hosting反映・配信資産照合済み。見た目の受入は保存・終了後の再読込で確認する。

2026-10-05、Dev Hosting反映済み。初回未報告・更新対象月・次回不要を区別し、保証／保険の文言を明確化。保存データ・キャッシュ設定は不変。[検証記録](design/evidence/ux-106-2026-10-05.md)。編集ダイアログを保護するためChromeは再読込していない。保存・終了後に再読込し確認する。

## 0.1.105 年月選択・物件一覧

2026-10-05にDev Hosting反映・年月選択と物件一覧の実画面確認を完了。年月ピッカーは月選択のみで確定し、一覧は申込日→引渡日、保証期間の下に保険期間または未報告、物件名リンクから詳細を開く。データ書込み・初期化なし。全7ゲートの今回結果と再利用根拠は[検証記録](design/evidence/ux-105-2026-10-05.md)。Devの本登録による動作確認は実施可能。ユーザー入力済みデータを再初期化しない。

## 2026-10-05 HS本番利用確認フォーム

オーナー指定の①の説明文へ差し替え、②〜⑥は承認された案で新規作成。タイトル「白蟻保証システム　本番利用に向けた確認」。[編集画面](https://docs.google.com/forms/d/1JRGBj3_0kHrjDqbx-O_RqZ80Z_qexL_icRLazXysEzs/edit)。既存の9月作成フォームは変更していない。

①管理者名・メール（別の短文欄）、②最終保証満了の案内、③保険満了一覧の用途、④請求単位、⑤請求一覧の既定表示、⑥過去未請求分。②〜⑥は未定・相談したいを含む単一選択、最後に共通の任意補足欄。計8入力欄。①〜⑥の回答欄は必須、補足は任意。パスワードは収集しない。

同日、オーナー指示で②③の説明末尾へ具体例を追記。②は最長20年の初回10年満了と最終20年満了（最長30年も同様）、③は5年目・10年目で延長なし・10年目で20年まで延長済みの比較。公開回答画面で追記を確認済み。選択肢・共有設定は変更なし。Drive内のファイル移動は未実施。

同日の追加承認により、過去データの確認5問を⑦〜⑪として追加。⑦登録対象（番号のみの空欄行とテスト行を除外）、⑧HSC/SHS/UH別の不足情報・日付対応とUH全件の引渡日追記依頼、⑨等級と20/30年上限の対応案・断熱材、⑩過去請求状態、⑪UHの所属とコード相違の具体例。5年保証の有無は再質問していない。追加は必須の段落回答で、確認中・補完予定も記入可能。既存8入力欄を保持し計13入力欄。公開画面で⑦〜⑪の順序、説明、入力欄を照合済み。Google Formsの説明欄では表の内容をグループ別の見出しと段落に展開した。URL・公開範囲は不変。元シート・DB・アプリの変更、試験回答、HSへの送信なし。ここで提示した対応案はHS回答前であり、確定仕様へは昇格させない。

ブラウザの編集画面・回答プレビューで文面と選択肢を照合済み。回答メール自動収集なし、1回限定のGoogleログイン要求なし、回答結果の概要共有なし。公開範囲についてオーナーの明示承認を得て、2026-10-05に「リンクを知っている全員が回答できる」設定で公開済み。[HS共有用の回答画面](https://docs.google.com/forms/d/e/1FAIpQLSdAGaTs20iD3zMPwrjviQ1Ct3GP6qzj9SsY4cLhDxwXNCehmg/viewform)。未ログインのブラウザで質問・入力欄・送信ボタンが表示されることを確認。試験回答・HSへの送信なし。回答内容は未受領・仕様として未採用。

## 0.1.104 Dev反映・過去データ入力準備

2026-10-05、延長請求開始月と過去初回保険の対象月基準をFunctions・Hostingへ同時反映済み。全7ゲート成功。オーナーの今回の明示指示で、Devの物件／保証31件、工務店6件、支店2件、採番7件、関連処理記録120件を初期化。保証グループ7件、Auth／staffAccounts各3件、設定1件は内容を保持し前後照合済み。[配備・初期化記録](design/evidence/dev-reset-104-2026-10-05.md)、[実装記録](design/evidence/implementation-104-2026-10-05.md)。Prodと原本データは変更していない。

今回専用の `scripts/reset-dev-business.mjs` は既定で読取のみ。実行には `--apply --confirm-project termite-warranty-dev --expected-plan <直前照合のSHA-256>` が必要。未知コレクション、下位コレクション、工務店アカウント等の依存データ、照合後のデータ変化があれば停止する。保持データや認証秘密をファイルへ出力しない。削除は複数操作で原子的ではなく、失敗時は読取照合で残件を判断する。今回削除した試験データのバックアップは作成しておらず、コード差戻しで復元はできない。新しく入力を始めた後の再初期化には別途承認が必要。

## 0.1.103 取消説明・アラート表示

実装・全7ゲート・Dev Hosting反映・実画面確認完了。保証・保険カードを既定へ戻し、全v-alertをcompactにした。UX102-4はユーザー確認済み。Dev Hostingのみの変更で、確認データは保持。[検証記録](design/evidence/ux-103-2026-10-05.md)、[残り2件の確認手順](runbooks/local-acceptance-2026-10-03.md)。

## 0.1.102 カード集約・確認データ

保証期間に請求、保険カードに保証ごとの前半／後半を集約。Hosting配備・画面確認完了。全7ゲート成功、公開資産35件一致。[検証記録](design/evidence/ux-102-2026-10-04.md)、[準備不要の確認手順](runbooks/local-acceptance-2026-10-03.md)を参照。専用の架空グループ・工務店・物件3件をDevへ作成済み。将来の報告は表示確認用の模擬状態。既存データ・アカウントは変更していない。


## 0.1.101 区間単位の請求・報告・取消

Dev配備・開発側確認済み。propertyPrototype＋Hostingの配備exit 0、hint表示追修正のHosting配備もexit 0。公開資産35件一致、Dev設定・未認証拒否を確認。新規架空物件1件で請求・報告・延長の順次取消後に引渡日訂正できることを実画面確認。既存受入データ変更なし。機能部分は開発側確認完了、UI/UX差分はユーザー確認待ち。

オーナーが実装とDev反映を承認。[保存契約](design/meeting-prototype-2026-10-03.md)、[検証・配備状況](design/evidence/lifecycle-101-2026-10-04.md)、[差分受入手順](runbooks/local-acceptance-2026-10-03.md)を参照。旧データの一括移行はせず、旧請求は要確認・不足する旧保険履歴は個別確認。FunctionsとHostingを揃えて反映する。下記の文書のみ／未実装表記はそれぞれの時点の履歴。

## 2026-10-04 状態遷移の追加採用・設計確認中

[仕様書](specification.md)に案内対象日の整合、報告区間の明示、新規／延長単位の請求状態、請求済み・延長依存の保険報告済みの延長取消禁止、全体取消の影響表示を実装待ちとして記録。引渡日訂正は初回分も含む有効な報告・請求・延長を逆順に戻せば可能とする。処理経験だけの恒久ロック案は撤回。外部訂正はHSが管理する。今回アプリ・データ・配備変更なし。下記0.1.100のDev動作へ新しい制御が入ったとは扱わない。

## 2026-10-04 UX-R07受入と状態遷移レビュー

UX-R07はユーザーOK。Devは0.1.100のまま。サブエージェント3名と[状態遷移・外部業務との境界](design/state-transition-review-2026-10-04.md)を読み取りレビューし、案内対象日・報告対象区間・請求単位・対外訂正の不足を未採用案として整理。アプリ変更・配備・Devデータ変更なし。C12保留、全体受入完了ではない。

## 0.1.100 — 2026-10-04 案内取消の文言と整合性確認

「未案内に戻す」、タイトル「保証満了案内を取り消す」、影響説明をv-alertへ変更。延長取消の既存復元動作の追加試験。全7ゲート成功、Dev Hosting反映・実画面確認済み。[記録](design/evidence/ux-100-2026-10-04.md)。業務仕様・未確定事項の変更なし。

## 0.1.99 — 2026-10-04 案内状態・取消配置

カレンダー、報告/請求カード、延長配置はオーナーOK。保証満了案内の状態と操作を直近保証行へ集約し、全体取消を右上の色付きボタンへ変更。Dev Hosting反映・実画面確認済み。全7ゲートexit 0。[記録](design/evidence/ux-099-2026-10-04.md)。保証上限到達時の保証/保険アラート除外はHSC-036で確認、抽出条件は不変。全体進捗の加点なし。

## 2026-10-04 UX-R追加改修0.1.98

Dev Hostingのみ配備済み。全7ゲートexit 0、公開HTML・35参照ファイルの一致、Dev接続先と未認証Callable401を確認。実画面で配色、報告/請求詳細input 0・閉じるのみ、延長操作配置を確認。データ更新・Functions/Rules変更なし。UX-R01/R06はオーナーOK。[記録](design/evidence/ux-098-2026-10-04.md)、[差分確認手順](runbooks/local-acceptance-2026-10-03.md)。請求年月・未請求管理と保険満了一覧用途は再確認待ち。

## 2026-10-04 UI/UX改修0.1.97のDev反映

`termite-warranty-dev` のHostingのみを配備し、公開HTMLと35参照ファイルの一致、Dev接続先、未認証Callable401、日付入力・選択・案内／取消画面を確認。7ゲート成功、既存データ維持、Prod・Functions・Rules配備なし。[検証・変更ファイル・配備記録](design/evidence/ux-097-2026-10-04.md)、[再確認手順](runbooks/local-acceptance-2026-10-03.md)参照。U07/U09はOK、UI/UX差分6項目はユーザー再確認待ち。C12保留、請求先単位はHSC-010で後発確認。

## 2026-10-04 Dev単独機能受入の完了

オーナー指示により、Codex単独で実施可能な残9区分を0.1.96のDevで確認し受入完了。[判定・実測・残る共同確認](design/evidence/extension-undo-dev-2026-10-04.md#2026-10-04-単独実施分のdev受入完了)、[最新の手順書](runbooks/local-acceptance-2026-10-03.md)を参照。新たな改修・再配備なし。メール／権限別ログイン、別タブ認証、通信遮断の共同確認とユーザーの業務・UI/UX受入は残る。Prod承認ではない。


## 2026-10-04 Dev 0.1.96 延長取消と機能検証

Hosting／propertyPrototypeをDev配備済み。必要7ゲートすべてexit 0、公開成果物・認証境界一致。HSの理由付き延長取消、保険保持、請求除外を実画面確認。[実測結果・残件・配備指紋](design/evidence/extension-undo-dev-2026-10-04.md)、[担当別の受入現在地](runbooks/local-acceptance-2026-10-03.md)を参照。Codex機能試験は部分完了、ユーザーは業務フロー・UI/UX担当。Devの専用QA1004データを追加し、既存受入データは保全。アラート設定は元の2か月へ復元。Emulatorは試験終了時に停止。Prod、実メール、初期化なし。

取消履歴を理解しない旧版へ単純に差し戻すと請求行が復活するため、障害時は延長／請求操作を止め、互換性を保持する修正版で復旧する。


## 2026-10-04 Dev機能受入の担当・承認

Dev機能検証はCodex、想定業務一巡のUI/UX確認はオーナーが担当。機能不具合の改修→Dev配備→再検証は明示的に事前承認済み。Prod・新規業務仕様の独断決定・既存データ初期化は対象外。確認に専用の架空データを使用。A13-R・A15-RはユーザーOK。[受入手順](runbooks/local-acceptance-2026-10-03.md)に実施状況を集約する。

## 2026-10-04 仕様書0.1.95のDev配備

オーナー「Devに反映」により、`termite-warranty-dev` のHostingと`functions:propertyPrototype`を配備済み。コマンド `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only functions:propertyPrototype,hosting --non-interactive` はexit 0。データ／Auth／採番の変更・初期化、Firestore設定配備なし。全7ゲート成功、公開成果物一致・Firebase接続先Dev・未認証Callable401を確認。実画面のユーザー再確認は未実施。

対象は入力Snackbar、工務店Autocomplete、同名同住所判定廃止、年月のみの保険報告、完了Snackbar、保証満了表示、上限選択制限、履歴ダイアログ。既存のアカウント・データは保持。A13の当初の保存原因は未確定のまま、上限20年選択不可とサーバー拒否を再確認する。[検証・配備記録](design/evidence/autocomplete-validation-2026-10-04.md)、[成果物指紋](design/evidence/dev-release-095-2026-10-04.json)、[受入手順](runbooks/local-acceptance-2026-10-03.md)参照。以下の未配備記述は配備前の履歴。

## 2026-10-04 ローカル追加修正（Dev未配備）

画面上部の入力エラーSnackbar、工務店Autocomplete、同名同住所判定廃止に加え、A05〜A10の年月のみ抽出・完了Snackbar統一・保証満了表示、A13の上限選択制限・A15の履歴ダイアログもローカルのみ。Devは直下の0.1.92配備状態を維持。次の配備ではHostingとFunctionsの双方が対象。データ初期化・スキーマ移行は不要。[検証記録](design/evidence/autocomplete-validation-2026-10-04.md)を参照。

## 2026-10-04 A02-R入力検証修正版のDev配備

ユーザーの「Dev反映して」により、入力検証・画面別エラー表示の修正版をHostingへ配備。`node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only hosting --non-interactive` はexit 0。公開HTML200と参照アセット36件が検証済み成果物に一致。Firebase設定Dev・未認証Callable401。データ／アカウント／採番・Functions・Firestore設定は変更しない。詳細は[A02-R証跡](design/evidence/a02-r-input-validation-2026-10-04.md#a02-r修正版のdev配備)。全7ゲート成功、ユーザーの再確認待ち。次の操作はブラウザ再読み込み後のA02-R（8桁エラーの表示箇所・7桁訂正後の保存）。

## 2026-10-04 Dev接頭辞のデータ訂正

オーナーの明示依頼により、保証グループ4件を読取確認し、末尾ハイフン付き2件のみを訂正した（HSC-→HSC、SHS-→SHS）。対象はtermite-warranty-devのwarrantyGroups。通常画面の接頭辞・年度開始月の変更禁止は維持する。発行済み番号、年度開始月、採番カウンター、他のグループ項目は変更せず、更新日時のみ通常の更新情報として更新した。

実行：`node --check tmp/cleanup-dev-prefixes.mjs`、同スクリプトの読取計画、`node tmp/cleanup-dev-prefixes.mjs --apply --confirm-project=termite-warranty-dev` はそれぞれexit 0。重複なしと訂正前後の番号生成一致を確認し、トランザクションで読取計画と再照合して更新。更新後は全グループを再読取し、対象接頭辞・更新日時以外の同一性、発行済み番号とカウンターの不変を確認した。対象2件の原値は上記のとおり。復旧が必要なら対象の現在値を再確認し別承認で戻す（コードの旧版配備は不要）。

アプリ・スキーマ・配備物は変更なし。直前の全7ゲートのアプリ検証証拠は不変のため再利用し、今回の限定データ訂正は構文確認・読取計画・生成値同一性・更新後比較で検証。文書更新はgovernance-checkを実行する。実データの内容はログ・文書へ転記せず、接頭辞の訂正結果のみ記録した。

## 2026-10-04 Dev受入フィードバック配備

追加指示「Devへの反映実施」「手順書に検証結果を追記」に基づき、検証済み作業ツリーのFunctionsとHostingをtermite-warranty-devへ配備。CLI終了コード0、Functions15件更新、Hosting1,024ファイル公開。Firestore Rules/索引、登録済み物件・アカウント・マスタ・採番の変更／初期化は行わない。Prod・Git pushなし。

公開確認はHTTP200、HTMLと参照JS/CSS等33ファイルが手元成果物に一致、Firebase設定もDev。未認証propertyPrototypeは401。配備前の全7ゲートも個別exit 0。[実行証跡](design/evidence/dev-acceptance-a00-a04-2026-10-04.md#2026-10-04-dev配備の実行記録)と[配備指紋](design/evidence/dev-release-2026-10-04.json)を参照。

[Dev受入手順](runbooks/local-acceptance-2026-10-03.md)は全34項目に結果列を追加し、A04までの操作報告と修正4項目の再確認を分離。ブラウザ再読み込み後に修正版を確認する。手動受入完了は未確認。旧版へ戻す場合は画面／Functionsを揃え、新しい支店住所と接頭辞書式への影響を調べる。データ削除・巻戻しは別承認。

## 2026-10-03 Local Hierarchy Checkpoint — Historical, Before Deployment

The hierarchy and company/branch disable changes are local only; see the [contract](design/meeting-prototype-2026-10-03.md) and [verification evidence](design/evidence/meeting-prototype-2026-10-01.md#2026-10-03-hierarchy-management-checkpoint). No hosted data/account changes or deployment were performed. Existing branch group overrides remain stored but the new command ignores them; company `defaultGroupId` remains the storage key. Do not deploy or migrate these changes as part of requirements Q&A. Finish Q&A first; rollback constraints are recorded in the contract.

## 2026-10-01 Additional Alert / Optional Handover Changes — Historical

The subsequent [meeting-contract additions](design/meeting-prototype-2026-10-03.md) were separately approved for Dev deployment by the owner and deployed successfully on 2026-10-01. This second deployment includes the configurable alerts and optional handover dates for every group. No reset or account change was performed. Settings are stored at `prototypeSettings/alerts`; absent settings default to two months. The reset script now recognizes this collection but was not executed. Existing accounts/data are preserved. Verification results follow in the meeting evidence. The existing 28-matter PDF and presentation guide precede these additions and are historical snapshots pending a requested regeneration.


## 2026-10-01 Meeting Prototype — Historical Checkpoint

The application now follows the [meeting prototype contract](design/meeting-prototype-2026-10-03.md), superseding the old case/shared-company-account UI described below. [Verification, reset and deployment evidence](design/evidence/meeting-prototype-2026-10-01.md) records exact commands and results. The owner separately approved Dev deployment on 2026-10-01; Hosting, Functions and Firestore deployment completed with exit 0. The public login screen and exact Hosting HTML artifact match were confirmed. Authenticated remote business-flow smoke remains unverified.

The owner-requested Dev reset has executed successfully: two verified retained administrators, three initial warranty-group settings, zero companies, branches, company users and business records. Retained passwords were not changed. Do not rerun reset after the user begins preparing presentation data without checking the requested scope. The tool is `scripts/reset-meeting-prototype.mjs`; default mode is read-only inventory, `--apply --confirm-project termite-warranty-dev` is the destructive, authorized test-data path. Supply the two owner-confirmed emails through command arguments, not committed configuration. Unknown collections or mismatched administrator roles abort the reset. Deleted disposable test data is not recoverable by reverting code.

For local verification only, start the approved Emulator Suite and Nuxt server, then use `node scripts/seed-meeting-emulator.mjs` to prepare two fictional administrators and three groups. The script does not create business fixtures. Its fictional credentials are local-only. Stop project servers after testing. Both the local development server and emulators were stopped and their ports verified free at this checkpoint.

Deliverables: [unresolved matters and presentation flow](../deliverables/meeting-2026-10-03/README.md). These PDFs were not sent externally. The approved deployment used the verified Hosting artifact and current Functions/Rules/indexes against Dev only. Production remains separate and unapproved. Older seed scripts describe historical prototype fixtures and should not be used to prepare this presentation.

## Earlier Availability Records (superseded in overlapping meeting-prototype scope)

2026-10-01 target change: ADR 0034 adopts company new registration and warranty extension without HS per-submission approval. HS account issuance remains. The deployed review workflow described below is unchanged; direct registration/extension, pending-item migration, duplicate protection and revised company-scoped access are not implemented. Do not operate the prototype as if the new workflow were available.

- On 2026-09-29 the permanent one-warranty-per-property model was approved in [ADR 0033](decisions/0033-permanent-property-warranty.md). It is not implemented or deployed. The current Firestore data contract describes the prior runtime; no warranty numbers are assigned or migrated by this specification checkpoint. Do not use the existing extension flow as evidence of compliance with the newly confirmed model.

- Local postal UI retry on 2026-09-28 completed the previously interrupted property save/reload checks (autofill with correction, no-match/manual entry, and candidate selection), plus bounded desktop/narrow-screen and keyboard smoke. See [TR-009 verification and screenshots](design/tr-009-japan-post-postal-data.md#successful-ui-retry-2026-09-28). This local evidence does not update the deployed revision or claim formal accessibility acceptance.

- Implemented locally: warranty calculations and N-Gram generation, a Nuxt/Vuetify SPA, Firebase Authentication emulator login, authentication-focused Firestore rules, synthetic seed data, callable Admin SDK atomic case/first-warranty registration and applied-warranty management, role-bounded staff-account management, required case application/handover dates with protected handover-to-warranty-start auto-fill, inclusive application/handover date-range case filters with reversed-bound rejection, button-triggered create/edit dialogs for four masters and cases, required property building area, required warranty-service type and case filtering by that type, dedicated master and case detail routes with list-return/not-found handling, construction-company/homeowner/warranty-service linked-property detail display, account-owned construction-company email display, construction-company and homeowner address/contact fields with digits-and-hyphens TEL/FAX validation, four-master quick creation that preserves the case draft, property-defaulted and independently editable case homeowner/company references, non-propagating property-party edits, transactional active-case editing, bounded freshest-20 unfiltered case/master lists, complete collection matching with 20-record client-side pages while a condition is active, dialog-based case filtering, six-character warranty-service short names, parent-case warranty list projections, current-master case-list joins, dashboard alert evaluation and icon-labelled Navigation Drawer, application-managed reversible CRUD for four masters, retained pre-approval construction-company new-case withdrawal, Clear Sky Vuetify theme styling, Vuetify date selection, and a zero-network provider-neutral postal-lookup seam with stale-response protection for future property/homeowner/construction-company integration.
- Japan Post postal lookup is deployed to `termite-warranty-dev` through the official UTF-8 source transformation: 124,522 normalized records, 948 checksummed same-origin shards, manifest schema/count/integrity checks, candidate selection, manual fallback, and stale-response protection for property/homeowner/construction-company forms. Revision `1d113e5b3e719679ed8d7d82ac3c313b0e6daf71` passed push verification in [run 35303358082](https://github.com/shisyamo4131/termite-warranty/actions/runs/35303358082) and was deployed by workflow dispatch [run 35303604261](https://github.com/shisyamo4131/termite-warranty/actions/runs/35303604261), including Firestore, Functions, and Hosting. Public smoke verified `/` HTTP 200 and manifest plus representative shard `001`/`500`/`999` counts and hashes. On 2026-09-18, authenticated Dev UI smoke as `デモ管理者` verified `1000001` autofill (`東京都`/`千代田区`/`千代田`) in property, homeowner, and construction-company registration dialogs, homeowner manual correction to `テスト手修正`, and `0287302` candidate selection (`岩手県`/`八幡平市`/`松尾寄木`); all dialogs were canceled without a save action, homeowner/company lists were observed without test records, and property persistence was not independently rechecked. Responsive/layout and accessibility acceptance remain unverified.
- Development environment provisioned and technically deployed: Firebase project `termite-warranty-dev`, web app `TermiteWarranty Dev Web`, Hosting site `termite-warranty-dev`, email/password Authentication, and default Firestore in `asia-northeast1` (Tokyo). Revision `503d062bb250e2cf0ea997d38fb0650c073f208c` was deployed by successful [GitHub Actions run 34821560953](https://github.com/shisyamo4131/termite-warranty/actions/runs/34821560953) on 2026-09-14 after all seven comprehensive gates passed. Authenticated read-only Dev smoke confirmed the responsive warranty-service table with separate type, short-name, and standard-period columns and successful detail navigation. Revision `98cdd7734f44a31bb8bdf74a2cd0fe29f7ed3824` was deployed by successful [GitHub Actions run 56](https://github.com/shisyamo4131/termite-warranty/actions/runs/34803205002) on 2026-09-14 after all seven comprehensive gates passed. Authenticated read-only Dev smoke confirmed the developer-superuser staff-account screen and its one-record Callable result, the freshest-20 case-list state, and the dialog-based case filters including condition initialization. Revision `6ba80c8046fc6e997026d872b6355f0860b6da1c` was deployed by successful [GitHub Actions run 51](https://github.com/shisyamo4131/termite-warranty/actions/runs/34797020809) on 2026-09-14 after all seven comprehensive gates passed. Authenticated Dev smoke confirmed compact one-line case-list guidance, the common list-card layout, right-aligned title actions, simple property/warranty-service list titles, all three migrated warranty short names, and the required short-name plus optional-notes warranty form fields. Revision `6243b368b0a8627e39a6b2e351367c04da45e9eb` was deployed by successful [GitHub Actions run 46](https://github.com/shisyamo4131/termite-warranty/actions/runs/34760321811) on 2026-09-13 after all seven comprehensive gates passed. It includes an initially closed compact Navigation Drawer and the same-site Japanese password setup/reset handler at `/auth/action`; a post-deploy request with a synthetic invalid code displayed the expected Japanese invalid-link guidance instead of the login screen. The Firebase Authentication configuration still reports the global action URL as `https://termite-warranty-dev.firebaseapp.com/__/auth/action`. On 2026-09-13, both Firebase Console and the official Identity Toolkit Admin API rejected an attempted change to `https://termite-warranty-dev.web.app/auth/action` with `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`, although `termite-warranty-dev.web.app` is an authorized domain. A Firebase Support case requesting investigation and application or enablement of the desired callback URI was submitted the same day; the confirmation page displayed no case identifier. By 2026-09-18, Firebase Support had notified the project that the backend Dev Action URL was updated to `https://termite-warranty-dev.web.app/auth/action`. On 2026-09-18, the user confirmed that a new email opened the Japanese page, used the expected URL, completed password reset, and allowed login successfully. Support also explained a temporary internal policy affecting this configuration; that note does not change the application requirements. Revision `3a59f1110f6eba54bae3de42fb32206ed3b5f0df` was successfully deployed to `termite-warranty-dev` by [GitHub Actions run 35297212067](https://github.com/shisyamo4131/termite-warranty/actions/runs/35297212067) on 2026-09-18 after all workflow verification steps succeeded. The deployed revision includes the username/password-manager form UX change. On 2026-09-18, Chrome associated and saved the generated reset password with the correct account email as intended. The preceding revision `348cfa55e13ec1da6b60b962679753d561572727` replaced transient page-width operation alerts with the shared bottom snackbar. The user confirmed in Dev that construction-company account issuance and disable state were displayed correctly and that a construction-company account could sign in; email-address verification is not required by the current specification. Authenticated, read-only Dev smoke for the preceding detail revision confirmed drawer icons for every main item and the portal group/submenus; `担当物件` with linked properties and account-derived email fallback on the construction-company detail; the absence of a company-email field from its edit form; `所有物件` with linked properties on the homeowner detail; and `対象物件` with the currently active linked property on the warranty-service detail. The first deployment of this detail expansion exposed a collection-group Rules mismatch; revision `35e2d53` added the required recursive `appliedWarranties` read match without broadening access beyond enabled staff, and the repeated smoke confirmed the error was resolved. The earlier portal split remains verified: `工務店管理ポータル` displays `通知管理` above `アカウント管理`, both links open separate screens, and `/company-portal` redirects to notification management. The portal response workflow was subsequently accepted as the initial scope; real email delivery and scheduled renewal generation remain incomplete. Earlier authenticated Dev smoke for revision `7843ebcf179ba0f69a59e82c449115cd84d257d7` confirmed the manual/unconnected homeowner entry, normal property address fields, and construction-company exclusion from postal lookup without writing data.
- The construction-company portal response workflow is accepted and deployed to Dev. Its `notificationOutbox` records are demonstrators, not delivered email. Do not present a queued record as sent, and do not use actual construction-company or homeowner data in the developer-owned environment without the existing confidentiality approval.
- HS branch management is excluded by HSC-033; removal of existing prototype branch fields remains pending. Planned but unavailable: production Firebase provisioning, monitoring, and backup/recovery implementation. Monthly Japan Post source checks remain manual; save/persistence, responsive/layout, and accessibility acceptance for the generated lookup remain unverified, while Dev publication, public smoke, and authenticated lookup smoke are recorded above. FileMaker data migration and cross-service cutover are not in scope. HSC-020 records the adopted production ownership, environment separation, deployment, monitoring, backup, and recovery plan; project creation, settings, credentials, and implementation remain pending.
- Production operations: House Solution owns and contractually controls the production Firebase/Google Cloud project and billing. Provisioning may use a temporary HS-supplied account, followed by HS password change, session revocation, and credential destruction. Ongoing maintenance uses individually assigned least-privilege Google accounts; routine maintenance has no project-deletion permission. If Firestore is selected under HSC-022, production Firestore and Functions use `asia-northeast1` and production uses Blaze. WIF is preferred for environment-fixed Dev/Prod workflows after Firebase CLI verification, with restricted key fallback if needed. HSC-020 targets 7-day Firestore PITR, 30-day daily managed backups, weekly/important-change Auth exports retained 30 days, 24-hour maximum data-loss window, 4-hour business-hours critical restoration, and email alerts at stated availability/error/deploy/backup/export/budget thresholds. These targets are not yet configured or verified.
- Data responsibility: House Solution has operational authority and is the final decision-maker for business data, including approved access, correction, retention, and deletion. House Solution administrator approval is required for output. Developers and construction companies may not perform unilateral bulk export or deletion. Development/maintenance providers act only under House Solution instruction; House Solution production ownership and operations are resolved under HSC-020, while Google/Firebase provider contract terms, contracting details, region/subprocessors, and termination conditions remain unconfirmed under HSC-025. Contract termination requires House Solution to be able to receive necessary data and subsequent provider-copy deletion within the contractually specified period; no initial-release export feature is approved by this record.
- On 2026-09-14 after run 56, `npx firebase functions:list --project termite-warranty-dev` exited 0 and reported 13 v2 callable functions in `asia-northeast1` on Node.js 22: `addAppliedWarranty`, `createConstructionCompanyAccount`, `createNewCaseWorkItem`, `createRenewalWorkItem`, `createStaffAccount`, `listManageableStaffAccounts`, `registerCase`, `reviewCompanyCaseWorkItem`, `setConstructionCompanyAccountEnabled`, `setStaffAccountEnabled`, `updateAppliedWarranty`, `updateCompanyCaseWorkItem`, and `updateStaffAccount`. The approved remote deletions of `createMaster`, `updateMaster`, `setMasterActive`, and `getOwnProfile` remain absent. Staff profile state is read through the Rules-governed live Firestore subscription. Source removal alone does not authorize remote deletion; inventory and deletion remain separate deployment approvals.

## Preparation

- Use Node.js 22, Java 21, and the exact npm version recorded in `packageManager`. Install with `npx --yes npm@11.19.1 ci`.
- Start `npm run emulators:start` in one terminal. Its npm lifecycle first runs the canonical `npm run prepare:functions` command and verifies the generated Functions domain copy. In another terminal, run `npm run emulators:seed`, then `npm run dev`. Direct Firebase CLI Emulator startup is not a supported prepared path.
- Dedicated local ports are Nuxt 23600, isolated UI workbench preview 23610, Auth 29099, Firestore 28080, Functions 25001, Emulator UI 24000, Emulator Hub 24400, and Emulator Logging 24500. These values are intentionally separate from the normal and Codex-test ports declared by the colocated `AirGuardV2` project; `AirGuardV2` keeps priority if a future conflict is discovered. Before starting either stack, inspect current listeners and do not retarget the other project.
- The seed is exact-endpoint- and `demo-*`-restricted and creates only synthetic names, dates, and the documented synthetic login. An unset Auth or Firestore Emulator host is assigned this project's dedicated endpoint; any different pre-existing value is rejected before Admin SDK initialization, including another loopback port. Do not add real homeowner, property, account, credential, or customer data.
- The browser client uses the Emulator only on `localhost` or `127.0.0.1`. On Firebase Hosting it loads the same-site `/__/firebase/init.json` configuration and refuses any project other than `termite-warranty-dev`; no Firebase Web API key is stored in source files.
- Build the Hosting artifact with the registered `npm run build` gate; for this static SPA it runs `nuxt generate` and produces `.output/public/index.html`. The GitHub Actions workflow `Deploy Firebase development` runs all seven comprehensive gates on pushes to `main` and on manual dispatch. Only an explicit `workflow_dispatch` can start the dependent deployment job. The workflow uses the Node.js 24-based current action majors verified on 2026-09-14: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/setup-java@v6`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`, and `google-github-actions/auth@v3`; the project runtime installed by setup-node remains Node.js 22. The deployment job downloads the revision-bound Hosting artifact produced by the successful verification job, authenticates with the repository secret `FIREBASE_SERVICE_ACCOUNT_TERMITE_WARRANTY_DEV`, and deploys only to the explicit `termite-warranty-dev` target: `npx firebase deploy --project termite-warranty-dev --only firestore,functions,hosting --non-interactive`. It does not use `--force`; a required deletion, unsafe migration, minimum-billing increase, security change, or missing Artifact Registry cleanup policy fails closed for separate review and authorization. Configure an absent cleanup policy separately with the scoped Firebase Functions artifacts-policy operation before relying on unattended deployment; that external environment change is not performed by this repository workflow. On 2026-09-12, `npx firebase functions:artifacts:setpolicy --location asia-northeast1 --days 1 --project termite-warranty-dev --force` exited 0 and configured `gcf-artifacts` to delete container images older than one day. This policy concerns generated Functions container images only; it does not delete Firestore or application data. Do not create a default Firebase project alias. Development Functions use `asia-northeast1` and the SPA is served from `.output/public` with an `index.html` fallback. The service-account key is stored only as a GitHub Actions secret and must never be added to source control or logs. Before Functions deployment, Firebase predeploy invokes `npm run prepare:functions`; it stages and byte-verifies the shared modules from the sole authored `src/domain` source. The generated `functions/domain/` directory and temporary staging directories are never committed. Run `npm run check:functions-domain` for a read-only missing/extra/content-drift check.

## Normal Operation

The exact development account email identifiers confirmed by the project owner on 2026-09-15 are kept only in the repository-root local registry `.demo-accounts.local`, which is excluded from Git by the existing `*.local` rule. It records the demo administrator, demo general account, developer superuser, and demo construction-company account. Never commit that registry or add passwords, tokens, one-time codes, or other secrets to it. The private Gmail identifiers remain outside source control.

Use `demo.admin@example.invalid` / `Demo-only-password-123` only against the local Auth emulator. The local application URL is `http://127.0.0.1:23600/` and the Emulator UI is `http://127.0.0.1:24000/`. The deployed development application is `https://termite-warranty-dev.web.app/`; never use the synthetic local credential there. On 2026-09-12, both the deployed root and `/masters/construction-companies` returned HTTP 200 with `no-store, must-revalidate, no-cache`, and an existing authenticated browser session displayed the integrated freshest-20 construction-company table and its detail/lifecycle controls. This is technical smoke evidence, not House Solution acceptance. The seed creates only clearly named synthetic records, including six synthetic cases anchored to 2026-09-11 for local visual confirmation: two active alert cases, two active non-alert cases, one cancelled case, and one invalid case. Seed also rebuilds each synthetic case's parent list projection from its authoritative applied-warranty children. Because alert eligibility depends on the current date, rerun or intentionally revise the synthetic date set when this fixed anchor no longer exercises the alert UI. Unfiltered case and master screens show the freshest 20 records. Entering any condition switches the corresponding screen to complete collection matching; clearing every condition restores the freshest-20 subscription. On the case list, open the filter dialog, initialize its draft conditions, cancel without changing the active result, and apply one or more conditions. Open each master from the icon-labelled Navigation Drawer to verify its list, detail link, detail-to-list return, shared edit dialog, and name filter; verify that inactive records remain readable. On a construction-company detail, verify `担当物件`, its account email when issued, and the absence of a master email form field. On a homeowner detail, verify `所有物件`. On a warranty-service detail, verify that `対象物件` contains only active properties linked through active cases and active applied warranties. Every related-property name must link to its property detail. On the dashboard, open active, cancelled, and invalid cases; verify applied-warranty details, terminal reasons, active-only edit availability, return links, and the in-app missing-ID state. Verify that construction-company creation/editing requires name and the first four address parts and preserves optional contact fields. Editing a legacy construction-company record removes its old master `email` field; lifecycle-only changes preserve legacy fields until a normal edit. On the dashboard, register a case from the dialog with application, handover, and warranty-start dates; verify that property selection initially selects both homeowner and construction company and that either can be changed. Optionally create one of the four supported masters without losing the case draft, verify the case row and alert marker, exercise the search filters, and repeat the same date/property-default/override checks while editing an active case. Edit a property's homeowner and construction company and confirm the existing case retains both references. Stop the emulator and development-server processes with Ctrl+C when finished.

Pre-change local emulator documents without the required company/homeowner address fields or case dates remain readable. A normal company or homeowner edit must fill the required postal code, prefecture, municipality, and street/town-and-number fields; optional building name, TEL, FAX, and notes remain nullable. Clearing and reseeding the disposable emulator is the simplest way to obtain a fully current synthetic dataset; this is not a production migration or backfill procedure.

### Development pagination test data

The manually dispatched `Seed Firebase development pagination data` workflow creates 25 clearly fictional, one-to-one construction-company, homeowner, property, and active-case records only in `termite-warranty-dev`. Every case references its matching property, homeowner, and construction company and shares the fictional `ページ確認支店`, `ページ確認5年保証`, `ページ確認市`, and `not notified` values. Searching construction-company or homeowner names for `ページ確認`, or filtering cases by that branch, warranty service, municipality, or notification state, therefore yields at least 25 matching seed records and exercises the 20-record client-side pagination.

The workflow is manual-only, uses the development environment service-account secret, and invokes `node scripts/seed-development-pagination-data.mjs --apply --confirm=termite-warranty-dev`. The script is idempotent through fixed `development-pagination-*` document IDs, creates only missing records, rejects an existing fixed-ID record whose key values differ, and allocates case numbers and reservations with the existing counter in one transaction. A partial run may leave only its fictional masters; rerunning completes missing cases. No delete or rollback command is provided. If removal is later required, resolve and review the exact fixed-ID records, case-number reservations, child warranties, and counter impact as a separate destructive operation.

On 2026-09-14, revision `4f6dc952ab755af370c4ff8f59c5f280d9dd41a9` passed push verification in [run 58](https://github.com/shisyamo4131/termite-warranty/actions/runs/34804686099) and the complete manual deployment in [run 59](https://github.com/shisyamo4131/termite-warranty/actions/runs/34804919745). The action upgrade produced no Node.js deprecation annotations. The first manual pagination seed [run 1](https://github.com/shisyamo4131/termite-warranty/actions/runs/34805174612) created 77 master records and 25 cases, with zero pre-existing seed cases. Authenticated Dev smoke confirmed 25 matches, two pages, and five second-page rows for construction companies, homeowners, and cases. That smoke exposed timestamp-free branch names disappearing only after complete-mode filtering; revision `ff71f994f276f47455a2182425f2b96d60f9ee17` fixed the branch query, passed push verification in [run 60](https://github.com/shisyamo4131/termite-warranty/actions/runs/34805572284), and deployed successfully in [run 61](https://github.com/shisyamo4131/termite-warranty/actions/runs/34805839357). Repeated case filtering by `ページ確認支店` confirmed 25 matches, five second-page rows, and the branch name on every displayed row. Runs 60 and 61 also had no Node.js deprecation annotations.

On 2026-09-14, revision `952c8c3d74012b877ba1ef6f09c1e18b4927c76a` passed the complete push verification in [run 34809357174](https://github.com/shisyamo4131/termite-warranty/actions/runs/34809357174) and the complete manual development deployment in [run 34809583674](https://github.com/shisyamo4131/termite-warranty/actions/runs/34809583674). The deployment updated Firestore configuration, Functions, and Hosting in `termite-warranty-dev`. The development master-field migration was not part of the deployment and was run separately as recorded below.

On 2026-09-14, revision `653db791c508fbe42c00b02cba067619738e8533` passed the complete push verification in [run 34815401856](https://github.com/shisyamo4131/termite-warranty/actions/runs/34815401856) and the complete manual development deployment in [run 34815680673](https://github.com/shisyamo4131/termite-warranty/actions/runs/34815680673). This deployment includes the notification-guidance height fix, property-form field ordering, and five-record pagination for dependent lists on master and case details.

### Development master-field backfill

The development project requires a one-time backfill for warranty-service short name/type and property building area. Every existing development record is demonstrator data. The script assigns `warranty` when service type is absent, uses the existing short-name rules or the explicit fictional fallback `デモ保証`, and assigns `100` square metres when building area is absent or invalid. It does not change business-update metadata, notes, active state, or any unrelated field, and is idempotent. These arbitrary defaults are approved only for the development demonstrator and must not be reused for real data.

The script requires Application Default Credentials with Firestore access to the exact development project. Local use first runs `node scripts/migrate-development-master-fields.mjs` and reviews the JSON dry-run count, then applies only with `node scripts/migrate-development-master-fields.mjs --apply --confirm=termite-warranty-dev`. The manual-only GitHub Actions workflow `Migrate Firebase development master fields` uses the existing development service-account secret and invokes that exact apply command. Running the workflow is an external data write and requires separate approval. Rollback requires reviewed value-level corrections; reverting application code does not remove stored fields.

On 2026-09-14, Application Default Credentials were unavailable, so the Firebase Console was used as the approved fallback. The complete `warrantyServices` collection contained three documents. Each lacked `shortName`; each was updated with its existing `name` value, and the saved field was visibly confirmed. No other field or collection was changed.

The migration retains explicit corrections for the two repository-owned fictional demo records, `安心5年` and `長期10年`. Other overlong or missing demo short names receive `デモ保証`. This is a development-only data correction, not a Firestore Rules change.

On 2026-09-14, the approved migration [run 34810822372](https://github.com/shisyamo4131/termite-warranty/actions/runs/34810822372) completed against revision `4d171a3f34a59bd76fca874bde02523e5bb036ea`. It updated four warranty-service records and 36 property records, for 40 updates in total, with zero unresolved records. The immediate idempotency check [run 34810895043](https://github.com/shisyamo4131/termite-warranty/actions/runs/34810895043) completed with zero planned and zero applied updates for both collections.

For this initial mixed implementation, run each selected verification command separately and record its exit status: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:rules`, `node scripts/check-functions-syntax.mjs`, `node --check scripts/seed-emulator.mjs`, and `./scripts/check-governance.ps1`. `npm test` includes the local development-workflow contract, which proves that every comprehensive gate is a separate prerequisite and that deployment cannot bypass verification or rebuild the verified Hosting artifact. Functions syntax recursively discovers every deployable JavaScript module after preparation; syntax and Rules/Callable Emulator paths prepare the shared Functions domain automatically. For packaging diagnostics, run `npm run prepare:functions` and then `npm run check:functions-domain` separately. For later work, select only the gates required by every applicable class in the policy below.

## Verification Matrix

`governance/verification-policy.json` is the machine-readable source for class selection, stable gate IDs, stages, inclusion, invalidation, comprehensive fallback, and omission destinations. This document explains the same policy for humans. Classify all applicable rows before implementation. Mixed changes use the union of selected gates. Unknown or unbounded impact uses the comprehensive project suite. Use the commands and triggers already defined in the current JSON to select checks for the affected scope.

The same JSON is the sole runtime-profile authority for compatibility-sensitive migration work. Declare platform, PowerShell edition, executable, a non-exact version rule, required status, and support status; do not infer that an untested platform is supported.

Every literal `.ps1` path in a gate command must identify an existing script. The managed project validator's canonical path is `scripts/check-governance.ps1`.

| Change class | Path or impact triggers | Iteration checks | Targeted regression | Completion gates | Release-only gates | Omittable when unaffected |
| --- | --- | --- | --- | --- | --- | --- |
| `documentation-only` | Markdown, help text, indexes; no executable/config/data behavior | Project-defined direct docs gate IDs | Project-defined affected navigation gate IDs | Project-defined docs completion gate IDs | None unless packaging docs | application, UI runtime, data, governance, build/deploy |
| `ui-css-layout` | styles, templates, components, visual or interaction layout; no data-contract change | Project-defined focused UI gate IDs | Project-defined component/browser/visual/accessibility gate IDs | Project-defined UI completion gate IDs | Artifact/browser matrix only when releasing | data/schema/migration and governance gates when untouched |
| `application-logic` | executable business or integration logic | Project-defined focused static/unit gate IDs | Project-defined service/domain/integration gate IDs | Project-defined application completion gate IDs | Release artifact gates only when releasing | unrelated data, UI, governance, deploy gates |
| `data-contract-schema-migration` | schema, serialization, persistence meaning, compatibility, migration | Project-defined focused contract/schema gate IDs | Project-defined compatibility/migration/reader-writer gate IDs | Project-defined data safety and application gate IDs | Real migration/deploy gates only when authorized | unrelated UI and governance gates |
| `project-guidance-metadata` | descriptive project guidance, phase/progress, project metadata, links/history, GOV-DOC-only structure | Project-defined diff/static gate IDs | Project-defined narrow documentation gates | Project-defined narrow documentation gates | none | comprehensive, application, build, and runtime gates |
| `governance-permissions-agents` | common/managed governance or effective permission, approval, safety, authority, delegation/Git integration, callback semantics, active-task instruction, agent authority, managed sync, verification behavior | Project-defined syntax/render gate IDs | Project-defined governance/routing gate IDs | Comprehensive governance/repository gate IDs | Installation/publication gates only when authorized | unrelated product runtime gates unless governance changes them |
| `build-release-deploy` | build configuration, packaging, release, install, deploy target or procedure | Project-defined configuration gate IDs | Project-defined build/package gate IDs | Project-defined artifact/rollback gate IDs | Publish/install/deploy/environment acceptance gate IDs | unrelated product/data gates only when impact analysis proves exclusion |

<!-- BEGIN GENERATED VERIFICATION POLICY SUMMARY -->
- Root: schemaVersion=1.0; comprehensiveGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]; unknownImpactGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]
- RuntimeProfile: id=powershell; platform=windows; edition=PowerShell; executable=pwsh; versionRule=minimum-major=7; required=True; supportStatus=supported
- Class: id=documentation-only; triggers=[Markdown or documentation files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=ui-css-layout; triggers=[UI\, CSS\, or layout files]; iterationGateIds=[app-typecheck]; targetedRegressionGateIds=[app-typecheck]; completionGateIds=[app-typecheck,app-build]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=application-logic; triggers=[application source files\, functions\, or emulator seed logic]; iterationGateIds=[domain-test,app-typecheck]; targetedRegressionGateIds=[domain-test,app-typecheck,firestore-rules-test]; completionGateIds=[domain-test,app-typecheck,firestore-rules-test,functions-syntax,seed-syntax]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=data-contract-schema-migration; triggers=[Firestore rules\, indexes\, schema\, migration\, or data-contract files]; iterationGateIds=[governance-check,firestore-rules-test]; targetedRegressionGateIds=[governance-check,domain-test,firestore-rules-test]; completionGateIds=[governance-check,domain-test,firestore-rules-test]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=project-guidance-metadata; triggers=[descriptive project guidance and metadata files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=governance-permissions-agents; triggers=[governance\, permissions\, agent configuration\, or verification policy files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=build-release-deploy; triggers=[build\, dependency\, release\, or deploy configuration]; iterationGateIds=[governance-check,app-typecheck]; targetedRegressionGateIds=[governance-check,domain-test,app-typecheck,app-build]; completionGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Gate: id=governance-check; command=./scripts/check-governance.ps1; stages=[iteration,targeted,completion,release]; includes=[]; invalidatedBy=[any governance input\, policy\, configuration\, or managed artifact change]; evidenceDestination=task completion report
- Gate: id=domain-test; command=npm test; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[src/domain/**\, functions/local-runtime.js\, Functions domain/syntax/workflow contract helpers or tests\, .github/workflows/deploy-development.yml\, governance/verification-policy.json\, scripts/default-recovery.mjs\, scripts/lib/default-recovery*.mjs\, scripts/lib/recovery-controller.mjs\, operator tests\, package.json\, package-lock.json\, or the Node.js runtime changes]; evidenceDestination=task completion report
- Gate: id=app-typecheck; command=npm run typecheck; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[app/**\, nuxt.config.ts\, tsconfig.json\, package.json\, or package-lock.json changes]; evidenceDestination=task completion report
- Gate: id=app-build; command=npm run build; stages=[targeted,completion]; includes=[]; invalidatedBy=[application\, Nuxt\, dependency\, TypeScript\, or build configuration changes]; evidenceDestination=task completion report
- Gate: id=firestore-rules-test; command=npm run test:rules; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[firestore.rules\, firebase.json\, functions/**\, src/domain/**\, Functions domain preparation helpers\, data-contract\, emulator tests\, scripts/default-recovery.mjs\, scripts/lib/default-recovery*.mjs\, scripts/lib/recovery-controller.mjs\, app persistence\, or dependency changes]; evidenceDestination=task completion report
- Gate: id=functions-syntax; command=node scripts/check-functions-syntax.mjs; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[functions/**\, src/domain/**\, Functions domain preparation/check/discovery scripts\, scripts/check-functions-syntax.mjs\, or the Node.js runtime changes]; evidenceDestination=task completion report
- Gate: id=seed-syntax; command=node --check scripts/seed-emulator.mjs; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[scripts/seed-emulator.mjs or the Node.js runtime changes]; evidenceDestination=task completion report
<!-- END GENERATED VERIFICATION POLICY SUMMARY -->

### Gate Catalog and Inclusion

The exact marker-bounded summary immediately above is the generated gate catalog. It preserves commands containing pipelines without parsing Markdown table separators. Do not maintain a second manual gate table.

The inclusion graph must be acyclic and may not reference an unknown gate. When a selected parent gate preserves an included child's named result and exit status and fails when the child fails, do not invoke that child again as an unconditional separate command. A diagnostic run never satisfies a completion gate.

### 検証の進め方

全体試験の入口は従来どおり `npm run test:rules`。共有DB・Auth・Rulesを扱う試験群は直列とし、専用DBのみを使う一括取込みの2試験だけを別プロセスで重ねる。分離した試験は `(default)` など共有DBの取得とAuth操作を拒否する。準備・後始末の独立処理は最大4件ずつ実行し、失敗時も開始済み処理の終了を待つ。業務操作、競合試験、判定条件は並べ替えたり省略したりしない。

実行対象は `scripts/lib/rules-test-plan.mjs` で割り当て、`test/emulator/*.test.mjs` と `test/firestore*.test.mjs` の実ファイル一覧との欠落・重複を起動前に拒否する。両プロセスのexit 0、全対象ファイルでの実試験成功、skip・失敗・対象外実行なしを確認してから全体成功とする。片方の失敗でも他方の終了を待ってEmulatorを終了し、ポート解放を確認する。起動とFunctions生成同期は1回で、稼働中Emulatorへの接続を拒否し、一時CLI設定だけを使う。切り分け用の `npm run test:rules -- --serial` は同じ試験群を直列で実行し、自動再試行や失敗の成功扱いはしない。

以下は[共通契約の段階検証](../governance/common-governance.md#verification-selection-and-staging)を日常作業へ適用する手順。ゲートの選定・失効条件は上記の生成要約と[検証方針JSON](../governance/verification-policy.json)を正とし、必須検証や配備時の全体検証を減らすものではない。

1. 実際の変更面から該当クラスの和集合を選び、対象の試験・最終ゲート・再利用候補の証拠を確認する。小変更という理由だけでゲートを省かない。
2. 反復中は変更箇所の試験を先に実行する。保存・Callable・復旧整合を触る試験なら、純粋な入力変換の単体試験だけでなく、その追加／変更した結合試験と試験データ準備を対象にする。既存の安全な単独実行経路を確認して使い、なければ経路未整備として影響範囲の既存検証を使う。実データや稼働中Localを初期化して代用しない。
3. 対象試験の通過後に影響範囲の回帰検証、最終適用差分で選定された完了ゲートへ進む。対象試験は全体ゲートの代替ではない。失敗後は原因を直し、対象試験から確認して失効したゲートへ戻る。
4. 実行中は実行ツールの完了通知・状態を使い、通常は結果要約を確認する。詳細ログは失敗・停滞・判断に必要な差分がある場合に読む。ログ末尾の成功表示だけで完了とせず、各コマンドの終了コードを確認する。

対象試験の入口は `npm run test:rules:focused -- excel-dates`。現時点の許可対象はExcel日付の保存・受領値保持・全件棄却の結合試験1件で、自由なファイル名／試験名は受け付けない。Functions生成同期後、既定の専用ポートが未使用であることを確認して架空demoのEmulatorを新規起動する。利用統計を無効にした一時CLI設定を使い、終了時に削除する。ユーザーのFirebase設定は変更しない。稼働中Localや既存Emulatorへの接続・停止、データのimport/exportは行わない。ポート使用中・設定不一致は作業者へ報告し、既存プロセスを終了させて通さない。

子試験のexitに加え、対象ファイル・完全一致の試験名・成功1件・対象skipなし・当該実行の結果であること、Emulator終了後のポート解放を検査する。対象0件や異常終了は失敗。除外された他試験のskipは通常の絞込みとして区別する。この結果は反復中の証拠で、選定された全体の `npm run test:rules` を代替しない。対象追加時は独立した準備・後始末を確認し、兄弟試験に依存する場合は既存のファイル単位／全体検証へ戻す。

Dev配備の正式照合では、失敗時の `diagnostic.stage`／`reasonCode`、HTTP失敗時の数値 `httpStatus` を確認する。設定のオブジェクトキー順だけは同値として扱うが、項目・値・型・配列順の差、来歴・hash不一致、途中の版変更は引き続き拒否する。未知例外はunknown／blockedのまま。生の例外文・URL・設定値・認証情報は診断へ出さず、blockedを自動再試行して成功扱いにしない。今回の診断追加だけでは過去のHosting初回失敗の原因は確定しない。

### Evidence Validity and Retry

- 成功・件数は実行終了とexit 0を確認してから記録する。コマンドがexit 0でも個別判定がblocked／failedなら通過扱いにしない。
- 証拠は対象revisionまたは作業差分、変更分類、コマンド、結果・終了コードに結び付ける。再利用時は「証拠取得後の変更」とゲートの`invalidatedBy`を照合し、非該当の根拠を同じ完了報告に記す。変更範囲・環境が不明なら再利用しない。
- 後続変更で失効した証拠と失敗ゲートを再取得し、影響しない成功証拠は再利用する。例えば文書のみの追記はアプリ検証の失効条件に該当しなければ再実行を要しないが、文書用の最終governance-checkは確認する。テスト・生成物・依存・設定の変更は文書だけの変更として扱わない。
- 現行のゲート包含関係は生成要約の`includes`で確認する。似たコマンドや内部で同じ処理を呼ぶという理由だけで、別ゲートを満たしたとは扱わない。再利用・非選択の理由は記録し、既知の失敗を避けるためには省略しない。
- scaffold作成・governance移行・managed sync・共通契約／権限／agent-policy変更・release/deployの全体検証は維持する。

### 検証結果と文書の記録先

既存の作業別検証記録、またはタスク完了報告を詳細結果の記録先として選ぶ。コマンド別の結果・exit、対象差分、失敗と修正後の結果、再利用／非選択理由、未検証・残件をそこへまとめ、証拠だけの新しい台帳を増やさない。

仕様・保存契約は要求やデータ契約が変わった場合、ADRは永続的な判断が変わった場合、運用手順は操作や承認境界が変わった場合に更新する。ロードマップは範囲・完成条件・残件・検証済み進捗の変化と証拠リンク、changelogは利用者に見える変更を記す。索引や運用の現在地には必要な要約と詳細記録へのリンクを置き、同じコマンド表・件数・hashを各文書に転記しない。影響する正本の更新は省かず、無変更の文書を一律に更新しない。

## Migration Orchestration

範囲・進行は[仕様書](specification.md)と[ロードマップ](roadmaps/2026-initial-delivery.md)、実施条件は[共通契約のMigration Work](../governance/common-governance.md#migration-work)、検証は[Verification Matrix](#verification-matrix)を参照する。

## Git Integration

主リポジトリ、別worktreeの事前承認、差分保全、担当範囲の統合・外部操作の境界は[Git and Worktree Integrity](../governance/common-governance.md#git-and-worktree-integrity)と[プロジェクト規則](../governance/project-rules.md#project-specific-approval-and-safety-boundaries)に従う。

## Project Management Task Loop

委任範囲・終了条件・結果の統合は[Multi-agent Coordination](../governance/common-governance.md#multi-agent-coordination)、通知・待機・通知失敗時の停止は[Event-driven Checkpoints](../governance/common-governance.md#event-driven-checkpoints)を参照する。交代は[Task Replacement契約](../references/task-turnover-contract.md)に従う。

## Critical Identifier Preflight

[識別子の照合手順](runbooks/project-coordination.md#evidence-bound-identifier-gate)を参照する。パッケージ・環境・配備・データ等の識別子は、当該作業の正本または実対象で確認し、未確認・矛盾時は同手順の停止条件に従う。

## Governance Updates and Task Turnover

管理対象の所有・同期は[Instruction Ownership](../governance/common-governance.md#instruction-ownership)に従う。直接編集しない。ユーザー指示による交代は[Task Replacement契約](../references/task-turnover-contract.md)、通常起動は[Project Coordination Runbook](runbooks/project-coordination.md)を参照する。

## Coordinator Session Lifecycle

通常起動・手動復旧・交代は[Project Coordination Runbook](runbooks/project-coordination.md)を参照する。`容量チェック`／`タスク容量確認`／`セッション容量確認`／`session size / handoff threshold確認`は同書の[Session Capacity Routing](runbooks/project-coordination.md#session-capacity-routing)へ進み、対象タスクID・測定コマンド・閾値・報告・停止条件に従う。モデルのトークン容量とは区別する。

## Outputs

結果の報告内容は[Completion Gate](../governance/common-governance.md#completion-gate)、検証証拠の記録先は[検証ポリシー](../governance/verification-policy.json)を参照する。

## 2026-10-07 保証満了案内の上限判定修正

対象はオーナーが今回指示した保証満了案内の不具合だけ。`expiryAlertEligible`で保証の場合だけ現在年数＜最長年数を要求し、20/20・30/30を除外。10/20・10/30・20/30、案内開始境界／期限超過、有効状態／未案内を維持。保険判定・案内取消操作は変更しない。最長年数10は選択肢にも保存許可値にも追加せず、UH管理確定まで保留。改修はLocalのみで、Dev／Prod配備・実データの更新／移行なし。

### 変更ファイルと整合範囲

- 実装：`src/domain/property-warranty.mjs`。
- 試験：`test/property-warranty.test.mjs`、`test/emulator/property-warranty.test.mjs`。後者は実一覧取得から上限到達・取消・案内済みが除かれることと、読取で文書を更新しないことを架空データで検証。
- 文書：`docs/specification.md`、`docs/requirements/alerts-and-dashboard.md`、`docs/requirements/case-warranties.md`、HSC-036本体と台帳の対応行、`docs/design/meeting-prototype-2026-10-03.md`、`docs/design/uh-integration-proposal-2026-10-06.md`、`docs/design/README.md`、`docs/decisions/0033-permanent-property-warranty.md`とADR索引、`docs/roadmaps/technical-remediation.md`、`CHANGELOG.md`、本書。
- UH内部IDの関連付けだけを仕様・要件・既存ADRへ部分採用として記録。実取込・物理スキーマ・契約番号の一意性・原本保持期間・全訂正前データ保存は未確定。保存形状・API・移行を変えないため、新規データ契約や実データ移行なし。UI・権限・復旧手順・初期納品ロードマップ・ガバナンス設定は無変更で、進捗加点なし。
- 作業開始時から存在したバックアップ関連差分、HSC-015・受領資料・ルート文書索引等の差分は保持。新規UH検討資料も既存の未追跡状態を維持。今回Gitのstage／commit／pushは行わない。

### Local検証結果

分類はapplication-logic＋documentation-only。検証ポリシーの完了ゲート6件を選択。app-buildはUI・配備／ビルド設定の変更がなく、配備を実施しないため選択外。独立サブエージェント検証は今回の指示に含まれず実施しない。

| コマンド | 結果 | 独立した終了コード |
| --- | --- | --- |
| `node --test test/property-warranty.test.mjs` | 42成功 | 0 |
| `npm test` | 243件中241成功、既存Windows symlink制約による2スキップ、失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run test:rules`（下記のLocal環境指定） | 111成功、失敗0。追加の実一覧取得試験を含む | 0 |
| `node scripts/check-functions-syntax.mjs` | 28モジュールの構文検査成功。生成domainも同期 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 成功 | 0 |
| `git diff --check` | 成功 | 0 |

Rules試験の初回はFirebase CLIの通常configへのアクセス拒否で開始前にexit 1。既存運用指示に沿って`XDG_CONFIG_HOME`をプロジェクト内`tmp/firebase-config-notice`へ隔離し、`CI=true`で再実行。2回目は110成功／1失敗・exit 1で、既存バックアップ通知試験がGoogle環境検出のstderr警告をJSONとして解釈した環境依存失敗。試験・本体コードを変えず、インストール済み`gcp-metadata`の実装で確認した`METADATA_SERVER_DETECTION=none`をLocalコマンド環境にだけ追加し、最終3回目は111成功・exit 0。実アカウント設定・認証情報・外部サービス設定は変更しない。最終成功後、Emulator停止も確認済み。

差戻しは今回の上限判定1行を戻し、通常のFunctions準備コマンドで生成domainを再同期する。実データ変更がないためデータ復元は不要。Dev反映には今回修正のFunctionsと画面配信の対象を示した別の配備承認・配備ゲートが必要。Dev実画面確認、UH実装／実取込、訂正前受領値を省く方式の実装検証は未実施。

## Errors and Recovery

検証失敗・後続変更による再検証は[Evidence Validity and Retry](#evidence-validity-and-retry)に従う。実環境の復旧・差戻しは対象機能の日付付き運用記録を参照し、過去の実行記録を新たな操作承認として扱わない。

## Backup and Retention

保存・削除の判断記録は[HSC-001](requirements/house-solution-confirmations/HSC-001-data-retention-policy.md)、バックアップ／リストアの実装済み範囲は[モックの準備記録](design/evidence/current-implementation-audit-2026-10-05.md)を参照する。モックを実データの復旧検証と扱わない。

## Sensitive Information

[プロジェクトの安全・承認境界](../governance/project-rules.md#project-specific-approval-and-safety-boundaries)と[Safety and Sensitive Information](../governance/common-governance.md#safety-and-sensitive-information)を参照する。


## 2026-10-01 デモ確認後のローカル改修

申込日入力と本登録後固定、引渡日による保険報告抽出、保証グループの番号設定固定・無効化を実装。仕様書0.1.31／[試作契約](design/meeting-prototype-2026-10-03.md)が対象。現在のDev配備済み版とは異なる。外部データ変更、試験データ初期化、追加配備は行っていない。検証は[実測記録](design/evidence/meeting-prototype-2026-10-01.md)へ記載する。

配備時は画面とFunctionsを揃える。既存保証の番号・申込日を書き換えず、既存グループのenabled欠落を有効と解釈する。コード差戻し時は旧版が無効グループを使用できる点と申込日・抽出基準の差を確認し、停止中の業務を勝手に再開しない。会社／支店停止・報告履歴・取込は未実装。既存PDFは作成時点の説明で、今回の変更は含まない。


## 2026-10-02 Dev配備・マスタ保持の試験データ削除

オーナーが現行改修の配備と選択的削除を承認。`scripts/reset-meeting-prototype.mjs --preserve-masters` は読取り専用で削除予定を照合し、同じオプションと `--apply --confirm-project termite-warranty-dev` で実行する。保持する2管理者のメールを引数で指定し、Authとスタッフ情報の権限・有効状態を照合する。旧モードは全マスタを初期化するので今回には使わない。

保持：工務店、支店、保証グループ／商品マスタ、採番カウンター、アラート等の設定、全システム管理者・HS管理者。削除：物件／保証実データ、旧物件／案件と関連工務店申込データ、工務店アカウントとbinding、HS一般担当者。未知のコレクション・権限・所属不明Authアカウントは実行前に停止。マスタ・保持管理者の内容を実行前後にメモリ上で比較し、個人データそのものをログへ出さない。パスワード変更なし。試験データの削除はコード差戻しで復旧できない。処理は複数サービスにまたがるため一括原子的ではなく、失敗時は件数を再確認して未完了分を判断する。

### 緊急操作用アプリ管理者台帳

2026-10-02にDevのAuthとstaffAccountsを直接照合。オーナーの「プロジェクト内に記録」指示に基づき、秘密ではない識別情報だけを記録する。認証用のパスワード、回復コード、セッション、秘密鍵は記録しない。

| 項目 | システム管理者 | HS管理者 |
| --- | --- | --- |
| 環境 | Dev / termite-warranty-dev | Dev / termite-warranty-dev |
| ログインメール | dmaruyama.air@gmail.com | demo.admin@termite-warranty.com |
| Firebase Auth UID | SiLgOj5A2vRLyTrKw9omDSHiXmP2 | 8bNGApg8NIhr05abFCL61Tfthsr1 |
| アプリ内role | developer_superuser | house_solution_administrator |
| Auth／スタッフ状態 | 有効／enabled=true | 有効／enabled=true |
| 用途・管理主体 | 開発者であるプロジェクトオーナーの緊急・保守操作 | HS管理者としての試作操作 |
| 秘密情報の保管先 | オーナー管理。具体的保管場所は未確認 | 具体的保管場所は未確認 |

UIDは同一人物のアカウントでも再作成時に変わる。削除や復旧前にはこの台帳だけで実行せず、実環境のメール・UID・roleを再照合する。Devの識別情報を本番に流用しない。

推奨運用（採用・実装は別途）：アプリ外の保管庫で秘密情報を管理し、この台帳には保管庫の項目名／参照先、責任者、最終確認日、復旧手順へのリンクを記録する。緊急アクセスは保管庫や同じ認証基盤の障害にも備えて回復手段を確保する。日常利用と緊急利用を区別し、利用時の理由・操作・事後確認を残す。MFA／利用通知／包括的監査は現行実装済みと扱わない。

アプリ内システム管理者とFirebase／Google CloudのIAM管理者は別物。アプリ自体・Firebase Authが故障している場合、アプリ管理者のログインでは復旧できないため、別のクラウド管理アクセスと復旧手順が必要。この作業ではクラウドIAMを変更・新規設定しない。本番の具体的なアクセス保持・復旧は既存HSC-020/025で確認する。

参考： [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) の秘密情報分離、[Google Cloud continuous access](https://docs.cloud.google.com/docs/security/best-practices-continuous-access-to-google-cloud) の緊急アクセスと復旧手段。GoogleのCloud Identity/Workspace向け手順を、このアプリにそのまま実装済みと見なさない。


### 2026-10-02 同作業中の追加指示：マスタも空にする

オーナーは「採番した番号の再利用もOK」「マスタも削除でOK」と範囲を変更した。今回の実行は上のマスタ保持案を置き換え、`--empty-masters` を使う。`--preserve-masters` は今回実行しない。会社・支店・保証グループを含む業務マスタ、物件／保証、工務店／一般担当者、採番カウンターを削除。初期保証グループも再投入しない。保持するのは照合済み管理者2名とアラート設定だけ。採番カウンターがないため、新しく設定したグループは最初の番号から採番する。この番号再利用はDevのデモ初期化に限定し、本番運用へ適用しない。


### 2026-10-02 実行結果

配備・`--empty-masters`削除・独立した再照合はすべてexit 0。残存はAuth 2件とstaffAccounts 2件だけ。物件／保証、工務店・支店・保証グループとカウンターは0件。アラート設定は元々未作成なので既定値を使用する。保持パスワード変更なし。公開HTMLはHTTP 200で検証済み成果物と一致。全7ゲート成功、ログイン後の遠隔業務操作は未実施。詳細は[実測記録](design/evidence/meeting-prototype-2026-10-01.md)。準備再開後にこの削除コマンドを再実行しない。


## 2026-10-03 確定仕様の独立先行改修（当時未配備・後続Dev配備前の記録）

仕様書0.1.90のうち独立可能な入力・年度採番・案内・通常保険報告・請求CSV・ログイン再試行を改修。[Local受入手順](runbooks/local-acceptance-2026-10-03.md)と[検証記録](design/evidence/independent-implementation-2026-10-03.md)を参照。Dev／Prod配備、既存の実アカウント・業務データ・カウンター操作は行っていない。旧グループ単位カウンターがある場合は年度別へ移行するまで本登録を拒否する。旧保険フィールド未保存データは報告対象として自動確定しない。

Local受入は通常のemulators:start→seed-meeting-emulator→devの順。自動テストのtest:rulesは終了時にEmulatorを停止する。今回のtest:rulesではプロジェクト配下tmp/firebase-configをXDG_CONFIG_HOMEに指定しCI=trueを使用。Firebaseのメタデータ検出が外部アクセス拒否の警告を出すが、架空demoプロジェクト内の試験のみを実行する。これを外部認証・実環境接続の検証とは扱わない。


## 2026-10-03 Dev受入用配備と空データ初期化

承認：本タスクで「Devへ反映しDevテストを受入」とする指示と、続く「管理者2名を残し、デモ用アカウント・物件・マスタ・採番を初期化する」の明示回答。対象は実アプリ一覧で照合したtermite-warranty-dev。保持アカウントは上の管理者台帳の2メールをAuthとstaffAccountsのrole/enabledで再照合した。Prod・IAM変更、パスワード変更、Git pushなし。

配備前の読取結果：propertyWarranties、constructionCompanies、companyBranches、warrantyGroups、warrantyCounters、constructionCompanyAccountsが各1、staffAccountsが2、Authが3。旧採番と保険フィールド欠落を確認したため、既存業務データの勝手な移行はせず、ユーザー選択により空のDevから受入する。初期化でアラート設定が存在すれば保持し、初期グループは投入しない。削除済みのデモデータはコード差戻しでは復元できない。

全7リリースゲートを現在の成果物で再実行。Node22・npm11.19.1・Java21。`npm test`は132成功・symlink環境制約による2スキップ（exit 0）、typecheck/build（各0）、test:rulesは80成功（0）、Functions構文（0）、seed構文（0）、governance（0）。初期化スクリプト構文と読取専用事前実行も各0。コードは前回先行改修から変更せず、[配備フィンガープリント](design/evidence/dev-release-2026-10-03.json)に基底コミットと未コミットソース／Hostingのハッシュを記録。前回ゲートを未確認で流用したのではない。

配備・初期化・公開照合の結果は以下。受入手順は[Dev受入手順](runbooks/local-acceptance-2026-10-03.md)を使用。Devへの配備完了とユーザーの受入完了は区別する。


### 配備・初期化の完了結果

- `firebase deploy --project termite-warranty-dev --only firestore,functions,hosting --non-interactive`：exit 0。Functions 15件更新、Firestore設定反映、Hosting 1,024ファイルの新バージョン公開。ローカルの検証済み成果物を使用し、Git pushや依存関係更新は行っていない。
- `node scripts/reset-meeting-prototype.mjs --empty-masters --apply --confirm-project termite-warranty-dev --system-email <台帳のシステム管理者> --hs-email <台帳のHS管理者>`：exit 0。Auth 2件・staffAccounts 2件を保持。他の業務データ、マスタ、採番、工務店アカウントは空。初期グループは再投入せず、パスワード変更なし。
- 同じスクリプトのapplyなし読取再実行：exit 0。管理者2名の権限／有効状態を再確認。Auth 2件、コレクションはstaffAccountsの2件だけ（アラート設定は未作成で既定値）。
- 公開検証：exit 0。https://termite-warranty-dev.web.app/ がHTTP 200、HTML SHA-256が検証済み成果物と一致（`c74da9b8cf54c0c225a0e3f5303ca5a4fd51f3fcce676caf42b53360269fcd09`）。HTML参照のJS/CSS等33ファイルもバイト一致。Firebase初期設定はDevを指し、未認証propertyPrototype呼出は401/UNAUTHENTICATED。
- この配備作業ではアプリケーションソース、依存関係、Rules、検証ポリシーを変更していない。変更は受入先・運用／証跡・手順・ロードマップの記述と配備指紋。既存の未コミット差分は保持。
- ユーザーによるログイン後の業務受入は未実施。既存Dev管理者でログインし、保証グループ作成（A00）から開始。Local seedや架空認証情報はDevで使わない。初期化を再実行しない。以後の受入データ削除には新たな承認が必要。
