# Dev／Prod 通常アプリの配備手順

2026-10-14制定。後続担当者が通常配備を繰り返すための現行手順。基盤作成・過去の承認経緯は[Prod構築記録](production-bootstrap-review.md)、確認済み結果は[運用記録](../operations.md)、要求は[環境仕様](../requirements/environment-configuration.md)を参照する。実行のたびに対象・変数・main・実行中jobを読み直し、この文書の過去SHAを配備対象として再利用しない。

## 1. 対象と保留事項

| 項目 | Prod | Dev |
| --- | --- | --- |
| Firebase project | `termite-warranty-prod` / number `988295873733` | `termite-warranty-dev` / number `1039792105037` |
| 公開先 | https://termite-warranty-prod.web.app | https://termite-warranty-dev.web.app |
| 業務／制御DB | `(default)` / `recovery-control` | `(default)` / `recovery-control` |
| 通常配備経路 | main push → `deploy-production.yml` | 採用済み経路はdev push → `deploy-development.yml`。**現在は未切替** |
| 認証 | production環境、固定repository/owner、main限定WIF、prod-deployer。長期鍵なし | development環境、既存Firebaseサービスアカウントsecret。Prod認証を流用しない |
| 成果物 | 同じSHAの全体bundleを検証して配備、配備jobで再buildしない | 同じSHAのHosting artifactとcheckoutのFunctions。Prodと同じ全体bundle保証ではない |

本人指示（2026-10-14、task `01a133e7-092f-71f0-b5e7-43a8b7833ab9`）により、**Dev／Prodとも日次バックアップ・PITR・Auth退避等の設定／有効化はリリース直前まで保留**。HS試行によるスキーマ変更を反映してから再検証する。通常配備成功は、保護・初期化・管理者・正式投入・業務受入れの完了を意味しない。

Prodは日次予定0・PITR無効・Auth退避先削除済み。`RECOVERY_BACKUP_AUTOMATION=false` と他3保護入力の空値を維持する。Devも日次予定0・PITR無効・automation=falseを読取り確認したが、過去のAuth退避先／検証情報の設定値は残っている。残存値を今回の取得成功や復元互換性の証拠として扱わず、自動処理を再開しない。既存退避物の削除は通常配備に含まない。

## 2. 実行前の照合

主作業ディレクトリで以下を個別実行し、各終了コードを確認する。

```powershell
git status --short
git remote get-url origin
git fetch origin main
git rev-parse origin/main
gh variable list --repo shisyamo4131/termite-warranty
```

1. originが `https://github.com/shisyamo4131/termite-warranty.git`、作業差分が今回レビュー対象だけであることを確認する。未確認の変更をstageしない。
2. GitHub Actionsで進行中／待機中の通常・保守公開・読取り照合を確認する。Prodは `production-bootstrap` 排他groupを共有し、自動取消ししない。待機を失敗と扱って再実行しない。保守workflowの検証は公開enableと承認SHAが一致する場合だけ実行する。
3. 下表と実変数、[target.json](../../deliverables/production-bootstrap-2026-10-13/target.json)の9項目を照合する。権限・請求・API・対象が変わった場合は通常手順を止め、構築記録と実資源で確認する。secret本文を表示・保存しない。

| GitHub変数 | 通常運用の期待値 |
| --- | --- |
| `PRODUCTION_APP_DEPLOY_ENABLED` | `true` |
| `PRODUCTION_BOOTSTRAP_ENABLED` | `false` |
| `PRODUCTION_TARGET_JSON` | tracked target.jsonと一致 |
| `PRODUCTION_PROVIDER_VERSION` | `sites/termite-warranty-prod/versions/a377bd20176a2ac5`（保守基準版。最新公開版で置き換えない） |
| `PRODUCTION_RECOVERY_PARAMETERS_JSON` | 下記4項目。保留中は変更しない |
| `DEVELOPMENT_BRANCH_DEPLOY_ENABLED` | 現在未設定。Dev自動配備は停止 |

```json
{"RECOVERY_BACKUP_AUTOMATION":"false","RECOVERY_AUTH_BACKUP_BUCKET":"","RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE":"","RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE":""}
```

## 3. main更新によるProd配備

目標の工程は「Local実装→Local受入れ→dev push／Dev配備→Dev受入れ→main統合／Prod配備」。Dev自動配備は未切替。PRのCI成功はDev受入れ完了ではない。2026-10-14の次段階では、PR包括検証をmainで再利用する仕組みと、dev→mainの受入れ記録照合を導入する。実証状態は運用記録を参照。

同一内容なら同じ業務試験を機械的に繰り返す必要はない。Git treeで全追跡ファイル（lock・試験・workflow含む）を比較し、24時間以内の最新PR run/attemptの7検証・3群・証跡artifactを照合する。merge commit SHAが異なってもtree一致なら再利用可能。Prod固有の接続設定・対象／権限・最終成果物と、公開後のRules／索引／Functions／Hosting一致確認は残す。別変更の混入、期限切れ、CI証跡欠落／読取り不可は包括7検証を再実行。統合PR不明またはdev受入れ未確認は停止する。

dev→mainを使う際は、実Dev受入れ後にownerがActionsの `Record explicit development acceptance` をmain上で手動実行する。入力は成功したdev pushの `deployment_run_id`、受入れた40文字の `accepted_revision`、機密を含めない受入れ記録参照 `acceptance_reference`、本人確認 `confirm=true`。Devの現head・全CI・配備成功を確認して記録し、run URLを残す。有効／保持30日。版・受入れ処理実装が変わった場合や失効時は再照合・再記録する。実施していない業務受入れを確認済みにしない。PR側とmain側で記録を読取り再照合する。Dev→PRの包括試験は現段階では残る。

1. 受入済みの変更を作業branchへcommit／pushし、main宛てPRを作る。mainへ直接pushして保護を迂回しない。PRの変更ファイル・head SHA・対象・バックアップ無効維持をレビューする。
2. 必須CI `Verify development deployment` の成功と最新mainとの同期を確認する。名前にdevelopmentが含まれていてもPRでは検証のみで、Dev配備成功の意味ではない。
3. 保護条件を満たすPRを通常mergeする。このmergeによる**main push**が通常Prod workflowを起動する。承認されたPRのheadを固定してmergeし、merge後のmain SHAを取得する。
4. Actionsの `Verify and deploy Firebase production application` で、event=`push`・branch=`main`・head SHA=merge後SHAを照合する。新規実行のattempt 1を追跡し、過去runの再実行を「今回のmain push成功」に代用しない。
5. reuse jobの判定を確認する。`reuse=true` なら参照PR run/attempt・tree・7項目の成功根拠がverifyの `Record verified reuse decision` に残り、mainの3群と7コマンドは意図的にskipする。`reuse=false` なら3群を独立VMで実行し、verifyで7項目を実行する。CIの `npm run test:rules` は同一SHA・run・attemptの全3結果を集約し全件成功と終了を検査する。どちらの経路もbundle作成・local照合・artifact保存を必須とし、revision・digestを控える。artifactは `production-release-<main SHA>`、保持1日。失敗時はconsumerだけでなくworkflow全体を再評価する。秘密値や認証ファイルを証跡へ含めない。
6. deploy jobで認証前guard、同じbundleのlocal照合・stage、WIF認証、predeploy読取り、Firebase配備、再認証、Cloud照合、認証後処理が成功するまで待つ。Firebase配備stepだけで完了にしない。

| 必須検証command | 合格条件 |
| --- | --- |
| `./scripts/check-governance.ps1` | exit 0 |
| `npm test` | exit 0、件数・skipの理由を記録 |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npm run test:rules` | exit 0、Emulator終了確認 |
| `node scripts/check-functions-syntax.mjs` | exit 0 |
| `node --check scripts/seed-emulator.mjs` | exit 0 |

これらはPR CIの独立stepで結果を残す。文書だけの変更でも実配備では包括7検証を選択し、mainでは条件を満たす同一treeのPR結果を再利用できる。条件不成立時はmainで全実行する。再利用を新たな実行成功と記載せず、元runと各gateの成功根拠を残す。workflow本体が実行コマンドの正本であり、手元から同名projectへ直接配備して代用しない。

## 4. 配備直後の合否

| 確認 | 合格条件 |
| --- | --- |
| 業務DB Rules | bundleと一致 |
| 制御DB Rules | bundleと一致 |
| 索引 | 必要定義が一致しREADY |
| Functions | source archive／実行構成がbundleと一致 |
| Hosting | 公開版を固定して全ファイルhash・ACTIVE・設定・基準版の条件が一致。期待件数／一覧件数／集計件数が一致 |
| 運用読戻し | 対象project、Functions状態、公開version・時刻、保護無効状態を確認 |

Cloud照合の `ready=true` と5項目pass、job全体success、資格情報後処理successを確認する。現行版は21 Functions・22業務索引・Hosting1005ファイルだったが、将来変更時は固定数を成功条件へ流用せず、そのSHAのbundleと照合する。

保護の読戻しはCloud Consoleまたは承認済み読取りAPIで、両環境の `(default)` の日次予定0／PITR無効、Functionsのautomation=falseを確認する。Prodは保護3入力空、Auth退避先不存在も確認する。既存Dev退避先の残存値と有効化状態は区別する。業務文書・Authユーザー・採番をテスト用に変更しない。

運用記録にはPR、main SHA、event、run／attempt、7検証の結果とexit、bundle digest、配備／5項目照合、Hosting version、保護状態、残件を保存する。ブラウザーでページが表示されることだけでは配備一致の証拠にならない。

## 5. 失敗・結果不明時

1. 次のpush／手動再実行を止め、通常自動配備を停止する。次のcommand後に `gh variable list` でfalseを読戻す。

```powershell
gh variable set PRODUCTION_APP_DEPLOY_ENABLED --body false --repo shisyamo4131/termite-warranty
```

2. enable変更は実行中jobの停止やCloudの巻戻しではない。失敗step・run・SHA・既に反映した範囲を読み取る。結果不明の配備を重ねて送信しない。
3. Hostingの全件hash／ACTIVE一致後に集計値だけ欠ける場合、実装は40秒間隔で最大3待機（120秒＋API時間）、最大4観測する。他の件数／状態待機は5秒間隔。hash・設定・公開版変更・APIエラーは即停止。上限を超えたら「タイムラグだった」と決めつけず失敗のまま記録する。
4. 保存済みの**同じSHA・digestの成果物**と実資源を読み取りで照合する。`inspect-production-application.yml` は `published-release.json` の固定receiptを使うため、現在版の汎用照合として無条件に実行しない。receiptのrun・artifact ID・revision・digest・公開版が今回に一致し、artifactが有効な場合だけレビュー後に使用する。期限切れの場合は勝手に再buildした成果物を元成果物と扱わない。
5. 原因と部分反映を特定し、必要な修正・検証・再配備対象を確定してからenableを戻す。IAM追加や基盤変更が必要なら対象を具体化して承認範囲を確認する。Git revertはCloud／DBの復元ではない。データ復旧は[復旧手順](backup-recovery.md)の別checkpointで扱う。

## 6. Devの後続切替

2026-10-14のremote一覧にdevブランチはなく、切替変数も未設定。Prod有効中はmainからの旧Dev手動配備も拒否される。**mainを更新してもDevは更新されない**。今回の再実証はProdが対象であり、Dev配備を実証済みと記録しない。

Devの自動配備を開始するときは、受入済みSHA・既存業務データとの互換性・development環境のbranch条件・認証secretの存在を先に確認する。Functionsのcontrol=`recovery-control`、automation=false、現行保護入力の扱いを確定し、CIで対話入力やProd値の流用が起きないことを検証する。現在のDev workflowはProdの全体bundle／全5項目照合と同じ保証ではないため、配備後照合方法も先に揃える。

その後、切替対象と実行を承認した範囲でdevを受入済みSHAから用意し、`DEVELOPMENT_BRANCH_DEPLOY_ENABLED=true` を設定・読戻し、dev pushによる包括検証／Dev配備を実証する。main→Prodの経路は維持する。失敗時はDev変数falseへ戻し、実行中状態と部分反映を確認する。Devの既存実データ・採番・Authを配備確認のために変更しない。

## 7. リリース直前へ引き継ぐ作業

日次30日保持・PITR・私有Auth退避先・必要権限・hash設定の保全・失敗通知・復元互換性を、HS試行後の確定スキーマで環境ごとに再確認する。Devの古い証拠文字列をProdや新版スキーマの成功証拠へコピーしない。

再開時は対象・費用・保全対象・初回取得と通知の検証方法・失敗時停止を具体化し、設定／読戻し、初回取得成功、通知到達、復元互換性の順に確認する。それまでautomation=falseを維持する。保留を保護完了として加点せず、正式提供前の必須確認は省略しない。日程判断は[ロードマップ](../roadmaps/production-readiness.md)を参照する。

## 8. 本手順の実行実績

2026-10-14、PR #13の通常mergeによるmain `7ec1e450d5db7d38d059497d6ca57dc9e967d3e8` のpushで、[run 38501319971](https://github.com/shisyamo4131/termite-warranty/actions/runs/38501319971) attempt 1が成功。包括7検証・配備・公開直後5項目照合・独立保護読戻しを完了。実績の件数・digest・公開版・残件は[運用記録](../operations.md#手順書に沿った再実証結果)を参照する。Devの自動配備を実証した記録ではない。将来の実行ではこの過去SHAを指定せず、第2節から対象を読み直す。
