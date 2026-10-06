# バックアップ・復旧のLocal実装・検証

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
