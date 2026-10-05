# HSC-035: Case Cancellation and Invalidation Criteria

## 2026-10-05 再確認：全体取消は現行維持

オーナーは追加質問に「全体取消は現行どおりとし、外部訂正はHSが行う」と回答。物件・保証全体の取消前に保険報告済みを取り消すことは必須にしない。警告・確認のうえ全体取消し、履歴・番号・状態を保持する。延長取消に必要な依存保険報告の逆順取消とは区別する。保険会社への減少報告はHSが外部で実施する。外部訂正後に保存情報の補正が必要な個別ケースと旧データ対応は残件。現行実装を確認済みで、今回コード・配備変更なし。

## 2026-10-03 確定：取消中の操作・保険情報・誤登録

取消中の物件／保証は閲覧とHSによる理由付き復元のみ可能とし、内容編集・保証延長・保証書出力を禁止する。満了案内と通常の保険報告対象から除外し、取消済み記録は検索して確認できる。

取消・復元だけでは保険報告状態・保険満了日・保険必須更新年月を変更しない。復元時は保持した情報から報告対象を判定し、新しい保険期間を設定しない。保険会社との訂正で情報変更が必要となる場合の手順は別途整理する。物件／保証の取消と報告済み取消は別操作で、取消中に後者を操作できるという意味ではない。

誤登録・重複登録も理由付きの「取消」に統一し、「無効」を別機能にしない。データ・番号保持、番号非再利用、元の保証期間での復元、HSによる対外連絡という既決方針は維持する。

根拠：2026-10-03本Codex会話の①②③すべてYES。仕様書0.1.66、HSC-035。初期HS運用の確定で、既存旧データのinvalid状態の移行や対外訂正後の保険情報補正手順は未確定。今回文書のみ更新し、アプリ・データ契約・配備は変更しない。



## 2026-10-03 確定：物件／保証の取消と復元

- HSは理由を入力して物件／保証を取り消せる。データと保証番号を保持し、番号は再利用せず、取消済みとして確認できる。
- 誤取消はHSが理由を入力して復元できる。元の保証番号と保証期間を維持し、復元日から期間を数え直さない。
- 保証書発行済み・保険会社報告済みでもHSは取消可能。取消前の確認画面で、交付済み保証書の回収・無効の連絡や保険会社への訂正連絡の要否を確認するよう促す。対外対応はHSが行い、システムから自動連絡しない。保存済み・印刷済みの保証書がシステム取消によって消えるわけではない。

根拠：2026-10-03本Codex会話の①②③へのYES。仕様書0.1.65、HSC-035。初期のHS運用についての確定であり、ポータル再開時の工務店権限を承認するものではない。取消中の操作・一覧表示、保険状態や満了日の保持／復元、取消と誤登録無効化の区別は後続確認。理由を含む記録は必要だが、全操作履歴の形式・保持期間まで決めたものではない。今回文書のみ、アプリ・データ契約・配備は変更しない。



## 2026-10-02 追加確認：保証書交付後の取消

最優先の確認文案：保証書を施主様へ渡した後、工務店様だけで保証を取り消せてもよいでしょうか。それともHS様へ取消を依頼し、HS様が確認して取り消す形にしますか。既に渡した保証書の回収・無効のお知らせと、保険会社への訂正は誰が行いますか。

現在の見本PDFは端末へ保存されるため、システムで取消しても保存済み・印刷済みの紙は消えない。理由・操作履歴は追跡に役立つが、それだけで不正交付を防げるとは扱わない。正式発行後はHSのみ取消可能にする案、発行日時・発行時内容を残す案は未採用。[発行権限](HSC-024-role-business-data-access.md)と合わせて確認する。現行の理由付き取消・HS復元という試作動作を今回は変更しない。

根拠：2026-10-02本Codex会話でのユーザー指摘。HS回答待ち、外部未送付。下記の旧案件仕様は履歴であり、現行試作動作は最新の試作契約を参照する。

- Status: Partially resolved; reasoned HS cancellation/restoration and manual external follow-up confirmed; cancelled records read-only except restore; insurance fields retained; erroneous registrations use cancellation; insurer corrections and legacy-state migration remain open
- Decision owner: House Solution

## Confirmed Context

2026-10-01試作方針㉖A：HSのみ理由付きで取消を復元できる。元の保証番号・保証期間を維持し、工務店は復元不可。復元により新たな期間や番号を与えない。土曜日に機能の必要性を確認する。旧プロトタイプの復元不可からの変更は未実装・未配備。本番仕様としての承認ではない。

2026-10-01試作方針㉓A：月次報告一覧／CSVの取消済み物件は通常除外し、取消を含む選択時は状態付きで含める（HSC-036）。既に保険会社へ報告した物件の取消連絡方法は土曜日に確認する。

2026-10-01試作方針⑰A：工務店が自社の操作可能範囲内の本登録を理由付きで取り消せる。試作では記録・保証番号を残し、物理削除や番号再利用はしない。土曜日確認事項：保証番号保持と理由を含む履歴管理の必要性、取消後の保険会社への訂正報告等。HSの本番仕様確定とは扱わない。下書き削除・延長1回だけの取消・取消の復元まで一括承認されたとは解釈しない。

Case statuses are `active`, `cancelled`, and `invalid`. Active cases are editable. Cancelled and invalid cases are currently specified to share the following behavior: they are retained rather than physically deleted, are not editable, require a free-text reason, cannot be restored to active, and have no alert effects. The same status set and terminal behavior currently apply to applied warranties.

The business distinction between a cancelled case and an invalid case, including the events and criteria that lead to each status, is not confirmed.

Any currently reported UI presentation of these statuses is not, by itself, a confirmed business rule. If observed UI behavior differs from the confirmed specification, the specification remains authoritative until the discrepancy is reviewed.

The current prototype appears to expose a general case-status selector containing `active`, `cancelled`, and `invalid` in `app/components/CaseEditDialog.vue` (and a similar applied-warranty selector in `app/components/AppliedWarrantyDialog.vue`). That implementation behavior conflicts with the confirmed non-restoration and non-editability requirements for terminal records; it is recorded here as an unresolved implementation discrepancy, not as an approved exception.

## Questions

1. Which business events and criteria should result in a case being cancelled versus invalidated?
2. Should the system adopt the following clearly labeled proposed interpretation: cancellation means a normally valid case that was actually cancelled, for example during a cooling-off period, while invalidation means an erroneous or duplicate registration that should not have been established? If not, what definitions should be used?
3. Should the same cancellation/invalidation distinction and criteria apply to applied warranties within a case?
4. Should display, search, reporting, or reason categories differ between cancelled and invalid cases?

## Recommended Proposal or Working Interpretation — Awaiting House Solution Decision

- Project recommendation for discussion only: use `cancelled` for a normally valid case that was actually cancelled, for example during a cooling-off period. Use `invalid` for an erroneous or duplicate registration that should not have been established.
- Do not infer additional transition, restoration, or UI rules from these proposed definitions. Retain only the behavior already confirmed in the authoritative requirements until House Solution decides whether the business distinction changes any of it.
- Preserve a free-text reason for both statuses, with distinct reason categories or reporting treatment only if House Solution confirms that the operational distinction is needed.
- Apply the same distinction to applied warranties only after House Solution confirms that warranty-level cancellation and invalidation have the same business meaning.

This proposal is explicitly awaiting decision and must not be promoted into the specification, data contract, or implementation before confirmation.

## Affected Documents

- [Initial data model](../initial-data-model.md), especially case and applied-warranty lifecycle requirements.
- [Case warranties](../case-warranties.md), especially terminal applied-warranty states and alert eligibility.
- Current specification and any case search, display, reporting, validation, and user-explanation requirements affected by the confirmed distinction.
- Related implementation, data-contract, and test surfaces after the decision is confirmed.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 14 — 利用者と利用開始前の確認

帳票等の仕様とあわせ、使える人・使う端末・困ったときの連絡先を確認します。技術的な方式は開発側で整理しますので、業務上必要な条件をお答えください。

1. 閲覧だけの人、登録・修正する人、取消・無効化や帳票出力をする人を分けますか。工務店内でも他支店の物件を見せない制限が必要ですか。取消と誤登録の無効化は、どの場面で使い分けますか。
2. 主にパソコンで使いますか、スマートフォン・タブレットも必須ですか。利用人数、同時利用人数、月の登録件数の目安を教えてください。
3. 利用開始後の問合せ窓口・必要な対応時間帯・月額運用費の上限について、ご希望または決定担当者を教えてください。未決の場合は確認予定日をご記入ください。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.
