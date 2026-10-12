# 保険／請求の月別Firestore取得

## 2026-10-12 実装設計と導入手順

オーナーの実装・Dev反映指示により、HSC-042を実装する。指定年月Mは画面で一度だけ前月Tへ変換し、既存APIの `month`／`filter.reportMonth` と報告・請求・発行操作の月はTの意味を維持する。画面は指定年月と対象月を明記し、CSVの既存「対象月」列と各ファイル名にはTを使う。前月を表現できない年月は拒否する。

- `includeDone` は省略時false、指定時はboolean。保険は `list.filter`、請求・保証書は専用一覧操作の引数に追加する。
- 請求の通常取得はグループ＋最古未請求月≤T、ONはグループ＋既存 `billingQueryMonths` のTを取得し、識別可能な未請求／請求済みのT期間へ展開する。不明を未請求とみなさない。グループ＋同配列の複合索引を追加する。
- 保証書の通常取得はグループ＋最古未発行月≤T、ONはグループ＋既存 `certificateQueryMonths` のTだけ。通常の当月発行済みとONの過去未発行を除く。
- 保険は通常の候補日付範囲を維持。ONではその候補と新しい `insuranceReportedQueryMonths` のT検索を結合し、元の対象月Tに一致する未報告候補と確認済みの報告済み期間だけを返す。全業務文書の無条件取得は行わない。
- 報告済みは有効な報告イベントと保険期間の状態・識別子・日付、保証期間を照合する。保存した `reportKind:new` は後半区間の初報告でも引渡月、renewalは期間開始日前日の月とする。取消済みイベント・報告不要・不一致・種別不明から行を推定しない。通常の初回対象期間はTの月末（月内保証終了なら満了日）で判定する。
- 保険の応答は `reportState:pending|reported|review`、既存形状の実対象 `reportTarget`、判明した `reportBasisMonth`、報告済みの `reportId` を区別する。ONで対象月を確定できない候補は一覧へ混ぜず、`unclassifiedCount` と注意表示で示す。この件数は取得候補内の確認不能件数であり、当月対象数と呼ばない。通常モードの要確認表示は維持する。
- CSVは選択した未処理・処理済みを出力できるが、済みにする操作・確認画面は未処理だけ。保険の行・選択・詳細対象は物件IDと期間IDで識別する。年月・グループ・チェック変更時は選択を解除し、再抽出まで出力・更新を止める。

### 保存・互換性・差戻し

追加値は `insuranceReportedQueryVersion:1` と、重複なし・昇順の `insuranceReportedQueryMonths:string[]`。activeかつ証拠を照合できる報告済み期間の対象月のみを保存し、取消／下書き／対象なしは空配列。既存 `monthlyQueryProjection` に組み込み、通常保存・報告／取消・不要・延長・取込みで業務値と同時更新する。既存の報告イベント・期間・業務revision・更新日時の意味は変更しない。

独立した準備印 `prototypeSettings/insuranceReportQueries.version=1` まで、保険の「報告済みを含める」は公開しない。旧月別・請求・保証書のversionは1のまま。新準備印がない旧復元像は従来機能を利用でき、新機能は補完まで閉じる。新準備印が1の復元像は追加値の照合を必須にする。初期取込み・Local seedも追加投影の生成後に準備印を作る。

導入順は、必要索引のREADY確認→新版Functions→旧更新処理の最大300秒終了と実行中なしを確認→追加値の読取調査・補完・照合→Hosting公開。`scripts/insurance-report-query-migration.mjs` はDev／Localに対象を限定し、Dev適用はレビュー済みruntimeのHEAD一致・clean・normal世代一致・旧更新終了確認を要求する。開始時準備印0、各文書の取引内再読取と世代確認、追加値だけの書込み、全件再照合後の準備印1という順とする。更新日時・業務revision・採番・報告履歴を変更しない。失敗時は0のまま再調査する。

旧版へ戻す場合は先に新準備印を0にし、レビュー済み旧Hosting／Functionsを配備する。追加値は削除しない。旧更新処理を再稼働した後の再導入では再補完・照合する。旧クライアントの月をサーバーで暗黙にずらさず、公開後は画面再読込みを案内する。

検証は包括7ゲートに加え、前年12月への切替、T前後の未処理／処理済み、初回／更新／延長、後半初報告、取消・不要・不明、混在選択、CSV状態不変、移行の再実行・途中世代変更、復元互換を対象とする。Devは読取照合で確認し、更新・採番試験は隔離環境の架空データのみ。実装・試験・配備の進行は[運用記録](../operations.md)で管理する。

## 2026-10-12 前月基準・処理済み表示の採用時点

[確定仕様](../specification.md#2026-10-12-月別3一覧の前月基準処理済み表示)により、指定年月の前月を基準月へ変換する。通常は基準月以前の未処理候補、処理済みを含める場合は基準月だけの未処理・処理済み。過去未処理の取得をチェック時にも残す設計にはしない。保険更新・請求延長の基準日は既存どおり。1月の前年12月への切替、通常／チェック切替時の再抽出・選択解除、当月候補除外、混在選択時の未処理だけの更新を検証対象にする。

採用時の請求取得は未請求限定、保険取得は未報告候補用であり、画面にチェック項目を足すだけでは処理済みを取得できなかった。後続の開始指示により、取得・再出力・保存互換・検索用項目の補完を上記の実装設計で定めた。全業務文書を取得して画面だけで絞る方式へは変更しない。以下は変更前の実装・検証記録。

## 2026-10-12 請求用一覧の操作表記

オーナー指示により、一覧右上の2ボタンを「CSV出力」「請求済みにする」とし、保証書CSVの操作表記に揃える。ボタン内の選択件数を省略し、一覧上部と確認画面の件数表示は維持する。対象期間・有効条件・CSV内容・請求済みへの更新処理は変更しない。

## 2026-10-10 保険期間別状態への対応

保険報告の候補判定は期間別状態の共通処理を使用する。報告不要の期間を一覧・CSV・報告操作から除外し、期限内の不要取消後は元の対象月の条件で再表示する。候補の外側範囲を既存 `insuranceQueryStart`／`insuranceQueryEnd` に保存し、離れた未報告区間の間は取得後の共通判定で除く。今日の件数は別の固定3区間で集計するため、月別一覧の数と同じとは限らない。

保険満了案内は、取消を除く実報告がある物件の次の報告準備に限定し、途中の報告不要期間を飛ばす。一度も報告していない物件は保険報告一覧で扱う。公開準備・移行・互換性は[期間別保存契約](meeting-prototype-2026-10-03.md)、導入実績は[運用記録](../operations.md)を参照。

## 2026-10-09 請求の過月未処理抽出（Dev反映済み）

現行要件は保証グループ＋対象年月で当月を含む過去未請求を抽出する。従来のbillingQueryMonthsと旧APIは互換用に維持し、新画面はbillingListを使用する。billingQueryVersion:1とbillingPendingMonth（activeかつ識別可能なpending期間の最古の請求対象月、なければ空文字）をmonthlyQueryProjectionで同時保存する。unknownをpendingへ変換しない。

billingListはHSのみ。有効グループと年月を検証し、groupId一致、billingPendingMonth>空文字かつ<=指定月をFirestoreに渡す。取得後に対象の保証期間へ展開する。groupId＋billingPendingMonthの複合索引が必要。prototypeSettings/billingQueries.version=1まで公開しない。

billPeriodsは1物件の選択期間（最大3）を同じtransactionで更新する。最新revision、全期間のID・日付・pending状態・対象月・グループを検証し、receiptで再送を抑止する。複数物件は順次処理し、部分成功件数を表示する。undoBillで未請求へ戻せば検索用項目も更新され、再抽出される。

導入は索引READY→検証済みFunctions全配備→旧writer終了確認→`scripts/billing-query-migration.mjs`のdry-runとapply→Hosting。CLIの世代／clean revision保護は既存証書移行と同一。補完は派生値のみで業務状態、revision、updatedAtを変更しない。差戻しは旧画面へ戻し記録を保持。復旧検証はmonthlyQueries・certificateQueries・billingQueriesの各readyに対応した項目だけを照合する。未導入の旧像は新一覧を閉じたまま復旧でき、normalへ戻した後に補完・全件検査して新一覧を公開する。導入済みなのに投影が壊れている像は拒否し、開発側で別途照合する。新保証書APIはgroupId必須となるため旧画面は再読込みが必要。

検証：単体の月境界・不明／取消除外、emulatorのグループ別取得件数・複数期間一括・再送・古いrevision拒否・取消再表示、全7gate、Dev実画面／Functionsログ。旧版の以下の実測を今回の成功証拠へ流用しない。

2026-10-08、オーナーが月別DB取得を指示。業務上の対象判定は変更しない。2026-10-09 JST、Dev配備・307件補完・実Firestoreの12条件照合、Chromeで300件プレビュー3回と全300行照合を完了。プレビューFunctions時間の中央値は18,248→1,031ms。月切替12条件・請求CSVの実画面照合も完了。

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

重複検索は既承認の`in`最大30件。既知IDの工務店・保証グループ・本支店コード予約・外部キー予約・採番は、同じtransaction内の`getAll`で最大100参照ずつ取得する。全読取り後に書込む。不足文書もpathで対応付ける。参照対象文書数を減らす仕組みではなく、逐次通信をまとめて待ち時間を抑える変更。読取単体とプレビュー全体のDev比較は下記。

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


### 300件プレビュー全体の検証完了（2026-10-09 08:46 JST）

既存Chromeのデモ管理者で、容量検証4709グループ／工務店25を選び、CSVをファイル選択画面から読み込み、「内容を検証」を3回実行。作業開始HEADは`33c9c7f8e4a9f75b6422ac9e17c78fea1e496672`、Dev runtimeは上記の既配備版。改修前に使った300行CSVの外部キーだけを未登録の一意値へ置換し、その他13項目とヘッダーの一致を検査（Python csv照合、exit 0）。各回とも同じCSV・25本支店を使用し、300件成功を実画面で確認。既存登録済みデータは保持し、本登録ボタンは押していない。

| 回 | Functionsログ時刻（JST） | プレビュー全体durationMs | getAllCalls | 重複検索queryCalls | transactionAttempts | writeAttempts |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 08:46:11 | 1,411 | 6 | 20 | 1 | 0 |
| 2 | 08:46:21 | 898 | 6 | 20 | 1 | 0 |
| 3 | 08:46:29 | 1,031 | 6 | 20 | 1 | 0 |

中央値1,031ms。改修前のFunctions実測18,248msに対して17,217ms、94.35%短縮。これはin30とgetAllを合わせた改善で、getAll単独の効果と扱わない。改修前は1回、改修後は3回の実環境測定であり、同時負荷・起動状態を固定した統計比較ではない。従前のデータを保持した同じDevでの比較で、DB全体が改修前と完全に同一の状態という意味でもない。

各回とも外部キー予約の欠落300件、重複検索20回の返却0件を確認。重複検索以外に本支店一覧query 1回と認証／復旧等の付帯読取りがある。getAllの回数を読取文書数やFirestore請求件数に読み替えない。プレビューの書込みはログ上0で、transaction再試行なし。毎回Functionsへ到達しており、画面の以前の結果だけを表示した測定ではない。

3回目の画面15ページを順に操作し、全300行の検証キー一意性・物件名・本支店コード・予定保証番号・住所・申込日・引渡日・資材名表示を照合。予定番号302〜601が順番どおりで、行欠落・重複なし。検査`node tmp/preview-300-verify.mjs`はexit 0。ログ読取り`node tmp/preview-300-log-check.mjs`はexit 0。機械照合結果はignored `tmp/preview-300-verified.json`、画面証拠は`tmp/preview-300-success.png`。本登録せずダイアログを閉じた。

参考としてボタンクリック前から処理中表示消失までの操作ツール観測は2回目1,429ms、3回目1,227ms。ツール通信を含む概測で、Functions時間と区別する。1回目は計測を複数の操作呼出しに分けたため、画面全体の時間として採用しない。今回の完了範囲はプレビュー性能・全行表示の検証。本登録の改修後性能、実初期規模・同時負荷、月別一覧の残る実画面条件は別の未完了範囲。

変更は検証記録と参照元文書のみ。仕様・データ契約・ADR・runtime・権限・配備は変更不要。documentation-onlyの必須gateは`./scripts/check-governance.ps1`、runtime各gateは今回の変更範囲外。


### 月切替・請求CSVの実画面検証完了（2026-10-09 08:50〜08:54 JST）

Devの既存Chrome管理者で保険・請求の各6か月を順番に入力し、抽出／検索ボタンを押して確認。作業開始HEAD `e3b3903b727cbe1d819b5b55539995e246447748`、runtime変更なし。Functionsの`propertyPrototype/list`成功ログと照合した。下記は追加絞込みなしの物件文書数であり、認証・復旧等の付帯読取りと請求件数は含めない。

| 対象年月 | 保険：画面／DB読取り | 請求：画面／DB読取り |
| --- | ---: | ---: |
| 2026-08 | 1／1 | 0／0 |
| 2026-09 | 1／1 | 0／0 |
| 2026-10 | 305／305 | 305／305 |
| 2026-11 | 304／304 | 0／0 |
| 2031-10 | 305／305 | 0／0 |
| 2036-10 | 305／305 | 1／1 |

全12条件で一致、物件queryCallsは各1回。全307物件の取得はない。0件の場合もクエリと付帯読取りは実行しているため、Firestoreへのアクセス／請求が0という意味ではない。保険の過月未処理表示を確認。請求2036-10は延長分「業務検証・既存保証継続」だけで、保証開始2036-10-08〜満了2046-10-07。月切替・検索後は選択0件となりCSV出力不可、0件月は空一覧を表示した。

請求CSVを実画面から3種類出力：2026-10全選択305行、2036-10延長1行、2026-10の305件から個別選択した1行。10月の全305行は画面16ページを読み取り、並び順・物件名・工務店／本支店・保証番号・申込／引渡日・保証開始／満了日・請求基準日・請求状態を照合。11列の欠落なし。既存テスト300物件の番号・本支店・未請求状態も一致。延長CSVは画面の1件と全11項目一致。個別選択CSVは全305件CSV内の該当1行と完全一致し、選択外の行は含まれない。

実行証拠：`node tmp/monthly-ui-csv-check.mjs <出力ファイル> billing 2026-10 305`／同2036-10・1件、`node tmp/month-switch-log-check.mjs`、`node tmp/month-switch-verify.mjs <個別選択CSV>`は各exit 0。最初の照合scriptは操作ツール時刻とCloud時刻を同一基準として狭い範囲で対応付け、境界ずれでexit 1。アプリ不具合ではなく検査側の対応付けを修正し、取得済み全14ログ（タブ初回2＋明示検索12）の順序・件数・結果を照合して成功。自由文・認証情報を含むログは保存しない。集計はignored `tmp/month-switch-verified.json`、画面証拠は`tmp/monthly-extension-billing.png`。

CSV待機APIは使わず、画面出力後の実保存ファイルを検査した。請求済み／報告済みの変更・本登録・業務データ更新は行わず、終了時は10月請求一覧・選択解除状態。今回依頼された月切替と請求CSV確認は完了。実初期規模・同時負荷などHSC-023全体の未決は解決扱いにしない。

変更は本記録と参照する運用／台帳の文書5件のみ。業務仕様・データ契約・ADR・runtime・IAM・配備変更なし。documentation-onlyの必須`./scripts/check-governance.ps1`を実行し、runtime検証は変更範囲外。

### Devの2担当者による同時操作検証（2026-10-09 09:25〜09:39 JST、完了）

オーナーが文書整合整理とDev同時操作検証を指示し、2人目の既存アカウントでログイン済みと連絡。Chromeの別タブで「デモ管理者」と「開発者スーパーユーザー」を確認して実施した。管理者権限の異なる2アカウントによる業務操作の競合検証であり、一般担当者の権限差を検証したものではない。アカウント作成・資格情報取得・権限変更なし。開始HEADは`e811163c57b4480a12229be3d06f5bf37e38fdd0`、Dev runtimeは上記既配備版のまま。

登録・保存はすべて実画面のファイル選択、プレビュー、確認チェック、本登録／変更保存ボタンから実行。同じ保証グループ「容量検証4709」・工務店25の架空CSV（各2行）を使用した。

| 検証 | 実画面の結果 | Functionsログの結果 |
| --- | --- | --- |
| 別CSVの採番競合 | 双方302・303をプレビュー。システム管理者側だけ登録成功。デモ管理者側は409・再プレビュー要求。再検証で304・305となり2件とも成功 | 09:26:39成功743ms／09:26:40拒否1,964ms。処理重複約564ms。拒否側は業務transactionを2回試行し、最初の書込み予定8操作を破棄、確定0。再登録09:27:43は464ms |
| 同じCSVの二重登録防止・再検証 | 双方308・309をプレビュー。システム管理者側2件成功。デモ管理者側は400・全件棄却、2行とも検証キー登録済みと表示 | 09:39:04成功563ms／拒否462ms。処理重複約355ms。成功側の業務書込み8、拒否側0 |
| 同一物件の保存競合 | 番号304を双方で開き異なる備考を保存。システム管理者側成功、デモ管理者側409「他の操作で更新されました」。開き直すと成功側の備考を表示。履歴の保存・訂正は1件 | 09:32:57成功477ms／拒否301ms。処理重複約223ms。成功側の業務書込み2、拒否側0。物件revisionは1→2のみ |

同じCSVの初回試験（306・307、09:29:53〜54）は一方成功・他方全件拒否を確認したが、Functions処理の間に約213msの空きがあった。同時実行の証拠に採用せず、架空2件を追加して再検証したため、当初予定6件から実際の新規物件は8件になった。上表の重複時間は、終了時に出力するログ時刻と丸めた`durationMs`から求めた概測。Functions処理全体の重なりであり、各DB読取りが同一瞬間だったことや、高負荷性能を示すものではない。採番試験についてはtransactionの競合再試行も実測した。

09:39:45 JSTの読取専用DB照合で315物件＝既存307＋新規8を確認。8件の番号は`QC484709-26-302`〜`309`、全DBの採番済み番号に重複なし。各外部キー予約・取込元データが対応する物件1件を指し、成功取込記録4件×2物件の集合が新規8件と完全一致。登録履歴の利用者は異なる2人、番号304だけ保存履歴1件・revision2、他はrevision1。採番カウンター309で欠番なし。既存307件の業務値は移行前baselineのSHA-256と一致し、元の300件を含め未変更。テスト物件8件は結果確認用に保持し、両画面は通常一覧へ戻した。

検証コマンド（いずれもexit 0）：`node tmp/concurrent-log-check.mjs`（09:25:00〜09:39:42 JST、server_observed 36記録、全ページ取得）、`node tmp/concurrent-log-verify.mjs`（7登録要求・2保存要求の成否／確定書込み／重複時間照合）、`node tmp/concurrent-db-check.mjs`（読取専用の上記整合確認）。業務書込み数には復旧制御の受付／解放記録を含めず、Firestore請求件数とも区別する。想定どおりの拒否を新規不具合として登録しない。

ignored証拠は`tmp/concurrent-log-verified.json`／`concurrent-db-verified.json`、画面は`tmp/concurrent-numbering-rejected.png`／`concurrent-duplicate-r2-rejected.png`／`concurrent-save-rejected.png`／`concurrent-save-history.png`。プレビュー待機・ダイアログ切替直後の要素待機・「閉じる」の複数一致で操作ツール側の失敗があり、現画面を再確認して操作を継続した。登録要求の不明な再送やアプリの認証喪失は発生していない。

今回の完了範囲は2担当者・各2行CSVの採番／重複／保存競合。実初期データ規模、3人以上・長時間・300件の同時本登録などの負荷検証は未実施としてHSC-023に維持する。仕様・データ契約・ADR・runtime・IAM・配備変更なし。変更は本記録と運用／改修台帳／ロードマップ／HSC-023のみで、文書のみの必須gateは`./scripts/check-governance.ps1`。runtime各gateは変更範囲外。


## 0.1.131 Local検証（2026-10-09）

独立レビューBILL-CERT-131でP2（部分成功した請求行を未請求CSVへ再出力できる）とP1（新検索項目のない旧像の復旧拒否）を検出。成功行の除外・請求状態更新、機能別readyの独立検証で修正し再レビュー指摘なし。全7gate選択、省略なし。

| コマンド | 最終結果 | exit |
| --- | --- | --- |
| `npm test` | 357成功・2skip・失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 145成功・264038ms、emulator終了確認 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `./scripts/check-governance.ps1` | 成功 | 0 |

初回npm testは新Functions共通ファイルの生成前でmodule不足（exit1）。`npm run prepare:functions`成功後に再実行した結果が上記。最初のRules144成功後に復旧回帰試験を追加したため、145件の最終suiteで再検証。型／buildも部分成功表示修正後の結果を採用。

改修対象：3画面コンポーネント、billing-output・warranty-certificate・monthly-query・recovery、property-warranty・firestore-metrics、索引、請求検索移行CLI／helper、seed、recovery-controller、domain／emulator試験。仕様0.1.131・検索／保存契約・環境仕様・HSC-037・日程／ロードマップ・運用／索引／changelogを更新。新しい耐久的アーキテクチャ判断はなくADR追加なし。Rules・IAM・governance設定は変更しない。

Dev事前確認はnormal世代10、315件、Hosting `sites/termite-warranty-dev/versions/3fe35a7a90ec2bbe`。補完前業務値のハッシュをLocalのignored一時記録へ保存した。その後のDev配備と実画面確認は以下の実績を参照する。


## 0.1.131 Dev配備・実画面検証（2026-10-09）

runtime `6decdc52e45fc128403443ea3c89d3dfdf9bb1d1`、Dev `termite-warranty-dev`／`(default)`、normal世代10。

| 実行 | 結果／exit |
| --- | --- |
| `npm run build:recovery-release -- --revision 6decdc52e45fc128403443ea3c89d3dfdf9bb1d1` | 成功／0 |
| `npx firebase deploy --only firestore:indexes --project termite-warranty-dev --non-interactive` | 成功／0、新3索引をRESTでREADY確認 |
| `npx firebase deploy --only functions --project termite-warranty-dev --non-interactive` | 全21成功／0 |
| `node tmp/billing-dev-check.mjs drain`（読取専用補助） | ACTIVE21・操作0・ロックなし・normal10／0 |
| `node scripts/billing-query-migration.mjs --project termite-warranty-dev` | scanned315・changed315、書込なし／0 |
| 同CLI `--apply --writers-drained --generation 10 --revision 6decdc52e45fc128403443ea3c89d3dfdf9bb1d1` | 315件補完・再検査後ready1／0 |
| `node tmp/billing-dev-check.mjs verify` | 315件保持・業務値ハッシュ不変・3グループ×3年月で請求／保証書双方一致／0 |
| `npx firebase deploy --only hosting --project termite-warranty-dev --non-interactive` | 成功／0、`sites/termite-warranty-dev/versions/099829773fdbd08d` |
| `node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 6decdc52e45fc128403443ea3c89d3dfdf9bb1d1 --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/3fe35a7a90ec2bbe --dev-inspect` | 最終10項目pass／0、Functions21・Hosting991ファイル・索引15・除外30 |
| `node tmp/billing-dev-check.mjs postcheck` | UI操作後315件保持、期間別状態一致、グループ有効8／無効4／0 |

索引状態の最初の確認はAPIのpageSize指定が拒否（exit1）。指定を除いてCREATINGを確認し、READYまで待った。配備直後の最初のpreflightはHosting identity-mismatchでblocked（コマンドexit0でも成功扱いにせず）、新版画面配信確認後の最終照合で全pass。内部原因は断定しない。

補完直後の通常保証グループ：2026-09は請求2文書／2期間、2026-10は3文書／4期間、2036-10は4文書／5期間。他グループを読まず、DBの対象集合と全件から独立計算した期待集合が一致。計測は課金件数ではない。

### Chrome実画面での確認

既存ログインのデモ管理者を使用。Authアカウント作成なし。架空データだけを操作した。

1. 請求画面の検索欄が保証グループ・年月だけになり、グループ未選択では取得しないことを確認。有効候補8件を表示（DBには無効4件も存在するが選択候補に出ない）。
2. 通常保証グループの2026-09は過去未請求2期間、2026-10は当月を含む4期間。初回・延長の2期間（QA85F17F-16-001）をCSV出力し、実ファイルのBOM・11列・2行・両期間の日付・未請求表記を検査。CSV出力だけでは状態不変。
3. 同じ2期間を請求済みにし、4→2期間へ減少。未選択の別物件2期間を保持。
4. 物件／保証編集画面で初回だけを理由付きで請求取消。初回未請求・延長請求済みを確認。再度請求一覧を開くと3期間となり、初回が戻り延長は含まれない。
5. 同編集画面で初回保証書の発行取消を実施。理由空欄での拒否を確認後、理由を入力して実行。初回未発行・延長発行済みとなり、保証書一覧の過去未発行に初回が戻る。
6. 保証書CSVは通常保証グループ1行・6列で、末尾住所が編集画面の架空住所と一致。取込み保証へ切替えると選択解除・再検索前出力不可。そのグループの2件だけをCSV出力し、うち住所未登録1件が空欄であることを実ファイルで確認。どちらも出力後未発行を維持。
7. QA85F17F-21-001の既存「保険の報告済みを取り消す」を実行。後半2026-10-08〜2031-10-07が未報告、前半2021-10-08〜2026-10-07は報告済みのまま。現在の保険期間は前半へ戻り、次回対象は2026年10月分。
8. 390px幅で入力・ボタンの折返しを目視し、documentのclientWidth／scrollWidthはいずれも375（スクロールバーを除く）。通常幅へ戻した。ブラウザは通常保証・2026-10の未請求3期間を開いている。

最後の保存状態：315物件維持。上記満了案内の初回は未請求／未発行、延長は請求済み／発行済み（revision12）。保険更新の架空物件は後半報告を取消。補完直後の業務値不変確認と、その後の承認済み2物件へのテスト操作を区別する。

Local画像は`tmp/billing-certificate-period-state.png`、`tmp/billing-final-list.png`、`tmp/billing-narrow.png`。実CSVはDownloadsの`請求_業務検証・通常保証_2026-10.csv`、`保証書_業務検証・通常保証_2026-10.csv`、`保証書_業務検証・取込み保証_2026-10.csv`。

通信切断と複数物件の途中失敗を意図的に発生させる実ブラウザ試験は未実施。再送／同時更新／不正期間の原子性はLocal試験、成功行除外は独立レビューで確認。実HS過去データの投入・2日間のHS試験はデータ未受領のため未実施。Prod構築・IAM変更・Git pushなし。旧日程PDFは履歴と明記し、現行日程は既存READMEに集約した。


### Functionsログ受信

`node tmp/billing-dev-check.mjs logs 2026-10-09T02:21:18Z`は最終exit0、11件受信・ページ残りなし・すべてsuccess。billingList5件（160〜274ms）、billPeriods1件（554ms）、undoBill1件（287ms）、undoCertificate1件（478ms）、certificateList2件（178／210ms）、undoReport1件（325ms）。一括請求の2期間は物件read1／writeConfirmed1。ほかに認可・receipt・復旧制御等のアクセスがあり、課金件数や画面所要時間との一致は求めない。

最初のログ読取はLogging APIのRead requests/minute上限で429（exit1）。間隔を空けた再取得で成功を確認。アプリの業務処理失敗とは区別し、初回の失敗を隠さない。


### 今回の変更ファイル

runtime／仕様コミット6decdc5の変更対象。以後の実績追記もこの文書群だけに限定する。

```text
CHANGELOG.md
app/components/MeetingPrototype.vue
app/components/WarrantyCertificateManagement.vue
app/components/WarrantyLifecycleDetails.vue
deliverables/production-schedule-2026-10-05/README.md
docs/README.md
docs/design/README.md
docs/design/meeting-prototype-2026-10-03.md
docs/design/monthly-queries.md
docs/design/warranty-certificates.md
docs/operations.md
docs/requirements/delivery-and-technology.md
docs/requirements/environment-configuration.md
docs/requirements/house-solution-confirmations.md
docs/requirements/house-solution-confirmations/HSC-037-warranty-groups.md
docs/requirements/search-and-list.md
docs/roadmaps/2026-initial-delivery.md
docs/specification.md
firestore.indexes.json
functions/firestore-metrics.js
functions/property-warranty.js
scripts/billing-query-migration.mjs
scripts/lib/billing-query-migration.mjs
scripts/lib/recovery-controller.mjs
scripts/seed-emulator.mjs
src/domain/billing-output.d.mts
src/domain/billing-output.mjs
src/domain/monthly-query.mjs
src/domain/recovery.mjs
src/domain/warranty-certificate.mjs
test/emulator/property-warranty.test.mjs
test/property-warranty.test.mjs
```

最終追記は文書のみでruntime gateの無効化条件に該当しないため、上記runtime結果を再利用。governance-checkとdiff-checkで文書整合を確認する。
