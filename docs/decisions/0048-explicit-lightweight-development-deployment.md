# 0048 明示起動の軽量Dev配備と受入れ後のPR統合

- Status: Accepted; main/dev cutover and explicit Dev deployment verified; screen acceptance pending
- Date: 2026-10-16
- Approval: 親タスク01a1186d-ebfa-70e3-9fa5-67accdb2202eから伝達された本人「①は推奨案を採用する。作業開始。なお、HS側のDev受入れ検証期間中だが、そこは気にしなくてよい。」。dev統合PR維持、dev固定controllerから未統合候補への明示配備、Prod保護維持を採用。実装・必要検証まで実行し、main統合/実配備前に報告する。
- Supersedes: [0047](0047-single-verification-and-nonproduct-pr.md)の日常Dev/証拠取り込み経路。過去の実績は取り消さない。

## 判断と理由

改修→必要Local試験/画面受入れ→commit/push→手動Dev build/配備→本人Dev受入れ→軽いPRでdev統合→簡潔な記録を繰り返す。文書だけで配備を起動しない。dev push配備を廃止し、同じ候補を二重配備しない。最後にdev→main PRでProdへ昇格する。

dev上のworkflowをcontrollerとして同一repositoryのbranchと40桁commitを固定する。development環境のdev限定と既存secretを維持する。未統合コードを配備する実効範囲の拡張は承認済みであり、checkout先の変更を使った無断の環境制限迂回ではない。候補build/依存導入はCloud認証前、配備時のコード探索は信頼済み候補のみ。資格情報・IAM・branch protection変更は行わない。

必要gateの選定と有効証拠再利用を維持する。Local結果を認めさせるためだけの固定全試験wrapper、専用JSONコメント、CI再実行を廃止する。PR本文の通常チェック欄と記録参照を使う。これは人による確認を前提とし、遠隔署名や実行証明ではない。CIは必要試験の実施そのものを保証しない。

Devは全Functions ZIP/Hosting全ファイルhash照合を外し、対象・保護保留・Functions ACTIVE・公開入口/接続先を確認する。独立した全byte一致保証を失うことを受容する。Rules/索引はCLI成功と変更別受入れで扱う。GitHubのnative runと実deploy job成功を用い、独自marker、証拠artifact連鎖、期限判定、履歴探索を作り直さない。

既存の変更分類は軽いPR/Prod routingに限って利用し、新しい文書自動分類を増やさない。製品同一性はGit差分で確認し、記録だけでは受入れを失効させない。技術変更の必要試験はLocalで更新する。ProdのWIF・固定対象・build bundle・公開後全5照合は維持する。復旧の厳密照合は変更しない。

## 移行・検証・切戻し

[配備手順](../runbooks/application-deployment.md)を正本とする。導入自体は包括7gate＋focused回帰＋独立review。default main登録後、製品不変のmain→dev同期を行う。旧自動配備を復活させる切戻しには外部効果の承認が必要。2026-10-16の追加承認でmain/dev切替とDev実証を完了した。[結果・計測](../operations.md#2026-10-16-軽量dev配備の切替実証)。画面受入れは未実施。

HS試行データを保持し、試行期間を待機理由にしない。バックアップ/PITR/Auth退避の保留、Prod実配備/業務機能/データ変更の対象外を維持する。

## 効果の限界

PR38実測はCI6分45秒、Dev workflow5分15秒（CLI2分01秒、照合1分17秒）、記録3分37秒、全体20分52秒。build・依存導入・配備・人の受入れは残る。buildはPRから手動Devへ移動する。照合時間の全部が消えるわけではない。旧実測にはキュー/配備範囲差があり改善因果を証明しない。新経路の初回実測は[運用記録](../operations.md#2026-10-16-軽量dev配備の切替実証)に記載。同条件の削減率や将来所要時間は未検証。
