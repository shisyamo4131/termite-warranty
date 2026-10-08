# 保険／請求の月別Firestore取得

2026-10-08、オーナーが月別DB取得を指示。業務上の対象判定は変更しない。2026-10-09 JST、Dev配備・307件補完・実Firestoreの12条件照合まで完了。実画面とプレビュー全体の比較は下記の残件。

物件ごとに`monthlyQueryVersion: 1`、`insuranceQueryStart`／`insuranceQueryEnd`（YYYY-MM、対象なしは空文字）、`billingQueryMonths`（重複のないYYYY-MM配列）を持つ。全property commandとCSV登録は業務値と同じtransactionで再計算する。利用者の入力は受け付けない。

保険は指定月を含む対象範囲を2つの不等号条件で検索する。初回未報告は引渡月以後の未処理分を含み、更新は更新月以後、旧要確認は全月を対象とする。請求は新規申込月と各延長開始月の配列に`array-contains`を使う。取消・下書きは対象外。取得後も既存の業務判定を適用し、表示順は更新日時・ID降順を維持する。

`prototypeSettings/monthlyQueries.version === 1`のときだけ月別一覧を公開する。準備未完了ならエラーとし、空の一覧で正常終了しない。保証グループ等の追加絞込みは既存の取得後判定を維持するため、月候補数と最終表示件数は異なり得る。計測値はFirestore請求件数ではない。

## 導入・差戻し

1. 索引を配備しREADYを確認。検証済み新版Functionsを全て配備・正式照合する。
2. 旧版の最大実行時間（CSV300秒）が経過し、進行中の旧更新が残らないことを確認。別scriptからの旧形状書込みも止める。新版同士の更新は派生値と原子的なので継続可能。
3. `node scripts/monthly-query-migration.mjs --project <確認したLocal/Dev> `で読取調査。
4. 同じコマンドへ`--apply --writers-drained --generation <実世代> --revision <配備済みcommit>`を追加。Devではソースclean・HEAD一致・normal世代一致を要求する。開始時にversionを0とし、各文書をtransaction内で再読取りして派生値だけ補完。開始・各更新・完了公開のtransactionは復旧markerも読み、途中のphase／世代変更で中断する。業務revision・updatedAtは変えない。全件再照合後だけversionを1へ公開する。
5. 月境界・過月未処理・旧要確認・取消／復元・延長／取消・請求対象の一致と、FunctionsログのpropertyWarranties取得件数を確認。

異常終了時はversion 0を維持し、原因を解消後に再実行する。旧版へ差戻す前にもversionを0へ変更する。追加派生値は残せるが、旧writer使用後の再導入では再移行必須。古いバックアップにmarkerがない場合も再移行する。markerありで派生値が不一致の復元像は整合検証が拒否する。

## CSVまとめ読み

重複検索は既承認の`in`最大30件。既知IDの工務店・保証グループ・本支店コード予約・外部キー予約・採番は、同じtransaction内の`getAll`で最大100参照ずつ取得する。全読取り後に書込む。不足文書もpathで対応付ける。参照対象文書数を減らす仕組みではなく、逐次通信をまとめて待ち時間を抑える変更。読取単体のDev比較は下記、プレビュー全体は未測定。

## 配備前の検証

最終runtime差分を対象に各コマンドがexit 0で完了：`npm test` 355成功・既存symlink条件2skip、`npm run test:rules` 142成功、`npm run typecheck`、`npm run build`、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs`、`./scripts/check-governance.ps1`。初回sandbox実行はEmulator起動と一時ファイルrename制限で失敗し、通常ローカル権限で再検証した。復旧検査のテストadapter不足も修正後に単体試験を再実行。省略gateなし。

独立レビューMONTHLY-03で阻害指摘なし。途中の復旧状態変更を各transactionで拒否する修正と、phase変更・世代変更・最終公開前変更の中断試験を追加済み。月境界・過月・旧要確認・取消・延長を含む旧集合一致、Firestoreの取得文書数、移行の冪等性、getAllの0／1／100／101／300件と欠落・path対応を検証した。

Dev読取専用調査は307物件、派生値補完対象307件。別の読取単体比較（ローカルAdmin SDK→Dev、既存予約300文書、書込なし、各transaction試行1回）は逐次6741／6272／5982ms、getAll111／120／89ms。中央値6272→111ms。300件プレビュー全体の時間ではなく、その改善値への流用はしない。実画面とFunctions全体の比較は別途必要。

## Dev実行結果（2026-10-09 JST）

実装`f23c2a207b73e833be67b8027959cbd6afe15f8c`のFunctions21件とHostingを配備。旧writer最大300秒経過とnormal/default/世代10・更新なしを確認後、307件へ派生値を補完。補完前後で派生値以外の全業務項目の集合hashは一致し、revision・updatedAtも不変。

最初の実クエリは索引の項目順で失敗した。Emulatorは検出しなかった。実Firestoreとinstalled SDKの暗黙順序を確認し、`insuranceQueryEnd ASC`→`insuranceQueryStart ASC`→`__name__ ASC`へ修正（`68e2eedb52fdc951f651b82d8a6db74e9308bf2e`）。修正中はreadyを0とし、回帰試験・独立レビュー・正しい索引のREADY・実クエリ成功後に再公開。今回追加した誤順序の索引1件は削除し、既存索引は保持。

最終Hostingは`sites/termite-warranty-dev/versions/5cf750c9a3f20177`。正式preflightは全10項目pass、Functions21 source一致、索引12／12、除外30、Hosting991ファイル一致。コマンド終了0だけでなく各判定を確認した。初回の配備直後照合は作成中索引とHosting filesのidentity不一致でblocked、再照合後pass。最終revisionのFunctions実体はf23c2a2と同じで、再配備せずソース完全一致を照合。

| 実行 | 結果・終了コード |
| --- | --- |
| `npm run build:recovery-release -- --revision 68e2eedb52fdc951f651b82d8a6db74e9308bf2e` | 成功、0 |
| Firebase CLI `deploy --only functions --project termite-warranty-dev --non-interactive`（f23c2a2） | 21件成功、0 |
| Firebase CLI `deploy --only firestore:indexes`／`deploy --only hosting`、同Dev指定 | 索引修正版・Hosting成功、各0 |
| `default-recovery.mjs preflight`（同Dev、control `recovery-control`、revision 68e2eed、source `(default)`、世代10、site同Dev、旧Hosting `5ef2ab68e6615ade`、`--dev-inspect`） | 全10項目pass、0 |
| `monthly-query-migration.mjs --project termite-warranty-dev --apply --writers-drained --generation 10 --revision 68e2eedb52fdc951f651b82d8a6db74e9308bf2e` | 最終再検査307、補完差分0、公開成功、0 |
| Dev Admin SDKによる6か月×保険／請求の照合 | 全12条件一致、業務値不変、ready=1読戻し、0。2026-10-08 15:10:39 UTC |
| 配備後バックアップ設定検査 | 自動取得false 21件、Scheduler PAUSED、PITR無効、backup schedule／backup 0、0 |

索引順序修正後、`npm test`355成功・2skip、`npm run test:rules`142成功、governance成功を各exit 0で再確認。型検査・build・Functions構文・seed構文の既成功証拠は、索引順のみの差分がverification-policyの無効化条件に該当しないため再利用。正式release buildは再生成。検証省略なし、governance／IAM／認証サービスの変更なし。

全グループを対象とした月条件のDB取得件数（全体307物件）：

| 月 | 保険 | 請求 |
| --- | ---: | ---: |
| 2026-08 | 1 | 0 |
| 2026-09 | 1 | 0 |
| 2026-10 | 305 | 305 |
| 2026-11 | 304 | 0 |
| 2031-10 | 305 | 0 |
| 2036-10 | 305 | 1 |

全件から既存業務判定で計算したID集合とクエリ結果を比較し、各条件で件数だけでなくID集合が一致した。保険の翌月以降には過月未報告分が含まれる。グループ等の追加条件は取得後判定なので、画面の最終表示件数とは区別する。これはDB検証であり実画面の操作証拠・Functionsログによるプレビュー全体測定ではない。

### 残る実画面検証

Dev用の架空HS管理者1件を作成して検証後にその1件だけ削除する承認を、本タスクで質問済み・回答待ち。過去の自動承認レビューが、包括的なDev操作承認だけでは管理者作成の範囲が明確でないとして拒否したため、再実行していない。利用可能な既存IABタブなし。実在者の認証情報取得・権限変更は行わない。

承認後、Dev実画面で保険／請求の月切替とCSV対象一致を確認し、同じ300行の未登録外部キーでプレビューを複数回実行する。FunctionsログのdurationMs、transaction試行数、getAllCalls、queryCalls、returnedDocuments／missingDocumentsを照合し、読取単体の数値と分けて記録する。現時点で実画面確認・プレビュー全体短縮を完了扱いにしない。
