# Dev／Prod 環境設定・権限仕様

2026-10-08 オーナー指示による構築照合仕様。Prod構築・権限付与の実行承認ではない。Devの実設定は同日14:32 UTCに管理APIを読み取り確認。設定変更はしていない。秘密情報・個人メールは記録しない。

## 再現と完了の条件

同じソースの配備だけでは、IAM、Auth、課金、制御DB、バックアップ、通知先は再現できない。本書と[構築手順](../runbooks/production-bootstrap-review.md)を構築チェックリストとする。各行について対象ID、設定実施者、実施時刻、取得した実値、期待値との差分、確認コマンド／APIと終了状態を非秘密の構築記録に残す。未確認・未設定を完了へ置き換えない。

DevとProdは別プロジェクト。Dev例外（自動退避停止等）をProdへコピーしない。Prod ID・Web App ID・Hosting site・配備主体・実行主体は作成時に実物と照合して確定する。個人アカウントの実メールと資格情報は外部の管理台帳で保持する。

## 設定対照表

| 項目 | Dev実値／根拠 | Prod要件・構築後の照合 |
| --- | --- | --- |
| 所有・課金 | `termite-warranty-dev`、開発者所有、Billing有効 | HS所有の別プロジェクト。受領済みHS管理者メールをメンバーへ関連付けた後に請求登録。Billing APIで有効を確認。予算設定は後発 |
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
| 検索用派生値 | Dev307件補完・準備完了marker=1・月切替12条件のDB／実画面一致を確認済み | 新規空DBでは準備完了markerを構築手順で設定。初期データ登録・旧復元時には[月別検索移行](../design/monthly-queries.md)を実施 |

## 権限の対照

クラウドIAMとアプリのroleは別物。人への権限とサービスアカウントへの権限も別に検証する。

| 主体・対象 | Devで確認した付与 | Prodでの扱い |
| --- | --- | --- |
| 開発者／プロジェクト | `roles/owner` | オーナー指示はHS管理者と同等。HS管理者と開発者の実role集合が一致することを確認。組織・請求側の権限は別確認 |
| CI配備主体／プロジェクト | cloudfunctions.admin、datastore.indexAdmin、datastore.user、firebasehosting.admin、firebaserules.admin | 配備用主体を特定して同じ必要操作を実証。プロジェクトIAMだけでなくSAへのactAs等の個別bindingを必ず確認 |
| Functions実行主体／プロジェクト | editor、datastore.backupsViewer、独自`recoveryAuthHashReader` | Devの広いeditorを無条件コピーしない。業務DB操作・Auth管理・退避に必要な権限と独自role定義を構築時に確定し、実操作で検証 |
| Firebase SDK管理SA | firebase.sdkAdminServiceAgent、firebaseauth.admin、iam.serviceAccountTokenCreator | Firebase作成の主体と追加bindingを区別。対象SAと呼出元を照合 |
| その他のSA | editorを持つ別SAが2件存在 | 用途／現役判定が未完了。Prodへ転記しない。必要と判定した主体だけを登録 |
| サービスエージェント | Artifact Registry、Cloud Build、Functions、Scheduler、Firebase、Rules、Firestore、Cloud Run等の専用role | 有効APIが生成した実主体に正しい専用roleがあるか照合。人やCIへサービスエージェントroleを代用付与しない |
| HS／開発者／工務店のアプリ認可 | staffAccounts／constructionCompanyAccountsで認可 | Cloud Ownerだけではアプリ権限を満たさない。Auth UID、enabled、role、工務店／本支店scopeを実確認 |

## 未完了の棚卸し

復旧パラメータの正確な設定キーは`RECOVERY_CONTROL_DATABASE`、`RECOVERY_BACKUP_AUTOMATION`、`RECOVERY_AUTH_BACKUP_BUCKET`、`RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE`、`RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE`。`functions/recovery-runtime.js`／`functions/recovery-backups.js`を正本とし、Prodで証拠と設定を新規に対応付ける。Devの証拠文字列をコピーしてProdの検証済みと扱わない。

プロジェクトIAM・Auth・Functions・DB・Rules releases・有効API・Billing・alert件数・APIキー制限をAPIで確認済み。ページ続きなし。14:37 UTCに追加確認：実行SAへのserviceAccountUser bindingあり。Auth退避bucketは東京・uniform有効・publicAccessPrevention enforced、実行SAへobjectCreatorと専用metadata reader、開発者へstorage.admin。hash読取用独自roleは`firebaseauth.configs.getHashConfig`のみ。Cloud Loggingの_Defaultは30日保持、除外0件。

SA個別IAMは一部がHTTP404のため全主体照合は未完了。次は配備主体が現行かどうか、通知先の実受信、組織の継承IAM・制約、GitHub environment保護を構築時に確認する。プロジェクトIAM一覧だけでは保証できない。これらの不足を残したまま「Prodで同一設定を再現済み」とは扱わない。

有効APIにはBigQuery等、現在アプリが必要とする証拠のないものも含まれる。全APIをProdへ複製しない。Firebase／Hosting／Rules／Firestore／Auth／Functionsとその配備基盤、IAM／監視／ログ／復旧で実使用するAPIを構築記録に対応付け、残りは必要性が判明してから追加する。

Prod実ID、公開URL、組織制約、CI方式・主体、実行主体、請求先関連付けは未確定。HS管理者のメール／氏名は受領済みであり、再提出待ちにはしない。仕様の存在だけでは設定完了を保証しない。実設定の読戻しと配備・認証・業務・復旧の受入証拠を揃えて提供を判断する。
