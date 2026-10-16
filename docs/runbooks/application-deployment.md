# Dev／Prod 通常アプリの配備手順

[ADR0048](../decisions/0048-explicit-lightweight-development-deployment.md)の承認済みLocal改修。リモート切替・新経路の実配備は未実証。旧経路の実績とPR38本人確認は[operations](../operations.md)を参照する。

## 1. 対象と承認境界

Devは termite-warranty-dev（1039792105037）、Hostingは https://termite-warranty-dev.web.app、業務DBは(default)、制御DBはrecovery-control。Prodは termite-warranty-prod（988295873733）、https://termite-warranty-prod.web.app。同じ2DB名。主checkoutを使い、origin、現在branch、差分、最新remote、進行中Actionsを確認する。

dev/mainのPR必須・最新base・必須check Verify development deployment・管理者適用・force push/削除禁止を維持する。development環境はdev、productionはmain限定。新しいsecret、IAM変更、環境許可branchの拡張は不要な設計。未統合の同一repository候補をDevへ配備する実効範囲の変更は今回承認された。配備自体、main統合、追加の権限設定は実行前の別境界。

HS試行中という理由だけで改修を延期しないが、既存Devデータ・Auth・採番を保持する。seed、初期化、再投入、補正、削除は通常配備に含めない。バックアップ/PITR/Auth退避はリリース直前まで保留。automation=false、日次予定0、PITR無効、既存Dev退避先情報を維持する。保留確認は保護成功の証拠ではない。

## 2. 日常のLocal確認と記録

1. 最新devから改修branchを作り、変更クラスと必要gateをverification-policy.jsonで選ぶ。
2. 対象試験・影響回帰・Local画面受入れを行う。有効な既存証拠はoperationsの失効基準で再利用する。配備時の包括gate選定は維持し、選定と再実行を区別する。必須結果が不足ならLocalで補う。
3. 対象差分またはcommit、コマンド・結果・独立exit、再利用元と失効しない理由、画面確認範囲を既存記録へ保存する。試験のためだけの固定全試験wrapper、専用JSONコメント、CI再実行は不要。
4. 最終候補をcommit/pushし、対象branchと40桁commitを確定する。baseを取り込んだり競合解消したら、影響する試験と画面確認を先に更新する。

自動試験は専用demo-termite-warranty-testと隔離ポートを使い、常用Localを停止・初期化しない。試験がなかったことをチェック欄で成功へ変えない。失敗・skip・未実施はそのまま記録し、必要gateが未充足なら配備へ進まない。

## 3. 明示起動のDev配備

通常文書だけなら起動しない。自動分類を増やして手動起動を置き換えない。

Actionsの Deploy selected development candidate を **dev branch上で** 起動する。inputsはsource_branch（改修branch）、source_sha（確認済み40桁SHA）、local_verified=true、verification_reference（秘密を含まないLocal記録参照）。親から実配備承認を得た後の操作例：

~~~powershell
gh workflow run deploy-development-manual.yml --ref dev -f source_branch=<改修branch> -f source_sha=<40桁SHA> -f local_verified=true -f verification_reference=<Local記録参照>
~~~

例のplaceholderを実値と誤認しない。workflowはdefault branch mainにも登録済みでなければ起動できない。

dev上のcontrollerが同一repository・実branch先頭・現在devを含む候補を確認する。候補のnpm ci、build、Functions domain準備はCloud認証なしのjob。生成物は同run/attemptのGitHub artifactで配備jobへ渡す。配備jobは同じ候補SHAをcheckoutし、そのlockの依存導入を認証前に行う。controller依存導入も残る。buildは再実行しない。

既存development secretで認証する前に候補とcontrollerが動いていないことを再確認する。既存対象/資格情報・2DB・Hosting・保護保留guardの後、固定project/configのFirebase CLIを一度実行する。Functions ACTIVE・保護保留・公開入口/接続先を読取り確認する。全FunctionsソースZIPと全Hostingファイルhash比較は行わない。Rules/索引の公開はCLI成功で確認するため、従来の独立した全5照合と同じ保証ではない。Functions/Rules/索引の変更に必要なDev固有確認は受入れ範囲に含める。

配備はdevelopment-deploymentで非取消・直列化。資格情報付きFunctions discoveryは指定候補コードを扱うため、信頼できるreview済みrepository候補だけを指定する。任意forkや未確認コードへの実行権限は与えない。

## 4. Dev受入れ後の軽いPR

配備run全体成功を確認して、実Devで本人が必要な画面を受け入れる。PR本文に次を記載する。通常の記録参照・チェック欄であり、実行証明JSONではない。

~~~text
- [x] Local verification reviewed
Local verification: 対象版・必要コマンド/exit・再利用理由を記録した参照
- [x] Dev acceptance reviewed
Dev acceptance: 本人が確認した範囲と結果の参照
Dev run: https://github.com/shisyamo4131/termite-warranty/actions/runs/実run番号
~~~

ownerのPRを前提とし、代理作成時も本人確認を捏造しない。本文変更はeditedイベントで軽いcheckを更新する。文書だけはLocal/Dev欄を要求しない。試験/CI変更はLocal欄、製品変更は両欄を必要とする。未確認・撤回時はチェックを外す。

必須checkはgovernance、差分、Local記録参照、製品変更時の成功Dev run/実deploy job、受入れ版と仮統合の製品差分を確認する。Local試験、build、配備は繰り返さない。通常mergeでdevへ統合し、dev push配備は起動しない。

記録だけの変更ではDev受入れを失効させない。CI/試験変更は技術確認のみ更新する。製品・依存・設定・競合解消で製品が変われば必要なLocal/Dev確認へ戻る。旧dev push配備runも本人受入れと実deploy job成功を明示して参照できる。元PR artifact・独自marker・64commit探索は要求しない。受入れ済みbranch削除後もcommitとrunは参照できる。将来の別Dev版を古い受入れとして扱わない。

## 5. Prodとの接続

最後にdev→main PRを作り、同じLocal記録と受入れrunを本文で参照する。製品の同一性はGit差分で確認し、Prod昇格のための機能試験は追加しない。不足はLocal/Devへ戻す。main pushは一意な統合PRの最新成功checkと現時点の本文を読戻す。

Prod固有build、成功buildの固定bundle/digest受渡し、main限定WIF、production環境、最新main確認、認証前guard、predeploy、固定CLI配備、再認証、公開後全5照合、既存保留を維持する。Dev成果物をProdへ直接流用しない。文書/試験/CIだけのmain pushはCloud認証・配備をしない。Prodの実受入れはログイン・代表読取り・権限/接続先を確認し、HSの正式受入れや保護準備の代替にしない。

## 6. 導入と切戻し

今回の改修自体はgovernance-permissions-agents＋build-release-deploy＋documentation-only。包括7gateと入力該当focused回帰、独立reviewを満たす。コード/設定変更を後から加えたら失効gateを再確認する。

1. ローカル記録d79e0c1/d372311を保持し、owned diffをreviewする。現checkoutはdev製品を含むため、そのままmain向けPRへ流さない。
2. 承認後、配備制御と関連文書/試験だけをmain基点の通常PRとして統合する。旧製品差分を混ぜない。これはCI変更なのでProd公開を起動しない。既存保護checkを迂回しない。
3. main→devの製品不変な同期PRを軽いcheckで統合する。受信側で旧dev自動配備が消えていることを確認する。この同期でDev配備は起きない。
4. default branch登録、dev controller、environment dev限定、enable、進行中runなしを読戻す。新secret/IAM/保護変更が必要なら具体対象を報告し実行前承認を得る。
5. 別途承認された候補を手動Dev配備し、run・実画面・データ保持範囲・実測を記録する。未実証をCI成功で埋めない。

失敗・結果不明は部分反映を読取り、再配備を自動で繰り返さない。切戻しは通常PRで変更一式を戻すが、旧dev push自動配備の復活は外部効果になるため承認なしに戻さない。必要なら旧起動enable停止を先に承認対象にする。公開済み版、旧証拠、Devデータは保存する。Gitの切戻しとデータ復元を混同しない。

記録はロードマップに対象版・run・本人結果・残件の短い要約、詳細コマンド結果は既存operationsまたは作業報告へ一度保存する。新台帳や各索引へのhash/件数の転記を増やさない。
