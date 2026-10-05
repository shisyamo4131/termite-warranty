# HSC-034: Deterioration Countermeasure Grade and Warranty Limit

## 2026-10-03 確定：登録後の保証上限変更

HSは登録後も最長保証期間を20年／30年で変更できる。ただし既に30年まで延長済みの場合は20年へ変更できない。上限の変更だけでは実際の保証期間・満了日を延長せず、10年延長は別操作とする。根拠：2026-10-03本Codex会話のYES。仕様書0.1.55へ反映。既存試作方針を初期運用要件として確認したもので、今回コード・配備・実行検証は行っていない。

## 2026-10-03 追加確定（未実装）

登録時に最長20年／30年を選択し、システムは適用条件を自動判定しない。基礎断熱材や使用資材の値から自動的に上限を選択・変更しない。業務上の30年適用条件そのものを回答したわけではない。初回は選択した上限によらず10年。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.54へ反映。コード・データ契約・配備は未変更。

## 2026-10-03 確定：初回保証10年・10年単位の延長

物件／保証登録時の初回保証期間は一律10年。最短10年で、延長は10年単位、通算最長は20年または30年。5年保証の採用検討は今回の対象から外す。保険の5年単位とは区別する。30年を選べる要件・判定方法は本回答では確定していない。試作の10年単位という方針を本番要件として確定したもので、今回コードの改修・配備・実行検証は行っていない。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.53、case-warranties、HSC-034へ反映。

- Status: Partially answered; conditional 30-year eligibility open
- Decision owner: House Solution

## 2026-10-01 回答照合（仕様採用前）

出典：[資料台帳](../source-materials.md)。フォームは全1件、送信日時の表示2026/10/01 12:13（時間帯表示なし）を直接確認。電話はユーザー転記。過去の未送付・回答待ちの記述は当時の状態であり、この節が現在の確認状態を示す。

電話報告：保証は10年単位、通常は通算最長20年、要件を満たせば30年まで延長可能。30年の要件は確認中。『システム的に自動判断を行うことはないと思う』はユーザーの見込みとして扱う。等級2／3との対応は未確認のまま。人が延長可否を決める方式と、システムの期間上限チェックを行うかは別の判断。今回のフォーム5項目には本件の回答はない。

## Confirmed Context

2026-10-01試作方針㉗A：本登録後も工務店（操作可能範囲内）・HSが最長20年／30年を変更可能。ただし既に30年分まで延長済みなら20年への変更は不可。設定変更だけでは実際の保証期間を延長しない。土曜日に30年要件を確認し、この操作条件と自動判定の要否を再検討する。実装・本番確認は未完了。

2026-10-01試作方針⑧：最長保証期間は無条件の選択式、既定値20年。条件による制限や自動判定は現段階では実装せず、HSによる上限の事前承認も追加しない。工務店が延長するため将来は自動判定が必要になるというユーザーの見込みを記録。土曜日確認事項：最長期間を決める要件、必要な入力項目、自動判定／人の判断の分担。20年／30年の選択と延長操作の時期無制限を混同しない。

2026-10-01試作方針：質疑第2回⑤Aをオーナー採用。初回保証は引渡日から一律10年間を自動設定する。30年までの延長要件や等級との関係を確定する回答ではない。HSの本番確認・実装は未完了。

House Solution may need to record a property's `劣化対策等級`. A working explanation associates grade 3 with a 30-year warranty limit and grade 2 with a 20-year warranty limit, but this service-specific relationship has not been confirmed. The prototype must not implement or require the grade until the questions below are answered.

The Japanese Housing Performance Indication System describes the grade as a level of measures applied to the building's structural frame. Official guidance describes grade 3 as roughly three generations (75–90 years), grade 2 as roughly two generations (50–60 years), and grade 1 as the Building Standards Act level. Those periods are not themselves the proposed 30-year and 20-year warranty limits. Official retrofit guidance also recognizes work that improves an existing home's deterioration-countermeasure performance, so the grade cannot yet be assumed to remain unchanged throughout the building's life.

## Questions

1. Are the proposed grade-3/30-year and grade-2/20-year values House Solution's own cumulative warranty limits, and from which date is the limit measured?
2. How are grade 1, grade 0 for an existing home, and an unconfirmed grade handled: rejection, individual review, or another limit?
3. Which document or assessment establishes the grade, and which assessment date must be retained?
4. Can a later retrofit or reassessment change the grade used by this service? If so, does the new grade affect only a later renewal or also an already accepted warranty?
5. Must the system answer how many renewals remain, or only the latest permitted warranty expiry date? How are warranty products with different periods handled near the limit?
6. Should grade history be recorded against the property, the case, or a dated assessment record, and what decision-time value must be retained with each applied warranty?

## Recommended Proposal — Awaiting House Solution Decision

- Treat the grade as a dated assessment of the physical property. Retain assessment history against the property, including at least the grade, assessment date, and evidence or source document.
- When an applied warranty is accepted, retain a decision-time snapshot of the grade, assessment date, warranty-limit rule, and calculated latest permitted expiry used for that acceptance. A later property reassessment must not rewrite the basis of an earlier acceptance.
- Calculate renewal availability from the latest permitted expiry and the requested warranty period instead of storing a fixed `remaining renewal count`. For example, ten years remaining could permit either one 10-year renewal or two 5-year renewals, subject to the product and business rules confirmed by House Solution.
- If a retrofit or reassessment changes the grade, append a new property assessment rather than replacing the prior assessment. Whether the new assessment applies from the next renewal or can affect an existing warranty remains a House Solution decision.
- Do not use a case-level grade history as the sole record. One case can contain multiple applied warranties accepted at different times, so it cannot by itself preserve which assessment and limit justified each acceptance.
- Recommended future model: property-owned dated assessment history plus an applied-warranty decision snapshot. This is a proposal for discussion, not an approved requirement, and remains excluded from the prototype.

## Sources

- Ministry of Land, Infrastructure, Transport and Tourism, `日本住宅性能表示基準及び評価方法基準の概要`: https://www.mlit.go.jp/jutakukentiku/house/content/001857615.pdf
- Long-term Quality Housing Renovation Promotion Project, `長期優良住宅（増改築）認定制度について`: https://r07.choki-reform.mlit.go.jp/overview/criterion.html

## Affected Documents

Master/property data model, case and applied-warranty data contract, renewal eligibility and validation, construction-company submission fields, search/display requirements, migration, and tests.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 11 — 等級や断熱材で保証条件が変わるか

等級、基礎断熱、メーカー名等の項目と、『10年間』『10年更新20年間』『10年更新30年間』という候補があります。候補の存在だけでは、選択条件は確定できません。

1. 『2等級なら最長20年、3等級なら最長30年』は正式なルールですか。単なる記録項目で、期間は別に選ぶ運用ですか。
2. 等級不明・その他の等級・断熱なしの場合の扱いと、メーカー／商品名を必須にする条件を教えてください。グループごとに違いますか。
3. 後日の改修で等級や断熱材が変わった場合、以前の内容を残しますか。変更により保証期間や更新可否が変わりますか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.
