# HSC-004: Production Case-Number Rules

## 2026-10-03 解決：番号全体による完全一致検索

保証番号は番号全体を入力して完全一致で検索する。例はHSC-26-001。通番だけから接頭辞・年度を推測して補完しない。過去のTW形式・6桁への補完提案は不採用。採番は既決のグループ／年度別001起点、最低3桁、年度2桁、申込日基準、年度切替リセット、取込後最大値の次、欠番非補充。延長でも番号維持、取消・削除後も再利用しない。本登録後の申込日固定と、所属誤りは取消・新番号で再登録という既決ルールを維持する。

決定者：プロジェクトオーナー。決定日：2026-10-03。根拠：本Codex会話の保証番号完全一致検索へのYESと既決事項。反映先：仕様書0.1.87、search-and-list。未コミット。初期の番号に関する業務仕様を解決とし、初期データ照合はHSC-015、技術的な一意性・同時採番・検索の実装検証は後続。実装完了ではない。

## 2026-10-03 最新訂正：001起点・年度切替リセット（未実装）

オーナーが初期値を001へ訂正。通し番号は1から開始し、3桁までは0埋め（001、002、…、999）、4桁以上も使用可能（1000以降）。年度切替でリセットする。先行する0始まりの指示と年度をまたぐ継続採番を置き換える。グループ別採番、申込日基準の年度、グループの年度開始月、年度2桁・接頭辞、既存番号保持・恒久番号の既決事項は維持する。

過去番号を維持し開発側で初期登録する。グループ・年度の登録済み最大値の次から採番し、途中の欠番は埋めない。登録済み番号のない組合せは001から開始。保証グループは必要分を先行登録する。既存番号の再採番や本番の取消番号再利用の承認ではない。重複防止・年度境界・同時採番の検証が必要。根拠：2026-10-03本Codex会話の訂正と基本YES。仕様書0.1.52へ反映。未実装・未配備。

- Status: Resolved for initial business rules; implementation and import verification pending
- Decision owner: House Solution

## 2026-10-01 部分確定 — 年度の基準日

試作質疑⑬A採用：HSC-26-001、SHS-26-001、UHは26-001という書式。年度は西暦下2桁、連番は最低3桁（999の次は1000）、年度リセットなし。グループごとに採番する。既存番号の引継ぎと開始位置は未確定で、全グループを無条件に001から本番開始する決定ではない。実装・HS本番確認は未完了。

試作質疑⑩・⑪の採用：申込日は工務店の本登録日を自動設定する仮仕様（下書き保存日は使わず、工務店は変更不可）。施主の申込日か工務店の本登録日かは土曜日確認事項。年度区分はHSC/UHが1月始まり、SHSが4月始まり、開始年表記（2027年3月申込みのSHSは2026年度）。通番は年度でリセットしない。完成書式と既存番号の扱いは残る。これは打ち合わせ用の試作採用で、HSによる本番の最終確認とは区別する。

同日後続決定：工務店に設定した保証グループと申込日を基準に新規保証番号を振る方針をオーナーが明示。ADR 0034と仕様書0.1.27へ反映。採番書式・桁数・年度区分・既発行番号の扱いは未確定。原本ExcelのUHは記号「なし」（グループマスター!E10）であり、全グループ名を接頭辞にするとは推定しない。

- 決定：保証番号に含める年度は申込日を基準とする。電話報告の引渡日よりフォーム回答を優先する。
- 決定者・根拠：プロジェクトオーナー、2026-10-01、本Codex会話で「フォームの回答を優先します。申込日としてください」と指示。
- 反映先：仕様書0.1.25、case-warranties。文書反映のみ・未コミット。実装と既存データの変換は未実施。
- 基準日の再質問は不要。年度区分を現行回答のグループ別に維持するか統一するか、完成書式、発行後の申込日訂正等は引き続き未確定。保証番号を更改で変更しない既決定は維持する。
- この決定は保証開始日・保険開始日・保険会社への報告対象月を変更しない。

## 2026-10-01 回答照合（下記の相違・質問案は上記決定前の記録）

出典：[資料台帳](../source-materials.md)。フォームは全1件、送信日時の表示2026/10/01 12:13（時間帯表示なし）を直接確認。電話はユーザー転記。過去の未送付・回答待ちの記述は当時の状態であり、この節が現在の確認状態を示す。

フォーム質問3：記号はグループ別、HSC/UHは1〜12月、SHSは4〜3月。「統一しても大丈夫」「申し込みのタイミングで決まります」、通し番号はグループごとで継続採番との回答。電話報告のグループ別通番・年度リセットなしとは一致するが、年度の基準日は電話の引渡日と相違する。統一可は統一する決定ではない。完成番号の見本・桁数・既発行番号の扱いも未回答。番号の年度と検索用の引渡年度を分ける必要がある可能性はあるが、別概念を意図した回答と断定しない。次の確認案：『保証番号に入れる年度は、申込日と引渡日のどちらで決めますか。例えば3月に申し込み、4月に引き渡した物件では、どちらの年度になりますか。』文面は未採用・未送付。

## Confirmed Context

New cases currently receive a fixed-width sequential number represented as `000001`. Legacy case numbers are not imported; the production format for newly registered cases remains open.

## Project Recommendation for Discussion — Not House Solution-Confirmed

### Production number format and lifecycle

- Recommend `TW-000001`: a fixed `TW-` prefix followed by a six-digit global sequence beginning at 1.
- Do not encode year, branch, warranty service, or status in the number. Do not reset the sequence.
- Maintain separate counters per environment. Once assigned, a number must never change or be reused. Cancelled, invalid, or later-deleted records retain their number reservation, and gaps are allowed.
- If a collision is detected, stop and investigate it rather than silently selecting another number. A mistaken case should be invalidated and recreated with a new number, not renumbered.
- Keep the legacy/FileMaker number namespace separate. The `TW-` prefix distinguishes new numbers; if a future legacy reference is needed, store it in a separate legacy-number field.
- Six digits supports about 69 years at the documented planning upper bound of 14,400 cases per year. New numbers can later be extended beyond six digits without changing existing identifiers.
- Replace `TW` only if House Solution supplies an official abbreviation.

### Exact-number search recommendation

The stored and displayed number should remain canonical, for example `TW-000123`. Exact-number search should also accept an omitted prefix using only the following normalization:

- `123`, `000123`, and `TW-000123` all normalize to `TW-000123`.
- Trim surrounding whitespace. Numeric-only input is treated as omitted-prefix input and is left-padded to six digits.
- Do not use partial matching. Do not add broader aliases, such as omitted-hyphen or full-width conversion, unless House Solution separately approves them.
- Invalid, too-long, or out-of-range input should receive a clear validation message and should not be sent as a query.

These are project recommendations for discussion only. They do not change the current prototype representation or establish a confirmed production identifier.

## Questions

1. Does House Solution accept or revise the `TW-000001` format, official prefix, global sequence, no-reset policy, separate environment counters, and six-digit extension approach?
2. Does House Solution accept or revise the lifecycle rules for reservations, gaps, collisions, mistaken cases, and the separate legacy/FileMaker namespace?
3. Does House Solution accept or revise the exact-search normalization and validation rules, including omitted-prefix numeric input, canonical display, no partial matching, and the explicitly excluded broader aliases?

## Affected Documents

Case requirements, data contract, registration service, and tests.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 9 — 保証書番号の付け方

資料には『記号・年度・通し番号』の組合せがあります。現在の案件番号はシステム内の連番で、保証書番号の正式ルールはまだ決まっていません。

1. 年度は申込日・引渡日・発行日のどれで決めますか。1月始まりですか、別の月ですか。通し番号は毎年1に戻しますか、翌年も続けますか。
2. 番号はグループ別・工務店別・全体共通のどれですか。欠番、訂正、再発行、保証更新時は同じ番号を使いますか。
3. 既存番号はそのまま残しますか。案件を識別する番号と保証書番号は別々に持ってよいですか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

LINE回答では番号維持・新規採番を開発側に委ねる。2026-09-29にプロジェクトオーナーが恒久番号を採用。更改で同じ番号を維持することは確定した。先のTW形式等は未承認の提案であり正式な保証番号ではない。

### 残る確認（番号書式の質問文は採用済み）

正式な保証番号の完成例、記号・年度・連番の意味と採番範囲、再発行・誤登録の扱いを確認する。案件番号との対応と既存番号の取扱いは未確定。更改時に番号を変えるかは再質問しない。保険番号は別途確認する。

### 採用済み質問3 — 保証番号の付け方

保証番号について、使用したい番号の見本を1つお教えください。
資料にある「記号・年度・通し番号」について、次の点も確認させてください。

- 記号は、保証書のグループごとに決まりますか。
- 年度は、申込・引渡し・保証書発行のどの時点で決まりますか。また、何月から新しい年度になりますか。
- 通し番号は、すべての保証で共通ですか、グループごとですか。また、年度が変わると1から振り直しますか。

まだ決まっていない部分は「未定」で構いません。その場合はこちらから案をご提示します。

文面承認：2026-09-29、プロジェクトオーナーが本Codex会話で「採用します」と指示。初めて番号を付ける際の質問文を承認したもので、書式・年度・採番範囲の回答ではない。外部未送付・HS回答待ち。再発行・誤登録等の残る事項を、この質問文の承認だけで解決済みとは扱わない。

Decision evidence: project-owner adoption on 2026-09-29, task `01a0e5c9-ec13-78e0-acd2-62e03f732c95`. Reflected in [case warranties](../case-warranties.md), the specification and [ADR 0033](../../decisions/0033-permanent-property-warranty.md). The remaining details keep this matter open. Changes are currently uncommitted; implementation is pending.


## 2026-10-01 追加資料後のオーナー判断

土曜日に打診する案：グループ・年度ごとに通番を初期化、3桁までゼロ詰め、4桁以上はそのまま。既存番号は保持。年度リセットはまだ採用しない。試作は継続採番を維持し、既存番号との重複を検出した場合に登録を拒否する。過去データ取込後のグループ・年度別最大値を開始値とする案は、移行範囲・不正番号・重複・欠番を確認して決定する。

根拠：本Codexタスクの同日ユーザー指示。試作の確定範囲は[試作仕様](../../design/meeting-prototype-2026-10-03.md)と仕様書0.1.30に反映。土曜日への提案は未確定のまま保持。外部未送付。


## 2026-10-01 デモ確認後

受領したHSC・SHS・UHの管理表画像を再確認。HSC-25-001、SHS-20-001、UHの18-001はいずれも年度2桁。4桁化はしない。本登録時に入力済み申込日で年度を決め、本登録後の申込日は固定、既存番号は再採番しない。オーナーの同日確認回答を仕様書0.1.31・試作契約へ反映。年度ごとの通番初期化は引き続き未採用。

根拠：本Codexタスクのオーナー指示・確認回答。確定部分のみ試作仕様へ昇格、未決・提案はこの事項で保持。
