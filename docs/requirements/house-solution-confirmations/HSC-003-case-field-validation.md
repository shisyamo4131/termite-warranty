# HSC-003: Case Field Validation

## 2026-10-04 確定変更：同名・同住所判定の廃止

オーナーが本Codex会話で明示指示。HSからの要望ではなく同一物件の定義が未確定のため、同名・同住所候補の照合・注意確認は廃止。保証番号の一意性・二重操作防止・日付注意は維持する。仕様書0.1.93と登録処理・受入手順へ反映。ローカル実装、未配備。以下の2026-10-03重複候補注意の決定を置き換える。

## 2026-10-03 Resolution — 重複候補は確認後登録可能

新規登録時、同じ住所・物件名の既存物件が見つかった場合は候補を示し注意を促す。HSが確認すれば登録でき、一律禁止しない。同じ住所に別建物がある等の理由で誤って登録を妨げない。保証番号の一意性や同一保存の二重処理防止は別で、今回の確認によって緩めない。取消済みと一致する再登録等の照合範囲・文字正規化は、承認済み運用を妨げないよう開発側が設計・検証する。

日付の意味・不足日付補完・日付前後の注意、断熱材と使用資材、郵便番号任意、引渡日必須等の既決事項と合わせて初期入力の業務判断を解決とする。日付訂正後の保険状態はHSC-036、初期資料の補完・照合はHSC-015に集約。過去の複数保証・HS支店等の廃止済みモデルの質問は再送しない。最終入力項目表・エラー文言・UI/server整合は後続設計・検証であり完了主張ではない。

決定者：プロジェクトオーナー。日付・根拠：2026-10-03本Codex会話①YESと同日既決回答。仕様書0.1.83、case-warrantiesへ反映、未コミット・未実装。

## 2026-10-03 確定：申込日の意味・不足日付・注意後の登録

申込日は工務店から届く申込書に記載された日で、HSの受領日・入力日とは区別する。過去データが申込月のみの場合、開発側で1日等を補わずHSが日付を指定してから初期登録する。引渡日が空欄の過去データはすべてHSが埋めて提供する。

申込日が引渡日より後、または申込日が未来の場合は注意を表示して確認を求め、HSが確認すれば登録を許可する。存在しない日付や必須項目不足を許可する決定ではない。本登録前のみ申込日訂正可・本登録後固定という既決ルールは維持。

根拠：2026-10-03本Codex会話①②③YESと引渡日補完の補足。仕様書0.1.77。コード・配備・原資料の値は変更しない。旧記述の申込日の意味・日付前後関係未確定はこの範囲で解消する。

## 2026-10-03 追加確定（未実装）

物件／保証情報に「基礎断熱材の有無」と自由入力の「使用資材」を追加する。有の場合は使用資材を必須入力とする。無の場合は使用資材を必須としない。有から無へ変更した際の入力値保持／消去・初期データの未確認値の扱いは設計／確認対象。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.54へ反映。コード・データ契約・配備は未変更。

- Status: Partially answered; date/correction details open
- Decision owner: House Solution

## Confirmed Context

2026-10-01試作方針⑭A：引渡日訂正時に開始日・満了日の変更後をプレビューし、延長分を含め再計算して同時更新。訂正前の記録と保証番号は保持する。オーナーは日付変更による不当な保証期間延長の懸念を明示。土曜日確認事項は「本登録後に引渡日を変更できる人・条件、保証期間への反映、発行済み保証書／保険報告との整合」。試作での採用を本番承認とは扱わない。制限やHS承認を独断で試作へ追加しない。

2026-10-01試作方針⑩・⑫：本登録日を申込日として自動設定し、工務店は変更できない。下書き保存日は使わない。土曜日には「施主が申し込んだ日／工務店が本登録した日」のどちらが業務上の申込日か確認する。本登録後も工務店は自社の操作可能範囲内で住所・施主名・引渡日等を修正できる。番号・グループは通常編集不可、延長は専用操作。引渡日訂正時の期間再計算は未決。HS本番確認・実装は未完了。

2026-10-01試作方針：質疑第2回④Aをオーナー採用。引渡日未定でも下書き保存可能。必要事項が揃った本登録時に保証番号を発行し、下書き保存では採番しない。下書き時の最低項目、申込日の初期値・変更可否は今回未決定。HSの本番確認・実装は未完了。

Case registration requires application date, handover date, property, homeowner, construction company, responsible branch, and at least one applied warranty. No ordering rule between application and handover dates is currently specified.

Confirmed concurrency behavior remains outside field-validation policy: master updates, inactivation, and reactivation use last-write-wins; case and applied-warranty multi-record workflows protect against a stale baseline; and the construction-company portal uses revision and state-transition checks. No concurrency change is proposed here.

## Project Recommendation for Discussion — Not House Solution-Confirmed

Recommend two validation tiers. Both the UI and server should validate, with the server authoritative. Validation errors should identify the affected field and be written in Japanese.

### Hard save blockers

Saving should be blocked for:

- A missing application date, handover date, property, homeowner, construction company, responsible branch, or at least one valid applied warranty.
- An invalid calendar date or an expiry date before its warranty start date.
- Selecting a nonexistent master or warranty service, or newly selecting an inactive master or service.
- Setting a case or applied warranty to `cancelled` or `invalid` without a reason.

An existing case may retain an inactive referenced master, but an inactive reference cannot be newly selected.

### Warnings or confirmation, but allow save

The following should warn or request confirmation while still allowing save:

- Application date after handover date.
- A future application date.
- Warranty start date before handover date.
- A manually corrected expiry date that differs from the calculated result; preserve the confirmed behavior that no reason is required for this correction.
- A possible duplicate with the same property, warranty service, and start date.
- A case homeowner or construction company that differs from the property's defaults; preserve the confirmed ability to override those defaults.

Exceptional, late, and future business cases are why date relationships are recommended as warnings until House Solution confirms stricter blockers. UI presentation and exact Japanese message wording remain to be designed and confirmed, but messages should remain field-specific and Japanese.

## Questions

1. Does House Solution accept or revise the recommended hard save blockers, including required fields, calendar and expiry checks, active/nonexistent reference checks, and required cancellation/invalidation reasons?
2. Does House Solution accept or revise the recommended warning/confirmation cases, including date relationships, manual expiry correction, possible duplicates, and property-default overrides?
3. Which exact Japanese field-specific messages and UI confirmation patterns should be used, and does House Solution accept server-authoritative validation with the UI as an immediate feedback layer?

## Affected Documents

Workflow, case requirements, validation logic, UI, and tests.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 13 — 不足項目と日付変更の扱い

グループ③には『申込月』『上棟日』がありますが、引渡日・住所・建面積の列がありません。上棟日と引渡日が同じとは推定できません。

1. 不足する引渡日・住所・建面積は別資料から補えますか。補えない場合、未確認として登録できますか。それとも登録前に必ず確認しますか。
2. 申込日が月までしか分からない場合はどう記録しますか。上棟日は引渡日とは別項目として残しますか。
3. 引渡日の訂正時、保証開始日・満了日・保険予定・発行済み書類も変更しますか。保証開始日だけを別日に直す例外はありますか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

物件対保証1対1、恒久的な保証番号、期間履歴の保存が2026-09-29に採用された。第2回回答では欠損項目、日付訂正、発行済み書類の訂正方法への回答はない。

### 残る確認（文面はユーザー確認前）

申込月しか分からない記録や上棟日しかない記録の補い方、引渡日を訂正したときに過去の保証期間・書類をどう扱うかを具体例で確認する。


## 2026-10-01 追加資料後のオーナー判断

全グループ共通で引渡日は本登録時も任意とする（UH限定案を同日の追加指示で撤回）。未設定表示・絞込を設け、期間・満了アラートは日付入力後に計算する。グループ追加で分岐を増やさない。後日入力と訂正は期間確認・履歴の対象。日付未設定の延長・保証書出力は停止。確定済み日付を空欄へ戻す要否と引渡日訂正の業務権限は残る確認。

根拠：本Codexタスクの同日ユーザー指示。試作の確定範囲は[試作仕様](../../design/meeting-prototype-2026-10-03.md)と仕様書0.1.30に反映。土曜日への提案は未確定のまま保持。外部未送付。


## 2026-10-01 デモ確認後

申込日は画面で当日を初期値とし、本登録前は入力・訂正可能、本登録後は変更不可。2026-10-01にオーナーが明示採用。試作契約・仕様書0.1.31へ反映、未配備。施主申込日か工務店受付日かという業務上の定義自体はHS確認待ち。

根拠：本Codexタスクのオーナー指示・確認回答。確定部分のみ試作仕様へ昇格、未決・提案はこの事項で保持。
