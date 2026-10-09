# 2026 Initial-Delivery Roadmap

## 2026-10-09 Dev試験運用を挟む再計画

オーナーは10月9日午前中に過去データを用意する予定、HS試験運用は2日と回答。受領後の投入・照合2〜3作業日、HS試験2日、修正・再試験3〜5作業日、Prod構築直前確認1作業日を見積りとして置く。資料と試験結果によってUI／スキーマを見直し、必要時は再投入・照合と日程の再見積りを行う。実データ受領・HS受入・Prod構築の実績や進捗加点を意味しない。詳細な担当・開始条件・完了条件は[現行日程案](../../deliverables/production-schedule-2026-10-05/README.md)。

## 2026-10-09 請求・保証書の追加改修

6decdc5でグループ別請求／保証書、未請求の過月抽出、一括請求済み、保証書の住所列・編集取消をDev反映。全7gate・独立レビュー・315件補完・実画面とログ確認済み。[実績](../design/monthly-queries.md#0131-dev配備実画面検証2026-10-09)。HS過去データ投入／試験運用は未実施で進捗加点なし。

## 2026-10-09 保証書CSVの初版実装範囲

正式列の確定を待たず、仮5列と月次一覧・期間別発行状態を初期機能へ追加する。[仕様・導入・検証](../design/warranty-certificates.md)。保証書生成／印刷は後発のまま。8ea12dfでLocal全7gate・独立レビュー・Dev配備／315件補完・実画面／Functionsログを確認。正式列確定、実HS初期データ投入、Prod構築／運用開始はこの完了に含まない。

## Dev実測の反映（2026-10-08）

[300件容量・検索・CSV実測](../design/evidence/prod-readiness-2026-10-08.md)と[月切替12条件・請求CSV・改修後300件プレビュー](../design/monthly-queries.md)を実画面で実施済み。以下の日付付き過去記録の「300件未実施」「月別取得／getAll未実装」はこの範囲で置換。10月9日、2担当者の実画面で採番・二重取込・保存競合の3ケースを確認済み（各2行CSV、Functions処理重複を照合）。実初期規模／多数利用者・長時間・300件同時本登録の負荷、保証書CSV、Prod準備、投入準備データ受領、HS最終受入は残る。全マイルストーン完成ではなく進捗加点なし。


## 2026-10-08 オーナー決定による現在の状態

本番DB選定はFirestoreで解決。現在の開発側作業はDev架空データ容量・検索・CSV検証、Functionsログ計測、現行での不具合再発確認、文書整合。Prod workflowは環境情報が揃ってから、PITR等はProd構築後に設定する。初期登録はオーナーの投入準備データ待ちで保留。保証書出力・印刷品質確認、予算設定、HS向けシステム利用説明資料は後発。以下の旧マイルストーン中、DB再選定・Word印刷互換・説明資料納品前必須を現在のゲートに用いない。実装・検証の実績は技術改修台帳とoperationsへ集約し、全体進捗加点なし。

## 2026-10-08 後発作業：HS向けシステム利用説明資料

資料は後発へ変更。名称はHS向けシステム利用説明資料。[対象と執筆材料](../requirements/user-explanation-items.md)。資料作成・内容確認・提供は未完了。納品前必須とは扱わない。

## 2026-10-08 増分CSVの追加改修

追加の日付対応359b14cは全7Local検証・独立レビュー・Dev反映と正式照合済み。Excelの年／月／日表示を受け付け、原受領値を保全する。添付CSVは支店未登録による全件棄却を確認するためのデータであり、支店追加・Cloud本登録はしない。ユーザー受入は未完了。[日付対応の実測](../design/evidence/increment-import-2026-10-08.md#excel編集csvの日付対応2026-10-08)。進捗加点なし。

増分初回10年、14列、取込み可能グループ制限、グループ別住所／資材名必須条件と任意項目の空欄保存をa9e90e4へ実装。Local全7検証・独立レビュー・Dev19 Functions／Hosting反映と正式配備照合を完了。[実測](../design/evidence/increment-import-2026-10-08.md)、[設計](../design/property-bulk-import.md)、[R2架空CSV受入手順](../../deliverables/dev-import-acceptance-2026-10-08/README.md)。ユーザー受入と300件のDev容量試験は未実施。実HS資料の投入は引き続き保留、HSの日時準備運用は回答待ち。未完了の受入を進捗へ加算しない。

## 2026-10-08 名称統合・一括取込みの受入準備

名称統合6b2573dの全7Local検証・独立レビュー・Dev19 Functions／Hosting反映・正式照合・16件移行と全完成像照合を完了。[実測](../design/evidence/property-name-unification-2026-10-08.md)。架空CSV7本と[ユーザー受入手順](../../deliverables/dev-import-acceptance-2026-10-08/README.md)を準備。実画面／CSV受入・任意300件のDev実行は未完了、HS実資料投入は回答まで保留。既存の全体提供進捗を未実施受入で加点しない。


## 2026-10-07 提供前バックアップ開始を必須作業に追加

Dev取得停止・PITR無効化・取得済み像の削除は[運用記録](../runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)で実行確認済み。Prod提供前に自動取得とPITRを有効化し、初回実取得・通知・復元互換性を確認することを提供ゲートとする。Prod設定・取得開始は未実施であり完了へ加点しない。共通CSV・支店コード・単一住所はLocal全7ゲート／独立レビュー、承認後のDev19 Functions／Hosting反映・16件住所移行・技術検証を完了。住所のHS確認・別通常再開了承でnormal10へ再開済み。追加外部キー改修cbb5859もDev配備／技術検証・UH設定readback済み。共通機能のHS実画面受入・実Cloud容量検証・原資料の実取込みは残る。提供マイルストーンの完了／加点には含めない。[実行証拠](../design/evidence/common-import-address-2026-10-07.md)。

## 2026-10-05 HS共有用の目標日程案

[共有用PDF・生成元](../../deliverables/production-schedule-2026-10-05/README.md)を作成。10/9回答・管理者決定、10/13資料確定、10/16必要機能、10/20本番環境、10/22取込み予行、10/26最終確認、10/28本番初期登録、10/29開始判断、10/30稼働開始を目標とする。HSとの日程合意前であり納期の確約ではない。回答・資料・確認や開発検証の遅延に応じ、後続作業・稼働開始日（納期）も後ろ倒しとして協議・再設定する。工程の完了や進捗の加点を示さず、既存の完了条件は維持する。

## 0.1.99 — 2026-10-04 案内状態・取消配置

カレンダー、報告/請求カード、延長配置はオーナーOK。保証満了案内の状態と操作を直近保証行へ集約し、全体取消を右上の色付きボタンへ変更。Dev Hosting反映・実画面確認済み。全7ゲートexit 0。[記録](../design/evidence/ux-099-2026-10-04.md)。保証上限到達時の保証/保険アラート除外はHSC-036で確認、抽出条件は不変。全体進捗の加点なし。

## 2026-10-04 UX-R追加回答

UX-R01/R06はオーナーOK、日付数値入力もOK。0.1.98でカレンダー配色・報告/請求のカード表示・延長ボタン位置を修正しDev反映・開発側確認済み。[差分受入手順](../runbooks/local-acceptance-2026-10-03.md)、[証跡](../design/evidence/ux-098-2026-10-04.md)。請求年月/未請求管理はHSC-010、保険満了一覧用途はHSC-036で確認。全体進捗の加点なし。

- Status: Active
- Last reconciled: 2026-10-08
- Scope: HS-operated initial release for the new warranty service; target end of October 2026. Exact start date is undecided.
- Progress: 0% — no complete milestone has earned credit. Verified partial work remains recorded below.
- Progress method: Milestone weights total 100%. No partial credit. Documentation consolidation does not earn implementation, deployment, or acceptance credit.

## 2026-10-04 Dev受入担当・延長取消

追加：A01/B05/C11は共同準備後に完了、C12はユーザー指示で保留。U07/U09はユーザーOK。UI/UX指摘を仕様0.1.97としてDev Hostingへ配備し、[開発側確認](../design/evidence/ux-097-2026-10-04.md)完了。ユーザーの差分6項目は再確認待ち。未決請求先単位はHSC-010で後発確認。全体のマイルストーン完了率は変更しない。

A13-R/A15-Rはオーナー合格。後続指示によりCodex単独で進められる残9区分をDevで検証・受入完了。共同操作が必要な4区分と業務・UI/UX受入は残る。CodexがDev機能試験、オーナーが業務一巡・UI/UXを担当する。承認済み保証延長取消と試験範囲は[検証証跡](../design/evidence/extension-undo-dev-2026-10-04.md)。未実行項目は完了にせず、全体マイルストーンの完了判定は据え置く。

## Current Scope and Evidence

The [specification 0.1.90](../specification.md) consolidates the already-approved Q&A; it does not adopt new product scope. The former portal-first, direct-certificate-PDF, optional-handover and multiple-applied-warranty acceptance wording is superseded for initial delivery. The latest instruction authorizes deployment of the independent changes to Dev and makes Dev testing the owner acceptance environment. Production deployment and HS start approval remain separate.

- Initial operators are HS staff. Company portal capability is retained but rollout deferred. HS branches, separate legacy case/product/owner screens and per-submission HS approval are not initial workflow requirements.
- Property/one permanent warranty, group→company→branch, application-date annual numbering, mandatory handover, 10-year extensions and manual 20/30-year cap, notifications, reasoned cancellation/restoration and reporting are confirmed in the specification.
- Initial outputs are CSV. Certificate printing/output is deferred; the dedicated warranty CSV remains unfinished. Invoice calculation, premium management and dispatch remain outside initial scope.
- Initial new-service warranty data is registered by development, then reconciled and approved by HS. This is distinct from excluded legacy FileMaker migration. Used numbers remain reserved, including numbers from excluded ended/cancelled records.
- Existing postal-code, authentication and prototype evidence is retained in [operations](../operations.md), [postal design/evidence](../design/tr-009-japan-post-postal-data.md), and the [prototype evidence](../design/evidence/meeting-prototype-2026-10-01.md). Evidence of partial features is not full initial-release acceptance.
- The independent changes were deployed to Dev and its demo data reset to two retained administrators after explicit approval. Public artifact/auth-boundary verification passed; user acceptance remains pending. See [release/reset evidence](../operations.md#2026-10-03-dev受入用配備と空データ初期化).
- Independent implementation and Dev acceptance are tracked in the [current acceptance runbook](../runbooks/local-acceptance-2026-10-03.md) and [implementation evidence](../design/evidence/independent-implementation-2026-10-03.md). Automated verification is separate from user acceptance; milestone credit remains unchanged.
- The [hierarchy checkpoint](../design/evidence/meeting-prototype-2026-10-01.md#2026-10-03-hierarchy-management-checkpoint) is locally implemented/tested but not deployed or manually accepted as the final product. Subsequent Q&A changes are not covered by those earlier tests.

## Milestones

| ID | Milestone | Planning period | Weight | Completion criteria | Evidence/status |
| --- | --- | --- | ---: | --- | --- |
| M1 | Development prototype aligned to confirmed scope | Prototype phase, revised after presentation | 25% | HS workflow, permanent warranty and numbering, hierarchy, required input, lists, postal lookup and account operations verified locally and available in Dev for review. Deferred portal rollout is not required for credit. Postal maintenance/freshness requirements must be verified, not assumed from lookup availability. | Partial prototype/Dev evidence in operations and linked records; current confirmed scope not fully implemented, no credit |
| M2 | Feedback and defect corrections | After first presentation | 15% | Accepted changes and relevant known defects in the technical-remediation register corrected and verified; no false-empty lists or stale retry flows. | Pending full evidence |
| M3 | Production readiness and release rehearsal | Before production preparation | 25% | Confirmed insurance reporting/undo, guarantee notifications/CSV, initial-import checks, retained-number handling, archive/recovery, role boundaries and selected regression gates verified; complete release rehearsal. | Design/implementation/evidence pending |
| M4 | Production preparation | Before HS start approval | 15% | HS-owned environment and developer access, Firestore configuration and query validation, backup/recovery and operations configuration verified; HS-provided initial data reconciled and approved; initial CSV output compatibility checked; certificate printing deferred. | Not completed |
| M5 | Official production release | End of October 2026 target; exact date pending | 20% | HS operators verify agreed flows and data/results; HS president approves start; rollout/rollback/incident procedure verified; normal registration starts after initial-data acceptance. No legacy FileMaker cutover. | Not completed |

Weights and progress remain 100% total and 0% earned; criteria have been reconciled to prior Q&A approvals, not relaxed to award partial credit. Earlier schedule labels are planning history, not claims of on-time completion.

## Next Work and Completion Boundary

1. Wait for owner-prepared initial data. Do not re-request already received administrator information or deferred Word printing material.
2. Use the [Dev measurement](../design/evidence/prod-readiness-2026-10-08.md) to refine HSC-023 acquisition work. Firestore selection HSC-022 is resolved; prepare Prod workflow after actual environment identifiers are available.
3. Implement confirmed requirements and [technical remediation](technical-remediation.md), with scoped verification under the project policy. Select explicit file ownership and preserve existing worktree changes.
4. Obtain required deployment/data authorizations, verify Dev behavior and then rehearse production preparation. Existing approvals for earlier Dev actions are not a blanket authorization for new destructive work.
5. HS verifies, then the president approves start. Record exact release evidence and only then award applicable milestone credit.

## Unresolved Dependencies

The [sole register](../requirements/house-solution-confirmations.md) contains the current unresolved items. Do not reuse historical counts or resolved DB/name questions.

- HS: insurance removal reporting, cancelled-data retention/deletion, manual 30-year eligibility, initial files and counts/dates, acceptance/start timing, service hours/cost and saved-CSV operations.
- Development: query efficiency, result and export completeness, default-active versus latest-20 behavior, numbering concurrency, insurance cycle boundary/date edge cases, retained undo state, archived-CSV recovery and legacy prototype compatibility.
- Future: portal reopening and its access implications, custom email sender and document recipients/dispatch. Requested later HS group-correction tooling remains a separate requirement; its timing and safe conditions are not fixed.
- Operating cost estimates communicated to HS are not verified budgets or guarantees. Approximate annual 200+ and two concurrent users are owner-supplied planning inputs, not usage caps; cumulative data count must come from the actual initial source.

## Sources and Reporting

Specification, HSC register, decisions, operations and technical-remediation documents remain authoritative for their own scopes. This roadmap is not a second requirements register. Old prototype periods, stale production claims and repeated per-answer zero-progress notes have been removed from this current view; source decision files and Git retain the rationale and historical evidence.

No app, deploy, data-contract, governance or approval boundary was changed by the 2026-10-03 documentation consolidation. The existing physical schema and runtime still need implementation alignment and cannot be inferred from the rewritten milestone text.
