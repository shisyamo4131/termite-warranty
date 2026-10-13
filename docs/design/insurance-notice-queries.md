# 保険満了案内の検索・限定補完

2026-10-13現在：承認済みの全件読取り削減と保証延長申込日改修はDev反映・開発側受入れ済み。保険検索用2項目を442物件へ整備し、それ以外の業務値・番号は不変。以下の本件に関するDev禁止・指示待ち・未反映は各工程実施時点の記録であり、現在の状態はこの記載を優先する。HSの業務受入れとは区別する。月別対象全体取得の現状維持と工務店アカウント一覧の後発対応は変更なし。[検証・導入記録](../operations.md)。

2026-10-12、オーナーが試行前の読取り削減を優先してLocal実装・検証を承認。Dev配備・実データ補完は別途明示指示待ち。[ロードマップ](../roadmaps/expiry-notice-read-reduction.md)と[実行記録](../operations.md)で実施状態を管理する。

## 対象・互換性

改修前の保険満了案内は全物件取得後に業務判定していた。HSの `list`、filterが `{alertKind:'insurance'}` のみの要求で、下記専用日付から候補を取得する。画面、業務判定、返却形、全ページ、期限超過の表示を維持する。追加条件付き旧APIは従来取得、工務店からの保険満了案内は既存どおり拒否。既存insuranceStatesの準備条件は維持する。

| 保存項目 | 契約 |
| --- | --- |
| insuranceNoticeQueryVersion | 数値1 |
| insuranceNoticeQueryExpiry | ISO日付または対象なしの空文字 |
| prototypeSettings/insuranceNoticeQueries | version 0=補完中／無効、1=照合済み。generation、operationId、owner、updatedAt。公開後はverifiedDocumentsも保持 |

共通関数 `src/domain/insurance-notice-query.mjs` は一覧と同じwithInsuranceDefaultsを適用する。本登録以外は空文字。保険状態v1はinsuranceNoticeExpiryを共用し、有効報告実績がある次の未報告期間の開始前日を保存する。報告不要を飛ばし、初回未報告・次対象なしは空文字。旧形式は正規化後のinsuranceExpiryDateを使用する。未知版・不正な日付を無対象へ変換せず拒否する。補完時に保険状態をv1へ変換しない。

取得は日付が空文字より大きく、設定月数と日本日付から求めた逆算上限以下。単一項目の標準昇順索引を使い、新しい複合索引は不要。実Devの索引利用・取得数・課金は配備承認後の確認事項。期限超過を除く下限やlimit20は付けない。既存の業務判定を再適用し、updatedAt欠落を除外、秒・ナノ秒・文書IDのUTF-8降順、明示null末尾へ並べる。

2026-10-13の採用変更：専用準備印なし／0／不正なら取得失敗とし、従来の全件取得へ戻さない。候補取得前後のinsuranceStates・専用準備印の確認は移行中の利用制限として維持し、変更時は停止する。案内月数と日本日付は開始時の値を使い、設定変更・日跨ぎでは再確認も再取得もしない。個々の検索日付が欠落した物件は抽出されなくてよく、一覧取得では救済しない。検索失敗を空一覧へ変換しない。準備印のgenerationは補完時の来歴であり、復旧後の現在世代との恒久一致は要求しない。復旧時に専用投影を再照合する。

## 全更新経路

- `functions/property-warranty.js`：登録・編集・案内・延長／取消・保険報告／取消・不要／取消・物件取消／復元等の共通保存末尾で計算し、同一取引で保存。
- `functions/property-bulk-import.js` と `scripts/lib/historical-intake-plan.mjs`：登録文書へ生成し容量検査。過去取込みexecutionは検証された新planのみで専用準備印も生成。
- `scripts/lib/dashboard-migration.mjs`：保険状態変換後に再計算。ただしこの変換単独では専用準備印を公開しない。
- `scripts/seed-emulator.mjs`：保険状態変換後、専用補完・照合・公開。
- `src/domain/insurance-capacity.mjs`：報告不要取消の全組合せで専用項目も再計算して予約容量を検査。
- 住所・名称だけの部分更新は計算不要。全像復元は保存済み専用項目を保持し、専用準備印1のときだけ復旧整合検査を追加する。

既存monthlyProjectionMatches・insuranceProjectionMatchesの必須項目を増やさない。これにより専用準備印がない旧像を拒否しない。新しい準備印1なのに投影不一致なら復旧公開を拒否する。Functions domainは既存の生成同期に含める。

## 補完・公開・差戻し

CLIは `node scripts/insurance-notice-migration.mjs`。既存dashboard移行と同じartifact／inspect／status／apply／stopの操作形式。inspectは件数だけを返し、文書本文を出力しない。applyには明示target、別制御DB、現在世代、operation、対象ソースのartifact-hash、apply、writers-drainedを要求する。今回の実行承認は隔離した架空Localまで。実際のDev引数・値は実施ターンに正本と実環境から照合する。

1. 新writerを全経路へ適用し、旧writerと未対応管理scriptの停止を確認する。既存Functionsの進行中操作も収束させる。
2. 制御DBのrecovery/operatorLockとrecoveryOperationsのleaseを取得する。復旧のnormal状態・業務DB側の世代一致を確認する。
3. 専用準備印0と所有者を業務DBへ確定する。2026-10-13変更後のHS保険満了案内は準備完了まで取得を停止する。通常の一覧要求で補完を実行しない。
4. 文書ID順に100件ずつ走査。各文書を取引内で再読取りし、専用2項目だけを更新する。削除済みは復活させない。容量は現在文書と将来の報告不要取消に必要な予約分を確認する。revision・updatedAt・履歴・採番・保険状態・請求値は変更しない。
5. 全件を再走査し、不一致・計算不能が0であることを確認する。各行の更新と公開取引で、復旧状態・世代・専用準備印0・operation・所有者を確認する。走査後の新規／更新も新writerが原子的に正しい投影を保存することが前提。
6. 専用準備印1を公開し、制御記録を完了にして自分のlock／leaseだけを解放する。

公開前の中断時は準備印0と所有者記録を残す。公開後にjournal記録・lock解放が失敗した場合は準備印1もあり得るため、実際のready・journal・lockを読取り確認し、CLI失敗だけで未公開と推定しない。再開は前workerが終了したことを確認し、正確な旧ownerを指定する。stopも終了確認とowner一致を要求し、準備印は開かない。世代が変わった処理を同じ操作として継続しない。

差戻しは、移行workerを終了確認・停止したうえで専用準備印0を先行確定し、新しい案内取得が停止することを確認する。旧writerへ戻す場合は対応する読取版も確認し、旧版では全件取得が再発することを明記する。追加2項目は保持。再導入時は再補完・照合する。旧新一覧の比較は更新停止した架空fixtureで同一業務値を比較する。Devでは同時点比較または差分revision照合を別途計画する。

## 検証・今回の非対象

変更分類はapplication-logic、data-contract-schema-migration、documentation-only。復旧・移行処理を含むため既存運用方針に従い包括7ゲートを選定する。試験結果はコマンド完了・exit確認後に運用記録へ記載する。対象一致／順序／20件超／旧形式／欠落／0件、状態変更、月末・閏年・1〜12か月、再実行／中断／所有者・世代変更／同時更新・削除・新規／旧像復旧／容量境界を検証する。

保証延長申込日・受付期限・入金判断・請求基準は今回変更しない。[優先対応](../roadmaps/expiry-notice-read-reduction.md#仕様確定後の優先対応保証延長の申込日請求基準)として仕様確定後に別途対応する。今回の補完を将来の申込日マイグレーションの完了と扱わない。画面仕様・権限・通知・業務期間の変更がないため、その仕様本文と利用者説明は変更しない。検索補助の追加は既存の投影設計の拡張で、別ADRは作らない。governance・IAM・Rules・依存版は変更しない。
