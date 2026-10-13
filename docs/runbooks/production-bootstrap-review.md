# Prod環境の初期構築・権限引渡し手順

## 初回公開後の状態と読取り再照合（2026-10-13）

オーナーがmain `1564f07427b63a2d73776542eb28341d166c9d7a` の保守HTML、3変数登録、run `38381393703` 全体の再実行、照合後enable解除を承認。attempt 2は公開まで成功したが直後の照合は失敗し、enableをfalseへ戻した。再配備・削除・IAM変更は行わない。GETでは保守版 `sites/termite-warranty-prod/versions/a377bd20176a2ac5` と期待内容が一致し、既存CLI認証で同じ照合関数も成功。初回CI失敗の原因は未確定。

同じ配備SA／WIFで再公開せず確認する `.github/workflows/inspect-production-bootstrap.yml` を[PR #7](https://github.com/shisyamo4131/termite-warranty/pull/7)で追加。main・production・手動起動だけを許可し、既存の照合関数を実行する。受入条件・hash・公開物は変更しない。必須CI成功後main `21f41565fee5ea25396e924f7e0cd5d1770f3c30` へ統合し、[run 38383742806](https://github.com/shisyamo4131/termite-warranty/actions/runs/38383742806)で同じ基準版の読取り照合が全step成功。enable falseを再確認した。最初のCI失敗原因は未確定のまま残す。公開版のsource SHAは1564f074のまま。新main pushでもenable falseと承認SHA不一致で公開を拒否する。

残工数は11〜17時間の暫定推定へ更新。初回保守公開2〜3時間を外し、初回CI照合失敗の原因・再照合手順確認1〜2時間を追加。日付は変更せず、22日までの残認証・統合・入力成立を23日構築の条件とする。PDFも公開済み／原因未確定を分けて更新。業務利用開始、通常アプリ配備、運用IAM、バックアップ／PITRは未実施。

## 初回保守公開の限定統合（2026-10-13）

継続指示に基づき、[PR #6](https://github.com/shisyamo4131/termite-warranty/pull/6)を準備。基準main `b0cbf676e43f09a4cf9f20eb5cc4195d1e681ba2`、最終候補 `3e67ffdc1cea94b727749811d2c9dcc907a96160`。13ファイル限定：公開workflow、10スクリプト、専用試験、既存Dev workflowへの試験step追加だけ。既存アプリ／Dev配備条件／IAMを変更しない。必須CI成功後、継続指示の範囲でmain `1564f07427b63a2d73776542eb28341d166c9d7a` へ統合済み。統合直前にrepository／production変数が未設定であることを再確認し、実公開は別承認のまま。main run `38381393703` はverify成功・publish skip。取得した生成物3ファイルはレビュー版と全byte一致。公開承認候補はこのmain SHAとrunである。

`.github/workflows/deploy-production-bootstrap.yml` を実行用正本とし、templateは設計参照として保持する。main push時に包括7ゲートと専用9試験を実施し、同SHAの保守HTMLをartifact化する。artifact名はSHAと実行回次を含み、再実行時も同一attemptの成果物だけを渡す。公開jobは `PRODUCTION_BOOTSTRAP_ENABLED=true` と `PRODUCTION_BOOTSTRAP_REVISION=github.sha` の両方が必要。入口CLIも承認revision不一致を拒否する。ダウンロード後、認証前にHTML全byte・ルート3項目／公開1ファイル・配信設定・期待hash・siteを照合。余分なファイル、symlink、改変、別siteは停止する。短期ADCはcleanupを明示し、排他と空live確認を維持する。

公開承認時に、対象main commitとそのpush run、repository変数として登録する9項目の `PRODUCTION_TARGET_JSON`、承認revision、enableを具体的に提示する。設定前にmain SHA・既存変数・live状態を再確認。無関係な次pushを待たず承認済みSHAのrunだけを対象とする。[GitHub公式手順](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs?tool=cli)に基づくrun再実行では元のSHA／refを維持する。workflow全体を再実行し、検証・生成・公開を同じattempt内で行う。publish job単独の再実行は新attemptに対応するartifactがないため行わない。変数の再評価とpublish条件成立は実行時に確認し、不成立時に別SHAへ切り替えない。承認なしで変数を登録／変更しない。公開後は照合結果のprovider versionと公開HTMLを確認し、enable解除を同じ承認範囲として提示する。結果不明なら再配備せず読取り調査して停止する。

事前GETでProd Web構成のproject／app／sender一致と照合対象6項目の存在を確認。キーや本文は保存／出力しない。既存 `roles/firebasehosting.admin` に `firebase.clients.get` があることも定義で確認。実公開後の予約ファイル・配信結果は未確認で、管理APIの成功を代用しない。今回もバックアップ／PITR・運用SA・通常アプリ配備は対象外。

## SDK・CLI確認と公開workflowの統合準備（2026-10-13）

実REST認証に続き、`google-github-actions/auth` が生成する明示WIF ADCを既存 `operator-credentials.mjs`／Google認証ライブラリとFirebase CLIで使用する、配備なしの手動専用workflowを準備した。[PR #5](https://github.com/shisyamo4131/termite-warranty/pull/5) はmain `e5b9cb1605bba18deecdde534730186ed94925a1` に対する5ファイル限定、候補commit `315360738bb2419848e4cbe53ffdfc3e6ee7983c`。オーナーは必須CI成功後の通常mergeと読取り試験を承認した。公開・IAM変更・DB書込みは対象外。

固定site／Web app／標準URLの一致、live公開版なしをSDK経由のGETで確認し、同じ短期ADCで `hosting:sites:list` を実行する。main・production・手動イベントと既存repository不変IDの制限を維持する。資格情報とCLI本文はログ／artifactへ出さず、失敗時は工程名だけを報告。長期token／Emulator／ADC未指定を拒否する。専用4試験と通常試験462成功・2skipに加え、承認後の実run `38379568530` がSDK／CLI読取り・空live一致・ADC後処理をすべて成功。main mergeは `b0cbf676e43f09a4cf9f20eb5cc4195d1e681ba2`。これは期限切れ更新・運用SA・公開後照合の実証ではない。

公開workflowは引き続き未設置・enable未設定。mainに対する静的importの依存閉包は以下11スクリプト。`scripts/functions-domain.mjs` は既存mainと同一、`scripts/lib/operator-credentials.mjs` はPR #5で先行追加し、残り9ファイルとworkflow・必要な専用回帰試験を別の限定統合候補とする。これは最小変更数の確定ではなく、実行時依存の棚卸しである。通常アプリ全差分の統合は前提にしない。

- 入口：`scripts/prepare-production-bootstrap.mjs`、`scripts/inspect-production-bootstrap.mjs`、`scripts/check-production-deployment.mjs`
- 直接helper：`scripts/lib/production-bootstrap-hosting.mjs`、`scripts/lib/production-deployment-plan.mjs`、`scripts/lib/operator-credentials.mjs`
- 推移依存：`scripts/lib/default-recovery-release-proof.mjs`、`scripts/lib/default-recovery-build.mjs`、`scripts/lib/default-recovery-provider-init.mjs`、`scripts/lib/default-recovery-diagnostics.mjs`、`scripts/functions-domain.mjs`

公開用templateを設置する前に、この限定treeで生成・空site拒否／公開済み拒否・公開後照合・全7ゲートを検証する。復旧helperのimportはFunctions配備の許可ではない。公開enableと対象commitの承認、実公開後の照合が揃うまで初回保守公開は未完了。SDK／CLI読取りは実証できたが公開用限定treeと通常アプリ統合・運用権限の所要が未計測のため、残工数12〜18時間を保守的に据え置き、23日構築・月末納品の条件と既存PDFの日付は変更しない。

## 公開準備・統合レビュー・運用権限案（2026-10-13）

本節は準備・レビュー結果と未承認案。公開、main統合、GitHub変数設定、IAM付与、DB／Auth操作は今回実施しない。実行前の本人確認を維持する。[レビュー用成果物](../../deliverables/production-bootstrap-2026-10-13/README.md)に静的HTML・配信設定・期待hash・検証済みtargetを保存した。

### 初回保守公開の具体手順

1. 対象は `termite-warranty-prod`／同名Hosting site、表示は「準備中／現在は業務利用できません。」だけ。管理API GETでlive channelはHTTP 200・releaseなしを確認。公開前に再取得し、既存release／target変更／別配備があれば停止する。
2. 既存 `production-bootstrap.workflow.yml.template` は非稼働であり、`.github/workflows` 未設置。本人承認を得てレビュー済みソースと設置先をmainへPR統合する。通常アプリのenableはfalse相当のまま。保守公開のenableは対象commitを明示して別途了承を得る。push起動のため、単にenableして次の不特定pushを待つ運用にしない。
3. 包括7ゲート成功後に同SHAのHTMLを生成し、artifactを受け渡す。検証済みtargetからsiteを束縛し、`google-github-actions/auth@v3`→明示WIF ADC→空site検査を実行する。前回のREST probe成功だけではこのライブラリ／CLI経路の成功を保証しない。ここが失敗したら公開せず診断する。
4. 承認済みの同一対象へ `firebase deploy --non-interactive --project termite-warranty-prod --config bootstrap-artifact/firebase.json --only hosting` のみ実行。Functions／Rules／DB／Auth操作を含めない。既存配備SAのHosting権限を使用し、新規role追加を前提にしない。
5. 再認証後 `inspect-production-bootstrap.mjs` でlive版・3ファイル・hash・配信設定・Web構成を照合。公開HTMLの取得／表示も確認し、provider versionを次のアプリ配備入力へ記録する。初回公開前なので公開後照合は未実施。
6. 旧公開版がないため自動rollback先もない。結果不明ならlive状態を照会し、無条件の再配備／Hosting停止／削除をしない。停止・差替えが必要なら具体操作を別確認する。通常アプリの初回配備時は、この保守版が戻し先になる。

### 通常アプリの統合レビュー

基準：主checkout HEAD `55ff33b57a490a0da6ad2cf38db94c858a722cea`、取得済みorigin/main `e5b9cb1605bba18deecdde534730186ed94925a1`。差分542ファイル・39,089追加・2,968削除。app 76、src 44、functions 19、scripts 76、test 73、docs 178等。単なるProd設定追加ではなく、既存のDev導入済み機能・データ契約・運用手順を含む。

`git merge-tree --write-tree --no-messages HEAD origin/main` はexit 0、tree `691ad5f3bf21c829c6c07fae58a70cfd1ce8e1d6`。そのtreeとHEADのdiffは空で、既存認証修正は保持される。ブランチ／index／作業ツリーのマージは未実行。競合なしは全業務差分の受入れ完了ではない。

| 確認対象 | レビュー結果と統合条件 |
| --- | --- |
| Dev回帰・CI | PR必須check名を保持。Dev切替変数未設定ではmain pushは配備しない。main手動の旧Dev経路は残るため切替時に明示管理。144組の条件試験を含むfocused回帰成功 |
| Prod通常CI | enable未設定ならverify／deployともskip。artifact digestとSHAを束縛し、同一bundleを配備／照合。main統合と配備有効化を分ける |
| 初回配備前提 | 保守版provider version、2DB、Web app／site一致を要求。新規環境用パラメータ・運用認証・管理者入力は別確認。初回バックアップ延期中はautomation=falseで準備し、提供前に別承認で有効化 |
| Functions主体 | `setGlobalOptions` はregionのみで専用serviceAccountを固定していない。既定主体へ無条件に権限を渡さない。実行SA・build SA・サービスエージェントを区別し、実値と必要操作を確認してから配備許可 |
| データ／復旧 | 空領域初期化・管理者紐付けはRules照合と閉鎖状態を要求。旧Dev専用変換／実Auth importをProdへ転用しない。正式投入後の設定順を維持 |
| レビュー範囲 | 起動条件・認証境界・成果物・初回構築順・統合競合を確認。542ファイル全行の再レビュー、main統合候補の包括CI、HS業務受入れは未完了。既存Dev受入証拠を関連差分へ対応付け、残るProd差分を重点確認してPR判定する |

### 運用権限案（付与していない）

運用SA `prod-operator@termite-warranty-prod.iam.gserviceaccount.com` のSA bindingは空を再確認。配備SAからの流用はしない。専用pool `github-production-operations`／provider `github`、GitHub environment `production-operations` は**提案名・未作成**。同じrepository／owner不変ID、main、workflow_dispatch、immutable subjectの当該environment、`workflow_ref`の専用運用workflowに条件を限定する案。配備poolを再利用すると同poolのrepository属性bindingを介した相互接続を招くため、poolとSA bindingを分離する。workflowの内容・入力検査・本人承認の記録方法を確定してから作成する。

| 段階／主体 | 具体的な権限候補と対象 | 制限・残確認 |
| --- | --- | --- |
| 運用の読取先行 | project metadata `firebase.projects.get`／`resourcemanager.projects.get`、2DBのmetadataとentities.get/list、Rules releases.get／rulesets.get、`firebaseauth.users.get`、API利用 | 初回はread-only probeだけ。実Authの本文は出力せず件数・一致判定のみ。カスタムrole適用可否と最小権限は作成前に確認 |
| 初期化・管理者・投入 | `roles/datastore.user`を(default)／recovery-controlに条件付きで限定する候補、`roles/firebaseauth.viewer`、`roles/firebaserules.viewer`、API利用 | datastore.userは削除も含むため追加承認で権限内容を明示。Authユーザー作成は含まない。管理者は既存UID紐付けのみ。DB条件付きIAMの実証前に無条件へ緩めない |
| 提供前バックアップ設定 | backupSchedules.get/list/create、datastore.databases.getMetadata/update、backups.get/listの限定custom role候補 | updateはPITR専用権限ではないためCLIのupdateMask制限と承認が必要。既定backupSchedulesAdminは削除／更新も含み今回必要範囲より広い。課金開始を別確認 |
| 復元時だけ | `roles/datastore.restoreAdmin`、PITRには別途`roles/datastore.cloneAdmin`、操作get/list、限定した復元DBのdata権限 | restoreAdminだけではclone不可。DB新規作成を含む。復旧点・一時DB名と実行承認後だけ。DB削除・backup削除・Auth importは付与／実行しない |
| 配備後照合 | Functions get/list、Run services/revisions get、Hosting／Rules／索引read、所属するgcfソースbucketのobject get | 配備SA／運用SAの照合経路に必要。ソースbucket名・世代が作成されてから対象限定。storage.adminを包括付与しない |
| 通常配備SA | Hosting既存role、Rules配備、datastore.indexAdmin、Cloud Functions配備権限、対象実行／build SAだけのiam.serviceAccountUser候補 | HTTP callableのIAM設定、Scheduler、API有効化、Cloud Build／Artifact Registry／サービスエージェント初期化を実CLIと照合。Owner／Editorを解決策にしない。role最終集合は未確定 |
| Functions実行SA | 業務・制御DBのdatastore.user、Auth管理、ログ。backupMonitorには読取backup権限と指定Auth退避bucketのobject権限を追加検討 | 専用SA案を具体化する。配備SAや運用SAを実行主体にしない。Auth exportには機密情報が含まれ、bucketの世代／保持／非公開確認が必要 |

role定義は同日 `gcloud iam roles describe` で確認。API操作との対応は[Firestore IAM](https://firebase.google.com/docs/firestore/security/iam)、[Firebase配備権限](https://firebase.google.com/docs/projects/iam/permissions)、[WIF pipeline](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)参照。これは付与済み・権限十分の証明ではない。現段階で一括IAM変更を承認対象にしない。

### 残工数と判定

22日までの残作業を**12〜18時間（推定）**へ更新：初回保守公開の統合・実経路確認・公開照合2〜3、通常アプリの統合レビュー／CI2〜4、運用／実行主体と権限・読取実証3〜5、初期管理者等の入力照合1〜2、HS試用支援4。旧8〜10時間から4〜8時間増。認証REST実証は終了したが、SDK／CLI経路・main全差分・実行SA／運用workflowの残件を明示したため。大幅修正・外部待ちは含まない。

10/14〜22の42時間確保という仮定では余力24〜30時間。23日構築3〜4時間は別枠で、22日までに上記と初回基準版が揃う場合に限り可能と判断。26〜27日の保護／正式投入12時間枠、28日修正6時間、29日HS受入れ、30日納品判定を維持。HS日程・請求移管・初回取得待ちは未確定。工数と現在地が変わったため既存PDFを更新し、納期や受入条件を緩めない。

## main保護適用後の認証確認（2026-10-13）

オーナーの追加承認に基づき、以下の4ファイル限定PRとmain保護を適用。診断・識別子訂正も限定PRとして必須CI成功後に通常mergeした。GitHubの実OIDC設定はimmutable subjectであり、旧形式を想定していた初期条件を訂正した。現在のsubjectは `repo:shisyamo4131@72244713/termite-warranty@1363463339:environment:production`。repo／owner ID・main・production・event制限は維持する。GitHubの設定を旧形式へ変更しない。[結果と実行証拠](../operations.md#2026-10-13-認証識別子の訂正)、[実設定](../requirements/environment-configuration.md)。

最終run `38376243684` で短期認証・別job再認証・production環境なし拒否が全成功。次工程は初回保守公開の具体的な成果物・対象・差戻しのレビュー。配備承認前に公開しない。通常アプリ差分のmain統合、通常配備／運用SAの権限、期限切れ更新と別ref／repo／eventの実拒否はこの認証試験とは別の残件。以下の「実設定待ち／未保護」は適用前の記録である。

## main保護・認証専用試験の適用案（2026-10-13、実設定待ち）

手動専用 `.github/workflows/verify-production-auth.yml`、依存追加なしの `scripts/production-auth-probe.mjs` と架空応答テストを準備。正規production jobでOIDC→STS→SA短期認証→対象project/siteのGETを2回、別jobでも同じ確認、最後にenvironmentなしのjobでprovider属性条件による拒否を確認する。POSTは認証交換とtoken生成のみ。公開／業務データ書込み、token本文・応答本文の保存／ログ出力、長期鍵はない。期限切れ更新・別repo/ref/eventの実拒否はこの試験の完了項目に含めず未実証として残す。

確認時main=`b45382f6ef92e9ab897cee59b1164766375aaa70`、作業ブランチとの差分は既存542ファイルであるため、一括統合しない。mainへ適用する候補は上記workflow／script／`test/production-auth-probe.test.mjs` の3ファイルと、main既存 `.github/workflows/deploy-development.yml` へのpull_request(main)トリガー追加だけ。mainの既存アプリ・手動Dev配備条件は保持。現在の作業ブランチでは将来統合時に失わないようPRトリガーとworkflow契約を更新する。main差分を含むPRをレビューしてからmergeし、全Prod準備の受入れと混同しない。

main保護案：PR必須、既存7ゲートjob `Verify development deployment` の成功必須、最新mainとの同期必須、管理者にも適用、force push／削除禁止、未解決会話なし。単独オーナーの運用を妨げないよう他者の必須承認数は0とする案で、まだ採用済みとしない。適用前に既存設定・main SHAを再読取りし、変化があれば上書きせず再照合。PR検証を追加したPRを先に作成して成功を確認し、その実check提供元を固定して保護を設定、通常のmerge条件で統合する。保護の管理者迂回を使わない。GitHub仕様は[公式API](https://docs.github.com/en/rest/branches/branch-protection#update-branch-protection)を参照。

承認単位はこの4ファイルのPR作成・検証・保護設定・merge・認証workflowのmain手動実行。Prod／Dev配備enable・公開・DB操作は含めない。異常ならworkflow／mergeを止め、ログの資格情報本文を取り出さず、安全な工程名とHTTP statusだけで原因を調査する。今回変更の差戻しはPRのrevertで行い、保護解除は別判断。運用SA・通常配備権限・保守初回公開は後工程。

## 配備認証初期設定後の再開点（2026-10-13）

[実設定](../requirements/environment-configuration.md#2026-10-13-prod配備認証の初期設定)の配備SA・制限付きWIF・main限定production環境を個別承認後に構成し読戻した。運用SAは権限なしの予約段階。今回承認はCI有効化・アプリ配備を除外しており、workflow実行はない。

次はmain変更保護と受入済みworkflowの統合方法を具体化し、認証専用テストの実行を承認対象として提示する。正規main／productionからのOIDC交換、別jobでの再認証、対象限定GET、許可外ref／repo／eventの拒否を確認する。テストはtoken本文・資格情報を出力せず、Hosting公開・DB書込みを含めない。成功後に初回保守公開へ進む。運用SAには独立した起動条件と必要操作を確定してから権限を付ける。現在の配備SAはHosting限定であり、通常アプリ配備用の全roleを満たさない。

今回の設定で異常が判明した場合は認証テスト・公開を停止し、provider無効化または今回追加したbindingだけの解除を具体的に確認してから実行する。既存Owner／Firebase管理SA・Devの権限へ拡張しない。バックアップ／PITRの延期、空DBの保持は維持。

## 空基盤作成後の再開点（2026-10-13）

オーナーが空のProd基盤を先行作成する方針へ変更し、プロジェクト名・ID、Blaze／既存請求先、メール／パスワード認証を個別承認。実値・作成済み範囲は[環境仕様](../requirements/environment-configuration.md#2026-10-13-prod空基盤の実作成)を正本とする。2DBは東京・全クライアント拒否・空。日次backup／PITRは本人指示で後回しにした。Dev変更、業務データ投入、アプリ配備、GitHub設定変更は実行していない。

次は親組織・Web／Hosting詳細・Auth domain・必要APIを読み戻し、配備SAと運用SAの分離、WIFのrepo／ref制限と具体roleを確定する。権限の付与は対象と内容を提示して実行時に承認を得る。実target全9項目の一致後に短期認証を実証し、初回保守表示・Rules／索引・閉鎖初期化へ進む。今回の「土台作成」を通常アプリ配備や一般利用開始の承認へ拡張しない。

バックアップ・PITR・Auth退避・通知は提供前の必須条件として残し、有効化する時点で課金範囲を再確認する。失敗時は作成済み空基盤を保持し、削除・再作成・Dev転用をしない。以下はそれ以前のLocal準備記録であり、現在の実行済み範囲は本節を優先する。

## CI切替と実行順の最終レビュー（2026-10-13）

Local準備のみ。GitHub設定・実Cloud操作・配備は未実施。既存準備は `1bc5f0fc46b816bc2066e56a7da6f46fa90bd9b4` として同じ主作業ディレクトリの `codex/production-readiness` に確定し、同名remote branchへpush済み。main/devへ統合していない。以降の現在地は[roadmap](../roadmaps/production-readiness.md)を参照。

### Dev／Prodの切替契約

| 状態 | main | dev | その他のref |
| --- | --- | --- | --- |
| Dev切替変数未設定／true以外、Prod未有効 | pushは検証のみ。手動dispatchのみ従来Dev配備 | 検証のみ | 配備拒否 |
| `DEVELOPMENT_BRANCH_DEPLOY_ENABLED=true` | Dev配備を拒否。Prodは独立したenable条件 | push／手動dispatchで検証後Dev配備 | 配備拒否 |
| `PRODUCTION_APP_DEPLOY_ENABLED=true` | Prod workflowの条件成立時だけProd配備。旧Dev手動経路はDev変数によらず拒否 | 上のDev変数による | 配備拒否 |

変数は小文字のtrue／falseで管理する。比較は[GitHub式仕様](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)の大文字小文字非区別に従う（2026-10-13参照）。テストもその文字列比較を反映する。

Devは `development-deployment`、Prodと初回保守表示は `production-bootstrap` の排他group。進行中処理を自動取消ししない。Devは同一SHAのHosting成果物と同じcheckoutからのFunctions配備を維持し、Prodの全ファイルbundle方式と同一の保証とは扱わない。Devの既存認証方式は維持し、Prod秘密・WIFを流用しない。mainのDev用検証は移行中の回帰確認として残る。

別承認後の切替順：

1. main/devの受入済みrevision、進行中Actions・手動配備なし、両environmentの権限・branch制限、実repository／owner IDを非公開台帳と照合する。未設定enableの確認を先に行う。
2. レビュー済みCIをmainへ統合し、同じ受入済み版からdevを用意する。実ブランチ操作・設定変更は今回行わない。enable未設定なら自動配備されないが、mainの旧手動経路を作業者が実行しないよう調整する。
3. Dev切替を別途了承して変数をtrueへ。以後mainからDevへ手動配備できない。devでの正規配備を別承認・実行して成功／失敗・対象一致を確認する。
4. Prod入力・WIF・保守基準版・閉鎖初期化・保護条件が成立してからProd enableをtrueへ。次の受入済みmain pushを配備対象として明示する。今回のcodex branchのpushを有効化操作とみなさない。
5. 失敗時は次のpush／手動操作を止める。enable停止だけでは実行中jobは止まらないため、進行中処理とCloud部分反映を照合する。盲目的に取消・再配備・旧版上書きをしない。Local差戻しは当該CI commitをrevertして再検証する。Cloud復旧は別承認の固定DB復旧手順へ。

### 初回投入・設定・受入れの順序

ソース照合：`historical-intake-execution.mjs` は初回空業務領域と既存設定hash一致を要求する。`historical-intake-settings.mjs` は既存設定の保全であり、空のProdへDev設定を注入する機能ではない。verification中は設定保存を含む書込みが閉じるため、読取公開と業務開始を一回の操作にまとめない。

1. 事前構築で両DB／Rules／索引・配備／運用認証・保守基準版を照合。空DBにinitializeしrecoveringを確認。Auth作成・本人確認後に既存UIDをadministratorでbind。会社情報・請求先・試験物件を先に登録しない。
2. 23日は初回アプリ配備と正式照合、管理者の認証・役割を確認。recovering中のHS画面は保守表示が正しい。業務画面・CSV受入れは後工程であり、構築完了と混同しない。
3. 保護用bucket／hash／通知と日次backup・PITRを準備。閉鎖中に自動Auth退避成功を要求しない。自動処理の実成功はnormal再開後の確認を含み、設定受付だけで保護実証済みにしない。
4. 確定原資料から計画を再生成し、空の業務領域へintake-apply。元データ・採番・権限・7準備情報を全件照合しplan-intake→publishでverificationへ。途中失敗は同じ入力／operation／元worker停止を照合して再開。新operationでリセットしない。
5. HSが投入結果を読取確認し、会社情報／請求先が未設定であることを明示したうえで、設定作業のための書込み再開を別了承する。了承がなければverificationで停止。受入済み版の正式照合後reopen。これは最終納品・業務利用開始の了承ではない。
6. 有効アカウントを確認済み管理者に限定した準備期間に、既存画面で会社情報・請求先・必要設定を入力し、保存結果とCSVを確認する。試験のための正式採番を行わない。設定完了後に実バックアップ／Auth退避・非公開readback・通知到達・現行版の復元互換性を確認する。復元は一時DBで行い、通常業務開始前でもdefaultへ無承認で上書きしない。
7. 設定を含むHS最終受入れ・引継ぎ・開始了承を確認して納品判定。設定後は初回投入直後のhashとは異なるため、旧intake計画を再publishせず、現行像・設定の受入記録を別に残す。重大修正があれば影響検証・再受入れへ戻る。

Auth実importは未開放、backup設定の結果不明時はロックを保持して個別回復判断が必要。これらを自動復旧完了と表示しない。初回取得待ち・HS了承待ち・請求移管の確認は作業時間とは別の経過時間リスクとして管理する。

### 実環境入力チェックリスト

以下は既存仕様の実施台帳項目であり、新しい未解決事項台帳ではない。判断事項は[既存index](../requirements/house-solution-confirmations.md)、条件は[環境仕様](../requirements/environment-configuration.md)を正本とする。実値は未照合。値・取得時刻・取得者・根拠・照合結果は管理済み非公開台帳へ保存し、秘密／個人情報はGitへ入れない。

| 優先／期限目標 | 入力・確認 | 確認担当と入手先 | 合格条件／未成立時 |
| --- | --- | --- | --- |
| P0・作成承認前 | Aの本人／回復手段、既存Billing ID・有効性・関連付け権限、希望project ID／公開先 | オーナー＋開発、本人確認と管理画面 | A先行・組織なしは既決。実対象と作成／課金範囲の承認がなければ構築しない |
| P0・CI切替前 | repository／owner不変ID、main/dev revision、契約とbranch／environment保護、CI変数の現在値、競合実行 | 開発、GitHubの実設定・実行履歴を別途承認後照合 | 許可外repo／ref／actor経路を拒否。保護不足なら有効化しない |
| P0・基盤作成後 | targetのproject／projectNumber／site／appId／control／serviceAccount／audience／repositoryId／ownerId | 開発、作成結果と管理API読戻し | 9項目の所属一致、東京Nativeの2DB、削除保護・APIキー制限の採否を確定。架空IDを転記しない |
| P0・22日判定前 | 別operatorIdentity、配備SA・Functions実行SA・サービス管理主体、WIFと必要権限 | 開発、実IAM／SA binding／短期認証証拠 | 運用SAと配備SAを分離。read、配備、DB運用、Auth・bucket操作を主体別に最小権限で実証。Devのeditorをコピーしない |
| P0・初回配備前 | 同一siteの保守providerVersion、受入済みrevision／bundle digest、公開URL・Auth承認domain／action URL | 開発、保守公開証拠・同じjob成果物・Auth設定 | 別版／別site／資格情報混入を拒否。本人ログイン・再設定メールを実確認 |
| P0・管理者登録前 | 受領済み氏名・メール、実UID、enabled、role、回復担当 | オーナー＋開発、既存非公開資料と実Auth | 再提出は求めず本人と照合。role重複／別UID上書き拒否 |
| P0・保護開始前 | 私有bucket・project number、hash設定の固定generation、通知先と受信証拠、保護4パラメータ | 開発＋通知受信者、実Storage／Auth／監視 | 30日・非公開・同project。バックアップREADY／Auth読戻し／通知／復元実証が揃うまで提供判定不可 |
| P0・正式投入前 | 確定原資料とhash、today、planHash、inventoryHash、actorUid、operation／approval、設定内容 | 開発＋HS、確定原資料とLocal計画・実読戻し | Dev試用像をコピーしない。空業務像・同一計画・採番／全件照合。会社情報等は上の順で設定 |
| P0・20〜22日判定 | HS試用2日、29日までの最終受入れ、書込再開と開始了承の担当、開発作業枠 | HS／オーナーと開発 | すべて未合意。予定だけで受入れ済みとしない。20日に未確保なら日程リスクを報告 |
| 提供判定前 | HS管理引継ぎ・請求移管の対象／担当／期限、暫定運用の了承 | HS／オーナー、既存B/H/C手順 | 未完了範囲を隠さず判断。個人Aへの初期構築をHSへの引継ぎ済みとしない |


## 初期化・管理者・正式投入・復旧のProd入口（2026-10-13）

オーナーがLocal実装・事前検証を追加承認。実Cloudの作成・設定・認証・配備・投入・復旧は今回実行しない。新入口は `scripts/production-operations.mjs`。既存Devのreset／seedや旧動的切替CLIをProdへ開放していない。

- `node scripts/production-operations.mjs plan <非公開要求JSON>`：資格情報・Cloud接続なしで入力を検査する。実行許可や実対象の存在を証明しない。
- `node scripts/production-operations.mjs inspect <非公開要求JSON>`：将来承認後の読取り専用。observe／preflight／intake-inspect／backups／auth-inspect／scanだけを許可。
- `node scripts/production-operations.mjs execute <非公開要求JSON> --execute-approved`：将来、対象・操作の別承認後だけ実行。構築の自動実行入口ではない。書込み前に対象と両Rulesを照合。初期化でもDBは事前作成済みが条件。

要求JSON共通項目は `target`（配備用の既存9項目）、`operatorIdentity`（audience、serviceAccount）、`revision`（照合済みcommit）、`command`。運用SAは配備CIのSAと別にし、同じproject内の明示した運用WIF／SAを照合する。実名・権限・WIF経路は未確定で、設定変更はしていない。inspect／executeは実HEAD一致・対象ソースに未コミット差分なし・Emulator混入なしを要求する。秘密や個人情報を含む要求はリポジトリ外の管理済み非公開ファイルで渡し、stdoutへ文書・UID・メール・Auth値を出さない。

| 操作 | 主な追加入力と実行条件 |
| --- | --- |
| initialize | operation、approval。両DBが空、または初回の同一protocol2・recovering世代1だけの部分初期化。閉じたmarker→controlの順に初期化し、業務内容があれば拒否 |
| administrator | generation、operation、approval、administrator（uid／email／role／displayName）。実対象Authに既にある有効UIDとメールを照合し、developer_superuserまたはhouse_solution_administratorを登録。別UIDの同roleや異なる既存profileは上書きしない |
| intake-inspect／intake-apply | inspectで実像のhashを取得。applyはgeneration、operation、approval、input、today、planHash、inventoryHash、actorUid。確定原資料から既存prepare-historical-intakeの計画を再生成して照合。初回の空業務領域限定で、設定・マスタを含む既存業務データがあれば拒否。Auth／staffAccountsは保持 |
| plan-intake → publish → reopen | 完了した投入operation・planHashから全件／権限／採番／7準備情報を照合して公開計画を作る。publish／reopenはbundle、digest、providerVersionによる実配備照合が必要。HS読取確認後の別approvalでのみ通常再開 |
| enter → baseline → restore → restore-status → quarantine → scan → reconcile → verify → plan → apply → publish → reopen | 既存の固定(default)復旧手順。targetDatabaseは別の一時DBのみ。backupまたはsnapshotTimeは一方だけ。復元先Rulesは送信前に別途準備・照合。復元操作、原像hash、保全baseline、検証ID、復旧時点了承を結び付け、業務反映で現在権限・発行済み番号を保つ |
| configure-backups／backups | 閉鎖・収束状態で日次30日／PITRを設定する入口。backupsは設定読戻しpolicyVerifiedと新鮮なREADY像のfirestoreBackupStatusを別表示。API受付を取得・復元成功とは扱わない |
| auth-inspect | 明示bucketが同じproject numberに属し、非公開・統一アクセス・Auth30日削除条件を満たすことを確認。固定generationのhash設定とAuth退避を読取り、現在権限との整合を検査。実Auth import／既存UID作り直しは開放しない |

`generation`・`operation`・`approval`はすべての変更（initializeのgenerationを除く）で明示。restore-statusも私有journalを更新するためexecute。管理者・投入の再開は元worker停止後に `resumeOwner` と `workerStopped:true` を指定し、同じ操作／入力を保持。復旧applyの再開はresume、固定公開の途中回復はrecover-operator（配備照合3項目も必須）。baseline／一時DBのquarantine・reconcile・verifyで中断したworkerはrecovery-worker-resumeで元worker停止を明示し、対象一時DBと必要なら元回復owner／回復worker停止も照合する。production用の管理者／復元／設定ロックをこの汎用回復で解除しない。復元POST前に排他とsubmitting記録を同時保存し、応答不明でも再POSTしない。記録と一致するrestore-statusで終端を確認してから排他解除する。バックアップ設定の途中不明・失敗は排他を残し、実設定の非公開照合と個別の回復判断が必要。ロックを自動削除して続行しない。

初期管理者のAuthアカウント自体は、承認済みB4／B6の実作業で作成・本人／回復経路を確認してからbindする。今回の入口はパスワード生成・設定メール送信・既存Auth変更をしない。初回投入は空業務領域を前提とするため、会社情報・請求先などの業務設定を先に手作業で投入しない。原資料・採番と取込計画を照合する。会社情報・請求先等は既存画面で設定できるが、投入・設定・HS受入れの具体的な実行順序は上の最終レビュー節を正本とする。先行設定や既存データが必要な場合は上書き許可へ変更せず、取込順序を見直す。

バックアップ自動処理には配備bundleから `TERMITE_PRODUCTION_PROJECT_NUMBER` を渡し、別projectのbucketへの退避を拒否する。bucket／IAM／hash設定の登録、失敗通知先、初回取得と非公開readback、現行版の復元互換性、ログイン・メール・HS受入れは実環境の別工程。初回READY時刻は確約しない。今回はCloud操作・メール送信・実データ処理なし。

## 通常アプリ配備の実装済み手順（Local検証のみ）

2026-10-13後続実装。実Cloud／GitHub設定・実行は未承認。下の「未実装」は棚卸し時点の記録。現在の実装と残件は[専用ロードマップ](../roadmaps/production-readiness.md)を優先する。

1. 別承認後、基盤・WIF・保守表示を先行構成して初回基準版を照合する。空DBの作成や初期化を通常CIへ任せない。管理者・protocol2初期化は別運用CLIで実行・照合する。
2. Repository variablesへ `PRODUCTION_TARGET_JSON`（既存9項目）、`PRODUCTION_RECOVERY_PARAMETERS_JSON`（下記4項目）、`PRODUCTION_PROVIDER_VERSION`（照合済み同一siteの過去版）を、実対象との照合後に設定する。verify jobはenvironment外なので必要値をenvironment variablesだけに置かない。production environment、ブランチ／レビュー保護、WIF条件は実契約で確認する。実値は今回未設定。
3. 保護用4項目は `RECOVERY_BACKUP_AUTOMATION`（文字列true／false）、`RECOVERY_AUTH_BACKUP_BUCKET`、`RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE`、`RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE`。全キー必須、trueなら他3値も必須。暗黙に無効設定へ戻さず、保護実証後の変更は実値を照合して行う。秘密・Auth hash本体は入れない。
4. 初期化と受入条件を満たし、旧Dev切替・同時手動配備の停止を確認してから、別承認で `PRODUCTION_APP_DEPLOY_ENABLED=true` を設定する。通常CIはmain pushで全7ゲートに成功した同じrevisionからProd成果物を生成。build job出力のdigestを別jobへ渡し、artifact自身から期待digestを採用しない。
5. `check-production-release.mjs local .production-release` → `stage .production-release` はローカル検査・新規 `.production-deploy` 生成のみ。WIF認証後の `predeploy .production-release` はGETのみで2DBの存在／東京／Native、project番号、site／Web、初回基準版FINALIZEDを確認する。DB未作成時は拒否。Firebase CLIが未作成DBを自動作成する経路へ入らないための事前条件。
6. workflowの配備段階だけがCloud書込み。`.production-deploy/firebase.json` でFunctions・Hosting・両DB Rules／索引を配備し、再buildしない。再認証後の `cloud .production-release` は原本を期待値に読取照合する。5項目passまで配備確認済みとしない。protocol2／管理者／保護／業務受入れは別gate。

通常workflowの実Actions実行、実WIF token更新、最小権限・Cloud配備、公開画面・メールの検証は未実施。read-only入口も本タスクではCloudへ実行していない。失敗した配備は部分反映の可能性があるため自動再試行せず、停止・保全・復旧の判断を行う。未承認時のfallbackはenable未設定のままLocal準備を保つ。

2026-10-13追加指示：[Prod事前構築ロードマップ](../roadmaps/production-readiness.md)を現行工程とする。Local認証・初回照合処理へ着手し、基盤作成／WIF実証／保守表示の初回公開は、別途実行承認後に23日前へ先行させる計画。今回実Cloud操作なし。以下の実装未着手は前工程時点の記録。既存B/H/Cの完了条件は不変。

## 現行：実ファイル棚卸し後の構築判断（2026-10-13）

オーナーが10月末納品ライン維持を指定し、棚卸しと具体手順の作成を指示した。[実ファイル別の棚卸し・認証／初回配備／検証手順・工数](../design/production-readiness-inventory-2026-10-13.md)を今回の準備計画とする。実装・構築は開始していない。10月23日の構築は条件付きで狙うが未確約、10月30日を月末納品の作業上の最終判定日とする。HS試用日・最終受入日は未合意。

事前対応は28〜40時間、HS試用支援・小修正4時間を合わせ32〜44時間の推定。10/14〜22の7営業日×集中6時間＝42時間で、上限は2時間超える。認証／正式照合とCIを先行し、HS試用を並行調整する。23日構築は別に6〜8時間、26〜27日は保護実証・正式投入、28日は修正、29日はHS最終確認、30日は納品判定／予備日。Cloud待ちや重大指摘は別途再判定する。15日・20日・22日の確認条件と、期限維持のために省略しないgateは上記棚卸しを参照する。

旧11/4〜13の順次試算は現行日程として採用しない。既存のB/H/C完了条件、承認境界、WIF採用条件は維持。初回Cloud初期化入口、独自preflightの認証、Hosting初回基準版が追加で確認できた不足であり、対象IDの置換だけで完成とはしない。以下の前回整理は背景資料として読む。

## 2026-10-13 事前準備の切分けと日程評価

オーナー依頼により、準備の手順・優先順位と納品までの日程を整理した。今回は文書・既存スケジュールPDFの更新のみ。下表の改修・構築・配備・データ更新・GitHub設定変更は開始していない。HS試験日は同日の本人回答で未定。10月23日の構築目標は維持するが、達成可能と確認できた日付ではない。[現行日程案と見積り前提](../../deliverables/production-schedule-2026-10-05/README.md)を参照する。

### 実環境の新規作成を待たずに準備できること（実行は着手指示後）

| 優先 | 手順・対応工程 | 成果物／終了条件 | 今は確定できないこと |
| --- | --- | --- | --- |
| 1 | A1／A2：画面・Functions・診断・復旧／移行／初期投入CLIのDev固定箇所を棚卸し。設定入力と禁止対象を整理 | 変更箇所、許可条件、Local／Dev維持、未知・未設定Prod拒否、試験ケースの一覧 | Prod実ID・番号・Web設定・公開先 |
| 2 | A3／A4：dev→Dev、受入済みPRのmain統合→Prodの配備手順、旧workflow停止順、同時配備防止、差戻しを設計。人・CI・実行主体を分離 | WIFの信頼条件と必要操作、環境別の設定一覧、誤配備拒否の検証計画。実repository／所有者IDとGitHub契約は読取確認の対象 | 実ProdのWIF登録・IAM付与、実契約での保護機能の利用可否、非対話配備成功 |
| 3 | A2〜A4：承認後に設定を分離して改修し、未設定のProd経路を閉じたままLocalで検証 | アプリ・運用CLI・配備定義の整合、Local／Devの回帰、対象外拒否。架空IDは試験専用 | 実Prodの認証・API・索引・配備結果。コードの検証だけでProd対応完了とはしない |
| 4 | A5：初期投入・検索派生値整備・復旧・保護開始・正式配備照合を一連の手順にする | 投入前条件、採番と設定保全、準備印の公開条件、成功証拠、失敗時の停止／差戻しをレビュー。包括検証と必要な分離試験 | 実環境でのバックアップ初回成功、通知受信、復元互換性、HSの業務受入れ |

現在の実ファイルでは `functions/local-runtime.js` と `app/plugins/firebase.client.ts` がLocal／Devを限定し、`.github/workflows/deploy-development.yml` はmain push時に検証、手動dispatch時だけDev配備を行う。既存のサービスアカウント秘密を使う方式であり、計画上のProd／WIFへの切替は未実装。これらは2026-10-13のローカル読取結果で、GitHub実設定の再検査ではない。

### 情報が揃ってから進めること（順序と停止条件）

1. **既存情報の照合（A1／A3／A4）**：Aの本人認証・回復手段、既存請求先ID／権限／有効状態、repository／所有者の実識別子・GitHub契約、希望する公開名／独自ドメイン、通知先を確認。新Prod作成前から照合できる。秘密値は文書に記載しない。方針を再質問せず、不明な実値だけ確認する。
2. **実Prod作成と設定（B1〜B4）**：対象と範囲の実行承認後、組織なしで作成、既存請求先を関連付ける。実ID／project number、Web App ID、Hosting、API、DB、実行主体を記録し、設定へ反映。削除保護・APIキー制限等の未決設定を確定し、変更で失効した検証を再実行する。
3. **認証・配備の実証（B5／B6）**：実識別子でWIF／IAM／GitHub保護を構成。非対話で初回配備し、別ジョブで再認証・読取照合、許可外条件の拒否を確認。両DBのRules、索引READY、Functionsソース、Hosting成果物、ログイン・メール・診断を照合する。認証だけ成功しても構築完了とはしない。
4. **提供前の保護・正式データ（B7／C1／C2）**：バックアップ／PITR／Auth退避／通知を設定し、初回実取得・非公開読戻し・通知到達・復元互換性を実証。HS試験中のDev状態をコピーせず、確定原資料・設定・採番から本番投入し全件照合。順序は保護の開始条件と正式データ確定状況に従う。
5. **HS引継ぎ・納品判定（H1〜H3／C3／C4）**：HSの受入アカウント・回復担当・請求先・日程が揃ってから権限と請求管理を引き継ぎ、業務受入れと社長の開始了承を記録。引継ぎ未完了なら、残範囲・担当・期限・暫定運用可否をHS／オーナーが明示判断する。未検証の請求切替を完了扱いにしない。

GitHubの保護機能は契約・公開範囲に依存するため、実契約が不適合なら代替または契約変更の判断が必要。WIFはGitHubのOIDCから短期認証を得る方式だが、当該Firebase配備経路での成功はB5で実証する。[GitHub公式](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[Google Cloud公式](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)を2026-10-13確認。

### 10月23日の判定と見積りの更新

優先1・2の棚卸し／設計を先行し、HS試用・指摘修正と同一開発担当の改修時間を二重計上しない。10月22日までにA1〜A5・実値照合・必要な実行承認が揃った場合だけ、23日の構築を実行候補にする。HS試用完了は空の基盤構築そのものの絶対条件にはせず、正式データ・業務利用の条件と分ける。未充足なら23日は到達状況を報告し、B工程を延期する。所定の検証を省いて日付だけを守らない。

日程は開発担当1名の暫定見積り。棚卸し／設計2作業日、HS試験2日（開発支援を確保）、指摘修正3〜5作業日、Prod対応改修・事前検証4〜6作業日、構築1〜2作業日、保護実証・本番投入照合2〜3作業日、HS最終確認・引渡し1〜2作業日を順に確保する。工程の粒度から置いた計画用の幅であり、実測工数ではない。大きな保存形式変更、WIF・請求移管・復元の問題、情報／HS日程待ちは別途延長要因。最初の棚卸し後、HS指摘確定後、実Prod設定確定後に再見積りする。今回の整理による全体納品進捗の加点はない。

## 2026-10-23の到達点（2026-10-13採用）

オーナーがGOVERNANCE-MANAGER（タスク `01a1015f-0477-7ad3-8b3c-ef77242b4dcf`）で、2026年10月23日（日本時間）は環境構築まで、業務利用開始は後日と指定し、以下の段階別計画を採用した。WIFは通常配備に人による都度認証操作を必要としないことを条件に採用。全工程は未実施であり、日付到来・手順書更新を構築完了とは扱わない。

当日の到達点は、A（開発者個人のGoogleアカウント）で、組織なし（No organization）のProd基盤を構成し、Actionsから対象を限定して初回配備・管理者確認までできる状態。HSへの管理引継ぎ、正式業務データ投入と業務受入れは後段とする。2026-10-13の追加決定により「最初からHSアカウント・組織で構築する」前提を置換する。理由は、HS側のメール・アカウント管理ルールが不明な段階でWorkspaceを用意しないため。今回のProdに関する承認は手順書更新であり、この場での実Prod作成・課金・権限変更・配備ではない。既に承認された事項は再質問せず、実行時に対象・範囲の不足だけを解消する。

## 提供前の必須保護ゲート（2026-10-07追加）

Dev停止をProdの保護不要と解釈しない。Prod提供前に日次30日保持、PITR、Auth自動退避、開発側失敗通知を有効化し、初回READY・私有readback・通知受信と現行スキーマ／版での復元互換性を確認する。実Prod設定・開始は未実施。[開始条件](backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)。

- 作成日：2026-10-02
- 状態：段階別計画採用済み、構築未実行。HS管理者メール・氏名は受領済み。ProdプロジェクトID・請求関連付け・IAMの実値は構築時に確定。[Dev／Prod環境設定・権限仕様](../requirements/environment-configuration.md)を設定照合の正本とする。
- 根拠：[ADR 0032](../decisions/0032-production-firebase-operations.md)、[HSC-020](../requirements/house-solution-confirmations/HSC-020-production-firebase-operations.md)、上記オーナー指示。設定値・保存契約は既存正本を参照し、本書は作業順と段階別の完了条件を管理する。

## 所有・アカウントの分離

Aで先行構築し、後日HSが本番プロジェクトと請求を管理する状態へ引き継ぐ。Aの実アカウントはオーナー指定のログイン画面と非公開管理記録で照合し、個人メール・資格情報を本書へ転載しない。引継ぎは同じFirebase/Google CloudプロジェクトへのHSメンバー追加で行い、Googleアカウント自体やデータをコピーしない。プロジェクトのオーナー権限、請求先の関連付け、組織所属、アプリ内管理者は別工程とする。

今回Workspace／Cloud Identityを新設せず、既存HS組織が存在しても初期構築では所属させない。後日の組織所属変更は本方針に含まず、HSの管理ルール・移行先・影響を確認して別途判断する。HSの受入アカウントは会社の管理・回復担当を確認して決める。既存メールの受領だけでWorkspace管理アカウントと推定しない。初期構築のAログインと、後日のHS本人認証・回復手段の確認を分ける。

## オーナー引継ぎの実証と未検証範囲（2026-10-13）

根拠は本GOVERNANCE-MANAGERでのオーナー指示と実ブラウザー操作。試験専用 `fir-owner-transfer-test` をAで組織なし・Sparkプランとして作成し、東京のFirestore `(default)` に架空文書 `transferProof/sample` を保存した。

- 検証済み：Bへのオーナー招待・受諾、Bから元データの読取り、BによるAのメンバー削除、A削除後のBによるフィールド追加・再読込み、反映待ち後のAのアクセス拒否。元フィールド `message` は保持し、Bの確認フィールド `verifiedByB` を追加。同じプロジェクトID・DBのまま管理者を交代できた。
- 観測事項：権限の付与・削除は即時反映ではなく、一時的な読取りエラー／旧Aの参照継続があった。反映を確認する前に権限を追加し直したり、引継ぎ完了と判定したりしない。
- 未検証：Blazeへの変更、請求先の変更・支払情報の引継ぎ、組織移行、実ProdのFunctions／Auth／WIF等の引継ぎ後動作。Sparkの成功をこれらの成功証拠にしない。HSアカウントへの実引継ぎも未実施。
- 後片付け：オーナー指示により試験プロジェクトをBから削除。Firebaseの通常一覧から消え、Google Cloudの「削除保留中」にあることを確認。画面上の復元猶予は30日。完全消去済みとは扱わない。この試験IDをProd設定へ流用しない。

## 実行前にHSと揃えるもの

1. 初期構築ではAのログイン・回復手段・実施時間帯を確認。HSの受入アカウント、管理・回復担当、引継ぎ日は後日の引継ぎ前に確定する。Workspace調達を10月23日の前提にしない。
2. 2026-10-13の追加指示により、初期請求先はAの既存Cloud Billingアカウントを使用し、後日HS側の請求先アカウントへ変更する方針で確定。実行前に該当する既存請求先ID・名義・利用権限・有効状態を照合する。候補が複数で識別できない場合だけ対象を確認し、方針自体を再質問しない。HSへの請求先変更は未検証の別工程として残す。
3. 開発者は引継ぎ後もHS管理者と同等のクラウド権限を維持する既決定。試験でAを削除できたことを、ProdでのA削除指示と解釈しない。
4. 本番プロジェクト名／ID候補、公開URL・独自ドメインの要否。実際のIDは作成時に照合して記録する。
5. 本番DBはFirestore確定（ADR0038）。東京リージョンと業務／制御DBの設定を作成前に照合する。

## 後日のHS引継ぎを現地・遠隔で支援する場合

以下はHS引継ぎ時に必要になった場合の支援手順。Aでの初期構築にHSアカウントの預託を要求しない。

2026-10-02のユーザー決定：HS側アカウント設定は現地で行う。開発者はノートPCから本開発PCを遠隔操作し、Codexの支援を受ける。これは作業方式の決定であり、本番作成・課金・権限付与の実行完了を意味しない。

現地のノートPCでHS本人にログイン・追加認証を行ってもらい、開発者が設定を支援する。IAM付与後は本開発PC側で開発者自身のGoogleアカウントから対象アクセスを検証する。Codexが本開発PCから現地ノートPC上のブラウザを直接読めるとは扱わず、現地操作は開発者が行い、必要な非秘密の設定結果を共有する。秘密情報をチャットへ転記しない。当日前に遠隔接続・復帰・入力と通信を確認する。使用する遠隔操作製品や接続設定は未確認で、導入・設定変更は今回行わない。

HS本人にログイン・追加認証・支払確認だけ担当してもらい、開発者が同席または遠隔支援で設定画面を操作する方法が第一候補。HSにIAMの操作方法を習得してもらう必要はない。

一時的な秘密情報の預託で進める場合は、以下の順序とする（既存ADRが許容する初期構築限定の扱い）。

1. HSから対象アカウント、作業内容、費用を伴う操作範囲、預託期限について明示的な了解を得る。
2. 個人の私用アカウントよりHS管理の専用アカウントを選び、一時パスワードを設定する。HS側の回復手段は外さない。
3. 秘密情報はアクセス制限・期限付き共有などの安全な方法で開発者本人へ渡す。チャット、Git、手順書、メール本文やスクリーンショットに平文の秘密を保存しない。追加認証はその場でHSに対応してもらい、恒久的に開発者だけを回復先にしない。
4. 開発者端末は同期・パスワード保存を無効にした専用ブラウザプロファイルを使用。既存メールや他サービスへ不要にアクセスしない。HSのログインをCLIや自動配備の恒久認証にしない。
5. 既存ProdへHSアカウントをオーナーとして追加し、HSが招待を受諾する。請求先の切替は下記H2の別工程とし、プロジェクトを新規作成し直さない。
6. 開発者は別プロファイルで自分のGoogleアカウントへ切り替え、必要な操作を検証する。以後の通常保守ではHSアカウントを使わない。
7. HS側のアクセスが残ることを確認し、HSがパスワードを変更。借用端末のセッション・必要ならトークン等を失効し、共有リンク・保存物を削除する。単にパスワードを変えれば全セッションが必ず消えるとは扱わない。
8. 秘密を含まない引渡し記録を残す。実施者、対象、付与権限、確認日、預託終了、HS回復手段の保持確認を記録する。

## 実際の設定順序

### A：10月23日までに行う事前準備

| 項目・担当 | 作業 | 完了条件・確認方法 |
| --- | --- | --- |
| A1・開発者／費用確認担当 | Aのログイン・回復手段、使用するAの既存請求先の実値・利用可能状態、当日作業経路を確認。HSとの引継ぎ担当・時期を整理 | Aで先行構築できる認証・支払条件が確定。HSのメール管理ルール・Workspace準備は構築を阻害する条件にせず、引継ぎ前の確認事項として分離 |
| A2・開発者 | Local／Dev固定の環境ガードを、承認済み対象だけを許容するProd対応へ準備。画面、Functions、診断送信先、復旧・移行・配備CLIを調査し必要箇所を改修 | Local／Dev維持と未知の対象拒否を試験。Prod ID未確定部分は未設定として閉じ、架空IDを実対象として登録しない。実値確定後に必要な最終検証をB4で行う |
| A3・開発者 | `dev`へのpushはDev、Dev受入れ済み変更のPRを`main`へマージするとProdへ反映するworkflowを準備。main直接pushを防ぐ設定、環境別認証・設定、同一環境への同時配備防止と差戻しを設計 | 現在のmain pushによる検証／手動Dev配備との切替順が明確。旧workflowとの二重配備・逆環境配備を防ぐ。GitHub契約で利用可能な保護機能を実確認。Prod配備は実ID・認証・検証が揃うまで有効化しない |
| A4・開発者 | WIFの信頼条件・CI主体・必要権限を設計し、当日登録する項目を整理。Functions実行主体、人の保守権限、CI配備権限を分ける | repository／所有者の実識別子、許可branch・environmentと実際のOIDC条件を対応付ける設計がある。未確認の値は未設定。都度対話認証を要求する経路を通常配備へ組み込まない |
| A5・開発者 | 初期配備対象版、対象設定、初期化・検証・差戻し手順をレビュー。必要なLocal／Dev検証を実行 | 変更クラスの和集合でゲートを選定し結果・終了コードを記録。実装・配備設定改修の包括ゲートは維持し、関連入力が不変の成功証拠だけ再利用。未完了と当日実値待ちを分け、未確認のProd操作は成功扱いにしない |

Aの完了は、当日の本人確認・入力事項と実環境でしか確認できないB工程を残し、事前に解決できる実装・手順・担当の不足がないこと。現時点のコードはDev固定で、A2〜A5は今後の作業である。ブランチ作成・workflow変更だけでProd対応完了とはしない。

### B：10月23日当日の構築

| 順序・担当 | 作業 | 完了条件・確認方法 |
| --- | --- | --- |
| B1・開発者 | Aで組織なしのProdプロジェクトを作成 | Dev・試験用と異なる実ID、No organization、Aのオーナー権限を管理画面で照合して記録。Workspaceを新設しない |
| B2・開発者／費用確認担当 | A1で実値を照合したAの既存Cloud BillingをProdへ関連付け、Blazeへ設定 | Aの既存請求先ID・名義との一致、Billing有効・Blazeを読戻し。対象不明・不一致の場合は関連付けを止める。HSへの後日変更は未検証としてH2へ残す |
| B3・開発者 | Aの保守権限とCI／実行主体の分離を確認。後日のHS招待対象を記録 | A自身で対象操作が可能。HS未登録は引継ぎ未実施として記録し、初期構築の失敗と混同しない。請求・アプリ内roleは別確認 |
| B4・開発者 | 必要API、Webアプリ、Hosting、Auth、Functions、Firestore業務／制御DBを設定。実IDをA2〜A4へ反映 | 環境仕様の設定対照表を読戻し照合。DB・Functionsは東京、両DBのRulesと必要索引READY、復旧初期状態が整合。対象値変更で失効する証拠を再取得してから配備へ進む |
| B5・開発者 | Prod専用WIFを構成し、検証済みの対象版をActionsから初回配備 | 下記WIF受入条件を満たす。実認証主体・対象・配備版・公開成果物が一致し、Devへ誤配備しない。Devのデータ・資格情報を流用しない |
| B6・開発者 | 開発者のアプリ初期管理者を設定し、ログイン、権限、認証メールと診断経路を確認。HS管理者は受入アカウント確定後に設定 | AuthとstaffAccountsのUID・role・有効状態が一致。Prodの設定／再設定メールが対象サイトへ戻る。未認証アクセス拒否と管理者操作を確認。HS未設定ならH3へ残し、一般展開は行わない |
| B7・開発者 | バックアップ、PITR、私有Auth退避、監視・通知を設定。設定仕様の開始条件を満たして自動取得を有効化 | 設定の実値・通知先を記録。初回取得・通知受信・復元互換性が当日未確認ならC2へ残し、成功と記載しない。Devの停止例外はコピーしない |
| B8・開発者 | 構築結果、HSへの引継ぎと利用開始前の残件を報告 | B1〜B7の構成・開発者での最小動作が確認済み。HSへの権限・請求・アプリ管理者の引継ぎH1〜H3、未確認の保護実証C2を分け、正式業務データ未投入・業務利用未開始を明記 |

Bの構築完了は上記の構成と初回配備・開発者管理者確認ができた場合に限る。HS引継ぎが未実施なら「Aで構築済み・HS引継ぎ待ち」とする。WIF不成立、ID不一致、配備・ログイン失敗、保護設定自体の未完了は「構築途中」とする。予定日を理由に判定を緩めない。保護の実証が残る場合は「提供前検証未完了」も併記し、利用開始可能とは報告しない。

### H：後日のHSへの引継ぎ

| 項目・担当 | 作業 | 完了条件・確認方法 |
| --- | --- | --- |
| H1・A／HS | HS管理ルールに沿った受入アカウント・回復担当を確定。同じProdへHSをオーナー招待し、HS本人が受諾 | 別ログインで同一プロジェクトID・オーナー権限・Firestore読取りを確認。必要な書込みは隔離した架空データで検証し後片付け。Aの保守権限を維持し、未受諾・反映待ちでは引継ぎ完了としない |
| H2・請求管理担当／開発者 | 未検証のAの既存請求先からHS側への変更を別途計画。現在・HS側の変更先の請求先ID、名義、支払・費用負担、両側の必要権限、影響・復旧手順を確認し、承認範囲で関連付けを変更 | 実関連付け・Billing有効・Blaze、HS側の請求管理アクセス、サービス継続を確認して初めて完了。オーナー追加の成功だけで請求移管成功としない |
| H3・HS／開発者 | HSアプリ管理者・通知／運用担当を設定し、管理引渡しを確認 | HSのログイン・回復担当、開発者の同等保守権限、通知経路が確認済み。IAM等の差分が影響するCI認証・サービス経路だけを再確認。WIF・Functions・バックアップ等の無関係な成功検査を無条件に再実行しない |

HSのアクセス確認前にAを外さない。ProdでAを外す場合は別途明示指示とし、今回の試験結果から自動実施しない。引継ぎが失敗した場合は既存のA管理を保ち、データを作り直さず原因と未完了工程を報告する。請求切替は別の影響・復旧判断が必要。組織所属は引継ぎ後も組織なしを維持し、将来の組織移行は別途承認・検証する。

### C：後日の業務利用開始までの残作業

| 項目・担当 | 作業 | 完了条件・確認方法 |
| --- | --- | --- |
| C1・開発者／HS | 承認済みの正式データ・マスタ・採番開始値を投入。検索・集計の準備処理を実行 | 原資料との件数・値・関連・採番を照合。準備印だけを先に作らず派生値と整合確認を完了。Dev全体や試験データをそのままコピーしない |
| C2・開発者 | 日次バックアップ30日保持・PITR・Auth退避の初回成功、非公開readback、障害／配備／退避失敗通知の到達、現行版との復元互換性・差戻しを実証 | 現行正本に従った対象版・実行結果・終了状態・実受信を記録。設定済みだけで復旧可能と扱わない。予算設定は既決定どおり後発で、金額・担当を確認して設定する |
| C3・HS／開発者 | 正常系・権限別の業務受入れ、修正後の影響範囲の再確認、確認用データの後片付け | HSが実業務の開始条件を確認。正式データ・採番に試験操作の残存影響がなく、確認用アカウントの扱いも明確 |
| C4・HS／開発者 | 運用担当、障害連絡、復旧時の承認・再開手順を確認し利用開始を決定 | C1〜C3と提供前必須条件が充足。H1〜H3の引継ぎ状態を確認し、未完了ならその範囲・担当・期限・暫定運用の可否をHS／オーナーが明示判断。未解決の必須事項がなく、利用開始判断・対象版・日付を既存運用記録へ残す |

各項目は未実施／実行中／成功／失敗／未確認を区別し、対象ID・設定実値・担当・日時・証拠・終了状態を既存の運用記録へ残す。新たな長期台帳は作らない。失敗時は成功済みの独立工程を無条件にやり直さず、変更で前提が失効した確認だけ再取得する。配備の差戻しとデータ復元は別操作であり、片方の成功を他方の証拠にしない。

請求先への関連付けはプロジェクト側だけでなく請求アカウント側の権限も必要。支払プロファイルの権限も別であり、Firebaseメンバー追加だけで請求管理をすべて委任できるとは扱わない。

## WIFの採用条件と通常配備

2026-10-13のオーナー指示により、GitHub Actionsの通常配備で開発者・HSの都度ログイン、認証コード入力、HSアカウントへの承認依頼を不要にする条件でWIFを採用する。初期設定後は、ActionsがジョブごとのOIDCトークンを取得してGoogle Cloudの短期認証へ交換する。短期認証を毎回取得することと、人が毎回認証操作をすることは異なる。長期サービスアカウント鍵をGitHubへ保存する方式を標準にはしない。

PRのレビュー、GitHub environmentの配備承認、初期IAM設定、個人端末でのCLIログインはWIFの自動認証とは別。WIFを理由にHSの都度配備承認を追加しない。別途採用する配備保護は、承認者・起動条件とGitHub契約上の可否を明記する。権限失効、信頼条件変更、認証障害時には保守対応が必要であり、永久に手作業が発生しない保証ではない。

受入条件は、B5の初回配備でFirestore／Functions／HostingのFirebase CLI経路が非対話で成功し、別の新規ジョブでも人のログインや前ジョブの資格情報なしに認証・対象への読取り照合が成功すること。認証確認だけのために同じ成果物を再配備しない。許可外branch・repositoryがProd認証を得られないことも、条件レビューと適切な拒否確認で検証する。トークン本文は記録しない。これらは予定する検証であり、現状のProdで確認済みではない。

WIFと採用CLIの組合せがこの条件を満たさない場合は、原因・影響・代替を報告して方式を再検討する。既存ADRの制限付き鍵方式を自動採用したり、都度対話認証を通常手順として受け入れたりしない。

## 権限付与の判断

Aが初期管理を担い、HSへの引継ぎ後はHSが最終管理権限を持つ。2026-10-08の開発者にHS管理者と同等の権限を付与する方針は維持する。CI配備主体・Functions実行主体への権限は別に設定し、プロジェクトIAMとSA個別IAMの双方を照合する。正確なrole集合は構築時・引継ぎ時に実値と必要操作で検証する。

権限を同等にする方針と、破壊的操作の実行承認は別である。IAM変更・SAへのなりすまし経路・バックアップと復旧を確認する。組織の外部招待制限がある場合は組織管理者に調整を依頼し、制限を勝手に無効化しない。

通常保守は付与済み権限内で開発者自身が行い、操作のたびにHSからIAM権限を再付与してもらう方式ではない。業務上の承認とGoogle側の認証・認可を混同しない。現段階は手順更新のみで、Prod構築・課金開始・秘密情報の受領は未実施。保険報告・更新の保留事項を自動実装する根拠にしない。

## 今回の文書更新と検証範囲

Prodに対する変更は本書・索引・関連仕様・ADRの所有／請求工程の整合のみ。アプリ・Actions・実Prod設定は変更しないためdocumentation-onlyとし、`scripts/check-governance.ps1` と対象差分・参照の検査を行う。単体・結合試験、build、配備はこの文書更新の完了条件に追加しない。別途承認された試験プロジェクトの操作結果は上記実証と区別して記録する。結果・独立した終了コードは本タスクの完了報告を証拠とする。保存契約・保護条件・WIF採用条件は維持する。

## 公式情報（2026-10-02確認）

- [Firebaseプロジェクトメンバー管理](https://support.google.com/firebase/answer/7000272?hl=en)：メンバー追加操作。
- [Firebase IAM](https://firebase.google.com/docs/projects/iam/overview)：プロジェクトへの権限付与。
- [Firebase IAM permissions](https://firebase.google.com/docs/projects/iam/permissions)：操作ごとの必要権限。
- [請求先の関連付け](https://docs.cloud.google.com/billing/docs/how-to/modify-project)：請求先とプロジェクト両側の権限。
- [Googleアカウント作成](https://support.google.com/accounts/answer/27441?hl=en-GB)：既存メールの利用。
- [組織の外部共有制限](https://docs.cloud.google.com/organization-policy/domain-restricted-sharing)：外部メンバーの制約。
- [Firestore所在地](https://docs.cloud.google.com/firestore/native/docs/locations)：作成後の所在地変更不可。

2026-10-13追加確認：[Google Cloudの配備パイプライン向けWIF](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)。GitHub OIDCから短期認証を取得する仕組みと、repository等の信頼条件。上記は本プロジェクトでの受入条件であり、公式資料の存在だけで設定完了とはしない。
