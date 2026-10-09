# 保証書CSV・保証期間別の発行管理

仕様0.1.130／2026-10-09オーナー承認。製品の検証・Dev反映は下の実績欄で区別する。

## 保存と取得

- `propertyWarranties.certificateItems`は`id`（initial／有効延長requestId／確定済み取込期間ID）、`startDate`、`expiryDate`、`issued:true`、`requestId`、`at`、`actorUid`を持つ。期間IDと両日付が一致した場合だけ発行済み。保証期間は既存の10年区切り。保険の5年区切りとは別。
- 記録のない既存Dev／Local期間は未発行で開始する。年月・取消・延長取消から有効な期間を再計算。延長取消後の記録は保存し、再延長の新IDへ流用しない。引渡日訂正で日付が変われば未発行として再確認する。実際の交付物の回収・訂正はHSの別業務。
- 発行済みcommandはHSの有効アカウント、物件active、revision、選択した期間ID・日付・対象月をtransaction内で検証。同じ物件の複数期間を一度に更新。異なる物件は順次処理し、途中失敗は確認済み件数を表示。requestId receiptにより結果不明の再試行で二重更新しない。
- CSV出力だけでは更新しない。編集画面からも変更させない。誤操作の発行済み取消UIは今回追加していない。
- 派生値は`certificateQueryVersion:1`、`certificateQueryMonths`（有効期間の開始月）、`certificatePendingMonth`（最も早い未発行月、なければ空文字）。全保存command／一括取込と同じtransactionで更新。
- Firestoreで指定月のarray-containsと過去未発行月の範囲（空文字より大・対象月より小）を取得し、文書IDで重複排除して期間行へ展開。業務文書全件取得はしない。同一物件が両条件を満たす場合は読取が2回になる。各queryは単一フィールド索引で、追加の複合索引は不要。
- `prototypeSettings/certificateQueries.version=1`まで新一覧を公開しない。記録不足で期間IDを特定できない行は「要確認」、選択・発行済み登録不可。
- CSVはBOM付きUTF-8、CRLF、共通csvCellによる引用・エスケープ。仮5列には期間列を追加しないため、同物件の初回／延長を同時に選ぶと同じ5列の行が複数になる。発行対象期間は画面で確認する。

## 導入・差戻し・復旧

1. 全7gate・独立レビュー後にソースをcommitし、承認済みDevへFunctionsを配備。旧writer終了を確認する。
2. `node scripts/certificate-query-migration.mjs --project termite-warranty-dev`で補完対象を確認。正常世代を実読取し、`--apply --writers-drained --generation <実値> --revision <完全HEAD>`で派生値のみ補完する。CLIはDev/Local明示・clean runtime・世代一致を必須とし、各transactionで世代を再検査。readyを0にして処理し、全件再検査後のみ1に戻す。
3. Hosting配備・正式preflight・実画面月切替／選択／CSV／発行／編集表示／Functionsログを検証する。
4. 差戻しは前のレビュー済みruntimeへ戻し、新タブを除く。保存済み発行事実は消さない。再導入・旧バックアップ復旧時は派生値を再補完し、月別投影の整合を満たすまで公開しない。これは正常Devの更新であり保守モードやProd変更を許可するものではない。

## 検証実績

実装と独立レビューを実施。レビューの2件（詳細の保険向け誤案内、共通年月入力の未使用）を修正し、再レビューで解消確認。以下は配備前の途中記録で、Dev成功を意味しない。

| 必須gate | コマンド | 結果／exit |
| --- | --- | --- |
| governance-check | `./scripts/check-governance.ps1` | 成功／0 |
| domain-test | `npm test` | 356成功・2skip・失敗0／0 |
| app-typecheck | `npm run typecheck` | 修正後成功／0 |
| app-build | `npm run build` | 修正後成功／0 |
| firestore-rules-test | `npm run test:rules` | 最終追加試験を含め実行中。先行実行143成功／0 |
| functions-syntax | `node scripts/check-functions-syntax.mjs` | 成功／0 |
| seed-syntax | `node --check scripts/seed-emulator.mjs` | 成功／0 |

混合変更につき全7gateを選定、省略なし。初回sandbox内のnpm testは一時ディレクトリrename権限（exit 1）、test:rulesはemulator待受開始失敗（exit 1）。通常権限で再実行。CSV単体試験の期待値を共通csvCellの全セル引用形式へ訂正した初期失敗（exit 1）も成功へ混ぜない。

Dev補完前：315物件、normal／世代10、Hosting `5cf750c9a3f20177`。業務項目の比較用ハッシュを機密情報を含めずLocal一時記録へ保存。Dev配備・補完・実画面は未実施。

仕様／検索要件／試作保存契約／HSC-037／索引／ロードマップ／運用／変更履歴を更新。既存の期間ID・transaction・receipt・派生検索を利用し、新たな耐久的アーキテクチャ判断はないためADRは追加しない。Rules・IAM・共通governanceは変更なし。
