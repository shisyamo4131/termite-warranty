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
| HSC-043 | [保証グループ別の最大保証期間と選択制限](house-solution-confirmations/HSC-043-group-warranty-year-limit.md) | 要検討。UH10年の保存・取込み制限は既存。画面は全グループで10／20／30年を提示するため、グループ設定と画面制御の統一を検討。実装未承認 | Project owner / House Solution |
| HSC-041 | [ログイン通信失敗の原因と認証サービス側ログ](house-solution-confirmations/HSC-041-authentication-diagnostics.md) | 診断はDev実受信済み。サービス切替なしで観測継続と決定。通信失敗の原因は未特定 | Project owner / Project |
| HSC-010 | [請求先単位・対象年月・請求状態](house-solution-confirmations/HSC-010-payer-contracting-party.md) | 保証グループ別・当月以前の未請求抽出はDev反映済み。10/12に1グループ1請求先8項目をオーナーがDev検証し受入れOK。11列CSV維持。グループ間自動合算は追加せず、請求書本体等は後発 | Project / House Solution |
| HSC-001 | [Case, applied-warranty, and referenced-master data retention](house-solution-confirmations/HSC-001-data-retention-policy.md) | 終了分のCSV保管後削除・開発側復元は確定。取消済みもCSVをHS保管後に削除可（2026-10-05）、後発実装。トリガー・詳細は未確定 | House Solution |
| HSC-002 | [Initial-release acceptance scope](house-solution-confirmations/HSC-002-release-acceptance-scope.md) | HS operators verify, HS president approves launch, AriLabo coordinates confirmed; actual launch date undecided, final acceptance preparation remains | House Solution |
| HSC-023 | [Firestore取得・検索設計](house-solution-confirmations/HSC-023-ngram-query-consistency.md) | 月別DB12条件一致、Chromeで10月保険の画面・CSV・ログ305件一致。300件プレビュー中央値1,031ms・全行照合済み。月切替12条件・請求CSVも実画面照合済み。2担当者の採番・二重取込・保存競合は確認済み。実初期規模・多数利用者／長時間負荷等が残る | Project / HS business decision |
| HSC-025 | [Production service and risk requirements](house-solution-confirmations/HSC-025-production-service-requirements.md) | 通知先はオーナーGoogleアカウント、予算設定は後発。運用窓口は確定、対応時間等の残条件は詳細参照 | House Solution |
| HSC-030 | [Custom authentication-email sender](house-solution-confirmations/HSC-030-custom-auth-email-sender.md) | Deferred | House Solution, if requested |
| HSC-034 | [Deterioration countermeasure grade and warranty limit](house-solution-confirmations/HSC-034-deterioration-countermeasure-grade.md) | Manual cap selection and later HS edits confirmed; no reduction below granted 30 years; business eligibility remains outside automation | House Solution |
| HSC-035 | [Case cancellation and invalidation criteria](house-solution-confirmations/HSC-035-case-cancellation-invalidation-criteria.md) | 2026-10-05全体取消の事前保険報告取消は不要と再確認。外部減少報告はHS。個別の情報補正・旧データ対応は残る | House Solution |
| HSC-036 | [Insurance Reporting Cycle](house-solution-confirmations/HSC-036-insurance-reporting-cycle.md) | 2026-10-21：UH住所・過去期間自動不要化・満了後操作は本人Dev受入れ済み。保険満了案内と保険用アラート設定の削除を採用、改修中。CSV印の別論点は継続 | House Solution / AriLabo / オーナー |
| HSC-037 | [保証書・保証グループ](house-solution-confirmations/HSC-037-warranty-groups.md) | グループ抽出・期間別発行/取消はDev検証済み。10/12に年月日分割を含む共通21列・選択期間の再出力を実装。検証・配備は運用記録参照。Wordとの実差込み確認、保証書生成・印刷・グループ訂正は残る | Project / House Solution |
| HSC-038 | [Construction-company Branches and Document Recipients](house-solution-confirmations/HSC-038-company-branches-recipients.md) | Initial dispatch/recipient management excluded; address-label CSV not adopted; hierarchy confirmed, remaining portal effects deferred | House Solution |
| HSC-015 | [初期データ登録・受入れ](house-solution-confirmations/HSC-015-migration-scope-cleaning.md) | Devへ442物件を既存番号で投入・全件照合し、別了承で通常再開済み。代表画面・各CSV・架空1件の採番／編集／請求／取消・実442件不変・ログを確認しHI-06完了。HS試験運用・受入れは継続 | House Solution, supported by Project |
| HSC-013 | [Construction-company submission and review](house-solution-confirmations/HSC-013-construction-company-submission.md) | Initial entry by HS; legacy portal closure adopted, company/branch authorization and verification mandatory before deferred reopening | House Solution, then project |

## Resolved Matters

| ID | Matter | Decision date | Decision owner | Evidence |
| --- | --- | --- | --- | --- |
| HSC-040 | [郵便番号データの定期自動更新](house-solution-confirmations/HSC-040-postal-data-automatic-update.md) | 2026-10-20 | Project owner | zipcloud採用で独自定期更新案を置換（ADR0050）。Local検証・受入れ・配備と納品書は別工程 |
| HSC-042 | [月別一覧の過去未処理分と処理済みの抽出範囲](house-solution-confirmations/HSC-042-monthly-list-carryover.md) | 2026-10-12 | Project owner | 指定月の前月を基準に、通常は過去を含む未処理、済みを含める時は前月だけの未処理・処理済みを採用。チェック時は過去未処理も除外。確定仕様・実装・検証・Dev反映済み。Chromeの読取操作・実CSV出力も確認。HS受入れ・別途回答とは区別 |
| HSC-006 | [ダッシュボードの仕様整理](house-solution-confirmations/HSC-006-dashboard-presentation.md) | 2026-10-10 | Project owner | Q30で詳細設計を確定し、後続承認でDev導入済み。追加指示で保険期間を古い順へ変更し、一覧選択の余白を除去。検証・受入はロードマップDB-04〜06 |
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
| HSC-016 | [Cutover, parallel operation, and rollback](house-solution-confirmations/HSC-016-cutover-rollback.md) | 2026-10-03 | Project owner | New system becomes source after HS import acceptance; no management-Excel double entry; invoice Excel/Word retained |
| HSC-024 | [Role types and functional permissions](house-solution-confirmations/HSC-024-role-business-data-access.md) | 2026-10-03 | Project owner | Initial HS business operations shared; user management/settings administrator-only; new archive deletion authority remains HSC-001, portal reconsideration HSC-013 |
| HSC-033 | [Branch management necessity](house-solution-confirmations/HSC-033-branch-management-necessity.md) | 2026-10-01 | Project owner | HS branches excluded; specification reflected, implementation pending |
| HSC-007 | [Case search and list behavior](house-solution-confirmations/HSC-007-case-search-list.md) | 2026-09-14 | Project owner | Current Codex task: date-range and list-behavior approval |
| HSC-009 | [Editing masters already used by cases](house-solution-confirmations/HSC-009-used-master-editing.md) | 2026-09-17 | Project owner | Current Codex task: no use-based snapshot, warning, reason, approval, or edit-history requirement |
| HSC-011 | [Legal and operational data ownership](house-solution-confirmations/HSC-011-data-ownership.md) | 2026-09-17 | Project owner | Current Codex task: data responsibility and decision authority under House Solution direction |
| HSC-012 | [Homeowner system access](house-solution-confirmations/HSC-012-homeowner-access.md) | 2026-09-17 | Project owner | Current Codex task: no direct homeowner access in the initial release |
| HSC-014 | [Legacy FileMaker data delivery](house-solution-confirmations/HSC-014-legacy-data-delivery.md) | 2026-09-11 | House Solution | Current Codex task instruction: existing-system data migration is not required |
| HSC-017 | [Japan Post postal data and lookup operations](house-solution-confirmations/HSC-017-postal-api-conditions.md) | 2026-09-17 | Project owner | 2026-10-20後続決定：zipcloudのLocal実装・検証を採用（ADR0050） |
| HSC-018 | [Construction-company postal-code lookup](house-solution-confirmations/HSC-018-company-postal-lookup.md) | 2026-09-14 | Project owner | Current Codex task: same lookup behavior as property/homeowner |
| HSC-020 | [Production Firebase environment and operations](house-solution-confirmations/HSC-020-production-firebase-operations.md) | 2026-09-17 | Project owner | Current Codex task: House Solution production ownership and bounded operations plan |
| HSC-021 | [Account creation, deletion, and recovery](house-solution-confirmations/HSC-021-account-lifecycle.md) | 2026-09-14 | Project owner, then project | Current Codex task: reversible account lifecycle |
