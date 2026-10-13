# Search and List

2026-10-13現在：本件はDev反映・開発側受入れ済み。以降の未反映・禁止は当時の状態。実データの延長履歴は0件で申込日補完は不要。HS業務受入れは別途。[導入結果・確認範囲](../operations.md)。

## 2026-10-13 対象全体の取得維持・その他旧取得の終了

月別一覧・満了案内は条件に合う対象全体の取得を維持し、段階取得は運用開始後のRead／Write実績を基に再検討する。現時点の改修残件としない。旧案件／マスタ一覧のcomplete=trueは読取り開始前に拒否し、部分結果を全結果として返さない。既存の最新20件・対象ID参照経路は維持する。現行画面の表示・全選択・CSVは変更しない。[確定範囲](../specification.md)。

## 2026-10-13 旧一覧条件の整理（確定）

物件取得前に[受理条件表](../design/legacy-property-list-retirement.md)を検査する。物件一覧と旧listの条件なしは最新20件、保証番号は前後空白を除いた完全一致。旧自由検索・日付範囲・状態・所属指定・未知キー（空値も含む）・条件混在・不正型は拒否し、全件取得や空成功に置き換えない。保証は未案内、保険は現行満了案内条件だけを受理する。報告月と任意の処理済み指定／保証番号、旧請求月と任意の保証番号は既存の月別対象取得を維持する。Dev反映禁止。

## 2026-10-12 延長請求の基準日（確定・改修中）

延長分は当該延長の申込日を請求対象基準日とする。前月基準・未請求繰越・処理済み表示・CSV11列は維持し、初回申込日や保証書／保険の対象月は変更しない。旧延長記録は実申込日確認と移行を必要とし、提供完了ではない。[確定仕様](../specification.md#2026-10-12-保証延長申込日請求基準確定改修中)、[工程](../roadmaps/expiry-notice-read-reduction.md#保証延長改修の工程)。以下の開始月基準は変更前の記録。

## 2026-10-12 月別3一覧の抽出変更

[仕様書の前月基準](../specification.md#2026-10-12-月別3一覧の前月基準処理済み表示)を優先する。指定月の前月を基準に、通常は基準月以前の未処理分、「済みを含める」では基準月だけの未処理・処理済みを抽出する。チェック時はそれ以前の未処理も含めない。2026年11月指定なら通常は10月＋9月以前の未処理、チェック時は10月だけ。保険・保証書の新規は引渡日、請求の新規は申込日。更新・延長は既存の業務基準日を維持。再出力は最新情報を使う。以下の当月・過去未処理の記述は変更前の記録。[実装・検証・配備状況](../operations.md#2026-10-12-月別3一覧の実装dev導入)を参照。

## 2026-10-12 保証書CSVの正式21列と請求先表示

全保証グループ共通の21列を採用。[正式列の順序・値](../design/company-settings-and-document-csv.md#5-保証書csvの共通21列)を正本とする。既存6列を維持し、保証グループ・外部キー・発行対象・保証開始日・保証満了日・保証年数を追加。引渡日・保証開始日・保証満了日は日付全体に加えて年/月/日も出力し、西暦4桁・月日は先頭ゼロなし。任意値がなくても列を省略しない。「保証書記載会社名」・自社情報・請求先は保証書CSVへ追加しない。

開始日は元の保証開始日、満了日・年数は選択した初回/延長に対応。延長済みの初回分再出力も初回10年の内容。現在のグループ/年月条件、過去未発行、選択期間ごとの行と発行済み別操作は維持する。下記の「正式列未確定」や6列は旧状態で、今回の共通21列を優先する。

請求一覧は保証グループと対象月による当月以前の未請求抽出を維持し、選択グループの請求先名または「未設定」を表示する。請求CSVの11列と請求済み別操作は変更しない。請求先未設定で現行のCSV出力を止めない。同日の開始指示で実装。[検証・Dev反映](../operations.md#2026-10-12-会社設定請求先保証書csvの実装とdev反映)を参照。

## 2026-10-09 請求・保証書のグループ別処理と取消

同日のオーナー指示により、請求用一覧は有効な保証グループと対象年月だけを指定し、初回の申込月／延長の保証開始月が指定月以前（当月を含む）の未請求期間を抽出する。選択した期間を別操作で請求済みにする。CSV出力だけでは状態を変えない。請求状態は既存の初回・各延長別billingItemsを使用する。記録不明は未請求と推測せず、編集画面で確認する。

保証書一覧にも有効な保証グループ選択を追加し、既存の当月分＋過去未発行分という条件を維持する。仮CSVは既存5列の末尾へ「住所」を追加した6列。住所と建物名を出力し、任意住所が未登録の場合は空欄とする。物件／保証編集画面で発行済みを期間別に取り消せる。理由を必須とし履歴を残す。既存の請求済み取消、直近から順に行う保険報告取消を維持する。実際の対外訂正はHSの業務。

保証書の「状態表示のみ・取消なし」という旧仕様を上記で置換する。保存済み業務記録は保持し、検索用の派生値を補完する。6decdc5でDev配備・実画面確認済み。[検証記録](../design/monthly-queries.md#0131-dev配備実画面検証2026-10-09)。

## 2026-10-09 保証書CSV・保証期間別の発行管理

オーナー承認（タスク `01a119fb-27b1-7942-9097-6e7d0d51829a`）により、上部「保証書CSV」タブから対象年月を指定し、選択した保証期間をCSV出力する。初回は引渡月、延長は延長後の保証開始月を用い、指定月より前の未発行分も含める。指定月の発行済み分は再出力できる。取消中の物件、取り消した延長は対象外。

発行状態は初回10年・各延長10年ごとに独立して保持する。延長時に初回の発行済みを戻さない。CSV出力では状態を変更せず、担当者が実際に発行した期間を確認して別操作で発行済みにする。物件／保証編集画面では期間ごとの表示と発行済み取消に対応する。HS担当者が利用し、工務店ポータルには追加しない。

仮のCSVは「保証書No」「物件名」「引渡日」「担当工務店」「担当本支店」に「住所」を加えた6列（工務店・本支店を分離）。正式項目の確定、保証書生成・印刷は後発。過去の「初期に発行状態を持たない」「正式列が決まるまで実装しない」は本決定で置換する。日付・期間の正式な追加列は今回含めない。[保存・導入・検証契約](../design/warranty-certificates.md)。

## 2026-10-08 オーナー決定による現在の状態

初期はCSV出力までを対応範囲とし、保証書出力・印刷品質対応は後発。保証番号完全一致、通常最新20件、業務別抽出は維持。Autocompleteは共有Storeの全候補を標準filterで絞る採用済み方式であり、N-Gramへの作り直しを本番条件にしない。

## 2026-10-06 物件／保証一覧は保証番号の完全一致のみ

オーナー指示により、物件／保証一覧の検索は保証番号全体の完全一致だけとする。前後空白は除去するが、接頭辞・年度・通番の補完、部分一致、N-Gram検索は行わない。名前・住所・工務店・支店・グループ・年度・状態・日付等の検索欄と詳細条件ボタンを撤去する。検索条件なしは更新日時・文書ID降順のDB limit(20)、保証番号指定時はDB whereによる一致取得とする。認証と会社／支店の閲覧範囲は維持する。最新20件に含まれない未採番の下書きを探す方法を含め、その他の検索軸は業務内容に合わせて検討し、別途承認する。

保険報告・請求・満了案内の業務別抽出はこの変更の対象外。2026-10-05の自由検索・折りたたみ式検索と、物件一覧への条件指定時全件取得の例外を置き換える。保証書CSVの正式項目は後続の2026-10-12決定により共通21列で確定済み（本書冒頭参照）。


## 2026-10-05 検索ボタンの中央揃え

物件・保証一覧の検索・詳細条件ボタンは、既定密度の入力欄本体と同じ56pxの領域内で上下中央に揃える。入力欄のメッセージ領域は確保し、エラー文の有無・折返しでボタンを上下に移動させない。狭幅ではボタン群をまとめて次の行へ折り返す。検索処理・詳細条件の開閉は変更しない。

## 2026-10-05 入力欄のメッセージ領域

Vuetifyの入力コンポーネントでは `hide-details="auto"` を使用しない。説明・エラーがない場合もメッセージ領域を確保し、その有無だけで後続の行が上下に移動することを避ける。常時非表示の選択チェックは維持する。今回の変更はメッセージ領域の出現・消失をなくすもので、長文の折り返しまで高さを固定するものではない。

## 2026-10-05 折りたたみ式検索の採用

物件・保証一覧は常設の物件名／施主名／住所検索と詳細条件の折りたたみを採用。既定は閉じ、詳細条件は既存項目を保持。検索成功後に閉じ、入力エラー時は開く。適用済み条件を削除可能なChipで表示し、削除時に再検索する。条件なしの最新20件とページネーション、他一覧の条件は維持。モバイル全面対応ではなく幅に応じた折り返しを行う。

## 2026-10-05 年月・物件一覧の表示

年月ピッカーは月選択だけで確定し、年の切替・キーボード年月入力も可能とする。物件／保証一覧の日時は申込日、引渡日の順。保証期間の下に保存済みの保険期間を表示し、insuranceReportedがfalseの場合は「未報告」とする。詳細は物件名のリンクから既存ダイアログを開く。新しい保存項目や期間判定は追加しない。0.1.104の延長請求月変更はDev反映済みで、以下の未反映記載は当時の記録。

## 2026-10-05 0.1.104ローカル実装

延長分は保証開始月へ変更。新規は申込月。請求CSVの第2列は「手続き日」から「請求対象基準日」へ変更し、延長の操作日と混同させない。未請求限定は追加しない。既存番号・取引ID・履歴は不変。検証中、Dev未反映。

## 2026-10-05 延長請求対象月の確定

延長分は延長後の保証開始月で抽出する（オーナー回答①）。操作月基準を置換する要件で、コード・Devは未反映。新規の申込月は維持。未請求だけの既定抽出・過去未請求の扱い・請求先単位は未確定。現行仕様書0.1.104とHSC-010を参照。

## 2026-10-04 UX-R03/04

報告・請求一覧の詳細は物件情報・期間を閲覧専用カード表示し、閉じるのみ。一括選択は表示ページだけでなく検索結果全体、ページ移動で維持、再検索で解除。既定の最新20件制限は変更しない。請求の操作月基準はHS意図との不一致の可能性がありHSC-010で再確認。未請求管理と延長開始月基準は未採用・未実装。

## 2026-10-04 一括選択と請求一覧の説明

保険報告・請求一覧は検索結果全体の選択／解除、選択件数を表示。保険期間の個別確認が必要な行は除外。対象年月等を変更したら再検索するまで選択・出力不可。新規は申込年月、延長は実際の手続き年月という既存基準を画面で説明する。請求先単位の絞り込みはHSC-010で後発確認。

## 2026-10-04 工務店Autocomplete

検索欄と選択欄を統合。AirGuardV3の取引先・現場の操作を参考に2文字以上、300ms待機、IME変換中は検索しない。選択後は解除して変更。未入力は最新20件、検索時は既存の工務店名検索を使用。遅れて届く旧検索結果を採用しない。ローカル実装・未配備。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 保証延長後のCSV日付（仕様書0.1.89）

保証書用CSVは元の保証開始日と延長後の保証満了日を出力する。保証番号は維持し、延長操作日を開始日へ置き換えない。根拠：同日YES、HSC-037。Word項目照合・実装検証は未実施。

## 2026-10-03 保証書用CSV（仕様書0.1.88）

検索一覧でチェックした物件のみを保証書用CSVへ出力し、HSがWordで差し込み印刷する。再出力は可能。初期には印刷済み状態・印刷履歴を管理せず、要望があれば後発対応。根拠：同日①YES・②、HSC-037。実装未変更。

## 2026-10-03 保証番号の完全一致検索（仕様書0.1.87）

保証番号全体（例：HSC-26-001）を入力して完全一致検索する。通番だけから接頭辞や年度を推測して補完しない。過去のTW形式・6桁補完提案は採用しない。根拠：同日YES、HSC-004。実装・試験は後続。

## 2026-10-03 マスタの有効状態（仕様書0.1.85）

保証グループ・工務店・支店の管理一覧は有効のみを既定とし、明示的な「無効を含む」で無効データも検索対象にする。既定all案を置き換える。「無効のみ」の独立指定は今回採用していない。最新20件・ページ操作方針と登録候補の有効限定は維持。根拠：同日①、HSC-008。取得方式の整合・検証は後続で、実装未変更。

## 2026-10-03 請求用一覧の年月（仕様書0.1.74）

新規加入分は申込日の年月、保証延長分は延長手続きの年月で抽出する。保険会社向けの引渡年月・保険満了年月と分ける。根拠：同日オーナー①YES、HSC-032。汎用一覧の任意条件・最新20件方針は維持。実装未変更。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

## Status

The 2026-10-01 owner decision removes HS responsible-branch filters and columns from the target (HSC-033). Prototype removal is pending.

These are provisional initial-release requirements. They do not prescribe screen layout, implementation, query design, or performance targets.

## Required Filters

The search/list view must filter registered cases by:

- Case number (exact match only)
- Homeowner (master-record selection)
- Property (master-record selection)
- Construction company (master-record selection)
- Property address: prefecture and municipality
- Warranty-service name (master-record selection)
- Warranty-service type (`保証` or `保険`)
- Expiry date
- Notification status
- Application date (optional inclusive start and end)
- Handover date (optional inclusive start and end)

The case list shows a `not notified` marker when at least one applied warranty on the case has notification status `not notified`; it does not show a case-level notification-status value.

Either boundary of an application-date or handover-date range may be omitted. Both ranges and all other conditions are combined with AND. A start date later than its corresponding end date blocks application of the draft filter.

For an expiry-date filter, return a case when at least one of its applied warranties meets the date condition.

For a notification-status filter, return a case when at least one of its applied warranties matches the selected status.

When warranty-service, warranty-service type, expiry-date, or notification-status conditions are combined, the same applied warranty must satisfy all of those conditions.

## Alert Emphasis

Cases that are within the alert period must be visually marked or emphasized in the case list. The exact visual treatment and eligibility rules are defined in [alerts and dashboard](alerts-and-dashboard.md).

## Required Case-List Columns

- Case number
- Homeowner name
- Property address
- Construction-company name

The list has one row per case. It does not need to display warranty-period or expiry-date information. Details of the case's applied warranties are viewed on the case detail screen.

## Default Ordering

- Sort by case update date in descending order.
- When update dates are equal, sort by case registration date in descending order.

## Default Bounded Result

- When no search or filter value is specified, every business-record list subscribes to at most the 20 documents with the freshest server-maintained update timestamp.
- Use document ID as the stable tie-breaker when freshness timestamps are equal.
- Do not load an entire collection or create one child listener per listed parent as the fallback for an unfiltered list.
- When at least one condition is specified, the current prototype reads the complete corresponding collection in freshness order and evaluates every matching record. The UI shows the total count and presents the matches in pages of 20 records. Changing the applied conditions returns to page one. Clearing all conditions returns the list to the freshest-20 subscription.
- The case-list conditions are edited in a dialog and take effect only when applied. The dialog can initialize all draft conditions without immediately changing the active list.
- This complete filtered read is an approved prototype tradeoff. Production pagination and a scalable filtered query/index model remain to be confirmed from measured volume, response time, and cost. The list has no mandatory or default year/month condition. Export, saved searches, selectable columns, and alternate sorting are outside the initial scope.

## Unresolved-Matter Routing

HSC-007 and HSC-032 are resolved. Production scale and query design remain routed through [HSC-026 scale/performance targets](house-solution-confirmations/HSC-026-scale-performance-targets.md) in the central register.


## 2026-10-01 デモ確認後（ローカル・未配備）

保険報告用一覧の期間指定は引渡日の両端を含む。登録日・申込日・延長操作日を基準にしない。引渡日未設定と下書きは対象外、取消は通常除外。保証グループを無効化しても履歴検索の候補から消さない。 詳細は[試作契約](../design/meeting-prototype-2026-10-03.md)を参照。


## 2026-10-03 確定：後発のページ操作常時表示（未実装）

各種業務一覧にページ操作を適用し、検索条件なし・1ページでも操作欄を表示する。条件なしの取得は最新20件に限定したまま。ページ「1」を表示し、前へ／次へは無効。21件目以降を無条件で追加取得する機能は導入しない。条件指定時は一致結果を20件ずつ表示し、複数ページなら移動できる。

設計根拠はオーナーの経験に基づく3つの利用行動であり、利用者調査の結果と断定しない。(1)鮮度が高いと分かるものは初期一覧で探し、なければ検索する。(2)鮮度が不明なら対象以外をできるだけ除外できる条件で検索する。(3)対象が曖昧なら記憶している条件から絞り込む。したがって初期一覧は最近の対象への入口、過去・不明な対象は検索を入口にする。検索条件を2つ以上必須にする決定ではない。

取得済み件数を全体件数と混同させない。既存の検索変更／クリア時の先頭復帰とCSV出力対象は維持する。候補選択の20件制限による欠落は別途改修対象であり、ページ操作表示だけで解決したとは扱わない。0件の具体的表示や個別画面の配置はHSC-008の設計案を基に実装時に整理する。

本日はコード・配備変更なし。保存データと検索の取得ルールは不変で移行不要。既存の画面へ表示だけ戻せる変更を想定。将来実装では0/1/20/21/40/41件、条件変更、前後ボタン、未検索時の追加取得なし、権限範囲、CSV対象を確認する。
