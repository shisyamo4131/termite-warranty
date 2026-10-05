# Business Workflow

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 初期案内状態と取消（仕様書0.1.84）

取消・復元で満了案内状態を保持し、取消中は案内対象外、復元時に状態・満了日で対象再判定する。初期登録は未案内を基本としHSが確認できる案内済みだけ継承。保険報告は全件未報告で開始する別ルール。根拠：同日①②YES、HSC-005/015。実装未変更。

## 2026-10-03 確定：工務店・支店の無効化

工務店・支店は削除せず無効化し、新規物件の登録先から除外する。既存物件との関連と保証は保持し、HSは既存保証の訂正・延長・保証書出力・保険報告を継続できる。これは当該保証自体が取消済みの場合の操作制限を解除するものではない。

工務店の無効化は配下の全支店の新規登録も停止する。支店単独の無効化は本店・他支店へ波及しない。再有効化可能だが、工務店を再有効化しても個別に無効化した支店は無効のままとする。親の無効による実効的な停止と支店自身の無効状態を区別する。ポータルのログイン・アカウント停止を自動連動させる判断は今回に含めない。

根拠：2026-10-03本Codex会話の無効化3項目への「すべてYES」。仕様書0.1.67、HSC-038。未実装・未配備。



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



## 2026-10-03 初期リリース：HSによる満了案内

工務店ポータルの利用は延期し、初期の入力業務はHSが行う（HSC-013）。保証の満了案内対象をシステムで一覧表示し、工務店への連絡はHS担当者がシステム外のメール・電話等で行う。HSは物件ごとに「未案内／案内済み」を切り替えて連絡状況を記録する。保険会社への報告状態とは区別する。満了案内の自動配信は含めず、既定2か月前・設定変更可能を維持する（HSC-005、仕様書0.1.64）。以下のポータル連絡フローは初期運用には適用しない。保証を10年間延長したら、満了案内の状態を「未案内」に戻す。新しい満了日の案内開始時期（既定2か月前、設定に従う）に達するまでは案内対象一覧に表示しない。2036年満了から2046年満了へ延長した場合も同様。保険会社への報告状態は変更しない。 満了案内一覧は通常「未案内」のみを表示し、HSが「案内済み」「すべて」に切り替えられる。対象10件のうち3件を案内済みにすると、通常表示は残り7件になる。「すべて」は案内対象内の両状態を意味し、案内開始前の物件まで表示対象を広げない。 設定された最長20年／30年に達する最終満了の物件も案内対象に含め、「最終満了・延長不可」と識別表示する。最長20年で20年目、最長30年で30年目を迎える場合が該当する。 未案内の物件は満了日を過ぎても案内対象一覧に残し、「満了済み」と表示する。10月5日満了なら10月6日に自動で消さず、案内済みにするまで通常の未案内一覧に残す。保証延長時は未案内へ戻し、新しい満了日の案内開始時期に基づいて表示対象を再判定する。 初期リリースでは満了案内の現在の状態（未案内／案内済み）だけを管理し、連絡日時・担当者・過去の連絡履歴は持たない。工務店ポータルの利用開始時には要件が変わる可能性があるため再検討する。これは満了案内に限る判断で、保証の延長履歴・保険報告状態・技術的なログの扱いを変更しない。 物件／保証の新規本登録時は案内状態を「未案内」とする。登録直後から案内一覧へ表示するのではなく、設定した満了案内開始時期に達してから表示する。この状態は保証書交付の有無を意味しない。 ポータル開始時の再検討はHSC-005で管理する。今回アプリ・配備は未変更。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

HS branch exclusion (2026-10-01, HSC-033): target registration/editing does not ask for an HS responsible branch. Any responsible-branch requirement below is prototype behavior pending removal. This does not remove construction-company branches or decide the portal's approval-free submission proposal.

## Current FileMaker-Service Workflow — Context Only

1. A construction company enters new-case or renewal information in a web form on a simply authenticated shared member page.
2. The form delivers the entered information to staff by email.
3. The staff member manually registers the information in the legacy system.

The new service does not reuse this member page because it does not identify construction companies individually and does not satisfy the new service requirements.

## Confirmed Target Construction-Company Workflow (2026-10-01)

HS issues company accounts. Authenticated head-office/branch operators register their company's properties and warranties and extend coverage without waiting for HS approval. Successful submission registers the business result. New numbering uses the assigned warranty group and application-date year with a continuing group sequence; renewal preserves the warranty number and period history. Company ownership, input validation and account disablement remain required. Branch-specific assignment/account details, correction/cancellation and downstream certificate/reporting automation are separate decisions. See [ADR 0034](../decisions/0034-company-registration-without-hs-review.md).

## Existing Prototype Construction-Company Workflow — Review Superseded

1. A House Solution administrator issues or disables one shared account per construction company; the construction company sets or resets its own password.
2. For renewal, staff create a case-linked pending work item and the system queues an email notification. For a new case, the construction company starts a new request.
3. The authenticated construction company enters a response and submits it. The current operator enters a name, while the response email is derived from the authenticated shared account. Only its own provisional data can be accessed or changed.
4. Submission locks company editing and queues a House Solution notification.
5. Staff review the structured response and either atomically promote it to registered data or return it with a reason.
6. A return reopens company editing and queues a construction-company notification.
7. Before approval, the construction company may withdraw its own new-case request with a required reason. The work item remains as an audit record and cannot be reopened.

This describes existing prototype behavior, not the newly adopted approval-free target. Email delivery, reminder timing, retention, detailed audit needs, and production service/security behavior remain open under their respective matters.

Homeowners do not receive direct application access in the initial release: there is no homeowner account, login, my page, warranty/document self-service, application, or response workflow. Homeowner disclosure, correction, restriction-of-use, and similar requests are handled through a House Solution contact channel; the contact method and notification behavior remain open under HSC-005 and related matters.

## Initial Release — Confirmed Scope

The 2026-09-28 original answers Q4, Q6, Q10, Q12 and Q13 were accepted by the project owner for their unambiguous portions. Application date is the billing reference; handover date is the initial warranty and renewal-guidance reference. This records the dates' business meaning without adding a billing engine or changing the current manual-date correction behavior. Periodic inspections and historic inspection migration are excluded. Expiry guidance goes to construction companies, not homeowners. Monthly insurance reporting is defined separately in [insurance reporting](insurance-reporting.md).

The 2026-10-01 approval-free portal target supersedes per-submission staff review. Two-channel intake details and migration remain under HSC-013/HSC-015; the new workflow is not yet implemented.

- Company users perform new warranty registration and extension without HS approval. This does not remove existing HS staff administration functions.
- Staff can search and list registered information.
- The system alerts for warranty services nearing expiry.

The initial registration screen requires application date and handover date as case-level business dates, in addition to the required property, homeowner, construction company, responsible branch, and applied warranty information. No ordering rule between application date and handover date is currently specified. Remaining fields and validation rules remain open.

Entering or changing the handover date auto-fills the warranty start date while that start date is blank or still equal to the prior auto-filled handover date. A manually changed warranty start date is preserved. The same interaction applies to the construction-company new-case form.

Selecting a property automatically selects its registered homeowner and construction company for the case. Staff can change either selection before registration and while the case remains active. Changing the selected property on an active case reselects the homeowner and construction company registered on that property; staff can then change either value before saving.

## Permanent Warranty — Confirmed Target, Implementation Pending

The 2026-09-29 [permanent-warranty decision](../decisions/0033-permanent-property-warranty.md) requires one warranty per property across cases, with a permanent number and retained renewal periods. Registration and portal approval must eventually enforce this identity; their current prototype commands do not yet do so. The per-applied-record alert behavior below describes the retained prototype. The target period/notification association remains under HSC-005. The second questionnaire proposes staff-only operation; it has not yet replaced the previously approved company workflow (HSC-013).

## Alerting — Existing Prototype Behavior

The system must show an on-screen alert from 30 days before an applied warranty expiry through expiry. A case is visually emphasized and listed once when any of its applied warranties is alert eligible. Warranty-period and expiry-date details are viewed on the case detail screen. Staff carry out the actual notification at this stage and select `not notified`, `notified`, or `not required` for each applied warranty from a combobox; timestamp/user attribution and repeat behavior remain open.


## 2026-10-03 打合せ後の確定：初期運用はHS入力

オーナーが本日のHS打合せ結果として回答。10月末納期までに取引工務店へ周知する時間がないため、初期運用のすべての入力業務はHSが担当する。工務店側の入力機能は削除せず、利用開始を保留する。保証書出力はHS側だけの機能とする。

これは初期運用の担当変更であり、工務店機能の廃止や、将来再開時に都度HS承認を必須にする決定ではない。工務店への開放時期、既存アカウントの具体的な利用制御方法、印刷・発送担当の追加決定は含まない。現行試作のコード・配備・アカウントは未変更。HS限定出力の実装・検証は後続作業。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.33へ反映、未コミット。各事項の他の未決部分は継続管理する。
