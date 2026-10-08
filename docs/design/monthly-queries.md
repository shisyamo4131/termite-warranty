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

### Chrome実画面検証（2026-10-09 JST、途中結果）

オーナーが既存Chromeのログイン済み管理者利用と検証開始を指示。既存の「デモ管理者」で実画面を操作できたため、新規管理者作成は不要。以前の専用アカウント承認待ちを現在の阻害事項から除く。検証対象runtimeは上記のDev配備版、作業開始時HEADは`83a8db1d1ef6f793ebd24f65238f8b8fed87f358`。

2026-10-08 15:23:06 UTCの保険報告一覧取得は、2026-10を指定して画面305件、全選択305件。Functionsの`propertyPrototype/list`成功ログは490ms、`propertyWarranties`はqueryCalls 1・returnedDocuments 305・readDurationMs 349。全307件取得ではない。認証・復旧・準備状態の確認用読取りは別に4文書ある。計測は請求件数そのものではない。

実画面のCSV出力から保存された保険報告CSVを検査し、7列・305行・物件名重複なし・全行の対象月2026-10を確認。既存架空300物件については全名称・住所・面積も照合した。CSV検査`node tmp/monthly-ui-csv-check.mjs <実ダウンロードファイル> report 2026-10 305`はexit 0。`node tmp/monthly-ui-log-check.mjs`は最初Cloud Loggingの429で失敗（exit 1）したが、間隔を置いた再取得はexit 0。取得時刻・固定操作名・集計値だけを保存し、認証情報を記録しない。

CSV自体は保存されたが、操作ツールのdownload待機がタイムアウトした。その後、元タブへの接続が`Debugger unattached`となり、同一タブ再取得・再指定・画面取得でも復旧しなかった。同じChromeの別タブは操作可能だがログイン画面だった。元タブの再読み込みをオーナーへ依頼中。アプリのCSV失敗や認証不具合と断定しない。アカウント新設・認証情報取得・本登録・報告済み変更は行っていない。

残件は保険／請求の月切替・請求CSV対象一致と、未登録外部キーの300行プレビュー複数回。FunctionsログのdurationMs、transaction試行数、getAllCalls、queryCalls、returnedDocuments／missingDocumentsを照合し、読取単体の数値と分けて記録する。現時点で実画面検証全体・プレビュー全体短縮を完了扱いにしない。今回の途中結果はアプリ実装・仕様・データ契約・権限変更を伴わない。

### 操作接続切断の原因調査（2026-10-09 08:38 JST）

オーナー指示で業務検証より先に切断原因を調査。元のChromeタブを再指定すると接続でき、再ログイン操作なしでデモ管理者・10月・305件全選択の状態を確認した。前述の再読み込み依頼を現在の阻害条件から除く。利用者による途中操作の有無は確認しておらず、復帰の直接原因は断定しない。

同じ画面で比較：08:36:58 JSTのCSV出力のみは正常保存・画面接続維持。08:37:07 JSTのCSV出力＋操作ツールのdownload待機は、ファイルを正常保存した一方で6000msの検知タイムアウトを再現。今回はその失敗を捕捉してツール全体の制限時間より先に終了したため、直後の画面取得も成功した。元のCSVと両再試験の計3ファイルはSHA-256一致。

前回の観測順は「CSV保存→download待機未完了→30秒でツール実行環境リセット→Debugger unattached」。今回の比較から、ダウンロード検知失敗と実行環境リセットに伴う操作接続喪失が有力な原因。検知できない理由や切断通知の内部原因までは、公開操作APIの証拠で確定できない。拡張機能／ツール内部の原因を推測で特定しない。

08:37:42 JST、元タブで「対象を抽出」を再実行し305件表示。Functionsログ08:37:45 JSTの`propertyPrototype/list`は認証確認成功・物件305件・997ms。前回切断後の00:28:50 JSTにも認証必須`reportFirestoreMetrics`が成功していた。Cloud Loggingで前回00:22–00:40 JSTと今回08:35–08:38 JSTの認証診断・サーバー観測・ERROR以上・HTTP400以上を検索し、成功7記録、認証診断0・該当失敗0、ページ残なし。`node tmp/browser-disconnect-logs.mjs`はexit 0。再接続後に取得可能なブラウザwarn/errorも0件だが、前回の全ブラウザ通信履歴を復元した証拠ではない。

別タブのログイン画面は、実装`browserSessionPersistence`とFirebaseの[タブ単位の認証維持](https://firebase.google.com/docs/auth/web/auth-state-persistence?hl=ja)に整合し、元タブの認証喪失を意味しない。CSV出力本体は既取得データからBlobを生成し保存する処理で、認証状態の変更処理はない。今回の切断と既知`auth/network-request-failed`との関連を示す証拠は得られず、HSC-041の根本原因は未解決のまま維持する。

以後のCSV検証は実画面の出力操作後、保存されたファイルを検査する。download待機を無期限に続けず、操作ツールの制限時間より短く失敗を捕捉する。アプリ修正・再配備・認証/IAM設定変更は行わない。文書のみの更新としてgovernance-checkを選択し、runtime各ゲートは変更範囲外。
