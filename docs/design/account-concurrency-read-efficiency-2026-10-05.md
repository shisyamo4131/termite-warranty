# アカウント更新の競合修正・取得効率改善

- 状態：実装・独立レビュー・最終Localゲート・Dev反映・開発側Dev受入完了。利用者自身の業務受入とは区別する。
- 根拠：2026-10-05のオーナー指示。ACCOUNT-01、Read候補1/2/3/5の改修、Local検証後のDev配備と開発側受入を承認。候補4は後続回答「今回採用する」で下記の5分参照キャッシュを採用。候補6と郵便番号自動更新は説明・検討段階。
- 基底：primary repository、main、d77ed3254676d0a609fe9231fe20f00c21bc1583、開始時clean。

## アカウント更新

耐久的な方式の決定は[ADR 0036](../decisions/0036-account-mutation-serialization.md)に記録。

現行はAuthとFirestoreを個別更新し、同一UIDの並行操作で両者が異なる状態になる。三つの更新入口を共通のサーバー専用 `accountMutationLocks/{uid}` による排他制御へ統一する。別UIDは独立。同一UIDの処理中要求はabortedとして再試行を案内する。Auth操作は再実行されるFirestore transactionの外で行う。

ロックの時間切れによる自動奪取はしない。Authがロックの世代を検証できず、古い処理が再開した場合に安全でないため。成功時は対象文書の更新とロック削除を同じtransactionで確定する。停止は文書enabled=falseを先に確定し、Auth停止・refresh token失効へ進む。再開はAuth成功まで文書を有効にしない。プロフィール変更・再開の失敗はロック保持下で補償し、整合性を確認した場合だけ解除する。結果不明・補償失敗・プロセス停止はロックを保持し、管理者が旧処理の停止と状態を確認して復旧する。一般クライアントへロック読み書きを許可しない。

復旧は既存権限を拡張しない明示的運用。状態確認は読取専用。適用は対象Dev・期待操作ID・旧処理停止の確認を必須とし、実復旧の実行は別承認。Auth操作前に固有recoveryOwnerをtransactionで取得し、重複復旧を拒否する。中断復旧の交代には照合済みの期待所有者と旧復旧処理の停止確認が必要で、時間だけで交代しない。Authを現在の文書の値へ合わせ、所有者・操作ID・文書状態を再照合してから原子的に解除する。無条件のロック削除を復旧として扱わない。手順は[operations](../operations.md)へ記録。

互換性：既存アカウントの一括変更なし、role・即時停止・company scope不変。旧更新入口が排他制御を迂回するため、全対象Functionsを配備し終えるまでアカウント変更を受入操作に使用しない。ロックを無視する旧コードへ単純差戻ししない。障害時はアカウント変更を止め、ロックと既存データを保全して互換修正する。

## 取得効率

- 会社指定支店取得とグループ指定会社取得はFirestore where条件で絞る。空条件最新20件・明示検索の完全候補・scope・無効候補の既存意味を保持。
- 工務店名検索は使用しない支店を取得しない用途指定を追加。HostingとFunctionsを合わせて配備し、旧catalogの標準応答も維持する。
- 工務店・支店の保存では外側の重複参照取得を除去し、transaction内の最新存在・有効状態確認を残す。
- AirGuardV2の取得結果共有・実行中Promise共有を参考に、画面内の小さい参照データ取得層を追加する。catalogとalertSettingsのみ成功結果を5分再利用し、キーは取得種別・条件・認証/役割/会社/支店scopeを含む。マスタ/設定保存成功、logout、UID/役割/所属変更で破棄し、破棄前の応答を再利用しない。明示「最新の設定を取得」は強制更新。別管理者の参照変更は最大5分の表示遅延を許容。エラーはキャッシュせず、空成功と失敗を区別し、件数上限を設ける。権限の即時enabled確認・保存時の最新検証・物件一覧/詳細・アカウント一覧はキャッシュしない。候補6の無変更保存は今回改修しない。

## Read調査と未変更項目

2026-10-05T11:54:00ZのDev読取集計は保証グループ7（明示無効4、有効3）、工務店1、支店1。`node tmp/inspect-catalog-counts.mjs`は既存CLI認証のsandbox読取拒否で最初exit 1、許可後の読取集計exit 0。個別の名称/住所/メールは取得・出力しない。初期化記録でもグループ7件保持。ユーザーが使用する3件だけでなく無効4件もcatalogが読み、前回Query Insightsの294回/2015 Read（平均約6.85）と整合する。ただし時間帯・初期化前後・他操作が混在し、全量の原因を入力作業と断定しない。架空1000支店の検証は増加時の効果例で、現状の原因説明に使わない。

物件保存は`tx.set(ref,next)`で全置換だが、nextは既存oldを引き継ぐ。無変更でもhistory/revision/updatedAtとreceiptが更新される。差分updateへ変えるだけでは文書Write回数は減らない。候補6の変更なし抑止は未採用、今回の保存方式は維持する。

郵便番号自動更新は[HSC-040](../requirements/house-solution-confirmations/HSC-040-postal-data-automatic-update.md)へ登録。現行は手動取得/検証/更新後にHosting反映が必要。自動基盤・IAM・スケジュールは未変更。

## 完了条件と保全

Prod・IAM・パスワード・実メール・既存業務データの初期化や移行・postal更新・依存版・一般業務Rulesの変更は禁止。Dev受入は合成専用アカウント/データに限定し、ユーザーが入力した業務データと開いている未保存入力を保全する。既存業務データをテスト目的で保存しない。

分類はロジック・UI・サーバー内部データ契約/索引・文書・配備。全7ゲート（npm test、typecheck、build、Rules Emulator、Functions構文、seed構文、governance）を最終状態で実行。独立レビュー、同一UID競合・三入口共有・失敗/補償/応答喪失・異なるUID・role/scope/即時停止・最新20/21件目以降/取得件数削減を確認。Dev公開成果物・索引準備・対象Callableと画面の受入結果を別途記録する。

## Local実測・レビュー

配備対象ソースは`f90ef5b85a79a104bb1ac8348e68d4e007e5123c`。106ソースとHostingの[SHA-256記録](evidence/dev-release-account-read-2026-10-05.json)を保持する。

2026-10-05、下記を主担当が最終ソースで独立実行。必要ゲートの省略なし。保存契約文書更新後にRulesを再実行し、最終89件成功を確認した。

| コマンド | 結果 | exit |
| --- | --- | --- |
| npm test | 187件、185成功、既存環境制約2スキップ | 0 |
| npm run typecheck | 成功 | 0 |
| npm run build | 静的Hosting成果物生成。既存Nitro外部依存等の警告あり | 0 |
| npm run test:rules | demo-termite-warranty内89件成功、失敗/skipなし | 0 |
| node scripts/check-functions-syntax.mjs | 23ファイル成功 | 0 |
| node --check scripts/seed-emulator.mjs | 成功 | 0 |
| pwsh -NoProfile -File scripts/check-governance.ps1 | 7ゲート整合・managed hash一致 | 0 |

最初のRules起動はCLI設定のsandbox読取拒否でexit 1。既存CLI設定アクセスを許可した同じdemo試験で通過。外部実データの試験として扱わない。復旧CLI構文とDev受入スクリプトのplan（ネットワーク/書込なし）もexit 0。

ACCOUNT-REVIEW-04の独立レビューで復旧同士の競合欠陥を修正後に承認。reviewerが`node --test test/account-mutation.test.mjs`を独立実行し11件成功、exit 0。通常/復旧の二重実行・入力拒否後の再試行・補償失敗・応答喪失・異なるUIDを確認。実復旧は未実行。参照層はTTL/条件/認証隔離/空結果/失敗再試行/破棄後応答/64キーとUI組込みの再利用・強制更新・保存/認証変更・一覧非キャッシュをLocal確認。

## 24時間集計の再確認

2026-10-05 21:26 JST前後にFirebaseコンソールの表示を再確認。Usageのグラフ表示期間は10/4 21時～10/5 20時、Read 7,352／Write 156／Delete 166。コンソール自身が「コンソールの使用量を含む、集計クエリ等を含まない、課金指標と一致しない場合がある」と表示する。

Query Insightsはページ表示を100件へ変更し、次ページなしの全31構造を読み取った。グラフ期間は10/4 21時～10/5 21時、1,401実行・Read 5,056。個別データ・クエリの実IDは保存せず、コレクション別に集計した。

| 対象 | 実行回数 | Read |
| --- | ---: | ---: |
| 保証グループ | 310 | 1,931 |
| 物件・保証 | 214 | 1,593 |
| 工務店 | 292 | 680 |
| 支店 | 282 | 351 |
| 操作receipt | 242 | 240 |
| 横断コレクション取得 | 16 | 229 |
| 担当者 | 18 | 14 |
| 採番counter | 16 | 14 |
| アラート設定 | 8 | 4 |
| 工務店アカウント | 3 | 0 |
| 合計 | 1,401 | 5,056 |

工務店＋支店1,031は繰り返しqueryの累積で、一度に千件のデータを読んだ意味ではない。保証グループの全件queryは280回で1,931 Read、平均約6.90件。他2構造はRead 0。前回294回/2,015から窓が移動しており、減少を改修効果と扱わない。現時点では無効分も含む7件の反復取得が多い、という原因候補を実装と集計の双方から支持する。294回は全構造の総実行回数ではない。

[公式Query Insights](https://docs.cloud.google.com/firestore/native/docs/query-insights)はリアルタイムlistenerを含まず、1～2時間遅延し、対象APIも限定される。Usageと期間・取得範囲が異なるため差を特定画面へ割り当てられない。初期化前のマスタ数や開発検証・コンソール閲覧も含み、利用者の入力操作だけへ帰属させる根拠は不足。変更後の24時間削減率はまだ測定できない。今回のDev合成受入も追加Read/Writeが発生するため比較期間から区別する。

## Dev配備・開発側受入

2026-10-05、対象termite-warranty-dev、asia-northeast1。`node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only 'functions:updateStaffAccount,functions:setStaffAccountEnabled,functions:setConstructionCompanyAccountEnabled,functions:propertyPrototype,firestore:rules,firestore:indexes,hosting' --non-interactive`はexit 0。対象4 Functions更新、Rules/索引反映、Hosting 991ファイル公開。Hostingには直前コミットの旧画面撤去・軽微UI修正・オフラインモックも含む。Prod・IAM・依存版変更・Git push・既存業務データ初期化なし。

`node tmp/verify-account-release.mjs`は最初2回、索引CREATINGのためexit 1（受入未完了）。READY後の最終実行はexit 0。HTTP 200、HTML SHA-256は`0ca74271c17c8196d7fdd00ef45a4b2f38dc68eb4127930ce5ed62321f7a548f`、参照JS/CSS等24件はLocalとバイト一致。Firebase初期設定はDev。4 Callableすべて未認証401/UNAUTHENTICATED。新会社グループ索引READY。

`node tmp/dev-account-catalog-acceptance.mjs --apply --confirm-project termite-warranty-dev`は21:29～21:30 JST前後にexit 0。新規ランダムな合成アカウント4件・所有印付き文書10件だけで実行し、次の8群が成功：

1. 担当者profile・停止・再開、重複メール拒否後の整合と訂正再試行。
2. 同一UIDの並行profile変更後、Auth/文書の整合。
3. 異なるUIDの独立成功。
4. 工務店有効化の旧・現行入口による並行変更の整合。
5. 所有印付き不活性ロックで更新三入口の競合拒否。
6. グループ・会社のDB絞込、会社名用途で支店なし、工務店所属scope。
7. 合成マスタ保存と参照欠落/所属変更の拒否。
8. 既存tokenでも合成actorの即時enabled=falseを拒否。

合成4アカウント/10文書の所有印を再照合して正確なIDだけ除去し、Auth・文書の不存在を独立確認。cleanupPassed=true。ユーザー入力済み物件・既存アカウントは試験更新しない。遠隔の障害注入・実復旧は未実施で、Localの決定的試験に限定。

Chromeの既存ログイン済みDev画面は未保存ダイアログがないことを確認して再読込。物件一覧16件、アラート設定、マスタ設定、明示「最新の設定を取得」の処理終了、新規物件画面の2回表示と保存なし終了を確認した。最終は元の物件一覧へ戻し、コンソールも使用状況へ戻した。画面の失敗表示なし。実ブラウザ内のnetwork回数/課金Readは計測していないため、キャッシュの削減回数はLocal UI組込み試験と一致成果物の公開照合が根拠。5分を待つ実ブラウザ試験は行わず、TTL境界はLocalの制御時計で確認した。

## 変更範囲と残る事項

実装・試験19ファイル：`app/components/MeetingPrototype.vue`、`src/domain/reference-fetch-cache.mjs`、`functions/account-mutation.js`、`functions/account-mutation-recovery.js`、`functions/staff-account-management.js`、`functions/company-portal.js`、`functions/property-warranty.js`、`functions/index.js`、`firestore.rules`、`firestore.indexes.json`、`package.json`、`scripts/account-mutation-recovery.mjs`、`scripts/reset-dev-business.mjs`、`scripts/reset-meeting-prototype.mjs`、`test/account-mutation.test.mjs`、`test/catalog-efficiency.test.mjs`、`test/reference-fetch-cache.test.mjs`、`test/property-warranty.test.mjs`、`test/firestore-rules.test.mjs`。

影響文書は仕様、現行Meeting保存契約、security/access、ADR0036と決定索引、技術ロードマップ、operations、CHANGELOG、本記録・design索引、配備指紋、先行点検の後続修正リンク、TR009、HSC040と未決台帳の該当行。managed AGENTS・ガバナンス・検証ポリシー・依存版・業務schema・全体ロードマップの獲得進捗は変更しない。文書証跡だけの後続更新は既存ソース試験を無効化せず、governanceとdiff検査を再実行する。

残る判断：候補6の無変更保存抑止は未採用。郵便番号自動更新はHSC040提案で、Firebase設定・定期jobは未実装。結果不明のアカウント操作は安全側で管理者復旧を必要とする。別管理者更新は最大5分の表示遅延。実運用での24時間削減効果は未測定。オーナーの次の操作は通常どおりDevを使用し、必要時に最新設定を取得すること。今回承認済みの改修・Dev検証について未完了や追加承認待ちはない。
