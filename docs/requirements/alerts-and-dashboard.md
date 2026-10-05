# Alerts and Dashboard

## 2026-10-05 保証満了案内の検索整理

保証満了案内は設定月数（既定2か月）以内に満了する本登録物件と満了済み物件を対象とし、未案内／案内済み／すべてだけで切り替える。初期表示は未案内。年度・番号・物件名・住所・工務店・支店・保証グループの検索欄を除去し、他画面の条件も引き継がない。取消済み除外、延長後の満了日再判定、最終満了も含める現行判定を維持。保険満了案内は今回変更しない。

## 2026-10-04 案内取消表現

操作ラベル「未案内に戻す」、確認タイトル「保証満了案内を取り消す」。影響説明はv-alert。延長取消で復元するのは対象延長直前の現在案内状態で、延長後の案内済みを旧期間へ流用しない。過去の対外連絡を取り消す機能ではない。

## 2026-10-04 案内状態を保証期間行へ集約

編集画面の直近期間行に保証満了案内の状態と状態変更ボタンを表示し、対象満了日を確認画面に明記する。過去期間の案内履歴は新設しない。最長年数到達時に保証・保険の満了アラートから除くかはHSC-036で再確認。現行の最終満了識別・抽出は回答まで維持する。

## 2026-10-04 UX-R06受入

保証・保険の閲覧専用画面はオーナーOK。保険満了画面は外部への案内を意図しないとの指摘を受領。用途、表示名、月次報告一覧との役割分担はHSC-036で再確認し、今回新たな状態・通知処理を追加しない。

## 2026-10-04 満了案内専用の詳細表示

保証／保険満了案内から開く画面は物件・期間・状態をカードで読み取り専用表示。保証側の操作は閉じると案内状態切替のみ。保険側は閉じるのみとし、保険案内状態は新設しない。物件訂正・保証延長は物件・保証、保険報告は保険報告用一覧で行う。根拠：同日のユーザーU10指摘と保険画面への適用指示。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 案内状態の保持と初期値（仕様書0.1.84）

取消でも未案内／案内済みは保持。取消中は一覧から除外し、復元時に保持状態と満了日で表示判定する。過去物件は原則未案内、HS確認済みだけ案内済みで取り込む。不明分は案内済みと推定しない。根拠：同日①②YES、HSC-005解決。保険報告状態とは別。未実装・取込未実施。

## 2026-10-03 初期画面の範囲（仕様書0.1.75）

試作版をベースに必要機能を実装する。ダッシュボード化は将来構想で、過去の未採用集約画面・統計・強調案を初期必須条件としない。既決の保証満了案内・保険報告機能は維持。将来ダッシュボードを作る際に表示・集計等を改めて整理する。根拠：同日オーナー①、HSC-006。実装未変更。

## 2026-10-03 確定：取消中の除外（仕様書0.1.66）

取消中の物件／保証は満了案内対象から除外する。過去に未案内だったものも取消中は一覧に残さない。取消済み記録自体は検索して確認できる。復元時の案内状態の扱いは保険情報の保持とは別途整理する。根拠：同日本Codex会話の全3項目YES、HSC-035。今回文書のみ、アプリ・配備なし。

## 2026-10-03 確定：初期運用の満了案内（仕様書0.1.64）

工務店ポータル利用延期のため、満了案内はHS向けの対象物件一覧表示と、物件ごとの「未案内／案内済み」の手動切替を初期リリースに含める。工務店へのメール・電話等はHS担当者がシステム外で行い、自動メール送信は含めない。既定2か月前・設定変更可能は維持。認証メールは対象外。案内状態は保険会社への報告状態と別に管理し、相互に変更しない。保証を10年間延長したら、満了案内の状態を「未案内」に戻す。新しい満了日の案内開始時期（既定2か月前、設定に従う）に達するまでは案内対象一覧に表示しない。2036年満了から2046年満了へ延長した場合も同様。保険会社への報告状態は変更しない。 満了案内一覧は通常「未案内」のみを表示し、HSが「案内済み」「すべて」に切り替えられる。対象10件のうち3件を案内済みにすると、通常表示は残り7件になる。「すべて」は案内対象内の両状態を意味し、案内開始前の物件まで表示対象を広げない。 設定された最長20年／30年に達する最終満了の物件も案内対象に含め、「最終満了・延長不可」と識別表示する。最長20年で20年目、最長30年で30年目を迎える場合が該当する。 未案内の物件は満了日を過ぎても案内対象一覧に残し、「満了済み」と表示する。10月5日満了なら10月6日に自動で消さず、案内済みにするまで通常の未案内一覧に残す。保証延長時は未案内へ戻し、新しい満了日の案内開始時期に基づいて表示対象を再判定する。 初期リリースでは満了案内の現在の状態（未案内／案内済み）だけを管理し、連絡日時・担当者・過去の連絡履歴は持たない。工務店ポータルの利用開始時には要件が変わる可能性があるため再検討する。これは満了案内に限る判断で、保証の延長履歴・保険報告状態・技術的なログの扱いを変更しない。 物件／保証の新規本登録時は案内状態を「未案内」とする。登録直後から案内一覧へ表示するのではなく、設定した満了案内開始時期に達してから表示する。この状態は保証書交付の有無を意味しない。 過去データ取込時の既存案内状態の移行は本回答では確定しない。旧記述の「案内不要」等を一括採用したとは扱わない。根拠：2026-10-03本Codex会話のオーナー承認、HSC-005。今回コード・データ契約・配備は変更しない。

## 2026-10-01 追加決定

保証・保険の満了案内は既定2か月前、管理者が各1〜12か月前に変更可能。暦月の月末調整、期限超過継続表示、日付未設定の除外を試作契約に定義。保険はHS向け別画面。以下の30日前の旧実装記述には優先する。

詳細・データ契約は[試作仕様](../design/meeting-prototype-2026-10-03.md)を参照。


> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

## Status

These are provisional initial-release requirements. They do not prescribe visual design, query implementation, or notification delivery outside the system.

## Permanent-Warranty Transition

The [2026-09-29 warranty decision](case-warranties.md) retains periods under one warranty identity. The existing per-applied-record alert logic below is prototype behavior and must be reassessed during that implementation; a retained historical period must not silently become a separate new warranty. Renewal selection, historical-period alert treatment and notification-state transfer require HSC-005 clarification. No new timing or delivery behavior is approved by the permanent-number decision.

## Existing Prototype Continuing Alert

- An on-screen alert begins 30 days before an applied warranty's expiry date on an active case and remains visible through that expiry date, even after that applied warranty's notification status becomes `notified`.
- Cancelled and invalid cases are not alert eligible. Cancelled and invalid applied warranties are also not alert eligible.
- The case list visually marks or emphasizes a case if any of its applied warranties is alert eligible.
- The application dashboard lists alert-eligible cases once per case.
- The case list and dashboard show a `not notified` marker when at least one applied warranty on the case has notification status `not notified`.

The list and dashboard do not need to display warranty-period or expiry-date information. Applied-warranty details are viewed on the case detail screen.

## Notification Operation

- Staff perform actual expiry notification to construction companies outside the system at this stage. Homeowner-directed expiry guidance is not required (original Q6, accepted by the project owner on 2026-09-28).
- The original answer names an Excel renewal list. Delivery method, its equivalence to portal display, and the proposed nine-year-ten-month selection remain unresolved under HSC-005; the existing 30-day alert is not silently replaced.
- Staff choose a notification status for each applied warranty from a combobox.
- Initial notification-status choices are `not notified`, `notified`, and `not required`. Values and transitions may be changed later if operations require it.
- Notification status belongs to the applied warranty, not the case.
- The initial release records only the current notification status; it does not record notification date/time or operator attribution.

## Required Dashboard Columns

- Case number
- Homeowner name
- Property address
- Construction-company name

HS responsible-branch display is excluded by the 2026-10-01 owner decision (HSC-033); prototype removal is pending.

The dashboard shows the `not notified` marker described above, rather than a case-level notification-status value.
## Unresolved-Matter Routing

See [HSC-005 notification workflow](house-solution-confirmations/HSC-005-notification-workflow.md) and [HSC-006 dashboard presentation](house-solution-confirmations/HSC-006-dashboard-presentation.md) in the central register.
