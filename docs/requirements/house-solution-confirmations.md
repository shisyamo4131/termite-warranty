# Unresolved-Matter Register

- Status: Active
- Purpose: Provide the sole index of current unresolved matters, including House Solution confirmations and project technical decisions.
- Detail rule: Store one matter per file under `house-solution-confirmations/`.

This register records questions and their status. It is not a source of confirmed requirements. After an answer or technical decision is explicitly approved, update the affected authoritative documents through the normal specification-change process. When asked to present unresolved matters, use this index and its linked files rather than chat history or a separate topic-document list.

When a matter is resolved, retain its detail file with the decision, decision maker/date, evidence, affected authoritative documents, and reflected revision when available. Move the row to the resolved table without deleting or reusing the ID. A chat instruction is acceptable evidence when its decision is summarized durably in the matter file and its date and available task/thread or share identifier are recorded.

## Unresolved Matters

2026-10-04更新：未解決は14大項目。前回13から、ユーザーのU04指摘によりHSC-010の請求先単位を後発確認として再開。初期の金額管理除外の決定は維持する。

- HS確認・資料待ち・運用準備を含む8項目：HSC-001/002/015/025/034/035/036/037。1項目に技術準備や将来対応が併存する場合もある。
- 開発側の技術判断2項目：HSC-022/023。HSにDB製品や実装方式の選択を求めない。
- 初期範囲から外した将来対応4項目：HSC-010/013/030/038。HSC-010の請求先単位は今回の要望によりHS確認待ち。

この件数は質問数ではない。HS向けの質問・依頼への編集結果は[整理済み資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照。唯一の未決管理は本台帳を維持する。

| ID | Matter | Status | Decision owner |
| --- | --- | --- | --- |
| HSC-040 | [郵便番号データの定期自動更新](house-solution-confirmations/HSC-040-postal-data-automatic-update.md) | 月次自動取得・検証・公開・失敗通知を検討。方式未採用／設定未実行 | Project owner |
| HSC-039 | [物件名と施主名の関係](house-solution-confirmations/HSC-039-property-homeowner-name.md) | 2026-10-05追加。物件名＝施主名か、別名称として管理するかをHS確認待ち。仕様・実装変更なし | House Solution |
| HSC-010 | [請求先単位・対象年月・請求状態](house-solution-confirmations/HSC-010-payer-contracting-party.md) | 延長後の保証開始月を2026-10-05採用、ローカル実装・機能検証済み、Dev未反映。未請求抽出・請求先単位・合算は確認待ち | House Solution |
| HSC-001 | [Case, applied-warranty, and referenced-master data retention](house-solution-confirmations/HSC-001-data-retention-policy.md) | 終了分のCSV保管後削除・開発側復元は確定。取消済みもCSVをHS保管後に削除可（2026-10-05）、後発実装。トリガー・詳細は未確定 | House Solution |
| HSC-002 | [Initial-release acceptance scope](house-solution-confirmations/HSC-002-release-acceptance-scope.md) | HS operators verify, HS president approves launch, AriLabo coordinates confirmed; actual launch date undecided, final acceptance preparation remains | House Solution |
| HSC-022 | [Production database selection](house-solution-confirmations/HSC-022-production-database-selection.md) | Open; evaluation criteria clarified 2026-10-02 | Project, with House Solution input |
| HSC-023 | [Firestore N-Gram query and consistency design](house-solution-confirmations/HSC-023-ngram-query-consistency.md) | 高優先度：物件／保証一覧の検索時全件取得を要改修。条件なしのDB limit(20)は実装済み確認。検索設計・改修は未完了 | Project technical decision |
| HSC-025 | [Production service and risk requirements](house-solution-confirmations/HSC-025-production-service-requirements.md) | HS→AriLabo→developer confirmed; response hours/cost cap undecided; owner communicated rough hundreds-of-yen monthly estimate, not independently verified or guaranteed | House Solution |
| HSC-030 | [Custom authentication-email sender](house-solution-confirmations/HSC-030-custom-auth-email-sender.md) | Deferred | House Solution, if requested |
| HSC-034 | [Deterioration countermeasure grade and warranty limit](house-solution-confirmations/HSC-034-deterioration-countermeasure-grade.md) | Manual cap selection and later HS edits confirmed; no reduction below granted 30 years; business eligibility remains outside automation | House Solution |
| HSC-035 | [Case cancellation and invalidation criteria](house-solution-confirmations/HSC-035-case-cancellation-invalidation-criteria.md) | 2026-10-05全体取消の事前保険報告取消は不要と再確認。外部減少報告はHS。個別の情報補正・旧データ対応は残る | House Solution |
| HSC-036 | [Insurance Reporting Cycle](house-solution-confirmations/HSC-036-insurance-reporting-cycle.md) | 保証/保険アラート・保険満了一覧の用途は確認待ち。初回未報告の次期間適用、満了時の減少報告不要・取消時HS対応は2026-10-05確定、対象月基準・月内終了もHSが選択と追加確定、ローカル実装・機能検証済み、Dev未反映 | House Solution |
| HSC-037 | [Warranty Groups and Certificate Templates](house-solution-confirmations/HSC-037-warranty-groups.md) | Selected-property CSV uses original start and extended expiry; print history deferred unless requested; Word mapping pending; later HS group-correction details open | House Solution |
| HSC-038 | [Construction-company Branches and Document Recipients](house-solution-confirmations/HSC-038-company-branches-recipients.md) | Initial dispatch/recipient management excluded; address-label CSV not adopted; hierarchy confirmed, remaining portal effects deferred | House Solution |
| HSC-015 | [Migration scope and data cleaning](house-solution-confirmations/HSC-015-migration-scope-cleaning.md) | Active warranties imported with HS-supplied dates; notification initially unnotified except HS-confirmed notified cases; completed source files/counts/schedule pending | House Solution, then project |
| HSC-013 | [Construction-company submission and review](house-solution-confirmations/HSC-013-construction-company-submission.md) | Initial entry by HS confirmed; company functionality retained, rollout deferred | House Solution, then project |

## Resolved Matters

| ID | Matter | Decision date | Decision owner | Evidence |
| --- | --- | --- | --- | --- |
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
