# 共有参照Store・Functions処理別計測

- Status: Dev配備・機能検証・Functionsログ両source受信済み（2026-10-08）。ユーザーによる画面操作・UI/UX確認は未実施。
- Authority: [仕様](../specification.md)、[ADR0037](../decisions/0037-reference-store-observability.md)。2026-10-08オーナーが②と計測実装を承認。

## 認証失敗の診断経路

2026-10-08オーナー指示による追加。Firestore件数計測とは別に、認証永続化・サインイン・アカウント初回取得／購読・パスワード再設定の失敗を`reportAuthDiagnostics`へ送る。認証失敗後にも使うため未認証で受け付けるが、業務DB・Auth管理APIにはアクセスしない。認証・権限を付与する機能ではない。

許可項目は乱数事象ID、発生時刻、固定stage/code、navigator.onLineだけ。メール・パスワード・UID・URL・自由文エラー・stack・業務データを送らない。未知codeはunknownへ縮約する。生の通信原因を保存する仕組みではなく、online=trueも通信成功を保証しない。出力はFunctions構造化ログ`event=auth_client_failure`／`source=client_reported`。サーバー受信時刻とクライアント発生時刻を区別する。

タブ内sessionStorageへ最大20件・24時間保持し、失敗時、起動時、online復帰時、60秒ごとに最大10件を送る。送信失敗は15秒から最大5分の待機を挟み、次の送信機会で再送する。送信中の追加を消さない。記憶領域利用不可ではメモリ内のみ、タブ終了・長期離脱・上限到達時に未送信分を失う。失敗を業務エラーへ置き換えない。認証情報を持たないためログアウト後も未送信診断は有効期限まで残す。アカウントと関連付けない。

受付は1要求10件、インスタンスごとに60要求/分・送信元ごとに6要求/分、最大2インスタンス。送信元はメモリ内の制限用でログに出さない。5分以内の同じ事象IDをインスタンス内で重複除外する。分散制限・完全な重複排除・申告内容の真正性は保証しない。既存Firestore計測の認証必須・非永続キュー契約は不変。

DevのIdentity Platform activity logging設定はAPIで拒否されたため未有効。サービス変更は別判断で、[HSC-041](../requirements/house-solution-confirmations/HSC-041-authentication-diagnostics.md)に集約。差戻しは対応Functions／Hostingを旧版へ揃える。業務データ移行不要。匿名HTTP/CORS、再送、秘密情報除外、受付制限とCSV回帰を含む全7ゲートを実施し、Devログ到達まで確認する。結果は[既存実測記録](evidence/prod-readiness-2026-10-08.md)へ記載。

## マスタ参照方式

HSは保証グループ・工務店・本支店の有効／無効全件を、タブ内で共有する購読へ集約する。ID別の名称解決は無効も含め、Autocompleteには自身と親の有効性・会社所属を満たす候補だけ渡す。候補数を20件に制限せず標準filterを使う。工務店変更で本支店選択を消去する。通常の業務一覧は最新20件のまま。

未同期・同期済み・失敗を区別し、権限／所属／ログアウト／復旧境界では購読解除と状態消去、旧応答拒否を一体化する。ポータルは既存認可済みCallableを使い、全社のデータを取得して画面で隠す方式を禁止する。クライアントの候補は保存時のサーバー検証に代わらない。

新HSクライアントは一覧・詳細のサーバー名称付与を省略してStoreで解決する。旧クライアント／ポータルには既存名称を返す。CSVも同じ名称解決を使い、同期失敗を空欄名称の正常出力としない。保存データの移行はない。

①有効のみ購読＋無効必要時5分キャッシュへの変更は、計測後の判断事項。②で無効文書用TTLは不要。過去の①詳細設計を初期実装の完了条件には使わない。

## 計測契約

目的はアプリの実装方式を見直す契機。課金・監査の正本ではない。サーバーはリクエストごとに状態を分離し、成功／失敗、所要時間、読取呼出、返却文書、欠損／空結果、書込試行／成功確認、transaction試行／再試行を記録する。writeConfirmedはSDKが成功を返した書込操作数で、deleteも含む。同一文書への複数操作を文書IDで一意化せず、結果不明の書込を未実行と断定しない。復旧・認可等の付帯取得は業務と別の区分を持つ。失敗時に成功を書かず、transactionの中間試行の書込を確定件数へ加算しない。

直接Firestoreアクセスは共通wrapperで集計し、認証済みの`reportFirestoreMetrics`へ60秒ごと、またはタブ非表示時にまとめて送信する。無通信時は送らない。認証未確定／未ログイン中の計測は保持せず、ユーザー変更時に集計を破棄する。旧ユーザーの遅い完了も破棄する。公開の復旧マーカー購読だけはアプリ存続期間の観測とし、認証確定後の通知を継続して記録する。失敗分を無制限再送せず、永続キューは作らない。ブラウザ終了・通信断で不達があり得る。業務成功を計測失敗で取り消さない。

許可済みの処理名・数値カウンターだけを受け付け、最大40行、カウンターは0〜1,000,000の整数。氏名、住所、メール、UID、文書ID、本体、検索語、自由文エラーを保存しない。計測用Firestore文書は作らない。計測受付の認可取得も別区分で計測し、計測送信を再度クライアント計測する循環を作らない。

リスナーは購読開始／終了、初回サーバー通知の文書数、追加／変更／除外、キャッシュ／pending通知を別カウンターにする。除外件数は文書削除件数ではない。単一文書の初回以降は変更／削除と断定せずdocument通知数として記録する。初回は実際に観測したserver通知でありSDK内部の全取得を表さない。キャッシュ通知を課金Readと呼ばず、初回通知や再接続のSDK内部処理を完全に再現するとは説明しない。所要時間の合計も操作が並列なら実経過時間とは異なる。

## ログの利用と切替判断

出力先はFunctionsログ。構造化フィールド`event="firestore_metrics"`で絞り、`source="server_observed"`と`source="client_reported"`を分ける。schemaVersionは計測契約の版でありアプリ版ではない。実配備後のCloud受信は下記Dev検証で確認済み。

Functionsの処理／action別に、呼出回数・返却文書・書込成功確認・再試行・時間を比較する。クライアントは処理区分ごとの期間集計であり、複数呼出を一つの業務操作へ完全に対応づける監査ではない。60秒分の集計の受信時刻と個別操作時刻は一致しない。

Storeでは初期取得した有効／無効件数、参照回数、無効参照回数とStore寿命内の無効ID別参照数を比較する。有効／無効文書数は各購読の初回server受信で加算するため、期間合計は現在の保存件数とは異なる。無効文書の初期取得が多く実参照が少ない場合に①を候補とする。短時間の操作・再接続・複数タブを混ぜた合計だけで削減効果を断定せず、同じfixtureと操作列で比較する。課金指標との完全一致は不要。初期導入時の①との差は仮説であり、切替後の測定で確認する。

## 検証・運用境界

変更分類はアプリ・UI・API互換・project governance・文書、Dev反映時はrelease/deployも対象。全7Localゲートを選択。Localの架空DBで取得／書込、失敗・再試行、ログの許可項目、非同期結果・所属境界、旧クライアント互換、21件目以降、無効名称を検証する。Functions／Hosting配備とDev機能・ログ実受信は下記を参照。請求額・本番規模は未検証。Rulesの認可拡張、環境設定、業務データ移行は行わない。

検証結果と残件は最終実装状態で更新する。計測・Store導入を通常の本支店必須化／コード条件必須の完了として報告しない。

## 2026-10-08 Local検証結果

対象はHEAD `dd80a12721d9c0e627d29434acc3bb61a8f21149`上の未コミット作業差分。既存34 tracked変更＋2新規を保全し、今回の実装を同じ主作業ディレクトリへ統合。stage／commit／push／配備／Devデータ操作なし。下表は最終アプリ・Functions・テスト状態に対する実測。文書の結果記入後はgovernanceとdiffのみ再確認する。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 345件中343成功、既存symlink制約2skip、失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 138成功、skip0、Emulator停止済み | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `./scripts/check-governance.ps1` | 成功。結果記入後の再確認対象 | 0 |
| `git diff --check` | 成功。結果記入後の再確認対象 | 0 |

初回typecheckはStore型とフォーム初期化の不整合で失敗（exit1／2）、修正後成功。初回npm testは旧fixtureとsandbox一時領域のrename EPERMで失敗（exit1）。新契約にfixtureを対応し、通常Local権限で再実行して上記成功。失敗を省略で回避していない。新規Emulator2ファイルは各3成功で全Rulesに含む。SDK proxy実操作と認証済みCallable受付を確認し、Local Functionsログの`firestore_metrics`両source出力を確認した。Cloud受信成功とは区別する。

独立レビューで、旧scopeの遅い応答による画面再表示、未同期候補選択、旧ユーザー計測混入、document通知の誤分類、計測対象collection漏れを修正。最終再レビューで阻害事項なし。Store7試験、クライアント観測8試験、transport3試験、サーバー観測6試験は全単体ゲートに含む。画面のロジック／template契約はfixture試験であり、今回の実ブラウザ一巡・HS受入は未実施。

### 今回の変更ファイル

- Store/UI/API: `app/composables/useReferenceStore.ts`, `app/components/CompanyAutocomplete.vue`, `app/components/MeetingPrototype.vue`, `app/components/PropertyBulkImportDialog.vue`, `functions/property-warranty.js`, `src/domain/reference-store-request.mjs`, `src/domain/reference-store-request.d.mts`。
- Client計測: `app/utils/firestoreMetrics.ts`, `src/domain/client-firestore-metrics.mjs`, `src/domain/client-firestore-metrics.d.mts`, `app/plugins/firebase.client.ts`, `app/composables/useSession.ts`, `app/composables/useMasterManagement.ts`, `app/repositories/masterCatalogRepository.ts`, `app/repositories/firestoreCaseQuerySource.ts`, `app/gateways/caseCommandGateway.ts`, `app/components/ConstructionCompanyPortal.vue`, `app/components/CompanyPortalAccountManagement.vue`, `app/components/CompanyPortalNotificationManagement.vue`。
- Server計測: `functions/firestore-metrics.js`, `functions/client-metrics.js`, `functions/index.js`, `functions/recovery-runtime.js`, `functions/recovery-backups.js`。
- Tests/runner: `test/client-firestore-metrics.test.mjs`, `test/client-metrics-transport.test.mjs`, `test/server-firestore-metrics.test.mjs`, `test/reference-store.test.mjs`, `test/emulator/firestore-metrics.test.mjs`, `test/emulator/reference-store.test.mjs`, `test/property-warranty.test.mjs`, `test/property-bulk-import-ui.test.mjs`, `package.json`, `scripts/lib/rules-test-plan.mjs`。
- Docs/governance: 本書、`docs/decisions/0037-reference-store-observability.md`, `docs/decisions/README.md`, `docs/design/README.md`, `docs/README.md`, `docs/specification.md`, `docs/roadmaps/technical-remediation.md`, `docs/design/property-bulk-import.md`, `docs/design/meeting-prototype-2026-10-03.md`, `docs/requirements/master-management.md`, `docs/requirements/user-explanation-items.md`, `docs/operations.md`, `CHANGELOG.md`, `governance/project-rules.md`。

project-rulesは参照購読例外を有効のみから無効込みへ採用更新。managed AGENTS／検証policy／Rules／IAMは変更しない。保存スキーマ・業務データ意味・移行は不変のためdata-contract改版なし。既存全体ロードマップの進捗加点、未決台帳の変更、環境設定は不要。依存版は不変。Functions domain生成は既存prepare経路のみ。

### 残る運用上の限界

認証前の初期取得、終了時の未送信集計、失敗送信分は欠落し得る。上限へ達したカウンターは飽和する。クライアント申告は厳密な証跡ではなく、有効ユーザーによる虚偽値や重複送信を完全には排除しない。分散rate limit／重複排除、Cloud Logging保持・alert設定、請求照合の自動化は今回実装しない。

現在のserverで使うget/query/getAll、直接書込・batch・transactionと既存Callable／定期backup処理を計測。将来stream・bulkWriter・集計query等を導入する際は計測対応も追加する。Auth／Storage／REST管理バックアップの料金はFirestore SDK観測値に含めない。①への自動切替・実課金比較は未実施。Dev反映後もUI/UX受入は別に行う。

## 2026-10-08 Dev配備と実受信

オーナーがレイアウト修正完了後にDev配置・Functionsログ受信確認の再開を明示指示。組織管理の階層別一覧を含め、レビューしたruntime/testの50ファイルを `ebd9c45f63d7b3793e0de0d2a897937583668933` に保存し、`termite-warranty-dev` のFunctions20件とHostingへ配備した。primary/mainを使用、pushなし。既存文書・governanceの未コミット差分は保全。配備対象runtimeはclean。BRANCH-03／05、DISABLED-01、Store／計測、組織管理のレイアウトが配備範囲であり、通常物件の本支店必須化・グループ条件付きコード必須化を完了と扱わない。

### リリース検証

以下は同じ最終runtime状態の実測。最終commit直前のStore末尾空行削除だけは動作に影響しないため単体・Emulator証拠を再利用し、型検査・buildは削除後に実行。正式build後のソース変更なし。文書記入は製品ゲートを失効させず、governance／差分検査を最後に実行する。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 349件中347成功、既存symlink制約2skip、失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 138成功、skip0、Emulator停止済み | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `./scripts/check-governance.ps1` | 配備前成功。最終文書検査は下記に記録 | 0 |
| `git diff --cached --check` | commit前成功 | 0 |
| `npm run build:recovery-release -- --revision ebd9c45f63d7b3793e0de0d2a897937583668933` | 正式配信物生成成功 | 0 |
| `node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project termite-warranty-dev --non-interactive` | 20 Functions配備成功 | 0 |
| `node node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project termite-warranty-dev --non-interactive` | Hosting配備成功 | 0 |

正式照合コマンド：

```powershell
node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision ebd9c45f63d7b3793e0de0d2a897937583668933 --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/666c671b812b6f8f --dev-inspect
```

初回はexit0だがHostingの`hosting-files / identity-mismatch`がblockedで不合格。再配備・コード変更をせず同じ読取照合を再実行し、**全10項目pass・exit0**。Functions原本20、Hosting991ファイルのhashと配信設定が一致。初回不一致の詳細原因は未確定。`mode=inspect`の`ready=false`は書込利用可を示さず、全checksのpassを配備一致の判定に使用した。runtimeはnormal／世代10、activeOperations0、運用・Authロックなし、Rulesと必要索引11件もpass。

### Dev機能・ログの実測

レビュー済みの一時スクリプト `node tmp/store-dev-acceptance.mjs --apply termite-warranty-dev` はexit0。実行時間は2026-10-08 17:11:59〜17:12:13 JST。専用の架空グループ1・工務店1・本支店25（うち1無効）、検証Auth2アカウントと対応文書だけを作成。作成前にrun別所有journalを残し、結果不明の書込みは掃除を保留する。正常終了では所有マーカーをtransaction内で確認して削除し、AuthもUIDと架空emailの一致を確認して削除。cleanupErrors0。

9項目を確認した：ポータルの25候補・無効を含む自社限定取得、他社指定拒否、HS実SDKリスナーの有効／無効取得、保存の即時反映、無効中編集拒否、専用再有効化の即時反映、新HS一覧／詳細の名称付与省略と旧クライアント互換、実観測クライアント集計の受付、任意ログ項目の拒否。画面のクリックや視覚確認を代替したとは扱わない。60秒タイマー・ログアウト境界はLocal回帰、Devでは同じwrapperで得た集計をCallableへ明示送信して経路を検証した。

`node tmp/store-read-cloud-metrics.mjs` はexit0。Cloud Loggingの実Functions実行ログ（`resource.type="cloud_run_revision" AND jsonPayload.event="firestore_metrics"`）を読み取り、17:12:34 JSTにserver_observed 10エントリ、client_reported 1エントリを確認。成功saveBranchのサーバー観測はreturnedDocuments5、getCalls5、transactionAttempts2、writeAttempts3、writeConfirmed3（復旧制御等を含む合計）。クライアント観測はlistenerInitialDocuments38、listenerStarts3、listenerStops3、listenerSnapshots5、listenerModified2。これは検証データと既存マスタを含む当該検証時間帯の観測値で、請求件数・通常業務の削減率ではない。ログには固定処理名と数値だけを記録し、受信確認でも文書本文や識別子を出力していない。

`node tmp/increment-dev-readonly.mjs before`／`after` は各exit0。10業務rootの型付きhashとruntime/controlの比較が一致し、既存19物件を含む業務データは不変。`node tmp/verify-paused-backups-after-release.mjs`（事前19 Functions）と `node tmp/store-backup-postcheck.mjs`（事後20 Functions）は各exit0：全Functionsの自動取得false、Scheduler PAUSED、PITR無効、予定0・Firestoreバックアップ0を維持。既存アカウント・Rules・IAM・索引・業務データの移行／初期化なし。実行ログ・集計receiptはignored tmpに置き、この文書には非秘密の結果だけを永続記録する。

仕様・データ契約・ADRは今回の配備で変更なし。既存仕様の実装状態と配備証拠を本書・operations・技術改修台帳・CHANGELOG・組織管理の実装状態へ反映する。全体進捗への加点なし。ロールバックが必要なら配備済み版と既存データ互換を確認して別の明示指示で実施し、データ初期化やバックアップ再開を含めない。

### ユーザーのUI／UX確認手順

Devを再読込してHSアカウントでログインし、以下の見た目と操作感を確認する。計測ログの確認作業は不要。保存を伴う項目はデモ用データを使う。

1. 組織管理で「工務店を見る」→「本支店を見る」と進み、所属のパンくず、戻り先を示すボタンが分かりやすいか確認する。
2. 検索／ページ移動後に上位へ戻り、同じ親を開くと条件が保たれること、別の親では子の条件が初期化されることを確認する。
3. 物件／保証の登録・編集で工務店と本支店の候補を文字入力で絞り込み、工務店変更後に以前の本支店選択が消えることを確認する。有効な所属だけが選択候補になる。
4. デモ用本支店を無効化し、編集できず再有効化操作が表示されること、過去物件の名称は残ることを確認する。再有効化後に編集できることも確認する。
5. ブラウザ幅を狭め、名称・コードの折返し、行のボタン配置、ダイアログの入力欄・エラーメッセージが見切れないか確認する。

気になる画面・操作・期待した表示を共有する。UI/UXのユーザー受入、Prod配備、実課金比較は未実施。

最終文書検査：`./scripts/check-governance.ps1`、`git diff --check` とも成功・exit0。配備コードの追加変更なし。既存文書差分を保全し、本ターンの結果記録も未コミットで残す。
