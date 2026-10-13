# Operations

## 2026-10-13 Prod配備認証の初期設定・読戻し

同タスクのオーナーが「進めてください」に続き、2SA、Hosting管理（サイト削除権限を含む）／Firebase設定読取り／API利用、限定WIF、main限定production環境を具体的に承認。運用SAへの権限・接続、アプリ配備・CI有効化は除外。本人の既存gcloud／gh認証を使用し、秘密値・個人メールは取得／記録しない。初回sandboxではgh通信とgcloudローカル設定アクセスが失敗（各exit 1）、承認済み昇格で読取り・設定を実行した。Cloudエラーを成功に置き換えたものではない。

実設定と残件は[環境仕様](requirements/environment-configuration.md#2026-10-13-prod配備認証の初期設定)。Firebase ViewerはDB実データreadも含むとrole定義で判明したため付与せず、Hosting Adminに含むproject／client設定readを使用。Dev・業務DB・Authユーザー・保護設定・mainソースは変更なし。GitHubへの変更はproduction環境とmain branch policyだけ、Actions変数一覧は空。

| 実コマンド群（対象・条件は環境仕様） | 結果／個別exit |
| --- | --- |
| `gcloud projects describe`、`firestore databases list`、`services list --enabled`、`iam service-accounts list`、`iam workload-identity-pools list` | Prod識別子／parentなし／東京Native 2DB／事前API／既存SA／poolなしを確認、各0 |
| `gcloud services enable` | IAM・IAM Credentials・STS有効化成功、0 |
| `gcloud iam service-accounts create` ×2、`iam workload-identity-pools create`、`providers create-oidc` | 作成成功、各0 |
| `gcloud projects add-iam-policy-binding` ×2、`iam service-accounts add-iam-policy-binding` | 承認済み2role・限定WIF binding登録、各0 |
| `gh api --method PUT .../environments/production`、`--method POST .../deployment-branch-policies` | main限定environment作成成功、各0 |
| `gcloud ... providers describe`、`projects get-iam-policy`（専用SA限定）、`iam service-accounts get-iam-policy` ×2、`keys list --managed-by=user` ×2 | 条件・role・binding一致、運用bindingなし、両SA長期鍵なし、各0 |
| `gh api .../deployment-branch-policies`、`.../branches/main`、`.../actions/variables` | main branch 1件、main protected=false、変数なし、各0 |

分類はgovernance-permissions-agents／build-release-deploy／documentation-only、包括7ゲートを選定。ソースは `031e1bfe5679d2843acc9e39d530f47c1bba4509` から文書のみ変更。下記 `397b5423b84df168c8ed7c69aeb33d89fb726dd3` のLocal6ゲートはpolicyのinvalidatedByに該当するソース／依存／runtime変更がなく再利用（npm test、npm run typecheck、npm run build、npm run test:rules、node scripts/check-functions-syntax.mjs、node --check scripts/seed-emulator.mjs、各exit 0）。CloudのIAM変更は実読戻しで検証し、実OIDC認証を証明したとは扱わない。governance-checkとdiff整合は今回文書の最終状態で実行する。

文書検証：`pwsh -NoProfile -File scripts/check-governance.ps1` は整合成功・exit 0、`git diff --check` はexit 0。証拠追記後にも両コマンドを再実行する。実認証・token更新・許可外拒否・初回公開は未実証であり、認証整備全体の完了ではない。通常配備／運用に必要な権限・main保護・workflow統合が残る。仕様／データ契約／ADRの要件変更なし。現在地は環境仕様・runbook・両roadmap・index・changelogへ反映し、日程／工数枠変更の根拠がないためPDF据え置き。

## 2026-10-13 Prod空基盤の先行作成

根拠はタスク `01a133e7-092f-71f0-b5e7-43a8b7833ab9` の同日オーナー指示と個別回答。Devと同じ本人Firebase環境で空のProdを先行作成する承認、名／ID・標準URL、Blaze／既存請求先、メール／パスワード認証の承認を得た。日次backup／PITRは「DBだけ作成し、保護設定は後で行う」と明示されたため有効化しない。課金・保護設定の自動承認レビュー停止後、Blazeは追加承認で実行、保護設定は撤回して空DBのみ作成した。

ChromeのFirebaseコンソールでproject作成完了、Blaze変更成功、Web登録、各DBの準備完了・東京表示、メール／パスワードの有効表示を確認。詳細は[実環境仕様](requirements/environment-configuration.md#2026-10-13-prod空基盤の実作成)。各DB作成画面でStandard・本番環境モードの全クライアント拒否、backup未選択を確認した。DBへの書込み試験・アプリRulesの実配備確認ではない。業務データ・Authユーザー・アプリ権限を作成せず、Dev・GitHub設定・CI実行・通常アプリ配備は変更していない。

検証分類は実基盤構築／権限設定と記録文書。包括7ゲートを選定。ソース基準 `397b5423b84df168c8ed7c69aeb33d89fb726dd3` に対する直下の6ゲート成功（domain-test、app-typecheck、app-build、firestore-rules-test、functions-syntax、seed-syntax、各exit 0）は、今回ソース／依存／実行環境を変更せずpolicyのinvalidatedByに該当しないため再利用する。Local証拠はCloud動作保証に転用しない。今回の `pwsh -NoProfile -File scripts/check-governance.ps1` は整合成功・exit 0、`git diff --check` もexit 0。証拠追記後に同じ2確認を再実行する。Cloud操作結果は上記画面読戻しで確認、WIF・配備・ログイン・保護実証は未実行。

仕様・データ契約・ADRの既存提供条件は変更しない。実作成許可と保護開始の延期を環境仕様・runbook・両roadmap・changelogへ反映。日付／作業枠変更の根拠がないためPDF据え置き。失敗時は空基盤を保持し無承認の削除・再作成をしない。次は実IAM／WIFの具体権限確認と認証実証であり、土台全体・提供の完了を宣言しない。

## 2026-10-13 CI分離・切替準備と運用手順の最終レビュー

オーナーが先行commit／pushとLocalのCI分離・手順レビュー・実入力チェックリスト整備を許可。既存51ファイルを `1bc5f0fc46b816bc2066e56a7da6f46fa90bd9b4` に確定し、主作業ディレクトリの `codex/production-readiness` にpushした。直後の作業ツリー空を確認。main/devへ統合せず、Cloud構築・配備・GitHub設定・workflow実行の操作は行っていない。Git操作は通常sandboxでbranch作成が失敗後、許可済み昇格で成功。データや作業差分の削除はない。

CI変更：`.github/workflows/deploy-development.yml`、`scripts/development-workflow-contract.mjs`、`test/development-workflow-contract.test.mjs`。Dev変数未有効ならmain手動だけ、切替有効後はdev push／手動だけ。Prod enableが有効なら旧main→Dev手動を拒否。環境別排他・自動取消なしを追加。Dev認証・対象・配備物の契約は維持。条件を実YAMLから取得し、変数／イベント／refの144組を検証。式の文字列比較は[GitHub公式](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)の大文字小文字非区別を反映。これは実Actions・WIF・Cloudの検証ではない。

運用レビュー：初回投入前の会社情報等の登録は空領域条件と両立せず、verification中も設定保存不可。投入→HS読取確認→別了承で設定用書込み再開→会社情報／請求先設定→保護実証・最終受入れの順と停止条件を明記。Auth実import未開放、バックアップ設定結果不明時の個別回復判断を残件として維持。[Prod手順](runbooks/production-bootstrap-review.md)に入力・担当・取得元・合格条件を整理。実値・権限は未照合。

| 選定ゲート／実コマンド | 結果 | exit |
| --- | --- | --- |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 生成物／7ゲート方針整合 | 0 |
| `npm test` | 453成功、既存Windows symlink 2skip、失敗0（455試験） | 0 |
| `npm run typecheck` | 型検査成功 | 0 |
| `npm run build` | 通常Dev設定のSPA生成成功 | 0 |
| `npm run test:rules` | 隔離Emulator 201成功、停止確認true、361141ms | 0 |
| `node scripts/check-functions-syntax.mjs` | Functions／domain構文成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | seed構文成功 | 0 |

対象回帰 `node --test test/development-workflow-contract.test.mjs` 7成功・exit0。包括通常試験は条件式テストの最終編集後に実行。Emulator／型／build／構文実行後の変更はworkflow試験と文書／PDFだけで、対応ゲートの失効対象に変更なし。通常試験とEmulator試験は直列。ログはignored `tmp/prod-ci-{unit,rules,typecheck,build,focused}.log`。`git diff --check` と変更文書のローカルリンク検査もexit0。分類はdocumentation-only＋build-release-deploy、包括7ゲートを選択し省略なし。governance本体・権限・依存版の変更なし。

PDFは既存生成器で同じ10/13出力を更新。通常pythonにはreportlabがなくexit1、インストールせず付属runtimeのPythonで再生成しexit0。PopplerによるPNG生成exit0、2ページを目視確認し、pypdfで2ページ・最新工数・事前構築記載を検証exit0。旧未実装表示は除去。外部共有なし。

文書変更：本記録、Prod手順、環境仕様、専用／全体roadmap、docs索引、delivery-and-technologyの状態表示、changelog、日程deliverableのREADME／生成器／PDF。製品要件・業務データ形式・既決ADR・一般利用者操作・未解決事項の回答は変更せず、それらの更新は不要。新たな文書追加なし、既存indexの参照を維持。差戻しはCI変更をrevertして再検証。有効化後の配備停止／部分反映確認は手順に分け、Cloud巻戻し済みとは扱わない。

残工数は22日まで推定8〜10時間（入力／権限照合1〜2、HS試用支援4、別承認後の事前構築・認証実証3〜4）、23日配備3〜4時間は別枠。旧11〜14からLocal準備分を除いた再見積り。集中42時間が確保できる仮定との差32〜34時間は予約済み余裕や保証ではない。20日・22日に実条件を判定、26〜27日保護／投入／設定、28日修正、29日HS受入れ、30日納品判定。HS日程は未合意。23日構築と月末納品ラインを条件付きで維持し、全体進捗0%・必須完了条件は不変。


## 2026-10-13 初期化・正式投入・復旧／バックアップのProd対応（Local）

オーナーが「進捗が進むなら実行」と指示し、初期化・管理者・正式投入と復旧／バックアップの実装・事前検証を承認。主checkoutのHEADは `f71c9cd388355a0aca1c97dc149fe1deb683c233`。既存未コミット差分を保持して追加、commit／pushなし。実Cloudの読取・認証・設定・構築・配備・投入・復元、メール送信なし。常用Localは停止・初期化せず、試験専用Emulatorのみ使用。

実装したファイル：`scripts/production-operations.mjs`、`scripts/lib/production-operations.mjs`、`scripts/lib/production-bootstrap-data.mjs`、`scripts/lib/historical-intake-execution.mjs`、`scripts/lib/default-recovery.mjs`、`scripts/lib/firestore-recovery-provider.mjs`、`scripts/lib/auth-recovery.mjs`、`scripts/lib/production-release-bundle.mjs`、`src/domain/backup-health.mjs`、`functions/recovery-backups.js`。試験は `test/production-operations.test.mjs`、`test/emulator/historical-intake.test.mjs`、`package.json`。

動作は[Prod手順](runbooks/production-bootstrap-review.md)に集約。planは無効な資格情報でも完全オフラインで動き、inspect／executeはモード・実target・独立した運用WIF／SA・正確なcommit・クリーンな対象ソースを検査。初期化は空／同じ閉鎖世代の部分状態のみ。管理者は照合済み既存Auth UIDに登録し、Auth新規作成・メール送信はしない。正式投入は初回空業務像だけ、既存データは削除しない。初期投入の再開、全件・権限・採番・検索準備の照合と既存公開経路を接続した。

固定(default)復旧の実装を再利用。別一時DB・復旧時点了承・現在権限／採番保全、公開前の配備照合、別HS再開了承を維持。結果不明の復元POSTを再送せず、journal／排他と実LROを照合して回復する。バックアップ設定は日次30日・PITR、読取りは設定とREADY像を別表示。Auth退避は同一project bucket・非公開／30日・固定hash証拠を照合する。実Auth importの未開放は維持。バックアップ設定の不明結果の排他は自動解除せず、非公開照合と個別回復が必要。

| 選定ゲート／実コマンド | 最終結果 | exit |
| --- | --- | --- |
| `npm test` | 452成功、既存2skip、失敗0（454試験） | 0 |
| `npm run typecheck` | 型検査成功 | 0 |
| `npm run build` | 通常Dev設定のSPA生成成功・配備なし | 0 |
| `npm run test:rules` | 隔離Emulator 201成功、emulatorsStopped=true、366489ms | 0 |
| `node scripts/check-functions-syntax.mjs` | Functions／生成domain構文成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | seed構文成功 | 0 |

`node --test test/production-operations.test.mjs` は追加8試験成功・exit0。配備CIと同じSA／異なる対象・未知オプション・承認情報不足・mode不一致の拒否、無資格情報plan、別bucket拒否、復元応答不明時の再送拒否と終端回復を検証。Emulator追加2試験は部分初期化、既存データ拒否、管理者登録の中断／wrong-owner拒否／同一Auth保持、初回442件投入の中断再開・削除0・別operationの再投入拒否・全件照合。既存固定復旧／投入公開・HS別了承再開の回帰も通過。架空レコード・番号は停止済み試験Emulator内に限定し、Devの442件・採番や常用Localを触っていない。

ログはignored `tmp/prod-operations-{unit,rules,typecheck,build,functions}.log`。通常試験は450成功・2skipから追加試験後に452成功・2skipへ更新。試験失敗なし。通常試験とEmulatorは直列。後段は新Prod operatorの読取り・運用SA／回復ガード、その単体試験と文書だけで、Emulator／型／build／Functions構文の失効対象に差分なし。最終通常試験は後段コードに対して実行済み。

分類はdocumentation-only＋application-logic＋data-contract-schema-migration（private運用記録）＋build-release-deploy、包括7ゲート。governance-check・最終差分／リンク検査の結果は完了報告へ記録。必須Localゲートの省略なし。実WIF／IAM・Actions／配備・バックアップ初回取得／通知受信／現行版復元／本人ログインとHS受入れは未実施で、Local試験を代替証拠にしない。未コミット差分があるため、実行CLIのclean checkout gateを満たした実Cloud経路は通していない。

文書反映：Prod手順、バックアップ手順／設計、過去物件投入手順、環境仕様、専用／全体roadmap、棚卸し現状案内、docs索引、changelog、本記録。追加したprivate運用記録はbackup-recovery-implementationに記載。業務データ形式・製品要件・ADRの既決方針・一般利用者操作は不変で、仕様本体／業務data-contract／利用者マニュアル・ADR更新なし。依存版・governance・実権限設定の変更なし。差戻しは新入口を未使用にし、接続差分とbucket検査追加を戻す。Cloudデータ移行・巻戻しは発生しない。

残作業と推定：最終CI／設定・入力・実行順レビュー4〜6時間、HS試用支援4時間、別承認後の基盤事前構築・認証／初回基準版実証3〜4時間で22日まで11〜14時間。23日最終配備・確認3〜4時間は別枠。会社情報・請求先の設定を含む正式投入の順序、管理者Authの実UID、運用SA／WIF、bucket／hash／通知・権限の実値は最終レビューで照合する。HS2日試用・29日受入れは未合意。22日までの実条件成立を前提に23日構築・月末納品ライン維持。全体進捗0%・納品gateは変更なし。


## 2026-10-13 通常Prod配備CI・接続のLocal実装（PR-02）

オーナーの後続実装指示に基づき、通常アプリ配備のworkflowとProd接続を追加。実Cloud構築・API読取・認証・配備、GitHub設定、有効化、Dev反映は未実施。開始HEAD `f71c9cd388355a0aca1c97dc149fe1deb683c233` の主checkoutに既存差分を保持して追加。commit／pushなし。前節PR-01の残件表示は当時の状態で、現状は[専用roadmap](roadmaps/production-readiness.md)。

実装ファイル：`.github/workflows/deploy-production.yml`、`functions/deployment-target.js`、`functions/local-runtime.js`、`app/plugins/firebase.client.ts`、`nuxt.config.ts`、`scripts/check-production-deployment.mjs`、`scripts/check-production-release.mjs`、`scripts/prepare-production-release.mjs`、`scripts/production-workflow-contract.mjs`、`scripts/lib/production-release-bundle.mjs`、`scripts/lib/production-release-inspection.mjs`、`scripts/lib/default-recovery-release-proof.mjs`、`test/production-application.test.mjs`、`test/default-recovery-release-proof.test.mjs`、`package.json`、`.gitignore`。既存Dev workflowは変更していない。

確認した動作：明示Prodの画面／Functions対象一致、未知・Dev混入・Emulator混入拒否、資格情報のない検証job、7ゲートの順序、同一revisionの成果物をbuild job由来digestで検査、配備コピーと照合原本の分離、2DB／site／基準版の事前GET検査、再認証後の5項目照合、バックアップ4設定の暗黙初期化防止。基盤検査はinstalled firebase-toolsの `lib/deploy/firestore/prepare.js` がDB不在時に作成へ進む実装を確認して追加した。Cloud副作用を許可する操作を今回実行したものではない。

| 選定ゲート／実コマンド | 最終結果 | exit |
| --- | --- | --- |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 生成物・検証方針整合、7ゲート確認 | 0 |
| `npm test` | 444成功、既存2skip、失敗0（446試験） | 0 |
| `npm run typecheck` | 型検査成功 | 0 |
| `npm run build` | 通常Dev設定のSPA生成成功 | 0 |
| `npm run test:rules` | 隔離Emulator 199成功、emulatorsStopped=true、351525ms | 0 |
| `node scripts/check-functions-syntax.mjs` | Functions／生成domain構文成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | seed構文成功 | 0 |

追加検証 `node --test test/production-application.test.mjs test/default-recovery-release-proof.test.mjs` は23成功・exit0。架空Prod（fictional-prod、架空Web ID、a×40のrevision）の `node node_modules/nuxt/bin/nuxt.mjs generate` はexit0、生成HTMLのProd設定とbuildIdを検査し、同じ架空設定でFunctions sourceをimportして21exportsを確認するNode検査もexit0。関数呼出し・Cloudアクセスなし。その後 `npm run build` を再実行して通常Dev設定へ戻した。実Prodブラウザのログイン／メール成功の証拠ではない。

失敗履歴：新規Cloud Run環境照合の試験fixtureがservice／revisionで同じ配列を共有し、初回通常試験442成功・1失敗・2skip・exit1。fixtureの配列共有を解消し、最終444成功・2skip・exit0。証拠を緩める変更はしていない。通常試験とEmulatorは直列実行。ログはignored `tmp/prod-app-{unit,rules,typecheck,build,fictional-build}.log`。

分類はdocumentation-only＋application-logic＋build-release-deploy、包括7ゲートを選定。governance-checkはexit0、`git diff --check` はexit0（改行変換予告のみ）。Prod入口／helper 8ファイルの `node --check` も各exit0。Emulator終了前後の後段変更はProd専用workflow／bundleコピー／読取ガード／その通常試験と文書だけで、型・画面build・Functions・Rules結合の失効対象には変更なし。通常試験は後段変更後に再実行。Cloud／GitHub実行は未承認で未実施。clean checkoutを必須とする正式成果物生成CLIの全経路は、未コミット差分を残した現在のcheckoutでは通していない。純粋bundle／改変拒否・実Nuxt架空Prod build・既存fresh-build試験を分けて確認したもので、実Actionsの代替にはならない。

影響文書：環境仕様、Prod手順、専用／全体roadmap、棚卸しの現状案内、docs索引、changelog、本記録。製品要件・保存契約・ADRのA先行／WIF方針は不変で、仕様本体・data-contract・ADR更新不要。業務UIの操作変更がないため利用者手順は変更なし。依存版・governance・権限設定の変更なし。既存PDFは旧調整案として保持し、現在の工程・工数はroadmapが正本。

残件は初期化／管理者／投入のProd限定入口、復旧・保護のProd対応、Dev分離とCI切替、実値と保護設定、実WIF・最小権限・Cloud配備照合、HS日程と業務受入れ。22日まで19〜26時間、23日最終配備3〜4時間の推定へ更新。月末納品条件・進捗0%は維持。次の実環境操作は別承認が必要で、Local実装を実行許可として扱わない。


## 2026-10-13 Prod事前構築のLocal準備（PR-01）

オーナーが基盤事前構築を考慮したロードマップと最優先の実装・事前検証を承認。[現行ロードマップ](roadmaps/production-readiness.md)に、別承認後の基盤先行作成・WIF実証・保守表示公開と23日のアプリ配備を分離した。実Cloudの構築・設定・配備・認証試行は未実施。開始HEAD `f71c9cd388355a0aca1c97dc149fe1deb683c233` の未コミット差分に対する検証。

実装変更：`scripts/lib/operator-credentials.mjs`、`scripts/default-recovery.mjs`、`scripts/lib/production-deployment-plan.mjs`、`scripts/check-production-deployment.mjs`、`scripts/lib/production-bootstrap-hosting.mjs`、`scripts/prepare-production-bootstrap.mjs`、`scripts/inspect-production-bootstrap.mjs`、`test/production-readiness.test.mjs`、`package.json`（試験追加）、`.gitignore`、`docs/runbooks/production-bootstrap.workflow.yml.template`（非有効）。既存workflow、画面、Functions、Rules、依存版・governanceは変更なし。

短期token更新・期限不備拒否、別provider／SA／project拒否、ADCからDev書込みへの昇格拒否、許可ref／repo／owner・成果物版の照合、初回保守成果物の上書き拒否、公開設定・全ファイル・版の安定性、未知ファイル／hash不一致／ページ循環の拒否、GET限定・公開先へのBearer非送信を架空値で検証。非有効workflowの7ゲート・認証分離・同一版artifact・空site確認・Hosting限定も確認。Cloud権限・実WIF・Admin SDK互換性・Actions実行の成功証拠ではない。

| 選定ゲート／実コマンド | 最終結果 | exit |
| --- | --- | --- |
| `npm test` | 436成功、既存Windows symlink制約2skip、失敗0 | 0 |
| `npm run typecheck` | 型検査成功 | 0 |
| `npm run build` | SPA生成成功（配備なし） | 0 |
| `npm run test:rules` | 隔離Emulator 199成功、emulatorsStopped=true、362321ms | 0 |
| `node scripts/check-functions-syntax.mjs` | Functions／生成domain構文成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | seed構文成功 | 0 |

分類はapplication-logic＋build-release-deployで包括7ゲート。残るgovernance-checkと差分・リンク検査は最終報告へ記録。後段変更は新規CIガード／初回Hosting入口／試験／非有効テンプレート／文書のみで、型・アプリbuild・Functions構文・seed・Rules結合の失効対象は変更なし。通常試験は追加試験後の最終状態で再実行。Cloud照合は外部配備未承認のため未実施。

失敗記録：最初の対象試験は追加モジュールの閉じ括弧不足でexit1、修正後45成功・exit0。通常試験初回はsandboxのEPERM等で9失敗・3skip・exit1、通常権限で432成功・2skip・exit0。その後の追加試験再実行をEmulatorと重ね、共有stageロックで既存2試験が拒否されexit1。ロックは削除せずEmulator終了後に直列再実行し、最終436成功・2skip・exit0。今後通常試験とEmulator試験はstage利用のため直列実行する。ログはignored `tmp/prod-readiness-{unit,rules,typecheck,build}.log`。

文書は専用／全体roadmap、棚卸し、Prod手順、環境／納品資料、索引、changelogを整合。初回基準版方式は既存の保守表示先行案の範囲で具体化。製品要件・保存契約・ADRの所有／認証方針・governanceは不変。既存PDFは前工程の調整版として保持し、現行の工程分割と工数は専用roadmapを正本とする。前ターンのPDF／文書差分を保持。commit／pushなし。

残件：PR-02通常配備CI・Prodアプリ／全復旧照合への統合、実識別子とGitHub保護、実WIF・最小権限、PR-04以降の実行承認、HS日程。Local成果をProd構築完了や納品進捗へ加点しない。


## 2026-10-13 全件読取り削減のDev導入（開発側受入れ済み）

オーナーがDev反映→受入れ検証を明示承認。完了後にAstra／MediumでPM（白蟻）-11へ交代し現在値・残作業を報告する。本件について、以下の過去記録の「Dev反映禁止／指示待ち」を本承認で更新する。対象は満了案内、保証グループ、本支店／CSV、旧取得終了と、それらの配備ソースに含む先行保証延長申込日改修。月別対象全体取得は維持、工務店アカウント一覧は後発のまま。Prod・IAM・Auth変更・pushは対象外。

開始時の対象は既存未コミットのLocal検証済み改修群。Functions／索引／Hosting配備と保険検索用2項目の限定補完を計画し、以下の最終結果まで実施した。包括7ゲートを選定して今回ソースで再実行し、公開用buildと正式release proofも別途実施した。既存の試験環境分離・復元時投影照合も配備版に含む。現在のDevはnormal世代13、物件442、延長イベント0・申込日不足0・移行阻害0。保険検索補完対象442・阻害0。保証グループ3、接頭辞最長3文字・不正／重複／末尾ハイフン0。本支店17、必要コード管理記録11、欠落／不一致0（読取り専用照合、終了0）。許可する追加検索値と専用準備情報以外の業務値・番号・所属・アカウントを照合値で保持する。

境界試験とDev読取り実測で1,500文字の検索はINVALID_ARGUMENT、1,499文字は成功（書込み0、終了0）。当初の1,500文字案を訂正し、オーナーが1,499文字上限を追加承認した。初回結合はこの境界の2試験で失敗（終了1）、修正後の最終結果は下表のとおり。

独立レビューで長い接頭辞の検索制限を指摘。最終採用は上記の実測に基づく1,499文字。保存／再有効化の超過拒否、境界・重複・同時登録を追加検証し、既存値は変更しない。通常試験初回は制限環境の一時ファイル権限で失敗（414成功・9失敗・3skip、終了1）。通常PC権限での再実行を経て、最終版は425成功・既存Windows symlink 2skip、結合199成功・失敗／skip0、いずれも終了0。結合終了後に専用Emulator停止を確認し、常用Localは停止していない。

配備ソースは `0dd655c2d670ddddfb18403aa23dfb8c0db76270`。オーナーが実装・試験70ファイルと確認済み仕様・ロードマップ・検証記録の内容別コミットを明示承認。実装・試験を固定し、文書は最終実測を反映して別コミットする。GitHubへの送信はしない。

| コマンド | 今回の最終結果 | 終了コード |
| --- | --- | --- |
| `npm test` | 425成功・既存2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `node scripts/check-functions-syntax.mjs` | 1,499文字版で成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `npm run test:rules` | 199成功・失敗／skip0、試験環境停止 | 0 |
| `node --test test/governance-tools.test.mjs` | 10成功 | 0 |
| `npm run build:recovery-release -- --revision 0dd655c2d670ddddfb18403aa23dfb8c0db76270` | 公開用生成成功 | 0 |

最終文書の `pwsh -NoProfile -File scripts/check-governance.ps1` と `git -c core.safecrlf=false diff --check` は成功・各終了0。文書のみの追記によるアプリ証拠の失効はなく、文書検査だけ再取得した。ログはignored `tmp/full-read-dev-*.log`／JSON。公開用buildは通常buildとは別ゲートで、省略なし。今回の観察コマンドは初回に必須のdev-inspect指定がなく実行前に拒否（終了1）、明示指定後はnormal世代13・進行中更新なし・ソース清浄を確認（終了0）。索引配備は終了0、直後の準備確認では追加2設定がCREATINGのため未通過とし、後述のREADY確認後に進めた。

Devの集計ログを2026-10-12T00:00:00Z〜2026-10-13T05:58:26Zで読取り確認。101記録・続きなし、旧catalog呼出しは0。listは9呼出し・物件返却合計3,778だが、ログにはfilterがないため旧条件の利用有無をこの値だけでは判定しない。現行画面の要求形はソースと配備後Chromeで確認する。記録期間外の旧クライアント不存在まで保証しない。

索引とFunctionsのDev配備は各終了0。必要22索引すべてREADY。Functions21と配備ソース21アーカイブの一致・実行先切替を照合（`node tmp/full-read-dev-functions-proof.mjs`、終了0、05:59:51 UTC）。Functions完了観察05:59:33 UTCから315.689秒経過した06:04:48 UTCにnormal世代13・marker一致・進行中更新なしを再確認（observe、終了0）。Dev延長棚卸しの再実行も442物件・有効／取消延長0・未記録0・阻害0（終了0）。旧処理収束条件を満たしたため、保険専用2項目の整備を開始した。

差戻しは新しい検索準備情報を閉じ、レビュー済み旧配備へ戻す既存設計に従う。追加検索項目は保持、業務値を推測補完しない。新しい保存処理の配備と旧処理の最大300秒収束確認後に補完・全件照合し、準備完了を公開する。物理削除や実番号消費を伴う試験は実施せず、Devでは照合・検索・画面確認を行う。

### Dev最終結果と受入れ範囲

保険移行の実行IDは `insurance-notice-dev-20261013-01`、artifactは `7298710e61c1aec78cc6b84e72d003f60ccd99bb0811e45097ebbe1aeafb738b`。`node scripts/insurance-notice-migration.mjs apply`（project=termite-warranty-dev、control=recovery-control、generation=13、上記operation／artifact、apply／writers-drained指定）は442走査・442更新・442照合、終了0。inspect再実行は442走査・変更0・阻害0、statusはlockなし、各終了0。専用準備印1を公開。延長申込日の実データ移行は対象0のため実行していない。

保全照合は `node tmp/full-read-dev-baseline.mjs` の前後実行と照合コマンドが各終了0。物件442、保証グループ3、本支店17、対応する有効コード管理記録11は不変。許可した物件2項目と専用準備情報1文書のみを除いた全業務値のhashは前後とも `15d5de0675a1fe6edf77dd4c5a0d87c362ae9627e6bc8ed6ef38c34ef0fc3f25`。文書数は781→782（スタッフ3を含む、復旧内部文書は除外）。発行済み番号、採番値、履歴、revision、updatedAt、所属、スタッフ文書を保持。新しい保証番号・試験物件・アカウントを作成せず、Auth／IAM／Prod変更なし。

`node tmp/full-read-dev-query-check.mjs` は終了0。基準日2026-10-13、既存442物件からの従来判定と新検索の対象ID・順序が保証／保険とも一致（対象0）。保証は未案内＋満了日、保険は専用満了日の索引を利用し、両検索の物件走査0・索引走査0・readOperations各1（0件検索の最低1）。物件本文442件を取得してから判定する処理はなくなった。認証・設定・準備確認の読取りは別で、総課金0や将来の固定削減率とは説明しない。請求COUNTもstatus＋billingPendingMonth索引を利用し、集計0・索引走査0・readOperations1。以前の索引推奨表示の原因を今回の実測だけで断定しない。

Hosting配備は終了0、公開版 `sites/termite-warranty-dev/versions/e90487f9ea2b4646`。正式照合は `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 0dd655c2d670ddddfb18403aa23dfb8c0db76270 --source "(default)" --generation 13 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/b65719c70e30d2d2 --dev-inspect` で全10項目pass・終了0。2DB／Rules、normal世代13、更新0・lockなし、22索引、Functions21ソース、Hosting1,005ファイルを照合。`ready:false` は読取検査が更新許可を発行しない意味。初回はprovider版を省略しFirebase自動追加の2ファイルだけhash不一致（終了0だが未通過）。診断で差異を限定し、記録済み配備前版の実公開履歴・設定・2ファイルも既存の正式検査により照合した。検査の緩和・再配備は行っていない。

Chromeのログイン済みDevで保証満了案内0件・保険満了案内0件の正常表示、物件最新20件、表示済み保証番号の完全一致1件、保証グループ3件→所属工務店1件→本支店2件を確認。新規登録の工務店3候補と選択会社の本支店2候補も表示し、保存せず閉じた。最後は保証満了案内へ戻した。画面証拠はignored `tmp/full-read-dev-warranty.png`・`full-read-dev-insurance.png`。06:07:50〜06:11:24 UTCの実画面集計ログ10記録・続きなしでは、list3要求の物件返却0、propertyList2要求は計21（20＋1）、すべてsuccess（読取helper終了0）。

Devは案内対象0のため、対象あり表示、保存・再有効化・CSV確定・同時登録・長さ境界・旧要求拒否・工務店権限の更新を実データでは再演していない。それらは既存Local受入れと今回の199結合試験を証拠とし、Devでは同じ配備ソースと索引・実検索・既存画面を照合した。HS本人の業務受入れとは別である。採用済み全件読取り削減の実装・Dev導入に残件なし。HS少数一覧と共有store、月別／満了の対象全体取得は維持し、工務店アカウント一覧は展開時の後発、運用後Read／Write評価は将来事項。

文書は実仕様・設計・3判断記録・専用ロードマップ・索引・利用説明・本記録・changelogへ反映。新たなRules／依存版／ID移行はない。既存governance差分はLocal試験データの恒常承認と自動試験の分離・検証失効条件で、今回の配備版に合わせて包括検証済み。既存のProd計画文書は文書として統合するだけで、実Prod作業に進めない。全体納品進捗率は加算しない。


## 2026-10-13 その他旧取得の停止（Local受入れ済み・Dev未反映）

オーナーの残件3着手指示に従い、[追加工程O1〜O3](design/legacy-property-list-retirement.md)を完了。月別一覧・満了案内の対象全体取得は現状維持とし、運用開始後の一定期間のRead／Write実績で再検討する。旧catalog（工務店referenceStore以外）、旧5マスタ全件取得、旧案件／マスタ一覧の全件モード、旧物件編集の参照候補全件取得を読取り前に明示エラーとした。現在の共有store、所属制限、最新20件、表示行参照、1案件の保証履歴は維持する。

製品変更は `functions/property-warranty.js`（catalog）、`app/repositories/masterCatalogRepository.ts`・`firestoreCaseQuerySource.ts`・`caseListRepository.ts`、`app/composables/useMasterManagement.ts`。試験変更は `test/catalog-efficiency.test.mjs`・`prototype-data-boundaries.test.mjs`・`emulator/property-warranty.test.mjs`・`emulator/reference-store.test.mjs`。主担当が実装・差分確認・検証を実施。共有ファイル内の先行改修と他の未コミット差分を維持。今回の画面構成・Rules・索引・保存データ形・依存関係・governance変更なし。移行不要、commit／push／Dev操作なし。

読取り計測は認証・復旧確認を除くマスタ本文の返却数。旧要求8種類×HS／全店／支店の24要求とHSのreferenceStore要求はマスタ0件。工務店全店担当は会社1＋保証グループ1＋本支店25＝27件。他社本支店を30件追加しても27件のまま。支店担当は会社1＋保証グループ1＋自支店1＝3件。無効アカウント・所属欠落／不正もマスタ取得前に拒否。旧クライアント全件関数は取得／購読開始0を通常試験で検証。課金総量0の意味ではない。

Chrome `http://127.0.0.1:23600/` のLocal受入れ：HSの保証グループ5件、架空対象グループの工務店1件・本支店3件、物件7件、物件新規登録の工務店絞込みと自社3支店候補を確認。全店担当の物件2件・会社固定・自社3支店候補、支店a担当の物件1件・会社と支店a固定表示を確認。保存せず閉じ、担当切替後も正常表示し、最後にログアウト。認証付きLocal HTTPでは旧要求7種類×3担当をINVALID_ARGUMENT、HSのreferenceStoreをFAILED_PRECONDITION、全店3支店／支店a1支店を確認。復旧状態normalと世代一致・不変を確認。業務データの追加／変更／削除なし。既存架空データをそのまま保持し常用Local停止なし。

分類はapplication-logic＋documentation-only、クライアント取得モジュール変更のためbuildも実施。通常試験初回は新試験の初期Map件数の期待値誤りで終了1、購読件数0を検査する形へ直し再実行。Local HTTP初回は実行制限でPC内への接続がEACCES（終了1）、許可された実行方式で再実行して成功。製品コードは最終結合開始後に変更なし。結合は常用Localと分離した試験プロファイルで198成功、失敗／skip0、試験Emulator停止確認（342134ms）。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `npm test` | 最終424成功・既存Windows symlink 2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功（配備なし） | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `npm run test:rules` | 198成功・失敗／skip0 | 0 |
| `node tmp/legacy-catalog-local.mjs` | 再実行でHTTP拒否・所属・normal不変確認成功 | 0 |

ログはignored `tmp/legacy-catalog-{domain-final,typecheck,build,syntax,integration}.log`、Local補助は `tmp/legacy-catalog-local.mjs`、画面証拠は `tmp/legacy-catalog-local-head.png`・`legacy-catalog-local-branch.png`。最終文書のgovernance確認・diff検査は完了時に実施し、結果を完了報告に記載する。選定検証の省略なし。Devの旧呼出し稼働状況・配備後の結果は未確認で、明示指示後のO4に残す。

文書反映：`docs/specification.md`、`docs/requirements/search-and-list.md`・`master-management.md`・`user-explanation-items.md`、`docs/design/meeting-prototype-2026-10-03.md`・`legacy-property-list-retirement.md`・`full-read-audit-2026-10-12.md`・`README.md`、`docs/roadmaps/technical-remediation.md`、`docs/decisions/0045-legacy-property-list-retirement.md`、`docs/README.md`、`CHANGELOG.md`、本記録。データ形・移行手順の新設なし、全体納品進捗への加点なし。差戻しは今回停止した取得分だけを戻すが、旧全件取得が再発するため再配備判断時に評価する。


## 2026-10-13 旧一覧取得の撤去（Local検証・受入れ済み・Dev未反映）

[採用設計とL1〜L5工程](design/legacy-property-list-retirement.md)、[判断記録0045](decisions/0045-legacy-property-list-retirement.md)に従い、物件本文取得前の許容条件検査と所属付き保証候補検索を実装。旧条件・未知キー・混在・不正型はinvalid-argument。現行最新20件・保証番号完全一致、月別対象取得・返却形式は維持する。業務データ移行なし、所属索引2構成を追加。Emulatorではクラウド索引の準備完了を証明できず、Dev導入時の別途確認事項とする。

製品差分は `functions/property-list-filter.js`（新規）、`functions/property-warranty.js`（list／propertyList）、`functions/warranty-notice-query.js`（認証済み所属条件）、`firestore.indexes.json`。試験は `test/property-warranty.test.mjs`、`test/emulator/property-warranty.test.mjs`・`dashboard-insurance.test.mjs`・`reference-store.test.mjs`。主担当が実装と確認を担当。今回の画面・Rules・保存処理・権限定義・governance・依存設定の変更なし。共有ファイル中の既存別改修を維持し、commit／pushなし。

読取り検証はpropertyWarranties本文に限定し、認証・準備情報・名称参照や課金総量とは区別。旧条件13種類×HS／全店／支店の39要求は本文取得0回・0件。通常候補はHS3件／会社2件／支店A1件／支店B1件／他社1件。対象外を所属内30件・他社30件追加しても支店Aは1件読取りのまま。候補21件追加時は22件を取得し、20件で欠落させない。検索項目欠落は非救済。所属不備・無効アカウント・他社指定を拒否。保証・保険の旧全件比較は試験専用の参考走査へ移し、結果・順序・時刻精度・除外判定の比較を残した。

Chrome `http://127.0.0.1:23600/` の受入れ：架空全店担当で保証2件、支店aでaの1件、支店bでbの1件、対象なし支店で0件。支店aからbの保証番号検索は0件。HS管理者では保証3件・保険1件・通常物件7件、保証番号完全一致1件を確認。旧条件は操作欄がないため画面確認とは分け、Localの認証付きHTTP入口で4種類×4担当をINVALID_ARGUMENTとして確認した。復旧状態はnormalを維持し、常用Local停止・Dev接続なし。

Local補助スクリプトはignored `tmp/list-retirement-local.mjs`。作成には現行保存処理を使用し、準備印の書換えはしない。初回は受入れ入力の住所フィールド欠落を拒否（終了1）、補正後は一時的な取引ロックで終了1、同じIDで再実行し成功（終了0）。架空グループ1・工務店1・本支店3・物件2・工務店アカウント4と関連記録／採番を受入れ用に保持。既存架空HS管理者を再利用。正式取込み入力には混ぜない。画面証拠はignored `tmp/list-retirement-head.png`・`list-retirement-branch-a.png`・`list-retirement-insurance.png`。

分類はapplication-logic＋data-contract-schema-migration（索引）＋documentation-only。画面・ビルド設定は今回不変のためapp-buildは選定対象外。通常試験424成功・既存Windows symlink 2skip（終了0）、型検査（終了0）、Functions構文（終了0）、seed構文（終了0）。初回結合は旧全件取得を期待した2試験が失敗（終了1）、試験の比較を維持して新仕様へ更新。最終結合は197成功・失敗／skip0、試験Emulator停止確認済み（361176ms、終了0）。製品コードは最終結合開始後変更なし。最終文書検証の実行結果は完了報告を参照。ログはignored `tmp/list-retirement-{domain,typecheck,integration,integration-final}.log`。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `node --test test/property-warranty.test.mjs` | 68成功 | 0 |
| `npm test` | 424成功・既存2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `npm run test:rules` | 最終197成功・失敗／skip0 | 0 |
| `node tmp/list-retirement-local.mjs prepare` | 入力修正・一時ロック後の再実行成功 | 0 |
| `node tmp/list-retirement-local.mjs verify` | HTTP取得範囲・旧条件拒否・normal不変の再照合成功 | 0 |

影響文書の相対リンク529件と追加索引2構成の存在・重複なしをNodeで照合し終了0。最終文書の `pwsh -NoProfile -File scripts/check-governance.ps1` と `git -c core.safecrlf=false diff --check` は完了時に実行し、結果を完了報告に記載する。

文書差分：`docs/specification.md`、`docs/requirements/search-and-list.md`・`alerts-and-dashboard.md`・`user-explanation-items.md`、`docs/design/meeting-prototype-2026-10-03.md`・`legacy-property-list-retirement.md`・`full-read-audit-2026-10-12.md`・`README.md`、`docs/roadmaps/technical-remediation.md`、`docs/decisions/0045-legacy-property-list-retirement.md`・`README.md`、`docs/README.md`、`CHANGELOG.md`、本記録。保存項目追加・業務値変更がないため移行手順の新設は不要。全体納品進捗の加点なし。Dev導入前の既存準備情報、クラウド索引、旧クライアント状況の確認と配備は明示指示待ち。

## 2026-10-13 本支店・CSVの対象読取り（Local受入れ済み・Dev未反映）

オーナー採用により、既存branchCodeReservationsを使い本支店保存・再有効化の会社内全本支店検索を撤去。CSV事前確認・確定は入力内の異なるコードの管理記録から本支店IDを取り、本文だけまとめて読み、会社・コード全文・ID・有効状態を照合する。管理記録の欠落を救済せず、ID・保存形・コード必須条件・番号・所属・共有Storeは維持する。

製品変更は `functions/property-warranty.js` のreserveBranchCodeと `functions/property-bulk-import.js` の本支店照合。試験変更は `test/emulator/property-warranty.test.mjs`、`test/emulator/isolated-property-import.test.mjs`。他の未commit変更は保持。本差分は主担当が実装とレビューを実施し、サブエージェントは使用していない。新旧コード管理記録の所有確認、全読取り後の一括更新、CSVの不正参照拒否・事前確認後再検査・再送結果維持を確認した。

独立したAdmin接続2つを同じ試験DBへ接続し、最初のコード管理記録取得の直前で両方の到達を揃えた。同一コード新規登録5回・再有効化5回とも1成功／1 already-exists、最終有効本支店と管理記録の所有者一致。異なるコードは両方成功。保存経路でコレクション検索を禁止する試験を追加し、対象外30本支店を増やしても同コード編集の管理記録読取りは1件。CSV同一コード2行は対象外30本支店の追加前後とも管理記録1件＋本文1件。これらは当該照合部分の観測値であり請求総量ではない。

既存の長いコード、先頭ゼロ、他会社同コード、必須／空欄、無効化／再利用、親無効化、CSV279行一括確定、事前確認後のコード変更・無効化、初期取込と復旧整合も最終結合で成功。管理記録の欠落・誤所有・不正ID・不存在参照・コード／会社不一致を拒否。アプリ外の直接重複は毎回のCSVでは検出せず、復旧整合検査で検出する確定仕様に既存試験を修正。

分類はapplication-logic＋documentation-only。保存形の変更なし。主担当が試験を一つずつ担当し、通常試験終了後に分離済み `demo-termite-warranty-test` の結合runnerを実行。常用Localは停止せず、Dev・Prodに接続しない。Local受入れは別ポートで実施。製品コードは最終結合開始後変更なし。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `npm test` | 通常権限で423成功・既存Windows symlink 2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `node --check test/emulator/property-warranty.test.mjs` | 追加試験の括弧修正後成功 | 0 |
| `npm run test:rules` | 最終196成功・失敗／skip0、emulatorsStopped=true、360035ms | 0 |
| `node tmp/branch-read-acceptance.mjs prepare` | Local架空データ準備、本支店1件／管理記録0件の整合確認 | 0 |
| `node tmp/branch-read-acceptance.mjs verify` | 本支店3件／管理記録2件が整合、CSV2物件の本支店ID・保証番号一致、normal維持 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 最終文書・規則整合確認成功 | 0 |
| `git -c core.safecrlf=false diff --check` | 差分形式確認成功 | 0 |

初回通常試験はサンドボックスの一時ファイルrename／realpath制限で413成功・9失敗・3skip、終了1。同じ試験を通常権限で再実行して上記成功。初回結合は追加試験の括弧過剰により構文エラー、終了1。修正・構文確認後に全体を再実行して上記成功。ログはignored `tmp/branch-read-{domain,domain-final,typecheck,integration,integration-final}.log`。画面・共通domain・依存・ビルド設定の変更がないためapp-buildは今回の選定対象外。未実施のDev配備・実データ照合・課金実測を成功扱いにしない。

Chromeの `http://127.0.0.1:23600/` で架空管理者を使い、「架空本支店読取り確認」／「架空本支店受入れ工務店」を用意。本店0001新規保存、同コードの別支店を重複拒否、0002へ変更して保存、無効化で一覧から除外、無効を含めて再有効化、同コードの通常編集を確認。架空CSV2行の事前確認・本登録成功を画面で確認し、DBでも0001→本店／0002→支店、LOCALBRANCHREAD-26-001／002を照合した。全Localのコード管理記録に不整合はなく移行・補完は不要。架空管理者1・グループ1・工務店1・本支店2・物件2と関連管理記録／採番は受入れ用に保持。画面証拠はignored `tmp/branch-read-local-acceptance.png`。Local用補助スクリプト・CSVもignored tmpに置き、実データや正式取込資料に混ぜない。

文書変更：`docs/specification.md`、`docs/requirements/master-management.md`、`docs/design/master-code-read-reduction.md`・`property-bulk-import.md`・`full-read-audit-2026-10-12.md`・`README.md`、`docs/roadmaps/master-code-read-reduction.md`・`technical-remediation.md`、`docs/decisions/0044-branch-code-targeted-reads.md`・`README.md`、`docs/README.md`、`CHANGELOG.md`、本記録。コード管理記録の保存形は不変で、新たなデータ契約・移行・UI操作説明は不要。権限・governance・Rules・索引・依存・環境設定は変更なし。未commitの既存差分と同じ主作業ディレクトリで作業し、commit／push／Dev反映なし。Dev導入前の実データ照合と導入は明示指示待ち。

## 2026-10-13 保証接頭辞の一致検索・同時登録検証

オーナー採用によりR1を実装。`functions/property-warranty.js` のsaveGroup／reenableMaster(group)をprefix完全一致・limitなし・自ID除外へ変更し、既存トランザクション内の検索／保存を維持。`src/domain/property-warranty.mjs`はtrimだけとし末尾ハイフンを保持。使用先記録・新しいID・検索項目・準備情報を追加せず、発行済み保証番号の書戻し・Dev操作はしない。

試験変更は `test/property-warranty.test.mjs`、`test/emulator/property-warranty.test.mjs`。独立したAdmin接続2つを同じ試験DBへ接続し、最初の一致検索の呼出しを両方到達するまで揃えて同一接頭辞を異なるIDで登録。5回すべて1成功／1 already-exists、検索結果0と1の観測、最終保存1件を確認。異なる接頭辞は両方成功。同一文書の同時編集は両方成功して後勝ちを維持。空接頭辞重複、無効中の占有、自己ID除外、再有効化、既存重複の拒否、末尾ハイフン別物、新規二重ハイフン番号、既存番号の保存値不変を確認。対象外グループ30件追加前後で編集の検索取得は1件のまま。

選定分類はapplication-logic＋data-contract-schema-migration（接頭辞の意味変更）＋documentation-only。共通関数の画面利用を踏まえbuildも実施した。製品コードは最終結合試験の開始以降変更なし。試験は分離済み `demo-termite-warranty-test`、常用Localは停止していない。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `node --test test/property-warranty.test.mjs` | 67成功 | 0 |
| `npm test` | 最終423成功・既存Windows symlink 2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功、配備なし | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `npm run test:rules` | 最終195成功・失敗／skip0、emulatorsStopped=true、331750ms | 0 |
| `npm run prepare:functions` | domain54件同期・unchanged | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 文書・規則整合確認成功 | 0 |
| `git -c core.safecrlf=false diff --check` | 差分形式確認成功 | 0 |

新規／更新した設計・工程・ADRの相対リンク10件もNodeで存在確認し終了0。

初回 `npm test` は結合試験と並行してしまい、試験stageのactive.lock競合による2失敗・終了1。結合終了後に順番を分けて再実行し成功。初回結合は旧YEAR-表記の期待値1件が失敗・終了1。新仕様のYEAR--へ期待値を修正し、同時編集・空接頭辞・重複再有効化の確認も加えた最終結合が上記195成功。成功を初回結果に上書きしない。ログはignored `tmp/group-prefix-{unit,domain,domain-final,typecheck,build,integration,integration-final}.log`。

Chromeの `http://127.0.0.1:23600/` で架空管理者を使用し、`架空接頭辞確認・末尾なし`（LOCALPREFIX）と `架空接頭辞確認・末尾あり`（LOCALPREFIX-）を新規登録。末尾ありの登録時設定表示、請求先だけの編集保存、無効化→無効を含む表示→再有効化を確認した。終了後のDB読取りでも各接頭辞1件・両方有効・請求先の保存一致・normal状態を確認、終了0。架空2グループと架空請求先は今後のLocal受入れ用に保持し、物件や採番は追加していない。画面証拠はignored `tmp/group-prefix-local-acceptance.png`。Devデータの現状や本番同時実行の実測を確認済みとはしない。

今回の文書変更：specification、requirements/master-management・user-explanation-items、design/master-code-read-reduction・meeting-prototype-2026-10-03・full-read-audit-2026-10-12・README、roadmaps/master-code-read-reduction・technical-remediation、decisions/0043-group-prefix-equality・README、docs/README、CHANGELOG、本記録。R1の接頭辞予約案を撤回し、R2／R3は未採用のまま分離。主担当が保存・再有効化・番号生成・編集画面の共通関数利用と試験差分を確認。サブエージェント利用なし。仕様・保存契約・判断理由・工程・利用説明の影響範囲を整合。権限／governance／索引／依存／環境設定変更なし。既存の他作業差分を保持し未commit。Dev導入は明示指示待ち、現在の保存接頭辞の調査は導入前残件。

## 2026-10-13 保証グループ・本支店の読取り削減設計

オーナーの「1の具体設計」指示に基づき、R1〜R3の通常保存・CSV・予約生成・復旧検査と確定仕様を読取り調査し、[具体案](design/master-code-read-reduction.md)と[工程](roadmaps/master-code-read-reduction.md)を作成。接頭辞予約新設、本支店既存予約活用、CSVの対象ID取得、全件整合を確認してから切替える案。欠落補完と不整合の修正判断を分け、正規処理外変更を毎回全件照合なしで検出する保証はしない。実データ件数・削減率は未測定。

今回の編集は上記新規2文書、docs/README、design/README、design/full-read-audit-2026-10-12、roadmaps/technical-remediation、本記録のみ。設計提示段階のため、確定仕様・保存契約・ADR・CHANGELOG・利用者説明は採用後の工程へ置き、未採用案を反映しない。製品コード・Localデータ・Dev・権限・governance変更なし。既存差分を保持、未commit。サブエージェント利用なし。検証分類はdocumentation-only、製品試験・型・build・結合試験等は非対象。`pwsh -NoProfile -File scripts/check-governance.ps1`、`git -c core.safecrlf=false diff --check`、Nodeによる新規2文書の相対リンク5件の存在検査は各終了コード0。

## 2026-10-13 満了案内のLocal受入れ残件完了

更新されたLocal受入れ用データの恒常承認とオーナーの実施指示に基づき、常用Local `demo-termite-warranty`（画面127.0.0.1:23600、Firestore28080、Auth29099、制御DB `test-fixed-control`）だけを使用した。通常稼働・世代一致・移行作業の競合なしを確認し、既存の登録／保険報告処理で架空物件2件を追加。既存の保険検索整備処理は3件走査・1件補完・3件照合を完了し、対応する準備情報を公開した。印だけの書込みや、一覧取得時の欠落救済はしていない。従来のCSV確認物件の業務値を維持し、不明な延長申込日は補完していない。

ChromeのLocal画面へ架空管理者でログインし、次を実画面で確認した。

| 確認対象 | 結果 |
| --- | --- |
| 保証満了案内 | 初回・「一覧を更新」とも1件。`架空受入れ確認・保証満了対象`（LOCAL-16-002）、2016-10-01～2026-09-30、未案内／延長可能／満了済み。詳細でも10年／上限20年、未案内と同じ期間を確認 |
| 保険満了案内 | 初回・「一覧を更新」とも1件で準備不足エラーなし。`架空受入れ確認・保険満了対象`（LOCAL-21-001）の次の報告対象期間2026-10-01～2031-09-30。詳細で前半5年が報告済み、後半5年が未報告、対象年月2026年09月分を確認 |
| 読取り | 当該4回の一覧取得はすべて成功。Functionsの観測記録では各回とも物件検索1回・取得物件1件。設定・認証・復旧管理の読取りは別途発生する。Devの課金実測ではない |
| 整合確認 | 受入れ後も3件走査・補完必要0・不整合0、期待する各1件のID一致、通常稼働・移行用作業ロックなしを確認 |

実行補助はignored `tmp/notice-acceptance-20261013.mjs`。`node tmp/notice-acceptance-20261013.mjs prepare` と `node tmp/notice-acceptance-20261013.mjs verify` は各終了コード0（ループバック接続、METADATA_SERVER_DETECTION=none）。観測元はignored `tmp/local-preserve-notice-20261013-01/restart-out.log` の末尾4回のlist記録。今回は表示確認のみで案内済みへの変更や次期保険報告は実行していない。

追加した架空2物件、関連履歴・採番、整備した検索用項目・準備情報は今後のLocal受入れ用に残す。一時的な業務データの削除・採番巻戻しは不要。常用Localの停止・全体退避・復元、Dev操作、外部送信は実施していない。

今回の管理対象変更は本記録と `docs/roadmaps/expiry-notice-read-reduction.md` のP4証拠更新のみ。製品コード・仕様・保存形式・権限・governanceの変更なしのため、仕様／ADR／データ契約／CHANGELOG／利用説明は変更不要。`pwsh -NoProfile -File scripts/check-governance.ps1` と `git diff --check` は各終了コード0。アプリ・型・build・結合試験の再実行はdocumentation-onlyの選択規則により非対象。既存の他作業差分を維持し、未commit。先行する0件・準備不足時の確認と合わせ、依頼されたLocal実画面受入れの残件は完了。Dev導入は引き続き明示指示待ち。

## 2026-10-13 分離後の軽微な再発確認

オーナー依頼により、PM（白蟻）-10の待機を確認し、常用Localを稼働したまま既存のExcel日付限定試験1件を再実行した。`npm run test:rules:focused -- excel-dates` は1成功・失敗／選択skip／想定外実行0、後始末成功、プロセスexit0。起動から終了まで12946ms（PowerShell Stopwatch実測）、ログはignored `tmp/lightweight-isolation-focused.log`。前回との条件を揃えた速度比較ではない。

前後の待受読取りでLocalの23600／25001／28080／29099は同じPIDを維持。終了後に試験専用9ポートの解放、一時stageとactive.lockの残存なし、Local画面のHTTP 200を別プロセスで確認（各exit0）。Local停止・データ退避／復元・全件照合なし。今回の単一試験は分離runnerの再発確認であり、満了案内の正常系画面受入れや他プロジェクトによるポート占有の解消を証明するものではない。常用Localへのデータ変更は必要なく、恒常承認の運用による受入れデータ整備自体は今回未実施。

実装・試験・設定は変更せず、本記録だけを追記。下記の306入力のSHA-256は実行前に `39c2a3cb9c1819e0a114a979590a6f97b951976f8ac8bbf200376a446cae9253` と一致し、Nodeも22.23.2のまま。記録追記は関連ゲートの失効条件に当たらないため、単体全件・結合全件・typecheck・build・構文検査は前回成功証拠を再利用し再実行しない。今回はdocumentation-onlyのgovernance-checkと差分空白検査を選定し、結果と独立した終了コードは本タスクの完了報告に記録する。新しい必須チェックリストは追加しない。

## 2026-10-13 自動試験の用途別分離とLocal試験データ承認

オーナーがGOVERNANCE-MANAGERで、用途別ポート・接続先・生成物の分離改修、およびLocal受入れ用試験データの作成／変更／削除を都度承認不要とする変更を明示承認。PM（白蟻）-10の実画面確認ターン `01a132d4-1c04-7691-87c0-d94d57c8f178` は終了済みで、保険準備情報不足・保証対象あり表示が残件だった。受領応答だけの後続ターンを実作業に数えず、編集前の共有と待機確認後に主担当が改修した。

通常Localは従来のdemoとポートを保持。自動試験は別demo・9専用ポート・所有印付き一時Functions／domain・CLI設定・ログへ分離し、直接importする試験も同じ一時Functionsを使用する。別runnerはロックで排他し、常用Local接続・外部project・接続先不一致を拒否する。Functions読込み失敗を子試験の成功だけで通過扱いにしない。手順は[利用調整](#localと自動試験の利用調整)、承認範囲は[Local受入れ用データの恒常承認](../governance/project-rules.md#local受入れ用データの恒常承認)を正とする。

今回の所有差分：

- 実行先：`functions/test-emulator-profile.js`（新規）、`functions/local-runtime.js`、`functions/recovery-runtime.js`、`scripts/lib/default-recovery.mjs`、`scripts/lib/historical-intake-execution.mjs`。既存のDev経路は維持し、試験専用projectの例外は実行ID・固定Emulator接続先を照合した場合に限る。
- runner：`scripts/lib/test-emulators.mjs`、`scripts/lib/test-emulator-stage.mjs`、`scripts/lib/test-functions-register.mjs`、`scripts/lib/test-functions-loader.mjs`（後3件新規）、`scripts/test-rules.mjs`、`scripts/test-rules-focused.mjs`。
- 試験補助・回帰：`test/helpers/emulator-runtime.mjs`（新規）、`test/helpers/fixed-runtime.mjs`、`test/helpers/legacy-recovery-runtime.mjs`、`test/helpers/isolated-import.mjs`、`test/focused-emulator-test.test.mjs`、`test/local-runtime.test.mjs`、`test/rules-runner.test.mjs`、`test/firestore-rules.test.mjs`、`test/firestore-control-rules.test.mjs`。
- `test/emulator/` の接続先・project・ガード更新：bounded-list、callable-applied-warranty、callable-profile-registration、case-edit、company-portal、dashboard-insurance、dashboard-migration、default-recovery、extension-application-migration、firestore-metrics、fixed-runtime、historical-intake、isolated-property-import、property-address-migration、property-name-migration、property-warranty、recovery、reference-store、registration、staff-account-management（各 `.test.mjs`）。業務シナリオ・試験対象を削らず、先行のPM改修を保持。
- ガバナンス：`governance/project-rules.md`、`governance/README.md`、`governance/verification-policy.json`（新helperの失効対象を明記）、生成された `governance/governance.lock.toml` と本書の方針要約・運用手順。共通契約・AGENTS本文・Skills・他プロジェクトは変更しない。製品要件・保存形式・業務ロードマップへの変更／加点はない。

分類はrunner／実行先ガード／承認境界変更のため包括7ゲート、加えてpolicy変更でgovernance-tools回帰。以下は今回の最終適用差分での結果。各exitは実行ツールのプロセス終了から独立確認した。Node 22.23.2。結合試験開始後の追加編集は通常回帰試験ファイル、失効条件の記述と運用文書に限り、Emulator側の実行入力・試験対象・判定条件は変えていない。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 423成功、既存Windows symlink 2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 193成功、skip／失敗0、emulatorsStopped=true、310995ms | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 運用記録追記後の検査も成功 | 0 |
| `git -c core.safecrlf=false diff --check` | 成功 | 0 |
| `node --test test/governance-tools.test.mjs` | 10成功 | 0 |
| `npm run test:rules:focused -- excel-dates` | Functions起動修正後に1成功、後始末成功。全体ゲートの代替にはしない | 0 |

検証入力はapp／functions／src／scripts／test／governanceと主要設定・manifestの追跡／未追跡306ファイルをパス昇順、各「path・NUL・bytes・NUL」で連結したSHA-256 `39c2a3cb9c1819e0a114a979590a6f97b951976f8ac8bbf200376a446cae9253`。ignoredログは `tmp/isolated-*.log`。初回の限定試験は試験自体が成功してもFunctions定義の読込みが失敗しており、全体起動成功証拠には採用しなかった。Firebaseの定義検出が親の独自環境変数を引き継がないため一時 `.env.local` へ実行IDを渡し、修正後にFunctions起動も確認。暗黙のEventarc／Tasksポートも専用化した。回帰試験の初回はsandboxのrealpath EPERMで失敗し、ガードを弱めず同じ試験を承認された通常権限で実行した。

常用Local稼働中の結合試験前後に、業務／制御の2DB・Auth1アカウント・共有 `functions/domain` のハッシュ一致を読取り確認（`node tmp/verify-isolated-local.mjs before`／`after`、各exit0）。比較用ハッシュだけ保存し、データの退避・停止・復元なし。制御DBを業務専用scannerで読む初回診断は拒否され、読取り比較処理へ訂正した。Localの4サービスは同じPID、試験の9ポートは解放、一時領域とロックなしも別の読取検査でexit0。これは分離改修の一回の保全実証であり、今後のLocal試験データ操作すべてに全件照合を義務付けるものではない。通常試験では競合時の拒否、所有不一致での削除拒否、後始末未完了時の保持、試験用Functionsへのimport切替を確認した。

Local受入れ用の物件・Auth・採番・検索準備情報は今後都度承認なしで整備可能。今回、PMの残る正常系画面受入れ自体は実施していない。満了案内のfocused追加は未実装。Dev／Prod操作、commit／push、Localデータ変更は行わず、既存未commit差分を保持した。310995msは全体試験の今回実測で、従前と同条件の短縮比較ではない。

## 2026-10-13 満了案内のLocal実画面受入れ確認（制限あり）

オーナーの受入れ確認指示によりcomputer-useでChromeのLocal `http://127.0.0.1:23600/` を確認。Devタブは操作していない。稼働中Localのアカウントを読取り確認し、既存の架空CSVデモ管理者でログインした。seedのデモ管理者は存在せず初回ログインがuser-not-foundとなったが、アカウント新設・再設定・seed実行はせず、実在するLocal専用アカウントで確認を続行した。

| 確認項目 | 実画面・Local記録の結果 | 判定 |
| --- | --- | --- |
| ログイン・ダッシュボード | 有効1件、保証満了案内待ち0件を表示 | 確認済み |
| 保証満了案内・一覧更新 | 初回・更新とも0件、該当物件なし。各要求は物件候補検索1回・本文取得0件、成功 | 現在の0件条件で合格。対象ありの画面確認は未実施 |
| 保険満了案内・一覧更新 | 初回・更新とも「保険案内の準備状態を確認してください。[400]」。各要求は物件検索0回・本文取得0件で失敗 | 準備不足時の停止は仕様どおり。正常一覧の受入れは未完了 |
| 保険停止の原因 | insuranceStatesとdashboardはversion1、insuranceNoticeQueriesは存在しない | 個々の物件項目の欠落とは別の管理情報不足。全件取得・自動救済はしていない |
| エラー後の遷移 | 物件・保証一覧へ戻り、既存の架空物件1件を表示。エラー表示も解除 | 確認済み |
| データ保全 | 今回の退避像にある業務16文書・制御1文書の全型付き値をRESTで再読取りし一致 | 確認用スクリプト初回は括弧誤りで実行前exit1、修正後exit0 |

一覧の初回／再取得はFunctionsの計測記録とも照合した。設定変更・日跨ぎ・検索項目欠落・移行／復元中の異常条件を常用Localへ作り込む操作は行っていない。それらは直前の架空結合試験193成功の範囲であり、今回の実画面試験と混同しない。ログインに伴うAuthのログイン時刻等は業務値不変の照合対象外。今回のアプリ・テスト変更、Local停止、補完、物件・設定・採番変更、Devアクセス／反映なし。

P4は実施した確認と未確認を分け、受入れ全体完了にはしない。保険正常系を実画面確認する次工程では、既存の保険検索準備処理をLocalで明示的に実施するか、隔離した架空の受入れ用環境を用意する必要がある。通常の一覧取得による欠落救済を復活させる対応ではない。保証の対象あり表示も併せて確認する。新しい補完や環境切替を今回自動実施したとは扱わない。

## 2026-10-13 満了案内の欠落非救済・開始時条件（Local検証済み）

オーナーの仕様確定・改修開始指示に基づき、HS通常の保証未案内／保険満了案内から従来全件取得への切替を除去。物件検索項目の欠落は救済せず、案内月数・日本日付は開始時の値を検索と最終判定へ共用する。移行準備情報の前後確認とwithRecoveryの復元制限は維持。旧条件・工務店経路・画面・保存項目・索引・移行CLIは変更しない。既存未commit差分を保持し、commit/push、Dev読書き・配備なし。

今回の実装変更はfunctions/warranty-notice-query.js、functions/insurance-notice-query.js、test/property-warranty.test.mjs、test/emulator/dashboard-insurance.test.mjs、test/emulator/property-warranty.test.mjs。文書はspecification、requirements/alerts-and-dashboard・user-explanation-items、design/insurance-notice-queries・full-read-audit-2026-10-12・README、roadmaps/expiry-notice-read-reduction・technical-remediation・2026-initial-delivery、CHANGELOG、本記録。保存形は不変でデータ契約の版変更・新ADR・governance変更なし。追加試験は欠落物件が除外されて無変更、対象外30件を増やしても候補読取り不変、設定／日付変更で再読取りなし、移行準備不一致・途中変更の停止を確認する。

分類はapplication-logic＋documentation-only。画面・依存・build設定不変のためapp-buildは非対象。`node --test test/property-warranty.test.mjs`は67成功・exit0。`npm test`初回はsandbox一時フォルダのrename等のEPERMで7失敗・exit1、同一ソースを制限外で再実行して421成功・既存Windows symlink 2skip・exit0。`npm run typecheck`、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs`は各exit0。結合試験は下記のとおり完了。`pwsh -NoProfile -File scripts/check-governance.ps1` と `git diff --check` は記録更新後に各終了コード0。

`npm run test:rules`初回は常用Localとのポート競合で開始前exit1。今回の退避・停止・復元をオーナーが明示承認。新規ignored `tmp/local-preserve-notice-20261013-01` に業務16文書・制御1文書・Auth1アカウント（tenant0）を保存。最初のsandbox接続は完了せず中断exit1。接続可能な実行でsnapshot、標準export、verify-export、停止前verifyが各exit0。標準export6ファイルとAuthの一致、保存前後の型付き全値一致を確認。本人以外の読取り許可を除去し、全保存物で本人限定を独立確認した。設定処理の一部でSeSecurityPrivilege不足の表示があったが、その後の独立照合を通過してから所有確認済みのLocalだけを停止。8専用ポート解放を確認後、架空データの結合試験を開始した。退避像は上書きせず、試験後の復帰照合が終わるまで完了扱いにしない。

結合試験の初回実行は191成功・2失敗、終了コード1。旧全件取得で通過していた保証上限／保険不要期間の試験が準備情報を持たないため失敗した。保証上限試験は専用の架空DBと検索項目・準備情報へ分離し、保険試験にも準備情報を追加。実装を緩和せず試験の前提を修正した。同じ `npm run test:rules` の再実行は193成功・失敗／skip0、終了コード0、emulatorsStopped=true、296980ms。架空の対象外物件を0→30件へ増やしても保証／保険それぞれ物件本文の読取り1件・表示1件を維持し、欠落物件2件の保存値も不変。設定／日付変更による再取得なし、準備不備・途中変更時の停止、通常業務・復元制限の回帰を確認した。Devでの課金・時間の実測ではない。

試験後の8ポート解放を確認し、今回の退避像からLocalを復元。`restore.mjs prepare-check`、`restore-control`、`verify-logical` は各終了コード0。業務16文書・制御1文書の全型付き値が退避前と一致。Auth1件は標準復元でpasswordUpdatedAt／validSinceのみ再生成され、起動時刻〜観測時刻の範囲と単位を確認し、その他の全値・tenant集合は一致した。Firestoreのサービス側時刻とAuth全体hashは変わることを明記し、見かけの一致のための書戻しはしていない。常用Local画面を非表示再開しHTTP200、Auth／Firestore／Functionsの専用ポートと退避先22entryの本人限定アクセスを確認、終了コード0。試験データ・採番変更を常用Localへ残さず、旧延長の不明日付も補完していない。再ログインが必要な場合がある。

退避先はPC内の `C:\Users\seven\projects\termite-warranty\tmp\local-preserve-notice-20261013-01`。従前の退避像は保持。今回の実装・主担当による条件分岐と呼出元の確認・必要6ゲート・保全復帰は完了。オーナー受入れは別途残り、Dev反映は引き続き未承認・未実施。サブエージェント・外部サービス操作なし。

## 2026-10-12 全件読み込みの棚卸し・文書是正

オーナーの「可能な独立作業」「全件読み込みの洗い出しと改善案」指示に基づき、現作業ディレクトリのapp／functions／scriptsを静的確認。[調査結果](design/full-read-audit-2026-10-12.md)に共有3マスタ、現行通常操作5区分、月別等の対象全体取得、旧入口、移行／保全／初期化を分けて記録した。Devの現在の呼出頻度・課金・削減率は未測定。getAllの指定ID一括取得とcount集計を物件本文の全件取得から区別する。改善案は未採用・未実装として提示し、既存の共有storeの承認範囲を拡張しない。

今回の変更は `docs/design/full-read-audit-2026-10-12.md`（新規）、`docs/design/README.md`、`docs/roadmaps/2026-initial-delivery.md`、`docs/roadmaps/technical-remediation.md`、`docs/requirements/search-and-list.md`、本記録。Local実装／技術検証済みとオーナー受入れ／Dev未反映を区別して古い進捗記述を是正し、保証書CSVの「項目確定待ち」を確定済み21列へ訂正。証拠は既存operationsと専用工程を参照し、日付付きの過去実施記録は消していない。仕様本文の新規変更、未決台帳への並行追記、進捗加点、ADR作成、アプリ・データ・governance変更なし。独立した文書整理のため製品CHANGELOGへの追加なし。

検証分類はdocumentation-only。`pwsh -NoProfile -File scripts/check-governance.ps1` と `git diff --check` は各exit0。新規調査文書の相対リンク27件もNodeによる存在確認でexit0。通常試験／型検査／build／結合／Functions・seed構文の各ゲートは今回の文書変更では非対象とし、Localの停止・退避はしない。ソースや試験の変更はなく、従前の成功を今回の新しい試験結果に数えていない。既存未commit差分を保持、今回も未commit。サブエージェント利用・クラウド読書き・Dev反映なし。公開公式資料の参照のみ実施。

## 2026-10-12 既存延長申込日の棚卸し・移行処理

優先残作業1の開始をオーナーが指示。[移行設計](design/extension-application-migration.md)を実装し、包括7ゲートとLocal保全復帰を完了。今回も常用Localの新規退避・停止・復元を明示承認。Dev更新・保守停止・配備は対象外。

`node scripts/extension-application-migration.mjs inspect --project termite-warranty-dev --control recovery-control` はexit0。読取りのみで442物件、有効延長0、取消済み延長0、申込日未記録0、補完対象0、不整合0を確認。2026-10-12時点でDevの日付確認・補完対象はない。導入直前の再棚卸しは必要であり、将来も0件とは断定しない。データ本文の出力・保存なし。

常用Localは新規ignored `tmp/local-preserve-extension-migration-20261012-01` に業務16文書・制御1文書・Auth1アカウント（tenant0）を退避。標準export6ファイルとの照合、停止前の全値再読取り照合はexit0。ACLリセット案は自動承認レビューが露出リスクを理由に拒否し未実行。読取りで親は本人のみ、子に広い継承許可があることを確認したため、継承許可を除去して本人だけの明示許可へ狭め、全17entryを独立照合してexit0。所有確認済みのLocalだけ停止、8ポート解放確認はexit0。

変更は `scripts/extension-application-migration.mjs`、`scripts/lib/extension-application-migration.mjs`、`test/emulator/extension-application-migration.test.mjs`、`scripts/lib/rules-test-plan.mjs` と移行設計・設計索引・meeting-prototype保存契約・専用ロードマップ・変更履歴・本記録。開始HEADは `802b68cdcc21ba0df89ca48d06094e9349dc844b`、既存の未commit差分を保持。追加業務要件はないため仕様本文・利用者画面・ADR・要件台帳は変更せず、移行保存契約と運用手順だけ追加。Rules／IAM／依存版／governance変更なし。サブエージェントへの新規依頼なし。主担当が計画照合・所有者管理・保存範囲を読取確認した。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `node --check scripts/lib/extension-application-migration.mjs` | 成功 | 0 |
| `node --check scripts/extension-application-migration.mjs` | 成功 | 0 |
| `npm test` | 421成功、既存Windows symlink 2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `npm run test:rules` | 192成功、失敗／skip0、emulatorsStopped=true、361825ms | 0 |
| `./scripts/check-governance.ps1` | 文書更新後の再確認も成功 | 0 |
| `git diff --check` | 末尾空行2か所を修正後、文書更新後の再確認も成功 | 0 |

npmは既存キャッシュの11.19.1を直接実行、Nodeは22.23.2。ログはignored `tmp/extension-migration-*.log`。実装・試験の最終ソースartifact hashは `b80b31c0dc474c0187dc6bdc8c8986e6842850855afe34a6aecf30c71a6aac22`。通常ゲートはすべて実行し、配備・実データ移行のrelease判断は未実施。新しい6結合試験は入力検証、通常／writer未停止／別処理の拒否、請求CSV、変更範囲、取消物件、計画後変更、結果不明からの再開を確認した。

試験後に8ポート解放を確認して今回のexportから復帰。`restore.mjs prepare-check`、`restore-control`、`verify-logical` はそれぞれexit0。業務16文書・制御1文書の型付き全値hash一致。Authは標準importによるpasswordUpdatedAt／validSinceの変化だけで、起動前〜観測時刻の範囲・単位を検証し、その他全値とtenant集合は一致。Auth全hashとFirestoreサービス側メタデータは変化しており、見かけを合わせる書戻しはしていない。試験データ・採番変更は常用Localに残さず、旧延長の未確認日付も推測補完していない。Nuxt非表示再開、HTTP200・4サービス、全22entryの本人限定ACLを各exit0で確認。再ログインが必要な場合がある。

復帰後のCLI inspectはsandboxのLocal接続EACCESで一度exit1。許可済み接続で再実行してexit0、1物件・有効延長1・申込日未記録1・変更0・未確認停止1を確認した。書込みなし。これは新CLIが常用Localの未確認日付を補完可能と誤認しないことの読取り確認であり、先の復元全値照合を置き換えない。

移行処理のLocal実装・検証と現時点のDev棚卸しを完了。既存Localの旧延長1件は実日付不明のまま保全し、Devへ転用しない。Devは現在補完対象0件だが、導入直前の再棚卸し・通常操作のオーナー受入れ・HSC-010台帳反映・Dev反映指示は別残件。Git commit/push・クラウド更新・Dev配備なし。

## 2026-10-12 保証延長申込日の改修・Local検証

オーナーが確定仕様への反映と改修開始を承認。理由任意、注意は入力した延長申込日が延長開始月の前月末を過ぎた場合、と追加確認。Dev反映は明示指示まで禁止。[仕様](specification.md#2026-10-12-保証延長申込日請求基準確定改修中)と[工程](roadmaps/expiry-notice-read-reduction.md#保証延長改修の工程)。

主repo・開始HEAD `802b68cdcc21ba0df89ca48d06094e9349dc844b` の既存未commit差分を保持。変更は `src/domain/property-warranty.mjs/.d.mts`、`functions/property-warranty.js`、`app/components/MeetingPrototype.vue`、`app/components/WarrantyLifecycleDetails.vue`、`test/property-warranty.test.mjs`、`test/emulator/property-warranty.test.mjs` と以下の文書。延長イベントへ申込日を保存し、共通請求計算から一覧・CSV・検索／集計へ反映。保証書と保険の期間計算を変えず、旧申込日未確認の記録は暫定的に旧請求基準を維持。実日付確認・補完・検索値再計算を導入前の必須工程とする。

更新文書は仕様書、case-warranties、search-and-list、user-explanation-items、meeting-prototype保存契約、monthly-queries設計、expiry-notice-read-reduction／initial-deliveryロードマップ、docs索引、変更履歴、本運用記録。既存設計内の拡張のため新ADR・新設計文書・データ契約版の一律更新なし。Rules・IAM・governance・依存版・インデックスは変更なし。HSC-010の台帳追記はHSC-042の先行未統合変更があるため未反映（台帳の並行更新禁止に従う）。確定内容の正本は仕様とcase-warrantiesに反映した。

EXT-01/02の独立読取レビューで、取消後の申込日履歴表示と工程リンク切れを指摘され修正。再確認で追加阻害事項なし。変更分類はdocumentation-only、ui-css-layout、application-logic、data-contract-schema-migrationの合算で包括7ゲート。下表は今回の差分に対する結果で、従前の保険改修の成功記録と分ける。npmは既存キャッシュの11.19.1、Nodeは22.23.2。ログはignored `tmp/extension-*.log`。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `node scripts/prepare-functions-deploy.mjs` | domain54項目同期 | 0 |
| `node --test test/property-warranty.test.mjs` | 67成功 | 0 |
| `npm test` | 421成功、既存Windows symlink 2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `npm run test:rules` | 再実行で186成功・失敗/skip0、emulatorsStopped=true、342671ms | 0 |
| `./scripts/check-governance.ps1` | 文書・ポリシー整合成功 | 0 |
| `git diff --check` | 成功 | 0 |

オーナーが今回のLocal退避・一時停止・復元を明示承認。新規ignored `tmp/local-preserve-extension-20261012-01` へ業務(default)16文書・制御test-fixed-control 1文書・Auth1アカウント（tenant0）を型付き退避し、標準export6ファイルも保存。本人限定ACLを確認し、snapshot、export、verify-export、再読取りverifyは各exit0。停止対象のプロセス所有を確認し、対象Localだけを停止、8専用ポート解放もexit0。退避像の物件1件には旧延長イベント1件・申込日未記録1件があり、実値の補完は未実施。Dev件数は未確認。

結合初回は旧保証書試験の延長入力に新必須日付がなく1件失敗、exit1。2か所の架空延長入力へ明示申込日を追加し、再実行で全186成功。実装の必須条件を緩めていない。新しい結合試験は必須・不正日付の書込み拒否、理由空欄の期限後延長、同一操作再送、番号・初回申込日・既存保険期間不変、取消後の別申込日による再延長と検索値を確認。

結合終了後、空の専用エミュレーターに架空HS・物件だけを準備してChromeで画面確認。申込日空欄の拒否、2036-09-30（延長開始月の前月末）の注意なし、2036-10-01の注意あり、理由空欄での延長成功、取消後の入力欄初期化、過去日2026-09-30と任意理由による再延長、取消前後2つの申込日の履歴保持を確認。`node tmp/extension-ui-verify.mjs` は保存された履歴・初回日・番号、請求検索月、CSV基準日、`inspectBusinessIntegrity`による新記録の復旧整合性を照合してexit0。工務店の同一入力画面は今回は直接操作しておらず、既存工務店延長の結合回帰と共通UIへの接続を確認した。画面用fixture作成もexit0。これはオーナー受入れの代替ではない。

画面試験専用プロセスを止め、8ポート解放後に今回exportから常用Localを復元。`restore.mjs prepare-check`、`restore-control`、`verify-logical` は各exit0。業務16文書・制御1文書の全型付き値hashが退避前と一致。Auth1件・tenant0も、標準importが再生成するpasswordUpdatedAt/validSinceのみ変化したことを検証し、起動前～観測時刻の範囲・単位を照合。他のAuth値は一致。Firestoreサービスメタデータ・Auth全hashの変化は隠さず、見かけを合わせる書戻しをしていない。試験用レコード・関連履歴・採番変更は常用Localに残存しない。Nuxtを非表示で再開しHTTP200と専用4サービスを確認、退避先の全22entryで本人以外のACL許可なし、いずれもexit0。再ログインが必要な場合がある。

新規操作のLocal実装・選定技術検証は完了。旧延長の日付確認・移行、台帳HSC-010反映、オーナー受入れ、Dev反映は残件であり、工程全体の完了を主張しない。Git commit/push・配備・クラウド更新なし。

## 2026-10-12 保険満了案内のLocal実装・検証完了

オーナーが試行前の読取り削減を優先して保険満了案内のLocal実装・補完処理・検証を指示。保証のLocal受入れ完了も表明。延長申込日・受付期限・請求基準は[仕様確定後の優先対応](roadmaps/expiry-notice-read-reduction.md#保証延長改修の工程)へ記録し、今回に混ぜない。Dev反映・実データ補完は明示指示待ち。

[独立検索項目と限定補完](design/insurance-notice-queries.md)を実装。通常保存・CSV／過去取込み・旧状態変換・seed・容量予約・復旧検査を対応。準備印なし／0では従来取得を維持。単一日付の範囲検索のため複合索引追加なし。主担当が編集、読取専用insurance_designがINS-DESIGN-03〜05でwriter・移行競合・復旧互換をレビュー。取消予約容量の指摘を修正して境界試験を追加、再レビューで実装阻害指摘なし。公開後の制御記録失敗の扱いも設計に明記。

変更分類はapplication-logic／data-contract-schema-migration／documentation-only。復旧・移行を含むため包括7ゲートを選定。開始HEAD 802b68cdcc21ba0df89ca48d06094e9349dc844b、主repoの既存保証・Chrome確認の未コミット差分を保持して追加。Git push・配備・IAM／Rules・governance・依存版変更なし。業務判定の変更がないため仕様本文・利用者説明・ADRは変更せず、保存契約・設計索引・ロードマップ・変更履歴を更新。未決台帳は先行HSC-042の未統合変更があるため別事項の追記を重ねず、優先対応は既存HSC-010を参照するロードマップに記録。

### 現時点の検証

下表のnpmはpackageManager指定と一致する11.19.1を既存キャッシュのnpm-cli.jsで実行。コマンドは `node C:/Users/seven/AppData/Local/npm-cache/_npx/ae109337638209d1/node_modules/npm/bin/npm-cli.js` に各引数を付けたもの。外部から新規installしていない。ログはignored tmp/insurance-notice-*.log。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `node scripts/prepare-functions-deploy.mjs` | domain 54項目同期 | 0 |
| `node --test test/insurance-state.test.mjs test/dashboard-migration.test.mjs test/historical-intake-plan.test.mjs` | 23成功（容量追加前） | 0 |
| `node --test test/insurance-state.test.mjs` | 容量境界追加後17成功 | 0 |
| `npm test` | 419成功・既存Windows symlink 2skip、失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `node --check scripts/insurance-notice-migration.mjs` | 成功 | 0 |
| `node --check scripts/lib/insurance-notice-migration.mjs` | 成功 | 0 |
| `git diff --check` | 成功 | 0 |
| `./scripts/check-governance.ps1` | 最終文書更新後の検査成功 | 0 |
| `npm run test:rules` | 承認済み保全・停止後に185成功・失敗／skip0、全worker照合・emulatorsStopped=true（363351ms） | 0 |

初回の `npx --offline npm@11.19.1 run test:rules` はサンドボックス側のキャッシュ不在でENOTCACHED、exit1。既存キャッシュの版を確認して直接実行し、上記ポート競合を検出。通常試験の初回はサンドボックスTempのrename拒否で7失敗・exit1、通常権限で同じ試験を再実行し上表の419成功を確認した。失敗を成功に数えていない。

後続でオーナーが「許可します」と回答し、保険試験のためのLocal退避・一時停止・復元を承認。新しいignored `tmp/local-preserve-insurance-20261012-01` に業務(default)16文書・制御test-fixed-control 1文書・Auth 1アカウント（tenant0）を型付き保存し、標準exportの6ファイルを保全。再読取りhashと保存像・exportを照合後に対象Localだけを停止した。前回の退避像は上書きしていない。

結合試験185件はすべて成功。新しい8試験と既存回帰により、単独条件の保険案内で物件取得30→27文書、表示26件・順序・全返却値一致、20件超・旧形式・欠落／null、権限、設定／日本日付／準備印変化時の取り直し、エラー伝播を確認。保存操作後の検索値一致、専用2項目以外の全値保持、再実行時の文書無更新、中断・所有者確認付き再開、世代／所有者変更による公開拒否、同時更新・新規・削除、不正日付の停止、旧像互換と不整合の復旧拒否を確認した。架空データの結果でありDev442件の削減率・課金実測ではない。

試験終了・8専用ポート解放後、今回の標準exportからLocalを起動。業務DBとAuth照合後に空の制御DBへcreate-onlyで1文書を復元し、独立した再読取りで両DBの全型付き値hash一致を確認。AuthはpasswordUpdatedAt／validSinceだけが標準import時刻へ変わり、起動前〜観測時刻の範囲と単位の整合を検証。他のAuth全値・tenant集合は一致。Auth全hash自体は異なることとFirestoreサービス側メタデータの変化を明記し、見かけの一致のための書戻しはしていない。Nuxtを非表示起動、HTTP200とAuth／Firestore／Functionsの専用ポートを確認。再ログインが必要な可能性はある。今回の補完は隔離した試験DBでのみ実施し、復帰した常用Localは元の業務値のまま。試験記録・採番消費を常用Localへ残していない。

保全・復帰の各コマンドは `preserve.mjs snapshot`、標準 `firebase.js emulators:export ... --project demo-termite-warranty`、`preserve.mjs verify-export`、`preserve.mjs verify`、`restore.mjs prepare-check`、`restore.mjs restore-control`、`restore.mjs verify-logical` が各exit0（helperは今回の退避ディレクトリ）。停止前のプロセス所有確認、停止・試験前後の8ポート解放、非表示復元起動・hub照合、Nuxt起動・HTTP確認もexit0。ACL再設定の最初のSet-AclはSeSecurityPrivilege不足でexit1となり、停止処理へ進まなかった。既に本人限定の親ACLを確認し、icaclsで子へ継承後に全17entry、再開後のログを含む全22entryで本人以外の許可なしを独立照合、各exit0。秘密・業務本文は追跡文書へ含めていない。

今回の許可後はアプリ・試験・依存を編集していない。前段の通常試験419成功・型／build／Functions／seed／移行CLI構文のexit0を再利用し、失効していたRulesを取得した。包括7ゲートは充足。独立レビューINS-DESIGN-05後の実装差分なし。最終文書はgovernance-check・diff-checkを再実行する。Local技術検証・保全復帰まで完了、保険のオーナー画面受入れ・Dev移行／反映／実効果測定は未実施。Devに接続・配備・補完していない。変更は未コミットで、既存の保証・Chrome確認差分を保持。



## 2026-10-12 保証満了案内のLocal改修と保険ロードマップ

### Local検証・保全復帰の最終結果

後続でオーナーが「退避・一時停止・復元を許可する」と明示承認。新しいignored `tmp/local-preserve-notice-20261012-01` に、稼働中のdemo-termite-warrantyの業務(default)16文書、test-fixed-control 1文書、Auth 1アカウント・tenant0を型付きJSONと標準exportで退避した。前回退避は上書きしていない。Nuxt停止後の再読取り全hash、保存像hash、標準export全6ファイルのhashを検証後、所有コマンドを再確認したLocalエミュレーターのプロセスツリーだけを停止。専用8ポートの解放を確認した。Devには接続していない。

`npx --offline npm@11.19.1 run test:rules` は177成功・失敗／skip0、終了0（runnerの全worker照合、emulatorsStopped=true）。追加2試験で候補28文書／旧取得31文書の架空集合から同一26対象・同一返却内容となること、20件超の全対象、秒／ナノ秒／ID順、null／欠落、過剰候補の再判定、旧APIと会社範囲、設定・準備印変化時の取り直しを確認。これはDev442件の削減率実測ではない。test logはignored `tmp/notice-rules-20261012.log`。前段の通常試験417成功・2skip、型検査、Functions／seed構文の終了0は、その後のアプリ・試験ソース変更がないため再利用。`node scripts/check-functions-domain.mjs` も52項目一致・終了0。

今回の退避像から標準importし、業務16文書の一致確認後、空の制御DBにcreate-onlyで1文書を復元。別コマンドで再読取りし、両DBの全型付き業務値hashが退避前と一致した。Authの差は標準import仕様のpasswordUpdatedAt／validSinceのみで、両時刻の単位整合と起動〜観測時刻の範囲を検証し、他の全値・tenant集合は厳密一致。Authの全hash自体は不一致であることを保持し、時刻を書き戻して見かけの一致にしていない。Firestoreサービス側の作成／更新メタデータは変化する。Local Nuxtを非表示で再起動しHTTP200とAuth／Firestore／Functionsの専用ポートを確認。ログインの再操作が必要な可能性は残る。

保全／復元の各コマンド結果：`preserve.mjs snapshot`、`node node_modules/firebase-tools/lib/bin/firebase.js emulators:export tmp/local-preserve-notice-20261012-01/emulator-export --project demo-termite-warranty`、`preserve.mjs verify-export`、`preserve.mjs verify`、`restore.mjs prepare-check`、`restore.mjs restore-control`、`restore.mjs verify-logical` は各終了0（helperのパスは当該退避ディレクトリ）。所有プロセス照合・停止、試験前後の8ポート解放、復元起動とhub照合、Nuxt再開・HTTP確認も各終了0。標準export後のACL確認は一度不一致・終了1。本人限定ACLへ修正する処理でSet-AclのSeSecurityPrivilegeエラー表示があったため、その処理の終了0だけを成功証拠にせず、独立した全17entryのACL読取りで本人以外の許可なしを確認・終了0。Git除外も確認した。業務本文・資格情報は追跡文書へ保存していない。

今回の後続でアプリコードは変更していない。保証の選定Localゲートと保全復帰は完了、Dev反映は未実施・明示指示待ち。保険は設計／ロードマップのままで実装・マイグレーションなし。最終文書のgovernance-checkと差分検査は更新後に実行して終了を確認する。以下は開始時点からの経過記録であり、以前の承認待ち・結合試験保留は本節の結果で解消した。

オーナーが保証の改修開始、保険のマイグレーションを含むサブエージェントとの設計検討・ロードマップ作成を指示。Dev反映は別途明示指示まで禁止。主担当がコード・試験・文書を所有し、読取専用reviewer insurance_designが経路確認のno-change callback後にINS-DESIGN-01／02を実施した。保険の旧形式互換・独立準備印・旧バックアップ・移行所有者と新writerの不変条件を[ロードマップ](roadmaps/expiry-notice-read-reduction.md)へ反映。保証差分の読取レビューは阻害指摘なし、試験成功の代用にしない。

保証はHSのpending専用要求で既存準備印を確認し、既存複合索引に対応した条件で候補取得。設定／準備印／日付変化時は従来取得。最終業務判定、並び、updatedAt欠落、全ページ、旧API・会社範囲を維持する。業務定義・保存契約・権限・索引・ガバナンス変更なし。仕様／ADR／データ契約／利用説明は意味が不変のため変更せず、changelog・運用・ロードマップ・索引だけ更新。開始時の既存文書5ファイル差分を保持。実装は functions/property-warranty.js、追加 functions/warranty-notice-query.js、試験は test/property-warranty.test.mjs と test/emulator/dashboard-insurance.test.mjs。

検証結果：`node --test test/property-warranty.test.mjs` は65成功、終了0。`npx --offline npm@11.19.1 test` は417成功・既存Windows symlink制約の2skip・失敗0、終了0。同 `run typecheck`、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs` は各終了0。最初のsandbox内npxは既存キャッシュが見えずENOTCACHED・終了1だったため、PC側既存キャッシュのnpm 11.19.1を読取確認し通常試験と型検査を実行。ネットワークインストールなし。

`node scripts/test-rules.mjs` は29099のEADDRINUSEで起動前に終了1。結合試験は未実行で、追加試験の合格・改修完了とは扱わない。既存Localを停止・初期化していない。LocalのFirestore／Auth／制御DB退避・照合、一時停止、試験後の復元・照合・再開についてオーナーへ承認確認中。Dev操作なし。完了ゲートはロードマップの6ゲートで、UI／依存／build変更がないためapp-buildは今回非対象、配備ゲートは未承認・未実施。最終文書のgovernance-checkとgit diff --checkは別途実行結果を報告する。

## 2026-10-12 満了案内の読取り削減調査（未採用案）

オーナーの依頼は、現在の動作を維持する改善案と影響範囲の調査。アプリ・保存項目・索引・実データ・配備の変更は行わない。前段の文書5ファイルの未コミット差分は保持し、本調査はこの節だけを追記する。確認元は `functions/property-warranty.js` のlist経路、`src/domain/property-warranty.mjs` のexpiryAlertEligible、`src/domain/insurance-state.mjs`、`src/domain/dashboard.mjs`、`functions/dashboard.js`、`firestore.indexes.json`、`app/components/MeetingPrototype.vue` と採用済みdashboard設計／alerts-and-dashboard要件。

現行は会社・本支店の認可範囲を適用した後、updatedAt降順・ID降順で全件を読み、Functions内で案内対象を判定する。HSの場合は前回観測で442件。UIの20件表示は取得後のページ分割であり読取りを減らさない。保証画面は未案内固定、保険画面は検索条件なし。期限超過を残し、保証は本登録・未案内・延長可能、保険は有効な報告実績があり次の未報告期間がある場合に限定する。保険の予告基準日はその次期間の開始前日で、報告不要の期間を飛ばす。旧APIは保証のnotification=done/allも受理するため、画面だけの最適化でその互換を壊さない。

推奨案は二段階。保証は既存の `warrantyNoticePending == true` と `expiryDate <= warrantyNoticeCutoff(日本日付, 設定月数)` を候補取得に使う。dashboardが同条件と既存複合索引を使用済み。保存済み投影の準備／整合が成立する範囲で、新規保存項目・業務データ補完は原則不要。現行のwithInsuranceDefaults／expiryAlertEligible／未案内判定は取得後にも残す。done/allや複合条件の旧APIを最適化対象外として従来経路に保つ等、互換範囲を明示する。工務店・支店の認可条件はDB取得前に維持し、追加複合索引の要否は対応する実クエリで確認する。

保険は検索専用の日付（仮称insuranceNoticeQueryExpiry）を追加し、本登録でinsuranceStateVersion=1のとき既存insuranceNoticeExpiryの計算値、それ以外の扱いは既存互換範囲を確定して保存する案を推奨する。対象なしは空文字にし、空文字より大きく、上記逆算上限以下で取得する。報告済み保険のinsuranceExpiryDateや月次報告用insuranceQueryStart/Endをそのまま使う案は意味が異なり不適切。既存の未報告3範囲の開始日をORで絞って最後に判定する案は、正規の期間状態なら候補を漏らさない方向にできるが、初回未報告も取得し、索引・旧形式互換が複雑になり、現在の未報告が多いデータでは効果が限定的となり得る。新項目なしの暫定候補であり、採用・効果実測はしていない。

両案とも日付の下限を今日にしない（期限超過を消さない）。設定月数は取得時に使うため、設定変更だけで全物件を書き換えない。範囲検索の結果をFunctions内でupdatedAt秒・ナノ秒・IDの降順へ戻し、現行orderByが除外するupdatedAt欠落も同様に扱う。取得にlimit20を付けると全ページの対象が欠けるため採用しない。Firestore側でupdatedAt順も強制すると範囲条件・複合索引・索引走査課金に影響し得るため、候補を絞ってから従来順に戻す案を優先する（[公式の並び順と欠落項目](https://firebase.google.com/docs/firestore/query-data/order-limit-data)、[読取り課金](https://firebase.google.com/docs/firestore/pricing)）。日時・設定は一要求内で共通にし、同時設定変更・日本時間日付境界も回帰対象にする。

保証案の主な影響はFunctionsの取得経路、既存日付計算の共用、索引／権限別試験。保険案はこれに共通投影計算・型定義・通常保存・一括／過去取込み・検索項目補完・復元時の整合検査・容量検査・保存契約／導入手順が加わる。既存の投影検証が追加項目を必須にすると旧バックアップ復元へ影響するため、版・準備印・旧形式の扱いを先に設計する。画面の項目、業務判定、通知・請求・保険報告履歴、採番、アクセス権は変更しない。新規索引と保存更新を先行し、補完／照合／準備完了後に読取経路を切り替える。差戻しは旧全件取得へ戻し、追加項目は直ちに削除しない。移行／配備の実行には別途承認が必要。

削減量は442件から各候補件数へ減る見込みだが、新クエリの実環境実行はしておらず件数・率・金額は未測定。文書取得が0件でも最低クエリ課金、認証・設定・参照名取得等は残る。保険は初回補完に読取り／書込みが必要なため利用頻度と合わせて評価する。採用時は架空データで旧新の対象ID・順序・件数・返却内容を比較し、0件／20件超、未案内／案内済み、最長年数、取消／復元、延長／取消、報告／報告取消／不要／不要取消、旧形式・欠落、月末・閏年・設定1〜12か月、会社／支店境界を試験する。索引は実クエリのExplainで文書／索引読取りも確認する。保険の保存契約・移行を含める場合はcomprehensiveゲート、配備時も包括／正式照合の規定を適用する。

今回の根拠確認として `node --test test/insurance-state.test.mjs` を実行し15成功・失敗0・終了0。既存の月末逆算（2026〜2028の各日×設定1〜12か月）、報告不要と取消等の試験であり、提案クエリの一致や実索引の性能を検証した結果ではない。変更分類はdocumentation-only。今回の完了検査はgovernance-checkとgit diff --check、アプリ変更／移行／配備がないためその他の実装・配備ゲートは非対象。未採用案のため仕様、ADR、保存契約、ロードマップ進捗、変更履歴は更新しない。採用済み実装とは扱わない。

## 2026-10-12 月別3一覧のChrome確認とクエリ調査

オーナーが、ログイン済みChromeによる残る画面／CSV確認と、Firebase Consoleの物件クエリ回数・未請求countの索引警告調査を指示。主担当が実施し、サブエージェントは使用していない。開始HEADは `802b68cdcc21ba0df89ca48d06094e9349dc844b`、mainの追跡差分なし。既存Chromeの `termite-warranty-dev.web.app` とConsoleの `termite-warranty-dev`／`(default)` を実画面で確認した。以下は17時台の読取・CSV出力の結果であり、HSの業務受入れではない。

### 実画面と保存したCSV

| 一覧・条件 | 画面で確認した結果 | 実ダウンロード |
| --- | --- | --- |
| 保険、指定2026-10→対象2026-09、通常 | 438件。全438件選択可能 | 438行・7列、対象月は全行2026-09 |
| 同、報告済みを含める | 過去未処理を除き10件 | 10行・7列、対象月は全行2026-09 |
| 保険、指定2026-01→対象2025-12 | 通常346件、済みを含めると10件 | 後者10行・7列、全行2025-12 |
| 請求HSC、指定2026-10→対象2026-09 | 通常0期間、済みを含めると6期間（すべて請求済み） | 6行・11列、請求対象基準日は全行2026-09 |
| 請求HSC、指定2026-01→対象2025-12 | 済みを含めると6期間 | この条件の追加保存は非対象 |
| 請求SHS／UH、指定2026-10、済みを含める | 各0期間、選択／CSV不可 | 対象なしのため非対象 |
| 保証書HSC、指定2026-10→対象2026-09 | 通常0期間、済みを含めると7期間（すべて発行済み） | 7行・共通21列 |
| 保証書HSC、指定2026-01→対象2025-12 | 済みを含めると4期間 | この条件の追加保存は非対象 |
| 保証書SHS／UH、指定2026-10、済みを含める | SHSは0期間、UHは発行済み3期間 | UH3行・共通21列 |

年月変更、保険の済みチェック変更、保証書のグループ変更で選択0・再抽出待ち・CSV無効化を確認。請求済み6期間／発行済み7期間または3期間を選択しても「済みにする」は無効で、CSVのみ出力できた。保証書は21列の順番、保証グループ、初回10年、開始月、満了日、9個の年月日分割値、期間重複なしを検査。請求は11列・対象基準月・請求済み・期間重複なしを検査。CSV6ファイルの行数は画面選択数と一致。保証書画面の表示を目視し、取得可能なブラウザwarn/errorは0件。過去の通信障害が解決した証拠にはしない。

`pwsh -NoProfile -File tmp/check-monthly-browser-csv-20261012.ps1` は6ファイルすべてpass、終了0。ダウンロード原本は利用者PCのDownloadsに保存し、Gitへ入れていない。ignored `tmp/monthly-browser-csv-20261012-results.json` は件数・ファイル照合値のみを保持。原資料との全業務値の再照合、更新・採番、混在選択の更新実行、未存在の実データ条件の作成、Word差込み・印刷は実施していない。過去の隔離環境試験や70条件の実検索照合とは検証範囲を分ける。今回の読取り・出力操作による業務更新はなく、Local停止・seed・復元・データ削除・配備もない。

### Firebase Consoleの回数と索引警告

観測窓はConsole表示の10/11 17:00〜10/12 17:00 JST。`COLLECTION /propertyWarranties` は実行60、読取りオペレーション5,352、平均27ms、エラー0、返却平均88.4だった。別の `ORDER_BY __name__ ASC LIMIT 200` は12回・2,400読取り、`START_AFTER (?) LIMIT 200` は24回・2,904読取り。後二者の合計5,304は442物件×12回と一致する。関連マスタにも12回の取得が並ぶ。

全件保全処理 `scripts/lib/default-recovery.mjs:documentImage` は200件単位で本文を走査した後、欠落親のある下位コレクションを見落とさないため `collection.listDocuments()` でも列挙する。使用SDKはフィールドなし・showMissing=trueでListDocuments APIを呼び、自動ページングする。この処理は同日の `historical-intake inspect` や全業務比較helperから反復実行されている。**配備・保全確認の反復と二重列挙が多い読取りの有力な主因**。60回／返却平均88.4も、442件を5ページで12周した場合に一致する。ただしConsoleの集計には呼出し元識別がなく、60回の各要求を特定コマンドに個別帰属させた証拠ではない。公式説明では同じ構造を集約し、1〜2時間の表示遅延があるため、この窓の数値を今回の画面確認の呼出し回数と混同しない（[Query Insights](https://firebase.google.com/docs/firestore/enterprise/query-insights?hl=ja)）。

通常の物件一覧はサーバーで最新20件に制限され、同窓の実統計も1回・20読取り。Functionsの処理別ログでは通常一覧1回20件、ダッシュボードは1操作4count・本文0件で、連続全件購読の証拠はない。一方、保証／保険満了案内は現行 `list` のalertKind経路で全物件をupdatedAt順に取得後判定し、ConsoleにもLIMITなし3回・442×3=1,326読取りがある。月別保険も初回未報告が多い時は条件一致候補が多くなる。これらは無条件60回とは別の、実装上残る読取り要因であり、今回改修していない。文言だけの変更に全件保全を常例化しない既存方針を維持し、移行／復元等の必要な照合は省かない。

警告のクエリは `functions/dashboard.js` の未請求件数集計。Consoleは5回・平均24ms・エラー0・スキャン0で、警告文は「インデックスを作成すると、費用とパフォーマンスが改善される可能性があります」。実インデックス一覧で `status / billingPendingMonth / __name__` が有効なのを確認し、同じ2026-10条件の `count().explain({analyze:true})` を1回実施。使用索引は `(status ASC, billingPendingMonth ASC, __name__ ASC)`、未請求件数0、本文／索引エントリ走査0、実行16.633ms、readOperations=1（最小クエリ分）だった。**必要索引の不足や失敗ではなく、既存索引で正常実行できている**。0件集計でも返却結果は集計値1個となる。警告を表示したConsole内部の判定条件は未確認で、空結果との関係は推測に留める。索引の追加・削除はしていない（[Query Explain](https://firebase.google.com/docs/firestore/query-explain)）。

`node tmp/query-investigation-20261012.mjs` は初回sandbox内でDNS失敗、終了1。読取専用の同一コマンドを通常ネットワーク権限で実行して終了0。`node tmp/query-investigation-20261012.mjs --logs-only` も終了0。後者は最初のexplainを再利用し再実行せず、10/11 17:00 JST以降のserver_observedログ67件を終端まで取得・集約した。最初の集約helperはcountersの階層参照が誤って0表示となったため修正し、後者で再集計した数値だけを採用。個人情報・資格情報・業務本文をログ出力／追跡文書に保存しない。結果はignored `tmp/query-investigation-20261012.json`。アプリ・索引・権限・ガバナンス変更なし。変更分類は実施記録のdocumentation-onlyで、完了検査はgovernance-checkと差分検査。アプリの包括試験・正式配備照合は今回変更／配備がないため再実行しない。HS受入れ・最終引渡し・Prod準備は残る。

## 2026-10-12 月別3一覧の実装・Dev導入

オーナーがHSC-042の実装・検証・Dev反映を承認。主担当は設計・レビュー・文書、Medium担当がサーバー／画面の独立実装・試験・配備を行う。[実装設計](design/monthly-queries.md#2026-10-12-実装設計と導入手順)と[保存契約](design/meeting-prototype-2026-10-03.md#2026-10-12-報告済み保険の月別検索用保存契約)を追加。実装・包括検証・Dev反映・公開版照合を完了。ブラウザ操作確認は未実施。開始時の基準HEADは `cf7395440b0c76a46156aaa151ce500b51c467cc`。

変更分類は文書・画面・業務処理・保存契約／移行・配備の和集合。包括7ゲートと対象の期間／状態／移行回帰を実施する。検証実行・結果・終了コードは完了後に記録する。最大保証期間の調査は別件で[HSC-043](requirements/house-solution-confirmations/HSC-043-group-warranty-year-limit.md)へ記録した。グループ設定や保証年数の変更は実装対象外。

事前読取は `node tmp/company-settings-release-target.mjs`、`node scripts/default-recovery.mjs observe --project termite-warranty-dev --control recovery-control --revision cf7395440b0c76a46156aaa151ce500b51c467cc --dev-inspect`、`node scripts/historical-intake.mjs inspect --project termite-warranty-dev --control recovery-control` の各終了0。normal世代13・protocol2・処理中なし。Hostingは `sites/termite-warranty-dev/versions/976cc72545bf2e05`、Functions21 ACTIVEで前回正式照合版と一致。業務777文書・物件442・保持スタッフ3・HSC次番号100。追加投影の補完を行うため全業務hashそのものの不変は完了条件とせず、追加値と準備印を除いた業務値・アカウント・所属・採番・履歴の不変を照合する。Devでの検証物件の追加・採番操作・通常利用停止は行わない。

既存の他件文書差分を保持。新しい恒久的構成判断はなくADR・ガバナンス変更は不要。影響する仕様・要件・設計／保存契約・運用・変更履歴・利用説明・ロードマップだけを整合させ、進捗の数値加点はしない。新規要検討事項は正規索引に登録する。配備の差戻しは設計の準備印閉鎖と旧版配備に従う。

独立レビューで、保存済みの保険期間IDの矛盾と、同じ期間への別IDによる重複報告を処理済みとして扱う穴を検出。対象期間の実形状・識別子・有効報告の一意性・報告不要との非重複を検査する修正と回帰試験を追加した。IDを持たない旧記録の互換は維持する。修正後の読取再レビューは阻害なし。UIの月変換・選択解除・未処理限定更新・読取専用境界も独立レビューで阻害なし。

ブラウザ確認はChromeとIABの接続がともに利用不可。再確認時の一覧も空で、IABへのLocalタブ作成は利用不可の応答だった。画面描画・実ダウンロードは未確認として保持する。LocalはHTTP 200を確認し、正式検証のため所有者がNuxtだけ停止した（意図的中断の終了1）。専用ポート解放とAuth／Firestore／Functionsの継続稼働確認は終了0、既存架空データは保持。

補完前の追加値除外比較は `node tmp/monthly-business-baseline.mjs` 終了0。物件442件の追加2項目と新準備印は全て未存在。追加2項目と正確な準備印1文書だけを除外した業務集合hashは元の集合hashと一致。本文はメモリ内だけで扱い、ignored証跡には件数・照合値だけを保存した。補完後も同じ除外規則で比較する。

最終ソースの新規検証：`npx --offline npm@11.19.1 test` は415成功・2スキップ（既存Windows symlink制約）・失敗0、終了0。同 `run typecheck`、同 `run build`（9ルート）、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs` は各終了0。追加UI回帰 `node --test test/list-undo-ui.test.mjs test/insurance-period-display.test.mjs` は9成功・失敗／スキップ0、終了0。`pwsh -NoProfile -File scripts/check-governance.ps1` と `git diff --check` も終了0（後続文書更新後のgovernanceは再実行する）。検証前後のruntime286ファイルのhash一致。

同 `run test:rules` の初回は終了1。既存LocalのAuthポート使用中により起動前に停止し、試験は未実行。既存プロセスを検証runnerから停止したり、固定ポートのガードを緩めたりしていない。包括ゲート未完了・Dev未反映として、別管理のLocal保全手順を確認する。

Local保全の事前確認として全Firestore／Authを読み、本文を出さず照合値を作る操作は、自動承認レビューに拒否された。理由は、全件アクセスについて具体的な対象・範囲への承認が確認できないこと。拒否された操作は実行されていない。別経路で迂回せず、オーナーへこのプロジェクトのLocal業務DB・動作設定用DB・ログイン用アカウントのPC内退避、一時停止、試験後の復帰と照合を明示した。2026-10-12、保全が必要な理由の説明後にオーナーが「退避を許可します」と承認。退避と完全性の確認ができるまでデータ保持中のエミュレーターは停止しない。CLIソース上、標準Firestore退避の要求先は(default)であり、別の動作設定用DBを含む完全保全を推測で保証しない。Devの実データはこの退避の対象外。実行結果は後続で記録する。

Local保全実行：`demo-termite-warranty` の(default)15文書、test-fixed-control 1文書、Auth 1アカウント・tenant 0を、ignored `tmp/local-preserve-monthly-20261012-01` へ退避した。型付き全階層退避と標準exportを併用し、再読取りの全内容hash、退避ファイルhash、標準export全6ファイルのhash一致を確認。helper構文・snapshot・標準export・export照合・disk hash・再読取り照合は各終了0。本人限定ACLの設定時にprivilege警告と終了1があったが、独立した全16entryのACL読取りでは他ユーザー許可なしを確認、終了0。データ本文・アカウント情報は追跡文書へ記録しない。

確認後、所有sessionだけをCtrl+Cで停止（意図的終了1）。停止後検査は終了0で、専用8ポート解放と所有Nuxt／Firebase／Javaプロセスの終了を確認。試験runnerが既存Localを強制停止したものではない。復帰・復帰後照合は未実施。Authのアカウント値は保全対象だが、既存ブラウザのログイン継続は保証しない。

退避後のRules試験初回は174成功・1失敗・skip 0、終了1。追加した保険報告検索の復元互換試験で、架空物件が参照する本支店を専用DBに作成していなかったため、既存の参照整合検査により拒否された。実装の検査を緩めず、試験データだけを補完して再実行する。runner終了後の専用8ポート解放確認は終了0。成功扱いにせず、Dev配備は保留を維持する。

試験データの本支店作成1行だけを追加し、主担当がレビュー。Rules再実行は175成功・失敗／skip 0、終了0（shared 173、isolated-import 2、各worker終了0）。報告済み検索・限定移行・旧復元像の互換・新準備印の破損拒否まで確認した。runner正常停止と独立した全8ポート解放確認も終了0。最終286ファイルの比較差は当該試験1ファイルだけで、他の成功ゲートの失効条件に該当しないため再利用する。証拠はignored `tmp/monthly-final-rules-retry2.log` と `tmp/monthly-final-source-hashes-rules-final.json`。アプリ側の整合検査・承認境界は変更していない。

レビュー済み実装23ファイルを `19adab6cd04cb2aad8200f3310ff8d0000e47430` に記録し、runtime対象の未記録差分なしを確認。文書更新後のgovernanceと差分検査は各終了0。既存の他件文書差分は保持する。Dev導入はこの版を対象に、実環境の再読取りと設計上の順序で開始する。配備完了・Local復帰完了の証拠は後続記録と区別する。

Local復帰の途中確認：標準importで業務DBの全型付き値は一致したが、Authの全値hashは一致せず、追加の制御DB復元前に停止した（restore-control終了1）。差はlastRefreshAt、passwordUpdatedAt、validSince、disabledの4項目。主担当が使用中Firebase CLIの `lib/emulator/auth/index.js` と `operations.js` を確認し、標準importは更新時刻・トークン有効化時刻を取込み時刻へ置換し、lastRefreshAtをコピーせず、disabledをboolean化することを確認した。

Authへ時刻の書戻しは行わない。元の全値hash不一致は保持し、差が上記の仕様どおりであること、取込み時刻との整合、その他のアカウント全値・設定・tenant集合の一致を別途確認する。物件／制御DBは従来どおり全型付き業務値の完全一致を要求する。これは既存ログインの継続を保証しない当初の復帰範囲に沿う照合で、アカウント・パスワード・権限の変更を許容するものではない。照合と復帰の完了は後続で記録する。

Local元像の復帰・独立照合は完了。追加helperの構文、制御DBの空確認後create-only復帰、別コマンドでの再読取りは各終了0。業務15文書・制御1文書の全型付き値hashは原像一致。Auth 1アカウント・tenant 0は上記4項目だけの変換を確認し、disabledの未設定→false、lastRefreshAtの消失、時刻2項目の秒／ミリ秒整合と起動プロセスの実時刻範囲内を検査した。正確な取込みイベント時刻はログがなく、プロセスの起動～観測時刻による範囲確認である。他の全アカウント値・設定・tenant集合は厳密一致。Authへの追加書込みなし。Firestore自身の作成／更新メタデータは変化しており、業務フィールドの不変と区別する。元退避は保持し、新機能のLocal検索項目補完は復帰確認の後に別工程で行う。

Dev導入実行（対象版 `19adab6cd04cb2aad8200f3310ff8d0000e47430`）：配備前の再読取りでnormal世代13・業務777文書／物件442／スタッフ3・HSC次番号100と前回のhash一致を確認した。以下は各終了0。

| 操作 | 結果 |
| --- | --- |
| `npx --offline npm@11.19.1 run build:recovery-release -- --revision 19adab6cd04cb2aad8200f3310ff8d0000e47430` | 正式な公開成果物生成 |
| `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only firestore:indexes --non-interactive` | 必要索引を配備。初回は作成中、後続読取で20設定すべてREADY・一致 |
| 同CLI `deploy --project termite-warranty-dev --only functions --non-interactive` | Functions反映。正式functionsReleaseProofにより21関数・21ソースarchiveと最新traffic一致 |
| `node scripts/default-recovery.mjs observe --project termite-warranty-dev --control recovery-control --revision 19adab6cd04cb2aad8200f3310ff8d0000e47430 --dev-inspect` | 配備完了の観測から314秒経過後、normal13・処理中なし |
| `node scripts/insurance-report-query-migration.mjs --project termite-warranty-dev` | 補完前442件要追加、適用後の再調査は要追加0件 |
| 同移行CLI `--project termite-warranty-dev --apply --writers-drained --generation 13 --revision 19adab6cd04cb2aad8200f3310ff8d0000e47430` | 442件へ新2項目だけ補完、新準備印version=1 |
| `node tmp/monthly-query-live-check.mjs` | 基準月2025-12／2026-01／09／10／11×処理済みOFF／ON。請求・保証書は有効3グループ。計70条件で実検索の対象集合と全物件から業務判定した期待集合が一致。画面操作や実CSVダウンロードの証拠とは区別 |
| 同Firebase CLI `deploy --project termite-warranty-dev --only hosting --non-interactive` | 新公開版 `sites/termite-warranty-dev/versions/b65719c70e30d2d2` |

前後比較は `node tmp/monthly-business-baseline.mjs`、`node scripts/historical-intake.mjs inspect --project termite-warranty-dev --control recovery-control`、`node tmp/company-settings-release-target.mjs` と照合処理で各終了0。新2項目と新準備印だけを除いた全業務hash・アカウントhash・所属hashは一致、HSC次番号100。新準備印1文書分で業務文書は777→778（スタッフ込み780→781）、物件442は不変。保険報告・請求・発行履歴、業務revision・更新日時、採番を変更していない。Devに検証データは追加していない。公開ファイルの最終正式照合は別途後続記録で判定する。

最終正式照合：`node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 19adab6cd04cb2aad8200f3310ff8d0000e47430 --generation 13 --source "(default)" --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/976cc72545bf2e05 --dev-inspect` は初回終了0・全10項目pass。normal世代13、2DBの所在地・Rules、処理中0・lockなし、20索引READY、Functions21ソース、Hosting1,005ファイルの一致を確認。`ready:false` は読取検査が更新許可を発行しない意味であり、失敗ではない。Hosting件数は初回未掲載だったが、30秒待機後に実値1,005と全内容一致を確認してから正式照合を行った。索引診断helperの初回は比較時の正規化不足／CREATINGで終了2。正式検査の規則に合わせた読取helperの修正とREADY待ち後は終了0。正式validatorの緩和・推測補完は行っていない。

最終前後比較は終了0。実装286ファイルのhash変化なし、追加検索値以外の全業務・アカウント・所属hash一致、物件442・スタッフ3・HSC次番号100を再確認。IAM・Auth・バックアップ・保守モード・Prod・ガバナンス設定の変更なし。差戻しは未実行。設計に従い、新準備印を0へ閉じてからレビュー済み旧Hosting／Functionsへ戻し、再導入時に補完・照合する。

確定実装23ファイルは当該コミットの一覧を正本とする。画面2ファイル、`functions/property-warranty.js`、`firestore.indexes.json`、保険／請求／保証書／月変換のdomain 8ファイル、移行・復旧・取込み・seedのscripts 5ファイル、関係test 6ファイル。仕様・要件・設計／保存契約・移行／復旧手順・環境仕様・変更履歴・利用説明・ロードマップ・HSC-042を更新した。最大保証期間は別のHSC-043に記録済みで制御変更なし。既存の他件文書差分は保持し、アプリ対象の未記録差分はない。

残る制約：検証担当からブラウザproviderを利用できず、既存タブへの明示接続も失敗した。主担当ではIABの存在を観測できたが、Medium担当による実画面操作・実CSVダウンロードの今回の証拠はない。自動試験・実Firestore照合・正式配備照合を、画面受入れ完了とは扱わない。Localは元像照合後に検索用2項目と準備印だけ補完し、その他の業務・制御・Auth値不変、再調査の補完残件0を各終了0で確認した。元の退避証跡は保持する。利用者はDevを再読み込みし、指定年月の前月を対象に3一覧を確認できる。

Local通常再開：Medium担当が既存エミュレーターとnormal世代1・新準備印1を再確認し、`npx --offline npm@11.19.1 run dev` でNuxtを再開。HTTP 200・配信設定のdemo project・専用loopback接続先を確認した（実runtime読取、ポート確認、HTTP／配信検査は各終了0）。Nuxt／エミュレーターは利用可能のまま稼働を維持し、seedや物件追加は行っていない。watch起動の型検査表示0 errorsは、終了コード付きの正式typecheckに代用しない。既存タブでは再読み込み・必要に応じて再ログインする。

## 2026-10-12 月別3一覧の前月基準を採用（文書のみ）

オーナーが指定月の前月を基準にする新方式を提示して採用。通常は前月以前の未処理、処理済みを含める場合は前月だけの未処理・処理済みで、さらに古い未処理も除外する。[確定仕様](specification.md#2026-10-12-月別3一覧の前月基準処理済み表示)と[決定記録HSC-042](requirements/house-solution-confirmations/HSC-042-monthly-list-carryover.md)を参照。新規請求の基準が申込日であることは現行の仕様・`warrantyTransactions` 実装で確認。更新・延長の基準日を変える指示はなく維持する。

今回は仕様書、検索・一覧、保険報告、月別取得設計、保証書設計、利用者説明、確認事項と索引、変更履歴、本節だけを更新する。アプリ・Dev・データの変更なし。データ契約・移行・互換の詳細設計は未完了で、ロードマップの進捗加点・ADR・ガバナンス変更は行わない。文書のみの検証はgovernance-checkと差分確認をMedium担当へ依頼し、主担当がレビューする。現行公開版は下記のボタン変更版のまま。以前の「抽出案は未採用」という記録は当時の状態として区別する。

## 2026-10-12 保険報告用一覧のボタン表記

保証書・請求に続き、保険報告用一覧を「CSV出力」「報告済みにする」へ揃える明示指示。基準 `5f7d7eaef6630ee2538d36cab05cdae46c2c50d8`、対象は `app/components/MeetingPrototype.vue` の2文言のみ。件数表示・選択条件・CSV内容・報告処理を維持。実装・検証・Dev反映はMedium担当、レビュー・文書は主担当。検証・Dev反映・公開版正式照合まで完了。同時依頼の3一覧の抽出方法は調査・提案のみで、採用・実装と扱わない。

UI・文書・配備の包括7ゲートを選択。新規実行と直前証拠の再利用は失効条件・実差分で判断する。既存Localデータ・エミュレーターを保持し、Dev業務更新・採番変更は行わない。変更文書は仕様、保険報告要件、利用者説明、変更履歴、本節。データ契約・ADR・ロードマップ・索引・ガバナンスは意味・構成・進捗の変更がなく対象外。既存差分を保持し、差戻しは直前のレビュー済みHostingを再配備する。

主担当が対象行の2文言のみの変更と画面画像をレビュー。Medium担当はLocalで未選択0件時の両ボタン無効、既存架空物件1件の選択時の両ボタン有効、選択解除後の無効を確認した。件数表示も維持。対象の `git diff --check` は終了0。実ダウンロード・報告登録・データ投入は行わず、担当Nuxtだけ停止（意図的Ctrl+C終了1、専用ポート解放の確認終了0）。

実装1ファイルを `6cdbd8be8885dd08e1a306f5ff7e4ea71500c43c` に記録。新規 `npx --offline npm@11.19.1 run typecheck`、同 `run build`（9ルート）、`pwsh -NoProfile -File scripts/check-governance.ps1`、`git diff --check` は各終了0。対象コンポーネントに依存する既存試験 `node --test test/property-warranty.test.mjs test/list-undo-ui.test.mjs test/warranty-organization-ui.test.mjs` は67成功・失敗／スキップ0、終了0。検証前後の対象ファイルSHA-256一致も確認。

包括ゲートの残りは直前の `npx --offline npm@11.19.1 test`（408成功・2スキップ、失敗0）、同 `run test:rules`（174成功・スキップ0）、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs` の各終了0を再利用。処理・保存・試験・依存・設定・実行環境・検証方針が不変で各失効対象に該当しないため。必須ゲート省略なし。governance-tools追加回帰の対象変更もなし。

Medium担当のDev実行は以下すべて終了0。主担当も最終正式照合結果を確認した。

- `npx --offline npm@11.19.1 run build:recovery-release -- --revision 6cdbd8be8885dd08e1a306f5ff7e4ea71500c43c`：確定公開成果物を生成。
- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only hosting --non-interactive`：1,003ローカルファイル配備、公開版 `sites/termite-warranty-dev/versions/976cc72545bf2e05`。
- `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 6cdbd8be8885dd08e1a306f5ff7e4ea71500c43c --generation 13 --source "(default)" --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/eec15e876477dea3 --dev-inspect`：初回全10項目pass。Hosting1,005ファイル・Functions21ソース・索引19・normal世代13・処理中／ロックなし。読取専用の `ready:false` は更新許可を付与しない意味。
- `node scripts/historical-intake.mjs inspect --project termite-warranty-dev --control recovery-control`、`node tmp/company-settings-release-target.mjs` と比較処理：前後とも業務777文書・物件442件・スタッフ3件、HSC次番号100。業務・アカウント・所属のハッシュ、Functions21の版・状態・環境設定不変。

事前の `node tmp/ins-label-hosting-diagnostic.mjs` は全ファイル一致とHosting側の件数未掲載を確認。限定待機後の読取で `fileCount=1005` と全内容一致を確認してから正式照合を実施した。診断各終了0、検査緩和・値の補完・再配備なし。Functions・実業務データ・採番の更新なし。実装以外の既存差分は保持し、Devの再読込みで確認できる。

## 2026-10-12 CSV一覧のボタン表記

オーナー指示により、保証書CSVは「CSV出力」「発行済みにする」、請求用一覧は「CSV出力」「請求済みにする」へ統一した。共有画面のボタン表示2箇所だけが対象。件数欄・確認画面・有効条件・CSV内容・更新処理は維持。実装・検証・Dev反映はMedium担当、レビュー・文書更新は主担当が実施。基準は `7d64ec92b42fa6ae33d2fbe409d54e5d10c02819`。検証・Dev配備・公開版の正式照合は完了。

UI・文書・配備の包括7ゲートを選択し、失効した型検査・ビルド・文書整合は新規実行、その他は実差分と直前の成功証拠を照合して再利用可否を判断する。Local／Devの業務データ・採番は変更しない。反映文書は仕様、保証書設計、月別請求設計、利用者説明、変更履歴、本節。データ契約・ADR・ロードマップ・索引・ガバナンスは対象の意味や構成・進捗を変更しないため更新不要。差戻しはレビュー済みの前版Hostingへ戻す。既存の他の文書差分は保持する。

主担当は `app/components/WarrantyCertificateManagement.vue` の2行変更をレビューし、イベント・条件式・処理が不変であることを確認。Medium担当のLocal画面確認では、保証書は未選択で両ボタン無効、発行済みの初回を選ぶとCSVだけ有効。請求は未選択で両ボタン無効、未請求1期間の選択で両方有効、対象年月変更で選択が解除され両方無効。対象件数を維持し、主担当も両画面の画像を確認した。実出力・状態更新は今回行っていない。対象差分検査は終了0。担当所有のNuxtだけ停止し、Localの既存データとエミュレーターは保持した（意図的Ctrl+C終了1、ポート確認終了0）。

実装1ファイルを `5f7d7eaef6630ee2538d36cab05cdae46c2c50d8` に記録。Medium担当の新規検証 `npx --offline npm@11.19.1 run typecheck`、同 `run build`（9ルート生成）、`pwsh -NoProfile -File scripts/check-governance.ps1`、`git diff --check` は各終了0。検証前後の対象ファイルSHA-256一致も終了0で確認した。

包括7ゲートのうち、`npx --offline npm@11.19.1 test` の直前408成功・2スキップ・失敗0、同 `run test:rules` の174成功・スキップ0、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs` の各終了0を再利用。今回は表示文字だけで各ゲートの失効対象・保存処理・試験・依存・実行環境は不変、旧文言に依存する既存試験もないため。必要ゲート省略なし。governance-toolsは入力対象の変更がなく発火対象外。

Medium担当が以下を実行し、各終了0。主担当も正式照合の最終10項目passと配備後の集計証拠をレビューした。

- `npx --offline npm@11.19.1 run build:recovery-release -- --revision 5f7d7eaef6630ee2538d36cab05cdae46c2c50d8`：確定版を生成。
- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only hosting --non-interactive`：1,003ローカルファイルを配備、公開版 `sites/termite-warranty-dev/versions/eec15e876477dea3`。
- `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 5f7d7eaef6630ee2538d36cab05cdae46c2c50d8 --generation 13 --source "(default)" --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/4cfea7d1964e143e --dev-inspect`：最終全10項目pass、Hosting1,005ファイル、Functions21ソース、索引19、normal世代13、処理中・ロックなし。読取専用の `ready:false` は更新許可を付与しない意味。
- `node scripts/historical-intake.mjs inspect --project termite-warranty-dev --control recovery-control` と `node tmp/company-settings-release-target.mjs`：配備前後とも業務777文書・物件442件・スタッフ3件、HSC次番号100。業務・アカウント・所属の3ハッシュとFunctions21の版・設定が一致し、比較処理も終了0。今回のHosting以外に配備・業務更新なし。

初回正式照合は終了0でもHostingがblockedのため通過扱いにしなかった。読取診断で全1,005ファイルの内容・状態の一致と公開版の `fileCount` 欠落を確認し、限定再観測で `fileCount=1005` を確認後、同じ正式照合を1回だけ再実行して成功。検証緩和・値の補完・再配備はしていない。実装以外の既存文書差分は保持。利用者はDevを再読み込みして両一覧を確認できる。

## 2026-10-12 自社情報の分類カード採用

オーナーが「分類カード」を明示採用し、実装・検証・Dev反映を引き続きMedium担当へ、レビュー・文書を主担当へ割り当てた。縦一列の表示を会社・代表者／所在地・連絡先／振込先の3カードへ整理する。[確定設計](design/company-settings-and-document-csv.md#2026-10-12-表示レイアウト分類カードの採用)を正本とし、下の3案未選定という記録は採用前の状態とする。

基準は `e243b2a2fdc13740d1a7d91f21f5a41663334ce5`。改修・レビュー・選定検証・Dev反映と正式照合は完了。全15項目、編集ダイアログ・保存処理・権限・データ契約を維持した。包括7ゲートを選択し、UI／CSS変更で失効する型検査・ビルド・文書整合は新規実行、保存・Functions等の不変範囲は直前の成功証拠を条件確認して再利用した。Localは既存架空データを維持して画面確認し、Devのデータ・採番は更新していない。配備はHostingだけで、Functionsは再配備していない。

反映文書は仕様、会社設定設計、共通UI設計、マスタ要件、利用者説明、初期納品ロードマップ、文書索引、変更履歴、本節。保存・移行・権限・恒久的な構成判断に変更はなく、データ契約・ADR・未決台帳・ガバナンスは今回変更しない。既存文書差分は保持し、ロードマップの進捗加点はしない。検証・レビュー・配備結果を本節へ記録する。

主担当レビュー：変更は `app/components/CompanySettings.vue` と `app/assets/clear-sky-theme.css` の48行追加・19行削除。3カードの項目は4／6／5で重複・欠落なし。新しいカード専用クラスだけを独自の影から除外し、他画面のカード・既存ダイアログ・保存処理は不変。長文に対して幅0まで縮小できるグリッドと `overflow-wrap:anywhere` を確認。Medium実装担当の `npm run typecheck`、`node --test test/company-settings-ui.test.mjs`（10成功）、対象差分検査は各終了0。

Medium担当のLocal実画面確認：PC実測1920pxで上段442px×2と下段900px、カードの項目4／6／5。600pxではカード・項目とも1列、全15項目の「未設定」、横はみ出しなし。3カードの枠1px・影の各寸法0、上部編集から15項目の既存ダイアログを開き、無変更で閉じられることを確認。主担当も両スクリーンショットをレビューした。390pxを要求した操作は実際には600pxだったため390px成功と記録しない。

Localの会社情報は未保存で、UIから未保存状態へ戻す操作がないため、今回の表示確認だけのために架空値を保存して残すことはしなかった。長文・一般担当者の実画面は今回未実施。長文は上記ソースレビュー、保存後の共有値更新と一般担当者の保存不可は今回の既存UI試験、実保存・再表示は下記の直前検証結果を利用する。未保存変更の破棄確認後の実画面は前回からの未確認範囲として維持する。Localのデータとエミュレーターを保持して、ビルド前に担当者自身のNuxtだけ停止（意図的Ctrl+C終了1）。専用アプリポート解放とエミュレーター稼働継続の検査は終了0。

最終実装2ファイルを `7d64ec92b42fa6ae33d2fbe409d54e5d10c02819` に記録。Medium検証担当は対象2ファイルのSHA-256不変と、保存・Functions・Rules・seed・依存・設定・検証方針に変更がないことを独立確認（各終了0）。主担当の文書と既存差分はコミットへ混ぜず保持する。

| 選定ゲートのコマンド | 今回の扱い・結果 | 終了コード |
| --- | --- | --- |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 新規実行、文書・生成整合成功。追加記録後の結果は完了報告にも記載 | 0 |
| `npx --offline npm@11.19.1 test` | 新規408成功・2スキップ（既存Windows symlink制約）、失敗0 | 0 |
| `npx --offline npm@11.19.1 run typecheck` | 新規成功 | 0 |
| `npx --offline npm@11.19.1 run build` | 新規9ルート生成成功 | 0 |
| `npx --offline npm@11.19.1 run test:rules` | 下記直前の174成功・失敗／スキップ0を再利用 | 0 |
| `node scripts/check-functions-syntax.mjs` | 下記直前の成功を再利用 | 0 |
| `node --check scripts/seed-emulator.mjs` | 下記直前の成功を再利用 | 0 |
| `git diff --check` | 新規成功（改行形式の警告のみ） | 0 |

包括7ゲートの省略なし。再利用3件は各ゲートの失効対象に今回の表示テンプレート・項目分類・CSSが含まれず、対応する処理・保存・試験・設定・Node/npmが不変と確認したため。ドメイン試験は変更したコンポーネントを読む既存試験を含むため新規実行した。governance-toolsの追加試験はツール／方針の変更がなく発火対象外。今回の検証のために稼働中エミュレーターを再初期化していない。

Dev実行・照合はMedium担当、結果のレビューは主担当が実施。次の各コマンドは終了0。

- `npx --offline npm@11.19.1 run build:recovery-release -- --revision 7d64ec92b42fa6ae33d2fbe409d54e5d10c02819`：確定版の公開成果物生成。
- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only hosting --non-interactive`：1,003ローカル公開ファイルを配備。公開版 `sites/termite-warranty-dev/versions/4cfea7d1964e143e`。
- `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 7d64ec92b42fa6ae33d2fbe409d54e5d10c02819 --generation 13 --source "(default)" --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/bb0d9f87b8f80ae5 --dev-inspect`：最終全10項目pass、Functions21ソース・Hosting1,005ファイル・索引19・normal世代13・処理中／占有なし。読取専用なので `ready:false` は更新実行許可を付与しない意味。
- `node scripts/historical-intake.mjs inspect --project termite-warranty-dev --control recovery-control` と `node tmp/company-settings-release-target.mjs`：今回取得した配備前後の業務777文書・物件442件・スタッフ3件、HSC次番号100、全21関数の名前・稼働版・環境設定が不変。比較処理も終了0。inventoryHash=`13327d661a61ab317108372aaf9589339be609d87019d20a56e26673d16fb4ed`、accountHash=`e0150d3871f2058222b9b78bc17bfbf8354ebcd614d404c0601f34df3240dfc1`、authorizationHash=`cb90793bfacdde71a1a7d8c9addce5ed4a595848c72a4b493cdcf9f620ece70f` が一致。

初回の正式照合はコマンド終了0だがHostingがblockedだったため成功扱いにしていない。読取診断 `node tmp/cards-release-hosting-diagnostic.mjs` は全1,005ファイルの一意性・内容・状態の一致と、Hosting版の `fileCount` 欠落を確認（終了0）。限定した再観測で `fileCount=1005` の出現と一致を確認した後、同じ正式照合を1回だけ再実行して通過した。ファイル数の代入、照合の緩和、再配備はしていない。

配備・正式照合後、Medium担当が `npx --offline npm@11.19.1 run dev` でNuxtだけを再起動し、`http://127.0.0.1:23600/` を利用可能なまま残した。HTTP 200・ポート確認は終了0。Nuxt PID20716、元のEmulator PID29944／Firestore PID21840の稼働を確認。既存タブで3カード・15項目未設定・最終更新未保存を再確認し、架空物件1件も維持。seed／fixture再投入・設定保存はしていない。ユーザーはDevを再読み込みし「その他業務 ＞ 設定」で確認できる。主担当の文書差分と先行差分は未コミットのまま保持し、実装2ファイルは上記確定版に記録済み。

## 2026-10-12 振込先・ダイアログ・保証書再出力確認

オーナー追加指示による改修。設計・レビュー・文書は主担当、実装・検証・Dev反映は推論Mediumの担当へ分離した。振込先5項目と旧画面からの省略値保持、自社情報編集の共通ダイアログ化、保証書ボタンの「発行済みにする」への簡略化が対象。請求CSV・保証書21列・発行済みの条件は維持する。自社情報表示の3案（分類カード／会社台帳／項目別ナビ）は未選定であり、自動採用していない。

保証グループ請求先8項目はオーナーがDevで検証し、今回「受入れOK」と回答。前節に残した当機能の受入れ待ちは解消した。自社情報とWord差込み等の受入れまで拡張しない。

AIRの請求書見本を読み、銀行名・支店名・預金種別・口座番号・口座名義の5項目を確認。実口座値を登録せず、モックとLocalは架空値だけを使用。Devの実業務データ・採番を試験に使わず、権限・Rules・バックアップ停止設定・依存版も変更しない。

基準は `fed0b64d98cc9d5851b2f4208792868a6b0d90e2`。主担当レビューで銀行項目未指定の旧保存を保持する取引処理、返却項目の限定、保存中・未保存の閉じる制御、期間別CSVの既存条件を確認。UI／処理／保存契約／配備の和集合で包括7ゲートを選定。Medium担当の最終検証は以下の通り。対象10ファイルの検証中の内容不変もSHA-256比較で確認（終了0）。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 文書・生成整合成功。追加記録後の最終確認は完了報告にも記載 | 0 |
| `npx --offline npm@11.19.1 test` | 408成功・2スキップ（既存Windows symlink制約）、失敗0 | 0 |
| `npx --offline npm@11.19.1 run typecheck` | 成功 | 0 |
| `npx --offline npm@11.19.1 run build` | 9ルート生成成功 | 0 |
| `npx --offline npm@11.19.1 run test:rules` | 174成功・失敗／スキップ0、エミュレーター停止済み | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `git diff --check` | 成功（改行形式の警告のみ） | 0 |

初回の単体試験は制限環境側のnpmキャッシュ不足（ENOTCACHED）で終了1。承認済み既存キャッシュを利用した同一コマンドの再実行が上記の成功結果。必須ゲート省略なし。governance-toolsの追加試験は入力対象のツール・方針を変更していないため対象外。Rulesでは旧画面からの項目省略・明示空欄・並行保存・先頭ゼロ・全角数字拒否、通常復旧の振込先保持を含めた。

レビュー済みの実装・試験10ファイルだけを `e243b2a2fdc13740d1a7d91f21f5a41663334ce5` に記録（133行追加・24行削除）。対象は `app/components/CompanySettings.vue`、`app/components/WarrantyCertificateManagement.vue`、`functions/property-warranty.js`、`src/domain/company-settings.mjs`、同 `.d.mts`、`test/company-settings.test.mjs`、`test/company-settings-ui.test.mjs`、`test/emulator/property-warranty.test.mjs`、`test/emulator/default-recovery.test.mjs`、`test/historical-intake-plan.test.mjs`。文書と先行作業の差分はコミットへ混ぜず保持。配備と正式照合は完了し、Local再提供は下記の実測で区別する。

Dev配備・照合はMedium担当が実行し、主担当が結果を確認した。各コマンドの終了コードは0。

- `npx --offline npm@11.19.1 run build:recovery-release -- --revision e243b2a2fdc13740d1a7d91f21f5a41663334ce5`：配備版を確定して生成。
- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only functions --non-interactive`：21関数更新。
- 同コマンドの `--only hosting`：1,003ローカル公開ファイルを配備。公開版 `sites/termite-warranty-dev/versions/bb0d9f87b8f80ae5`。
- `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision e243b2a2fdc13740d1a7d91f21f5a41663334ce5 --generation 13 --source "(default)" --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/d859957f3892191e --dev-inspect`：最終全10項目pass。Functions21個別ソース、Hosting1,005ファイル（Firebase管理2ファイルを含む）、索引19、normal・世代13、処理中／占有なしを確認。読取専用の `ready:false` は更新許可を付与しない意味。
- `node scripts/historical-intake.mjs inspect --project termite-warranty-dev --control recovery-control` と `node tmp/company-settings-release-target.mjs`：前後の業務777文書・物件442件・保持スタッフ3件、HSC次番号100、Functions21 ACTIVEと環境設定が不変。比較処理も終了0。inventoryHash=`13327d661a61ab317108372aaf9589339be609d87019d20a56e26673d16fb4ed`、accountHash=`e0150d3871f2058222b9b78bc17bfbf8354ebcd614d404c0601f34df3240dfc1`、authorizationHash=`cb90793bfacdde71a1a7d8c9addce5ed4a595848c72a4b493cdcf9f620ece70f` が一致。旧配備時の776文書を今回の比較元へ流用していない。

初回の正式照合はコマンド自体は終了0だったが、Hostingのファイル識別条件がblockedで、成功扱いにしなかった。読取診断 `node tmp/bank-final-hosting-diagnostic.mjs`（終了0）で件数・一意性・状態・全hash一致を確認してから、同一の正式照合を1回再実行して通過。初回の詳細値は記録されておらず正確な原因は不明。配備直後の管理情報反映の可能性は推測に留める。照合条件の緩和・再配備・業務データ修復は行っていない。

Local操作確認：架空グループ「架空CSV確認用」、架空番号 `LOCAL-16-001` は初回発行済み・20年延長済み。対象月2016-10で初回の発行済み行を選び、CSV出力ボタンは有効・発行済み更新は無効。ダウンロードしたCSV（BOM付き657 bytes）を照合し、開始2016-10-08・満了2026-10-07・年数10で、最新満了2036-10-07へ置換されないことを確認。2026-10で検索した延長未発行行はCSVと発行済み操作が有効。専用fixture構文、準備・期間照合、CSV照合はいずれも終了0。

自社情報の実画面で架空振込先5項目の保存・再表示と `0012345` の先頭ゼロ保持を確認した。変更後に閉じると破棄確認が表示されたが、ブラウザ操作ツールのダイアログ制御が応答しなくなり、画面での破棄確定結果は未確認。受諾・拒否の処理はユニット試験で確認済み。全体検証のためLocalを意図的に停止（Ctrl+Cによる各終了1、失敗試験ではない）し、専用ポートが解放されたことを終了0で確認した。

提供用Localは全検証・Dev正式照合の後にMedium担当が再起動し、利用者が操作できる状態で残した。`npx --offline npm@11.19.1 run emulators:start` → `node tmp/certificate-period-demo-fixture.mjs` → `npx --offline npm@11.19.1 run dev` の順。専用の `demo-termite-warranty` とループバックだけを用い、fixtureは架空物件1件と期間状態の検査まで終了0。HTTP 200・ポート確認も終了0。画面 `http://127.0.0.1:23600/` で「保証書CSV／架空CSV確認用／2016-10」を表示し、初回発行済み行を選択済み。CSV出力有効・発行更新無効を再確認した。延長分は2026-10。架空ログインは会話で案内し、実資格情報を使っていない。Nuxt PID7952・Emulator PID29944・Firestore PID21840は提供時生存。新しい操作用タブを用い、応答しない旧確認ダイアログは触れずに残した。提供後のPC／プロセス停止を超えた常時稼働は保証しない。

表示候補は会話用の架空見本であり、本画面へ未採用。3案と入力名／表示名・操作処理、変更破棄確認・フォーカス制御を静的に点検し、見本のJS構文検査は終了0。ブラウザが見本ファイルの表示を拒否したため回避せず、実描画・幅別の最終確認は未実施。アプリ本体のLocal操作確認とは区別する。

関連文書は仕様、会社設定設計、データ契約、保証書設計、マスタ要件、利用者説明、初期納品ロードマップ、HSC-010と索引、文書マップ、変更履歴。再取込みの全設定保全手順はそのまま追加振込先を含み、別移行を追加しない。ガバナンス・環境設定・HSC-015の先行差分を保持。新たなアーキテクチャ判断はなくADRは追加しない。主画面改善案の選択は次の利用者判断として残る。

## 2026-10-12 会社設定・請求先・保証書CSVの実装とDev反映

オーナーが確定仕様に沿った実装・独立作業の分担・検証・Dev反映を明示承認。対象は自社情報10項目、保証グループの請求先8項目、保証書CSV共通21列、工務店向け非公開、再取込み時の保全。請求CSV11列、Word固定文字、実データ・採番を変えない。実装・包括検証・Dev反映と公開版照合は完了。この節が下の仕様確定時点の状態に優先する。

変更分類はUI・アプリ処理・データ契約／再取込み・配備の和集合。包括7ゲートを選び、架空データのLocalで保存・権限・復旧・中断再開を検証する。Prod、実再取込み、実会社情報の推測入力、Dev試験レコード作成・採番消費は対象外。依存版・Rules・ガバナンスは変更しない。既存の未コミット文書変更を保持する。

配備前のDev読取：`default-recovery.mjs observe` は通常状態、世代13、業務DB `(default)` と別制御DB `recovery-control` の一致、処理中・占有なしを確認（exit 0）。制限環境での失敗後、承認済みDev参照として通常環境で実行した。`historical-intake.mjs inspect` は業務776文書・物件442・スタッフ3を確認（exit 0）。削除予定という旧CLI項目名を持つが、inspectは読取り専用で削除しない。全件照合値は `7cf5ba1c8b4e4cde858a7796db2d915738914a29d42dadfd728d8172889495eb`。配備後も同値を確認する。

独立レビュー：会社設定／請求先の保存・公開境界、保証書CSV、再取込み保全は重大指摘なし。UIレビューで再取得時の古い保持値利用を指摘し、強制再取得と失敗／成功の回帰試験を追加。一般担当者の架空試験役割も実際の `general_staff` に合わせた。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `npx --offline npm@11.19.1 test` | 404成功・2スキップ（既存Windows symlink制約）。初回の26失敗は既存画面試験の追加依存・メニュー期待値を修正して解消 | 0 |
| `npx --offline npm@11.19.1 run typecheck` | 最終UI修正後に成功 | 0 |
| `npx --offline npm@11.19.1 run build` | 公開画面生成成功 | 0 |
| `node scripts/check-functions-syntax.mjs` | 新規会社設定を含むFunctions構文成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 文書・生成整合成功。最終記録後にも再確認する | 0 |
| `npx --offline npm@11.19.1 run test:rules` | 174成功・失敗0。初回の1失敗は架空日時をFirestoreのマイクロ秒精度に合わせて解消 | 0 |

Local画面検証：架空の管理者で自社情報の保存、変更取消で元の値に戻ること、保証グループの請求先名・部署・担当者の保存を確認。幅390pxでも説明・長い住所が折り返す。試験用エミュレーターは終了0で停止し、架空値はDevへ保存していない。UI試験の末尾空行整理後、`node --test test/company-settings-ui.test.mjs` 7成功・終了0、`git diff --cached --check` 終了0。動作変更がないため他の検証結果を再利用する。

実装・試験24ファイルを `fed0b64d98cc9d5851b2f4208792868a6b0d90e2` に記録。対象の全ファイルは当該コミットの変更一覧を正本とする。既存文書差分はこのコミットへ含めず保持。`build:recovery-release -- --revision fed0b64d98cc9d5851b2f4208792868a6b0d90e2` は終了0。

配備・照合（各終了コード0）：

- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only functions --non-interactive`：21関数更新成功。
- 同コマンドの `--only hosting`：1,003ローカル公開ファイルを配備。公開版は `sites/termite-warranty-dev/versions/d859957f3892191e`。
- `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision fed0b64d98cc9d5851b2f4208792868a6b0d90e2 --generation 13 --source "(default)" --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/f89e05f6343c466d --dev-inspect`：全10項目pass。21関数のソース・実稼働版、Hosting1,005ファイル、Rules、19索引、通常世代13、処理中／占有なしを照合。読取り専用なので `ready:false` は更新実行許可を発行しない意味。初回は `--hosting-provider-version` を省略し、Firebaseが追加する2ファイルで不一致となった。配備前の実確認版を指定して正式照合を完了した。
- `node scripts/historical-intake.mjs inspect --project termite-warranty-dev --control recovery-control`：業務776文書・物件442・スタッフ3、inventory/account/authorizationの照合値が配備前と一致。試験データや設定の追加なし。
- 読取り専用の管理API／Firestore確認：全21関数ACTIVE、バックアップ停止設定は不変、HSC_2026の次番号100。

Devのログイン画面表示を確認。認証済みDevセッションがないため、Devでの管理画面操作は未確認。保存・取消・請求先操作はLocalで確認し、Devの実値入力は行っていない。利用者は再読み込み後、管理者で「その他業務 ＞ 設定」と保証グループの請求先を入力する。更新した文書は下記仕様確定17文書に現行データ契約 `docs/design/meeting-prototype-2026-10-03.md` を加えた18文書。ガバナンス、環境設定、HSC-015の先行差分は保持。新たな恒久判断はなくADRは追加せず、初期納品進捗は加点しない。ガバナンス専用回帰は対象ツール・ポリシー未変更のため発火対象外、包括7ゲートの省略なし。

保存契約は[現行データ契約](design/meeting-prototype-2026-10-03.md#2026-10-12-自社情報請求先の追加保存契約)、操作条件・差戻しは[確定設計](design/company-settings-and-document-csv.md)、再取込みの準備は[手順](runbooks/historical-property-intake.md)。差戻しでは設定値を削除せず、旧再取込みを使わない。新CSV用Wordの対応は旧6列へ戻した場合に再確認が必要。既存の復旧・全件照合が新設定も保持することを専用の架空試験へ追加した。業務受入・編集可能Wordでの差込み確認は別途残る。

## 2026-10-12 会社設定・請求先・CSVの仕様確定（製品未変更）

オーナー採用の[確定設計](design/company-settings-and-document-csv.md)を仕様・関連要件へ反映。自社10項目、請求先8項目、保証書共通21列、選択期間の再出力、再取込み時の設定保全を確定した。現行Devは会社設定/請求先機能なし・保証書CSV6列・請求CSV11列のまま。実装、配備、実データ入力、Word編集、再取込みは今回行わない。

追加設定がある状態での再取込みには[設定保全への手順改修](runbooks/historical-property-intake.md#2026-10-12-追加設定の保全条件採用手順改修は未着手)が必要。自社情報を変えてもWordの固定文字は変わらず、請求書本体の生成・自動送信は追加していない。文書のみの変更として文書整合・差分を検査し、コマンド結果は当該タスクの完了報告で記録する。

今回の反映先は次の17文書。各文書にある先行差分は保持し、未コミット。HSC-015、環境設定、ガバナンスの先行変更は今回変更していない。

- 仕様・設計・索引・履歴：`docs/specification.md`、`docs/design/company-settings-and-document-csv.md`、`docs/design/warranty-certificates.md`、`docs/README.md`、`CHANGELOG.md`。
- 関連要件・採用記録：`docs/requirements/master-management.md`、`docs/requirements/search-and-list.md`、`docs/requirements/security-and-access.md`、`docs/requirements/user-explanation-items.md`、`docs/requirements/house-solution-confirmations/HSC-010-payer-contracting-party.md`、`docs/requirements/house-solution-confirmations/HSC-037-warranty-groups.md`、`docs/requirements/house-solution-confirmations.md`。
- 運用・工程：`docs/operations.md`、`docs/runbooks/historical-property-intake.md`、`docs/runbooks/backup-recovery.md`、`docs/roadmaps/historical-property-intake.md`、`docs/roadmaps/2026-initial-delivery.md`。

分類はdocumentation-only。製品の実装済み保存形式・具体的な保存名・型・権限設定・移行処理は変えていないため、実装データ契約・製品テスト・配備用ゲートは今回変更/実行しない。保存情報の意味・保全条件は確定設計に記録し、具体化は実装段階に反映する。追加の独立したアーキテクチャ選択やガバナンス変更はないため、新規ADR/ガバナンス生成は不要。提供進捗の加点なし。読取レビューCONFIRM-SET-3/CONFIRM-BILL-3は重大指摘なし。

## 2026-10-10 検証データ・採番の後片付けを完了条件化

オーナー指示を[プロジェクト規則](../governance/project-rules.md#検証データ採番変更を実運用へ残さない)へ反映。更新・採番試験は隔離環境を優先し、実データのあるDev等では検証前に対象・比較元・削除／復元・競合防止と承認範囲を確定する。取消や非表示で検証データと番号消費を残さず、関連記録も後片付けし、実データ・次番号・同じ原資料の再取込み開始値を読取確認して初めて検証完了とする。実業務の採番変更や外部利用を巻き戻す許可ではない。今回のHSC次番号100への訂正は[実行記録](runbooks/historical-property-intake.md#2026-10-10-検証物件の削除次番号100への訂正)を参照。

変更範囲は`governance/project-rules.md`、`governance/README.md`、本節、`CHANGELOG.md`。独立読取レビューGOV-CLEANUP-2は阻害指摘なし。`render-governance.ps1 -Apply`は終了0・生成差分0、AGENTSからの既存のproject-rules必読経路を維持。分類はgovernance-permissions-agents、包括7ゲートを全て新規実行した。アプリ・保存契約・製品要件・ADR・ロードマップの新規変更はなく、先行作業の文書差分を保持。Dev操作・配備・Git pushなし、変更は未コミット。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 生成物・文書・規則の整合成功 | 0 |
| `npm test` | 386成功、既存のシンボリックリンク作成権限による2skip | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 169成功、skip0、エミュレーター終了確認 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |

制限環境での初回`npm test`は378成功・7失敗・3skipで終了1。通常のローカル権限で再実行して上記最終結果を確認し、初回を成功扱いにしていない。必須ゲート省略なし。renderer・validator・検証方針自体は変更しておらず、入力条件付きgovernance-tools追加試験は対象外。

## 2026-10-10 過去物件442件のDev実取込み

オーナーの実行指示後、実行版`cf024b49d68dade823a3f0bac472000c14723f20`を確定。DevのFunctionsとHostingを揃え、正式照合全項目pass後、世代10→11で停止、業務1,115文書を初期化、442物件とマスタ・予約・採番・設定を含む776文書を投入。保持スタッフ3・Auth不変、全件期待像一致。専用公開計画を封印し、正式配備照合を再実施してverification・世代12へ公開した。各実行は終了0。[コマンド・hash・結果・失敗と再確認](runbooks/historical-property-intake.md#2026-10-10-実取込みの実行記録)。

別のオーナー了承後、正式reopenとobserveは各終了0、通常利用（normal・世代13）へ復帰。実ダッシュボード439／439／0／0、保険442行・保証書4行・請求1行の各CSV照合、代表物件の詳細と架空1件の本登録・採番・検索・編集・請求状態更新・取消を確認。取込み442件は検証前後で全内容不変。検証物件HSC-26-100と関連4記録は追加の明示指示で物理削除済み。HSCの次番号は100へ訂正し、同じ原資料の再取込みでも100になることを確認。処理ログの対象時間帯で失敗0、HI-06完了。HS試験運用は未実施。[通常再開・検証の範囲と証拠](runbooks/historical-property-intake.md#2026-10-10-通常再開残る開発検証)。アプリ変更なし、今回の結果文書は未コミット。

今回の製品要件・保存形式・ADR・UI・権限の新規変更なし。検証用補助スクリプトの末尾空行だけ修正し、対応lockを再生成・専用10試験・governance-checkで確認。先行改修とガバナンスは各独立レビュー後に分離統合し、既存包括検証を失効条件に従って再利用、公開用ビルドとクラウド正式照合は新規実行。Prod、Auth、IAM、バックアップ自動取得の設定は変更なし。

実行結果の反映先は本書、取込みrunbook／roadmap、backup-recovery手順、環境仕様、仕様書、docs索引、HSC-015と台帳の対応行、初期納品roadmap、CHANGELOGの11文書。新たな製品仕様・保存契約・ADR追加は不要。文書整合検査`pwsh -NoProfile -File scripts/check-governance.ps1`と`git diff --check`は各終了0。コード・実行版を保ったまま結果文書だけ未コミット、pushなし。

## 2026-10-10 過去物件取込みの実行準備

オーナーの「アカウント以外のDevデータを初期化して取込み準備」の指示に対応。確定原資料442件と所属・欠番・年度別採番を非公開計画へ変換し、マスタ作成、初期化、過去番号保持投入、中断再開、全件照合、既存公開手順への接続を整備した。対象とコマンドは[取込み手順](runbooks/historical-property-intake.md#2026-10-10-取込み計画と実行準備)。本作業ではDev停止・削除・投入・配備は行っていない。

実Devの正式読取inspectは終了0：削除候補1,115、保持スタッフ3、工務店アカウント0、Auth整合。inventoryHash=`d7ab009652beb391a404c1a0c589075b21bf044afede032889710a0858541dbe`。値は実行時の再点検を省略するためのものではない。実値ファイルはGit外、内容をログへ出さない。

今回の担当変更：`scripts/extract-historical-intake.py`、`scripts/prepare-historical-intake.mjs`、`scripts/historical-intake.mjs`、`scripts/lib/historical-intake-plan.mjs`、`scripts/lib/historical-intake-execution.mjs`、既存`default-recovery.mjs`のCLI／lib／admission、`scripts/lib/rules-test-plan.mjs`の試験登録、`test/historical-intake-plan.test.mjs`、`test/historical-intake-extraction.py`、`test/helpers/historical-intake.mjs`、`test/emulator/historical-intake.test.mjs`、`test/default-recovery-admission.test.mjs`、`MeetingPrototype.vue`の履歴表示名1件。文書はspecification、取込みrunbook／roadmap、prototype保存契約、backup-recovery-implementation、CHANGELOG、本書の該当節。既存の別作業差分を保持し、ステージ・コミットなし。

分類はapplication-logic、data-contract-schema-migration、公開経路への変更を含むbuild-release-deployの包括7ゲート。既存の停止・公開・通常再開の承認境界は変更せず、新たな恒久アーキテクチャ判断ではないためADRは追加しない。新規文書がなく索引は変更不要。ガバナンス・権限設定・通常の新規採番仕様は変更しない。失敗時は維持した停止状態で正確な前回実行者と完了位置を照合して再開する。旧バックアップ取得を再開しない。

独立レビューで指摘された、初回記録前の中断、履歴日時形式、削除／書込み途中の計画外データ消失を修正し、最終差分の再レビューで追加の具体的阻害事項なし。最終包括試験は169成功、その他の必須ゲートも終了0。[各コマンドと制約](runbooks/historical-property-intake.md#準備の検証結果)。実行前には検証した版を確定し、現原本・DB・配備状態を再点検する。

## 2026-10-10 AIR取込み原資料の2セル修正

オーナーの修正指示に基づき、AIRのExcel原本のUH!F13・F31を1508-00から1508-01へ変更し、Driveの同一IDへ保存・再取得照合済み。[対象・相違範囲・現資料ID・SHA-256](requirements/source-materials.md#2026-10-10-新潟南2件の原資料修正)。元ファイルの他セル・書式・数式・構成ファイルを保持し、保存後ファイルのSHA-256一致を確認した。原資料の旧版はGit外の一時領域に保持する。Dev・アプリ・メール送信・共有権限は変更していない。

ローカル反映は本書、受領資料台帳、仕様書、取込み手順、取込みロードマップの5文書。既存差分は保持、未コミット。採用値自体の変更ではなく原資料修正の実施記録なので、データ契約・ADR・ガバナンス・索引構造・未決事項の決定内容は変更不要。文書はdocumentation-onlyとしてgovernance-checkとdiff --checkを適用し、アプリ試験・ビルド・配備は対象外。初期取込み全体は未完了。

## 2026-10-10 AIR回答確認による新潟南の残件訂正

GmailのAIRアカウントをプロフィールで照合し、10月10日の照会・回答・了承の3メールを読取確認。対象2件は加盟店名「新潟南」、加盟店コード「1508-01」として取り込む。原資料の1508-00はこの2件の所属対応で訂正し、新津へ割り当てない。区切り記号は既定の4桁-2桁表記に合わせる。契約No・保証番号や他の1508-00を一律に書き換える判断は含まない。 所属の回答待ちを解消し、開発側の入力固定・採番照合・一括処理・予行・実投入・全件検証へ引き継ぐ。取込全体やHI-01を完了とはしない。本文・個人情報の転載は避け、必要な決定要約とメール参照のみ記録した。

文書のみ変更：仕様書、source-materials、HSC-015と台帳の対応行、historical-property-intakeのロードマップ・手順、changelog、本書の8ファイル。台帳の既存HSC-006／036差分は同じコーディネーターによる先行作業として保持し、他行・他事項を変更しない。アプリ・データ契約・ADR・索引構造・ガバナンス変更なし。原資料／Dev／メールへの書込みなし。原資料上で訂正済みかは今回未検査。差戻しは今回の文書差分のみ。未コミット。検証はdocumentation-onlyの文書検査と差分検査を行い、コード・配備試験は分類対象外。

## 2026-10-10 ダイアログ内の情報整理用カードを枠線・影なしに統一

オーナーが先行見本を採用。`WarrantyLifecycleDetails.vue`の保証・保険カード2箇所と、`MeetingPrototype.vue`の満了案内・履歴・登録内容・変更されない情報の4箇所へ`border :elevation="0"`を設定。`app/assets/clear-sky-theme.css`の独自枠・影から`dialog-layout-card`を除外し、Vuetifyの既定枠線を使う。現在の保険期間の青枠・情報・操作・保存、ダイアログ外枠、一覧・dashboardは維持。前段記録の見本未採用は当時の状態であり、本採用を優先する。

UI・文書・継続Dev公開として包括7ゲートを適用。`npm run typecheck`／`npm run build`は各exit0。直前の日付表示変更での`npm test`385成功・2skip・exit0、およびRules163成功・Functions構文・seed構文・governance-tools10成功を再利用。今回の変更はカード属性・CSS除外と文書のみで、業務処理・保存・サーバー・依存・試験基盤の失効条件に該当しない。低影響の外観変更のため新規の恒久テストは追加しない。

`node tmp/build-insurance-order-preview.cjs`はexit0。実Vue部品・架空データをCUAで1280px／375px確認。保証・保険カードの枠は1px rgba(0,0,0,0.12)、elevation 0で影の距離・ぼかし・広がりが全て0、現在期間の2px青枠を保持、横あふれなし。dashboardの従来の影も維持。Devログイン後の全ダイアログ操作試験とは区別する。確認用サーバーを停止済み。

反映文書は仕様書・共通UI設計・changelog・本書。データ契約・ADR・ロードマップ・索引・ガバナンスは対象外で変更不要。未コミットの既存差分を保持。差戻しは今回の6カード属性とCSS除外を戻しHostingを再配備する範囲。`pwsh -NoProfile -File scripts/check-governance.ps1`、`git -c core.safecrlf=false diff --check`は各exit0、最終追記後にも確認する。`npx firebase deploy --project termite-warranty-dev --only hosting --non-interactive`はexit0。`node tmp/verify-portal-menu-hosting.mjs`は32配信ファイル・接続先の一致を確認、exit0。index SHA-256は`7ba938c0ff5ae578f9fea638123789274587dfeb1e880fc89802a5ce2c1ab97a`。Functions・DBの変更なし。オーナーはDevを再読込みして実業務画面を確認する。

## 2026-10-10 変更できない申込日・引渡日を文字表示

オーナーの継続指示「こちらもだ」に対応し、`app/components/MeetingPrototype.vue`の申込日・引渡日も変更不可時は`dl`で日付表示とする。申込日は本登録後または取消中、引渡日は既存の訂正制限ありまたは取消中。引渡日の手続き案内は残し、制限解除後は既存入力へ戻る。新規・下書きの入力、日付訂正条件、保存・権限は変更しない。カード外観見本の採用とは別。

今回の変更ファイルは同部品、仕様書、共通UI設計、changelog、本書。データ契約・ADR・ロードマップ・索引・ガバナンス変更は不要。既存差分を保持し未コミット。差戻しは今回の2日付の表示分岐と対応記述を戻しHostingを再配備する範囲。

分類はUI・文書・継続Dev反映、包括7ゲートを適用。`npm run typecheck`はexit0。`node tmp/check-property-date-display.mjs`は実テンプレート抜粋・架空日付・入力部品の代替を使用し、新規／下書き／本登録後の訂正可／訂正不可／取消の5条件で入力欄数・日付・手続き説明を確認、exit0。全画面の実操作確認とは区別する。`npm test`は385成功・2skip・失敗0、exit0。前段のRules163成功・Functions構文・seed構文・governance-tools10成功は、保存／サーバー／依存／試験基盤の変更がなく失効条件に該当しないため再利用。`npm run build`はexit0。`pwsh -NoProfile -File scripts/check-governance.ps1`、`git -c core.safecrlf=false diff --check`は各exit0、最終追記後も再確認する。`npx firebase deploy --project termite-warranty-dev --only hosting --non-interactive`はexit0。`node tmp/verify-portal-menu-hosting.mjs`は32配信ファイル・接続先の一致を確認、exit0。index SHA-256は`6a7683e6501fdad5c4496531c25875358bebfa0bed2d7bdeb2cd2a505c82ba50`。Functions・DB変更なし。認証後の実画面確認はオーナーによるDev再読込み後の確認を残す。

## 2026-10-10 物件・保証の固定された所属を名称表示

Dev画面確認の継続指示に対応。`app/components/MeetingPrototype.vue`の担当工務店・本支店について、本登録後・取消中、またはアカウントの利用範囲で変更不可の項目を`dl`による名称表示へ変更。本支店コードが参照できる場合は併記。新規・下書きの変更可能な選択欄と、一時的な処理中／参照取得中の無効化を維持する。既存の保存・所属固定・参照取得・権限には変更なし。前段のカード外観見本は採用指示がないため製品へ反映しない。

反映先は上記部品、`test/property-warranty.test.mjs`、仕様書、共通UI設計、changelog、本書。データ契約・ADR・ロードマップ工程・索引・ガバナンスの変更は不要。既存差分を保持し未コミット。差戻しは今回の表示分岐を戻す範囲。

分類はUI・文書・継続Dev反映。包括7ゲートのうち`npm run typecheck`／`npm run build`を再実施し各exit0。`node tmp/check-property-affiliation.mjs`は実テンプレート抜粋を使い、本登録・下書き・取消・会社担当・支店担当・処理中の6条件で表示と入力欄数を確認、exit0。選択部品は検証用の代替であり、全画面の実操作試験ではない。初回の検証用コンパイルの警告は方式を修正して解消。`npm test`の初回は既存の選択欄検出が属性順序に依存していたため1件失敗・exit1。検出式を属性順序に依存しない形へ修正し、必須入力の検証を維持。再実行は385成功・2skip・失敗0、exit0。Rules163成功、Functions構文、seed構文、governance-tools10成功は、今回が保存・サーバー・依存・検証基盤を変更せず失効条件に該当しないため前段証拠を再利用。

`npx firebase deploy --project termite-warranty-dev --only hosting --non-interactive`はexit0。`node tmp/verify-portal-menu-hosting.mjs`は32配信ファイルと接続先の一致を確認、exit0。index SHA-256は`0fd2467e67ee110ec94c6c031a9d9422bac4a1d0b8165eb2b18f22d74803a8e9`。Functions・DB変更なし。最終追記後の文書・差分検査を実施し、認証後の実画面でのオーナー確認は別途とする。

## 2026-10-10 一覧の選択余白・保険期間の表示順変更

オーナーが一覧選択用チェックのメッセージ領域除去と、保証期間に合わせた保険期間の古い順表示を指示し、Dev反映まで承認。`MeetingPrototype.vue`の保険報告／請求共通行を`hide-details`（真）へ変更。全件選択・保証書一覧・組織一覧の選択欄は既に非表示で変更不要。確認・入力エラー用チェックは対象外。`WarrantyLifecycleDetails.vue`の表示順だけを開始日昇順へ変更し、現在・選択期間の強調と操作条件を維持する。保存内容・サーバー処理・移行は変更しない。

仕様書、保険報告要件、アラート要件、dashboard設計、共通UI設計、dashboardロードマップ、HSC-006とその台帳行、changelogへ反映。HSCの既存差分は同一コーディネーターの作業であり他項目を保持。ADRの保存・集計判断、データ契約、環境、ガバナンス、索引入口は変更不要。過去の会話内画面案は現行表示の正本にしない。差戻しは今回の2部品の表示差分と対応仕様を戻す範囲。未コミットで既存変更を保持。

検証分類はUI・文書・Dev公開で包括7ゲート。`npm test`は385成功・2skip・失敗0／exit0、`npm run typecheck`／`npm run build`は各exit0。Windowsの既存symlink試験2skipを維持。文書検査・差分検査は最終追記後に実行する。直下の前回記録のRules163成功、Functions構文、seed構文は今回の表示2箇所・文書変更が失効条件に該当しないため再利用。保存・Functions・依存・試験基盤は変更なし。governance-tools10成功も同じ条件で再利用する。

実Vue部品と架空4保険期間のローカル画面をCUAで確認。2020→2025→2030→2035の開始日順、現在の2025年期間だけ強調、選択期間の目印・終了済み不要の取消不可を確認。標準幅と375pxで一覧のメッセージ領域0・横あふれなし。選択部品の簡易行は約56〜57pxで、実業務の複数行テキストを含む行高の保証値ではない。最初の制限環境のプレビューは接続できず、通常ローカル環境で確認した。追加の恒久テストは低影響の表示変更のため作成しない。

`npx firebase deploy --project termite-warranty-dev --only hosting --non-interactive`はexit0。`node tmp/verify-portal-menu-hosting.mjs`は32配信ファイルの完全一致・接続先一致、exit0。index SHA-256は`bfd6188c5905fe673aef980096cd61e04410470daa3f0813ea2461be1b65ae93`。Functions・DBの再配備／書換えなし。`pwsh -NoProfile -File scripts/check-governance.ps1`と`git -c core.safecrlf=false diff --check`は各exit0、最終追記後にも確認する。Devは再読込みで反映される。認証後の実業務画面でのオーナー確認は別途残る。

## 2026-10-10 ダッシュボード・保険期間別状態の実装とDev導入

オーナーが確定設計の実装・検証・Dev配備を明示承認。対象は既存Dev `(default)` と別制御DBであり、Prod・業務受入は含まない。実装を画面／集計・保険処理／テストへ分担し、別担当が移行・復旧・画面の境界を読取レビュー。包括7ゲートと下記Dev導入・実測を完了。ログイン後のDev操作確認・業務受入は残る。

既存315物件の移行事前点検は315件変更対象・確認不能0件、読取りのみ。手順は必要索引を準備→対応済み保存処理を配備→旧処理終了を確認→移行事前点検→変換・全件照合→画面配備。保存処理の切替はFunctionsの有効版とCloud Runの受付先100%一致を確認し、その確認から旧処理の最大処理時間以上経過してから変換する。旧画面の新しい保存は形式版確認で拒否し、再読込みを案内する。

移行コマンドは `scripts/dashboard-migration.mjs`。`inspect` は読取りのみ、`artifact` はレビュー済みローカル実装一式のSHA-256を取得する。未コミットの既存作業を勝手にまとめないため、この専用コマンドでは対象ファイルの内容を固定して検証・配備と結び付ける。他の既存移行コマンドのclean revision要件は変更しない。`apply` は対象Dev/local、別制御DB、復旧世代、実行ID、`--artifact-hash`、`--writers-drained`、`--apply` が必要。書換え前に最新物件を再読取りし、初回変換だけrevisionを加算、updatedAt・業務履歴を保持する。初期投入にも同じ変換を使う。

失敗時は準備完了を公開せず、その実行の占有記録を保持する。`status` で所有者を確認し、旧処理終了を確認したうえで同じ実行ID・世代と `--resume-owner`／`--previous-worker-ended` で再開する。緊急停止による世代変更等で再開できない場合は、終了済み処理の正確な所有者・実行IDを指定する `stop` でその制御記録だけを解除し、準備印と物件は変更せず既存復旧へ引き継ぐ。不要履歴を削除する逆変換や、旧保存処理への単純差戻しはしない。

画面ではHSの初期画面に4件数と基準日・更新時刻を表示。画面を往復しても再取得せず、初回と「件数を更新」で取得する。業務変更・日付変更は更新を促し、失敗時は前回値を保持する。保険詳細は新しい期間から並び、現在の期間を強調。未報告期間の「報告不要にする」から理由を入力し、期限内は「報告不要を取り消す」で戻す。終了済み期間は記録を表示し変更不可。報告済みは先に既存の報告取消を行う。引渡日訂正・延長取消の影響範囲に不要記録がある場合も先に取り消す。

### Local検証の実行結果

対象分類はUI・アプリ処理・保存契約／変換・配備の和集合。各コマンドの終了を個別に確認した。後述のDev確認と業務受入は区別する。

| コマンド | 最終結果 | 終了コード |
| --- | --- | --- |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 成功。最終文書更新後にも確認する | 0 |
| `npm test` | 385成功・2skip・失敗0。2skipはWindowsでシンボリックリンクを作れない既存fixtureの条件分岐 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功。既存のチャンクサイズ等の警告あり | 0 |
| `npm run test:rules` | 163成功・失敗0・skip0、約288秒、エミュレーター停止確認。保険・集計13件、移行5件を含む | 0 |
| `node scripts/check-functions-syntax.mjs` | Functionsと共有領域49項目の整合・構文確認成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `node --test test/governance-tools.test.mjs` | 既存作業の入力変更に対応する追加確認10件成功 | 0 |
| `node tmp/check-dashboard-ui.cjs` | 実Vue部品と架空データで1280px／375pxを確認。横あふれ・実行時エラーなし。期間順、現在強調、操作権限、失敗時の前回値保持、請求遷移を確認し画像も点検 | 0 |

初回の制限環境では一時ファイル／エミュレーター起動が失敗した。通常環境へ切り替えた後、既存fixtureの旧保存形式・確認不能な保険状態を修正して再実行。失敗した回を成功数へ含めない。最終unit・typecheck・build後の追加変更は索引順とエミュレーター試験であり、Rulesはその最終状態で再実施。文書の実施状況追記は保存契約の意味を変更せず、アプリ検証結果を失効させない。包括ゲートの省略なし。

実装の識別は基点 `ed9ccead21fa1df10b072375f39196742535a4ae` の作業ツリーと、`node scripts/dashboard-migration.mjs artifact` のSHA-256 `7e7f0e30e0580ecaeb411597d08dddc0f7eb2212f044d45dd341f89f08d35871`。既存の無関係なガバナンス作業を保持しており、コミット・pushは行っていない。package依存、Rules、IAM、Prod設定の変更なし。独立レビューの指摘は修正し、DB-REVIEW-03で追加指摘なし。

### Dev導入・実測の実行結果

対象 `termite-warranty-dev`、業務 `(default)`、制御 `recovery-control`、通常稼働・復旧世代10。新規実行ID `dashboard-20261010`。4索引READYを確認後、更新した3 Functionsの受付先100%が新しい版であることを05:54:17 UTCに確認。旧処理の最大300秒を超えた05:59:27 UTCに再確認し、更新処理の占有0件・同じ世代・正常稼働で変換を開始した。

| コマンド／確認 | 結果 | 終了コード |
| --- | --- | --- |
| `npx firebase deploy --project termite-warranty-dev --only firestore:indexes --non-interactive` | 4つの集計索引と内部記録の単独索引除外を反映 | 0 |
| `node tmp/dashboard-index-status.mjs` | 4索引すべてREADY。作成中の点検は終了1で区別 | 0 |
| `npx firebase deploy --project termite-warranty-dev --only functions:propertyPrototype,functions:propertyBulkImport,functions:reportFirestoreMetrics --non-interactive` | 3関数ACTIVE。順に `propertyprototype-00030-jul`、`propertybulkimport-00014-jow`、`reportfirestoremetrics-00008-man` | 0 |
| `node tmp/dashboard-dev-source-proof.mjs` | 実配備ソースのZIPとローカルの関連12ファイルを各関数で照合・一致 | 0 |
| `node tmp/dashboard-dev-runtime.mjs` | 受付先・準備済み版一致、100%受付、通常世代10、更新処理の占有0件 | 0 |
| `node scripts/dashboard-migration.mjs inspect --project termite-warranty-dev --control recovery-control` | 直前315件・変更対象315・確認不能0。変換後315件・変更対象0・確認不能0 | 各0 |
| `node tmp/dashboard-dev-migrate-and-verify.mjs --project termite-warranty-dev --control recovery-control --generation 10 --operation dashboard-20261010 --artifact-hash 7e7f0e30e0580ecaeb411597d08dddc0f7eb2212f044d45dd341f89f08d35871 --writers-drained --apply` | 専用applyを実行。315件変換・315件照合。業務情報・updatedAt・既存履歴の型付き識別値が前後一致、revision加算も全件正しい | 0 |
| `node scripts/dashboard-migration.mjs status --project termite-warranty-dev --control recovery-control` | 前後とも占有なし。変換後に残留なし | 各0 |
| `node tmp/dashboard-dev-verify.mjs` | 実装と同じ4集計をDevで実行し、独立計算した対象ID集合と一致。確認のための本文全件取得はこの単発検査だけ | 0 |
| `npx firebase deploy --project termite-warranty-dev --only hosting --non-interactive` | 検証済み画面を公開 | 0 |
| `node tmp/verify-portal-menu-hosting.mjs` | indexとJS／CSSの32ファイルがローカル成果物と完全一致、Firebase接続先一致 | 0 |

公開先：[Dev](https://termite-warranty-dev.web.app)。indexのSHA-256は `f42c02d5f6e8371261ad7589feebc837c06c7a730b372f9a8b8811cc2c2ca270`。ブラウザーで共通ログイン画面を確認。既存ログイン状態がないため、Dev上の認証済み画面・実ユーザー操作は未確認であり、Localの部品検証と混同しない。

基準日2026-10-10、315物件での単発測定。以下はFirestoreの集計診断値であり、設定・アカウント・復旧確認の読取り、通常画面の一覧読取り、画面通信時間は含まない。配備済みソースとの一致を確認した集計処理を開発側から実行した結果で、認証済みブラウザー経由の往復時間ではない。

| 指標 | 件数 | 集計の物件本文読取り | 走査した索引項目 | 集計のreadOperations | 集計実行時間 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 有効 | 315 | 0 | 315 | 1 | 5.053ms |
| 保険未報告 | 314 | 0 | 945 | 1 | 6.796ms |
| 保証満了案内待ち | 0 | 0 | 0 | 1（最低課金単位） | 6.122ms |
| 未請求 | 314 | 0 | 314 | 1 | 6.762ms |

4集計と前後の設定・アカウント確認を含む開発側呼出しは130ms。最大物件文書は15,930bytes、取消用の容量確保を含めても同値で上限内。現在の不要記録がないデータでの値であり、将来の件数・期間配置・履歴量の性能保証ではない。通常ダッシュボードは4countで本文を取得しない。画面を往復しただけでは集計しないこと、手動更新の成功／失敗・日付境界・認証変更はLocal試験で確認した。

### 変更範囲と残る確認

- 画面：`app/components/BusinessDashboard.vue`、`BusinessNavigationIcon.vue`、`MeetingPrototype.vue`、`WarrantyLifecycleDetails.vue`、`app/composables/useDashboardStore.ts`、`app/utils/dashboardSession.mjs`／`.d.mts`、`insuranceReportDisplay.mjs`／`.d.mts`。前段で承認済みの画面タイトルアイコン差分も今回のHostingへ含む。
- 保存・集計：`functions/dashboard.js`、`property-warranty.js`、`property-bulk-import.js`、`firestore-metrics.js`。`src/domain/dashboard.mjs`、`insurance-state.mjs`／`.d.mts`、`insurance-capacity.mjs`／`.d.mts`、`property-warranty.mjs`、`monthly-query.mjs`、`recovery.mjs`、`client-firestore-metrics.mjs`。Functionsの共有領域は既存生成手順で反映。
- 導入・検証：`firestore.indexes.json`、`package.json`、`scripts/dashboard-migration.mjs`、`scripts/lib/dashboard-migration.mjs`、`recovery-controller.mjs`、`rules-test-plan.mjs`、`scripts/seed-emulator.mjs`。新規試験は `test/dashboard-session.test.mjs`、`insurance-period-display.test.mjs`、`insurance-state.test.mjs`、`dashboard-migration.test.mjs`、`test/emulator/dashboard-insurance.test.mjs`、`dashboard-migration.test.mjs`。既存のproperty-warranty・property-bulk-import・client/server-firestore-metrics、emulator/property-warranty・isolated-property-import試験を更新。
- 文書：仕様、保険報告／アラート要件、dashboard設計／ロードマップ、試作保存契約、月別検索契約、ADR 0040／0041、文書／設計索引、環境設定、本書、changelogへ反映。新しい業務判断はないため、採用根拠のHSC記録やADRの理由を変更しない。共通UI・他業務・Prod構築・初期納品範囲への追加判断は変更なし。
- ガバナンス：今回の実装では変更なし。既存のガバナンス・AIR指定等の差分を保持。所有範囲外のstage／commit／pushなし。作業ツリーは既存差分を含め未コミット。

次はオーナーのDev画面確認。再読込み・ログイン後に①4件数と基準日、②別画面から戻った時の更新時刻維持と「件数を更新」、③保険詳細の新しい期間順・現在強調、④未請求から既存請求画面への遷移を確認する。「報告不要」の設定・取消は意図した検証用物件で行う。業務データを確認のためだけに変更しない。これを終えるまでDB-05の認証済み操作確認・DB-06の業務受入を完了扱いにしない。

## 2026-10-10 設計確定（実装指示待ち）

Q30の最終確認へオーナーが「YES」と回答。ダッシュボード・期間別報告不要の詳細設計を確定し、ロードマップDB-03を完了、DB-04を実装指示待ちとした。HSC-006は設計解決として台帳の解決済みへ移動。実装・データ変換・配備・初期納品への追加を自動承認しない。下の確認待ち記録は今回の回答前の状態。

反映先：`docs/design/dashboard.md`、`docs/roadmaps/dashboard.md`、`docs/requirements/house-solution-confirmations/HSC-006-dashboard-presentation.md`と台帳の同項目、`docs/specification.md`、`docs/requirements/alerts-and-dashboard.md`、`docs/requirements/insurance-reporting.md`、`docs/decisions/0040-dashboard-session-store.md`、`docs/decisions/0041-insurance-period-reporting-status.md`、`docs/design/meeting-prototype-2026-10-03.md`の未実装計画節、`docs/README.md`、`docs/design/README.md`、`CHANGELOG.md`、本書。

今回は承認状態と参照の文書反映のみ。前段でレビューした設計内容を新たに変更せず、稼働中の保存契約・アプリ・ガバナンス設定・利用手順・外部環境は変更しない。既存差分を保持し、未コミット。documentation-onlyとして文書検査と差分検査を実行し、結果は今回の完了報告へ記録する。実装・型検査・ビルド・業務／DB試験・実データ実測は対象外。実装開始後に適用する検証・導入の条件は詳細設計を参照。

## 2026-10-10 実装前準備の最終整理

今回の変更は`docs/design/dashboard.md`、`docs/roadmaps/dashboard.md`、`docs/requirements/house-solution-confirmations/HSC-006-dashboard-presentation.md`、同台帳のHSC-006行、本書。採用済み仕様に対する作業順、架空6物件の期待件数・対象集合、操作順による集計回数、失敗時保持値、公開条件を具体化。旧画面の操作形式確認、通常保存と初期変換の同時処理、再実行と復旧世代、書込み後の差戻しを詳細案へ追加。DB-READY-CLOSE／INS-READY-CLOSEの読取専用独立点検で対象箇所の指摘なし。Q30は設計全体の最終確認で、実装・移行・配備は含めない。

文書のみ・未コミット。既存アプリとガバナンスの差分を保持し、今回変更なし。業務仕様・ADRの採用済み決定は変更せず、稼働中のデータ契約・利用手順・索引の変更もなし。新規文書を作らないため入口索引の追加不要。変更履歴には既存の詳細設計作成の記載があり、今回はその具体化のため追加しない。検証方針のdocumentation-onlyを選び、`pwsh -NoProfile -File scripts/check-governance.ps1`と差分検査を最終状態で行い結果を完了報告へ記録する。アプリ・データ・配備を変えないため、業務試験・型検査・ビルド・DB試験・構文検査は今回の対象外。記載した期待値は試験結果ではなく、実装後に照合する条件。実データ点検・索引・容量・速度・切替の実証は未実施。

## 2026-10-10 実装前の詳細点検

サブエージェントINS-PREFLIGHT-FINAL／DB-PREFLIGHT-FINALを読取専用で実施。現行保存・月別検索・復旧検査・計測を照合し、[詳細設計](design/dashboard.md)へ具体項目候補、初期変換のrevisionと更新日時、月別報告候補、全更新経路、復旧・容量・受入条件を追加。Q28の保険満了案内方針を仕様・insurance-reporting・alerts-and-dashboard・ADR 0041・HSC-006とHSC-036／対応台帳行・roadmaps/dashboard・CHANGELOGへ反映。Q29の初回未報告の予告対象外も採用。 最終レビューINS-PREFLIGHT-REVIEWの2指摘（先行期間の不要取消の再表示、取消後の文書全体の容量確保）を詳細案・受入条件へ反映。DB-01は正本に全4指標の定義が揃ったため仕様確定とし、DB-03は詳細案の確認待ち。文書のみ・未コミット、アプリ・DB・ガバナンス設定・配備・会話内画面は変更しない。稼働中の保存契約は変更せず、詳細の候補を別途レビューするため、型検査・ビルド・業務／DB試験は選択外。文書検査は今回の最終報告に結果を記録する。

Python入力による6期間の3状態の全729通りの組合せ点検で、未報告の連続区間は最大3、3超過0、終了0。DB・日付関数の試験ではない。公式の容量上限と容量計算法を公開Webで確認し設計へ出典を記載。実データの不足件数・容量、索引・性能、変換・復旧の実証は未実施。旧機能の成功記録を今回の成功へ流用しない。

Gmail・Googleドライブの参照先と接続確認は、[プロジェクト規則](../governance/project-rules.md#gmailgoogleドライブの参照先)を正本とする。

## 2026-10-10 保険期間の表示順（設計のみ）

Q27の回答を反映し、開始前を含め保険期間の開始日が新しい順に上から表示。現在の期間はその位置で強調する。反映先は仕様書、insurance-reporting、alerts-and-dashboard、design/dashboard、HSC-006と対応台帳行、roadmaps/dashboard、CHANGELOG、本書、会話内のinsurance-final-review.html。文書と架空画面のみの変更で、未コミット。既存アプリ差分を保持。データ契約・ADRの期間別状態方針・ガバナンス・配備・利用手順は変更対象外。文書検査と画面案の並び順・操作・幅の確認を行い、今回の最終結果は完了報告へ記録する。アプリの型検査・ビルド・DB試験は、実装を変更しない設計段階のため選択対象外。

## 2026-10-10 ダッシュボード詳細設計の境界

[詳細設計案](design/dashboard.md)を作成。今回の変更は文書のみで、既存Localのアイコン等の差分を保持。ダッシュボード実装・DB補完・外部配備は未着手。設計完了後もオーナーの明示指示を待つ。未請求は既存請求画面へ遷移し保証グループ指定を維持。保険はQ19で期間別3状態と今日を含む期間の未報告数へ変更を採用。不要の理由・担当者・日時と取消を保持する設計。Q20で「現在の期間を強調」・対象期間横の操作と、期間終了後の報告不要取消禁止を採用。終了当日は取消可、翌日以降は不可として日本時間で判定し、終了後も状態・理由を表示する設計。Q21で終了後の不要設定禁止と訂正前の不要取消を採用。終了済みの不要が残る場合は画面で訂正せず開発側へ個別依頼する。対象は5年ごとの保険期間で、保証全体の満了後に限らない。Q22で不要期間の一覧・CSV・報告済み登録からの除外、詳細での確認・期限内取消、取消後の条件付き再表示、次期間を除外しない方針を採用。Q23で延長取消前の対象区間の不要取消と、終了済みなら個別依頼する手順を採用。残る保証区間の不要は保持する。Q24で報告取消後に理由付きで不要にする2段階の操作を採用。Q25で登録済み保証内の開始前期間への不要設定を採用。Q26で物件内の期間別状態と集計用未報告区間を同時保存する方式を採用。具体項目・既存記録の移行・画面全体への反映等を詳細化中。実装・DB移行・運用切替は行っていない。以下の同日アイコン作業の記録は当時の状態で、現在の採用事項は詳細設計と仕様書を参照する。

今回の設計反映先は`docs/specification.md`、`docs/requirements/insurance-reporting.md`、`docs/requirements/alerts-and-dashboard.md`、`docs/requirements/house-solution-confirmations/HSC-006-dashboard-presentation.md`と対応する台帳行、`docs/design/dashboard.md`、`docs/roadmaps/dashboard.md`、`docs/decisions/0041-insurance-period-reporting-status.md`と決定索引、`CHANGELOG.md`、本書。文書差分は未コミット。既存のアプリ・AIR規則差分を保持し、今回の設計作業では変更していない。現行保存契約`docs/design/meeting-prototype-2026-10-03.md`にはQ26の計画節を追加。具体項目・移行契約は詳細化中。利用手順は例外時の表示・操作設計と実装待ちのため未更新。共通UI方針・他のADR・配備設定・ガバナンス設定への変更なし。

今回の分類は文書のみ。保存契約には将来方針だけを追記し、稼働中の項目・意味・変換処理は変更していないため、適用済みデータ契約の変更としては扱わない。文書検査のためアプリの型検査・ビルド・業務試験・DB試験は今回の選択対象に含めない。Q25までの`./scripts/check-governance.ps1`と`git diff --check`は終了0。Q26の最終文書検査は今回の完了報告へ結果を記録する。Q27の画面確認案をアプリ外の架空データで作成し、`python .../visualize/1.0.47/skills/visualize/scripts/render.py <fragment> <preview> --force`は終了0、`node tmp/check-insurance-final.cjs`は終了0。最初のブラウザー起動は制限環境のアクセス拒否で終了1、同じローカル架空画面の確認を許可範囲内で再実行し終了0。736px／320pxの横あふれ、理由必須、不要取消、開始前の個別設定、報告取消後の不要設定、選択期間の目印、閲覧専用の操作非表示を確認した。画像で狭幅・明暗を点検。実アプリの動作・DB・導入の検証ではない。その後Q27は新しい期間ほど上へ並べる修正付きで採用。保存項目・移行等も残るため設計全体の完了とはしない。アプリ・ガバナンス設定は変更していない。

## 2026-10-10 画面タイトルのアイコン（Local）・ダッシュボード質疑

現在のDrawerの10画面で、h1左へ同じBusinessNavigationIconを共用。20px、間隔12px、文字色継承、長いタイトルの折返しを確認。タイトル文言・サイズ・業務処理は維持。Dev配備・実画面受入は未実施。

実装差分は`app/components/MeetingPrototype.vue`、`WarrantyCertificateManagement.vue`、`WarrantyOrganizationManagement.vue`、`StaffAccountManagement.vue`、`RecoveryStatus.vue`（後4件も同じcomponents配下）、`app/assets/clear-sky-theme.css`。文書は仕様書、共通UI設計、アラート要件、HSC-006と索引、[ダッシュボードロードマップ](roadmaps/dashboard.md)、docs索引、changelog、本書。既存AIR規則の3文書差分を保持。未コミット。

ダッシュボードは仕様整理を開始し、満了カードを既存の保証満了案内の対応対象数、有効カードを今日保証期間内の本登録物件数と確定。保険は今月までの初回・更新報告待ちと確定。未請求は今月以前の対象物件数と確定。ログイン直後の画面として採用。保険は履歴有無によらず当月基準、4指標は全体合計のみでグループ別表示・切替なしと確定。HS全員の閲覧・3カード遷移・共有Storeによる初回・手動更新・更新時刻表示も確定。関連質問は一度に最大3問とし、残る質疑はHSC-006を正本とする。対応優先デザインと、更新失敗時の前回値・更新時刻保持＋警告、初回失敗時の取得不可表示を採用（HSC-006 Q14）。集計方式未採用、ダッシュボード実装未着手、初期納品の進捗・日程は変更なし。

検証分類はUI/CSS/layout＋文書。以下は今回のUI差分で実行完了した結果。最終文書検査・差分検査は追記後にも再実行し、最終結果をタスク完了報告に残す。

| コマンド | 結果 | 終了コード |
| --- | --- | --- |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功。チャンクサイズ・Nitro参照等の警告あり | 0 |
| `node tmp/check-page-title-icons.cjs` | 制限環境ではブラウザー起動失敗。通常環境で1280px／375px、各10タイトルの図柄・20px・12px・はみ出しなしを確認。生成画像も目視確認 | 再実行0（初回1） |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 成功 | 0 |

表示確認は実テンプレートのh1と既存アイコン・CSSを使う独立したローカルfixture。ログイン後の画面全体や実データの受入確認とは区別する。通常のアプリ画面へ配備しての最終確認はDev反映時に行う。追加の永続テストは作成しない。domain／Rules／Functions構文／seed構文は今回の選択クラス外で、業務ロジック・保存・依存・権限は未変更。前段AIR規則変更の全7検証は完了済みで、今回失効する型検査・buildを上記で再取得。データ契約・ADR・共通governanceの変更なし。差戻しはアイコン挿入と共通タイトルCSSの今回差分を戻す。

## 2026-10-10 現在地・PM（白蟻）-09への引継ぎ

オーナー指示によりPM（白蟻）-08から同じ主リポジトリの新規・非forkタスクへ交代。設定はAstra／Medium。新タスクは通常のAGENTS・project-rules・文書マップから起動する。

- UI改修の最新Dev確認は直下の「ダイアログ外枠除去」。共通ツールバー、セクション、組織ツリー、メニューアイコン、一覧からの報告／発行取消を含む既存差分を統合。交代時の追加配備・Cloud再照合はしない。今後のDev配備は各回の明示指示を待つ。
- 過去物件442件は未投入。所属判断の回答待ちは10月10日のメール照合で解消（新潟南2件＝1508-01）。竹原・早良・三次・金沢南の既決を再質問しない。開発側の入力固定・採番照合・一括処理と検証を進め、再開時は[ロードマップ](roadmaps/historical-property-intake.md)と[手順](runbooks/historical-property-intake.md)を読む。変換・初期化・書込み・採番照合・再投入・全件検証は未完成。既存ツールは入力パッケージの読取検査だけ。
- 業務資料・メールは事業用AIRを使用する。Driveの入口は[AriLabo内のプロジェクト](https://drive.google.com/drive/folders/1Fx4cKWun0UzVmSxDkJBE7BZcjuCTKQ-7)。再接続時はアカウントと対象をツールで再確認する。日付準備のHS了承、PDF送付、日程未合意の訂正は[資料台帳](requirements/source-materials.md#2026-10-10-airメールによる記録訂正)が根拠。メール送信は別途指示が必要。
- 実データを含む確認用PDF2件はローカルに保持し、Gitへ含めない。生成コード・手順は保存する。独立した引継ぎファイルは作らない。
- 統合前検証：`npm test` は制限環境で失敗後、通常環境で358成功・2skip／exit0。`npm run typecheck`、`npm run build`、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs`は各exit0。`node --test test/historical-intake-package.test.mjs test/list-undo-ui.test.mjs`は7成功／exit0。Rulesは直下の145成功／exit0の記録を再利用し、以後の表示・文書・読取専用入力検査の変更はRules・永続化処理・依存の失効条件に該当しない。最終文書検証・差分検査はコミット前に実行し結果を交代元の完了報告へ残す。データ契約・ADR・governance・権限設定の変更なし。

## 2026-10-09 ダイアログ外枠の除去（Dev確認済み）

全14ダイアログのルートVCardに`:border="false"`を指定。対象はCompanyPortalAccountManagement、CompanyPortalNotificationManagement、ConstructionCompanyPortal、MeetingPrototype、PropertyBulkImportDialog、StaffAccountManagement、WarrantyCertificateManagementの7 Vueファイル。`app/assets/clear-sky-theme.css`でダイアログ直下のカードだけborderを0にする。一般カード・内部カード・影・区切り線・日付v-menuは変更しない。

UI・文書・配備の全7gateを選定。最終アプリ差分の`npm run typecheck`・`npm run build`各exit0。`node --test test/warranty-organization-ui.test.mjs test/list-undo-ui.test.mjs test/property-bulk-import-ui.test.mjs`は15成功／exit0。domain358成功2skip・Rules145成功・Functions構文・seed構文の各exit0は同日の成功証拠を再利用。今回のテンプレートborder指定・CSSと文書はそれらの失効条件に該当せず、保存・業務処理・依存は不変。`./scripts/check-governance.ps1`と`git diff --check`は各exit0（既存の改行警告のみ）。ADR・データ契約・governance変更なし。既存差分を保持しcommit/pushなし。

Dev対象照合`npx firebase hosting:sites:list --project termite-warranty-dev --json` exit0。`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` exit0（1,003ファイル公開）。`node tmp/verify-portal-menu-hosting.mjs` exit0（32資産一致、Dev設定一致）。HTML SHA-256 `1e16729644788ea4499779e94ec3e52f1689f691fb1260a0f885732fc8d04a96`。Chromeで再読込後、物件編集・一括取込みのルートカードを実測しborder-width 0pxを確認。画像`tmp/dev-dialog-border.jpg`。フォーム保存・データ変更なし。非表示のポータル画面等はコード上の全14箇所確認とビルドで確認し、全14画面を実操作したとは扱わない。差戻しは今回のborder指定・CSSを戻し検証後Hosting再配備。

並行して訂正版過去物件442件を読取検査し、追加回答の三次統一・金沢南分離を仕様／資料台帳／手順／工程／HSC-015へ反映。原資料・Devデータは変更していない。検査結果と残件は[資料台帳](requirements/source-materials.md#2026-10-09-訂正版の全件再検査とuh名称の確定)を参照。実投入完了を意味しない。

## 2026-10-09 マスタ編集の所属表示・アラート統一（Dev確認済み）

対象は`app/components/MeetingPrototype.vue`。登録済み工務店の保証グループ／本支店の工務店をdlによる文字表示へ変更、新規は選択欄維持。3種マスタの有効ラベルを統一し、無効化・再有効化・既存保証対応の説明をwarning v-alertへ集約。本支店の接頭辞案内と不要な表示用computedを削除。保証グループの固定設定案内も共通info v-alertへ統一。保存・参照取得・無効マスタ編集禁止・データ形式は維持。

UI・文書・配備として全7gate選定。`npm run typecheck`、`npm run build`、`./scripts/check-governance.ps1`、`git diff --check`は各exit0。`node --test test/warranty-organization-ui.test.mjs test/list-undo-ui.test.mjs`は6成功／exit0。domain358成功2skip、Rules145成功、Functions構文、seed構文の各exit0は同日の有効な成功証拠を再利用。表示テンプレートと未使用表示用computed削除だけで、業務処理・保存・依存・試験等の失効条件に該当しない。既存ビルド／改行警告のみ。仕様・共通UI・CHANGELOG・本書を整合、ADR・データ契約・工程・governance変更なし。既存差分保持、commit/pushなし。差戻しは今回の表示変更を戻して検証後Hosting再配備。

Dev対象照合 `npx firebase hosting:sites:list --project termite-warranty-dev --json` exit0。`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` は1,003ファイル公開／exit0。`node tmp/verify-portal-menu-hosting.mjs` は32資産・Dev設定一致／exit0。HTML SHA-256：`cd02e15087fbc5e815372d25218c889be975d3d011810aac3b21707d00d196df`。

実画面で保証グループ・工務店・本支店の各warning案内と有効ラベルを確認。工務店／本支店の編集は所属名の文字表示・選択欄0、新規は選択欄1を確認。本支店の旧接頭辞案内0。下部までスクロールしてアラートと保存／閉じるの表示を確認。保存せず終了、DB変更なし。画像 `tmp/dev-master-alert.jpg`。Dev再読込で確認できる。

## 2026-10-09 保証グループ編集の固定設定整理（Dev確認済み）

`app/components/MeetingPrototype.vue`の保証グループ編集テンプレートを変更。新規時だけ固定設定の入力欄を表示し、登録済みでは閉じたdetails「登録時の設定」内に文字表で表示。外部キー名称欄は必須設定オンの場合だけ表示し、v-modelと保存処理は維持。古い保証書差込み印刷の案内はこの編集フォームから除去。変更対象文書は仕様・共通UI・CHANGELOG・本書。データ形状・意味・API・権限・governance・ADR・工程変更なし、移行不要。既存差分保持、commit/pushなし。差戻しは当該表示変更を戻し検証後Hosting再配備。

UI・文書・配備として全7gateを選定。`npm run typecheck`、`npm run build`、`./scripts/check-governance.ps1`、`git diff --check`各exit0。`node --test test/warranty-organization-ui.test.mjs test/list-undo-ui.test.mjs`は6成功／exit0。domain358成功2skip・Rules145成功・Functions構文・seed構文の各exit0は同日証拠を再利用（テンプレートだけで各失効条件に該当せず、保存・依存・試験変更なし）。省略gateなし。

Dev対象照合 `npx firebase hosting:sites:list --project termite-warranty-dev --json` exit0。`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` は1,003ファイル公開／exit0。`node tmp/verify-portal-menu-hosting.mjs` は32資産・Dev設定一致／exit0。HTML SHA-256 `862d28738142a51979e745f82eff56cb8385857e91ddc8b7156f9373c2bbeca6`。

実画面：通常保証（外部キー不要）の編集で固定入力欄と外部キー名称欄なし、閉じた登録時設定を展開して5設定を確認。取込み保証では外部キー名称欄の値「契約番号」を編集可能。新規では従来設定入力があり、外部キーのオン→名称入力→オフで非表示→再オンで入力値保持を確認。保存は行わずDB変更なし。無効マスタのv-form無効化・保存ボタン非表示はコード上維持、今回は再実画面検証しない。画像 `tmp/dev-group-fixed-settings.jpg`。利用者はDevを再読込する。

## 2026-10-09 組織リスト拡幅・検索欄伸長修正（Dev確認済み）

`WarrantyOrganizationManagement.vue`のCSSのみ変更。組織列240→320px、名称検索入力をflex:0 0 autoへ変更。Dev修正前は入力flex-grow:1・高さ約152px、修正後は保証グループ／工務店／本支店の3階層すべてgrow:0・高さ66px（メッセージ領域込み）。組織幅320px、Body高855px＝viewport855pxを実画面で確認。画像 `tmp/dev-organization-width-search.jpg`。

UI・文書・Dev配備として全7gateを選定。最終CSS後の `npm run typecheck`、`npm run build`、`./scripts/check-governance.ps1`、`git diff --check` は各exit0。domain358成功2skip・Rules145成功・Functions構文・seed構文は各exit0の同日証拠を再利用。CSSと文書だけでpolicyの失効条件に該当しない。業務ロジック・データ契約・権限・ADR・ロードマップ・governance変更なし。設計・CHANGELOG・本書を整合。既存差分保持、commit/pushなし。差戻しは今回のCSS2か所を戻し検証後Hosting再配備。

`npx firebase hosting:sites:list --project termite-warranty-dev --json` 対象一致／exit0。`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` は1,003ファイル公開／exit0。`node tmp/verify-portal-menu-hosting.mjs` は32資産・Dev設定一致／exit0。HTML SHA-256：`9af2c58737f50b38091730221aef09b9bb309cce9438cdf496199cd0ce7fe497`。DB更新なし。Dev再読込で確認できる。

## 2026-10-09 組織管理のアイコン・内部スクロール

モックのfolder／building-2アイコンを組織ツリーへ反映し、最新設定取得を「無効を含む」の左へ移動。既存の取得ハンドラをslotで再配置しただけで、取得範囲・保存・権限は変更しない。左右独立の内部スクロール、通常PCの表見出し・検索・ページ操作固定、内容増加時の右領域スクロールを実装。独立レビューで警告増加時のクリップ懸念を修正し、再レビューで指摘解消。

変更：`app/components/WarrantyOrganizationManagement.vue`、`MeetingPrototype.vue`、`BusinessNavigationIcon.vue`、`app/assets/clear-sky-theme.css`、`public/icons/lucide/folder.svg`、`building-2.svg`、共通UI設計、本書、CHANGELOG。UI・文書・Dev配備に分類。スキーマ・API・ADR・移行・工程・governance変更なし。既存差分を保持し、commit/pushなし。差戻しは当該UI差分を戻して影響検証後Hosting再配備。

全7gateを選定。`npm run typecheck`・`npm run build`は最終CSS後に各exit0。対象UI `node --test test/warranty-organization-ui.test.mjs test/list-undo-ui.test.mjs` は6成功／exit0。`./scripts/check-governance.ps1`・`git diff --check` はexit0。`npm test`（358成功2skip／exit0）、`npm run test:rules`（145成功／exit0）、Functions構文・seed構文（各exit0）は直下の共通ダイアログ検証を再利用。今回のテンプレート・CSS・静的SVG・文書だけでは各gateの失効条件に該当しない。省略gateなし。

Dev Chromeで容量検証の25工務店を表示。1920×855時、Body高855・Bodyスクロール位置0、組織リスト586pxに内容1784px、表186pxに内容1259px。ホイール操作後、組織scrollTop1198・表1073へそれぞれ移動し、右領域全体は0のまま。更新ボタンx564、無効チェックx733で左右順序一致、実際の最新取得も完了。無効グループの警告表示は1366×800でBody高800、右領域内でページ操作へ到達可能。無効グループ＋無効工務店の警告2件が出る既存データは確認できず、その組合せの実画面検証は未実施（静的レビューで自然高と内部スクロールを確認）。データ追加・変更なし。

最終Dev配備：`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` は1,003ファイル公開／exit0。`node tmp/verify-portal-menu-hosting.mjs` は32資産・Dev設定一致／exit0。HTML SHA-256：`54ea4fb61a8ce30bbd182d688edfa204d0b8d7f63965e32251936a620df91a14`。対象照合の初回は制限環境で通信失敗exit1、通常環境で再実行exit0。最終390×700ではBody高700・横幅390、組織リスト95px（改修前21px）を確保、右領域292pxで内部スクロール。通常幅へ復元済み。画像 `tmp/dev-organization-scroll.jpg`。Dev再読込で利用できる。

## 2026-10-09 共通ダイアログ・組織ツリー（Dev反映）

採用済みの共通ツールバー・見出し、本文末尾の物件・保証全体取消、組織ツリー＋一覧を実装。UI実装、独立レビュー、UH確認PDFを分担した。レビューの必須修正指摘なし。

アプリ変更は `BusinessDialogHeader.vue`（新規）、`MeetingPrototype.vue`、`StaffAccountManagement.vue`、`WarrantyCertificateManagement.vue`、`WarrantyOrganizationManagement.vue`、`PropertyBulkImportDialog.vue`、`clear-sky-theme.css`。文書は仕様・共通UI・ロードマップ・本書・changelog・資料台帳・docs索引・PDF生成手順を更新。データ形式・API・業務処理・権限・governanceは変更せず、ADR／データ契約変更なし。既存の未コミット差分を保持し、commit/pushなし。差戻しは当該UI差分を戻し、影響検証とbuild後Hostingへ再配備する。

UI・文書・配備として全7gateを選定。最終アプリ変更後の結果：

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功（既存のNitro／SPA警告あり） | 0 |
| `npm test` | 358成功・2skip | 0 |
| `npm run test:rules` | 145成功・Emulator停止確認 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `./scripts/check-governance.ps1` | 成功 | 0 |

`git diff --check` も成功／exit0（既存文書の改行コード警告のみ）。

対象UI回帰：`node --test test/warranty-organization-ui.test.mjs test/list-undo-ui.test.mjs test/property-bulk-import-ui.test.mjs` は15成功／exit0。通常テストとRulesの初回は制限環境によりexit1となり、通常実行環境で再実行した上記結果を採用。省略gateなし。アプリ検証後は文書のみ更新。

`npx firebase hosting:sites:list --project termite-warranty-dev --json`（対象一致／exit0）、`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive`（1,001ファイル公開／exit0）。`node tmp/verify-portal-menu-hosting.mjs`（32資産一致・Dev設定一致／exit0）。公開HTML SHA-256：`c513d41542f0ffd802af2fd9dbad0920c542f49dd1528a5030bb8adb8b4968ef`。Functions／Rules配備・DB更新・Prod操作なし。

Dev Chromeの既存管理者ログインで、物件編集の共通ヘッダーとセクション、本文末尾の取消ボタン→理由・影響確認画面、組織ツリーから工務店→本支店、親所属変更不可の本支店編集、保険報告の閲覧詳細を確認。取消の実行や保存は行っていない。物件編集は1920×855と390×700でヘッダー・下部操作が表示され、本文内スクロール・横はみ出しなし。組織管理は通常幅で確認済み。390pxへ既存画面を縮めた際は左メニューが残り本文が狭まったため、組織管理の狭幅利用を検証済みとはしない。検証後に画面幅を復元。画像はignored `tmp/dev-dialog-cancellation.jpg`、`tmp/dev-organization-tree.jpg`。利用者はDevを再読込する。

UH確認PDFは19ページ・重複全50組100行を掲載。全ページ描画確認、50コード／100名称と行番号・ページ数・日本語フォント埋込みの検査成功。[生成手順](../deliverables/uh-code-review-2026-10-09/README.md)。PDFはGitへstageしない。原資料変更・HSへの送信・過去物件取込みは実施しない。

## 2026-10-09 採用済みメニューアイコン（Dev確認済み）

採用されたLucide線画10点を各業務名の左へ追加。20px、間隔12px、文字色を継承。3サブヘッダーと常時表示、既存権限・busy制御を維持。配布元・ライセンス・名称対応は[共通UI設計](design/clear-sky-theme.md#2026-10-09-採用済みメニューアイコン)。

変更ファイル：`app/components/BusinessNavigationIcon.vue`（新規）、`app/components/MeetingPrototype.vue`、`app/assets/clear-sky-theme.css`、`public/icons/lucide/`のhouse/calendar-clock/shield-alert/clipboard-list/receipt-text/file-badge/network/users-round/bell-ring/database-backup各SVGとLICENSE.txt、`docs/specification.md`、`docs/design/clear-sky-theme.md`、`CHANGELOG.md`、本書。UI・文書・配備。package依存追加なし。データ契約・保存・検索・Functions・Rules・governance・ADR・工程は変更なし。既存別件差分保持、commit/pushなし。差戻しはprependスロット・新規コンポーネント・アイコン資産・余白CSSを戻し、影響ゲート後Hosting再配備。

`npm run typecheck`、`npm run build`は最終余白修正後、各成功・exit0。`./scripts/check-governance.ps1`、`git diff --check`も成功・exit0。既存SPA警告・別件改行警告のみ。全7gate選定のうちdomain（358成功2skip／exit0）、Rules（145成功／exit0）、Functions構文（exit0）、seed構文（exit0）は同日UI改善の成功を再利用。UI表示・静的画像・文書のみでそれぞれの失効条件（業務ロジック・保存・テスト・依存・環境等）に該当しない。

`npx firebase hosting:sites:list --project termite-warranty-dev --json`対象一致／exit0。`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive`最終999ファイル公開／exit0。`node tmp/verify-portal-menu-hosting.mjs`HTML＋JS/CSS30資産一致／exit0。追加のNode読取照合（public/icons/lucide配下の11ファイルを公開URLから取得しBuffer.equalsで比較）も全一致／exit0。最終公開index SHA-256：`c7ba68fb86454388f5e43f78c76a9e5029caaa63f5d9334e6b7c860182369450`。

Dev Chromeで10点描画、20px・全10項目の余白12px、選択時primary色を確認。390×844の一時メニューでも10項目、全名称clientWidth/scrollWidth一致で横切れなし、長い組織名は折返し。物件画面へ遷移し画面幅を復元。Body高は通常855px・狭い幅844pxで画面高と一致。DB更新なし。画像はignored `tmp/dev-menu-icons-2026-10-09.jpg`。利用者はDevを再読込する。

## 2026-10-09 メニューをサブヘッダーへ訂正（Dev確認済み）

「まとめる」を折り畳みと解釈した実装をオーナーが訂正。日常業務・月次業務・その他業務を同じv-list-subheaderに統一し、権限内の項目は常時表示。opened指定とv-list-groupを撤去。開閉自体の不具合修正は実施しない。

原因調査で確認できたこと：旧テンプレートはopened=['monthly']を固定で渡し、利用者の開閉状態を保存していなかった。再読込・コンポーネント再作成で月次が開く構造。一方、Devで月次を閉じた後の物件画面切替・検索欄入力では自動展開が再現せず、報告された発生タイミングの原因は未特定。一般的な再描画で必ず開くとは断定しない。

変更ファイル：`app/components/MeetingPrototype.vue`、`docs/specification.md`、`docs/design/clear-sky-theme.md`、`CHANGELOG.md`、本書。UI・文書・配備。データ形式・保存・権限・Functions・Rules・governance・ADR・工程変更なし。既存差分保持、commit/pushなし。差戻しは今回のテンプレート変更を戻し、型・build等の影響検証後Hosting再配備。

`npm run typecheck`、`npm run build`、`./scripts/check-governance.ps1`、`git diff --check`は各成功・exit0。全7gate選定。domain（358成功2skip／exit0）、Rules（145成功／exit0）、Functions構文（exit0）、seed構文（exit0）は同日UI改善の証拠を再利用。テンプレートと文書のみの変更は各gateの失効条件に該当せず、保存・業務ロジック・テスト・依存・環境変更なし。

`npx firebase hosting:sites:list --project termite-warranty-dev --json`（対象一致／exit0）、`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive`（988ファイル公開／exit0）、`node tmp/verify-portal-menu-hosting.mjs`（HTML＋JS/CSS30資産一致／exit0）。公開index SHA-256：`20bec72c1fb48e3bd6c166ffafe3401b209411b22daa102d0f53ca504a1afeef`。

Dev Chromeで3サブヘッダーと10業務項目を常時表示、折り畳み要素0、保険満了案内へ遷移後も配置を維持。Body高855pxは画面高と一致。DB更新なし。画像：ignored `tmp/dev-menu-subheaders-2026-10-09.jpg`。利用者はDevを再読込する。

## 2026-10-09 アラート伸長・メニュー分類（Dev確認済み）

オーナー指示により、業務画面内のv-alertをflex:0 0 autoに変更。日常業務の物件・保証を残し、指定5一覧を初期展開する開閉式「月次業務」、従来の管理機能を開閉式「その他業務」に整理。既存の権限別候補・busy時の遷移制御は維持。

変更ファイル：`app/components/MeetingPrototype.vue`、`app/assets/clear-sky-theme.css`、`docs/specification.md`、`docs/design/clear-sky-theme.md`、`CHANGELOG.md`、本書。UI・文書・配備。データ契約・保存・検索・Functions・Rules・governance・ADR・移行・工程変更なし。既存別件差分を保持しcommit/pushなし。差戻しは今回のテンプレートとCSSを戻し、影響ゲート後Hosting再配備。

`npm run typecheck`、`npm run build`、`./scripts/check-governance.ps1`、`git diff --check`は各成功・exit0。buildの既存SPA警告と別件ファイルの改行警告のみ。全7gate選定のうちdomain（358成功2skip／exit0）、Rules（145成功／exit0）、Functions構文（exit0）、seed構文（exit0）は同日UI改善の成功を再利用。今回のテンプレート配置・CSS・文書は各gateの失効条件に該当せず、業務ロジック・保存・テスト・依存・環境を変更していない。

`npx firebase hosting:sites:list --project termite-warranty-dev --json`で対象一致・exit0。`npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive`で988ファイル公開・exit0。`node tmp/verify-portal-menu-hosting.mjs`でHTML＋JS/CSS30資産一致・exit0。公開index SHA-256：`4301cf24b26a5166f6016417b6a3739f7023eada2e674fd72f09380b32c20c54`。

Dev Chromeでアラートは修正前231.53px／flex:1 1 0%から、修正後41px／flex:0 0 autoへ。390px幅では文章の折返しに従い104px（client/scroll双方104）で切れなし。Bodyは通常画面855px、狭い画面844pxでそれぞれ画面高と一致。月次5項目・その他4項目、月次メニュー開閉による子項目の非表示、狭い画面で保険満了案内への遷移を確認。画面幅を復元、DB更新なし。画像：ignored `tmp/dev-alert-menu-2026-10-09.jpg`。利用者はDevを再読込する。

## 2026-10-09 一覧のBodyスクロール修正（Dev反映済み）

表の65vh固定と検索・操作欄の合計が画面高を超え、変更前の保証書一覧は画面911pxに対してページ1169pxだった。加えてVuetifyのhtml overflow-y:scrollがバーを常設していた。メインを100dvh（ヘッダー込み）に収め、表へ残り高さを割り当てた。表は最低128px、狭い画面・説明展開ではメイン内をスクロールして全操作へ到達する。htmlは業務画面の存在時のみauto。Bodyのoverflow:hiddenによる切捨てはしていない。

変更ファイル：`app/components/MeetingPrototype.vue`、`app/components/WarrantyCertificateManagement.vue`、`app/assets/clear-sky-theme.css`、`docs/design/clear-sky-theme.md`、`CHANGELOG.md`、本書。UI/CSS・文書・Dev配備に分類。既存仕様の配置不具合修正であり、業務仕様・データ契約・ADR・工程・進捗・governanceは変更しない。既存の別件差分を保持、commit/pushなし。差戻しはこの高さ・クラス・overflow変更を戻し、影響検証後Hosting再配備。

| コマンド | 結果／exit |
| --- | --- |
| `npm run typecheck` | 最終CSS変更後成功／0 |
| `npm run build` | 最終CSS変更後成功／0（既存SPA警告あり） |
| `./scripts/check-governance.ps1` | 成功／0 |
| `git diff --check` | 成功／0（既存別件ファイルの改行警告のみ） |
| `npx firebase hosting:sites:list --project termite-warranty-dev --json` | Devサイト一致／0 |
| `npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` | 最終988ファイル公開成功／0 |
| `node tmp/verify-portal-menu-hosting.mjs` | 最終HTML＋JS/CSS30資産一致／0 |

公開index SHA-256：`809145450bb69fb25ac637a9f9c79f2e8caff72d0b9db0f180c8ef1b67f56c53`。配備の全7gateを選定。直下の同日UI改善で記録済みの`npm test`（358成功・2skip／exit0）、`npm run test:rules`（145成功／exit0）、`node scripts/check-functions-syntax.mjs`（exit0）、`node --check scripts/seed-emulator.mjs`（exit0）は今回再実行せず、有効な成功証拠を再利用。変更はテンプレートのクラス・高さ属性、CSS、文書に限定され、検証方針JSONのそれぞれの失効条件（業務ロジック・保存・Rules・Functions・テスト・依存・実行環境）には該当しない。型とbuildは最終CSS変更後に再実行した。

Dev Chrome実画面：日常6一覧のBodyは画面高855px／ページ855px、Bodyバー常設も解消。保険報告の説明展開時もページ送り下端839pxで画面内。請求・保証書の複数ページ表示とページ切替を確認。最終最低高さ調整後、1366×768で保証書309期間（20行表示）のメインclient/scroll双方704px、Body768px、ページ送り下端735px。390×844ではBody844px、画面幅/client幅双方390px、メイン内を移動して次ページへ進み、ページ送り下端810.58pxで到達確認。画面サイズを復元。DB更新・CSV出力は行っていない。画像はignored `tmp/dev-list-height-2026-10-09.jpg`。利用者はDevを再読込して確認する。

## 2026-10-09 採用済み5案のUI改善（Dev反映済み）

オーナーが5案全採用と試作Chip撤去を指示。業務／管理の左メニュー、一覧操作配置、件数区分、コンパクトな表と固定見出し、業務状態を先にする詳細・物件情報開閉を実装。[確定した外観](design/clear-sky-theme.md#2026-10-09-採用済み一覧詳細ナビゲーション)。初期データ取込みはHS回答待ちを維持。

今回の実装変更は`app/components/MeetingPrototype.vue`、`WarrantyCertificateManagement.vue`、`WarrantyLifecycleDetails.vue`、`app/assets/clear-sky-theme.css`。試験は`test/property-warranty.test.mjs`の画面幅スタブ追加・メニュー制限とbusy時の操作拒否追加。仕様書、共通UI設計、CHANGELOG、本運用記録を整合。UI＋application-logic＋documentation＋deployに分類。既存の別件差分を保持し、commit／pushなし。データ形式、検索条件、Functions、Rules、IAM、governance変更なし。移行・ADR・工程変更・進捗加点なし。

| 検証コマンド | 最終結果／exit |
| --- | --- |
| `node --test test/property-warranty.test.mjs` | 58成功／0 |
| `node --test test/list-undo-ui.test.mjs` | 2成功／0 |
| `npm test` | 358成功・既存2skip／0 |
| `npm run typecheck` | 最終表示修正後成功／0 |
| `npm run build` | 最終表示修正後成功／0 |
| `npm run test:rules` | 145成功・Emulator停止確認／0 |
| `node scripts/check-functions-syntax.mjs` | 成功／0 |
| `node --check scripts/seed-emulator.mjs` | 成功／0 |
| `./scripts/check-governance.ps1` | 成功／0 |
| `git diff --check` | 成功／0 |
| `npx firebase hosting:sites:list --project termite-warranty-dev --json` | 接続先一致／0 |
| `npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` | 最終988ファイル公開成功／0 |
| `node tmp/verify-portal-menu-hosting.mjs` | 最終HTML＋JS/CSS30資産一致、Dev設定一致／0 |

最終公開index SHA-256：`8f3064d51873c35cc7b8a05dd9f78cff2ed13018b3011c9b4f12eca1b9c1ca95`。全7gate選定。最終仕上げのメニューrole・検索ボタン配置変更は型・buildを再実行し、業務処理・依存・保存・Rules・Functionsを変更しないため該当しないゲートの成功を検証方針に従い再利用。初回単体テストはuseDisplayのスタブ不足で25失敗・exit1。スタブ整備後の全体成功で解消し、失敗を成功扱いしない。ビルドの既存警告は残る。

Dev Chromeの実画面でChipなし、日常6業務と管理4項目、Enterキーで保険報告へ遷移、保証書の5期間抽出→1期間選択→選択中／更新対象1への連動、保証書詳細・保険詳細の情報順、物件情報の開閉を確認。保険カード上端141px、保証カード454pxで保険が先。表theadのstickyを確認。390×844で一時メニュー開閉・検索と操作ボタンの折返しを確認後、画面幅を元へ復元。最終版の保証書一覧画像はignored `tmp/dev-ui-polish-2026-10-09.jpg`。今回の画面確認ではDBを書き換えず、CSV実ファイル再照合・別権限アカウントでの実画面検証は未実施（権限制限は単体で確認）。差戻しは上記UI差分を戻して型・build等の影響ゲート後にHosting再配備。HSは再読込して変更後の操作感を確認できる。

## 2026-10-09 保険・保証書一覧からの取消（Dev確認済み）

保険報告用一覧と保証書CSV一覧から開く詳細に、直近報告取消／期間別発行済み取消を追加。物件／保証管理と請求一覧の既存導線を維持。実装は`app/components/MeetingPrototype.vue`、対象試験は`test/list-undo-ui.test.mjs`。仕様書、insurance-reporting、warranty-certificates、CHANGELOGを整合。分類はUI＋application-logic＋documentation＋deploy。DB形式・移行・Functions・Rules・権限・ADR・ロードマップの工程／加点は変更なし。既存の別件差分を保持し、commit／pushなし。

| コマンド | 結果／exit |
| --- | --- |
| `node --test test/list-undo-ui.test.mjs`（npm testとは別に実行） | 2成功／0。画面ごとの操作限定、HS・active・復旧閲覧制限 |
| `npm test` | 357成功・既存2skip／0 |
| `npm run typecheck` | 成功／0 |
| `npm run build` | 成功／0 |
| `npm run test:rules` | 145成功・Emulator停止確認／0 |
| `node scripts/check-functions-syntax.mjs` | 成功／0 |
| `node --check scripts/seed-emulator.mjs` | 成功／0 |
| `./scripts/check-governance.ps1` | 成功／0 |
| `git diff --check` | 成功／0 |
| `npx firebase hosting:sites:list --project termite-warranty-dev --json` | 実対象一致／0 |
| `npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` | 989ファイル公開成功／0 |
| `node tmp/verify-portal-menu-hosting.mjs` | 公開HTML＋JS/CSS31資産バイト一致、Dev接続先一致／0 |

全7gate省略なし。ソースSHA-256は`b4fca9bc4f5d8112c1ded1ba1bdaf8b99c3e23a2b454109786fd7d688f11c7de`、公開indexは`1f33e876faa9c1a0c23086be89f0e5ccc80bb000bfadb7400ce922d45aca0f75`。差戻しは追加した画面条件・説明と操作許可を戻し、同じ検証後にHostingを再配備する。取消済みの業務記録は自動的には戻さない。

Chromeの既存Dev管理者画面で実操作：架空「業務検証・保険更新」の一覧詳細→報告取消確認→実行→閉じて再取得し未報告・初回報告が必要を確認。架空「業務検証・満了案内」の保証書一覧詳細→延長1の発行済み取消→理由空欄を拒否→検証理由を入力して実行→一覧の当該期間が未発行へ更新されることを確認。テスト結果としてこの2状態を残す。請求済みは維持。画像はignored `tmp/dev-list-undo-2026-10-09.jpg`。過去実資料の取込み・初期化は引き続きHS回答待ち。今回、機能の既存サーバー処理は再配備せず、Functionsログの個別受信照合は行っていない。

## 2026-10-09 工務店担当者メニュー非表示（Dev確認済み）

オーナーの今回の明示指示で、初期導入に使わない上部「工務店担当者」タブだけを`app/components/MeetingPrototype.vue`から除外。将来用の機能・サーバー・権限・データは保持した。旧申請の本支店認可漏れは[PORTAL-SEC-01](roadmaps/technical-remediation.md#portal-sec-01-旧申請経路の本支店認可将来対応)に記録し、現在は改修しない。分類はdocumentation-only＋ui-css-layout＋build-release-deploy。スキーマ／移行・ADR・検証方針の変更なし、進捗加点なし。

| コマンド | 最終結果／exit |
| --- | --- |
| `./scripts/check-governance.ps1` | 成功／0 |
| `npm test` | 357成功・既存2skip／0 |
| `npm run typecheck` | 成功／0 |
| `npm run build` | 成功／0 |
| `npm run test:rules` | 145成功・Emulator停止確認／0 |
| `node scripts/check-functions-syntax.mjs` | 成功／0 |
| `node --check scripts/seed-emulator.mjs` | 成功／0 |
| `npx firebase hosting:sites:list --project termite-warranty-dev --json` | Dev site／接続先照合／0 |
| `npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` | Hosting989ファイル公開成功／0 |
| `node tmp/verify-portal-menu-hosting.mjs` | 公開HTML＋JS/CSS31資産のバイト一致・Firebase project一致／0 |

初回sandbox内の単体試験は一時ファイルrenameのEPERMで7失敗（exit1）、ログ採取の再実行も同じ失敗。通常権限で同じ試験を実行し上表の成功を確認した。Emulator初回はsandboxのhubポート起動待ちで失敗（exit1）、通常権限で同じ全体試験を再実行して成功。試験の省略や失敗の成功扱いはしていない。ビルドの既存警告は残るがexit0。画面操作確認の初回は前タスクのソース限定監査を理由に自動承認レビューが拒否したが、今回の明示承認範囲を示して再試行し許可された。

配備した画面ソースSHA-256は`f9389525cb4c80517500a9a196c9f3483ceb4d8f3549e7f8a04ed35e5e490917`、index.htmlは`fd064f460b53a7ce72359178a2c99cb75ddf855ab0a8951421398331df8553b9`。既存文書差分を保持した作業ツリーの成果物を配備し、Git commit／pushは行っていない。Functions・Rules・DBへの変更なし。公開資産検証は画面31資産であり、全郵便番号データやCloud IAMの再監査ではない。

Chromeの既存ログイン済み管理者画面で、配備前の工務店担当者タブ表示を確認後、配備後に再読込。タブ11→10、工務店担当者なし、HS担当者あり、通常物件一覧20件の表示を確認した。画面画像はignored `tmp/dev-portal-menu-hidden-2026-10-09.jpg`へ保存。利用者追加・データ書込みは行わず、過去物件取込みはHS回答待ちを維持。差戻しが必要ならタブを復元して同じ検証後にHostingへ再配備する。メニュー非表示は旧申請の認可不備を解消しない。

## 2026-10-09 過去物件の一括投入準備

資料442件を受領・点検。[初期化範囲・不足事項・再実行手順](runbooks/historical-property-intake.md)を使用する。旧「投入準備データ提供まで保留」は解消したが、実DBの初期化・初期取込みはまだ行っていない。既存増分CSV／旧初期化スクリプトを無条件に流用しない。旧バックアップの維持・復元互換性をDev試験の前提とした整理を訂正し、10月7日の停止・削除決定を維持する。Prod構築後の新しいバックアップ検証は別工程。

## 2026-10-09 請求・保証書の追加改修（Dev反映済み）

請求の保証グループ別・当月以前未請求抽出／一括請求済み、保証書のグループ別抽出・住所列・編集取消を6decdc5でDev反映。315件の業務値を保って新検索項目を補完し、全7Localgate・独立レビュー・正式配備照合10項目・Chrome実画面・Functionsログ11件を確認。導入・差戻し・検証の契約は[月別取得](design/monthly-queries.md)、[保証書](design/warranty-certificates.md)。過去データ受領後のHS試験運用は2日へ更新した[現行日程](../deliverables/production-schedule-2026-10-05/README.md)を使用する。

## 2026-10-09 Dev設定照合・保証書CSV着手

Devの実一覧4サービスアカウントの個別IAMと全21関数の実行主体、祖先組織なし、GitHub development保護なしを読取専用で確認。[設定仕様の追加照合](requirements/environment-configuration.md#2026-10-09-dev設定権限の追加照合)に確認値・未確認範囲・コマンド終了状態を反映。通知メールはCLI操作者メールと不一致だが、指定先との不一致と断定せず、本人照合／実受信は未確認。設定・権限変更や通知送信は行っていない。

保証書CSVは初回引渡月／延長保証開始月＋過去未発行、保証期間別状態で承認済み。仕様0.1.130へ反映し、8ea12dfの全7gate・独立レビュー・Dev Functions21／Hosting・315件検索投影補完・実画面検証・Functionsログ受信を完了。[導入と実績](design/warranty-certificates.md)。Dev照合は文書のみだった前回からruntime変更へ進んだため、全7gateとDev配備・実画面検証を完了条件とする。

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

クラスごとの具体的なゲートは、直下のJSON生成要約だけで管理する。配備は包括ゲートを選定し、[目的別・変更別の判断](#dev反映で確認する目的と範囲)と[証拠の有効性](#evidence-validity-and-retry)で今回実行／再利用を分ける。旧説明表の「unrelated gatesを省略可能」は、配備時の選定ゲートを外す意味ではない。

<!-- BEGIN GENERATED VERIFICATION POLICY SUMMARY -->
- Root: schemaVersion=1.0; comprehensiveGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]; unknownImpactGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]
- FocusedRegression: id=governance-tools; triggerPaths=[scripts/render-governance.ps1,scripts/check-governance.ps1,scripts/lib/governance-policy.ps1,test/governance-tools.test.mjs,governance/verification-policy.json]; command=node --test test/governance-tools.test.mjs; completionRequired=True
- RuntimeProfile: id=powershell; platform=windows; edition=PowerShell; executable=pwsh; versionRule=minimum-major=7; required=True; supportStatus=supported
- Class: id=documentation-only; triggers=[Markdown or documentation files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=ui-css-layout; triggers=[UI\, CSS\, or layout files]; iterationGateIds=[app-typecheck]; targetedRegressionGateIds=[app-typecheck]; completionGateIds=[app-typecheck,app-build]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=application-logic; triggers=[application source files\, functions\, or emulator seed logic]; iterationGateIds=[domain-test,app-typecheck]; targetedRegressionGateIds=[domain-test,app-typecheck,firestore-rules-test]; completionGateIds=[domain-test,app-typecheck,firestore-rules-test,functions-syntax,seed-syntax]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=data-contract-schema-migration; triggers=[Firestore rules\, indexes\, schema\, migration\, or data-contract files]; iterationGateIds=[governance-check,firestore-rules-test]; targetedRegressionGateIds=[governance-check,domain-test,firestore-rules-test]; completionGateIds=[governance-check,domain-test,firestore-rules-test]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=project-guidance-metadata; triggers=[descriptive project guidance and metadata\; owner-approved reference-target clarification only when capability\, approval/safety boundaries\, executable configuration\, and verification behavior are unchanged]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=governance-permissions-agents; triggers=[governance contract/tool/migration changes\, effective permissions or agent authority\, executable configuration\, or verification behavior\; excludes only the bounded owner-approved reference-target clarification in project-guidance-metadata]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=build-release-deploy; triggers=[build\, dependency\, release\, or deploy configuration]; iterationGateIds=[governance-check,app-typecheck]; targetedRegressionGateIds=[governance-check,domain-test,app-typecheck,app-build]; completionGateIds=[governance-check,domain-test,app-typecheck,app-build,firestore-rules-test,functions-syntax,seed-syntax]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Gate: id=governance-check; command=./scripts/check-governance.ps1; stages=[iteration,targeted,completion,release]; includes=[]; invalidatedBy=[any governance input\, policy\, configuration\, or managed artifact change]; evidenceDestination=task completion report
- Gate: id=domain-test; command=npm test; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[src/domain/**\, functions/local-runtime.js\, Functions domain/syntax/workflow contract helpers or tests\, scripts/test-rules*.mjs\, scripts/lib/test-emulator*.mjs\, scripts/lib/test-functions-*.mjs\, functions/test-emulator-profile.js\, scripts/lib/rules-test-*.mjs\, scripts/lib/focused-test-reporter.mjs\, src/config/local-emulator.mjs\, test/helpers/fixture-tasks.mjs\, test/rules-runner.test.mjs\, test/focused-emulator-test.test.mjs\, test/fixture-tasks.test.mjs\, .github/workflows/deploy-development.yml\, governance/verification-policy.json\, scripts/default-recovery.mjs\, scripts/lib/default-recovery*.mjs\, scripts/lib/recovery-controller.mjs\, operator tests\, package.json\, package-lock.json\, or the Node.js runtime changes]; evidenceDestination=task completion report
- Gate: id=app-typecheck; command=npm run typecheck; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[app/**\, nuxt.config.ts\, tsconfig.json\, package.json\, or package-lock.json changes]; evidenceDestination=task completion report
- Gate: id=app-build; command=npm run build; stages=[targeted,completion]; includes=[]; invalidatedBy=[application\, Nuxt\, dependency\, TypeScript\, or build configuration changes]; evidenceDestination=task completion report
- Gate: id=firestore-rules-test; command=npm run test:rules; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[firestore.rules\, firebase.json\, functions/**\, src/domain/**\, Functions domain preparation helpers\, scripts/test-rules*.mjs\, scripts/lib/test-emulator*.mjs\, scripts/lib/test-functions-*.mjs\, functions/test-emulator-profile.js\, scripts/lib/rules-test-*.mjs\, scripts/lib/focused-test-reporter.mjs\, src/config/local-emulator.mjs\, test/helpers/fixture-tasks.mjs\, test/emulator/**\, test/firestore*.test.mjs\, test/helpers/**\, data-contract\, emulator tests\, scripts/default-recovery.mjs\, scripts/lib/default-recovery*.mjs\, scripts/lib/recovery-controller.mjs\, app persistence\, dependency\, Node.js/Java/Firebase CLI runtime\, or emulator configuration changes]; evidenceDestination=task completion report
- Gate: id=functions-syntax; command=node scripts/check-functions-syntax.mjs; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[functions/**\, src/domain/**\, Functions domain preparation/check/discovery scripts\, scripts/check-functions-syntax.mjs\, or the Node.js runtime changes]; evidenceDestination=task completion report
- Gate: id=seed-syntax; command=node --check scripts/seed-emulator.mjs; stages=[iteration,targeted,completion]; includes=[]; invalidatedBy=[scripts/seed-emulator.mjs or the Node.js runtime changes]; evidenceDestination=task completion report
<!-- END GENERATED VERIFICATION POLICY SUMMARY -->

`focusedRegressions`は変更入力に応じた追加の回帰検証。`triggerPaths`のいずれかが変更された場合、`completionRequired`のコマンドも完了前に満たし、個別exitを記録する。入力が変わらない成功証拠は同じ再利用基準を使える。現在の`governance-tools`はローカル生成・検査ツール／補助処理・当該試験・検証方針の変更だけが対象で、参照先指定や説明文書だけの変更では選ばない。影響範囲が不明で対象入力の変更を除外できなければ追加回帰も未充足として扱う。これは全7ゲートや配備ゲートの代替ではない。

### Gate Catalog and Inclusion

The exact marker-bounded summary immediately above is the generated gate catalog. It preserves commands containing pipelines without parsing Markdown table separators. Do not maintain a second manual gate table.

The inclusion graph must be acyclic and may not reference an unknown gate. When a selected parent gate preserves an included child's named result and exit status and fails when the child fails, do not invoke that child again as an unconditional separate command. A diagnostic run never satisfies a completion gate.

### 検証の進め方

全体試験の入口は従来どおり `npm run test:rules`。共有DB・Auth・Rulesを扱う試験群は直列とし、専用DBのみを使う一括取込みの2試験だけを別プロセスで重ねる。分離した試験は `(default)` など共有DBの取得とAuth操作を拒否する。準備・後始末の独立処理は最大4件ずつ実行し、失敗時も開始済み処理の終了を待つ。業務操作、競合試験、判定条件は並べ替えたり省略したりしない。

実行対象は `scripts/lib/rules-test-plan.mjs` で割り当て、`test/emulator/*.test.mjs` と `test/firestore*.test.mjs` の実ファイル一覧との欠落・重複を起動前に拒否する。両プロセスのexit 0、全対象ファイルでの実試験成功、skip・失敗・対象外実行なしを確認してから全体成功とする。片方の失敗でも他方の終了を待ってEmulatorを終了し、ポート解放を確認する。起動とFunctions生成同期は1回で、稼働中Emulatorへの接続を拒否し、一時CLI設定だけを使う。切り分け用の `npm run test:rules -- --serial` は同じ試験群を直列で実行し、自動再試行や失敗の成功扱いはしない。

以下は[共通契約の段階検証](../governance/common-governance.md#verification-selection-and-staging)を日常作業へ適用する手順。ゲートの選定・失効条件は上記の生成要約と[検証方針JSON](../governance/verification-policy.json)を正とし、必須検証や配備時の全体検証を減らすものではない。

1. 実際の変更面から該当クラスの和集合を選ぶ。ゲートの選定と新たなコマンド実行は別の判断とし、選定した各ゲートを下記の基準で「今回実行」「有効証拠再利用」「未充足」に分ける。小変更という理由だけで選定ゲートを外さない。
2. 反復中は変更箇所の試験を先に実行する。保存・Callable・復旧整合を触る場合は、追加試験だけでなく変更した入口を呼ぶ既存試験の準備も差分で確認する。検索項目・準備印の版／世代・設定／日付・認証条件を正常系の架空データが満たすか、欠落を意図する異常系かを区別する。従来の代替処理に依存した正常系は準備を直し、拒否すべきケースを通すため実装の制限を緩めない。既存の安全な単独実行経路を確認して使い、なければ経路未整備として影響範囲の既存検証を使う。単体試験だけで結合試験の準備を確認済みにせず、起動前には[Localと自動試験の利用調整](#localと自動試験の利用調整)を適用する。
3. 対象試験の通過後、影響範囲の回帰検証と最終差分の完了ゲートを満たす。有効証拠が残るゲートは再実行せず、不足・失効したゲートだけを実行する。対象試験は全体ゲートの代替ではない。失敗後は原因を直し、失敗ゲートとその修正で失効したゲートへ戻る。
4. 実行中は実行ツールの完了通知・状態を使い、通常は結果要約を確認する。詳細ログは失敗・停滞・判断に必要な差分がある場合に読む。ログ末尾の成功表示だけで完了とせず、各コマンドの終了コードを確認する。

対象試験の入口は `npm run test:rules:focused -- excel-dates`。現時点の許可対象はExcel日付の保存・受領値保持・全件棄却の結合試験1件で、自由なファイル名／試験名は受け付けない。満了案内用の対象実行は未実装。runnerは試験専用ポートの未使用を確認し、試験ごとのFunctions生成後に再確認して別demoのEmulatorを新規起動する。常用Localのポート・生成物は使用しない。利用統計を無効にした一時CLI設定を使い、終了時に削除する。ユーザーのFirebase設定は変更しない。稼働中Localや既存Emulatorへの接続・停止、データのimport/exportは行わない。ポート使用中・設定不一致は作業者へ報告し、既存プロセスを終了させて通さない。

子試験のexitに加え、対象ファイル・完全一致の試験名・成功1件・対象skipなし・当該実行の結果であること、Emulator終了後のポート解放を検査する。対象0件や異常終了は失敗。除外された他試験のskipは通常の絞込みとして区別する。この結果は反復中の証拠で、選定された全体の `npm run test:rules` を代替しない。対象追加時は独立した準備・後始末を確認し、兄弟試験に依存する場合は既存のファイル単位／全体検証へ戻す。

Dev配備の正式照合では、失敗時の `diagnostic.stage`／`reasonCode`、HTTP失敗時の数値 `httpStatus` を確認する。設定のオブジェクトキー順だけは同値として扱うが、項目・値・型・配列順の差、来歴・hash不一致、途中の版変更は引き続き拒否する。未知例外はunknown／blockedのまま。生の例外文・URL・設定値・認証情報は診断へ出さず、blockedを自動再試行して成功扱いにしない。今回の診断追加だけでは過去のHosting初回失敗の原因は確定しない。

### Localと自動試験の利用調整

2026-10-13のオーナー承認により、常用Localと自動試験を用途別に分離する。試験プロファイルの正本は [test-emulator-profile.js](../functions/test-emulator-profile.js)。同一プロジェクト内でも、同時利用する用途へ同じポートを割り当てない。ゲートの選定・証拠再利用方針は維持する。

| 用途 | 現在の資源と担当範囲 | 実行前の判断 |
| --- | --- | --- |
| 常用Local・画面受入れ | `firebase.json` と `LOCAL_RUNTIME`、demo-termite-warranty。起動した担当が利用・終了状態を共有 | [Local試験データの恒常承認](../governance/project-rules.md#local受入れ用データの恒常承認)に従い、必要な物件・Auth・検索項目・準備情報を都度確認なしで整備する。準備印だけの偽装や他担当との競合を避け、準備操作と受入結果を区別して報告 |
| 自動結合試験（全体／focused） | demo-termite-warranty-testと専用ポート、一回限りのFunctions／domain・Firebase設定・CLI設定・ログ。PMが実行担当を一つに集約 | 常用Localと並存可能。試験同士はactive.lockで排他し、同じ差分の全体試験を重ねない。runnerが起動したプロセスの終了を確認して所有領域を片付ける |
| runner内部の並列試験 | `rules-test-plan.mjs` に登録された共有／専用DBの分担 | これは一つのEmulator内の試験分担。常用Localとのポート分離や、複数runnerの同時起動許可とは異なる |

PMは検証範囲を選ぶ時点で、既存の作業報告に「実行担当・使用環境／起動経路・必要ゲートの実行または再利用・競合時に残す未充足」を短くまとめる。専用の長期台帳は作らない。現在の待受とプロセスの所有・起動元を読取りで確認し、次で判断する。runner自身の起動直前チェックは競合の再発を検知するため維持する。

- **同一プロジェクトの常用Localが使用中**：自動試験は専用プロファイルで実行し、常用Localを停止・退避・復元しない。テストから常用Localの接続先へ変更して通さない。Localの受入れデータ整備は恒常承認の範囲で別途行えるが、自動試験のために常用Localへデータを投入しない。
- **別担当の自動試験が使用中**：その実行を重ねず、終了結果と最終差分への証拠の有効性を確認する。完了通知・状態を使い、同じ成功検査を別担当が再実行しない。
- **他プロジェクトまたは所有不明**：当該プロセスを停止・接続せず、競合した資源と所有確認の不足を報告する。空き番号への場当たり的変更で実行先ガードを外さない。所有が判明しても今回の停止権限とは別に扱う。

2026-10-13の根拠：PM（白蟻）-10の実装ターン `01a132bc-ac93-7062-ac55-1f89ea6c78d6` と[実行記録](#2026-10-13-満了案内の欠落非救済開始時条件local検証済み)では、初回は常用Localのポート競合で試験開始前に終了。その後、既存2試験が新しい準備条件を満たさず失敗し、fixture修正後に193件成功した。前者は環境準備の未充足、後者は試験前提の適用漏れであり、同じ原因ではない。focused入口はExcel日付だけのため、満了案内を既存の対象実行で先に試せたとは判断しない。業務ロジック変更への結合試験選定と、失敗後の当該ゲート再実行は必要だった。後続の[画面受入れ記録](#2026-10-13-満了案内のlocal実画面受入れ確認制限あり)でも常用Localの保険準備印が不足しており、復元成功・自動試験成功と正常系の受入れ準備完了を区別する。

自動試験の固定割当はAuth 39099、Firestore 38080、Functions 35001、Hub 34400、Logging 34500、UI予約34000（UIは無効）、websocket 39150、Eventarc 39299、Tasks 39499。常用Localは従前の割当を維持する。二つのdemoプロジェクトは別プロセスであり、同名DBでもデータを共有しない。テストhelperとFunctionsのガードは試験用project・全接続先・実行IDを照合し、実環境や常用Localへの誤接続を拒否する。

runnerは主repo配下のignored tmp/emulator-runsに所有印付きの一時実行領域を作り、Functionsソースとsrc/domainから実行用成果物を生成する。これは試験成果物であり、別Git作業ツリーや編集用repoコピーではない。直接importする結合試験も同じ試験用Functionsを使用する。常用Localのfunctions/domain、firebase.json、ログ、Auth／Firestoreを変更しない。試験終了後に専用ポート解放と所有印を確認して一時領域・ロックを除去する。終了不明・ポート残存時は領域とロックを保持し失敗にする。残存ロックを自動削除したり所有外プロセスを停止したりせず、所有者と実行状態を確認して復旧する。診断を残す必要がある実行はコマンド出力をignoredログへ保存する。

分離の受入条件は、常用Local稼働中に同じ試験群が成功し、常用Localのプロセス・データ・共有生成物を保ち、競合・失敗時にも所有外資源へ影響しないこと。実測結果は日付付きの本運用記録に残す。満了案内のfocused追加は別の候補で、独立したfixture・対象件数・結果照合を実装してから使う。

### Dev反映で確認する目的と範囲

2026-10-12のオーナー指示による、既存の範囲限定・証拠再利用方針の運用整理。クラス／ゲートIDと失効条件は[検証方針JSON](../governance/verification-policy.json)、証拠の扱いは下記を正とする。共通契約・JSON・生成要約は変更しない。配備では包括7ゲートを選定するが、全コマンドの新規実行を意味しない。一方、復旧・移行の個別手順や現行CLI内部の必須検査を、この説明だけで飛ばさない。現在できる限定と、ツール改修後に可能になる限定を分ける。

PMの実行前判断は既存の作業記録に「実差分／生成物・配備先 → 今回実行／再利用する証拠と不変の根拠／非対象と理由／不足情報・未充足」を短くまとめる。別の台帳や一律の追加チェックリストは作らない。ファイル名や「文言変更」という依頼名だけで判定せず、イベント・条件式・依存・生成されたFunctionsソース・配信設定・未コミット差分も確認する。不明点はまずその入力・対象・前回証拠を読む。それでも影響を限定できなければ包括ゲートを選び、必要な調査が終わるまで外部操作へ進まない。

| 確認目的 | 今回実施する条件と確認対象 | 再利用・非対象の条件／失効条件 |
| --- | --- | --- |
| 機能・回帰 | 実差分と依存先の動作・境界・権限を確認。UI変更なら当該表示と操作条件、保存変更なら保存・競合・復元互換を対象にする | コード・生成物・試験／fixture・runner・依存・関係設定・ランタイムが証拠取得後に不変なら成功証拠を再利用。影響しない試験を失敗対応で巻き戻さない。変更に依存する試験はJSONの列挙外でも再取得 |
| 配備成果物の同一性 | 実際に公開する成果物が、レビュー・検証した版かを照合。Hostingはsite／live版・全path/hash・配信設定、Functions変更ならsource／revision／traffic等 | 旧版の照合で新公開版を証明しない。固定成果物の証拠には入力・生成環境・出力hash・来歴が必要。現行CLIは同一プロセスのfresh-build証拠を要求し、過去のbuild成功を渡して省略する経路はない |
| 環境設定 | 対象project／DB／site、接続先、変更した設定と新機能に必要な索引・Rulesを確認。LocalとDevの差を明記 | ローカル設定不変だけではクラウド不変を証明できない。変更しない領域の詳細証拠は、現在の版・設定識別子・世代と整合し、失効していない範囲で再利用候補。現行preflight内の一括照合は下記の制約を維持 |
| データ保全 | 今回の操作にデータ書込み・採番・復元・稼働停止の経路がある場合、影響対象と保持対象を操作前後で照合 | Hostingの文字だけの変更で、更新コード・設定・配備対象・検証操作にもデータ変更経路がないと確認できれば、別途の全業務／Auth走査・退避復帰を常例にしない。不明な書込み、事故、移行、保守状態変更では影響範囲を再評価。過去のhashで現在の可変データの不変を主張しない |
| データ移行 | 保存・検索投影・索引の互換変更に応じ、旧処理の収束、対象調査、限定補完、再実行・部分失敗・保持値・準備印を確認 | 移行のない変更では非対象。既存補完の完了証拠は対象集合・投影版・更新処理・準備印等が有効な場合だけ使う。旧writerの再稼働、復元、移行仕様変更、競合・未完了があれば再調査。必要な実データ照合をLocalの成功で代用しない |

| 実差分のケース | 必須の判断・今回確認 | 非対象・再利用と拡大条件 |
| --- | --- | --- |
| 表示・文言のみ | UIの型／生成と当該表示・操作条件、文書整合。Dev反映時は包括ゲートを選定し、公開成果物・対象環境を確認 | 不変のdomain／Rules／Functions・seed構文の成功証拠は再利用。移行・採番実操作・全業務像照合は変更経路がなければ非対象。イベント・取得条件・生成ソース・設定・依存が変われば該当クラスを追加 |
| 業務ロジック・Functions・Rules | 変更した処理と依存先の回帰・認証／権限・保存整合、該当構文、実配備された版と設定。Dev固有の接続／動作はLocalと差がある部分を確認 | 無関係なUI・seed等は有効証拠を再利用。Functions配備だけを理由にデータ移行を追加しない。保存互換・索引・既存writerへ影響すれば次行を併用 |
| 索引・保存形式・既存データ移行 | 上記に加え、承認済み設計の索引READY、旧writer収束、補完・保持値の前後比較、再実行・差戻し・公開順序を満たす | 不変の検査証拠だけ再利用。追加投影を変更するのに全業務hashの完全不変を要求せず、許可した追加項目と正確な対象以外の不変を検査。旧版復帰・データ再投入・競合で移行証拠を再評価 |
| 影響不明 | 差分、依存、生成元、配備対象、実行環境・証拠不足を先に特定。解決後は上の該当範囲へ分類 | 調査後も不明ならJSONの包括fallback。包括試験は対象不明の配備や無承認のデータ操作の許可にはならない |

Localでの機能成功とDev固有の確認を混同しない。配備されたバイト列、接続先、実索引のREADY、実データの追加投影・旧writer収束はLocalでは証明できない。一方、その差に関係しない業務シナリオをDevの実データ更新で再演する必要はない。確認のために実番号を消費せず、[検証データ保全規則](../governance/project-rules.md#検証データ採番変更を実運用へ残さない)を適用する。

#### 現行ツールの制約と別途改修候補

- **正式照合の範囲選択は未実装**：[preflight](../scripts/lib/default-recovery-preflight.mjs)はDB／marker／ロック／2種Rules／索引を照合し、[releaseProof](../scripts/lib/default-recovery-release-proof.mjs)はFunctionsとHostingの両方を実行する。Hostingだけの正式経路や、子結果を次の呼出しへ安全に引き継ぐ機能はない。HostingのfileCount反映待ちだけでも再呼出しは広く走る。改修までは必須内部検査を削らず、その再実行をツール制約として記録する。正式preflightと、別コマンドの全業務像走査は区別する。
- **ビルド証拠の受渡しは未実装**：[build helper](../scripts/lib/default-recovery-build.mjs)は入力・環境と出力hashを照合するが、証拠はプロセス内WeakMapのみ。[CLI](../scripts/default-recovery.mjs)の正式照合は再度generateする。通常build、公開用build、preflightのbuildを安全に一本化するには、改ざん・古い入力・異なる環境／revisionを拒否する成果物受渡しとゲート包含の検証が必要。現行JSONのincludesは空であり、見かけ上同じgenerateを呼ぶだけでapp-buildを充足したと扱わない。
- **自動試験と常用Localの分離**：用途別ポート・別demoプロジェクト・実行用Functions／設定を分離した。[利用調整と実装の境界](#localと自動試験の利用調整)を参照。同じ自動試験プロファイル同士や第三者との競合拒否は維持する。
- GitHubの[配備workflow](../.github/workflows/deploy-development.yml)も7検査を固定実行し、手動起動時はFirestore／Functions／Hostingを一括配備する。[TR-003](design/tr-003-verification-deploy-gates.md)が固定ゲートと成果物引渡しを契約化しているため、ローカルの再利用説明でCIを迂回しない。今回の直近手動配備の遅さをCI実行のせいにはしない。CIの範囲選択は契約・検査器を含む別件。

#### 2026-10-12の実例への適用

- **保険報告ボタン文言**：上の同日記録とGitの対象差分（6cdbd8b…）は表示文字のみ。型・build・文書・該当UI確認を実施し、domain／Rules／Functions・seed構文の4ゲートを再利用しており、既存方針は機能していた。Hosting公開の同一性確認は必要。Functions21／索引19等の再照合とpreflight内再buildは現行ツールの固定範囲。別途実施した全業務777文書等の前後走査はpreflightの一部ではなく、文字変更からは必要性が導けない。データ変更経路がないことを確認して非対象とする。短縮時間は未実測。
- **月別3一覧の検索**：同日記録とGitの対象差分（19adab6…）は画面だけでなくFunctions・索引・domain・移行・復元互換・試験を含む。[導入設計](design/monthly-queries.md#保存互換性差戻し)の索引READY、新Functions、旧writer最大300秒の収束、442件の追加2項目補完と保持値照合、Hosting公開は固有の必要工程。待機を一律削除しない。失敗したfixtureの1行修正後、Rulesだけ再取得し他の成功証拠を再利用した判断は妥当。常用Localの退避復帰はこの移行の本質的要件ではなく試験環境の競合から派生。画面操作・実CSV確認の未実施は、自動試験や70条件の実検索照合では埋まらない。

### Evidence Validity and Retry

- 成功・件数は実行終了とexit 0を確認してから記録する。コマンドがexit 0でも個別判定がblocked／failedなら通過扱いにしない。
- 再利用には、コマンド・引数、結果と独立して確認したexit 0、対象revisionまたは識別できる作業差分、関連する実行環境・設定・入力が必要。HEADの一致だけでは足りず、未コミット・未追跡・生成物・他担当の変更も含め、証拠取得後の変更をゲートの`invalidatedBy`と実際の依存関係へ照合する。runner・reporter・fixture・試験・生成処理・依存・ランタイムの影響は、JSONにパスが列挙されていなくても確認する。範囲や環境が不明なら、そのゲートは再利用しない。
- 証拠の探索は直近の正本の検証記録と、そこから特定できる実行記録に絞る。コマンドごとの終了コード・対象差分・以後の変更を復元できなければ、履歴を際限なく遡らず、不足するゲートを実行する。後発の失敗・blocked・結果不明を古い成功で上書きしない。
- 完了報告には選定した全ゲートについて「今回実行（コマンド・結果・exit）」「有効証拠再利用（元の記録・結果・exitと失効していない根拠）」「未充足（不足・失敗・実行不可の理由）」を残す。再利用はゲートの省略ではない。未充足が残れば完了としない。
- 後続変更で失効した証拠と失敗ゲートを再取得し、影響しない成功証拠は再利用する。例えば文書のみの追記はアプリ検証の失効条件に該当しなければ再実行を要しないが、文書用の最終governance-checkは確認する。テスト・生成物・依存・設定の変更は文書だけの変更として扱わない。
- 現行のゲート包含関係は生成要約の`includes`で確認する。似たコマンドや内部で同じ処理を呼ぶという理由だけで、別ゲートを満たしたとは扱わない。再利用・非選択の理由は記録し、既知の失敗を避けるためには省略しない。
- scaffold作成・governance移行・ローカル契約／検査ツール・実効権限／agent-policy変更・release/deployの全体検証は維持する。承認済みの参照先明確化だけで、能力・承認／安全境界・実行設定・検証動作が不変なら`project-guidance-metadata`とし、過去のアプリ試験証拠がなくても文書ゲートだけを選ぶ。未承認事項は確定へ昇格させず、混合変更は和集合、不明な影響は全体検証へ戻す。

### 2026-10-10 検証運用改善の反映範囲

オーナー採用の3段階のうち、第一段階の選定ゲートと新規実行の分離・証拠再利用手順、および第二段階の[公開Web参照の承認範囲](../governance/project-rules.md#公開web参照の承認範囲)を反映。検証結果の詳細はGOVERNANCE-MANAGER（タスク `01a1015f-0477-7ad3-8b3c-ef77242b4dcf`）の本改修完了報告に記録する。

同日の追加指示「一度作成したガバナンスはプロジェクト側で自由に改変してよい」により、[プロジェクト所有方針](decisions/0042-project-owned-governance.md)へ変更。スキル更新・同期は不要。第三段階は、条件を満たす承認済み参照先明確化を`project-guidance-metadata`へ分類し、runner・reporter・fixture等の失効条件をJSONへ明記する変更。生成物はローカルrendererの`-Apply`で更新する。今回の導入自体は契約・検査ツール・検証方針の変更なので全7ゲートを選び、有効証拠再利用と失効分の再実行で検証する。詳細結果は本タスク報告へ記録する。

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
