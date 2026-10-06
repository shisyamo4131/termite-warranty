# バックアップ・復旧のLocal実装・検証

## Dev切り戻し実行（2026-10-06、進行中）

オーナーは具体的な実行範囲の提示後、「どんどん進めてくださいと指示したはずです。私の作業が必要な場面で手順を示してください」と続行を指示。この回答を、直前に提示したDev一時停止・最新像保全・18 Functions／Hosting／Rules／indexes再配備・停止後0差分の場合だけ(default)へ移行・開発側検証・HS確認待ちで停止する範囲の実行承認として扱う。通常再開は別了承後。差分発生時の業務反映、Auth変更、IAM変更、旧DB削除は追加しない。

実行版HEADは`02bf34fa5bdb2112c58642f5c88a24b5b7031ccf`。A〜Dの間はHEADを固定し、記録だけを更新して再開までコミットしない。実Devの対象・世代・停止状態は実行直前に再照合する。進行中の段階は成功と記録しない。

## 続行：固定(default)の実配備照合・実行準備

状態：2026-10-06オーナーの続行指示に基づくLocal実装・最終全7ゲート・独立レビューを完了。Devの停止・配備・データ反映は未実施。実行承認と、C後の利用者確認／別再開了承は未取得。Authの実取込・実ログイン検証は従来の未完了範囲を維持する。

実装対象は、実Dev用の明示的な読取／実行コマンド、現行版・DB・世代・source・運用lockの照合、Rules/indexes／Functions source・Run revision／Hosting公開成果物の照合、ビルド入力と成果物の結合、およびDB間の中断状態を照合した再実行。資格情報・archive本文・実アカウントの値は証拠へ記録しない。独立レビューで検出した封印前marker不正受理、旧marker互換性、古いHosting成果物受理を修正対象とした。

実ビルド2回の比較で、buildId／manifest timestamp固定後にも8 HTMLの`prerenderedAt`が変化することを確認（比較exit 1）。完成証拠には使わず、追加修正・再比較を要する。既存CIとのbyte再現性は未検証で、今回の復旧配備は同一Local環境の専用profileに限定する。通常CIのartifactを新方式の配備照合成功とは扱わない。

修正後に同じLocal環境で実Nuxt generateを2回実行し、991公開ファイルのpath／byte SHA256が全一致（exit 0、比較hash `f64c7e5038f3601a9012954266869a0665bbe9bc744e5af21ffcc08d142d91a4`）。既知SPA payloadの`prerenderedAt`はtruthyな固定値1とし、manifest timestampは0、buildIdは確認したHEADとした。この比較では未コミットソースを許すrepositoryテスト注入を明示的に使用したため、clean HEAD／実配備一致の証拠ではない。コミット後の実読取コマンドでは実Git gateを必須とする。

### 読取だけで確認したDev

- 14:23:53 JST、source `recovery-drill-20261006`と(default)は各54業務文書、型付きhashは`85436d953ae39c56c5dfaa64235467b48728394839e535a4ada7c16cb8a21400`。正規化set/delete各0、現在権限一致、発行済み上限16、再開時刻03:54Z以後の業務updateTime 0、更新リース0／operator lockなし。非atomic比較であり、停止後の再観測と封印を要する。
- 14:28:53／14:32:29／14:38:36、`termite-warranty-dev`の18 FunctionsはACTIVE・control設定`recovery-control`・source保存世代あり。Hosting実サイトは同projectの`termite-warranty-dev`。1関数のRun最新ready/created revision一致・配信100%、live Hosting FINALIZEDを読取確認。これだけで全Functions source／新方式の配備成功とは扱わない。
- 14:38:36のAPI確認でsource/default/controlはFIRESTORE_NATIVE／asia-northeast1。source/defaultはPITR有効・日次30日予定各1、controlは削除保護有効／PITR無効／予定0。business DBの削除保護設定は無効だが削除操作は今回対象外。実管理バックアップは0件で、初回生成とそこからの復元は未確認。
- 上記読取コマンドはいずれもEXIT 0。データ本文・秘密・環境変数全体は出力していない。停止・書込・配備なし。
- 14:46:29 JST、1関数の保存世代を指定した実source ZIPをメモリ内で解析し、36ファイルと既存entrypointを確認。新固定runtimeのdomainは未収録で、現配備が新方式ではないことを確認。archive本文は保存・出力しない。解析器の実形式対応の証拠であり、新版全18関数の一致証拠ではない。

### 最終検証と残件

混合変更（application／migration／build／verification policy）の全7ゲートを選択、省略なし。最終コードに対するコマンド完了とexitを個別に確認した。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 233件、231成功・既存Windows symlink関連2スキップ・失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功。既存Nitro外部参照等の警告あり | 0 |
| `npm run test:rules` | 架空demoのみ、107成功・失敗0・スキップ0 | 0 |
| `node scripts/check-functions-syntax.mjs` | 28モジュール成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | common 3.0.0／生成policy summary整合 | 0 |

独立レビューFIXED-FINAL-DELTA-10は凍結ソースにP1/P2残件を検出せず終了。先の指摘（封印前marker、旧形式互換、中断CAS、停止前drain条件、Hosting鮮度／非決定性）は修正・対象回帰済み。レビューは試験・実環境受入の証拠とは分ける。追加4unitファイルは`npm test`へ包含。verification policyのoperator helper失効範囲を`default-recovery*.mjs`へ広げ、正しいv3 managed syncで生成summaryだけを同期した。common contract・AGENTS・権限は変更していない。

所有コード／設定／試験15ファイル（nuxt.config.ts、package.json、governance/verification-policy.json、scripts/default-recovery.mjs、scripts/build-recovery-release.mjs、scripts/lib/default-recovery{,-admission,-build,-preflight,-release-proof}.mjs、test/emulator/default-recovery.test.mjs、test/default-recovery{-admission,-build,-preflight,-release-proof}.test.mjs）の生バイトSHA256をpath順で`path:hash`、LF連結・終端LFなしで結合したSHA256：`f75f38275d84f79dbccd9b70b24073029b4ed582373745ed485f45268994b6dd`。基点HEADは`b8efee19a3360ce566de540975c2a3f1f46ca806`。以後の文書更新はcode evidenceを変更しない。ガバナンス／diff検査は記録確定後にも再実行する。

変更文書は本記録、固定DB設計、runbook、仕様の実装状態、技術改修台帳、changelog、およびoperationsの生成policy block。確定業務要件・schemaは変えていないため仕様version／業務data contract／ADRは変更しない。新文書を追加せず既存indexリンクを使う。全体進捗の加点なし。既存のdocs/README.mdとoperationsの生成block外の変更は所有範囲外として保持し、コミットへ含めない。

実Devの途中配備失敗予行、大容量／実課金計測、全fault境界、実管理バックアップ復元、実Auth復元後ログインは未検証。実Dev切り戻し・HS受入・通常再開も未実施で、本Local完了とは区別する。

[実行範囲・利用者確認手順](../default-database-recovery.md#次のdev実行範囲と利用者確認)を準備。現在source最新像を維持し、0差分なら業務文書set/delete 0。停止後に差が生じていた場合は具体差分の別承認まで反映しない。HS確認待ちに達した時点で利用者へ報告して停止し、別の再開了承前にDへ進まない。

### コミット後の正式Dev読取照合

所有22ファイルを`5a6743bb1c81d274935d7ad537bd6b6eb7ec632e`へLocalコミットし、未所有docs/README.mdとoperations本文の変更を残した。pushなし。

`node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --source recovery-drill-20261006 --generation 4 --revision 5a6743bb1c81d274935d7ad537bd6b6eb7ec632e --site termite-warranty-dev --dev-inspect`はexit 0。実Git gateでclean runtime／HEADを確認して専用profileを生成、DevはGET／読取のみ。10検査中6 pass（Git、runtime clean、3DBのidentity/location、normal generation4 protocol1、リース0／lockなし、control Rules）。4 blocked（default新Rules、default新indexes READY、新Functions source／Run、Hosting全成果物）。旧版が稼働しているため、新方式の配備完成とは判定しない。`writesPerformed=false / cloudWrites=false / liveMutationAvailable=false / ready=false`。

15:01:15 JSTに業務像も読取再照合（exit 0）。source/default各54、型付きhashは先の値と同一、正規化set/delete各0、現在権限一致、採番上限16、再開後の業務updateTime0、更新リース0・operator lockなし。稼働中の非atomic比較で、停止後の封印を省略しない。

本追記だけはdocumentation-only。コードmanifestは変わらず全7のコード証拠を保持し、governance-check／diff-checkを再実行する。後続の記録コミットでHEADが変わるため、実配備・実操作ではその時点の実HEADを再確認し専用profileを生成する。今の観測版を別revisionの配備証拠へ流用しない。次の承認範囲は「一時停止→最新像保全→18 Functions／Hosting／Rules／indexes再配備→停止後も差分0ならdefault移行→開発側検査→HS確認待ちで停止」。差分発生・失敗なら停止維持し報告。業務データの上書き／削除、Auth変更、IAM変更、旧／一時DB削除、通常再開はこの候補範囲へ追加しない。

- 日付：2026-10-06
- 状態：初期実装のLocal全7ゲートと限定画面確認を完了。クラウド運用開始・Dev配備／予行・Auth取込の完了記録ではない。
- 承認：オーナーの「バックアップ・復元について他に確認すべきことがなければ実装開始」。採用済み運用は[仕様](../../specification.md#2026-10-06-バックアップ復元の対象範囲)と[ADR0032](../../decisions/0032-production-firebase-operations.md#2026-10-06-recovery-operation-amendment)。
- primary / main HEAD：`e88214d2ae2172c8c27c1e0dea72070c8abd0252`。変更は未コミット。別worktree・Git変更・クラウド書込なし。

## 実装した範囲

通常稼働→復旧処理中→HS確認待ち→再開の制御を追加。復旧処理中はHS管理者にも案内だけを表示し、確認待ちは有効な開発者・HS管理者に読み取りと更新を伴わないCSVだけを開放する。RulesとFunctionsで更新を拒否し、旧画面の要求・旧DBの業務アクセスも拒否する。

開発者向け外部コマンドに、初期化、更新収束、現在のAuth／権限・採番上限の保全、新DBへの復元準備、復元処理照合、隔離、元像と限定補正の分離、検証、切替、外部了承後の再開、中断処理の収束を追加。実クラウド更新には実Git revision一致・runtimeソースclean・対象Rules照合などを要求する。旧DB削除は実装していない。

日次30日バックアップ／PITRの設定API、取得監視、週次／アカウント変更後の非公開Auth退避、管理者限定の状況画面を追加。設定不足を成功扱いしない。業務バックアップとAuthの最終成功時点は履歴20行とは別に保持し、Auth退避失敗で業務バックアップの成功日時を消さない。自動処理は既定で無効。

## 独立レビューと試験

既存の読み取り専用レビュー担当によるRECOVERY-01〜06の確認を受けた。復元元の破損による権限保全の停止、元像／補正後の証拠混同、中断後の収束、補正再実行時の別業務変更の受入、復元先の所属欠損、Auth失敗による成功日時の欠落を修正。最終の限定差分レビューRECOVERY-06はコード上の残件なし。レビューはクラウド動作や試験成功の証拠とは分ける。

UI・アプリ処理・運用データ／権限・ガバナンス・構成の混合変更として、verification-policy.jsonの全7ゲートを選択。省略なし。最終ソースに対する実測：

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 193件、191成功・既存2スキップ・失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功。Nitro外部参照・未使用import等の警告あり | 0 |
| `npm run test:rules` | 架空demo環境、93成功・失敗0・スキップ0 | 0 |
| `node scripts/check-functions-syntax.mjs` | 27モジュール成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 成功。管理対象・検証方針の整合を確認 | 0 |

`git diff --check`もexit 0。改行変換の警告のみ。文書の結果確定後にガバナンス検査とdiff検査を再実行する。以後runtimeソースは変更せず、この記録のmanifestへ結び付ける。

Emulatorでは架空の`demo-termite-warranty`のみ使用。試験は世代不一致、実行中更新の収束、読み取り応答の遮断、管理者／一般担当者／工務店の境界、旧DB拒否、限定補正の途中失敗・証拠改変、切替／再開の応答消失、現在の所属整合、Authエクスポート中のアカウント変更、最終成功日時の保持を対象にする。復元先データと管理サービス完了証拠は架空fixtureであり、実管理バックアップ復元の成功ではない。

## Local画面確認

アプリ内ブラウザで、管理者状況画面、復旧処理中の案内、HS確認待ちの一覧・詳細、一般担当者への案内を確認した。復旧開始はLocalの外部コマンドで実行し、既存画面が案内へ切り替わった。確認待ち画面はUI専用fixtureであり、実復元・切替の受入証拠ではない。

- [復旧中の案内](recovery-maintenance-local-2026-10-06.jpg)
- [HS管理者の読み取り専用詳細](recovery-readonly-local-2026-10-06.jpg)
- [一般担当者のアクセス停止](recovery-access-denied-local-2026-10-06.jpg)
- [状況画面の初期表示](recovery-status-local-2026-10-06.jpg)：最終成功日時2行の追加前に撮影。追加後の値と非公開情報の非返却はEmulator試験で確認する。追加後の画像は未取得。

共有アラートの本文14pxと、狭幅375px時の横方向のはみ出しなしを確認した。CSVボタン操作前後の業務97文書は件数・ハッシュが一致（`0363a92a2c99cc3edeba60c167dc22add2c014b8685a10ec85214c55ac2bafa2`）。ブラウザのダウンロード完了通知は取得できなかったが、2026-10-06にオーナーから「ダウンロードできてたよ」と確認を受けた。提示された`保険報告_2026-10 (1).csv`のDownloads内の存在と204バイトのファイルサイズを確認し、Localの保存完了は確認済みへ更新する。CSV本文の正しさ・完全性は今回未検査で、本文は記録しない。

この確認追記は本記録のみのdocumentation-only変更。仕様・実装・データ契約・運用手順・進捗率は変更せず、governance-checkとdiff確認を選択する。他6ゲートは実装・設定に変更がなく選択外。

利用中のCLIのEmulatorはDBごとのRules配備に制約があったため、画面確認だけTempの架空DB専用Rulesを使用した。実ソースの制御DB Rulesは別試験で検証する。画面確認用の一時設定を戻し、起動したUI／Emulatorを停止、タブを閉じた。

## 差分と証拠の結び付け

以下26ファイルをパス順に並べ、各ファイルの生バイトSHA-256を小文字で`path:hash`とし、LFで連結（終端LFなし）したUTF-8文字列のSHA-256：`fd8bdcb63daec03a7734bb93aa4c78cf24c421f1c8ceb2f1d1f56ebeb87aea1f`。

```text
app/app.vue
app/components/MeetingPrototype.vue
app/components/RecoveryNotice.vue
app/components/RecoveryStatus.vue
app/gateways/caseCommandGateway.ts
app/gateways/companyPortalGateway.ts
app/gateways/staffAccountGateway.ts
app/plugins/firebase.client.ts
app/utils/recoveryClient.ts
firestore.rules
firestore.control.rules
functions/index.js
functions/recovery-runtime.js
functions/recovery-backups.js
scripts/recovery.mjs
scripts/lib/recovery-controller.mjs
scripts/lib/recovery-options.mjs
scripts/lib/firestore-recovery-provider.mjs
src/domain/recovery.mjs
src/domain/backup-health.mjs
package.json
test/recovery.test.mjs
test/emulator/recovery.test.mjs
test/firestore-control-rules.test.mjs
test/firestore-rules.test.mjs
test/property-warranty.test.mjs
```

文書の所有差分：`docs/specification.md`、`docs/requirements/environments-and-authentication-email.md`、`docs/requirements/security-and-access.md`、`docs/decisions/0032-production-firebase-operations.md`、`docs/roadmaps/technical-remediation.md`、`CHANGELOG.md`、`governance/project-rules.md`、`docs/design/README.md`、`docs/design/backup-recovery-implementation.md`、`docs/runbooks/backup-recovery.md`、本記録と上記4画像。他タスクの`docs/README.md`・`docs/operations.md`差分は未編集で保全。root AGENTS／共通管理対象／検証方針は未変更。

新しい運用メタデータの契約は実装設計に集約した。物件／保証スキーマは不変で既存業務契約の版は上げない。仕様・対象要件・ADR0032・台帳・changelog・設計索引・runbookを更新し、全体進捗の加点はしない。既存文書から新しい設計・runbook・証拠へ到達できる。

## 残作業・運用開始の条件

1. 実制御DB ID、Rules、IAM、非公開Storage、Authハッシュ設定の保管先、開発者宛通知先の確認と実設定。実クラウドのAPI応答・復元出自・新DBへのRules配備順序は未検証。
2. 実バックアップ／PITR／Auth退避とメール到達の確認、隔離Dev復元、停止日時を調整した通常Devの切替・HS確認・再開予行。CSV保存完了もDevで確認する。
3. Auth自体が破損した場合の取込は未実装。秘密のハッシュ設定とUID対応を使う隔離試験・別手順が必要。業務DB復元だけでAuth消失からの復旧完了としない。
4. 初期化途中の復旧、失われた会社／所属などの手動補正、旧DB・私有事故証拠の保持／削除は別判断。default DBの導入確認点を無断で削除しない。
5. 有効化後の読み取り専用Callableは制御確認に通常4文書Read、確認待ちでは追加権限確認が必要。無効時も導入確認点1Read。業務Readとは別の意図した負荷で、Dev実測・課金効果は未確認。

現時点で運用開始可能とは扱わない。次工程は[操作手順](../../runbooks/backup-recovery.md)の実対象・設定照合から進め、ProdはHSアカウント等が揃うまで待つ。

## Dev導入前の実設定照合（2026-10-06）

オーナーの「進めてください」により、採用済み方針のDev実設定・準備を開始。通常Dev停止の日時調整条件、実復元前の復旧時点了承、再開前の別了承は維持する。通知先はオーナーから受領したが、私用メール識別子を本文・Gitへ保存しない。

2026-10-06 11:16〜11:17 JST、Firebase CLIの既存サインインで管理APIを読み取り。Nodeコマンド2回はいずれもexit 0。業務文書・Auth本文・秘密値は取得／出力しない。IAM policyは役割と人数だけを出力した。

| 実取得項目 | 確認結果 |
| --- | --- |
| プロジェクト | `termite-warranty-dev`、ACTIVE、課金有効 |
| DB一覧 | `(default)`のみ、Native／Standard、`asia-northeast1` |
| PITR | DISABLED、versionRetentionPeriod=3600s。7日保護ではない |
| バックアップ予定／実体 | 両一覧HTTP200、0件、ページ継続なし |
| 制御DB | なし |
| Storage | Functions用2バケットのみ、Auth用の専用保管先なし |
| 通知チャネル | HTTP200、0件、ページ継続なし |
| Functions | 15件ACTIVE、復旧関連3件なし、復旧環境変数なし |
| 操作アカウント権限 | DB作成／更新、バックアップ予定作成／一覧、バックアップ取得／一覧／復元、Storageバケット作成、通知チャネル／ポリシー作成、Authハッシュ設定取得をtestIamPermissionsで確認 |

Storageのget／update／setIamPolicyはプロジェクト対象の権限テストでは返らなかった。バケット単位の権限は別途確認が必要で、この結果だけでバケット操作不可と断定しない。Functions実行主体のバックアップ／Auth退避権限はまだ検証していない。

設定順序：既存DBの日次30日／PITR保護を先行し、その後に制御DB・非公開保管先・通知と権限を準備する。復旧制御の有効化は停止日時調整後。実設定の成功、バックアップ取得、通知到達、復元成功はまだこの照合結果から主張しない。

技術一次資料：[管理バックアップ](https://docs.cloud.google.com/firestore/native/docs/backups)、[PITR](https://docs.cloud.google.com/firestore/native/docs/use-pitr)、[権限照合API](https://docs.cloud.google.com/resource-manager/reference/rest/v1/projects/testIamPermissions)。バックアップ予定の作成とPITR有効化は[操作手順](../../runbooks/backup-recovery.md)の導入設定経路と既存providerを使い、実行版を固定してから行う。

### 先行する保護設定

レビュー済み実装41ファイルを`b83dcf68d9b177879dde1085ef76a0674b289f7e`へローカルコミット（exit 0、pushなし）。runtime 26ファイルのmanifest一致を実測し、同一ソースの既存全7ゲート証拠を再利用した。追記文書はgovernance-check、diff check、cached diff checkともexit 0。別作業のREADME／operationsだけが残る状態で実設定を実行した。

2026-10-06 11:19:55 JST、既存providerの`configure('(default)')`を導入設定として実行（Node exit 0）。実HEAD一致・runtime clean・Emulator指定なし・実DB名／所在地／形式一致を再確認した。日次予定POSTとPITR PATCHはHTTP200。設定後GETで日次予定1件、保存2592000秒（30日）、PITR ENABLED、versionRetentionPeriod=604800秒（7日）を確認。設定予定のIDは`24ea9a81-65e2-442c-9c94-b1085900ef15`、変更処理は`projects/termite-warranty-dev/databases/(default)/operations/BhADmOeyoBAG1pG1yggMChAa`。実バックアップの生成、変更処理の完了GETは後続確認する。設定直後のPITRに過去7日分が揃ったとは扱わない。業務文書・Rules・接続先・Authは変更していない。

新設予定の運用名は制御DB `recovery-control`、非公開バケット `termite-warranty-dev-recovery-auth`。これは既存リソースが存在するという事実ではなく、採用済み準備範囲内の作成名の選択。APIで未作成を確認してから作成し、実応答でID／所在地を照合する。既存または別所有のリソースなら停止し、勝手に上書きしない。制御DBの公開範囲は確認済みcontrol Rulesのみ、Authバケットは公開防止・統一アクセス・auth/30日削除を設定する。通常Devの状態初期化・Functions接続先設定は停止日時の回答まで行わない。

### 実リソース・停止の準備

- オーナーは通常Devの停止／有効化／切替予行を「今から実施する」と回答した。復元後のHS確認・再開了承は別条件のまま。
- 制御DB／Rules公開対象の404を確認し、制御Rulesを新DB名へ先行公開して本文一致をGETで確認した。その後`recovery-control`を新設、作成完了と東京所在地・削除保護をGET確認（Node exit 0）。Rulesetは`70ad0b64-25c8-47cb-8fda-213e9edf806c`。未作成DB名へのRules公開経路が実環境で成立した。
- Authバケットの404を確認し、新設後に既存`assertPrivateAuthBucket`で公開防止enforced・統一アクセス・auth/30日削除・公開メンバーなしを検査（Node exit 0）。Auth内容・秘密のハッシュ設定はまだ書き込んでいない。
- 指定された開発側のメールに限定した通知チャネル`5177019720332995880`とポリシー`18428139543408174434`を作成（Node exit 0）。フィルタは`jsonPayload.recoveryBackupFailure=true`。試験ログ`recovery-notification-test-038136d8-b83a-4206-9401-0a46aa4dc9c9`を1件送信（HTTP200、Node exit 0）。受信確認はオーナー回答待ち。
- Authハッシュ取得／バックアップ閲覧の実Functions主体への追加と新バケットIAM限定の実行は、一般的な準備承認では具体的権限変更を承認できないとして自動承認レビューに拒否された。プロセスは起動せず、当該IAM変更は未実行。影響範囲を明示した個別承認を質問し、回答待ち。迂回して実行しない。
- Devの読取scanは54文書、ハッシュ`e8120d2ff120e79ae9cccc37a5e28365665a6cdab73026631b9de22e2f190d6d`。Auth対応／参照／採番の読み取り検査も成功（いずれもNode exit 0）。54件の内訳はscanのコレクション別件数だけを取得し、本文は出力していない。
- PITR変更LROの後続GETは404（当該確認コマンドexit 1）。DBのENABLED／604800秒はGET確認済みだが、このLROの取得完了とは区別する。設定変更の再送はしていない。

初回切替の計画：実Functions15件のCloud Runサービスと現在の公開invoker、実行時間上限60秒をGETで照合（Node exit 0）。停止のために公開呼出だけを一時的に閉じ、旧世代の新規受付を止める。私有control `recoveryAudit`へ元IAMと元Functionsソース参照を保全してから効果を適用する。他のIAM割当を変更せず、再開は保全した元の公開呼出だけを復元する。初回導入中は復旧対応Functionsの制御設定を有効にし、未初期化を拒否させる。全世代の更新／収束を確認する前に業務を開放しない。部署等の一般権限追加とは別の、許可されたDev停止／再開の操作であり、拒否されたAuth権限追加の代替ではない。

### Dev配備・メンテナンス有効化の実測

配備前に全7ゲートを実際に再実行した。実装のmanifestは上記と同一、配備元は`b83dcf68d9b177879dde1085ef76a0674b289f7e`。ignored `functions/.env`には制御DB・Authバケットの参照と自動退避無効を設定し、秘密値は含めていない。別の`.env.local`は変更していない。

| コマンド | 今回の実測 | exit |
| --- | --- | --- |
| `npm test` | 193件中191成功、既存skip 2、失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功。既存のNitro外部driver／unused import／timing警告あり | 0 |
| `node scripts/check-functions-syntax.mjs` | 27モジュール成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 成功 | 0 |
| `npm run test:rules` | 93成功、失敗・skip 0。架空Emulatorのみ | 0 |

実行・確認結果：

- 既存Functions15件の公開呼出を一時停止し、元IAM／ソース参照を私有control `recoveryAudit/dev-setup-pause-20261006`へ保全した（Node exit 0）。全件の公開メンバー除外をGETで確認。旧最大実行時間60秒を超えてから初期化した。
- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only 'firestore:rules,functions,hosting' --non-interactive`はexit 0。既存15件更新、新規`recoveryRuntime`／`recoveryStatus`／`recoveryBackupMonitor`の3件作成、Hosting公開完了。Cloud Scheduler API有効化を含む。
- 配備後の全18件ACTIVE、実行主体一致、`RECOVERY_CONTROL_DATABASE=recovery-control`、`RECOVERY_BACKUP_AUTOMATION=false`をGETで確認（Node exit 0）。Auth退避・監視処理を自動有効化したとは扱わない。
- default／control／復元先名`recovery-drill-20261006`のRules本文が実ソースと一致（Node exit 0）。復元先名にはRulesのみ先行公開し、DB自体はまだ作成・復元していない。
- Hosting HTTP200、公開HTMLとbuild成果物がバイト一致。SHA-256は`e5f64c476dd76ca1c14490f89323d242a97273a3554046e8782fc6c27af1810a`（Node exit 0）。
- 初期化前にdefault `_recovery/access`をrecovering／generation 0で作成（Node exit 0）。配備収束確認後、実CLIの`initialize`でnormal／generation 1、直後の`enter`でrecovering／generation 2へ遷移した（各exit 0）。実行中更新0件。公開呼出は停止状態を維持した。
- `baseline --generation 2 --operation-id dev-baseline-20261006`はexit 0、54件。現行権限・Auth対応と採番上限を私有controlへ保全。Authアカウントや業務本文の書き換えはしていない。
- Devブラウザで「メンテナンス中」とシステム外連絡の案内を確認。[停止表示の画像](recovery-maintenance-dev-2026-10-06.png)には業務・個人情報なし。未認証Runtimeへの直接POSTは自動承認レビューが関数実行の影響を理由に拒否したため実行せず、ブラウザ表示で検査した。

### IAM・Auth秘密設定・通知の後続結果

オーナーは2026-10-06に、実Functions共有主体へのAuthハッシュ取得／バックアップ閲覧と、新設バケットIAM限定を具体的に許可した。これにより先の拒否条件を解消してから実行した。

- custom role `recoveryAuthHashReader`は`firebaseauth.configs.getHashConfig`のみ、`recoveryAuthBucketMetadataReader`は`storage.buckets.get`／`storage.buckets.getIamPolicy`のみで定義を照合。
- shared実行主体へproject側の前者と`roles/datastore.backupsViewer`を追加。既存project IAMは保全。最初の実行はproject側適用後にbucket PUTで400、exit 1。GETで部分適用を確認し、Storageの取得済みpolicy形式・etagを保持してbucket側だけを適用し、HTTP200／exit 0で照合した。
- バケット直付けは開発者の`roles/storage.admin`、実行主体の`roles/storage.objectCreator`／metadata custom roleの計3割当に限定。公開メンバーなし。既存project IAMの継承は維持しており、project管理者のアクセスまで除去したという意味ではない。
- Auth復元用秘密ハッシュ設定の新規保存は別に自動承認レビューに拒否された。オーナーが同じDev非公開バケットへの退避を具体的に許可してから実施。`hash-configuration/firebase-auth-20261006.json`へcreate-only保存し、私有readbackの一致を確認（Node exit 0）。これは`auth/`の30日Delete対象外。参照・generation・検査版だけを私有control `recovery/hashConfigurationEvidence`に記録。秘密値をGit／画面／ログ／ローカルファイルへ保存していない。Auth利用者の実退避・取込はまだ実行していない。
- オーナーは初回通知を未受信と回答。チャネルenabled／UNSPECIFIED、ポリシーenabled／OR／単一log条件／通知先1件をGET確認（Node exit 0）。試験ログは時刻範囲・新しい順で検索し、保存とfilter対象を確認。時刻範囲なし検索の空ページだけで未保存と断定しない。
- 追加試験ログ`recovery-notification-retest-77262139-f7fa-4135-a22e-2ae3e62ff8bc`を1件だけ送信（HTTP200／Node exit 0）。サーバーが2026-10-06T02:44:57.275205407Zを割当。後続GETでポリシーに対応したOPENアラート`projects/termite-warranty-dev/alerts/0.odhu4tcwhdth`、openTime=2026-10-06T02:46:02Zを確認（Node exit 0）。メール受信は未確認。初回不達の原因は確定していない。

通知の一次資料：[log-based通知](https://docs.cloud.google.com/logging/docs/alerting/log-based-alerts)、[アラート一覧](https://docs.cloud.google.com/monitoring/alerts/log-based-incidents)。Auth設定の形は[公式Config API](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config)で確認した。秘密値は引用しない。

### この時点の停止状態・次の承認境界

Devはrecovering／generation 2／業務DB `(default)`。既存Functions15件の公開呼出設定はまだ一時停止中。実復元先・接続先切替・HS確認待ち・通常再開は未実行。

1. 更新停止後の2026-10-06 11:40 JST（`2026-10-06T02:40:00Z`）をDev予行の復旧時点にする案を提示し、了承待ち。PITR最古時点は実GETで`2026-10-06T01:20:00Z`。了承・直前照合なしに復元POSTを送らない。
2. 保全した既存15件の公開呼出設定だけを戻す操作は自動承認レビューが「広範な公開アクセス境界を戻す個別承認が必要」と拒否。未実行で、メンテナンスによる更新停止維持と通常再開の別了承を説明して許可を質問中。迂回しない。
3. 追加通知のメール到達確認、初回managed backup生成、Auth利用者の実退避、自動監視有効化、実復元の出自／完了・整合確認、Dev切替／管理者確認／別の再開了承が残る。PITR予行をmanaged backup復元成功として報告しない。

今回の後続文書更新は実測・運用状態の反映で、確定仕様や業務データ契約を変更していない。設計status／runbook／技術台帳／本証拠を更新し、既存設計索引から到達可能。仕様・ADR・changelog・全体進捗は新しい要件・設計判断・アプリ差分がないため追加更新しない。他タスクのREADME／operations差分は保全。

### 後続の承認・通知到達・自動設定配備・復元開始

上の承認待ち記録を次の実結果で更新する。Devは引き続きrecovering／generation 2。

- 非公開baselineの実createdAtは`2026-10-06T02:40:22.998Z`。先の11:40案はこれより前だったため取り下げ、11:42へ訂正してオーナーが明示了承した。復元参照は`owner-dev-point-20261006-1142`。保全前の時点を停止後と断定した案の誤りを訂正し、了承前に復元していない。
- `restore --target recovery-drill-20261006 --snapshot-time 2026-10-06T02:42:00Z`はexit 0。実処理名は`projects/termite-warranty-dev/databases/recovery-drill-20261006/operations/3sYom4Wo17QESwEnxIt21xAqMXRzYWVodHJvbi1haXNhDyIMECUa`、service開始時刻は`2026-10-06T02:51:10.397029Z`。後続`restore-status`はすべてexit 0、PITRの元DB／時点一致を検査済みだが`done:false`。管理APIの進行表示はPROCESSING／estimatedWork=100／completedWork=30だった。完了、件数一致、整合性、切替を未検査のまま成功へ読み替えない。POSTは1回のみ。
- オーナーは「タイトルは異なるが、メールは11:46に受信した」と確認。実ポリシー名は`Dev recovery backup failure`。試験JSONのmessageをメール文面へ抽出していないため、依頼時の`(retest)`文言がメールの題名に出るという説明は訂正した。初回不達の原因は未確定だが、追加試験でlog→OPENアラート→メール到達を確認。私有control `recovery/notificationEvidence`へ受信確認と実リソース参照だけを記録（Node exit 0）、宛先は記録しない。
- ignored `.env`のハッシュ設定参照／通知参照を、上記2つの私有control記録へ設定し、`RECOVERY_BACKUP_AUTOMATION=true`を準備した。この設定後も全7ゲートを再実行。domain 191成功／既存skip 2、typecheck成功、build成功、syntax 27成功、seed syntax成功、governance成功、rules 93成功、各exit 0。rulesは最初sandboxのCLI設定読取EPERMでexit 1、必要な権限で架空Emulatorに限定して再実行しexit 0。`.env.local`の無効設定は保全し、実Devへ試験接続していない。
- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only functions --non-interactive`はexit 0。全18件ACTIVE／automation=true／private参照一致をGET確認（Node exit 0）。Scheduler `firebase-schedule-recoveryBackupMonitor-asia-northeast1`はENABLED、`0 10 * * *`／Asia/Tokyo。maintenance中は既存実装が早期returnするため、実Auth退避成功や初回managed backup成功はまだ確認していない。Hostingはこの追加配備で変更していない。追加buildのHTMLハッシュは`943e73fdacf1b2528d87731056db0f42213b8f4271d4037a2028c1d1d0f80bab`で、先の公開HTMLとの一致証拠は最初の配備時の成果物を指す。
- オーナーが既存15件の元公開呼出設定の復元を具体的に許可。初期helperの完全名へのprefix重複GET404と空IAM応答のbindings扱いで、最初の変更前に各exit 1。保全した完全名と実Functions一覧を全件照合し、空bindingsを処理して再実行。元の公開メンバーだけを各etag付き現policyへ反映し、15件GET照合と私有audit更新に成功（Node exit 0）。他の現在IAMは保全、phaseはrecovering／generation 2のまま。元の公開設定復元と通常業務の再開は別。

この後は実復元の完了・元像scan・限定補正・Auth／参照／採番検査を行い、検証済み証拠だけで接続先をHS確認待ちへ切り替える。通常再開は別のオーナー了承を得るまで実行しない。実復元完了前にDB削除・復元POST再送・失敗証拠の成功書換えをしない。

### 実復元完了・検証・確認待ち切替

2026-10-06T03:07:49ZまでにCLI `restore-status`の`done:true`を確認（exit 0）。後続管理APIで実startTime=`2026-10-06T02:51:10.397029Z`、endTime=`2026-10-06T03:06:13.118834Z`を確認し、クラウド本体の所要時間は902.721秒（約15分3秒）。完了確認までの約17分とは区別する。この54文書での1回の実測をProdの復旧時間保証へ広げない。

| 実コマンド／照合 | 結果 | exit |
| --- | --- | --- |
| `quarantine` | targetのRules一致とrecovering世代2マーカー | 0 |
| `scan` | 54文書、元DBと同じ`e8120d2ff120e79ae9cccc37a5e28365665a6cdab73026631b9de22e2f190d6d`。内訳も一致 | 0 |
| `reconcile` | `dev-reconcile-20261006`完了、accountChanges=0／counterChanges=0／54件 | 0 |
| `verify` | `dev-verify-20261006`、実復元出自・元像／補正・現在のAuth／権限・物件参照／採番が成功、54件 | 0 |
| `cutover` | verification／generation 3／`recovery-drill-20261006` | 0 |
| `configure-backups` | active target日次30日予定作成、PITR PATCHの`done:true` | 0 |
| 後続GET／SDK読取 | targetの東京／PITR ENABLED／604800秒、daily予定1件・2592000秒、sourceInfo COMPLETED、全状態一致 | 0 |
| 実一覧クエリ | `updatedAt desc`＋document ID desc＋`limit(20)`で物件／保証16件、保証番号完全一致の索引検索で選択した1件一致 | 0 |

物件／保証の本文・番号・UIDは出力していない。限定補正と検証の処理参照は上記の実結果。target日次予定は`c16d0414-b803-464d-b2bf-a0eda2d15f86`。元defaultはretiredマーカーとなり、`_recovery/activation`は保持。私有controlのruntimeとtargetマーカーは確認待ち世代3で一致。旧DBの物件／保証・アカウント・バックアップは削除していない。

Schedulerの実HTTP target／OIDC主体と監視Functionsのprivate invoker IAMが対応し、public invokerなし、ENABLED・ACTIVEをGET照合（Node exit 0）。これは起動経路の設定検証で、Authファイルの実生成とは区別する。

Devブラウザは停止画面からログイン画面へ自動遷移した。[確認待ちの未ログイン表示](recovery-verification-login-dev-2026-10-06.png)には個人情報なし。この環境のbrowser inventoryに既存Chromeはなく、管理者の既存ログインを操作できないため、実管理者の一覧・詳細・CSV確認はオーナーへ依頼。Localの同種確認は実施済みだが、これをDevのログイン後受入へ読み替えない。

**現在の再開境界**：通常Devはverification／generation 3で業務更新停止中。オーナーへ管理者での確認と別の再開了承を質問済み。回答を得るまで`reopen`は実行しない。了承後は実HEAD・runtime clean・私有検証証拠の版を再照合し、必要なら証拠を再検証して再開する。実Auth退避試験、初回managed backup生成とそこからの復元試験は残る。PITR復元成功をこれらの成功とは扱わない。

区切り前の実`status`はverification／generation 3／新DB、activeOperations=0、operatorBlocked=false、interruptedOperation=null（exit 0）。実Git HEADは引き続き`b83dcf68d9b177879dde1085ef76a0674b289f7e`。後続所有差分は設計status・runbook・技術台帳・本記録の4文書とDev画像2点、ignored `.env`の設定だけ。アプリ／Functions／CLI／Rulesのtracked runtime差分なし。README／operationsの別作業差分2点は未編集・未ステージで保全。実CLIのHEAD一致と私有検証証拠の版を再開まで維持するため、この後続文書差分はまだcommitしない。新たなpushなし。後続文書にはdocumentation-onlyのgovernance-check／diff checkを適用し、runtime変更がないので他6ゲートの成功証拠を再利用する。


### HS管理者受入・別了承後の再開・実Auth退避

2026-10-06、オーナーが「HS管理者でログイン→各種確認OK」と報告。その後、確認と再開を分けた質問へ「通常Devの再開を了承する」と回答した。復旧時点の了承とは異なる参照`owner-dev-reopen-20261006`を用いた。

- 初回`status`はsandboxのFirebase CLI認証設定読取EPERMでexit 1。必要な権限で再実行しverification／generation 3／実行中更新0／運用ロックなしを確認、exit 0。
- 実HEADは`b83dcf68d9b177879dde1085ef76a0674b289f7e`、tracked runtime差分なし。`node scripts/recovery.mjs reopen --project termite-warranty-dev --control recovery-control --revision b83dcf68d9b177879dde1085ef76a0674b289f7e --generation 3 --approval owner-dev-reopen-20261006 --operation-id dev-reopen-20261006 --apply --confirm recovery`はexit 0。実Auth／権限と54文書の検証像を再照合した上でnormal／generation 4へ移行した。
- 再開後SDK読取はruntimeと新DBマーカーのphase／generation／DB ID一致、最新20件クエリの16件を確認、exit 0。通常Devの業務更新受付を再開し、旧DBのretiredは維持する。既存業務データを試験更新していない。
- 実Scheduler GETでENABLED・10:00 JST・OIDC主体とprivate targetを照合。初回Auth成功記録はまだなかった。`:run`を一度だけ送信し受付成功、各Node exit 0。初回Firestore管理バックアップ未取得の失敗通知が生じ得ることを事前説明した。
- 非公開`lastAuthBackup`とStorage実体を読み取り、gzip／schemaVersion 1／利用者3件／passwordアカウント3件／秘密ハッシュ・salt項目の存在／秘密設定参照一致をメモリ内で検査、exit 0。実completedAt=`2026-10-06T03:54:55.188Z`（12:54:55 JST）、退避ロックなし。利用者本文・UID・メール・ハッシュ・salt・オブジェクト本文は出力・ローカル保存していない。
- 同じ監視結果ではFirestore未取得後のcatchが成功したAuthを`unavailable`へ上書きする不具合を確認。退避ファイルと最終成功記録は正常。`functions/recovery-backups.js`で取得済みAuth結果をcatchにも保持し、`test/emulator/recovery.test.mjs`でFirestore未取得＋Auth成功の同時状態を検査する回帰を追加。実通知／外部APIを使わず架空demoのstubで検査する。新要件・データ契約・権限変更ではなく既存の独立状態表示の修復。

修正の配備前全7ゲートは完了。アプリ処理＋配備の混合影響として省略なし。修正は`c6331bacf16ddc6ddac0a4a5a2dfad1818e088e6`に2ファイルのみをcommitし、通常再開の旧検証証拠の版は履歴として保持。所有runtimeのSHA-256は`functions/recovery-backups.js`=`8346b3eece279a8cfae2a7d33a7c7a157bfd213028d3ee0fbac1faa220938add`、`test/emulator/recovery.test.mjs`=`70f5384aa9b2fe74f7943a139844cfec90f512d73b5f0dff061e8b79dc1a4c68`。前の26ファイルmanifestは修正前の証拠であり、その後の同一runtimeを意味しない。

| 修正後コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 193件／191成功／既存skip 2／失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功、既存Nitro外部参照／未使用import警告 | 0 |
| `node scripts/check-functions-syntax.mjs` | 27モジュール成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 管理対象／検証方針整合 | 0 |
| `npm run test:rules` | 架空demoの93成功／失敗0／skip 0、新しい監視handler回帰も成功、終了を確認 | 0 |

実Devの`backups`読取は新DBのdaily30日予定1件、managed backupはまだ0件、exit 0。現在は`functions:recoveryBackupMonitor`だけを配備中。通常Dev再開と実Auth退避は完了している。Auth一括取込・初回managed backup生成／そこからの実復元・Prod構築は残る。


### 状態修正のDev配備・実再試験と最終状態

- `node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only functions:recoveryBackupMonitor --non-interactive`はexit 0。対象1件の更新成功を確認。Hosting／他のFunctions／Rules／IAMを追加変更していない。
- 管理API GETで対象ACTIVE、updateTime=`2026-10-06T04:00:22.571998418Z`、実Cloud Run revision=`recoverybackupmonitor-00003-cif`、control／automation／private bucket設定一致を確認。SchedulerのENABLED・URI一致・10:00 JSTを照合して修正後の`:run`を1回送信、Node exit 0。
- 後続私有GETでcheckedAt=`2026-10-06T04:00:57.567Z`、monitoring=`failed`、authBackup=`success`、Auth3件・最終成功日時保持、exportLockなし、runtime normal／generation 4を確認、Node exit 0。Firestore管理バックアップがまだ0件なので全体監視の失敗は実態どおり。これを監視全体成功とは報告しない。今回の修正後試験では週次キャッシュの既存Auth成功を再利用し、追加の秘密ファイル生成は要求していない。
- 再開前はオーナーがHS管理者でログイン後の各種確認OKと報告。再開後の通常状態・一覧読取と監視は開発側で実検査済み。実業務レコードの試験更新は実施していない。

通常Devの停止→PITR復元→新DB切替→HS管理者確認→別了承→再開の予行と、Auth実退避／私有readback、発見した監視表示不具合の修正・Dev実再試験は完了。初回managed backup生成とその復元、Auth一括取込、Prod構築、旧DB削除は未完了／未実装または別範囲として保持する。

最終所有差分は設計・手順・技術台帳・本証拠、仕様冒頭の実施状態、changelog、業務情報なしのDev画像2点。runtime修正2点は上記commit済み。管理者確認・再開の了承はこのチャットの2026-10-06回答を根拠とし、復旧ルール自体は変更しない。ADR／データ契約／ガバナンス／全体進捗は新たな要件・耐久判断・schema変更がないため変更しない。新しい文書の追加はなく、既存索引で到達する。README／operationsの別作業差分は保全し、commit対象外。配備後の文書確定にgovernance-check／diff checkを再実行し、runtime変更なしのため他6ゲートは上記の成功証拠を再利用する。Git pushなし。

最終実`status`はnormal／generation 4／新DB、activeOperations=0、operatorBlocked=false、interruptedOperation=null（exit 0）。文書確定後の`pwsh -NoProfile -File scripts/check-governance.ps1`と`git diff --check`は各exit 0。日次Firestoreの初回確認を次の運用確認事項とする。

### 消失Authのみ復元するLocal追加実装

2026-10-06、オーナーは「消失アカウントのみ復元する案を採用」と回答。既存UID・現在権限・停止状態を維持し、全消失にも対応するLocal実装を承認した。残存UIDのパスワード破損修復は別範囲。基準はprimary `main`／実HEAD `4d6939dc60fda9885477a6a885076c2431ea860a`。通常DevのAuthは変更せず、実取込はCLIの資格情報読取前に拒否する。

追加コマンドは`scripts/auth-recovery.mjs`、内部実装は`scripts/lib/auth-recovery.mjs`。現行プロフィールとのUID・メール・停止状態を検査し、欠損だけを取込対象とする。現在のプロフィール自体が信用できない場合は停止する。復旧作業中・一致した世代／DBマーカー・更新収束・非公開export不在・共通ロックを要求する。非公開`recoveryAuthRepairs`には件数・状態・ダイジェストだけを記録し、秘密値や利用者本文は載せない。

独立read-onlyレビューAUTH-RESTORE-01／02で、一般的な`resume-operator`が新しいAuth復元intentのロックを解除できる問題と、秘密設定の記録済み保存世代を読まない問題を指摘。前者を`scripts/lib/recovery-controller.mjs`で拒否し、後者を保存世代固定GETと不一致拒否で修正。再レビューでは残存P1/P2なし。後続のテスト追加は全消失と模擬部分成功を補強し、実装コードは変更していない。

架空demoだけで、欠損1件／既存保持、全消失2件、現在の無効状態保持、重複・不整合・非対応provider／claims／hash設定の拒否を検査。応答消失と模擬部分成功では共通ロック・復旧作業中状態を保持し、一般resumeも拒否する。架空hashでの取込であり、実パスワードによるログイン成功を意味しない。

| 選択ゲート／コマンド | 実結果 | exit |
| --- | --- | --- |
| `npm test` | 197件／195成功／既存skip 2／失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功、既存Nitro外部参照／未使用import等の警告 | 0 |
| `node scripts/check-functions-syntax.mjs` | 27モジュール成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `npm run test:rules` | 最終ソース固定後に94成功／失敗0／skip 0、エミュレータ終了確認 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 文書確定後に管理対象／検証方針整合を確認 | 0 |

アカウント復旧の影響を考慮して全7ゲートを選択し、省略なし。先行成功したRules試験は最終テスト修正により再実行。最終再実行の初回はFirebase CLI設定読取EPERMでexit 1、必要権限で同一コマンドを再実行してexit 0。文書だけの後続更新は他6ゲートの無効化条件に該当せず、その成功証拠を再利用する。追加の`node --check`は新CLI・新内部実装・controllerの各3コマンドともexit 0。文書確定後の`git diff --check`もexit 0。

最終runtime／testの作業ツリーSHA-256：

| ファイル | SHA-256 |
| --- | --- |
| `scripts/auth-recovery.mjs` | `4a9bf9e1bcb08f718696c22a6b3ac42a5f7b4c1527aa770e4986da1cb3a6b989` |
| `scripts/lib/auth-recovery.mjs` | `f5a8c2794803cf9493e78b44331b21e8da875fe659ee0eb395f4e25092a97f04` |
| `scripts/lib/recovery-controller.mjs` | `ad300065583d70cd1523ed50913c3bafe706a51b91436b7ebf782a37fe7bc5e3` |
| `test/recovery.test.mjs` | `4cb63b56f7765a47bc8893bbc67d8431851ca2a04f1bf740eca06d950bc0c1af` |
| `test/emulator/recovery.test.mjs` | `56d8782f4235216f2c7e522e4bf7e1c7e9b71ff3df9930ae2a9fccefb6fc7bef` |

Dev read-only `node scripts/auth-recovery.mjs inspect --project termite-warranty-dev --control recovery-control --revision 4d6939dc60fda9885477a6a885076c2431ea860a`はexit 0。normal／generation 4、3件／欠損0／保持3／歴史上のみの件数0、writesPerformed=false。秘密設定の保存世代は固定して読み、既存Auth退避参照には世代がないため`backupReferencePinned=false`と明示した。秘密内容・UID・メール等は出力／ローカル保存していない。

続行時の実`backups`確認はexit 0、active DBの日次30日予定1件／バックアップ0件。初回生成とその実復元は未確認。取得時刻は指定できず、10:00 JSTは監視時刻（[公式バックアップ仕様](https://firebase.google.com/docs/firestore/backups)）。実Auth取込の有効化には退避証拠の保存世代固定、隔離した実資格情報の復元後ログイン検証、部分失敗の手動照合手順が必要。現状は自動retry／rollback／手動resumeを提供しない。[公式Auth取込](https://firebase.google.com/docs/auth/admin/import-users)の同UID上書き・部分成功を前提に、別経路の同時Auth操作を止める運用も必要。

所有変更は上記5コード／testと、仕様・環境要件・ADR0032・実装設計・runbook・技術台帳・本証拠・changelogの計13ファイル。新しい業務schema／Rules／IAM／Functions配備／ガバナンス変更はなし。データ契約は業務データ形状変更がなく維持。新規文書なしで既存索引から到達でき、全体進捗は加点しない。README／operationsの別作業差分は保全し、commit対象外。Devの停止・Auth更新・配備・メール送信・旧DB削除・Prod操作・Git pushは今回実施していない。

### Auth承認範囲の区切りと(default)固定設計の事前確認

2026-10-06のオーナー指示：Auth関連は承認済み範囲で結果を区切り、未実装・未検証を完了扱いしない。その後、通常業務(default)固定・別DBは復元／開発側検証限定へ方式変更。A/B/C/D、制御／現在権限／発行番号保全、Auth別復旧、外部HS了承を維持。現在Devデータの削除／上書き／再停止を包括承認しない。実行対象・具体手順の提示と承認を移行前提にする。

実HEADはprimary main `05bc0b4f0cb19bbe9002605cdbf5b0a453e67c7d`。Auth実装は同commitに保存済みで、前節の全7ゲート成功証拠は当該runtime／testに対応する。今回Authコードは変更しない。承認済みLocal消失復元と実非公開退避／readbackは完了。実Auth取込・実パスワード復元後ログイン・部分失敗後の専用手動回復・legacy退避参照の保存世代固定は未完了。全Auth消失の実復旧能力を完成とは扱わない。

| 読取確認 | 観測結果 | exit |
| --- | --- | --- |
| `node scripts/auth-recovery.mjs inspect --project termite-warranty-dev --control recovery-control --revision 05bc0b4f0cb19bbe9002605cdbf5b0a453e67c7d` | normal／世代4、3件保持・欠損0、writesPerformed=false、backupReferencePinned=false | 0 |
| `node scripts/recovery.mjs backups --project termite-warranty-dev --control recovery-control --revision 05bc0b4f0cb19bbe9002605cdbf5b0a453e67c7d` | active DBの日次30日予定1件、managed backup 0件 | 0 |
| メモリ内SDK事前比較（既存`scanDatabase`を両DBへ実行、updateTimeの件数集計） | active `recovery-drill-20261006`／default各54文書、同hash、marker一致。03:54:00Z以後の業務updateTime 0件 | 0 |
| `node scripts/recovery.mjs status --project termite-warranty-dev --control recovery-control --revision 05bc0b4f0cb19bbe9002605cdbf5b0a453e67c7d` | normal／世代4／active named DB、activeOperations=0、operatorBlocked=false、interruptedOperation=null | 0 |

SDK観測は2026-10-06 13:27 JSTまでに実施。hashは両DBとも`e8120d2ff120e79ae9cccc37a5e28365665a6cdab73026631b9de22e2f190d6d`。内訳はcompanyBranches 1／constructionCompanies 1／propertyOperationReceipts 24／propertyWarranties 16／prototypeSettings 1／staffAccounts 3／warrantyCounters 1／warrantyGroups 7、合計54。`_recovery`は業務hash／件数から除外。秘密・文書本文・UID／メールを出力／保存していない。稼働中の両scanは同一transactionではなく、既存hashはReferenceのDB識別まで比較しないため、これだけをC／Dev移行の完成証拠にしない。停止・収束後の最新像と型付き比較が必要。

新方式は[設計](../default-database-recovery.md)へ整理。仕様0.1.121・環境／アクセス要件・ADR0032・runbook・技術台帳・既存設計の置換告知・design index・changelogへ反映する。operations／root docs READMEの別作業差分は保全。運用手順の正は更新したrunbookへ置き、新文書は既存design indexと仕様から到達できる。業務schemaは今回変更せず、要求世代／nonce・protocol・private checkpointの具体契約は新実装時に確定・更新する。全体進捗の加点なし。

独立設計レビューDEFAULT-DESIGN-01は旧部分updateの世代継承、marker／controlの非atomic公表、親子操作順序を指摘。要求nonceの変更検査、default markerを唯一の公開authorityとする公表順序、default側checkpointとowner fencing、子→親削除／親→子作成、封印計画を使う部分再開を設計へ追加。実装・試験済みという意味ではない。

DEFAULT-DESIGN-02ではcontrol欠損の検知範囲の曖昧さを指摘。private control欠損時はFunctionsの更新受付／復旧操作を拒否するが、読取と直接SDKはdefault markerで判断するため即時検知できないこと、開発側の緊急marker閉鎖後に両経路を停止確認しcontrol回復／収束までB/C/Dへ進まないことを明記。DEFAULT-DESIGN-03の再レビューで修正範囲のP1/P2残件なし。レビューはread-onlyで、実装／Dev受入成功は主張していない。

今回の変更は文書のみでdocumentation-onlyのgovernance-check／diff checkを選択。`pwsh -NoProfile -File scripts/check-governance.ps1`と`git diff --check`は文書更新後に各exit 0を確認。最終所有文書を対象に両コマンドを再確認してから保存する。他6ゲートはアプリ／実装／設定／依存／データ契約の変更がないため今回非選択。Authの以前の7ゲートを新Cの検証へ流用しない。新Cの全7ゲート・Dev実行・配備・切り戻し・HS再確認は未実施。実Devは読み取りだけで状態・データ・Auth・設定の書込はなし。


### 固定(default) Local実装チェックポイント

基準primary main `8a8becd96f8445283cc1a3da54b23d7a56f08324`。オーナーの「進めてください」に基づきLocalのみ実装。fixed runtime/client、protocol2公開marker、直接writerの世代／nonce、型付きprivate同期計画／全前像、余剰削除・完全set・checkpoint再実行、公表応答消失回復、緊急閉鎖とcontrol再照合を追加した。新CLIは架空demo専用で実Devを資格情報読取前に拒否する。

独立FIXED-IMPLEMENTATION-01～05でprivate scanの孤立checkpoint誤検知、古い計画／了承の世代流用、unsafe数値、次回guard継承、重複Read、Bの精密型証拠・その後の再取得競合、ID検証、試験証拠失効条件を指摘・修正。最後の限定再レビューはP1/P2残件なし。レビュー担当はread-onlyでテストを実行しておらず、以下の実行証拠はcoordinatorの直接観測。

| gate／command | 最終結果 | Exit |
| --- | --- | --- |
| domain-test `npm test` | 200成功、0失敗、2skip（hostのsymlink fixture制約）、202件 | 0 |
| app-typecheck `npm run typecheck` | 成功 | 0 |
| app-build `npm run build` | SPA generate成功、既存Nitro外部参照等の警告あり | 0 |
| firestore-rules-test `npm run test:rules` | 最終102成功、0失敗、0skip。エミュレータ終了確認 | 0 |
| functions-syntax `node scripts/check-functions-syntax.mjs` | 28modules成功 | 0 |
| seed-syntax `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| governance-check `pwsh -NoProfile -File scripts/check-governance.ps1` | 全7policy／generated summary／managed hash一致 | 0 |

Mixed app／schema／operational migration／policy変更で全7を選択、省略なし。operator・B証拠・試験・policyの後続修正でdomain/Rules証拠を失効させ再実行した。app／Functions／seed実装はその前に固定済みで、typecheck/build/syntaxの失効条件に該当する後続変更はなく、有効証拠を再利用。CLI／operator／旧controller／meeting seedの追加node --check各4コマンドもexit 0。最後の記録だけの追記は他6gateを失効させず、governance/diff checkを保存前に再確認する。

ガバナンスは新operatorソース／試験をdomain/Rules成功証拠の失効条件に明記。installed sourceはv4へ変わっていたため更新には使わず、別repoのGitで実照合したsource commit `34295d3e4975c5663fc874057b03c95266acb97c`からv3 syncツールと必要テンプレートだけをignored tmpへ取得した。common／renderer／validator／turnoverのhashが現lockと全て一致し、変更前Planは0write／0差分。policy変更後Planはoperations生成blockだけ、Applyは1write／exit 0。ブロック外の既存operations本文を比較して完全保持した。AGENTS/common/renderer/validator/lockの変更なし。operationsは生成blockのみ保存し、他タスクの差分とdocs READMEを保全する。

実Devは14:08:45 JSTに読取だけで再確認。project `termite-warranty-dev`、control `recovery-control`、normal generation4、source `recovery-drill-20261006`、両DB54業務文書。両typed hash `85436d953ae39c56c5dfaa64235467b48728394839e535a4ada7c16cb8a21400`、default向け正規化の追加／変更0、削除0、現在権限一致、更新リース0／lockなし。記録済み再開時刻03:54:00Z以降のupdateTime0件。本文・UID・メール等を保存／出力していない。statusとメモリ内SDK比較はそれぞれexit0、writesPerformed=false、比較は非atomic。

確認済みLocal：型／qualified Reference・現在role／counter保持、子先行余剰削除・旧field除去、同一0write、batch commit応答消失のcheckpoint再実行、2回連続復旧、未知root／孤立親／target競合拒否、封印中断の未反映abort、公表後応答消失の完成証拠、normal公表後の正当更新保持、緊急閉鎖／control照合、B証拠のsub-ms変更と取得間競合の拒否。nonceは旧writer省略／継承・旧世代拒否用で全履歴の一意台帳ではない。

未実装：実Dev用配備確認／実行ラッパー（新CLI live無効）、自動前像rollback。追加Local試験では旧named normal世代4→停止世代5→最新像をdefaultへ反映→batch応答消失再実行→C/D→旧source保持も成功。未検証：実旧protocol→固定default移行、切替前の全境界、全batch境界の網羅的fault injection、large volume／実課金削減、実managed backup復元、Auth実復元後ログイン。未実施：Dev再停止・新配備・default移行・HS再確認／別再開了承。DB／前像削除は未承認。Authの承認済み区切りは維持し、通常DevのAuthを変更していない。復旧全体／Dev移行を完了扱いにしない。

仕様はconfirmed方針を変えず実装状態だけ更新（version0.1.121維持）。現在meeting data contractへ認可metadata／private計画／checkpoint／B typedHashを追加。設計・runbook・technical roadmap・changelogにLocal範囲と残件を反映。ADR0032／環境・権限要件は確定設計の変更がないため維持。既存索引／仕様から到達可能、新規文書なし。全体進捗の加点なし。Git push・配備・Dev書込・Auth更新・メール送信・Prod操作なし。

所有ファイル一覧（operationsはgenerated summaryの2行だけ）：

- `CHANGELOG.md`
- `app/composables/useMasterManagement.ts`
- `app/gateways/caseCommandGateway.ts`
- `app/plugins/firebase.client.ts`
- `app/utils/recoveryClient.ts`
- `docs/design/backup-recovery-implementation.md`
- `docs/design/default-database-recovery.md`
- `docs/design/evidence/recovery-implementation-2026-10-06.md`
- `docs/design/meeting-prototype-2026-10-03.md`
- `docs/operations.md`
- `docs/roadmaps/technical-remediation.md`
- `docs/runbooks/backup-recovery.md`
- `docs/specification.md`
- `firestore.indexes.json`
- `firestore.rules`
- `functions/recovery-runtime.js`
- `governance/verification-policy.json`
- `package.json`
- `scripts/default-recovery.mjs`
- `scripts/lib/default-recovery.mjs`
- `scripts/lib/recovery-controller.mjs`
- `scripts/seed-emulator.mjs`
- `scripts/seed-meeting-emulator.mjs`
- `src/domain/fixed-recovery.mjs`
- `test/default-recovery.test.mjs`
- `test/emulator/bounded-list.test.mjs`
- `test/emulator/callable-applied-warranty.test.mjs`
- `test/emulator/callable-profile-registration.test.mjs`
- `test/emulator/case-edit.test.mjs`
- `test/emulator/company-portal.test.mjs`
- `test/emulator/default-recovery.test.mjs`
- `test/emulator/fixed-runtime.test.mjs`
- `test/emulator/property-warranty.test.mjs`
- `test/emulator/recovery.test.mjs`
- `test/emulator/registration.test.mjs`
- `test/emulator/staff-account-management.test.mjs`
- `test/firestore-rules.test.mjs`
- `test/helpers/fixed-runtime.mjs`
- `test/helpers/legacy-recovery-runtime.mjs`
- `test/recovery.test.mjs`

### Dev実行・C公表の直前証拠

A legacy enter／baseline、専用clean HEAD build、Firebase deploy（firestore,functions,hosting）、canonical plan／apply、呼出IAM前後比較は各exit 0。15:41:26 JST停止後source/default各54、hash `85436d953ae39c56c5dfaa64235467b48728394839e535a4ada7c16cb8a21400`、set/delete 0、権限一致、採番上限16、更新リース0。plan `default-return-20261006-plan1` verified。旧sourceは保全。

canonical preflightはRules/index/全18 Functions一致、Hostingのみ管理2ファイル追加でblocked（読取コマンドexit 0はreadyを意味しない）。限定operator inspectは初回exit 1（公開databaseURLが空で厳格照合が拒否）、空文字だけを許す修正後exit 0。全5項目成功：default/control Rules、READY index、18 Functions／18 pinned archives、Hosting993ファイル完全一致。予約2ファイルは旧FINALIZED `sites/termite-warranty-dev/versions/b053d7fc67931cde` と新FINALIZED `sites/termite-warranty-dev/versions/cb5d99639a58bd25` のhash一致で結合。公開応答の生bytes/gzip hashをAPI保存hashと同一とは主張しない。

`node --test tmp/default-return-provider-init.test.mjs` 4成功、exit 0。`node --check tmp/verified-default-publication.mjs` exit 0（以後診断出力だけ追加）。独立DEV-PROVIDER-PROOF-01にP1/P2なし、空URL追加のdelta review進行中。追加operatorは配備ソースを変更せず、既存7ゲートの基点コードmanifestは不変のため再利用し、新しいoperatorは追加fixture／syntax／実inspectを別証拠として扱う。文書はgovernanceゲート再検証。

限定operatorのSHA256：
- `tmp/default-return-provider-init.mjs`: `d50af8f94ae9a92d9acdeae32f8d3d895e035804d54212719e4068ef5a10cd63`
- `tmp/verified-default-publication.mjs`: `13296070eb9fe767a73da8fb3f18048c76ad4839bc2f19cbb7e62bafe87cdb33`
- `tmp/default-return-provider-init.test.mjs`: `f35ce2c57531aaa8d5de344b0c746e060454e51266f67205f8246d43cdad77df`

Firebase公式 reserved URLs／full-config により `/__` 管理範囲を確認（https://firebase.google.com/docs/hosting/reserved-urls?hl=en 、https://firebase.google.com/docs/hosting/full-config）。どのファイルも除外せず、旧版由来の期待値で既存verifierへ追加する。通常Readへの追加はなく運用時管理APIのみ。C公表はまだ未実施、D／Auth取込／初回managed backup実復元／大容量実課金／全fault境界は未検証。
DEV-PROVIDER-PROOF-02独立delta reviewはP1/P2残件なしで完了。変更後fixture4件・実inspect・syntaxは各exit 0。governance検査もexit 0。上記SHAはこの最終deltaソースへ束縛。公表失敗時のstage表示だけで成否を判断せず、marker/checkpoint/lockを読取確認する。


### C公表成功・HS確認待ち

限定operator publishはexit 0、phase verification generation 6。公表の直前にもRules／index／全18 source/Run／Hosting993を全照合し成功。`node tmp/inspect-default-verification.mjs` exit 0、16:04:08 JSTにdefault/control verification6、旧source retired6、plan verified/published verification6、54文書全hash一致・set/delete 0・現在権限一致・上限16・更新リース0・lockなしを確認。`node tmp/inspect-release-targets.mjs` exit 0、default PITR有効／日次30日予定・18 Functions ACTIVE／Run100%・HostingFINALIZEDを確認、managed backupsはまだ0件。business DB削除保護は無効、control有効／PITRなし（今回変更なし）。

`node tmp/check-dev-fixed-runtime.mjs` exit 0、実runtime endpointはprotocol2/default/verification6。未認証registerCaseとlistManageableStaffAccountsは各401 UNAUTHENTICATED。これをHS認証済み閲覧/CSV/旧要求拒否の実受入成功に読み替えない。HSログイン・画面・非更新CSV確認は利用者へ依頼する区切りで停止。検査用呼出後の16:05:33 JSTにも全54文書hash・権限・採番・marker/plan一致を再照合しexit 0。最終文書governance/diff検査も各exit 0（改行正規化の既存警告のみ）。

未完了：Dの別再開了承と公表、canonical CLI管理予約2file対応の恒久化、実Auth取込/復元後ログイン、初回managedbackup生成/実復元、全fault境界/大容量/実課金。旧DB・private前像・計画・Auth・旧配備参照は保全、削除なし。記録更新は未commit（運用HEAD維持）、docs/READMEとoperations生成block外の所有外差分は保持。データ契約・確定要求・ADR・version・全体進捗加点は変更なし。


### 利用者確認OK受領・D了承待ち

2026-10-06、DevのHS管理者ログイン・保証番号検索/内容・非更新CSV・業務更新不可の確認手順を提示後、オーナーから「OKだ」を受領。提示手順全体の利用者確認OKとして記録し、各操作の独立した実測結果は提供されていないことを区別する。直前に通常再開には別了承が必要と明示していたため、この回答をDの再開了承へ読み替えず、verification generation 6を維持する。Dは(default)の更新受付を再開する操作で、業務像・Auth・IAM・旧DBを変更/削除するものではない。次は別再開了承を取得後に配備/世代/計画を再照合して公表する。HEAD固定・未commit継続、所有外差分は保持。

### D通常再開の明示了承

2026-10-06、通常Devのメンテナンス解除・defaultでの業務更新再開を別質問で提示し、オーナーが「YES」と回答。Dの実行了承を受領、参照 `owner-dev-reopen-20261006-yes`。C計画/default verification世代6/同じHEAD/全配備を再照合してcanonical reopenを実行する。Auth・IAM・業務像・旧DB削除は対象外。限定operatorはCでreview済みのwrapperからcommand/reopen確認token/了承参照と世代6のみ変更し、全配備照合を維持。実行前の段階で成功とは記録しない。
D直前の証拠：限定reopen wrapper SHA256 693a31bfcf48f58403b14aba385f1366dc87fd2a101398bee8de73c1d90ddad6、node --check exit 0、実inspect全5項目（18 Functions/source archives、Hosting993、Rules/index）成功exit 0、補足fixture4成功exit 0、admission回帰9成功exit 0、governance検査exit 0。16:13:21 JSTの直前データ再照合もexit 0、verification6/54文書hash・権限・番号上限16不変・リース0/lockなし。独立wrapper delta reviewは進行中。配備ソース/依存/基点コードは不変で、既存7ゲートの証拠を再利用する。
DEV-REOPEN-01独立レビュー完了、限定3行差分にP1/P2残件なし。wrapper最終SHA一致・固定DB/HEAD/全配備proof・C receipt/別了承を維持。実reopenの成功証拠は次のコマンド結果とpaired marker/checkpoint照合によって確認する。


### D通常再開成功（2026-10-06）

`node tmp/verified-default-reopen.mjs --reopen --confirm owner-dev-reopen-20261006-yes` はexit 0、normal generation 7。公表直前の全5配備照合は成功（default/control Rules・READY index・18 Functions/source archives・Hosting993）。`node tmp/inspect-default-normal.mjs` exit 0、16:16:13 JSTにdefault/control normal7、旧source retired7、plan verified/published normal7、業務54文書hash一致、set/delete 0、現在権限一致、発行上限16、リース0、lockなしを確認。`node tmp/check-dev-normal-runtime.mjs` exit 0、実endpointがprotocol2/default/normal7を返し、未認証registerCase/listManageableStaffAccountsは各401 UNAUTHENTICATED。HS認証済みの登録/更新を検査目的で追加せず、その実操作の再開後受入は未検証と区別する。

利用者確認OKと別再開了承を受領し、今回の最新像default切り戻しA〜Dは上記範囲で実施済み。業務像を上書き/削除せず、Auth/IAM変更なし、旧DB/private前像/計画/配備参照を保全。未実装/未検証の既存残件（恒久CLI provider対応、Auth実取込/ログイン、managedbackup初回/実復元、全fault/volume/cost）は完了へ変更しない。

今回の変更は限定reopen wrapper（ignored tmp）と影響する仕様/設計/runbook/技術台帳/changelog/本記録の実施状態のみ。業務data contract/ADR/要求version/ガバナンス設定は変更なし、既存indexリンク維持、全体進捗への加点なし。配備コード不変で全7ゲートの既存証拠は再利用、追加syntax/fixture4/admission9/実inspect/独立reviewを記録した。tracked記録は未commit、HEAD02bf維持、docs/READMEとoperationsの所有外差分を保持。最終文書governance/diff検査は次に実行する。
D完了記録のgovernance検査・git diff --checkはいずれも完了exit 0。改行正規化警告のみ。記録追記後も同じ2ゲートを確認する。


### 旧復元DBの削除判断・実行承認（進行中）

2026-10-06オーナーは「Firestoreに不要と思われるDBが存在。削除可能なら削除、不可なら理由提示」と指示。これを独立したcleanup承認として記録。対象は実APIで確認したDev `termite-warranty-dev` の `recovery-drill-20261006`（UID `d7768bc4-2701-4b04-b4d7-a8859b28c6de`）1件のみ。defaultは業務利用中、recovery-controlは制御/復旧証拠/backup監視/Auth保全の参照があり削除不可。

旧DBはPITR復元予行・default最新像移行・HS確認・D再開を終了した隔離retired7。システム障害の原因調査対象ではなく、予行の差分/配備問題は既存証拠に記録済み。16:18:58 JSTに全54業務文書のtypedhashがdefaultおよびprivate controlのplan1/preimage54件と完全一致、現在権限一致・番号上限16・未完了lock/leaseなしを確認。旧privateメタデータはaccess/activationの2件だけ。最終operator inspectはorphan/余分なsource参照・18 Functions/同region Eventarc依存なし・UID/etag/削除保護disabled/default PITR+日次30日を確認してexit 0。

削除で失うものは旧DB本体・旧DB固有PITR時点履歴・旧DBの日次予定。取得済みmanagedbackupは0件で、取得済みbackupによる保全完了とは扱わない。業務54件は既存 `recovery-control/defaultRecoveryPlans/default-return-20261006-plan1/preimage` に封印済み。旧2metadata・DBmetadata/設定/予定・全像hash・今回了承・delete operation/receiptをprivate `recovery-control/recoveryRetirements/retire-dev-drill-20261006` へ保存/読戻しし、無期限（別のオーナーcleanup了承まで、自動削除なし）で保持する。保存失敗・不一致ならDELETEしない。生データはrepo/logへ載せない。

既存operatorLockをnormal7にCAS取得、直前epoch/marker/receipt/source像/metadata/UID/etagを再照合。旧DBのみetag付きDELETE、operation名を先に保全し同じLROを追跡、404とDB一覧/default normal7を確認してからdeleted記録/lock解放。応答不明なら自動DELETE再送/lock削除をせず、journalの同operationと実DBを読み取り調査。既存generic recover-operatorはdatabase-retirement intent未対応なので自動流用しない。default業務writeはlockで停止しない。Auth/IAM変更・default停止/上書きは行わない。

`node --test tmp/dev-retirement-guards.test.mjs` 6成功exit 0（orphan/未知metadata、非同期LRO、応答消失/timeout/error/non404、journal保存拒否、operator競合/世代変化、UID/etag/削除保護拒否）。`node --check tmp/retire-dev-drill-db.mjs` exit 0、最終実inspect exit 0。canonical/app/Rules/依存不変のため旧全7ゲートの証拠を再利用し、今回operatorの追加試験/実検査/独立reviewで補足する。
- `tmp/retire-dev-drill-db.mjs` SHA256 `e3dffa8b77cae12e03cb764b88f3ce01513d9c1fe78fef9d0b7d108f177f8a75`
- `tmp/dev-retirement-guards.mjs` SHA256 `ff1757f15a2f9dd7c45b6513e22392b4e5e08defb4e907a808e6d38507775087`
- `tmp/dev-retirement-guards.test.mjs` SHA256 `2aeb6f9f798e1a33d8eb6313520a97c586494a56197e5aa750c9ca9702c77436`

archive readbackはmap key順序に依存しないtyped canonical比較へ修正し、最終syntax/実inspect各exit 0。上記operator SHAはこの修正後の凍結像。
DB-RETIRE-02独立レビュー完了、最終operator/helper/testsの限定変更にP1/P2残件なし。最終operator SHA e3dffa8b77cae12e03cb764b88f3ce01513d9c1fe78fef9d0b7d108f177f8a75を照合。クロスDB状態確認とDELETEは単一atomicではないため、今回の開発側単独操作区間でのみ実行。実削除は次のコマンド結果で確認する。

### 削除直前etag変化による停止と安全な再開

初回実deleteはDBmetadata再照合でexit 1、実stackはDELETE呼出より前。private journal/metadata保全とlock取得は済み、status preparedでoperation未記録。読取診断exit 0ではsourceUID不変、description変更キーはetagだけ。これだけでサーバー内部の原因は断定しない。初回worker終了を確認し、同じprepared保全像/UID/owner/sourcehashへ束縛した明示resumeを追加。etag以外の全descriptorをtyped比較し、直前の新GETで得たetagをDELETEに送る。etagを省略しない。要求前にdelete-submittingを保存し、不明結果からのblind resumeは拒否。

修正後helper8成功exit 0、operator syntax exit 0。canonical/app/Rules/依存変更なし。変更後SHA：
- `tmp/retire-dev-drill-db.mjs` `e0cd336ef0d130700f83215b78852e0777b1233fa9840effed9d7a0e13f6ed16`
- `tmp/dev-retirement-guards.mjs` `b3afda15f8f2153b571449b098de16dc81eb2c312700dd43c598f70184cc5e9d`
- `tmp/dev-retirement-guards.test.mjs` `4cab90fc86e81fdc49d2ffe9bd987a78c01b7d975436a79b1906d14230da3e0a`

prepared→delete-submittingを同control transactionにして状態/operation未記録/owner/op/generation/UID/sourcehashを再照合し、同じresumeの並列二重実行を拒否するCASへ修正。helper9件（並列submit片側拒否追加）成功exit 0、syntax exit 0。旧8件の証拠はこの最終試験へ置換。最終凍結SHA：
- `tmp/retire-dev-drill-db.mjs` `c848d19813bd5fdcac2e1edee44cea0f6aab037d669b7c66c14599082f7cfa3a`
- `tmp/dev-retirement-guards.mjs` `2a1dc0f14555412c762207272d6a5f50c8e3375a937f8abbec08bf170385eb2f`
- `tmp/dev-retirement-guards.test.mjs` `dad5f5e318c8544eb454f130d917ce1916bba6bffae743cf0ebfa8ef5904e43f`
DB-RETIRE-04独立レビューで二重resume P1解消を確認し、最終差分にP1/P2残件なし。上記末尾の9件成功・最終SHAを現在の証拠とする（前の8件/旧SHAは履歴）。実Firestore競合注入は未実施で、transaction直列化stub回帰と実prepared読取による検証を区別する。初回worker終了・DELETE前停止・prepared維持を再確認exit 0、次は明示resumeで同じ保全記録を使う。

実resumeは旧DB DELETEを受付済みだがLROが期限内にdoneとならずexit 1。journalはdelete-accepted、operation名を保存、lock保持。読取追跡exit 0ではoperationDone false/errorなし、旧DB GET404、default normal7。DELETEは再送せず同じoperationを読み取りで完了待ちする。404だけで既存のdeleted receipt完成条件を満たしたとは扱わない。

16:35:10 JSTの実DB一覧はdefault/control2件のみ、source不在、default PITR/日次30日維持・control削除保護有効（exit 0）。LROはエラー無し未完了のためlock/journalを保持。completion専用tmp/complete-dev-db-retirement.mjsは同operation done true/404/inventory/default/runtime/owner/CASだけを確認し、DELETE再送経路を持たない。syntax exit 0、独立DB-RETIRE-FINAL-01 P1/P2無し、SHA49d41406b625d01bcf4a565c600d1fcb7fdc26124f981d26ef11ff6904ebfdac。実完了は待機中。

### 旧DB削除完了・最終確認

同じ削除operationがdone true/errorなしとなるまで読み取り追跡し、DELETEを再送していない。`node tmp/complete-dev-db-retirement.mjs` exit 0、同operation完了/source404/inventory/default/control normal7を確認後、journal deletedと正確ownerのlock解除を実施。`node tmp/inspect-dev-after-db-cleanup.mjs` exit 0、16:38:28 JSTに54文書typedhash `85436d953ae39c56c5dfaa64235467b48728394839e535a4ada7c16cb8a21400` 不変、private前像54/metadata2、journaldeleted、リース0/lockなしを確認。`node tmp/check-dev-normal-runtime.mjs` exit 0、実runtime default normal7・未認証呼出401を再確認。DB一覧2件/default PITR/日次30日維持は16:35:10実読取exit 0。

今回はDev旧復元DB1件だけを削除。default/control/Auth/IAM/業務像/既存復旧計画・全前像を削除せず維持。canonical/app/Rules/依存を変更せず、全7の既存証拠と追加helper9/構文/独立review/実確認を区別。無変更のdata contract/ADR/要件version/ガバナンス設定/全体進捗を更新しない。影響する仕様・固定DB設計・runbook・技術台帳・changelog・本記録を更新、既存indexリンク維持。記録は未commit、所有外docs/README/operations差分を保持。今回の追加Readは運用検証であり通常画面に追加していない。残件の恒久CLI provider対応/実Auth/managedbackup初回と復元/全fault/volume/costは完了扱いにしない。
cleanup完了文書のgovernance検査とgit diff --checkは各exit 0、改行正規化警告のみ。最終追記後も同2ゲートを再確認する。利用者の追加操作は不要。

## 2026-10-06 障害通知からの正式運用準備（INCIDENT-02）

オーナーは、今回専用処理で終えず、このCodexプロジェクトで実障害通知を受けたらメンテナンス・復元を進められる状態を要求。設定済みDevの実障害通知を停止開始の指示としてproject-rules／仕様／ADR0032／runbookへ保存した。復旧時点のHS事前了承、技術検証後のHS読取/非更新CSV確認、別再開了承を維持。今回の準備を正常Devの停止と扱わず、Prod/Auth修復/IAM/DBや証拠削除へ拡大しない。

正式CLIにビルド不要のobserve、明示した過去の公開Hosting版に基づくprovider2ファイル照合を組み込み。認証済みlive release履歴のDEPLOY/過去時刻、非current、同site FINALIZED、project/app/public config、前後live版、全アプリpath/hash/configを検証。未公開/future/foreign/rollback/current基点は拒否。未確認のcurrent hashを期待値に自動採用せず、tmp wrapperから正式helperへ移した。

独立レビューで過去legacy account bindingと現在UIDの違いがB検証を止める条件を確認。現在bindingsをprivate baselineへ保存し、profiles/counterと一緒に完全補正、補正以外の像を不変hashで確認する。過去像に現在UID profileがない場合、既存reconcileがundefinedをhashして失敗する不具合も実統合試験で再現し、exists確認で修正。現在所属の会社が復元像にない場合は補正範囲を広げず閉鎖維持。旧binding→現在UID、欠損profile、会社欠落安全停止、余剰業務削除、現在権限/上限保持、別D了承を含むfixed A→B→C→DをLocalで検証。クラウド復元receiptと原像の準備だけはfictionalであり、managed restoreの実成功ではない。

最終コード後の選択全7ゲート：

| Command | Result | Independently observed exit |
| --- | --- | --- |
| `npm test` | 242 total / 240 pass / 2 existing Windows symlink skips | 0 |
| `npm run typecheck` | success | 0 |
| `npm run build` | success, existing build warnings | 0 |
| `npm run test:rules` | 108 pass / 0 skip, including real fixed controller chain | 0 |
| `node scripts/check-functions-syntax.mjs` | all 28 files | 0 |
| `node --check scripts/seed-emulator.mjs` | success | 0 |
| `./scripts/check-governance.ps1` | current v3 managed/policy alignment | 0 |

最初のRules起動はsandboxのFirebase CLI設定読取EPERMでexit1、承認済みLocal実行をescalationで再実行。実装途中の全体Rules108成功は後の変更で失効。最終chain追加後のRulesは107pass/1fail、原因を絞る単独再現もexit1。exists修正後の単独chainはexit0、以降の最終全体Rules108成功exit0を採用。domain/runtime変更後の古い証拠を流用しない。各wrapperはcommand直後のLASTEXITCODEを保存してその値で終了し、後続表示の成功でstatusを上書きしない。単独provider/admission23fixtureもexit0。独立INCIDENT-02の最終コード/設計reviewにP1/P2残件なし、reviewerはread-onlyで試験や配備の代行なし。

Dev正式observeはexit0、protocol2/default/normal7、control/marker一致、更新リース/運用lock/Auth退避lockなしを確認。未commit runtime source cleanゲートblockedを正しく表示し、observeが実行許可を与えないことを確認。正式provider helperをAPI read-onlyで検証してexit0、旧公開版b053d7fc67931cdeの出自/設定2ファイルを確認、現在liveは `sites/termite-warranty-dev/versions/cb5d99639a58bd25`。これだけで全配備証明や新C/D成功とは扱わない。

影響ファイル：scripts/default-recovery.mjs、lib/default-recovery-provider-init.mjs/default-recovery-observation.mjs/default-recovery-release-proof.mjs/recovery-controller.mjs、admission/release-proof/emulator-defaultの試験、project-rules、仕様、両復旧設計、ADR0032、runbook、技術台帳、changelog、本記録。business data contract/アプリ/Functions/Rules/index/schema/通常ReadWriteは不変。private baselineのbindings追加は実装設計に反映。既存indexから到達可能、新規文書なし。docs/READMEとoperationsの所有外差分は保持。共通managed/governance policy/version変更なし、全体進捗加点なし。

未完了：新commitの専用profile成果物をDev Hostingへ反映して正式CLIの全配備確認を通すこと。tool-only commitでもbuildIdが変わるため、旧配信artifactを新HEAD一致と扱わない。現normal7を停止/復元せず、Hosting-onlyの対象・成果物・差戻し先を提示し実行承認後に確認する。実Auth取込/復元後login、managedbackup初回/実復元、全fault/volume/cost、実Dev緊急閉鎖は従来の別残件。プラットフォーム/認証/control不能時の即時成功は保証しない。
