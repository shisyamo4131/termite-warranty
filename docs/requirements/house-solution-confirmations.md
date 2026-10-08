# Unresolved-Matter Register

- Status: Active
- Purpose: Provide the sole index of current unresolved matters, including House Solution confirmations and project technical decisions.
- Detail rule: Store one matter per file under `house-solution-confirmations/`.

This register records questions and their status. It is not a source of confirmed requirements. After an answer or technical decision is explicitly approved, update the affected authoritative documents through the normal specification-change process. When asked to present unresolved matters, use this index and its linked files rather than chat history or a separate topic-document list.

When a matter is resolved, retain its detail file with the decision, decision maker/date, evidence, affected authoritative documents, and reflected revision when available. Move the row to the resolved table without deleting or reusing the ID. A chat instruction is acceptable evidence when its decision is summarized durably in the matter file and its date and available task/thread or share identifier are recorded.

## Unresolved Matters

2026-10-08整理：Firestore採用と名称統合は解決済みへ移動。初期投入はオーナー準備待ち。初期保証書CSVは未完了、印刷・予算設定・利用説明資料は後発。件数集計は重複管理せず、以下の各行を現在の索引とする。

| ID | Matter | Status | Decision owner |
| --- | --- | --- | --- |
| HSC-041 | [ログイン通信失敗の原因と認証サービス側ログ](house-solution-confirmations/HSC-041-authentication-diagnostics.md) | 診断はDev実受信済み。サービス切替なしで観測継続と決定。通信失敗の原因は未特定 | Project owner / Project |
| HSC-040 | [郵便番号データの定期自動更新](house-solution-confirmations/HSC-040-postal-data-automatic-update.md) | 月次自動取得・検証・公開・失敗通知を検討。方式未採用／設定未実行 | Project owner |
| HSC-010 | [請求先単位・対象年月・請求状態](house-solution-confirmations/HSC-010-payer-contracting-party.md) | 延長後の保証開始月を2026-10-05採用、ローカル実装・機能検証済み、Dev未反映。未請求抽出・請求先単位・合算は確認待ち | House Solution |
| HSC-001 | [Case, applied-warranty, and referenced-master data retention](house-solution-confirmations/HSC-001-data-retention-policy.md) | 終了分のCSV保管後削除・開発側復元は確定。取消済みもCSVをHS保管後に削除可（2026-10-05）、後発実装。トリガー・詳細は未確定 | House Solution |
| HSC-002 | [Initial-release acceptance scope](house-solution-confirmations/HSC-002-release-acceptance-scope.md) | HS operators verify, HS president approves launch, AriLabo coordinates confirmed; actual launch date undecided, final acceptance preparation remains | House Solution |
| HSC-023 | [Firestore取得・検索設計](house-solution-confirmations/HSC-023-ngram-query-consistency.md) | 月別DB12条件一致、Chromeで10月保険の画面・CSV・ログ305件一致。300件プレビュー中央値1,031ms・全行照合済み。月切替12条件・請求CSVも実画面照合済み。実初期規模・同時負荷等が残る | Project / HS business decision |
| HSC-025 | [Production service and risk requirements](house-solution-confirmations/HSC-025-production-service-requirements.md) | 通知先はオーナーGoogleアカウント、予算設定は後発。運用窓口は確定、対応時間等の残条件は詳細参照 | House Solution |
| HSC-030 | [Custom authentication-email sender](house-solution-confirmations/HSC-030-custom-auth-email-sender.md) | Deferred | House Solution, if requested |
| HSC-034 | [Deterioration countermeasure grade and warranty limit](house-solution-confirmations/HSC-034-deterioration-countermeasure-grade.md) | Manual cap selection and later HS edits confirmed; no reduction below granted 30 years; business eligibility remains outside automation | House Solution |
| HSC-035 | [Case cancellation and invalidation criteria](house-solution-confirmations/HSC-035-case-cancellation-invalidation-criteria.md) | 2026-10-05全体取消の事前保険報告取消は不要と再確認。外部減少報告はHS。個別の情報補正・旧データ対応は残る | House Solution |
| HSC-036 | [Insurance Reporting Cycle](house-solution-confirmations/HSC-036-insurance-reporting-cycle.md) | 2026-10-08：上限到達の保証案内除外・最長10年対応はDev反映済み。UHも共通保険ルール。保険満了一覧の用途等・HS受入は残件。初回対象月・月内終了のHS選択は既決。現在のCSVは日付自動補完なし | House Solution |
| HSC-037 | [保証書・保証グループ](house-solution-confirmations/HSC-037-warranty-groups.md) | 初期CSVまで、保証書出力は後発。グループ訂正機能も後発 | House Solution |
| HSC-038 | [Construction-company Branches and Document Recipients](house-solution-confirmations/HSC-038-company-branches-recipients.md) | Initial dispatch/recipient management excluded; address-label CSV not adopted; hierarchy confirmed, remaining portal effects deferred | House Solution |
| HSC-015 | [初期データ登録準備](house-solution-confirmations/HSC-015-migration-scope-cleaning.md) | 資料は揃ったとの報告。オーナーの投入準備データ提供まで保留。旧訂正依頼を繰り返さない | House Solution, then project |
| HSC-013 | [Construction-company submission and review](house-solution-confirmations/HSC-013-construction-company-submission.md) | Initial entry by HS confirmed; company functionality retained, rollout deferred | House Solution, then project |

## Resolved Matters

| ID | Matter | Decision date | Decision owner | Evidence |
| --- | --- | --- | --- | --- |
| HSC-039 | [物件名と施主名の関係](house-solution-confirmations/HSC-039-property-homeowner-name.md) | 2026-10-07 | House Solution / Project owner | 物件名に統合、6b2573dでDev反映・移行済み |
| HSC-022 | [Production database selection](house-solution-confirmations/HSC-022-production-database-selection.md) | 2026-10-08 | Project owner | Firestore採用確定。ADR0038。Dev計測は別作業 |
| HSC-032 | [Case-list year/month basis](house-solution-confirmations/HSC-032-case-list-month-basis.md) | 2026-10-03 | Project owner | Existing answers reconciled: insurance handover/expiry months; billing application/extension-procedure months; ordinary search optional |
| HSC-004 | [Production case-number rules](house-solution-confirmations/HSC-004-case-number-rules.md) | 2026-10-03 | Project owner | Full-number exact search without inferred prefix/year; numbering/lifecycle business rules confirmed; import HSC-015 and technical verification remain |
| HSC-008 | [Master-list behavior](house-solution-confirmations/HSC-008-master-list-behavior.md) | 2026-10-03 | Project owner | Prototype-based initial columns and confirmed hierarchy/status; no personalized columns or bulk editing; technical query decisions in HSC-023/022, implementation pending |
| HSC-005 | [Notification workflow and history](house-solution-confirmations/HSC-005-notification-workflow.md) | 2026-10-03 | Project owner | Initial notification lifecycle confirmed including cancellation/restoration and verified legacy notified states; implementation pending, portal reassessment in HSC-013 |
| HSC-026 | [Scale and response-time targets](house-solution-confirmations/HSC-026-scale-performance-targets.md) | 2026-10-03 | Project owner | Initial approximately two concurrent users; cumulative count from initial data; not a usage cap, measurement/technical choices remain HSC-015/022/023 |
| HSC-003 | [Case field validation](house-solution-confirmations/HSC-003-case-field-validation.md) | 2026-10-04 | Project owner | Initial business validation confirmed; same address/name warning abolished by owner. Local implementation; Dev deployment pending |
| HSC-028 | [Business-flow error handling](house-solution-confirmations/HSC-028-error-handling.md) | 2026-10-03 | Project owner | Retain inputs, verify save outcome before retry, prevent duplicate registration/numbering/extension; technical design and testing pending |
| HSC-027 | [Business success measures](house-solution-confirmations/HSC-027-business-success-measures.md) | 2026-10-03 | Project owner | Initial acceptance: agreed workflows and correct data/results; no business-effect percentage targets |
| HSC-029 | [Remaining data-model rules](house-solution-confirmations/HSC-029-remaining-data-model-rules.md) | 2026-10-03 | Project owner | Initial ownership/affiliation rules confirmed including prior-owner history and original dates on re-registration; technical design remains, import in HSC-015 |
| HSC-019 | [Address and contact-field validation](house-solution-confirmations/HSC-019-address-contact-validation.md) | 2026-10-03 | Project owner | TEL/FAX ASCII digits and hyphens retained; free-text relaxation rejected; property postal optional and existing address/auth rules retained |
| HSC-031 | [Mobile-device usage and support scope](house-solution-confirmations/HSC-031-mobile-device-support.md) | 2026-10-03 | Project owner | Initial Windows Chrome/Edge testing scope confirmed; mobile reconsideration deferred until portal rollout |
| HSC-006 | [Dashboard presentation and accessibility](house-solution-confirmations/HSC-006-dashboard-presentation.md) | 2026-10-03 | Project owner | Initial release extends prototype; dashboard redesign deferred, not an initial acceptance requirement |
| HSC-016 | [Cutover, parallel operation, and rollback](house-solution-confirmations/HSC-016-cutover-rollback.md) | 2026-10-03 | Project owner | New system becomes source after HS import acceptance; no management-Excel double entry; invoice Excel/Word retained |
| HSC-024 | [Role types and functional permissions](house-solution-confirmations/HSC-024-role-business-data-access.md) | 2026-10-03 | Project owner | Initial HS business operations shared; user management/settings administrator-only; new archive deletion authority remains HSC-001, portal reconsideration HSC-013 |
| HSC-033 | [Branch management necessity](house-solution-confirmations/HSC-033-branch-management-necessity.md) | 2026-10-01 | Project owner | HS branches excluded; specification reflected, implementation pending |
| HSC-007 | [Case search and list behavior](house-solution-confirmations/HSC-007-case-search-list.md) | 2026-09-14 | Project owner | Current Codex task: date-range and list-behavior approval |
| HSC-009 | [Editing masters already used by cases](house-solution-confirmations/HSC-009-used-master-editing.md) | 2026-09-17 | Project owner | Current Codex task: no use-based snapshot, warning, reason, approval, or edit-history requirement |
| HSC-011 | [Legal and operational data ownership](house-solution-confirmations/HSC-011-data-ownership.md) | 2026-09-17 | Project owner | Current Codex task: data responsibility and decision authority under House Solution direction |
| HSC-012 | [Homeowner system access](house-solution-confirmations/HSC-012-homeowner-access.md) | 2026-09-17 | Project owner | Current Codex task: no direct homeowner access in the initial release |
| HSC-014 | [Legacy FileMaker data delivery](house-solution-confirmations/HSC-014-legacy-data-delivery.md) | 2026-09-11 | House Solution | Current Codex task instruction: existing-system data migration is not required |
| HSC-017 | [Japan Post postal data and lookup operations](house-solution-confirmations/HSC-017-postal-api-conditions.md) | 2026-09-17 | Project owner | Current Codex task: replace Google lookup with Japan Post nationwide CSV |
| HSC-018 | [Construction-company postal-code lookup](house-solution-confirmations/HSC-018-company-postal-lookup.md) | 2026-09-14 | Project owner | Current Codex task: same lookup behavior as property/homeowner |
| HSC-020 | [Production Firebase environment and operations](house-solution-confirmations/HSC-020-production-firebase-operations.md) | 2026-09-17 | Project owner | Current Codex task: House Solution production ownership and bounded operations plan |
| HSC-021 | [Account creation, deletion, and recovery](house-solution-confirmations/HSC-021-account-lifecycle.md) | 2026-09-14 | Project owner, then project | Current Codex task: reversible account lifecycle |
