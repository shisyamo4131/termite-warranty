# バックアップ・全体復旧の操作手順

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
