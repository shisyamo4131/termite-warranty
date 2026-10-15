# Dev／Prod 通常アプリの配備手順

2026-10-15の[ADR0047](../decisions/0047-single-verification-and-nonproduct-pr.md)に従う手順。PR35でmain統合済み、dev未同期・実配備未実証。既存の配備・本人受入れの実績は[運用記録](../operations.md)、旧方式の経緯は[ADR0046](../decisions/0046-verification-reuse-and-dev-acceptance.md)を参照。main統合と非配備測定まで承認済み。Dev/Prod配備・権限/設定/データ変更は別承認。

## 1. 対象と保留

| 項目 | Dev | Prod |
| --- | --- | --- |
| Firebase project / number | termite-warranty-dev / 1039792105037 | termite-warranty-prod / 988295873733 |
| 公開先 | https://termite-warranty-dev.web.app | https://termite-warranty-prod.web.app |
| 業務／制御DB | (default) / recovery-control | (default) / recovery-control |
| 配備起動 | devへのPR mergeで生じるpush | mainへのPR mergeで生じるpush |
| 認証 | development環境、既存Dev専用secret | production環境、main限定WIF／prod-deployer |
| 許可branch | devのみ | mainのみ |

バックアップ・PITR・Auth退避等の設定／有効化はリリース直前まで保留。Dev／Prodともautomation=false、日次予定0、PITR無効を維持する。Prodの他3保護入力は空。Devに残る退避先／旧検証情報は現在の一貫した値を保持するが、新しい取得・復元成功の証拠としない。既存退避物の削除は通常配備に含まない。

## 2. 実行前確認

主checkoutで作業し、originが `https://github.com/shisyamo4131/termite-warranty.git` であること、今回以外の差分を含めていないことを確認する。remote main/devと進行中Actionsを読取り、古い文書のSHAを配備対象に流用しない。実行中配備を新規push／再実行で重ねたり不用意に取消したりしない。

両branchはPR必須・`Verify development deployment` 成功必須・最新base同期・管理者適用・force push／削除禁止。他者の必須承認は0人。適用済みかは実branch保護を読み直す。変更前の作業branchには必要な最新main/devを取り込み、競合解消を含む最終内容を、製品は改修→dev PR、非製品は改修→main PRで検証する。

Devの既存配備SA `github-actions-firebase-deploy@termite-warranty-dev.iam.gserviceaccount.com` は、既存配備権限に加え、project内のScheduler get/update（`developmentSchedulerDeployment`）と、実Functionsソースbucket `gcf-v2-sources-1039792105037-asia-northeast1` のstorage.objects.getだけ（`developmentReleaseSourceReader`）を持つ。初回配備前にこれらも読戻す。SchedulerはPAUSEDを維持し、create/delete/run/pause/resumeは追加しない。ソースの保管bucketが変わった場合は権限を広げず、実対象と必要範囲を再確認する。[導入時の停止・修正](../operations.md)を参照。

保護停止の照合には `developmentProtectionStateReader` の `datastore.backupSchedules.list` も必要。付与は `resource.name == 'projects/termite-warranty-dev/databases/(default)'` 条件に限定する。配備権限だけでなく、Functions一覧・Cloud Run実revision・実ソースのmetadata／内容・Rules／索引・Hosting・DB metadata・backupSchedulesの読取り経路も初回切替前にまとめて確認する。一般的なEditor追加で代用しない。

| GitHub変数 | 期待値・確認事項 |
| --- | --- |
| DEVELOPMENT_BRANCH_DEPLOY_ENABLED | 実切替完了後true。実施中は運用記録で確認 |
| PRODUCTION_APP_DEPLOY_ENABLED | true |
| PRODUCTION_BOOTSTRAP_ENABLED | false |
| PRODUCTION_TARGET_JSON | [tracked target](../../deliverables/production-bootstrap-2026-10-13/target.json)の9項目一致 |
| PRODUCTION_PROVIDER_VERSION | sites/termite-warranty-prod/versions/a377bd20176a2ac5。保守基準版を最新公開版に置換しない |
| PRODUCTION_RECOVERY_PARAMETERS_JSON | automation=false、他3値空 |


## 3. 変更分類と統合前の検証

| 変更 | PR | 必要な確認 | 配備 |
| --- | --- | --- | --- |
| 製品 | 改修→dev、受入れ後dev→main | Dev前の候補検証・環境成果物・Dev本人受入れ。昇格PRは確認済み候補の照合のみ | 環境ごと |
| 試験だけ | 改修→mainの1本 | 全体の技術検証。Localの同等結果を再利用可 | なし |
| CI/検証方針だけ | 改修→mainの1本 | 包括7gate＋focused回帰、認証/配備分岐の拒否系 | 導入自体ではなし |
| 文書/PDFだけ | 改修→mainの1本 | governance・差分、PDF作成時の全ページ/生成元確認 | なし |

分類は `scripts/lib/change-scope.mjs`。通常文書の追加/削除も扱う。未知差分、特殊mode、比較不能、異なるrepository、仮統合の親不一致は停止する。Functions配下の試験やbuild/配備helperを非製品と誤認しない。混在は最も広い影響を選ぶ。mainに入った非製品変更は必要時にmain→dev同期PRで取り込み、その仮統合結果を確認する。同期前devとの製品digest不変を必須とし、製品が変わる同期は拒否する。試験・CI差分の同期は技術確認、文書差分だけなら文書確認とし、同期pushで配備や新たな業務受入れを行わない。

Localを再利用しない場合、上流の改修・試験・CI変更PRで包括7gateとfocused回帰を実施する。dev→main昇格PRにはこの機能試験工程を置かない。アプリ側とRules3群は並行実行。必須checkは全producer成功/意図したskipを集約し、Rules全件・同run/attempt・終了を確認する。試験だけの変更も初期実装では保守的に包括検証を選ぶ。baseline対shardの性能比較workflowは自動PR起動から手動へ移す。runner方式を変える際に必要な比較として実行し、通常の製品・試験・CI改修へ重複実行を加えない。

Local再利用は、cleanなcommit済み候補で `node scripts/local-verification.mjs` を一度実行する。固定commandを順に実行し各exitを保持、最初の失敗で停止する。結果はignored `tmp/local-verification/`。成功時の `owner-comment.txt` をowner本人がPRコメントへそのまま投稿し、PR検証を再実行する。CIがcomment作者と仮統合後の入力digestを確認する。PR作者・run actorだけで承認しない。Windows/PowerShell7/Node22/npm11.19.1/Java21、固定lock、全件成功・skip/cancelなしが必要。既知のWindows symlink2skipも同等成功にしない。

固定npmによる `ci` 成功後に試験し、lockfileと異なる旧node_modulesの結果を再利用しない。Rulesはworker・ファイル別の件数と失敗/skipなし、重複のないtest identityを照合する。

governance確認はPRの集約jobへ一本化し、Local／Dev結果の再利用時も最新文書に対して一度実行する。文書を検証入力digestから除外するため、この軽い整合確認は省略しない。統合後pushでは元PRの結果を使い、同じ確認を繰り返さない。

不完全・古い入力のLocal commentは無視して成功扱いせず停止する。修正済みの結果を新しいowner commentで明示する。comment未投稿ならCIで実行する。再利用元artifactは本人commentのIDと内容digestを保持し、後続で編集・削除・新しい撤回があれば元PRの再確認へ停止する。JSONをshell展開せず、結果指定の任意commandを実行しない。製品PRではLocal結果を使っても環境用Hostingの生成・保存はCIで行う。

## 4. Dev配備と業務受入れ

devへの製品mergeでは、一意な統合PR、最新run/attempt成功、検証入力と製品入力、期限内artifact ID/metadataを確認する。元PRのHostingを固定ID/runで取得しdigest不一致を拒否する。証拠欠落時にdevで包括試験を自動再実行せず、元候補の検証を修復する。配備直列枠へ入った後、認証前に現在のdev先頭と一致することを確認する。実行中配備は取消さない。

既存の資格情報所属・明示2DB/Functions/Hosting、保護保留、配備後5照合を維持する。全照合後だけdeployment markerを保存し、workflow全体successを待つ。検証用の業務データ/Auth/採番を書き換えない。

本人が実Dev版を業務受入れしたら、dev→main PRにowner本人が次の形式でコメントする。値はその回のrun/digestと機密を含まない受入れ参照へ置き換える。digestはDevのpipeline出力を確認する。

```text
TERMITE dev-acceptance
{"schema":1,"accepted":true,"deploymentRunId":123,"product":"実Devの64文字product digest","reference":"本人が確認した業務と記録参照"}
```

架空の例を実入力に使わない。最新のowner記録が優先され、accepted=falseや不正形式は停止する。配備runの成功、全照合後marker、元PR成功、実製品入力を確認する。技術試験成功を本人の受入れに代用しない。専用の手動受入れworkflowは不要。既存run38675079811は当時の承認producerを確認する限定互換経路で読み、旧受入れ版と修正版の技術検証を分離して保持する。

## 5. Prod配備

昇格PRには機能試験工程を置かず、同じ製品の本人受入れと上流で完了した技術確認を照合する。検証入力もDev受入れ時の証拠と同じなら、その確認を使う。CI/試験入力が変わった場合は、昇格PRのdev headの実treeが仮統合候補と製品・検証入力とも一致し、上流の一意なdev統合PRの最新run/attemptが同じ入力で成功していることを要求する。後続が文書だけならfirst-parent上の両digest不変を確認して越え、入力が最後に変わった統合revisionの証拠を使う。入力変更地点やその元PRの最新失敗を越えて古い成功を探さない。履歴不完全・64commit以内に境界を特定できない場合は、昇格を停止して履歴・取得範囲を確認する。異なるmain側入力が残るならmain→dev同期PRで先に確認する。証拠不足・失敗・Local承認撤回では停止し、昇格PR内のLocal記録や実試験で補完しない。

通常文書追記だけで受入れや技術確認を無効化しない。製品不変の試験/CI変更では技術確認のみを更新する。製品・動作依存・設定や競合解消が製品を変える場合はDev検証と必要な業務受入れへ戻す。次のDev作業の進行だけで、固定headで確認した昇格候補を無効化しない。main merge後は最新成功した昇格PR、同じ上流証拠とowner記録を再確認し、機能試験は実行しない。

Prod固有build、成功buildから渡すbundle digest、対象/資格情報guard、直列枠内の最新main候補確認、WIF、predeploy、固定bundle配備、再認証、公開後5照合と後処理を維持する。配備jobで再buildしない。非製品main pushは分類だけで終了し、文書試験・Cloud認証・配備を起動しない。

Prod受入れでは実公開先へのログイン、代表的な読取り、権限と接続先を最小限確認し、公開後の自動照合結果を参照する。全業務シナリオや済んだ自動照合をもう一度実施する工程にはしない。実業務データ・採番の更新を確認目的で増やさない。不一致・失敗時は公開後の停止/復旧手順へ戻り、機能変更が必要ならDev側で修正・確認する。通常文書だけの変更では配備もProd受入れも不要。

## 6. 証拠の有効性・記録・失敗

関連ソース・試験・lock・runtime・fixture・設定・競合解消で入力が変わったとき、または失敗/未完了/不足があるときに、影響する検証を実行する。24時間/30日の経過だけで過去の成功を取り消さない。artifactの消失・実際の保存期限切れ・digest不一致は配備に利用不可。最新失敗を隠して古い成功runへ戻らない。

PR/Actionsを実行証拠とし、運用記録には対象版、再利用元、実配備結果、所要時間と残件を一度記録する。索引へ履歴や件数を重複転記しない。記録commitを「実配備済みSHA」に置き換えない。

失敗・結果不明時は再配備せず部分反映を読取り、既存運用手順の停止/復旧と必要承認へ戻る。この候補の切戻しは通常PRで一式revertし、既存公開版・本人記録・artifact・データを保存する。新形式を旧形式の成功証拠へ偽装しない。

HS試行10/16・19、保護のリリース直前までの保留は不変。リリース前のバックアップ/PITR/Auth退避・復元実証・正式投入・HS最終了承は別の納品条件であり、今回のCI成功では完了しない。
