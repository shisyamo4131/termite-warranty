# HSC-005: Notification Workflow and History

## 2026-10-03 Resolution — 取消・復元と初期取込の案内状態

①YES：取消でも未案内／案内済みは保持し、取消中は案内一覧に出さない。復元時は保持した状態と満了日で表示対象を判断する。②YES：過去物件は原則未案内で初期登録し、HSが確認できる案内済みだけ引き継ぐ。不明な状態を開発側で案内済みと推定しない。

既決の画面案内・HSのシステム外連絡、2か月前設定変更可、未案内初期値・延長後リセット、通常未案内表示、最終満了識別、未案内の満了後継続、現在状態のみの管理と合わせ、初期運用の業務確認を解決とする。ポータル利用開始時の再検討はHSC-013、元資料の案内済み照合はHSC-015へ集約。実装・移行・検証は未完了。

決定者：オーナー。根拠・日付：2026-10-03本Codex会話①②YESと同日既決回答。仕様書0.1.84、alerts-and-dashboard、workflowへ反映。未コミット、コード・データ・配備変更なし。

## 2026-10-03 確定：新規本登録時は未案内

物件／保証の新規本登録時は案内状態を「未案内」とする。登録直後から案内一覧へ表示するのではなく、設定した満了案内開始時期に達してから表示する。この状態は保証書交付の有無を意味しない。

根拠：2026-10-03本Codex会話のオーナーのYES。仕様書0.1.64、alerts-and-dashboard、workflowへ反映。過去データ取込時の既存案内状態、取消・復元との関係やポータル開始後の運用は本回答で決めない。今回文書のみ、アプリ・データ契約・配備は変更しない。以下の初期値未確定との記述は過去時点の記録。

## 2026-10-03 確定：初期は現在の案内状態のみ

初期リリースでは満了案内の現在の状態（未案内／案内済み）だけを管理し、連絡日時・担当者・過去の連絡履歴は持たない。工務店ポータルの利用開始時には要件が変わる可能性があるため再検討する。これは満了案内に限る判断で、保証の延長履歴・保険報告状態・技術的なログの扱いを変更しない。

根拠：2026-10-03本Codex会話のオーナーのYESと補足。仕様書0.1.63、alerts-and-dashboard、workflowへ反映。将来の履歴や自動配信の実装まで承認されたとは扱わない。初回登録時の状態は継続確認。今回文書のみ、アプリ・データ契約・配備は変更しない。以下の履歴未確定との記述は過去時点の記録。

## 2026-10-03 確定：未案内の満了後継続表示

未案内の物件は満了日を過ぎても案内対象一覧に残し、「満了済み」と表示する。10月5日満了なら10月6日に自動で消さず、案内済みにするまで通常の未案内一覧に残す。保証延長時は未案内へ戻し、新しい満了日の案内開始時期に基づいて表示対象を再判定する。

根拠：2026-10-03本Codex会話のオーナーのYES。仕様書0.1.62、alerts-and-dashboard、workflowへ反映。初回登録時の状態・履歴等は継続確認。今回文書のみ、アプリ・データ契約・配備は変更しない。以下の満了後表示未確定との記述は過去時点の記録。

## 2026-10-03 確定：最終満了も案内対象

設定された最長20年／30年に達する最終満了の物件も案内対象に含め、「最終満了・延長不可」と識別表示する。最長20年で20年目、最長30年で30年目を迎える場合が該当する。

根拠：2026-10-03本Codex会話のオーナーのYES。仕様書0.1.61、alerts-and-dashboard、workflowへ反映。保証上限の変更ルールは維持し、表示のために上限を変更しない。初期値・満了後の継続表示・履歴等は継続確認。今回文書のみ、アプリ・データ契約・配備は変更しない。以下の最終満了未確定との記述は過去時点の記録。

## 2026-10-03 確定：満了案内一覧の表示切替

満了案内一覧は通常「未案内」のみを表示し、HSが「案内済み」「すべて」に切り替えられる。対象10件のうち3件を案内済みにすると、通常表示は残り7件になる。「すべて」は案内対象内の両状態を意味し、案内開始前の物件まで表示対象を広げない。

根拠：2026-10-03本Codex会話のオーナーのYES。仕様書0.1.60、alerts-and-dashboard、workflowへ反映。最終満了の対象可否・初回登録時の状態・履歴等は継続確認。今回文書のみ、アプリ・データ契約・配備は変更しない。以下の表示条件未確定との記述は過去時点の記録。

## 2026-10-03 確定：延長後の案内状態

保証を10年間延長したら、満了案内の状態を「未案内」に戻す。新しい満了日の案内開始時期（既定2か月前、設定に従う）に達するまでは案内対象一覧に表示しない。2036年満了から2046年満了へ延長した場合も同様。保険会社への報告状態は変更しない。

根拠：2026-10-03本Codex会話のオーナーのYES。仕様書0.1.59、alerts-and-dashboard、workflowへ反映。案内済みの通常表示、初回登録時の状態などは別途確認。今回文書のみ更新し、アプリ・データ契約・配備は変更しない。以下の「延長後の状態は未確定」は過去の確認時点の記録。

## 2026-10-03 確定：満了案内の対応状態

初期リリースで、HSが物件ごとに「未案内／案内済み」を手動で切り替えて工務店への連絡状況を記録できる。対象10件のうち3件に連絡した場合、未案内の7件と区別するための機能として採用。保険会社への「報告済み」とは別に管理し、相互に変更しない。

根拠：2026-10-03本Codex会話の上記具体例へのYES。仕様書0.1.58、alerts-and-dashboard、workflowへ反映。延長後の状態、初期値、一覧の絞り込み、日時・担当者・履歴の詳細は未確定。今回仕様のみ更新し、コード・データ契約・配備は変更しない。旧「通知不要」等の選択肢まで承認されたとは扱わない。

## 2026-10-03 確定：満了案内は一覧表示とHSの外部連絡

初期リリースでは満了案内対象の物件を画面に一覧表示し、工務店へのメール・電話等はHS担当者がシステム外で行う。自動メール送信は含めない。理由は工務店ポータルの利用延期。既定2か月前・設定変更可能を維持する。パスワード設定等の認証メールには適用しない。

根拠：2026-10-03本Codex会話のオーナーのYESと補足。仕様書0.1.57、alerts-and-dashboard、workflowへ反映。案内済み／未案内等の記録要否、案内対象の詳細などは未確定。今回アプリ改修・配備なし。提案事項PDFの既存説明に訂正はなく、今回はPDFを変更しない。

## 2026-10-03 確定：延長手続きの時期

HSは満了前・満了後を問わず、時期の制限なく保証を延長できる。操作日から数え直さず、従来の満了日の翌日から10年間を追加する。2036年10月5日満了なら、2035年の早期手続きでも2036年11月の満了後手続きでも、延長後は2046年10月5日満了。既決の通算20年／30年上限は維持する。保険の報告・適用状態まで自動変更する決定ではない。

根拠：2026-10-03本Codex会話の具体例に対するオーナーのYES。仕様書0.1.56、case-warranties、説明PDF5ページへ反映。試作方針を本番要件として確定し、今回アプリ改修・配備・実行検証は行わない。案内方法・対応状態等は引き続き未確定。

- Status: Partially resolved; manual unnotified/notified tracking adopted; renewal reset and default unnotified filter confirmed; final expiry included; overdue unnotified items retained; current-state-only tracking confirmed; new registration starts unnotified; portal-launch reassessment and migration/cancellation integration remain
- Decision owner: House Solution

## Confirmed Context

2026-10-01試作方針㉔A：満了案内は対象物件の画面表示までで、実メール配信は作らない。案内時期・宛先・文面は土曜日確認事項。パスワード設定メールには適用しない。実装未完了。

2026-10-01試作方針⑦：オーナー指示により延長操作の時期は無制限。早期申請・満了後の手続き忘れでも時期を理由に保留／HS確認待ちにしない。⑥の現満了日の翌日から10年間追加という計算は維持し、最長期間の上限とは区別する。土曜日確認事項：実際に受付可能な時期と、案内前申請／満了後申請の業務上の扱い。保険の遡及適用まで成立すると推定しない。

2026-10-01試作方針：質疑第2回⑥Aをオーナー採用。対象保証の「10年間延長」を確認して実行し、現満了日の翌日から10年間を追加する。恒久番号と期間履歴を維持し、HS承認待ちは挟まない。延長操作の可能時期と30年条件は別途。HSの本番確認・実装は未完了。

2026-10-01部分確定：工務店による保証延長はHS承認待ちを挟まず登録する（ADR 0034）。承認の要否は再質問しない。案内時期・方法・配信・延長可能条件・履歴運用などは引き続き未確定。

Staff currently notify customers outside the system and store one current notification status per applied warranty. The initial release does not record notification time or operator history.

## Project Recommendation for Discussion — Not House Solution-Confirmed

- Deprecate and replace manually edited applied-warranty `not notified`, `notified`, and `not required` as the renewal business state. Make the construction-company portal renewal work item authoritative and derive a renamed renewal-handling status automatically; do not expose a manual renewal-status selector.
- Keep the staff business trigger as a deliberate `更改確認を依頼` action for an alert or candidate warranty. The action creates or publishes the portal renewal work item and queues an ancillary email notification. Email is informational, not the requested business action and not proof of response or completion.
- Recommend these renewal statuses per target applied warranty: `unrequested`; `awaiting company response`; `company draft`; `awaiting HS review`; `needs correction`; `renewed/registered`; and `renewal declined`. Map them to existing work-item status and decision values where applicable, but do not claim that the current implementation already supports this per-warranty model.
- Because a case may have multiple applied warranties, link each renewal request to its target applied warranty and derive case-list summaries from child states. This is a functional and data-model proposal; the currently confirmed one-current-work-item-per-case behavior remains in force until House Solution approves a change.
- Separate technical email-delivery state from renewal business status. If a provider is later connected, delivery state may be `queued`, `sent`, or `failed`; the current queue must not be described as delivered.
- Keep `withdrawn` for unapproved new-case portal applications, not renewal. Before House Solution registration, company withdrawal is terminal and non-editable/non-reopenable, creates no registered case or case number, and should be hidden from the default active list while remaining available through a withdrawn/history filter; UI details are deferred. After registration, reversal uses registered-case `cancelled`, not portal withdrawal.
- Preserve the existing revision/state checks as the arbiter of concurrent approval and withdrawal. This recommendation does not change those checks.

## Questions

1. Does House Solution accept or revise the proposed per-applied-warranty renewal statuses, authoritative portal work item, and removal of manual renewal-status editing?
2. Does House Solution accept or revise the `更改確認を依頼` trigger, target-warranty linkage, case-summary derivation, and the constraint that one current work item per case remains until a change is approved?
3. Which notification methods, delivery states, repeated notifications, scheduled follow-ups, customer responses, timestamps, operators, notes, and status history must be recorded?
4. Does House Solution accept or revise the proposed separation of email-delivery state from renewal business state, and the treatment of withdrawn unregistered new-case applications versus registered-case cancellation?

## Partial Resolution

- Decision: The construction-company portal is the accepted structured path for receiving a construction company's new-case or renewal response. This resolves the response-intake portion only.
- Remaining: The proposed per-warranty renewal-handling model, actual email delivery, repeated or scheduled notifications, reminders, delivery/result history, and any customer-facing response state remain unconfirmed. The prototype's queued outbox record must not be presented as a delivered email.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit approval in the current Codex task.

## Affected Documents

Alert requirements, workflow, applied-warranty data, UI, and tests.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

Confirmed partial answer: expiry guidance is for construction companies; homeowner-directed expiry guidance is unnecessary. This is reflected in the specification, workflow and alerts requirements. Excel delivery does not by itself approve portal equivalence.

### Outgoing question 5 — 更新の案内をいつどのように送るか

案内先は工務店で、施主向けの満了案内は不要と理解しています。概要では9年10か月・19年10か月の物件リストが必要ですが、現在の画面のお知らせは満了30日前です。

1. 引渡日から9年10か月になった日に案内しますか。それとも、その月の対象をまとめますか。20年・30年の最終満了や更新不可物件も載せますか。
2. Excelを出し担当者がメール送付する方法で足りますか。システムからのメール送信や、工務店画面への表示も必要ですか。30日前のお知らせは残しますか。
3. 送付済み・未回答・更新希望・更新辞退を記録しますか。再案内が必要な時期と、更改一覧に載せる項目をご指定ください。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

恒久番号の保証本体に期間履歴を残すことが採用された。番号を変えるか、履歴を残すかは質問済み・決定済み。第2回回答でも更改成立の条件、案内時期、送付方法、通知状態の扱いは未解決。

### 残る確認（文面はユーザー確認前）

どの連絡・書類を受け取った時点で延長を確定するか、未回答・辞退の扱い、工務店への案内時期を伺う。旧期間の通知と新期間の通知をどう切り替えるかも設計前に確認する。

Decision evidence: project-owner adoption on 2026-09-29, task `01a0e5c9-ec13-78e0-acd2-62e03f732c95`. Reflected in [case warranties](../case-warranties.md), the specification and [ADR 0033](../../decisions/0033-permanent-property-warranty.md). The remaining details keep this matter open. Changes are currently uncommitted; implementation is pending.


## 2026-10-01 追加資料後のオーナー判断

保証満了アラートは既定2か月前、システム管理者・HS管理者が各1〜12か月前に設定可能として試作へ採用。保証は初回10年・10年ずつ・上限20/条件付き30年を維持。最短5年の運用と延長単位の関係は土曜日確認事項。30年要件と延長受付時期は引き続き未確定。

根拠：本Codexタスクの同日ユーザー指示。試作の確定範囲は[試作仕様](../../design/meeting-prototype-2026-10-03.md)と仕様書0.1.30に反映。土曜日への提案は未確定のまま保持。外部未送付。
