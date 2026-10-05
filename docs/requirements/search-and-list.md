# Search and List

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
