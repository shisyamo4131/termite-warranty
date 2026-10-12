# バックアップ・全体復旧の操作手順

## 2026-10-12 報告済み保険の月別検索との互換性

HSC-042の新しい検索用項目・準備印は[月別取得設計](../design/monthly-queries.md#2026-10-12-実装設計と導入手順)に従う。`prototypeSettings/insuranceReportQueries.version=1` の復元像では、全物件の追加2項目を正本から再計算して一致を検査し、不一致なら公開しない。準備印がない旧像は、その不足だけで全体復旧を拒否せず、報告済みを含める新検索を未準備として止める。version=0も新検索を閉じた状態であり、準備完了とは扱わない。

再開する新検索には、正本の報告・取消・期間状態を維持した補完・全件照合が必要。今回の追加は旧バックアップの業務履歴を推定修復する機能でも、実Devの復元承認でもない。導入・試験・配備の状態は[運用記録](../operations.md#2026-10-12-月別3一覧の実装dev導入)を参照する。

## 2026-10-12 会社設定・請求先の復旧条件

[確定設計](../design/company-settings-and-document-csv.md)で追加する自社情報・請求先は業務バックアップ/復旧の対象とし、通常の全体復旧では他の業務データと同じ復旧時点の値へ戻す。導入時には追加値の保存・復元一致と、設定未登録の旧データ互換を検証する。物件の再取込みでは設定を保持する別の扱いを採用しており、[再取込みの保全条件](historical-property-intake.md#2026-10-12-追加設定の保全条件採用手順改修は未着手)と混同しない。

会社設定・請求先の保存を実装し、既存の全件復旧が更新日時・更新者を含め同じ復旧時点へ戻す架空試験を追加した。[検証と配備の記録](../operations.md#2026-10-12-会社設定請求先保証書csvの実装とdev反映)を参照。バックアップ設定は変えておらず、Dev自動取得の再開・実バックアップ取得済み・実復元の承認や証拠として扱わない。

## 2026-10-10 過去物件の初期取込み後

オーナー承認に基づくDev初期取込みでnormal10→recovering11→verification12へ移行し、別の再開了承後に正式reopenでnormal13へ復帰。442物件の全件照合・専用`plan-intake`・正式配備照合・確認用公開・再開後検証まで成功。現在は通常利用可能。バックアップ復元ではない。[通常再開のコマンドと検証結果](historical-property-intake.md#2026-10-10-通常再開残る開発検証)を参照し、下記の旧住所移行計画やnormal10を現在値として流用しない。

## 2026-10-07 Dev自動取得・PITRの停止（現在の例外）

オーナーの指示と追加回答により、スキーマ変更中のDevは自動取得とPITRを停止する。実APIで確認した`termite-warranty-dev`の(default)について、日次予定を削除、PITRを無効化、SchedulerをPAUSED、既存18 Functionsの`RECOVERY_BACKUP_AUTOMATION`をfalseへ変更した。取得済みFirestoreバックアップ1件とAuthスナップショット1件を削除し、再取得で両方0件を確認。Authハッシュ設定の私有オブジェクト1件、復旧実装、通知設定、過去の監査記録は保持。通常業務は世代7／normalを維持した。旧成功記録を現在の復元可能なバックアップとして扱わない。

停止中も障害通知時のメンテナンス入口は維持するが、現在は取得済みバックアップ／PITRから業務を復元できない。復旧元がなければ停止を維持し、利用可能な原資料や別の保全像を調査して報告する。バックアップ自体が後から書換わるのではなく、変更後のアプリとの互換性を管理する意図で停止した。

**Prod提供前の必須作業**：実Prodの対象・権限を確認し、日次30日保持・PITR・Auth自動退避・失敗通知を有効化する。初回Firestore READY、Auth私有readback、通知到達、schema／配備版と復元互換性を確認してから提供する。PITRは実`earliestVersionTime`を確認し、有効化直後に過去7日分があるとはしない。Prodの有効化は未実施。Dev再開は別の明示指示時に行い、Prod提供開始をDev自動再開の指示へ広げない。

Localの無視設定`functions/.env`もfalseとし、後続Dev配備で誤って自動取得を再開しない。Cloud設定変更・削除と読取再確認は各exit 0。業務データ、Authアカウント、権限、Hosting、アプリコードの配備は変更なし。詳細は[共通取込み設計](../design/property-bulk-import.md)。

## 住所統合の移行・確認待ち・再開（2026-10-07 Dev再開済み）

提示済み計画をオーナーが承認し、f9c275bの19 FunctionsとHosting配備、更新収束、事前baseline54文書、既存16件の住所移行、全体不変と配備照合、HS確認待ちへのpublishまで各exit0で完了。その後オーナーの住所確認と別の再開了承を受け、旧公表計画・f9c275bの正式照合でreopenを完了。現在(default)／normal／世代10、runtimeとmarker一致、更新リース・Authロック・運用ロックなし。追加cbb5859の19 Functions／Hosting配備と正式照合も完了。実行ID・正確なコマンド・失敗も含む結果は[実行記録](../design/evidence/common-import-address-2026-10-07.md#2026-10-07-承認後のdev反映住所移行)。新たなバックアップ復元やAuth変更は行っていない。

オーナーに示す確認手順：Devを再読込してHS管理者でログイン→HS確認待ち表示→物件詳細の単一住所が元の都道府県・市区町村・町域番地を順に結合した値であることと、保証番号・日付・期間・所属を確認→保険報告用一覧で対象月を抽出し選択行CSVを確認（報告済み変更は不可）→確認結果をシステム外で連絡。支店コードの編集、CSV一括取込み、通常保存など更新を伴う機能のDev受入は再開後の別段階。この住所確認と別の通常再開了承はオーナーから取得済み。旧計画で正式reopen後、追加コードを配備した。共通CSV・支店コード・外部キーの[再開後受入手順](../design/evidence/common-import-address-2026-10-07.md#外部キー改修の受入手順と残件)は未完了。

健康なDevの一時停止と配備・住所移行は、障害通知の事前指示とは別に、具体対象・手順の承認を得て行う。対象は(default)内の物件住所だけ。バックアップ復元、一時DB作成、全体同期・余剰削除、Auth変更は行わない。読取計画は16件・不一致0件、planHash `5d05467d16543e613d5b47c653fa0dde68fd9dad60f9af0013d4ab5508b748d9`（inspect exit0）。停止前／後に再調査し、対象件数・hash・不一致に変化があれば具体計画を再提示する。

1. 実HEADと配備対象（既存18 Functions＋propertyBulkImport、Hosting）を固定し、Dev停止の承認を照合。実runtime世代をobserveで確認してenter。HS管理者の業務アクセスも閉じ、更新リースとAuth退避の収束を確認する。
2. 新コードを配備し、住所適用より先にrecovery.mjs baselineで現在の全体・Auth対応／権限・所属・発行済み番号を保全する。追加の型付きhashがない旧baselineは住所公開へ流用しない。
3. property-address-migration.mjs inspect/applyで保全・原子的な住所変更を実施する。完了journal／checkpointと全対象のhashを照合。結果不明はstatusと正確なownerを確認し、旧処理が終了した場合だけ同じID／hash／世代のresumeを行う。単純な再送やロック削除はしない。
4. default-recovery.mjs plan-addressを使い、変更前住所を再構成した全体hash／件数を移行前baselineと比較する。住所以外の変更、番号／権限の変化、残存旧項目、保全記録の改変／欠落、差戻しがあれば停止を維持する。計画は公開専用で、通常apply/resumeは拒否する。
5. 同じ計画をpublishする。配備一致と完成検証に成功した場合だけHS読み取り確認待ちへ移る。閲覧と状態更新のないCSV出力を確認してオーナーへ手順を提示し、そこで待つ。別のHS再開了承を記録した後にreopenする。

plan-addressの主要追加引数は`--baseline <移行前ID> --address-operation <住所適用ID> --address-plan-hash <照合hash>`、`--source '(default)'`。Devの共通引数・明示承認／実行ガードは既存固定CLIと同じ。復元用の`--verification`や`--migration`は使わない。計画とロックは同じ制御transactionで作る。封印／公開の応答不明は既存recover-operatorで、正しいownerと旧worker終了を照合する。未検証の封印は閉鎖を維持して未適用終了へ収束し、新IDで再計画する。公表成功済みは完成印を確認し、元の世代へ戻さない。

住所差戻しは公表前の同じ停止世代でのみ対応。公表後に停止し直すと世代が変わるため、既存rollbackを流用せず現在像を保全した別計画を用意する。非公開移行前値・baseline・計画は無断削除しない。追加経路のDev publish/reopenを実行済み。LocalとDevの実行証拠は[専用記録](../design/evidence/common-import-address-2026-10-07.md)を参照。

## 外部キー追加改修中の版管理（2026-10-07）

住所統合の確認待ち計画はf9c275bの実配備へ結び付いている。その後の外部キー必須設定・名称設定のLocal差分は、同じ版のDev反映済み内容ではない。追加差分がある作業ツリーで旧計画の再開を実行したり、clean-source／配備照合を省略しない。追加配備前には実runtime・旧公開計画・配備版を読み取り、追加配備とUH実グループ設定の対象を提示して承認を得る。今回の実行では追加ソースだけを一時保全し、同一版の正式最終照合・住所確認・別再開了承のすべてを満たして旧計画で先にreopenした。その後ソース復元・統合・追加配備を行う。旧確認待ち計画を別版へ付け替える経路は用意しておらず、その必要もなかった。既存データの削除、住所の再移行、Auth変更、自動取得の再開は追加改修に含めない。

外部キー付きの通常登録は外部キー予約と対応する物件を照合する。取込由来の物件だけに受領行／成功記録を追加照合し、通常登録に架空の取込記録を求めない。予約の欠落・孤立・重複、必須グループのキー欠落、不正な文字列は停止を維持する。[共通設計](../design/property-bulk-import.md)。

## 障害通知からの開始（2026-10-06採用）

オーナーからこのプロジェクトで実際の「障害が発生した」旨を受けたら、以下を開始し、Dev停止開始を再質問しない。今回の準備指示を、正常Devを停止する指示とは扱わない。現在の設定対象は `termite-warranty-dev`、業務 `(default)`、制御 `recovery-control`、Hosting `termite-warranty-dev`。Prodは未設定／コマンド非対応で、この対象へ読み替えない。

1. AGENTS／project-rules／本節／固定DB設計を読み、実HEAD・対象設定・Firebase CLI認証を確認。下記 `observe` で実DB識別・公開停止状態・制御状態・未完了処理を読む。ビルドや全業務取得はせず、世代を過去の記録から推測しない。
2. 公開markerと制御が一致してnormalまたはverification、運用ロックなしなら、照合世代で新しい停止IDの `enter` を実行。HS確認待ちのverification中に新たな実障害が発生した場合も確認用の閲覧を閉じる。通常観測の `await-hs-consent` 表示を、新障害時の本手順より優先しない。配備の全照合や更新リース0を待ってから停止するのではない。HS管理者も業務アクセスを閉じ、再観測する。既にrecoveringなら再送しない。途中失敗・世代不一致はintent／owner／marker／private記録を照合し、旧worker終了を確認して対応する回復コマンドを使う。
3. 更新リースとAuth退避の収束を確認し、現在権限・所属・採番のbaselineを保全。取得可能なバックアップ／PITR時点を調査。時間切れだけで未完了記録を削除せず、停止開始と停止完了を区別して報告する。
4. 復旧候補時点と、その後に戻らない更新の範囲を提示し、従来どおりシステム外のHS了承を確認。既に明示された有効な了承は再質問しない。新しい一時DBへ復元し、非同期処理完了・隔離・原像hash・現在権限と採番の補正・参照と整合を検証する。
5. 一時DB検証証拠を使い `plan → apply → publish`。期待像にない業務文書の削除も含む完全同期で(default)へ復旧。対象・復旧時点の了承を別環境・別時点・Auth/IAM変更・DB削除へ流用しない。配備破損時は対象と互換性を確認し、必要な修正／配備と新計画を用意する。再開まで版を固定する。
6. 技術検証成功後だけHS管理者の読み取り／非更新CSVを開放し、オーナーへ確認手順を提示して待つ。別途得たHS再開了承を記録して `reopen`。Auth自体の復旧・一時DBや証拠削除は別手順と承認であり、自動実行しない。

```powershell
$recoveryRevision = (git rev-parse HEAD).Trim()
node scripts/default-recovery.mjs observe --project termite-warranty-dev --control recovery-control --revision $recoveryRevision --dev-inspect
# 実際に照合した世代、新しく発行した停止ID、非秘密の障害通知参照を使用する。
node scripts/default-recovery.mjs enter --project termite-warranty-dev --control recovery-control --revision $recoveryRevision --source '(default)' --generation <照合世代> --site termite-warranty-dev --operation <新停止ID> --approval <障害通知参照> --dev-execute --apply --confirm fixed-recovery
```

`observe` は読み取り専用。業務本文／認証情報を出さず、ビルドなし、更新リースはlimit(1)で有無だけを読む。runtime/marker一致、phase/generation、未完了操作ID/owner/種別、収束待ちを表示する。marker閉鎖だけで収束完了としない。ローカル差分がある場合も状態調査はできるが、実行は確認済みcommit・ソース無変更ゲートを維持する。未確認コードの実行例外ではない。

### 正式コマンドの組み合わせ

固定方式Aは `default-recovery.mjs enter`。保全と一時復元のBは `recovery.mjs` の `baseline / backups / restore / restore-status / quarantine / scan / reconcile / verify`。C/Dは `default-recovery.mjs` の `plan / apply / publish / reopen`。旧 `recovery.mjs enter / cutover / reopen` はprotocol2で拒否される。Bには同じproject/control/revision、停止後の実generation、各操作の新IDと固有証拠を指定する。新一時DB名へレビュー済みRulesを先に配備し、新DB不存在を確認してrestoreする。

復元要求は再送しない。応答消失時はprivate `recoveryTargets/<一時DB>` と同じoperationを照合する。完了証拠なしでquarantine/reconcile/verifyへ進まない。planには同じbaselineとverifyのID・一時DBを指定し、通常復旧で `--migration` は使わない。apply中断は同じ封印計画、停止済み旧worker、正確なownerを要する。公表失敗は完成checkpointとmarkerの実状態を読んで判定し、成功済み遷移を再送しない。

### 配備確認の管理ファイル

固定CLIの `preflight / publish / reopen` には必要に応じ `--hosting-provider-version sites/<照合site>/versions/<事前確認済み旧版>` を指定する。現在live版を期待hashの出所にして自己証明しない。旧同site FINALIZED版の管理2path/hash、認証済みproject/app設定、公開init設定、前後live版一致を確認し、アプリを含む全path/hash/configを通常verifierで照合する。2ファイルの除外ではない。

2026-10-06に照合済みの旧版は `sites/termite-warranty-dev/versions/b053d7fc67931cde`。使用時には実対象で再確認。管理hashや設定の変更、未知path、旧版消失、配備混在では開放を拒否する。baseline変更は設定と実配備の独立確認が必要で、現在hashを自動採用しない。今回専用tmp wrapperを標準手順にしない。

### 実行不能時

認証／クラウドAPI不能、制御DB不明・破損、未知schema、未完了の応答不明操作、現在権限・採番の破損では「停止／復旧できた」と報告しない。確認できない点、実行済み範囲、更新がまだ許可される可能性と必要な人の操作を示す。制御異常時の緊急閉鎖はLocalのみで実Dev経路は未有効化。プラットフォーム自体の障害も停止操作の即時成功を保証しない。初回managed backup実復元・実Auth復旧・大量データ／全障害点は未検証として残す。

## 2026-10-06 方式変更後の運用対象

通常業務は(default)固定に変更する。新A/B/C/Dの手順・余剰文書削除を含むCの回復設計・現在Devの切り戻し計画は[新方式設計](../design/default-database-recovery.md)を参照。Local基盤は全7ゲート・独立レビュー済み。続行で明示的なDevガードと実配備照合を追加し、最終Local全7ゲート・独立レビュー済み。**以下の旧cutover／全体復旧順序は実施履歴と現行コードの説明であり、新方式の実行手順として使わない。** 旧cutoverを(default)へ無理に適用しない。

Authは退避・private readbackとLocal欠損UID復元の承認済み範囲で区切る。実Auth取込と実ログイン・部分失敗の手動回復は未対応。Devの再停止・具体データ反映・配備は対象と手順を提示して別承認後。HS確認とDの再開了承も別。旧DB／一時DB／保全像の削除は別承認が必要。

状態：初期実装のLocal検証済み。2026-10-06にDevの保護設定・制御DB・限定IAM・復旧対応版の配備、メンテナンス有効化、通知到達、隔離PITR復元と検証・切替を実施。HS管理者の確認と別の再開了承を受け、通常Devを新DBで再開（世代4）。実Auth退避・私有readbackは3件で成功。初回managed backup生成は未確認。Firestore未取得時もAuth成功を保持する監視状態修正は全7ゲート・Dev配備・実再試験済み。現在の状態・保留操作は[実測記録](../design/evidence/recovery-implementation-2026-10-06.md)を参照。Prod設定はHSアカウント等の情報待ち。確定仕様は[復旧範囲](../specification.md#2026-10-06-バックアップ復元の対象範囲)、内部契約は[実装設計](../design/backup-recovery-implementation.md)。

## 導入前の確認

実プロジェクト・制御DB・復元先・DB所在地・配備版・権限をその場で照合する。Devの実制御DBは`recovery-control`、所在地は`asia-northeast1`。再作業でもAPIで照合し、Prodへ同じ名前や承認を広げない。通常Devを止める日時と、実設定・配備・予行の対象を確認してから実施する。Functionsの全世代を停止／切替し、旧世代の処理が収束したことを確認して初期化する。

`RECOVERY_CONTROL_DATABASE`を設定したFunctionsは、未初期化ならアクセスを停止する。制御DBに`firestore.control.rules`、業務DBに`firestore.rules`をそれぞれ配備する。CLIはAPIで各DBの実際のRules本文を照合する。復元先名にも、復元のPOST前にDB IDで隔離する業務Rulesを公開して照合する。DB作成前のRules公開は2026-10-06のDevで成立し、control／復元先名とも本文一致を確認した。別環境で成立するとは仮定せず、不可なら順序を再設計する。既存DBの上書きで代用しない。

既定DBの`_recovery/activation`は恒久的な導入確認点。既定DBを旧業務DBとして切り離した後も、この確認点を保持する。既定DB削除は現構成では利用停止を引き起こすため禁止。旧DBの将来の削除は、確認点の移設を含む別設計・承認が必要。削除コマンドは用意しない。

## 自動取得の有効化

導入時、制御DBがまだない環境では`configure-backups`の状態確認が成立しない。既存業務DBの保護設定だけを先行する場合は、照合済み・コミット済み・runtime差分のない版の`firestoreRecoveryProvider.configure`へ、APIでその場で存在を確認したDev DB IDを渡す。プロジェクト・所在地・課金・既存予定と必要権限を確認し、同じ日次30日／PITR方針だけを適用する。この導入設定はアプリ接続先・Rules・制御状態・業務文書を変更しない。制御の初期化／切替／復元へ拡大しない。管理APIの不明な応答後は設定を再取得し、作成を無条件に再送しない。差戻しは再照合の上で予定とPITR設定を戻す判断を行い、取得済みバックアップは削除しない。

- `configure-backups`でアクティブな業務DBに日次・30日保存を設定し、PITRを有効化する。設定が既に異なる場合は停止する。PITRの7日分は有効化直後から揃うものではなく、APIの`earliestVersionTime`を毎回確認する。
- Auth用の非公開Storageバケットを実IDで指定する。公開アクセス防止を`enforced`、統一アクセスを有効化し、`auth/`に30日削除ルールを設定する。権限とパスワードハッシュの取得権限を確認する。Firebaseのパスワード復元用ハッシュ設定は別の非公開保管先に退避し、参照だけを`RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE`へ設定する。秘密値をGit・CLI引数・ログ・画面へ載せない。
- Cloud Monitoringで`jsonPayload.recoveryBackupFailure=true`のログに対するメール通知を設定する。通知先は確認済みの開発側宛先のみ。試験通知を受信してから証拠参照を`RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE`へ設定する。HSへの自動メールは設定しない。ログが出ることだけでメール到達済みとは扱わない。
- 上記を照合後、`RECOVERY_BACKUP_AUTOMATION=true`と`RECOVERY_AUTH_BACKUP_BUCKET`を設定する。監視は日本時間10時の日次。READYで未期限切れの業務バックアップが36時間以内にない場合は未取得／失敗。Authは週次とアカウント変更後に取得する。設定不足、権限不足、並行変更がある取得は成功にしない。切替後の新DBにもバックアップポリシーを設定する。

## 外部コマンド

入口は`node scripts/recovery.mjs <command>`。`--project`、`--control`、`--revision`を明示する。Localは`--project demo-termite-warranty --emulator`と専用Auth／Firestoreポートのみ。Devの許可対象は`termite-warranty-dev`のみ。Prodは対応しない。

実更新では`--revision`と実Git HEADが一致し、実行コード・Rules・設定に未コミット変更がないことを要求する。Localの開発中検証は未コミット実装で行えるが、実環境へ同じ扱いを広げない。

`status`、`scan`、`backups`は読取専用。他のコマンドは既定で**計画の表示だけ**であり、実行には`--apply --confirm recovery --operation-id <照合済み処理ID>`が必要。初期化以外の更新には`--generation <statusで確認した世代>`も必要。未知・重複の引数は拒否する。`scan`は本文を出力せず件数・ハッシュを表示する。

| コマンド | 用途／追加引数 |
| --- | --- |
| `initialize` | 導入確認点、アクセスマーカー、制御状態を初期化 |
| `status` | 現在世代、DB、実行中更新、停止した運用処理を確認 |
| `enter` | 新しい更新の受付を停止してメンテナンス開始 |
| `baseline` | 更新収束後、現在の権限・Auth対応・採番上限を非公開制御DBに保全 |
| `backups`／`configure-backups` | 日次取得／PITRの確認と設定 |
| `restore` | 新DBへ管理バックアップ／PITR復元。`--target`、`--backup`または`--snapshot-time`、`--approval` |
| `restore-status` | 復元処理の完了と実対象の照合。`--target --restore-operation`。復元POSTの再送はしない |
| `quarantine` | 完了した復元先を処理中に隔離。`--target` |
| `scan` | 復元直後の件数・ハッシュを記録。`--target` |
| `reconcile` | 現在のアカウント権限を保ち、採番上限の巻戻しを補正。`--target --baseline --snapshot-hash` |
| `verify` | 元の復元像、限定補正、Auth、参照・採番を検証。`--target --baseline --snapshot-hash --restore-operation --recovery-point --approval` |
| `cutover` | 検証証拠を再確認し、旧DBを隔離してHS確認待ちに切替。`--verification` |
| `reopen` | HSの別の再開了承後、証拠を再確認して通常稼働へ。`--approval` |
| `resume-operator` | 中断した運用処理を照合して収束。`--expected-operation --confirm-worker-stopped`。再開担当も中断した場合は`--expected-recovery-owner --confirm-recovery-worker-stopped`を追加 |

`--approval`はシステム外で実際に得た了承の非公開記録への短い参照。復旧時点と再開で同じ参照を使わない。了承内容や個人情報は引数・ログに書かない。画面には操作・了承ボタンを置かない。

## 全体復旧の順序

1. 開発側が`enter`を実行し、実行中更新がゼロになるまで待つ。滞留処理・リースを自動削除しない。
2. `baseline`で現時点の権限・停止状態と発行済み番号の上限を保全。壊れた元DBの物件参照切れだけでこの保全を止めない。権限／Auth対応や番号上限自体が不明なら、手動調査が終わるまで停止する。
3. 復旧時点と戻らない更新の範囲をHSへシステム外で説明し、事前了承を得る。
4. 選択した時点を新DBへ`restore`。`restore-status`で同じプロジェクト・元DB・バックアップ／PITR時点・新DB・処理完了を確認する。`quarantine`後に`scan`し、元の復元像のハッシュを記録する。今日の元DBのハッシュとの一致を要求しない。管理サービスの復元完了と元像の業務確認は別の検証であり、ハッシュだけで業務内容の正しさを断定しない。
5. `reconcile`で現在のアカウント情報と採番上限だけを反映し、元像と補正後の像を別に記録する。過去アカウントへの復帰や発行済み番号の再利用を許可しない。会社・支店自体が復元で失われ、現在の利用者所属を維持できない等のケースは手動調査・別の補正承認が必要。
6. `verify`で現在のAuth対応、元像／補正証拠、物件の参照・状態・番号重複・カウンターを確認する。未知コレクション、旧案件採番、未解決アカウント更新ロック、権限不明、スキーマ不適合は停止する。現在の確認予算は10万文書・1000アカウントまで。大規模な場合は予算・保全形式を見直す。
7. `cutover`して開発側が動作確認し、HSへ報告。HS管理者が閲覧・更新しないCSVを確認する。業務更新は停止を維持する。
8. HSの再開了承を別に得て`reopen`。保証番号検索、必要な業務操作、バックアップポリシー、通知設定を接続先の新DBで確認する。旧DBは隔離したまま原因調査まで保存する。

Auth自体の破損では、業務復元だけで再開しない。非公開退避・ハッシュ設定・UID対応を使う別のAuth復元手順と実行承認が必要。現実装はAuth退避と整合確認までで、Auth一括取込・利用中Dev Auth巻戻しは用意していない。

## 失敗・応答消失

外部効果前の確定した入力／検証拒否は運用ロックを解放する。外部効果開始後は計画付きロックを残す。実行者を停止し、`status`で処理と世代を照合して`resume-operator`を使う。切替・再開の収束では、保存した検証と了承を再確認する。証拠が変わっていれば開放しない。補正途中の失敗は閉じたままロックを回復し、同じ補正IDで再実行する。未検証の証拠を成功へ書き換えない。

補正の途中再実行では、アカウント文書と対象カウンターの値／更新日時以外が変わっていないことを不変ハッシュで確認する。完了済み補正証拠は書き換えず、保存した補正後ハッシュと現在像の一致が必要。異なる業務変更があれば手動調査へ停止する。補正の変更件数は最後の適用試行の件数で、途中で既に反映した数を含まない。全体の比較は元像／補正後ハッシュを使う。

復元POSTの応答／journal更新が失われた場合はPOSTを再送しない。クラウド側の処理を読み取りで調べ、対象と元バックアップ／PITR時点が一致する処理名を`restore-status`へ渡す。journalに処理名がない場合は`--confirm-worker-stopped`も必要。APIで元時点を照合できなければ自動採用せず、手動調査で停止を維持する。初期化途中や設定／Rules不一致も手動照合まで利用停止。

## Dev予行の完了条件

Localの実測・画面確認と未実施範囲は[実装・検証記録](../design/evidence/recovery-implementation-2026-10-06.md)を参照。Local結果を実管理バックアップ復元やDev予行の完了に読み替えない。

最初に架空データ／隔離復元先で、件数、原像と補正、参照・採番、権限、旧要求拒否、途中失敗、所要時間を確認する。その後、調整した日時に通常Devでメンテナンス→接続先切替→HS確認待ち→再開を予行する。実メールは別の試験承認・宛先照合後。隔離試験だけで通常Devの予行完了と報告しない。


## 初回日次バックアップの確認と次の復元試験

2026-10-06の続行確認では、実active DBの日次30日予定は維持、バックアップは0件だった。日次バックアップの取得時刻は指定できず、10:00 JSTは取得時刻ではなく監視時刻（[公式バックアップ仕様](https://firebase.google.com/docs/firestore/backups)）。初回完了時刻は未確定。予定の再作成やPITRで日次バックアップの実生成を代用しない。

次回は`backups`で実source一致・READY・期限内・snapshotTimeを確認し、実バックアップを選んで新しい隔離DBへ復元する。復元先名・Rulesをその場で照合し、元時点の期待像がない場合は件数/hashを記録して参照・採番・Auth対応を検査する。現在の業務DBとのhash一致を成功条件にしない。現CLIの`restore`はrecovering状態を要求するため、通常Devを再停止する日時と実復旧時点の了承が必要。前回の停止／時点／再開了承を流用しない。稼働中に隔離復元する新経路は未実装。

## 消失Authの復元：Local先行

2026-10-06に消失UIDだけの復元を採用。`node scripts/auth-recovery.mjs inspect --project <確認した対象> --control <実制御DB> --revision <実HEAD>`はDevの私有証拠と現行対応を読み、件数だけを表示する。Devの`restore`／`--apply`は拒否する。

Localは`--project demo-termite-warranty --emulator`と、秘密を含まない架空の`--snapshot <JSON fixture>`／`--hash-configuration <JSON fixture>`を指定。実行には`restore --apply --confirm auth-recovery --generation <確認した世代> --operation-id <新規処理ID> --approval <Auth専用了承参照> --confirm-exclusive-auth`を追加する。復旧作業中・業務更新収束・private export不在・運用ロックなしが必要。実Auth退避をLocalのファイルにコピーしない。

現行のアカウント文書が信用できる場合だけ、欠損AuthをそのUID／email／停止状態で補修し、その後に通常の`baseline`／整合検証へ戻る。現在の権限・停止状態も失われた場合は自動復元しない。既存UIDは取込対象にしない。別UIDへの同じメール、部分失敗、応答消失、未知方式等では停止し、記録を保持。部分失敗のロックを一般的な`resume-operator`で解除しない。

Localは全7ゲート成功。全消失・既存UID保持・現在の停止状態保持・部分成功／応答消失時のロック保持を架空データで検査した。実パスワードの復元後ログインや、実Auth消失のDev予行はまだ確認していない。生きたDevのアカウントを削除して試験することは今回の承認に含まれない。実取込の有効化前に、退避ファイルの保存世代を固定する証拠、隔離した実資格情報の予行、部分失敗の手動照合手順を整える。


## 固定(default) Local予行

専用Firestore/Authエミュレータ、明示した架空project `demo-termite-warranty`、独立control、確認した40桁revisionが必須。`node scripts/default-recovery.mjs <command> --project demo-termite-warranty --control <fictional-control> --revision <inspected-HEAD> ...`。status以外は`--apply`なしなら計画表示だけ。Devは以下の明示ガードと具体実行承認を要する。このLocal手順をDevへ読み替えない。

| 段階 | commandと追加引数 | 完成／失敗時 |
| --- | --- | --- |
| A | enter --generation <current> --operation <id> --apply | control→marker閉鎖。statusのactiveOperations 0まで待つ。HS管理者も業務閲覧拒否 |
| B | 旧recovery.mjsのbaseline／quarantine／reconcile／verifyを一時DB限定で使用 | protocol 2 verifyはtypedHashも保存。旧cutover/reopenは固定runtimeに拒否 |
| C計画 | plan --generation <stopped> --operation <plan-id> --source <temporary> --baseline <id> --verification <id> --approval <external-record> --apply | current権限・採番と全前像をprivate保全。余剰削除を含む差分を封印 |
| C反映 | apply --operation <same-plan> --apply | 全反映・再検証後のみverified。失敗は停止／lock保持 |
| C確認待ち | publish --operation <verified-plan> --approval <recovery-record> --apply | Localの完成検査後のみverification。実環境では配備確認ゲートも別途必要 |
| D | reopen --operation <same-plan> --approval <separate-HS-reopen-record> --apply | C公表世代／checkpointと別了承を照合してnormal |
| 反映中断 | resume --operation <same-plan> --expected-owner <observed-owner> --worker-stopped --apply | 同じ封印計画／実checkpointを照合して再実行 |
| 閉鎖／封印／公表中断 | recover-operator --operation <same-id> --expected-owner <observed-owner> --worker-stopped --apply | 封印未完成は未反映と前像一致を確認してaborted保全、新IDで再計画。公表完了はmarker/checkpointで照合 |
| control異常 | emergency-close --generation <marker-current> --operation <id> --apply | default markerを閉じる。control復旧をこのコマンドで行うわけではない |
| control回復後 | reconcile-emergency --generation <closed-marker> --operation <id> --worker-stopped --apply | 全writer停止／リース収束を確認後、controlを停止状態へ照合 |

止まっていない旧workerのownerを交換しない。Source／権限／版／世代の変化では停止して調査。前像への差戻しは自動実行せず、private前像から別承認した復旧像を用意して完全同期・再検証する。無条件ロック削除・Auth巻戻し・旧DB削除はしない。[型／予算／未検証](../design/default-database-recovery.md#2026-10-06-固定default方式のlocal実装状況)参照。

## 固定(default) Devの読取事前照合

`node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control <実control> --source <実source> --generation <実世代> --revision <実HEAD> --site <実Hosting site> --dev-inspect`を使う。`status`も同じ明示引数を要する。実HEADとruntimeソースcleanを資格情報取得より先に判定する。未コミットruntime差分がある場合はクラウドへ接続せずblockedを返す。Devの更新コマンドを`--dev-inspect`で有効化しない。CLIの実認証だけを用い、ADCやemulatorへfallbackしない。

各検査のpass／blockedを個別に報告する。Rules/indexだけが合っても配備成功にしない。実Functions source保存世代・Cloud Run revision/trafficとHosting live release／構成／全ファイルを照合し、欠けた証拠や部分配備では確認待ちを開かない。今回の読取はDev停止・配備・コピーの承認ではない。具体的な切り戻し対象・停止／失敗時の手順と、後続の[HS確認手順](../design/default-database-recovery.md#次のdev実行範囲と利用者確認)を提示して承認を得る。

Hosting照合は当該processで信頼するNuxtビルドを実行する。現在HEAD／runtime clean／入力と無視対象env／公開成果物のhashをビルド前後・利用前後で照合し、process内の証拠だけを受理する。読取コマンドでもLocalの`.output`は再生成するが、cloudWritesはfalse。ビルド失敗・古い成果物・入力や公開成果物の差替えでは配備検証を成功にしない。秘密の値やhashを保存・出力しない。

復旧時のHosting配備成果物は、clean HEADで`npm run build:recovery-release -- --revision <実HEAD>`を実行して準備する。このコマンドはLocal生成だけで、認証・配備は行わない。復旧照合専用profileでNuxt buildIdを実HEADに固定し、既知manifestのtimestampを0へ正規化する。timestampは実生成日時の証拠にしない。通常buildの既定動作は維持する。同じrevisionでも環境・依存関係・公開データが違う成果物は全ファイル照合で拒否し、異なる成果物を一致として扱わない。

SPA HTML内の既知Nuxt payloadだけは`prerenderedAt`を1へ正規化し、値の有無によるキャッシュ判定を維持する。未知のpayload形式は拒否する。生成時刻の差を理由に公開ファイルを照合対象から外さない。

今回のC/D用配備は、同じLocal環境・専用profileで生成／照合した成果物に限定する。既存CIは通常buildなので、そのartifactを復旧照合済みと扱わない。C/Dの排他的な配備区間ではworkflow_dispatchによる配備を含む他の配備を止める。通常CI配備後に復旧する場合も専用profileへ再配備して照合する。Local/CI間、別OS／Node patch／zlib／環境のbyte再現性は未検証で、完全一致しなければ停止を維持する。

実行計画・baseline・公表は同じ実HEADに束縛する。AからDの運用区間でGitの版を変更しない。運用記録の更新だけでもコミットするとHEADが変わるので、再開まで記録のコミットを待つ。修正配備でrevisionが変わる場合は旧計画や旧検証を流用せず、停止状態と前像を保持したまま新しい計画・配備・完成検証を用意する。

## 固定(default) Devの明示実行ガード（実行承認待ち）

`enter`、`plan`、`apply`、`resume`、`publish`、`reopen`、`recover-operator`のみ対応。上記project/control/source/generation/revision/siteに、`--operation <照合ID> --approval <該当する非公開了承記録> --dev-execute --apply --confirm fixed-recovery`を追加する。flagsは安全装置であって、人の個別実行承認の代わりではない。初期化／緊急制御のDev経路・Prodは有効化しない。

sourceは、`enter`では(default)、`plan`ではコピー元一時DB、後続では封印したplan.sourceを指定する。`plan`は`--baseline <id>`と、通常復旧なら`--verification <id>`、旧named DBからの最新像移行なら`--migration`を追加。旧方式の停止開始／baselineだけは既存`recovery.mjs`を使い、旧cutover/reopenは使わない。`resume`／`recover-operator`は`--worker-stopped --expected-owner <statusで確認したowner>`を要する。revision・source・approvalを別のplanから流用しない。

停止開始／閉鎖中断回復は、現行DB／世代／intentを束縛して先に閉じ、その後に残る更新リース・Auth退避の収束を待つ。先にリース0を要求して停止開始を拒否しない。plan/apply/resumeは閉鎖とRules本文を照合し、収束必須。Functions/Hostingが一部未配備でも、純粋な閉鎖・封印中断の整理・既公表receiptの後処理は可能。未公表のC/Dだけはfresh build／全配備照合を直前に要求する。公表済みnormalの後処理では正当な新更新を巻き戻さない。

`status`はprivate Admin CLI内で最小runtime／default marker／中断ID・owner・種別・failedを表示する。未収束、未知の状態、版／世代／owner／source／了承参照の不一致では中止。markerの公表前後・中断intentとcompletion receiptを読取確認するまで同じ処理を無条件再送しない。実配備／Dev受入の未完了項目は[記録](../design/evidence/recovery-implementation-2026-10-06.md)を参照。


## 2026-10-06 Dev最新実施状態（通常再開済み）

具体的な対象・手順の提示後、オーナーの続行指示でDev停止・最新像保全・既存18 Functions／Hosting／default Rules／indexesの再配備・停止後0差分の場合のdefault移行・開発側検証・HS確認待ちまで承認された。通常再開、差分がある場合の業務上書き／削除、Auth／IAM変更、旧DB削除は対象外。以前の未承認／未実施の記述は準備時点の履歴であり、この最新状態を優先する。

実HEAD `02bf34fa5bdb2112c58642f5c88a24b5b7031ccf`をA〜Dで固定。C公表前はDev停止中、control/defaultはprotocol 2 recovering generation 5だった。停止後のsource/default各54文書・型付きhash一致、業務set/delete 0、現在権限一致・採番上限16を確認。baseline／全前像と計画をprivate保全し、計画 `default-return-20261006-plan1` はapply後verified。既存18 FunctionsとHosting/default Rules/indexesの配備完了。C公表はverification generation 6で成功。HS確認OKと別再開了承後にD公表も成功し、現在default/controlはnormal generation 7、旧sourceは当時retired generation 7として保全し、その後の別cleanup承認により削除済み（下記最新記録参照）。2026-10-06、提示したHS確認手順に対するオーナーの「OKだ」を利用者確認OKとして受領。Dの通常再開は別質問への「YES」了承後に実施し、実runtime/default/control正常とデータ保全を照合済み。配備の公開呼出IAM digestは前後一致。失敗時は停止を維持し、完成checkpointを確認して再実行する。

Hostingのアプリ991ファイルは全一致。Firebase管理の `/__/firebase/init.js` と `/__/firebase/init.json` はビルドに含まれないため、今回だけ旧確定同site版から2hashを取得し、認証済みproject/app設定と公開設定の一致も要求する限定operatorで補足照合する。全993 path/hash/config/live再照合は既存verifierを維持し、除外はしない。公開databaseURLは空文字で、他プロジェクトのURLは拒否。operator追加fixture4件は成功exit 0、実照合は全5項目成功exit 0、独立delta reviewにP1/P2残件なし。canonical CLI単独での管理2ファイル対応は残件。最新結果・SHA・未検証範囲は実測記録へ記載する。


## 2026-10-06 旧復元DBのcleanup完了

オーナーの「不要DBが削除可能なら削除」の独立指示に基づき、Devの `recovery-drill-20261006`（UID固定）だけを削除。全54業務文書がdefaultとprivate plan前像54件に完全一致、孤立/未知metadata/旧DB参照/Functions/Eventarc依存なし、C/D完了/HS確認/保護設定を検証。旧2metadata・DBmetadata/設定/予定・了承・operation・完了記録はprivate control `recoveryRetirements/retire-dev-drill-20261006` に保全し、別cleanup了承まで自動削除しない。旧DB固有PITR履歴と旧日次予定は削除で失われる。全履歴時点を退避したとは扱わない。

実DB一覧は `(default)` と `recovery-control` の2件のみ。defaultは現在の業務用、controlは更新リース・復旧計画/全前像・Auth/backup監視/運用記録用であり削除対象外。旧DB復帰を必要とする場合は保全前像等から新たな一時DB/計画を用意し、既完了のsource DBを要求する旧コマンドを再実行しない。今回のcopy/cleanupの実行wrapperはignored tmpの限定operator、汎用DB削除機能を実装したとは扱わない。

削除要求のLRO完了・source GET404・一覧不在・default/control normal7・journal deleted/lock解放を確認。16:38:28 JSTの最終読取でも業務54文書hash不変、private前像54/metadata2、リース0/lockなし。Auth/IAM/業務像変更なし。helper9試験/構文/独立レビュー/実確認の結果と途中停止/非同期完了は実測記録に記載。managedbackup初回/実復元などの既存未検証は変更しない。
