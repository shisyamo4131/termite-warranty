# Prod準備・Dev実測（2026-10-08）

## 追加のCloudログ確認と決定（2026-10-08 22:30 JST）

Dev termite-warranty-devの19:30〜20:10 JST（10:30〜11:10 UTC）をCloud Logging APIで検索。identitytoolkit／securetokenの認証ログ0件、severity>=ERRORが0件、auth/network-request-failed／SignInWithPasswordの文字列検索0件。各検索は1ページで終了。これは検索範囲に記録がないという結果であり、認証サービスへ要求が届かなかったという証明ではない。

`node tmp/investigate-auth-cloud.mjs`初回exit0。project IAM auditConfigs=[]（上位継承設定は未調査）。対照用metrics検索を追加した再実行はLogging API429でexit1、追加照合未完了。初回の3検索成功結果は保持。`node tmp/read-auth-log-config.mjs`は22:30:07 JSTにexit0で認証設定をGET、monitoring.requestLogging={}、enabled未設定を確認。[公式資料](https://docs.cloud.google.com/identity-platform/docs/activity-logging)ではアクティビティログは既定無効で、SignInWithPasswordが記録対象。

アプリはLoginPanel.vueのcatchでerror.messageを画面表示するだけ。useSession.loginはブラウザからFirebase Authへ直接要求するため、通常の業務Functionsを通過しない。Firestore計測の送信は認証済みだけで、未ログインの認証エラーを送る機能ではない。従って現状はクラウド側の認証ログ設定とクライアント障害記録の両方が不足し、前回の通信失敗原因を事後特定できない。記録不足は確認済み、通信障害の根本原因は未特定と分ける。ネットワーク断で送信不能な失敗は認証ログ有効化だけでも捕捉できないため、改善時は接続回復後の非秘密診断送信も設計する。今回は設定・製品の変更なし。

「専用アカウント承認待ち」は、既存実在者を使わず再現するための架空HS管理者1件の作成が自動安全審査で拒否された件。既存Dev操作への包括承認は受領済みだが、自動審査が個別範囲の承認を要求した。今回のCloud読取調査にはその作成は不要であり、調査全体を承認待ちにしない。新規アカウントの作成は実行していない。

オーナーは重複検索のin・30値チャンク方式のみ採用。以下のgetAll一括取得と並列化はまだ提案であり、同時採用と扱わない。全307件は取得数で、対象グループ301件が返却数。毎月報告しても現行の全件読取は変わらないことをHS説明資料の作成項目に記録した。

## 追加調査：一覧取得・ログイン・プレビュー（2026-10-08）

オーナーの追加指示で現行コードと既存の計測原本を再確認。今回は原因調査・改善提案で、改善方式の採用や製品コード変更ではない。

### 保険・請求一覧の全件取得

`functions/property-warranty.js`のlistは、HSでは保証番号以外の月／グループ等をFirestoreのwhereへ渡さない。月指定によりfiltered=trueとなりlimit(20)を外し、query.get後にmatchesProperty／insuranceReportKind／billingRowsで対象を抽出する。従って測定時はDB→Functionsが307物件、Functions→クライアントが検証グループ301件。共有マスタStoreとは別の業務データ取得であり、307件という上限があるわけでもない。

改善候補は工務店・本支店・グループ等の単純条件をDBへ渡すことと、月別候補をDBで抽出できる項目・索引を整えること。保険は過月未報告・更新遅延・要確認を含み、請求は初回の申込月と延長区間の開始月を扱う。単なる引渡月の等価条件に置き換えると欠落するため、現行結果との同一性を検証する必要がある。現時点では提案であり改修未実施。

### 300件プレビューの内訳と改善案

既存Functionsログ原本のdurationMs=18,248、readDurationMsの合計=17,955。読取が直列のため待ち時間が積み上がっている。transactionAttempts=1で、今回の遅延を再試行や画面描画に帰していない。

| 確認対象 | アプリ取得呼出 | 読取所要ms |
| --- | ---: | ---: |
| 外部キー・保証番号の既存物件検索 | 600 queryCalls | 11,590 |
| 外部キー予約 | 300 getCalls | 5,515 |
| 本支店コード予約 | 25 getCalls | 545 |
| その他（所属・採番・復旧等） | 8呼出 | 305 |

推奨順序（未採用）：

1. IDが分かる外部キー予約・本支店予約をtransaction.getAllでまとめて取得する。物件数分の逐次待ちを減らす。文書数がそのまま課金削減になるとは主張しない。
2. 既存キー／予定保証番号の検索を、各値の等価検索から最大30値ごとのin検索へまとめる。300値が一意なら各10検索、合計600→20検索にできる。全体limit(1)は付けず、ヒットを各入力行へ対応させて重複を漏らさない。必要項目だけ取得する案も併用する。
3. 上記後に残る独立した取得を、上限付きの並列処理にする。無制限の600並列化は採用案にしない。transaction初期化とsnapshot整合をSDKで検証する。

最初は永続データ形状を変えない1＋2を推奨。予約だけを信じて既存物件検索を削除する案は、旧データ／初期投入／予約整合の保証が別途必要なため今回の第一案にしない。プレビュー結果の使い回しだけで確定時の再検査を省略せず、同時取込・コード再利用・採番変更・全件棄却・同一要求の再確認を維持する。高速化後の秒数は未測定。300件で結果／エラー／採番が一致することと、両操作のFunctions時間・読取呼出・競合時の挙動で評価する。

API確認：[Firestoreのin／OR上限](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)、[Node Transaction.getAll](https://googleapis.dev/nodejs/firestore/latest/Transaction.html#getAll)。30は単純inの場合で、他のOR条件との組合せ上限に注意する。

### ログインの切り分けと未確定事項

useSession.loginはsetPersistence後にFirebase AuthのsignInWithEmailAndPasswordを呼ぶ。アカウント文書の読取失敗は別の日本語メッセージになり、今回のauth/network-request-failedと同一視しない。LoginPanelはerror.messageだけを表示し、元の例外・接続先・HTTP状態等を永続記録していない。

使用中SDKの`node_modules/@firebase/auth/dist/esm/index-CvXU3_1x.js`で、fetch／応答解析の非Firebase例外とNetworkTimeoutをnetwork-request-failedへ変換することを確認。エラー名だけではDNS・通信遮断・ブラウザ経路・タイムアウト・応答解析の原因を区別できない。当時のIABタブは終了しており通信詳細なし。今回新しく開いたIABのDevログイン画面は表示成功、初期表示時のerror/warnログは0件。これはログイン成功の証拠ではない。

再現用のDev架空HS管理者アカウント1件の作成は、自動承認レビューが個別の明示承認不足として実行前に拒否。オーナーへ作成・検証後削除の承認を依頼中。拒否された操作を別経路で実行していない。既存アカウント・認証設定・製品コードの変更なし。再現後は実際の認証APIの失敗詳細を記録し、復旧前に確認する。現時点では根本原因未特定で、通信エラーをアプリ不具合ともIAB固有障害とも断定しない。

本追記はdocumentation-only。適用ゲートはcheck-governance、製品コード無変更のためapp／Rules／build等の再実行は対象外。検証結果と作業ツリー状態は当該調査の報告に記載する。

## 対象と境界

オーナーの本番Firestore決定、Dev架空データ検証、既知不具合再確認、記録整合とコミットの指示に基づく。実装／配備基準は b5bcb354800ec89a6ca1629e1f73ebe8c0ab3390。今回の追跡差分は文書・既承認のStore例外記録のみ。アプリ／Functions／Rulesを変更・再配備せず、Prod構築・IAM・課金・通知設定も実行しない。

Dev termite-warranty-dev、normal generation 10。架空fixture qa-cap-dc484709 はAPIで1グループ・25工務店・25本支店を準備し、業務操作はDev実画面で行った。別に画面から1グループ・1工務店を作成。物件は既存6件にCSV300件と再保存試験1件を追加し、最終307件。全件の本支店指定・工務店所属一致、新規301件の保証番号一意を読取照合した。既存6件の内容の前後hash比較は今回未実施。検証データは識別可能な名称で保持し、専用一時アカウント・非公開認証ファイルのみ削除済み。自動バックアップ設定の変更なし。

## 実画面での結果

| 操作 | 結果 |
| --- | --- |
| 301行CSVプレビュー | 300件以内のエラー。本登録しない |
| 300行CSV（52,672 bytes）プレビュー・本登録 | 300件成功。一度だけ本登録し、採番001〜300を確認 |
| 保証番号完全一致検索 | QC484709-26-001／300それぞれ1件。条件解除で最新20件 |
| 保険報告CSV・請求CSVの実ダウンロード | 当時の対象304件（新規300＋既存4）。双方に新規300件が欠落・重複なく含まれ、番号・名称・本支店・日付等を機械照合。報告7列／請求11列 |
| 工務店・本支店Autocomplete | 25候補中、最新20件より古い工務店01／本支店01を選択可能。工務店変更で本支店の選択・候補初期化 |
| TR-010-06 面積未入力後の再保存 | 同じダイアログで123.45へ訂正→確認→本登録成功。番号301、リロード不要。再発なし |
| TR-010-07 新設グループ反映 | 画面でグループを作成後、配下に工務店を作成できた。リロード不要。再発なし。ただし全グループ0件／同名再作成の条件は未実施 |
| ログイン | 初回と同画面再試行でauth/network-request-failedを観測。明示リロード後成功。読込中のまま固まる症状は再発せず。通信失敗の原因は未特定 |

証拠画像はignored tmp/prod-readiness-import.png（300件成功）、tmp/prod-readiness-selector.png。ダウンロード原本・検査結果もtmpに保持し、秘密／実HS資料は含めない。ブラウザはCodex IABであり、指定Windows Chrome／Edgeの最終受入を代替しない。

## 取得時間とFunctionsログ

補助試験は認証済みの配備Callableを使用。UIの描画時間ではなくSDK呼出時間。2026-10-08 19:57:16〜19:57:20 JST、各3回、同一アカウント。名称は共有Storeを使う指定でサーバー付与を省略。

| 処理 | 返却件数 | 3回の所要ms |
| --- | ---: | --- |
| 無条件最新20件 | 20 | 264 / 151 / 122 |
| 番号001完全一致 | 1 | 231 / 154 / 104 |
| 番号300完全一致 | 1 | 203 / 130 / 126 |
| 部分番号（不一致） | 0 | 102 / 101 / 103 |
| 保険報告・検証グループ | 301 | 466 / 464 / 331 |
| 請求・検証グループ | 301 | 301 / 359 / 304 |

同一アカウントの2要求並行は合計114ms、2件返却。異なる2人の同時業務・同時更新を検証したものではない。

Functions構造化ログを19:46:44〜20:04:13 JSTで取得。119件＝server_observed 107＋client_reported 12、ページング1ページで完了。ブラウザコンソールではない。

- 月別の保険／請求取得6実行は、それぞれpropertyWarrantiesを307文書取得し、対象グループ301件へ絞っていた。各queryCalls=1。現行は月・グループをDB取得条件へ押し込んでおらず、蓄積量に比例するRead削減候補。
- 300件プレビューは18,248ms、本登録19,897ms（Functions内部所要）。双方でpropertyWarrantiesのqueryCalls=600／emptyQueries=600。既存照合の空結果も読取操作なのでreturnedDocuments=0を「Readなし」と解釈しない。
- 本登録のwriteConfirmed合計904は業務・予約・採番・復旧制御等を含むアプリ観測値。物件本体は300。課金対象件数ではない。
- 共有Storeは初期listenerInitialDocuments=75（active71／inactive4）、listenerStarts=3、後続追加listenerAdded=55、referenceHits=2400。期間合算であり、最終マスタ数・一回起動の課金量と同一視しない。無効参照hitは0なので①への切替効果はこの試験だけで判断できない。

判断：300件境界で整合性は確認できた。初回取込み約20秒と月別一覧の全物件取得は改善候補として残す。全業務の負荷限界、実初期件数での規模、長時間負荷、複数利用者同時更新、実請求額は未検証であり、本番性能保証やDB移行判断にはしない。受領する初期投入データの件数・形状に合わせた再計測を提供前に行う。

## 既知不具合の現在扱い

現在の未解消観測として残すのは上記ログイン通信失敗（原因未特定）。TR-010の旧ログイン読込停止は現composableへSDK読取失敗を注入し、loading解除・再試行成功・sign-out初期化を確認した。これは制御下の単体ハーネスでありDev通信障害注入ではない。面積再保存・20件外候補・新設グループ反映は今回再発せず、現行不具合一覧から外す。

通常ルート外の旧アカウント／旧関連一覧／旧案件編集の静的指摘は、現行通常業務の再発証拠がないためアクティブ不具合として残さない。旧画面の将来再採用時は別受入が必要。修正済みという判断ではない。過去の記録はGitで参照可能。

新決定との差分：保証書CSVボタンは実画面で無効（Word項目待ち）。初期提供CSV機能の実装と画面説明の整合は未完了。保険報告／請求CSVの成功を保証書CSV完成とみなさない。印刷品質・保証書出力そのものは後発。

## 実行・検証

各コマンドは個別実行し終了コードを観測。tmpの限定operatorは今回専用で、自動再実行用の製品機能ではない。

| コマンド | 実測結果 | exit |
| --- | --- | ---: |
| node tmp/prod-readiness-fixture.mjs | 架空マスタ51件とCSVを準備 | 0 |
| node tmp/prod-readiness-csv-check.mjs | 実ダウンロード2CSVの新規300件照合 | 0 |
| node tmp/prod-readiness-read.mjs | 取得6条件×3回＋2要求並行 | 0 |
| node tmp/prod-readiness-session.mjs | 現composable読取失敗→再試行→sign-out | 0 |
| node tmp/prod-readiness-postcheck.mjs | 307物件の所属／301番号一意／Functions両source／一時アカウント削除 | 0 |
| npm test | 350件中348成功・既存symlink2skip | 0 |
| npm run typecheck | 成功 | 0 |
| npm run build | 成功（既存警告あり） | 0 |
| npm run test:rules | 140成功、emulatorsStopped=true | 0 |
| node scripts/check-functions-syntax.mjs | 成功 | 0 |
| node --check scripts/seed-emulator.mjs | 成功 | 0 |
| ./scripts/check-governance.ps1 | 管理対象hash・生成AGENTS・7ゲート／文書整合すべて成功 | 0 |

文書整合と既承認governance例外の記録を含むためcomprehensive7ゲートを選択。全7ゲート成功。アプリが無変更のため後続文書修正は上記6ゲートを失効させない。差分・commitはGit、最終worktree状態は完了報告へ記載。データ形状／API変更がないためdata-contract版の変更なし。今回の進捗加点なし。Prod配備／HS受入完了は主張しない。

## 認証診断・CSV30値検索の改修（2026-10-08）

基準HEAD `42d69e8201825be2a73f52e3364b0dc57b8972a9` 上の作業差分。認証失敗はタブ内上限付きキューから匿名の診断専用Functionsへ送る。許可済みstage/code/時刻/online/乱数事象IDのみ。個人情報・資格情報・自由文エラーは送らず、業務データへアクセスしない。CSVは外部キー／予定番号の重複検索を30値ずつに集約。ID予約のgetAll・並列化は未採用。月別一覧のDB条件化は未改修で、HSに説明して済ませる扱いを撤回した。

### Local検証

変更分類：application-logic、匿名受付境界、build-release-deploy、documentation。全7ゲートを選択。最終runtime差分に対する結果（各exitを独立確認）：

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 355件中353成功、既存symlink制約2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功、既存warningのみ | 0 |
| `npm run test:rules` | 141成功、skip0、Emulator終了確認 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `./scripts/check-governance.ps1` | 成功 | 0 |

最初のnpm testは2件失敗exit1。旧クエリの`==`だけを許すmockと、新しい診断依存を持たないsession harnessを修正。対象82件成功exit0後、全体を上記で再確認した。製品の判定を緩和していない。Emulatorで匿名HTTP/CORS/Callable envelope/不正payload拒否、279件取込と重複全棄却・同時commitを確認。単体で300値の10チャンク・複数重複・境界、通信回復後の送信・再読込保持・期限と上限・送信中追加・再送抑制を確認。独立read-onlyレビューAUTH-OBS-01で阻害するP1/P2指摘なし。試験mockと文書のみの後続変更は既存の型検査／build／Rules／syntaxの失効条件に該当しないため再利用。

### 認証サービス側ログの制約

`node tmp/enable-dev-auth-logging.mjs --apply-dev` はexit1。Dev実設定GETと対象照合の後、`monitoring.requestLogging.enabled` だけのPATCHを試したがHTTP400、`OPERATION_NOT_ALLOWED : activity logging can only be enabled in GCIP.`。設定は未有効。Identity Platformへの変更は未実施・別判断。管理者アカウント作成も未実行。元の通信障害原因とサービス側ログの扱いはHSC-041に残す。ブラウザ診断の追加を元の障害解消と扱わない。
