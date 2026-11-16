# Dev／Prod 通常アプリの配備手順

[ADR0053](../decisions/0053-direct-application-deployment.md)の採用済み方針。通常配備を手元から実行し、PRやGitHub Actionsを配備条件にしない。PRなしのdev/main統合・Dev／Prod実証を完了。[工程と実績](../roadmaps/technical-remediation.md#2026-11-16-firebase更新のprod反映と保守手順の簡素化)を確認する。旧手順・当時の配備はGitと[operations](../operations.md)に残す。

## 1. 対象と承認境界

Devは termite-warranty-dev（1039792105037）、Hostingは https://termite-warranty-dev.web.app。Prodは termite-warranty-prod（988295873733）、https://termite-warranty-prod.web.app。いずれも業務DBは(default)、制御DBはrecovery-control。対象は実装内の固定値と承認済みtarget資料から選び、任意projectを入力して使い回さない。

通常配備はコード・Rules・索引・Functions・Hostingを更新する操作である。業務データの登録／削除・seed・Authユーザー操作・保護設定の変更・復旧モード移行・IAM変更を含めない。Devの保護保留とProdの既存保護を保持する。実装・検証承認と実配備承認を区別し、当該作業で明示された環境だけに実行する。

コード統合にもPRを一切使わない。必要なLocal検証後にdev/mainへ通常pushする。PR必須・PR専用必須checkを解除し、強制push・branch削除は禁止する。復旧専用・保守基準版用Actionsは別手順のままで、通常アプリ配備には使用しない。

## 2. 手元からの配備

前提は、主checkoutで必要検証を満たしたcleanなcommit、lockどおりに導入済みのroot依存、対象を操作できるログイン済みFirebase CLIアカウント。配備のたびにroot npm ciを繰り返さない。依存を更新した場合は通常の依存導入・検証を先に行う。パスワード・token・長期鍵をコマンドや文書へ貼り付けない。

~~~powershell
npm run deploy -- dev --account <ログイン済みメールアドレス>
npm run deploy -- prod --account <ログイン済みメールアドレス>
~~~

上記は代替の2コマンドで、両方を無条件に実行する手順ではない。対象環境を一つ選ぶ。既定アカウントへの自動fallbackはなく、確認した操作者で読取りと配備を行う。未commitのアプリ変更を混ぜない。branch名やmainへの所属はコマンドの実行条件にしないが、実配備するcommitと承認範囲を作業記録で対応させる。

### 変更対象だけ配備する（S3Local検証済み）

2026-11-17、Dev／ProdのHosting単独配備も実証済み。[実測と確認範囲](../operations.md#2026-11-17-s3のhosting部分配備実証)。

通常のコマンドに `--only` を付けて対象を手動で選ぶ。省略時は従来どおり全体配備する。Git差分による自動判定や配備履歴台帳は使わない。

~~~powershell
npm run deploy -- dev --account <ログイン済みメールアドレス> --only hosting
npm run deploy -- prod --account <ログイン済みメールアドレス> --only "functions,firestore"
~~~

| 変更・選択 | 配備対象 | Prodの公開後照合 |
| --- | --- | --- |
| `hosting` | 画面・公開ファイル・Hosting設定 | Hostingの公開内容 |
| `functions` | Functions一式 | Functionsの配備ソース・実行設定 |
| `firestore` | 2DBのRulesと業務DBの索引 | default Rules・control Rules・索引READY |
| カンマ区切り | 選んだ対象の組合せ | 選んだ対象の照合の和集合 |
| 省略 | 全体 | 従来の全5項目 |

画面だけの変更ならhostingを選ぶ。共有処理・依存・APIの変更は影響する対象を合わせて選び、影響や互換性が不明なら省略して全体配備する。個別関数名やRules／索引の細分化は扱わない。選択した理由は通常の作業記録に短く残す。

成果物のbuild・固定は既存の共通処理をそのまま使うため、部分配備でも全体buildの時間は残る。Functionsを選ばなければ配備用Functionsの依存導入を省く。CLIの配備とProd公開後照合は選択対象だけ実行し、配備していない対象と最新ローカル版の一致は求めない。Devの限定照合、両環境の本人／対象確認・既存保護・通常稼働・固定成果物・lockは維持する。

部分配備の切戻しも既知の良好なコードから同じ対象を明示する。複数対象にまたがる互換性変更なら関連対象を一緒に戻し、判断できなければ全体を戻す。実配備は対象環境の承認範囲で実行する。

コマンドが行う処理：

1. 対象・アカウント・commit・同一端末の環境別lockを確認する。
2. 既存Functionsの保護パラメータ、DBのPITR／予定／削除保護、normalと制御情報、公開版を読む。保護値を既定値で上書きしない。
3. 認証情報を渡さない子プロセスで環境別buildを行い、配備用コピーへ固定する。Prodは既存bundleを検査し、Devも既存の対象制約を維持する。
4. Functionsを配備する場合だけ、配備用Functionsへ独立lockで依存を導入し、配備対象ソースと設定・版・実環境の前提が変わっていないことを確認する。配備時の再buildは行わない。
5. 固定したCLI・project・config・アカウントで、選択対象を一度配備する。
6. Prodは選択対象の既存照合（全体配備なら2DB Rules・索引READY・Functions／Hostingの全5項目）、Devは公開入口・接続先・Functions ACTIVEと保護保留を確認する。両方ともruntimeと保護値の維持を確認する。

ローカルlockは別PC・Cloud Console操作まで排他しない。同じ環境へ複数の担当者が同時配備しないよう調整する。所有不明のlockや他プロセスを自動削除・停止して通さない。生成物はGit外tmp領域へ置き、ユーザーデータや既存バックアップを作業用に流用しない。

## 3. 変更分類と統合前の検証

[verification-policy.json](../../governance/verification-policy.json)で変更クラスの和集合から必要gateを選ぶ。変更途中は対象試験、影響回帰、最後に選定した完了gateを満たす。既存成功が失効していないgateは再実行しない。配備自身に必要な包括gate選定は維持するが、配備コマンドへ固定全試験wrapperや専用の証拠入力を追加しない。

検証したcommit／差分、コマンド・結果・exit、再利用元と理由、実画面で確認した範囲をoperationsまたは通常の作業報告へ残す。UI・業務変更なら影響範囲の受入れを行う。製品不変の配備準備変更だけで既存の本人受入れを失効させず、新たな画面確認をしたと偽らない。Git pushの成功は必要なLocal検証の代用ではない。

文書・試験・CIだけの統合は公開版を自動更新しない。配備するかは作業目的と本人の承認に従い、人が明示して決める。索引追加時はCLI成功だけで検索可能とせず、READYと影響する検索を確認する。

## 4. 失敗・切戻し・記録

失敗や結果不明では自動再配備しない。CLIのどの段階まで完了したかと現在の公開版・Functions・保護状態を読取り、部分反映を確認してから次の操作を判断する。認証・対象・lockの拒否を回避するためにガードを外さない。

切戻しは既知の良好なコード・lockへ修正commitを通常pushして戻し、必要な検証後に直接配備する。データ復元や旧Actions自動配備の復活を同時に行わない。既存の公開版・検証証拠・データは保持する。

完了記録には対象環境・commit、build／導入／配備／照合の時間、各結果とexit、既存保護の比較、画面確認範囲、未確認事項を記す。異なるPC／cache／Functions更新量の時間差を改善効果だけと断定しない。ロードマップには到達点と主な証拠へのリンクを残す。
