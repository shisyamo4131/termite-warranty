# Dev／Prod 通常アプリの配備手順

2026-10-14現行。改修→dev／dev→mainの両段階でPRを使う。PRは同一repositoryのbranch間で変更・検証結果を確認する申請であり、別repository／worktreeは不要。GitHub Actions自体はPR必須ではないが、本プロジェクトではbranch保護と検証証拠の確認に利用する。[現行設定・結果](../operations.md)、[環境仕様](../requirements/environment-configuration.md)、[設計判断](../decisions/0046-verification-reuse-and-dev-acceptance.md)。

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

両branchはPR必須・`Verify development deployment` 成功必須・最新base同期・管理者適用・force push／削除禁止。他者の必須承認は0人。適用済みかは実branch保護を読み直す。変更前の作業branchには必要な最新main/devを取り込み、競合解消を含む最終内容を改修→dev PRで検証する。

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

## 3. 改修branch→dev PR

PR23／24の並行化はDev統合・実配備検証済み（Prod未反映）。[実測・検証証拠](../operations.md#2026-10-14-並行化2件のdev配備実測完了)を参照。包括検証ではアプリ側6gateとRules3群を並行実行する。最後の必須check `Verify development deployment` が全producer成功・Rules全件／終了・同SHA/tree/run/attempt・Hosting artifact ID／metadataを照合して包括証跡を発行する。アプリjobやHosting upload単独の成功は統合条件ではない。失敗／取消／一部jobだけの再実行では証跡が揃わないため、原因修正後にworkflow全体を再実行する。Hosting再buildは行わない。文書専用／再利用時は両producerの正常skipを集約checkが確認する。

### 文書だけの変更（2026-10-14採用）

配備成果物・実行設定に影響しないと確認できる文書修正は、両段階のPRで文書検証を通して統合し、Dev／Prod配備を省略する。業務アプリが変わらないため、新しい業務受入れ記録も作らない。PR必須・必須check成功・base同期等の保護は維持する。以下の包括検証・配備・本人受入れの通常手順は混在／非対象／判定不能な変更に適用する。

判定の許可対象は `scripts/documentation-changes.mjs` の8ファイル：CHANGELOG.md、docs/README.md、docs/operations.md、docs/design/tr-003-verification-deploy-gates.md、docs/requirements/environment-configuration.md、docs/roadmaps/production-readiness.md、docs/roadmaps/technical-remediation.md、当手順書。既存の通常ファイルの内容修正だけを許可する。新規・削除・名前変更・symlink・実行属性変更・他ファイルとの混在は通常経路へ戻す。新たな対象を追加する際は成果物／実行入力への影響を確認し、判定実装・試験・当手順を通常PRで更新する。

1. PRでは同一repositoryの実base／headと仮統合commitの両親を照合し、baseから仮統合結果までの全差分を判定する。dev→mainでは累積差分を見て、以前の未投入アプリ変更を文書扱いしない。
2. 文書専用PRでも必須check `Verify development deployment` を実行する。`./scripts/check-governance.ps1` と `node scripts/documentation-changes.mjs verify`（判定の再確認・`git diff --check`）が両方成功してから通常mergeする。CIの包括検証証跡／Hosting成果物を捏造して発行しない。
3. dev／mainへのmerge pushでもbefore→afterの全差分を独立判定する。正常な2親merge・対象branch・完全な履歴が確認できる場合だけ省略する。文書検証を再実行し、ビルド・Cloud認証・配備・配備後照合は実行しない。公開版が更新されていないことは「配備済み」と区別して報告する。
4. 混在・比較不能・未認識ファイル・手動実行は省略せず通常経路へ戻す。判定job自体や文書検証の失敗は統合／配備を停止する。省略経路を導入／変更するPR自身はCI変更を含むため文書専用扱いにしない。

文書の統合後はbranch先頭と最後に配備したSHAが異なることがある。次のアプリ変更は通常経路でDevへ配備し、その実配備版の本人受入れを記録する。未投入のアプリ変更がdevにある場合は文書だけのPRで業務受入れを迂回できない。問題時は同じPR経路で文書専用判定を撤回し、通常検証・配備へ戻す。バックアップ・PITR・Auth退避等の保留を解除しない。

1. Local実装／Local受入れ後、改修branchをpushし、dev宛てPRを作る。
2. CIで以下の7gateを独立stepとして実行する。Rulesは独立VM3群で試験し、全件成功・同一SHA/run/attempt・Emulator終了を集約する。失敗／欠落／skipを合格にしない。
3. 検証対象Git tree（全追跡ファイル）とrun/attemptを証跡artifactへ結び付ける。Hostingも同じtree/attemptのartifactとして保持する。保持30日。試験成功を本人の業務受入れとして扱わない。
4. CIと差分レビュー後、対象headを固定して通常mergeする。直接dev pushでPRを迂回しない。

| gate | command |
| --- | --- |
| governance | ./scripts/check-governance.ps1 |
| domain | npm test |
| typecheck | npm run typecheck |
| build | npm run build |
| Rules／Callable | npm run test:rules |
| Functions syntax | node scripts/check-functions-syntax.mjs |
| seed syntax | node --check scripts/seed-emulator.mjs |

## 4. dev push→Dev配備

統合先dev SHAに対応する一意なPRと最新PR run/attempt、同一repository、全tree一致、7gate／3群成功、24時間以内、期限内の証跡／Hosting artifact metadataを照合する。commit SHAが異なってもtreeが同じなら再利用する。証拠不備なら包括7gateをdevで再実行。統合PR不明は停止する。

再利用時は元PRのHosting artifact ID/runを固定して取得し、digest不一致をエラーにする。検証成功のDev jobが同じファイルを配備jobへ渡す。Hostingを再buildしない。配備jobは同じdev SHAをcheckoutし、既存Dev資格情報の所属、2DB／site、現在のcontrolとautomation=false／保持値の一貫性を確認する。Functions生成物を準備してから、明示した2DB・Functions・Hostingだけを配備する。一般的なforceオプションは使わない。

配備後はRules2件・索引READY・Functionsソースarchive／構成・Hosting全ファイルhash／設定／公開版を照合する。Hostingの集計待機は既存の上限付き再観測を使い、版・hash・設定の不一致をタイムラグ扱いしない。PITR無効・日次予定0・automation=falseも確認する。配備stepだけで完了にせず、job全体と認証後処理まで成功を待つ。業務文書・Auth・採番を検証用に変更しない。

## 5. 本人受入れ→dev→main PR

2026-10-15修正：`accepted_revision` と `deployment_run_id` は本人が受入れた実配備版を指定する。記録workflowは現在のdev上で実行し、後続の差分が許可8文書の修正だけなら全tree・祖先関係・文書push検証を確認して記録する。文書先頭のSHAを受入れた配備SHAへ代入しない。記録後の文書変更もPR／mainで同様に検証する。通常のアプリ・設定変更には新しい実配備と本人受入れが必要。

今回の記録処理修正の導入だけは、[ADR0046の固定版・差分限定](../decisions/0046-verification-reuse-and-dev-acceptance.md)に従い、旧Dev22d5bacの本人受入れを保持し、修正版の包括検証／Dev配備成功runを追加input `candidate_deployment_run_id` に指定できる。一般運用ではこの追加inputは空欄。受入れ版、記録版、技術検証配備版、昇格版を証拠上で区別する。下の旧「完全SHA一致」はこの限定的な継続条件を除く通常経路の説明。

Dev業務受入れ後、ownerがActionsの `Record explicit development acceptance` を **dev** 上で手動実行する。

- deployment_run_id：成功したdev push配備run。
- accepted_revision：受入れたdevの40文字SHA。実行対象dev版とも一致させる。
- acceptance_reference：機密を含めない本人の受入れ記録参照。
- confirm=true：本人が受入れ完了を確認した場合だけ指定する。

記録はDev現head・配備／公開後照合・元の包括試験を検証する。保持／有効30日だが、元試験の期限を記録更新だけで延長できない。実施していない業務受入れを自動作成しない。受入れ処理自体の更新も改修→dev PRで検証してDevへ入れ、その版のDev上で記録する。mainへ先行直送する例外は不要。

2026-10-14の実例：本人の「Dev cbec3c3の業務受入れ完了」を受け、配備run38519554310 attempt4と現devの完全SHA一致を確認。受入れrun38523528230が成功し、同じ版のPR18 run38522081043 attempt2は元PR・Dev配備・本人記録の照合だけで成功した。受入れ記録jobは35秒、PR照合は1分17秒。将来の操作ではこれらのIDをコピーせず、その回の実配備・本人受入れ版を使う。

その後dev→main PRを作成する。PRの必須checkは元PR→Dev配備→本人記録を独立照合し、同一treeなら包括試験を再実行しない。受入れなし・版違い・失効・別actor・producer変更・配備後照合欠落は停止する。改修branch→mainの直接PRは拒否する。受入れ後に変更した場合は新しい版のDev検証／配備／受入れが必要。

受入れ前に差分確認用のdraft PRを用意することはできるが、受入れなしで必須checkが失敗するのは意図した停止である。合格やProd配備完了と扱わない。本人受入れ記録後、同じdev版のPR照合を再実行する。

## 6. main push→Prod配備

dev→main PRを必須check成功後に通常mergeする。このmain pushでProd workflowが起動する。mainは最新の統合PRの照合成功と、元PR／Dev配備／本人受入れを再検証する。PRのCI証拠が不備ならmainの包括7gateへ戻すが、Dev受入れの欠落をそれで補わない。

Prod固有の成果物生成・全体bundleのdigestと対象確認・認証前guard・WIF・predeploy・配備・再認証・公開後5照合・後処理は毎回実行する。Functions生成物は成果物作成自身で準備し、試験pretestに依存しない。全5項目passとready=true、job全体successを確認する。現在の件数を将来の期待値へ固定せず、対象版のbundleと照合する。

実測記録にはPR/run/attempt/SHA/tree、再利用元と各gateの成功根拠、成果物、Dev／Prodの公開後照合、保護状態、所要時間と残件を残す。再利用を新規試験実行と記載しない。実証途中／本人受入れ待ちを完了としない。

## 7. 失敗・復旧・リリース前

2026-10-14 PR23でDevへ統合・配備・実測済み（Prod未反映）：共通のFunctions配備照合は関数単位で最大4件ずつ読取り、source／service／revisionの全検査と終端の一覧再照合を維持する。同一archiveは進行中の検査も共有する。失敗時は開始済みbatchを終えて停止し、後続batchを開始しない。Hostingの待機上限や全5照合の成功条件は変更しない。[Dev実測・承認境界](../operations.md#2026-10-14-並行化2件のdev配備実測完了)を参照。

失敗／結果不明時は該当環境のenableをfalseにして次の自動配備を止める。これは実行中jobの停止やCloud巻戻しではない。既存run・成果物・部分反映を読取り確認してから修正する。同じ結果不明の配備を盲目的に再送しない。Git revertはDB復元ではない。

Dev受入れに使う配備runは、resolver・verify・deployと証跡artifactが同一attemptで成功している必要がある。原因と部分反映を確認して再試行するときは、軽量な元PR照合からrun全体を再実行する。失敗deploy jobだけの再実行を、受入れ証拠一式が揃ったrunと見なさない。

Prodの `inspect-production-application.yml` は固定receipt用であり、最新の任意配備へ無条件流用しない。対象run/artifact/revision/digestの一致と有効期限を確認する。期限切れの元成果物を再buildで代用して一致確認済みにしない。

リリース直前に、確定スキーマで日次30日保持・PITR・非公開Auth退避先・必要権限・hash保全・通知・復元互換性を環境別に再確認する。それまで保護保留を維持する。初期化・管理者・正式投入・HS業務受入れは通常配備成功とは別の納品条件。[復旧手順](backup-recovery.md)、[Prod構築記録](production-bootstrap-review.md)、[納品ロードマップ](../roadmaps/production-readiness.md)を参照する。
