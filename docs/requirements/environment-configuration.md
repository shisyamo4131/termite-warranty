# Dev／Prod 環境設定・権限仕様

2026-10-14最新採用：改修→dev／Dev→mainともPR必須。包括検証は改修→dev PRに集約し、同一treeならdev統合後・Dev→main PR・main統合後で再利用。Dev自動配備とDev上での本人受入れ記録を連携する。2DB接続と保護falseを明示し、配備後5照合・PITR無効・日次予定0を確認する。実有効化・配備結果は[運用記録](../operations.md)を正本とする。以下のDev未切替は前段階の観測であり、有効化の成功を推定しない。

現在の実設定：dev cbec3c3／run38519554310 attempt4で自動配備・全5照合・保護停止確認が成功、Dev enable=true、development環境はdevのみ、dev/mainともPR必須。Dev配備SAの追加権限はScheduler get/update、実Functionsソースbucket1個のobjects.get、default DB条件のbackupSchedules.listだけ。既存権限を広いEditorへ置換しない。Devは日次予定0・PITR無効・automation=false・Scheduler PAUSED。Prod enable=true／保護false・他3値空を維持、今回Prod更新なし。本人受入れ待ちのdraft PR18はmain未統合。


2026-10-14現行方針：[通常配備手順](../runbooks/application-deployment.md)を後続作業の入口とする。Dev／Prodとも日次バックアップ・PITR・Auth退避等の設定／有効化はリリース直前まで保留し、HS試行後の確定スキーマで再検証する。Devの実読取りは日次予定0・PITR無効・21 Functions・automation=false。既存Auth退避先／検証情報の設定値は残存するが有効化しない。Prodは解除状態を維持。main→Prodは有効、devブランチ・Dev切替変数は未設定で、Dev自動配備は未切替。以下の古い再開時期・切替予定を現行設定と混同しない。

2026-10-14現行：main `fe910d7` の実pushで通常Prod配備・公開後の全5項目照合が成功。通常enable=true、公開版 `sites/termite-warranty-prod/versions/8a11a472a633bca4`、21 Functions ACTIVE。配備後も日次予定0・backup実体0・PITR無効・Auth退避先不存在・automation=false／保護入力空を独立読戻し。保護はHS試行後のスキーマ確認まで再開しない。[証拠](../operations.md#2026-10-14-main-push正常自動配備を実証現行)。

2026-10-14最新：包括承認で先行作成した保護設定は、HS試行に伴うスキーマ変更の可能性を理由とした本人の解除指示で取り消した。実読戻しは日次予定0・backup実体0・PITR無効・Auth退避bucket不存在・automation=false。バックアップ専用IAM／秘密値退避／通知設定は未実施。HS試行後にスキーマを確認して再設定する。現在目標はmain push正常配備に限定し、提供前保護要件は維持。[解除記録](../operations.md#2026-10-14-prodバックアップ設定の解除)。以下は先行工程の記録。

2026-10-14追記：承認済みPR #9をmain `44010df` へ統合し、実pushから通常配備。Hosting liveは `sites/termite-warranty-prod/versions/f523fd35d51c6809`、21 Functions・2DBアプリRules・業務索引22・Scheduler1を維持。直後Hosting照合は最大4回確認後も件数不一致で失敗し、通常enable=falseを読戻した。実CI成果物での独立読取りは5項目全一致、Hosting1005ファイル。保守基準版変数は `a377bd20176a2ac5` のまま。実関数のautomation=false／他3項目空、日次予定0・PITR無効を確認。Auth bucket作成は保留、未初期化・業務利用未開始。[証拠・未確定の件数内訳](../operations.md#2026-10-13-main更新による通常prod自動配備)。以下は先行記録。

2026-10-13現在：承認後に通常enable・保護パラメータ・provider版を登録。main `c5bad4f` の初回配備はappspot SAのactAs不足で配備前停止し、通常enable=falseへ戻して読戻し済み。保護パラメータはautomation=false／他3項目空、保守版・両DB全拒否を維持。既定SAのEditor除去・deployer限定actAsは追加承認後に適用。その再配備は業務DB索引22件まで進み、Cloud Billing API未有効で停止。enable=falseへ戻した。API先行有効化は承認待ち。[原因・実状態](../operations.md#2026-10-13-通常prod初回配備の停止と原因確定)。以下の未設定記述は先行記録。

2026-10-13実認証追記：main `c5bad4f` で運用専用workflowが成功。固定project／2DB metadata・SDK読取り・資格情報後処理を実証。空の初期化状態は未初期化として報告。通常アプリはmainへ統合済みだがenable未設定で未公開。[証拠](../operations.md#2026-10-13-通常prod配備の実行主体と基盤準備)。

2026-10-13 IAM追加承認後：通常配備の6 custom role・2DB条件・build source条件・指定4 SAのactAs・operator専用WIFを適用し読戻し一致。既定build Compute SAのEditorを除去し、logWriter・source読取り・東京gcf-artifacts writerへ限定。Docker repositoryは7日超image削除、GitHub production-operationsはmainのみ。5アプリSAに長期鍵なし。[実設定JSON](../../deliverables/production-bootstrap-2026-10-13/runtime-iam-plan.json)と[実行記録](../operations.md#2026-10-13-通常prod配備の実行主体と基盤準備)を現在値とする。以下のIAM未設定は先行工程の記録。保護設定は引き続き本人保留、実認証・通常アプリ公開は未実証。

2026-10-13 通常配備の後続準備：Prod Functionsの実行先を業務 `prod-business`、backup `prod-backup`、認証診断 `prod-diagnostics` の同project SAへ分けるLocal実装を追加。21 FunctionsのSDK定義は19／1／1に分離することを確認。Cloudの3 SAは個別承認で作成・所属／有効状態・権限なし・長期鍵なしを読戻し済み。通常配備に必要な6 APIも有効化済み。配備の実証ではない。既定build SAへGoogleが自動付与したEditorの縮小は残件。配備後はFunctionsとCloud Run service／revisionの実行SA一致を要求する。本人はmain自動配備とbackup環境の完成を目標に指定したが、具体的な日次backup／PITR／bucketの先行実行については保留を回答。実設定・境界は[最新手順](../runbooks/production-bootstrap-review.md#main自動配備バックアップ環境の完成目標2026-10-13)を参照。

2026-10-13 初回保守公開：承認済みmain `1564f07427b63a2d73776542eb28341d166c9d7a` からHostingだけを公開。現在の保守基準版は `sites/termite-warranty-prod/versions/a377bd20176a2ac5`。公開HTML・3ファイル・hash・配信設定・Web構成はGETで一致確認。公開直後のCI照合は失敗し、同じ配備SAでの独立読取り照合runは成功。追加調査でも原因特定に必要な詳細記録はなく、本人指示で「公開直後のタイムラグ」扱いとして調査終了（原因は未実証）。GitHubの `PRODUCTION_BOOTSTRAP_ENABLED` はfalseへ戻して読戻し済み。target JSONと承認revisionは記録として保持。新しい通常アプリ用のprovider version変数はまだ登録していない。[実行証拠](../operations.md#2026-10-13-初回保守公開と読取り照合)。

2026-10-13 初回保守公開の統合準備：公開用workflowはmain pushの包括検証後、`PRODUCTION_BOOTSTRAP_ENABLED=true` かつ `PRODUCTION_BOOTSTRAP_REVISION` が実行SHAに完全一致するときだけ公開jobを許可する。target JSONは確認済み9項目。変数登録・enable・実公開は別承認で、現時点では未設定。[限定統合・公開前後照合](../runbooks/production-bootstrap-review.md#初回保守公開の限定統合2026-10-13)。通常アプリのenable、既存SA権限、延期中の保護設定は変更しない。

2026-10-13公開準備：同日の管理API GETで `sites/termite-warranty-prod/channels/live` はHTTP 200・releaseなし。[対象9項目と静的成果物](../../deliverables/production-bootstrap-2026-10-13/README.md)をLocalに保存した。GitHub変数への登録・公開は未実施。運用SAの接続bindingなしを再確認。専用運用pool／environment・段階的権限とFunctions実行主体は[未承認案](../runbooks/production-bootstrap-review.md#公開準備統合レビュー運用権限案2026-10-13)であり、実設定表に採用済みとして加えない。

## 2026-10-13 main保護と認証試験の開始

オーナーが保護設定・認証関連4ファイル統合・認証専用試験を追加承認。PR #1の必須CI成功後、mainへPR必須・`Verify development deployment`（GitHub Actions App ID 15368）成功必須・最新main同期・管理者適用・force push／削除禁止・会話解決を設定し、読戻し確認。他者必須承認数は0。通常mergeで `97f95b2e173946b5ad07bfc34df831a8a8e5c358` へ統合。業務アプリ全体は統合しない。

初回試験の失敗を診断し、GitHub実設定のimmutable subjectとの不一致と拒否判定を修正。PR #2〜4も必須CI成功後に通常mergeし、main=`e5b9cb1605bba18deecdde534730186ed94925a1`。最終run `38376243684` で短期認証・別job再認証（各2回交換と対象GET）・production環境なしの属性条件拒否が全成功。資格情報本文は保存／出力しない。[実証・訂正記録](../operations.md#2026-10-13-main保護配備なし認証実証の完了)。Hosting siteは管理APIで `projects/termite-warranty-prod/sites/termite-warranty-prod`、defaultUrl `https://termite-warranty-prod.web.app`、既存Web app IDとの一致を確認。初回公開・通常配備・運用認証・期限切れrefresh・別repo／ref／event実拒否は未実証。以下のmain未保護／実認証未実施は当時の記録。

## 2026-10-13 Prod配備認証の初期設定

空基盤作成後の同日追加承認で実設定。GitHub APIでrepository ID `1363463339`、owner ID `72244713`、対象 `shisyamo4131/termite-warranty` を確認。gcloudでProdはACTIVE・project number `988295873733`・parentなし、2DBとも東京Native・PITR／削除保護無効を読戻し。Auth承認domainは `termite-warranty-prod.firebaseapp.com`、`termite-warranty-prod.web.app` と `localhost`。今回は変更していない。

| 項目 | 設定・読戻し結果 |
| --- | --- |
| 配備SA | `prod-deployer@termite-warranty-prod.iam.gserviceaccount.com` |
| プロジェクトrole | 配備SAに `roles/firebasehosting.admin` と `roles/serviceusage.serviceUsageConsumer` のみ。前者にFirebase project／client設定読取りを含む。DB実データを読める広いFirebase Viewerは追加しない |
| 運用SA | `prod-operator@termite-warranty-prod.iam.gserviceaccount.com`。プロジェクトrole・SAへの接続bindingなし。まだ運用可能ではない |
| WIF provider | `projects/988295873733/locations/global/workloadIdentityPools/github-production/providers/github`、ACTIVE。targetのaudienceはこの値へ `//iam.googleapis.com/` を前置 |
| issuer／制限 | `https://token.actions.githubusercontent.com`。repository／owner不変IDが上記と一致、ref=`refs/heads/main`、sub=`repo:shisyamo4131@72244713/termite-warranty@1363463339:environment:production`、eventはpush／workflow_dispatchだけ。初期設定の旧形式を同日の実認証診断後に訂正・読戻し |
| 属性mapping | google.subject=sub、attribute.repository_id=repository_id、attribute.repository_owner_id=repository_owner_id、attribute.ref=ref（右辺はいずれもassertion） |
| SA binding | 上記poolのattribute.repository_id=`1363463339` のprincipalSetだけに、配備SAの `roles/iam.workloadIdentityUser`。運用SAへのbindingなし |
| 長期鍵 | 両SAのuser-managed key一覧は空。作成しない |
| 必須認証API | IAM、IAM Credentials、STSを有効化。Resource Managerは既存有効 |
| GitHub production環境 | 新規作成、custom branch policyはmainのbranch 1件のみ。レビュー待ち／待機時間は追加しない。repository Actions variablesは空で、Prod CI未有効 |

実OIDC交換・短期token更新・別job認証・拒否試験・初回公開は未実証。mainはAPIのprotected=falseで、確認時SHAは `b45382f6ef92e9ab897cee59b1164766375aaa70`。production環境のmain制限はmain自体の変更保護とは異なる。保護方針、mainへのレビュー済みworkflow統合、認証だけを行う試験を次の承認単位にする。通常Functions／DB配備権限、Functions実行SA、運用SAの認証経路は残件。初期設定を通常アプリ配備可能と表示しない。既存9項目の識別子は揃ったが、実行用targetの登録／CI変数設定はまだ行わない。

信頼条件は[Google公式WIF手順](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)の不変ID利用・属性条件・SA偽装方式に沿って構成（同日参照）。構成読戻しと実認証の成功を区別する。以下の過去節の未設定記述は本節の範囲で更新する。

## 2026-10-13 Prod空基盤の実作成

オーナーがDevと同じ本人環境でのProd土台作成、下記名・ID、Firebase標準URL、Blazeと既存「Firebase のお支払い」への関連付けを承認。Chromeの実Firebaseコンソールで作成結果を確認した。請求先を後日切替可能であることは着手上の前提であり、移管実証ではない。個人メール・請求アカウントID・APIキーは記録しない。

| 項目 | 実確認結果 |
| --- | --- |
| project | `TermiteWarranty Prod` / `termite-warranty-prod` |
| project number / Web app | `988295873733` / `1:988295873733:web:bdb85668f28779d8f51cac` |
| Hosting site | `termite-warranty-prod` をWeb登録時に選択。アプリ配備・初回保守公開は未実施 |
| 業務DB / 制御DB | `(default)` / `recovery-control`、両方Standard、`asia-northeast1`。作成後に空DBの準備完了表示を確認 |
| 初期Rules | 両DBとも本番環境モードの全クライアントread/write拒否。アプリ用Rules・索引・protocol2初期化は未導入 |
| Authentication | 明示承認後、メール／パスワードのみ有効を読戻し。メールリンクは無効のまま。ユーザー・アプリ権限は未作成 |
| 保護 | オーナー回答「DBだけ作成し、保護設定は後で行う」により日次backup・PITRは有効化しない。正式提供前の保護要件は維持 |

Gemini・Analyticsは追加せず、新規予算設定も未実施。組織なしは採用済み方針だが親組織の実読戻しは未了。Storage bucketはSDK構成文字列だけでは存在確認としない。SA／WIF／IAM、APIキー制限、削除保護、必要APIの網羅照合、Auth domain／メール送達、保守基準版は残る。target全9項目が未成立のため実行用JSONはまだ作成しない。以下の過去節の「実Cloud未実施／実ID未確定」は本節の範囲で更新する。[実行記録](../operations.md#2026-10-13-prod空基盤の先行作成)。

## 2026-10-13 CI切替準備・実入力の現在地

Local workflowにDevのmain／dev切替条件と排他を追加。DEVELOPMENT_BRANCH_DEPLOY_ENABLED=trueでdevだけへ切替、Prod有効時は旧main→Dev手動経路も閉鎖。GitHub設定・実配備なし。実入力項目・担当・取得元・照合条件と会社情報設定順は[Prod手順](../runbooks/production-bootstrap-review.md#ci切替と実行順の最終レビュー2026-10-13)へ集約。後の設定対照表にある旧実装状況は当時の記録。実現場のrole・ID・保護機能の確認を完了とは扱わない。

2026-10-13運用対応：Prodの運用CLIでは `operatorIdentity` のaudience／serviceAccountを配備targetとは別に明示する。運用SAとCI配備SAの同一指定を拒否。実WIF／IAMは未設定で、操作別の最小権限はCloud実証事項。通常配備bundleは `TERMITE_PRODUCTION_PROJECT_NUMBER` をFunctionsへ渡し、Auth退避bucketの所属projectを照合する。初期管理者は照合済み既存Auth UIDに結び付け、権限・メール不一致を拒否する。[実手順](../runbooks/production-bootstrap-review.md)。

2026-10-13後続実装：画面buildは `TERMITE_DEPLOYMENT_ENVIRONMENT=production`、`TERMITE_PRODUCTION_PROJECT`、`TERMITE_PRODUCTION_APP_ID` を要求し、Hostingのproject／appId／messagingSenderIdを照合する。Functionsもproduction指定と実行先projectの一致、Emulator設定なしを必須とする。未設定時のDev／Localは維持。通常Prod CIは明示enable・実target・保護設定・過去基準版が必要で未有効化。設定手順は[Prod手順](../runbooks/production-bootstrap-review.md)、実証の境界は[運用記録](../operations.md)。実Prod IDを仮定した許可は追加していない。

2026-10-13追加：認証・初回公開照合のLocal準備を[事前構築ロードマップ](../roadmaps/production-readiness.md)で管理。実Prod識別子・権限・WIFは未設定／未実証。Dev照合の読取操作に明示的ADCを追加し、Prodの初回保守表示専用の読取入口を実装。対象JSONは実値確定まで作らず、配備先を仮定しない。

## 2026-10-13 全件読取り削減の追加導入

Devソース0dd655c2d670ddddfb18403aa23dfb8c0db76270、公開版sites/termite-warranty-dev/versions/e90487f9ea2b4646を正式照合。必要22索引READY、Functions21、Hosting1,005ファイル一致。normal世代13を維持し、insuranceNoticeQueries.version=1と442物件の検索用2項目を追加、その他の業務値は保持。初期投入・復旧では専用投影と準備印を一体で照合し、未準備時に全件取得へ戻さない。[実行・受入記録](../operations.md)。Prodへの設定・実行は未実施。

2026-10-08 オーナー指示による構築照合仕様。Prod構築・権限付与の実行承認ではない。Devの実設定は同日14:32 UTCに管理APIを読み取り確認。設定変更はしていない。秘密情報・個人メールは記録しない。

## 2026-10-12 月別一覧の追加導入

月別3一覧の新版 `19adab6cd04cb2aad8200f3310ff8d0000e47430` をDevへ配備し、公開版 `sites/termite-warranty-dev/versions/b65719c70e30d2d2` を正式照合した。必要索引20設定READY、Functions21ソース、Hosting1,005ファイル一致。normal世代13を維持する。既存442物件へ報告済み保険を検索する派生2項目を補完し、`prototypeSettings/insuranceReportQueries.version=1` を公開。その他の業務値・アカウント・所属・HSC次番号100は不変。新準備印だけの増加で業務文書は778、保持スタッフは別に3。[検証・実行記録](../operations.md#2026-10-12-月別3一覧の実装dev導入)。

今後の初期データ投入・旧復元像では、新準備印だけを先に作らず、全物件の追加派生値を再計算・照合してから公開する。新準備印がない旧復元像は従来機能を維持し、新しい報告済み表示だけが閉じる。Prodへの対象許可や構築完了を意味しない。

## 2026-10-10 Dev追加導入

同日追加：過去物件の実取込みで業務データを初期化し、442物件・776業務文書・保持スタッフ3へ更新。保険・集計等の準備印は初期取込み世代11・同じ実行IDで再作成し、確認用公開はverification・世代12。Functions21／Hosting1,005ファイルの正式照合成功。その後の別了承でnormal・世代13へ通常再開済み。操作検証の架空1物件は追加指示で物理削除済み。実442件は不変、HSCの次番号100へ復帰。下記315件・世代10は初期化前の記録である。[実行記録](../runbooks/historical-property-intake.md#2026-10-10-通常再開残る開発検証)。HS試験は未完了。

ダッシュボード・期間別保険状態をDevへ導入。315件を変換・照合し、`prototypeSettings/insuranceStates` と `prototypeSettings/dashboard` はversion=1、同じ移行実行ID・世代10を持つ。4集計索引READY、関連3 FunctionsとHostingの実配備一致を確認。実測・コマンド・検証の残件は[運用記録](../operations.md)を参照。下記の10月8日時点の設定表に対する追加である。

将来の新環境構築でも、保険状態と集計用項目の検証を完了してから上記2つの準備印を公開する。旧バックアップからの復元も同じ検証対象。Dev専用の変換コマンドを未確定のProdへ流用しない。IAM・Auth・バックアップ設定は今回変更していない。

## 再現と完了の条件

同じソースの配備だけでは、IAM、Auth、課金、制御DB、バックアップ、通知先は再現できない。本書と[構築手順](../runbooks/production-bootstrap-review.md)を構築チェックリストとする。各行について対象ID、設定実施者、実施時刻、取得した実値、期待値との差分、確認コマンド／APIと終了状態を非秘密の構築記録に残す。未確認・未設定を完了へ置き換えない。

DevとProdは別プロジェクト。Dev例外（自動退避停止等）をProdへコピーしない。Prod ID・Web App ID・Hosting site・配備主体・実行主体は作成時に実物と照合して確定する。個人アカウントの実メールと資格情報は外部の管理台帳で保持する。

## 設定対照表

| 項目 | Dev実値／根拠 | Prod要件・構築後の照合 |
| --- | --- | --- |
| 所有・課金 | `termite-warranty-dev`、開発者所有、Billing有効 | 2026-10-13採用：Aで組織なしの別Prodを先行構築し、後日HSへ引継ぎ。初期請求先はAの既存Cloud Billingを使用し、後日HS側へ変更する。実行前に既存請求先の実ID・利用権限を照合し、設定後にBilling有効／Blazeを確認。オーナー交代はSpark試験で実証、請求先変更は未検証。工程・完了条件は[Prod手順](../runbooks/production-bootstrap-review.md)のB／H。予算設定は後発 |
| 業務DB | `(default)`、Native、`asia-northeast1` | 同所在地・同種別。Firestore databases GETで照合 |
| 制御DB | `recovery-control`、同所在地、削除保護有効 | 業務DBとは独立した制御DBを構築。IDをパラメータ・運用台帳と一致させる |
| 業務DB削除保護 | 無効 | Prodでの設定値は構築時に確定。未決のまま提供判定しない |
| Rules／索引 | `firestore.rules`／`firestore.indexes.json`。制御DB用Rulesは別release | 両DBのRules releaseと必要索引READYを実照合。通常firebase deployだけで制御DBの設定完了としない |
| 復旧初期状態 | 固定接続(default)、独立control、protocol 2 | 実runtimeとmarkerのDB・世代・phase一致、初期normal、不要なロック／leaseなし。正式preflightの全項目が成功 |
| Functions | 東京、Node.js 22、21関数ACTIVE | ソースのexportsと実関数一覧を照合。各関数の実行主体・パラメータ・制限も照合 |
| Functions制限 | 通常maxInstances 20／timeout 60秒。CSV300秒。認証診断2／10秒 | 現行ソースの値を適用し、Cloud Functions GETで照合。変更は別途判断 |
| Web／Hosting | Firebase Web app・Dev site。ヘッダー等は`firebase.json` | Prod専用登録と設定。ビルド成果物と公開ファイルhash、設定、配備版の正式照合 |
| 環境ガード | 現コードはLocal／Devだけを許容 | Prod ID確定後、`nuxt.config.ts`、Firebase plugin、Functions runtime、復旧CLIの許容対象を変更・全検証。ID文字列の置換だけで済ませない |
| Authentication | Email/password有効、passwordRequired true、tenant無効 | 同方式。Identity Platformへ切り替えない。管理APIで照合 |
| Auth承認ドメイン | localhost、Dev firebaseapp.com／web.app | Prod公開ドメインを登録。不要なDevドメインを引き継がない。パスワード設定／再設定を実メールで検証 |
| 認証メール | Firebase標準送信、同一サイト`/auth/action` | Prod action URLを設定し日本語ページ・一回限りコード・期限切れを確認。独自SMTP／差出人変更は後発 |
| Auth診断 | ブラウザ失敗をFunctionsログへ送信。Auth requestLogging未有効 | 同じ実装を配備し診断実受信を確認。サービス切替は行わず、原因未特定はHSC-041で継続 |
| APIキー制限 | Browser keyはAPI制限あり、参照元制限なし | Prod専用キーのAPI制限と公開サイト動作を照合。秘密鍵と区別。参照元制限採否は構築時に確定 |
| 日次バックアップ／PITR | Devの承認済み停止例外 | 構築後、提供前に日次30日保持・PITR・Auth退避・開発者への失敗通知を有効化。初回成功、非公開readback、復旧互換性まで確認 |
| 復旧パラメータ | 全関数`RECOVERY_CONTROL_DATABASE=recovery-control`、`RECOVERY_BACKUP_AUTOMATION=false` | Prod control ID、私有Auth退避bucket、hash設定・通知検証証拠を設定。自動取得は開始条件を満たしてtrueへ。秘密／証拠本文はリポジトリへ保存しない |
| Monitoring | 有効alert policy 1件、条件1件、通知channel 1件 | 通知先はオーナーGoogleアカウント。条件本文・送達は別途実照合。件数一致だけで完了としない |
| 配備CI | development environment、専用SA秘密`FIREBASE_SERVICE_ACCOUNT_TERMITE_WARRANTY_DEV`、手動dispatch時のみdeploy。7検証後の成果物を使用 | ID・認証方式が確定してから専用workflowを作成。Dev秘密を流用しない。認証主体、environment保護、競合防止、差戻しを検証 |
| アプリ初期管理者 | Authと同UIDのenabled staffAccounts、roleで認可 | 受領済みHS氏名・メールを外部資料台帳で照合。HS管理者と開発者を各自作成。実ログインと権限範囲を確認。初期業務データは前準備待ち |
| 検索用派生値 | 保険／請求は307件補完時の12条件一致を確認済み。保証書certificateQueries・請求billingQueriesは各ready1、315件補完済み。導入状況を[保証書記録](../design/warranty-certificates.md)で管理 | 空DBを確認したうえでprototypeSettings/monthlyQueries・certificateQueries・billingQueriesを各version=1で初期化。データ投入後・旧復元時は保険／請求・保証書の全投影を検証してから公開。現行移行CLIはDev／Local専用であり、Prodへ流用せず構築時に対象固定の手順をレビューする |

## 権限の対照

クラウドIAMとアプリのroleは別物。人への権限とサービスアカウントへの権限も別に検証する。

| 主体・対象 | Devで確認した付与 | Prodでの扱い |
| --- | --- | --- |
| 開発者／プロジェクト | `roles/owner` | 初期はAがオーナー。HS引継ぎ時にHSと開発者の実role集合が同等であることを確認。試験での旧A削除をProdへ適用しない。組織・請求側の権限は別確認 |
| CI配備主体／プロジェクト | cloudfunctions.admin、datastore.indexAdmin、datastore.user、firebasehosting.admin、firebaserules.admin | 配備用主体を特定して同じ必要操作を実証。プロジェクトIAMだけでなくSAへのactAs等の個別bindingを必ず確認 |
| Functions実行主体／プロジェクト | editor、datastore.backupsViewer、独自`recoveryAuthHashReader` | Devの広いeditorを無条件コピーしない。業務DB操作・Auth管理・退避に必要な権限と独自role定義を構築時に確定し、実操作で検証 |
| Firebase SDK管理SA | firebase.sdkAdminServiceAgent、firebaseauth.admin、iam.serviceAccountTokenCreator | Firebase作成の主体と追加bindingを区別。対象SAと呼出元を照合 |
| その他のSA | editorを持つ別SAが2件存在 | 用途／現役判定が未完了。Prodへ転記しない。必要と判定した主体だけを登録 |
| サービスエージェント | Artifact Registry、Cloud Build、Functions、Scheduler、Firebase、Rules、Firestore、Cloud Run等の専用role | 有効APIが生成した実主体に正しい専用roleがあるか照合。人やCIへサービスエージェントroleを代用付与しない |
| HS／開発者／工務店のアプリ認可 | staffAccounts／constructionCompanyAccountsで認可 | Cloud Ownerだけではアプリ権限を満たさない。Auth UID、enabled、role、工務店／本支店scopeを実確認 |

## 未完了の棚卸し

復旧パラメータの正確な設定キーは`RECOVERY_CONTROL_DATABASE`、`RECOVERY_BACKUP_AUTOMATION`、`RECOVERY_AUTH_BACKUP_BUCKET`、`RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE`、`RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE`。`functions/recovery-runtime.js`／`functions/recovery-backups.js`を正本とし、Prodで証拠と設定を新規に対応付ける。Devの証拠文字列をコピーしてProdの検証済みと扱わない。

プロジェクトIAM・Auth・Functions・DB・Rules releases・有効API・Billing・alert件数・APIキー制限をAPIで確認済み。ページ続きなし。14:37 UTCに追加確認：実行SAへのserviceAccountUser bindingあり。Auth退避bucketは東京・uniform有効・publicAccessPrevention enforced、実行SAへobjectCreatorと専用metadata reader、開発者へstorage.admin。hash読取用独自roleは`firebaseauth.configs.getHashConfig`のみ。Cloud Loggingの_Defaultは30日保持、除外0件。

SA個別IAM・親組織・GitHub保護の追加照合は下記2026-10-09節を優先する。通知先の本人照合・実受信、CI秘密が実際に指す主体、サービス管理主体の内部IAMは引き続き未確認。これらの不足を残したまま「Prodで同一設定を再現済み」とは扱わない。

有効APIにはBigQuery等、現在アプリが必要とする証拠のないものも含まれる。全APIをProdへ複製しない。Firebase／Hosting／Rules／Firestore／Auth／Functionsとその配備基盤、IAM／監視／ログ／復旧で実使用するAPIを構築記録に対応付け、残りは必要性が判明してから追加する。

Prod実ID、公開URL、組織制約、CI方式・主体、実行主体、請求先関連付けは未確定。HS管理者のメール／氏名は受領済みであり、再提出待ちにはしない。仕様の存在だけでは設定完了を保証しない。実設定の読戻しと配備・認証・業務・復旧の受入証拠を揃えて提供を判断する。

## 2026-10-09 Dev設定・権限の追加照合

オーナーの「確認→設定仕様書へ反映」指示により、10:01 JSTにCloud管理API、続いてGitHub APIを読取専用で確認。IAM・通知・GitHub設定は変更していない。認証情報・個人メールは出力せず、主体を役割で対応付けた。

| 照合対象 | 確認結果 | Prodへの反映条件 |
| --- | --- | --- |
| Dev所属サービスアカウント | IAMの実一覧4主体、すべて有効。各主体の個別IAMを取得成功。Firebase SDK管理・配備用は個別bindingなし。Functions実行用と別editor主体には配備用主体のserviceAccountUser bindingあり | プロジェクトroleと個別actAsを両方照合。今回一覧にない主体へ推測で権限を付けない |
| Functions実行主体 | 全21関数が同じ実行主体を使用。editor・datastore.backupsViewer・独自recoveryAuthHashReaderを確認 | Devのeditorを無条件に複製せず、Prodで必要な操作を検証。別editor主体はFunctions未使用だが、他用途まで不要と断定しない |
| プロジェクトIAM内のその他主体 | サービス管理用など、上記一覧外12主体。ワイルドカードprojectによる識別照会は11主体403、1主体404 | 403を不存在と解釈しない。管理主体の内部IAM、404主体の現役判定は未確認として残す。今回削除・整理なし |
| 親組織・継承 | getAncestryは当該projectのみ。祖先folder／organizationなし。listOrgPoliciesは空、ページ続きなし | Devに祖先から継承するIAMはない。組織ポリシー未設定は全サービス制約なしの意味ではない。Prodの実際の所属で再照合 |
| 直近の配備主体 | 10月8日のCloud Functions更新監査ログは現在のCLI操作者。最新ログ時刻14:49:56 UTC。GitHubの最新手動配備成功は9月18日、run 35303604261 | 現在のDevをGitHubの最新配備だけで説明しない。CI用秘密の内容は取得せず、現在の秘密が指す主体の実証は次回正規配備で確認 |
| GitHub development環境 | protection_rulesは空、deployment_branch_policyはnull。mainの旧ブランチ保護は404「Branch not protected」、repository rulesetsは空 | 現在はレビュー承認・environment側ブランチ制限なし。ローカルworkflowは手動dispatch時だけ配備だが、Prodの保護条件は別途設定・実証する |
| 失敗通知条件 | 有効policy 1件、ログ条件jsonPayload.recoveryBackupFailure=true。メールchannel 1件、有効。通知間隔300秒・自動close86400秒 | 通知は復旧バックアップ失敗用で、全アプリ障害の通知ではない。Prodで条件・宛先・到達を照合する |
| 通知先と到達 | 設定メールは現在のFirebase CLIログインメールと一致しない。オーナーが意図する別Googleアカウントかは未確認。verificationStatusの値なし | 誤設定とは断定せず、オーナー指定先と非公開照合し、実通知の受信確認を残す。今回通知送信・メール変更なし |

証拠：`node tmp/environment-followup.mjs` exit 0（監査ログは最新100記録の限定取得・続きあり。IAM／Functions／監視等の一覧は続きなし）。`gh api repos/shisyamo4131/termite-warranty/environments/development`、同workflow手動実行履歴、repository rulesets取得は各exit 0。main/protectionの照会はexit 1・HTTP404の明示応答を「保護なし」の根拠とした。初回の通常sandbox内GitHub接続は失敗し、ネットワーク許可付きの再照会で成功。成功コマンドと区別する。

API解釈はGoogle公式の[サービスアカウントIAM取得](https://docs.cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts/getIamPolicy)、[祖先取得](https://docs.cloud.google.com/resource-manager/reference/rest/v1/projects/getAncestry)を照合。主体の403／404から存在や権限を補完しない。追加取得結果はignored `tmp/environment-followup.json`。本節はDevの照合記録であり、Prod設定完了や通知到達の証拠ではない。
