# HSC-010: Warranty Payer and Contracting Party

## 2026-10-05 確定：延長分の請求対象年月

オーナー回答①により、延長後の保証開始月を採用する。延長操作月基準を置換する確定仕様。2026-10-09時点でDev反映済み、実画面6か月・Functions取得数・延長1件を含む請求CSVの照合まで完了。[実測](../../design/monthly-queries.md)。未請求のみを既定にするか、過去の未請求分の抽出、請求先単位・合算は未回答。請求先単位の絞込みは後発要改修事項。以下の日付付き記録は判断経緯であり、Dev未反映・延長操作月という旧状態を現在の残作業に使わない。

## 2026-10-04 部分確定：請求状態管理を追加

決定者：プロジェクトオーナー。根拠：本Codex会話、状態遷移レビュー4を管理対象とする指示、および請求済みの延長は取消不可とする指示。新規加入／各延長の取引単位に対象期間・未請求／請求済み・請求済み取消を持つ。請求済み取消を延長取消の前提とし、外部での請求書訂正と内部状態の整合はHSが管理する。請求状態そのものを対象外とした過去決定はこの範囲で置換。金額計算・請求書出力・入金管理の除外は維持する。

反映：仕様書の「状態遷移レビュー後の採用事項」、case-warranties、設計レビュー、技術改修台帳。後続の実装・Dev反映指示による[0.1.101の検証記録](../../design/evidence/lifecycle-101-2026-10-04.md)を参照。旧データに状態がない場合は要確認とし、HSが請求済みまたは未請求と確認するまで推測しない。対象年月・請求先単位・合算は確認待ち。下記の未請求管理の要否は回答済みとし、抽出月・未請求のみを既定にするか等を勝手に確定しない。

## 2026-10-04 UX-R04：延長請求の対象年月・未請求管理も再確認

決定者：HS。状態：確認待ち、未採用。現行は延長操作月による抽出。ユーザーは「延長手続き済み・未請求・延長による保証開始月が指定年月」を意図している可能性を指摘した。確認事項：①延長分は操作月と延長区間開始月のどちらか。②未請求だけに絞るか、その場合いつ誰が請求済みにし、誤操作を戻すか。③先行登録した延長や過去の未請求分をどの月で扱うか。回答で抽出・状態管理・取消との関係が変わる。先行の請求先単位の質問も維持。今回UI改修では抽出規則・保存状態を変えない。根拠：同日オーナーUX-R04。関連：仕様0.1.98、search-and-list、Dev受入手順。

## 2026-10-04 再確認：請求先単位の絞り込み（後発）

ユーザーのU04指摘：年月と請求先単位で絞り込み、一括CSV出力する運用を想定。HS確認待ちとして再開し、後発要改修事項とする。確認内容は「請求先は保証グループ・工務店・支店のどの単位か。グループ等による例外や、本店への支店分合算があるか」。単位の回答によって検索条件・出力のまとめ方が変わる。今回は単位を推測して実装しない。金額計算・請求書出力・入金管理を初期対象外とした決定は維持する。

## 2026-10-03 Resolution — 初期納品では金額・請求・入金管理を行わない

オーナーが質問①にYES。10月末の初期納品は新規加入／保証延長の対象物件を年月指定で一覧・CSV出力し、HSが既存Excelで請求書を作成する。金額計算・請求書出力・入金管理を含めない。基本契約に対する月次精算の保険料管理も対象外。単価・税・締日等の計算仕様は初期納品の確認待ちから外し、将来追加時に再検討する。

決定者：プロジェクトオーナー。決定日・根拠：2026-10-03本Codex会話①YESと保険料管理不要の指示。反映：仕様書0.1.70、delivery-and-technology、insurance-reporting、未決事項台帳。未コミット。文書のみで、CSVの最終項目・抽出条件は該当する帳票／検索事項で継続する。

- Status: Partially answered; billing scope/calculation open
- Decision owner: House Solution

## 2026-10-01 回答照合（仕様採用前）

出典：[資料台帳](../source-materials.md)。フォームは全1件、送信日時の表示2026/10/01 12:13（時間帯表示なし）を直接確認。電話はユーザー転記。過去の未送付・回答待ちの記述は当時の状態であり、この節が現在の確認状態を示す。

フォーム質問2は帳票見本について「準備いたします。」との回答。請求書の実物受領は未確認。金額計算・税・端数・締日・入金管理の残件は解決していない。電話の『保証は販売、保険は仕入れ』は業務上の位置づけであり、会計・仕入管理機能の追加承認ではない。

## Confirmed Context

2026-10-01試作方針㉕A：請求書作成は土曜日の試作対象外。金額計算方法・帳票見本を確認後に実装する。請求書が本番でも不要という決定ではない。

A case currently references a homeowner. Whether the warranty-service payer or contracting party can differ from that homeowner has not been decided.

## Resolution

- Decision: The system does not manage monetary transfers, billing, payment status, payer identity, or a separate contracting party. A homeowner is not inferred to be the contracting party. Adding a separate contracting party or financial-management function requires a future scope change.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md` and the initial data-model boundary.

## Affected Documents

Business terms, case requirements, data contract, billing integration, migration, and UI.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 12 — 請求書に必要な計算と発行済みの記録

これまでは請求・入金管理を対象外としていましたが、今回は請求書作成と締め日等が示されています。データ出力までか、金額計算までかで必要な作業が変わります。

1. 請求金額はシステムで計算しますか、入力しますか、現在のExcelで計算しますか。計算する場合は、単価・面積・税・端数・値引き等のルールをご提供ください。
2. 月末締め・翌月末起算・翌々月末期日は全社共通ですか。例として9月申込分の締日・請求日・支払期限を教えてください。
3. 『保証書』『請求書』のチェックは出力対象の選択ですか、発行済みの記録ですか。入金済みの記録、取消・再発行も必要ですか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q2の備考では請求書の最終出力形式はExcel。金額計算、税・端数、締日、入金管理の要否は回答されていない。Excelという形式だけで請求管理全体の承認とは扱わない。

### 残る確認（文面はユーザー確認前）

今使う請求書の完成例と金額の作り方を受領し、システムでどこまで作り、どこから担当者が作業するかを確認する。


## 2026-10-01 追加資料後のオーナー判断

請求書サンプルを受領したが、単価仕様・税区分は未確定。請求書出力は試作では実装せず後発とすることをオーナーが採用。新規加入/更新物件の年月範囲一覧を手動作成の参考にする。税区分は土曜日確認事項。サンプルの単価や非課税表記を全社共通ルールとしない。

根拠：本Codexタスクの同日ユーザー指示。試作の確定範囲は[試作仕様](../../design/meeting-prototype-2026-10-03.md)と仕様書0.1.30に反映。土曜日への提案は未確定のまま保持。外部未送付。
