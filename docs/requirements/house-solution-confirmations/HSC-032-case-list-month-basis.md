# HSC-032: Case-list Year/Month Basis

## 2026-10-03 整理：年月の業務定義は解決済み

通常の物件検索は任意条件で、年月を必須・既定にしない。条件なし最新20件と検索結果のページ表示を維持する。保険の新規増分は引渡年月、更新は保険満了年月。請求用の新規加入は申込年月、保証延長は延長手続き年月。出力の目的ごとに基準日を分ける。

決定者：プロジェクトオーナー。決定日：2026-10-03（通常検索は2026-09-14の承認も継承）。根拠：本Codex会話の各年月へのYES、仕様書0.1.74までの回答。2026-10-03全体整理により回答済みの残件表記を訂正。新しい仕様採用ではない。反映先：仕様書0.1.90、search-and-list、insurance-reporting。未コミット。保険の初期例外はHSC-036、取得方式はHSC-023で継続し、本事項の業務定義とは分ける。

## 2026-10-03 請求用年月の確定

新規加入分は申込日の年月、保証延長分は延長手続きをした年月で請求用一覧を抽出する。保険報告用の引渡年月・保険満了年月とは分ける。根拠：同日オーナー①YES、仕様書0.1.74。コード未変更。汎用一覧の条件なし最新20件・任意検索を変更しない。

- Status: Resolved for business date axes; implementation pending
- Decision owner: House Solution

## Confirmed Context

An unfiltered list subscribes to at most the 20 documents with the freshest server-maintained update timestamp. Mandatory year/month filtering was considered as a possible list behavior.

## Resolution

- Decision: Reject mandatory or default year/month filtering. Blank conditions show the freshest 20 cases. Any optional condition searches the complete collection and presents all matches in 20-record pages.
- Decision: Application date and handover date use optional inclusive start/end ranges under HSC-007. No dedicated mandatory month selector is added.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md`, search/list requirements, project list-query boundary, decisions 0017/0026/0027, and tests.

## Affected Documents

Case search/list requirements, dashboard behavior, Firestore query/read-model design, indexes, UI controls, and performance tests.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q8は対象月・工務店名・申込日・引渡日を選択。「対象月」がどの日付の月かは不明。必須の年月絞り込みを復活させる回答ではなく、施主名・保証書番号の未選択を削除指示とも扱わない。

### 残る確認（文面はユーザー確認前）

例えば「10月分」を探す際、10月に申し込んだ物件、引き渡した物件、保険会社へ報告する物件のどれを探したいか、実際の一覧で確認する。
