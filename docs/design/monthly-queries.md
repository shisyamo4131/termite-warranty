# 保険／請求の月別Firestore取得

2026-10-08、オーナーが月別DB取得を指示。業務上の対象判定は変更しない。現在は実装・検証中でDev未反映。

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

重複検索は既承認の`in`最大30件。既知IDの工務店・保証グループ・本支店コード予約・外部キー予約・採番は、同じtransaction内の`getAll`で最大100参照ずつ取得する。全読取り後に書込む。不足文書もpathで対応付ける。参照対象文書数を減らす仕組みではなく、逐次通信をまとめて待ち時間を抑える変更。Devの同条件比較は未実施。

## 配備前の検証

最終runtime差分を対象に各コマンドがexit 0で完了：`npm test` 355成功・既存symlink条件2skip、`npm run test:rules` 142成功、`npm run typecheck`、`npm run build`、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs`、`./scripts/check-governance.ps1`。初回sandbox実行はEmulator起動と一時ファイルrename制限で失敗し、通常ローカル権限で再検証した。復旧検査のテストadapter不足も修正後に単体試験を再実行。省略gateなし。

独立レビューMONTHLY-03で阻害指摘なし。途中の復旧状態変更を各transactionで拒否する修正と、phase変更・世代変更・最終公開前変更の中断試験を追加済み。月境界・過月・旧要確認・取消・延長を含む旧集合一致、Firestoreの取得文書数、移行の冪等性、getAllの0／1／100／101／300件と欠落・path対応を検証した。

Dev読取専用調査は307物件、派生値補完対象307件。別の読取単体比較（ローカルAdmin SDK→Dev、既存予約300文書、書込なし、各transaction試行1回）は逐次6741／6272／5982ms、getAll111／120／89ms。中央値6272→111ms。300件プレビュー全体の時間ではなく、その改善値への流用はしない。実画面とFunctions全体の比較は別途必要。
