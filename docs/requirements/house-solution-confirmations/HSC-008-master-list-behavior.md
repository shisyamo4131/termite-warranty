# HSC-008: Master-List Behavior

## 2026-10-03 解決：初期のマスタ画面範囲

初期の表示項目は試作画面を基本とし、確定した保証グループ・工務店・支店の階層と有効状態を整える。列の自由な並べ替え、表示項目の個人設定、一括編集などの追加機能は初期に追加しない。有効のみを既定とし、明示的に無効を含める直前の決定と、最新20件・ページ操作の既決方針を維持する。

決定者：プロジェクトオーナー。決定日：2026-10-03。根拠：本Codex会話の①YES。反映先：仕様書0.1.86、master-management。未コミット。初期の業務上の範囲を解決とし、取得方式・規模に応じた技術判断はHSC-023/022で継続する。実装・試験・配備の完了を意味しない。下記の過去の未承認案は採用範囲を拡張しない。

## 2026-10-03 確定：既定は有効のみ

保証グループ・工務店・支店の管理一覧は有効のみを既定とする。ユーザーが明示的に「無効を含む」を指定した場合だけ無効化データも対象とする。先行する既定all案は不採用。「無効のみ」の独立指定は今回採用していない。新規登録の選択候補は有効のみを維持する。最新20件・ページ操作の既決方針は変更せず、既定の状態条件と取得方式の整合は後続実装で検証する。

決定者：プロジェクトオーナー、2026-10-03、本Codex会話①。仕様書0.1.85、master-management、search-and-listへ反映。文書のみ・未コミット、実装未実施。表示列等の残件は継続する。

- Status: Resolved for initial business scope; implementation pending
- Decision owner: House Solution

## Confirmed Context

Construction-company, homeowner, property, and warranty-service masters have separate list and detail screens. Name search is available for selected masters. With no search/filter value, each list subscribes to at most the 20 freshest documents. A nonblank normalized name condition searches the complete master collection and displays every match in the approved prototype.

## Project Recommendation for Discussion — Not House Solution-Confirmed

- Choose a retrieval strategy per collection based on its measured possible document count and workflow. Do not mandate Firestore cursor pagination universally, and explicitly do not recommend server-side cursor pagination as the default.
- With no search, subscribe to the latest 20 documents in realtime. When search is present, subscribe to or load all matching master documents and paginate the in-memory result. This favors stable page navigation and automatic visibility of concurrent changes; the relatively low expected Firestore read cost is a project judgment, not a guaranteed price claim.
- If a master collection later becomes too large, add a mandatory or selective search axis based on that master (for example, require property area, prefecture, or municipality before property search) after measured thresholds. The threshold and axis remain HSC-026/HSC-023 decisions.
- Recommend common `all`/`active`/`inactive` filtering on management lists, defaulting to `all`; selectors remain active-only. Recommended columns are: construction company status, name, address, phone, and contact; homeowner status, name, address, and phone; property status, name, address, homeowner, company, and area; warranty service status, name, short name, type, and default period; and branch status and name if branch management remains.
- Exclude export, saved filters, per-user columns, bulk edit, arbitrary sorting, and automatic merge from initial release unless House Solution explicitly accepts them later.

These recommendations are provisional and do not change the confirmed prototype behavior until House Solution approves a production change.

## Questions

1. Does House Solution accept or revise the proposed filters, columns, common all/active/inactive behavior, and active-only selectors for each master list?
2. Does House Solution accept or revise collection-specific retrieval, latest-20 realtime behavior, in-memory pagination for matches, and the explicit rejection of server-side cursor pagination as the default?
3. What measured collection-size thresholds, selective search axes, and query/read-model fallback should apply under HSC-026 and HSC-023?
4. Does House Solution accept or revise the proposed exclusions for export, saved filters, per-user columns, bulk edit, arbitrary sorting, and automatic merge?

## Affected Documents

Master-management requirements, list UI, query design, and tests.

## Partial Resolution

- Decision: Blank conditions show the freshest 20 master records; a nonblank normalized name condition searches the complete collection and shows every match.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/master-management.md`, decision 0026, prototype data contract, operations, implementation, and tests.


## 2026-10-03 後発仕様案：ページ操作の常時表示

オーナー要望：「各種一覧にはページネーションを適用。検索条件が指定されていない場合の最新20件取得時もページネーションはそのまま表示」。本日は改修せず検討・記録のみ。現行仕様や取得上限を変更しない。

現行は無条件最新20件、条件指定時は権限範囲内の全件から一致分を表示し、試作の物件一覧は20件ずつ表示する。取得件数と画面のページ操作は別事項。

推奨案：物件／保証、満了案内、報告、工務店／支店／保証グループ、担当者等の独立した一覧に共通のページ操作を設ける。基本1ページ20件。0件・1ページでも操作欄を消さず、1ページなら「1」と無効な前後ボタン、0件なら「0件」と無効な前後ボタンを示す。条件変更・クリアで先頭に戻し、削除等でページがなくなれば有効なページへ戻す。読込失敗を0件と同一表示しない。選択欄には別途検索・追加取得等の到達手段を設ける。

無条件は最新20件の1ページとして「最新20件までを表示。過去分は検索」と示す案。取得20件を全体件数と表示しない。検索結果が21件以上なら次ページを使える。CSVは表示1ページへ縮小せず、出力対象の定義を維持する。

最重要の確認：無条件でも次へで21件目以降を取得したいのか、最新20件限定のまま操作欄を残したいのか。後者を文言の暫定解釈として提案するが未確定。前者なら現在の取得上限・問い合わせ方式・費用と、関連仕様／ADR／project-rulesの整合を改める必要がある。

画面表示のみの案なら保存データの移行は原則不要、旧表示へ戻せる。採用後に0/1/20/21/40/41件、検索変更、権限範囲、削除後ページ、候補21件目、CSV対象を検証する。旧画面・履歴・選択欄まで一律20件化する指示ではない。

根拠：2026-10-03本Codex会話。ページ操作はオーナー判断待ち、業務上の一覧要件はHS確認事項として維持。仕様・実装・配備は未変更。


## 2026-10-03 部分決定：最新20件限定を維持

- 決定者：プロジェクトオーナー。同日の追加回答で「最新20件に限定したまま」と明示。各種一覧でページ操作を残し、無条件では1ページ・前後無効とする後発仕様を確定した。上記の二択は解決済み。
- 根拠：本Codexタスクのユーザー回答。鮮度が高い対象は初期一覧、鮮度不明なら選択性の高い検索、対象が曖昧なら記憶にある条件で検索するという3行動を設計理由として提示。客観的な利用統計ではなくオーナーの経験に基づく。
- 反映：仕様書0.1.32、search-and-list、初期納品ロードマップ、CHANGELOG。未コミット。実装・配備は本日の指示により行わない。
- 残件：本事項に含まれるHSの業務列・フィルタ等は未確定のため、HSC-008全体を解決済みに移さない。検索条件数の強制や旧画面の一括改修は採用しない。
