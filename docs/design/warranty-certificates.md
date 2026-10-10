# 保証書CSV・保証期間別の発行管理

仕様0.1.131／2026-10-09オーナー承認。製品の検証・Dev反映は下の実績欄で区別する。

## 保存と取得

- `propertyWarranties.certificateItems`は`id`（initial／有効延長requestId／確定済み取込期間ID）、`startDate`、`expiryDate`、`issued`（boolean）、`requestId`、`at`、`actorUid`を持つ。期間IDと両日付が一致した場合だけ発行済み。保証期間は既存の10年区切り。保険の5年区切りとは別。
- 記録のない既存Dev／Local期間は未発行で開始する。年月・取消・延長取消から有効な期間を再計算。延長取消後の記録は保存し、再延長の新IDへ流用しない。引渡日訂正で日付が変われば未発行として再確認する。実際の交付物の回収・訂正はHSの別業務。
- 発行済みcommandはHSの有効アカウント、物件active、revision、選択した期間ID・日付・対象月をtransaction内で検証。同じ物件の複数期間を一度に更新。異なる物件は順次処理し、途中失敗は確認済み件数を表示。requestId receiptにより結果不明の再試行で二重更新しない。
- CSV出力だけでは更新しない。物件／保証編集画面と保証書CSV一覧の詳細画面からundoCertificateで指定期間を未発行へ戻せる。active・revision・期間ID／日付・発行済みを検査し、理由必須でissued:falseと履歴を保存する。
- 派生値は`certificateQueryVersion:1`、`certificateQueryMonths`（有効期間の開始月）、`certificatePendingMonth`（最も早い未発行月、なければ空文字）。全保存command／一括取込と同じtransactionで更新。
- Firestoreで指定月のarray-containsと過去未発行月の範囲（空文字より大・対象月より小）を取得し、文書IDで重複排除して期間行へ展開。業務文書全件取得はしない。同一物件が両条件を満たす場合は読取が2回になる。各queryにgroupId一致を付け、有効な保証グループを必須とする。groupId＋certificateQueryMonths、groupId＋certificatePendingMonthの複合索引を使用する。
- `prototypeSettings/certificateQueries.version=1`まで新一覧を公開しない。記録不足で期間IDを特定できない行は「要確認」、選択・発行済み登録不可。
- CSVはBOM付きUTF-8、CRLF、共通csvCellによる引用・エスケープ。仮6列（既存5列＋住所）には期間列を追加しないため、同物件の初回／延長を同時に選ぶと同じ6列の行が複数になる。発行対象期間は画面で確認する。

## 導入・差戻し・復旧

1. 全7gate・独立レビュー後にソースをcommitし、承認済みDevへFunctionsを配備。旧writer終了を確認する。
2. `node scripts/certificate-query-migration.mjs --project termite-warranty-dev`で補完対象を確認。正常世代を実読取し、`--apply --writers-drained --generation <実値> --revision <完全HEAD>`で派生値のみ補完する。CLIはDev/Local明示・clean runtime・世代一致を必須とし、各transactionで世代を再検査。readyを0にして処理し、全件再検査後のみ1に戻す。
3. Hosting配備・正式preflight・実画面月切替／選択／CSV／発行／編集表示／Functionsログを検証する。
4. 差戻しは前のレビュー済みruntimeへ戻し、新タブを除く。保存済み発行事実は消さない。再導入・旧バックアップ復旧時は派生値を再補完し、月別投影の整合を満たすまで公開しない。これは正常Devの更新であり保守モードやProd変更を許可するものではない。

## 0.1.131の実績

グループ別抽出・住所を加えた6列・編集画面からの期間別取消をDevへ反映済み。Local全7gate、独立レビュー、Dev補完・配備照合、Chromeの実画面とCSV実ファイル・Functionsログを確認。[請求と共通の導入／検証記録](monthly-queries.md#0131-dev配備実画面検証2026-10-09)。以下は初版5列時点の履歴で、現行の「取消できない」という説明には用いない。

## 旧版0.1.130の検証実績

実装・独立レビュー・全7gate・Dev配備・検索項目補完・実画面検証を完了。runtime基準は `8ea12df8bb8aadbe35d81d048a627c93484da4a4`。レビューの2件（詳細の保険向け誤案内、共通年月入力の未使用）は修正・再レビューで解消。

| 必須gate | コマンド | 結果／exit |
| --- | --- | --- |
| governance-check | `./scripts/check-governance.ps1` | 成功／0 |
| domain-test | `npm test` | 356成功・2skip・失敗0／0 |
| app-typecheck | `npm run typecheck` | 修正後成功／0 |
| app-build | `npm run build` | 修正後成功／0 |
| firestore-rules-test | `npm run test:rules` | 最終状態143成功／0（287014ms） |
| functions-syntax | `node scripts/check-functions-syntax.mjs` | 成功／0 |
| seed-syntax | `node --check scripts/seed-emulator.mjs` | 成功／0 |

混合変更につき全7gateを選定、省略なし。初回sandbox内のnpm testは一時ディレクトリrename権限（exit 1）、test:rulesはemulator待受開始失敗（exit 1）。通常権限で再実行。CSV単体試験の期待値を共通csvCellの全セル引用形式へ訂正した初期失敗（exit 1）も成功へ混ぜない。

Dev補完前：315物件、normal／世代10、Hosting `5cf750c9a3f20177`。業務項目の比較用ハッシュを機密情報を含めずLocal一時記録へ保存。Dev配備後・補完直後に件数315・業務項目ハッシュ一致を確認。画面試験ではその後、下記の架空1物件を操作した。

仕様／検索要件／試作保存契約／HSC-037／索引／ロードマップ／運用／変更履歴を更新。既存の期間ID・transaction・receipt・派生検索を利用し、新たな耐久的アーキテクチャ判断はないためADRは追加しない。Rules・IAM・共通governanceは変更なし。


### Dev配備・照合（2026-10-09）

| コマンド／確認 | 結果／exit |
| --- | --- |
| `npm run build:recovery-release -- --revision 8ea12df8bb8aadbe35d81d048a627c93484da4a4` | 決定的build成功／0 |
| `npx firebase deploy --only functions --project termite-warranty-dev --non-interactive` | 全21 Functions更新成功／0 |
| `node tmp/certificate-dev-check.mjs drain`（読取のみの一時確認） | ACTIVE21、実行中操作0、復旧／Authロックなし、normal10／0 |
| `node scripts/certificate-query-migration.mjs --project termite-warranty-dev` | scanned315・changed315・書込なし／0 |
| 同CLI `--apply --writers-drained --generation 10 --revision 8ea12df8bb8aadbe35d81d048a627c93484da4a4` | scanned315・changed315、再検査後ready=1／0 |
| `node tmp/certificate-dev-check.mjs verify`（読取のみ） | 315物件の業務項目不変、検索6条件一致／0 |
| `npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` | 成功／0、最終 `sites/termite-warranty-dev/versions/3fe35a7a90ec2bbe` |
| `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 8ea12df8bb8aadbe35d81d048a627c93484da4a4 --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/5cf750c9a3f20177 --dev-inspect` | 最終全10判定pass／0。Functions21 source一致、Hosting991ファイル、索引12、除外30 |
| `node tmp/certificate-dev-check.mjs postcheck` | 315物件保持、操作対象の初回／延長とも発行済み、未発行最古月は空／0 |
| `node tmp/certificate-dev-check.mjs logs 2026-10-09T01:36:00Z` | 一覧7・発行2のFunctions計測受信、9件すべてsuccess、ページ残りなし／0 |

初回preflightはHostingファイルのidentity-mismatchを検出（コマンドexit0だが判定blocked）。成功と扱わず、後続照合で全項目passを確認。不一致の内部原因はこの記録だけでは断定しない。その他のruntime設定・IAM・Rules・索引の変更はしていない。Prod構築・Git pushも行っていない。

### 必要な業務文書だけの取得

補完直後の固定データ315物件に対する照合。アプリ計測・query返却件数であり、請求件数ではない。

| 対象年月 | query返却文書の合計 | 重複除外後の物件 | 対象保証期間 | 全データから独立計算した期待集合 |
| --- | ---: | ---: | ---: | --- |
| 2026-08 | 2 | 2 | 2 | 一致 |
| 2026-09 | 2 | 2 | 2 | 一致 |
| 2026-10 | 315 | 315 | 315 | 一致 |
| 2026-11 | 315 | 315 | 315 | 一致 |
| 2036-10 | 316 | 315 | 316 | 一致 |
| 2036-11 | 315 | 315 | 316 | 一致 |

10月以降に多いのは、今回のデモデータがすべて未発行で開始したため。2036-10は同じ物件の過去未発行と当月延長が2queryに現れ、文書読取は1件重複するが、画面の期間行は重複させない。

### Chromeの実画面による業務検証

既存ログインの「デモ管理者」で実施。Authアカウント作成なし。

1. 新しい上部タブを開き、2026-10の315期間を表示。6桁`202609`入力で2026-09へ切替え、過去未発行2期間を表示。
2. 架空`QA85F17F-16-001`（業務検証・満了案内）の初回を1件選択してCSV出力。ダウンロード実ファイルはBOM付きUTF-8・5列・1行、番号／物件名／2016-10-08／工務店／本店が画面と一致。出力後も未発行。
3. 別操作の確認画面で初回を発行済みに登録。2026-09一覧は2→1期間となり、未選択の保証を残す。
4. 物件／保証編集画面で初回「発行済み」を確認。同画面に発行フラグの編集操作なし。実際の「10年間延長」を実施し、初回発行済みの維持・延長1の未発行を確認。
5. 保証書の2026-10一覧に延長1（2026-10-08～2036-10-07）が表示されることを確認。延長1だけを発行済みに登録し、初回も発行済みのまま。専用詳細の見出し／案内と両期間の表示も確認。
6. 発行済み行を再選択するとCSV出力は可能、発行済み登録ボタンは無効。2026-11へ切替え、発行済みになった対象物件がなく、314期間になることを確認。全ページ選択で314行のCSVをダウンロードし、5列・保証番号314種類・当該番号の除外を検査。
7. 年月変更で選択解除・再取得前のCSV抑止、未入力時のエラー、カレンダーで10月選択・検索を確認。空欄のまま取得を実行しない。390px幅では入力・ボタンが縦に折り返し、ページ全体の横はみ出しなし。通常幅へ戻した。
8. Functionsログの`certificateList`7件は169～821ms、`issueCertificate`2件は423／282ms。後者は各回物件read1・writeConfirmed1（ほかに認可／receipt／復旧制御のアクセスあり）。全件success。UI所要時間や課金額と同一視しない。

画面切替直後の一度の検索クリックでは条件未適用が残ったため、未適用表示と選択無効を確認して再検索。画面に表示されていない結果を成功と扱っていない。最終状態は315物件維持、架空1物件を20年へ延長し、初回・延長1を発行済みにした状態（revision9）。この変更は承認済みDevデモ操作。ブラウザは保証書の閲覧専用詳細を開いた状態で引き渡す。

実画面の画像はLocalの`tmp/certificate-period-status.png`（初回済／延長未発行）、`tmp/certificate-final-status.png`（両方済）、`tmp/certificate-narrow.png`。ダウンロードはユーザーのDownloadsにある`保証書_2026-09.csv`／`保証書_2026-11.csv`。いずれも架空データ。

### 変更対象と残件

- 画面：`app/components/MeetingPrototype.vue`、`WarrantyLifecycleDetails.vue`、`WarrantyCertificateManagement.vue`。
- 業務／サーバー：`src/domain/warranty-certificate.mjs`・同`.d.mts`、`monthly-query.mjs`、`recovery.mjs`、`functions/property-warranty.js`、`firestore-metrics.js`。
- 導入／試験：`scripts/certificate-query-migration.mjs`、`scripts/lib/certificate-query-migration.mjs`、`scripts/seed-emulator.mjs`、`test/property-warranty.test.mjs`、`test/emulator/property-warranty.test.mjs`。
- 文書：本書、`docs/specification.md`、`docs/requirements/search-and-list.md`、`environment-configuration.md`、`house-solution-confirmations.md`とHSC-037、`docs/design/meeting-prototype-2026-10-03.md`、`docs/operations.md`、`docs/roadmaps/2026-initial-delivery.md`、`docs/README.md`、`docs/design/README.md`、`CHANGELOG.md`。
- 正式CSV項目の確定、保証書作成／印刷は後発。仮列には保証開始／満了日を含めない。通信切断を人為的に起こす実ブラウザ試験・複数物件の途中失敗を起こす実ブラウザ試験は未実施。再送・同時更新・取消／復元／再延長はLocalのtransaction試験で確認。
- [Dev／Prod設定仕様](../requirements/environment-configuration.md)にreadiness設定と既存IAM照合の結果を反映。Devの全権限・通知実受信・現CI秘密値との対応がすべて確認済みという意味ではない。残る不可視のサービス主体、現CI実行、通知先本人／実受信の未確認範囲は同書を維持する。

最終文書反映後の `./scripts/check-governance.ps1` と `git diff --check` は各exit0。文書のみの追記でruntime gateの無効化条件に該当しないため、上記runtime検証を再利用した。
