# Architecture and Product Decisions

## Statuses

- Proposed
- Provisional
- Accepted
- Rejected
- Superseded

## Index

| ID | Decision | Status | Date |
|---|---|---|---|
| [0048](0048-explicit-lightweight-development-deployment.md) | 明示起動の軽量Dev・受入れ後PR（Local改修・未切替） | Accepted | 2026-10-16 |
| [0047](0047-single-verification-and-nonproduct-pr.md) | 統合前の一度の検証・非製品1PR・受入れ記録分離（main統合済み、実配備未実証） | Accepted | 2026-10-15 |
| [0046](0046-verification-reuse-and-dev-acceptance.md) | 同一内容のPR検証再利用とDev受入れ記録 | Accepted | 2026-10-14 |
| [0045](0045-legacy-property-list-retirement.md) | 旧一覧条件の拒否と所属付き保証案内 | Accepted | 2026-10-13 |
| [0044](0044-branch-code-targeted-reads.md) | 本支店の既存コード管理記録による対象読取り | Accepted | 2026-10-13 |
| [0043](0043-group-prefix-equality.md) | 保証接頭辞の完全一致・使用先記録なし・既存ID維持 | Accepted | 2026-10-13 |
| [0042](0042-project-owned-governance.md) | プロジェクト所有のガバナンスと検証分類 | Accepted | 2026-10-10 |
| [0041](0041-insurance-period-reporting-status.md) | 保険期間別の報告不要・今日基準の未報告件数（実装未着手） | Accepted | 2026-10-10 |
| [0040](0040-dashboard-session-store.md) | ダッシュボード件数の共有Store（実装未着手） | Accepted | 2026-10-10 |
| [0039](0039-monthly-query-projections.md) | 保険／請求の月別検索用項目 | Accepted | 2026-10-08 |
| [0038](0038-production-firestore.md) | 本番DBはFirestore | Accepted | 2026-10-08 |
| [0037](0037-reference-store-observability.md) | 共有参照Storeと使用量の観測 | Accepted | 2026-10-08 |
| [0036](0036-account-mutation-serialization.md) | アカウント更新の直列化と結果不明時の復旧 | Accepted | 2026-10-05 |
| [0035](0035-warranty-interval-lifecycle.md) | 保証区間に紐づく請求・保険報告と逆順取消 | Accepted | 2026-10-04 |
| [0034](0034-company-registration-without-hs-review.md) | 工務店による承認待ちなしの新規登録・延長（所属保証グループ変更の部分は2026-10-08訂正） | Accepted; implementation pending | 2026-10-01 |
| [0001](0001-provisional-access-control-posture.md) | Provisional access-control posture | Provisional | 2026-09-10 |
| [0002](0002-prototype-stack-and-search.md) | Prototype stack and free-text search | Accepted | 2026-09-10 |
| [0003](0003-firebase-authentication-and-account-lifecycle.md) | Firebase Authentication and account lifecycle | Accepted | 2026-09-10 |
| [0004](0004-account-lifecycle-enforcement.md) | Account lifecycle enforcement | Accepted | 2026-09-10 |
| [0005](0005-spa-and-session-persistence.md) | SPA and browser-session persistence | Accepted | 2026-09-10 |
| [0006](0006-account-management-roles.md) | Account-management roles | Accepted | 2026-09-10 |
| [0007](0007-development-and-production-isolation.md) | Development and production isolation | Accepted | 2026-09-10 |
| [0008](0008-postal-code-address-api.md) | Postal-code address API | Superseded | 2026-09-10 |
| [0009](0009-warranty-extension-history.md) | Warranty-extension history | Superseded for warranty by 0033 | 2026-09-10 |
| [0010](0010-best-effort-legacy-migration.md) | Best-effort legacy-data migration | Superseded | 2026-09-10 |
| [0011](0011-no-initial-audit-log.md) | No initial operation-history or audit log | Accepted | 2026-09-10 |
| [0012](0012-parallel-cutover-strategy.md) | Parallel cutover strategy | Superseded | 2026-09-10 |
| [0013](0013-local-emulator-verification.md) | Local emulator verification before development environment | Accepted | 2026-09-10 |
| [0014](0014-preserve-case-party-references.md) | Preserve existing case party references | Accepted | 2026-09-11 |
| [0015](0015-no-legacy-data-migration.md) | No legacy-data migration | Accepted | 2026-09-11 |
| [0016](0016-master-last-write-wins.md) | Master last-write-wins | Accepted | 2026-09-12 |
| [0017](0017-bounded-default-list-subscriptions.md) | Bounded default list subscriptions | Accepted | 2026-09-12 |
| [0018](0018-direct-master-writes.md) | Direct master writes under the provisional access posture | Superseded | 2026-09-12 |
| [0019](0019-remove-unused-profile-callable.md) | Remove the unused profile Callable | Accepted | 2026-09-12 |
| [0020](0020-local-port-allocation.md) | Dedicated local ports with AirGuardV2 priority | Accepted | 2026-09-12 |
| [0021](0021-user-authored-ui-component-collaboration.md) | User-authored UI component collaboration | Accepted | 2026-09-12 |
| [0022](0022-google-geocoding-postal-lookup.md) | Google Geocoding for postal-code lookup | Superseded | 2026-09-12 |
| [0023](0023-construction-company-portal-prototype.md) | Construction-company portal workflow | Accepted | 2026-09-13 |
| [0024](0024-same-site-password-action-handler.md) | Same-site password action handler | Accepted | 2026-09-13 |
| [0025](0025-authentication-focused-firestore-rules.md) | Authentication-focused Firestore Rules | Accepted | 2026-09-14 |
| [0026](0026-complete-filtered-list-results.md) | Complete filtered list results in the prototype | Accepted | 2026-09-14 |
| [0027](0027-filtered-list-pagination.md) | Filtered-list pagination | Accepted | 2026-09-14 |
| [0028](0028-independent-service-release-boundary.md) | Independent-service release boundary | Accepted | 2026-09-14 |
| [0029](0029-data-responsibility-and-decision-authority.md) | Data responsibility and decision authority | Accepted | 2026-09-17 |
| [0030](0030-no-initial-homeowner-access.md) | No initial homeowner access | Accepted | 2026-09-17 |
| [0031](0031-japan-post-postal-data.md) | Japan Post postal data for postal-code lookup | Accepted | 2026-09-17 |
| [0032](0032-production-firebase-operations.md) | Production Firebase environment and operations | Accepted | 2026-09-17 |

| [0033](0033-permanent-property-warranty.md) | One permanent warranty per property; 2026-10-07 UH receipt linkage by internal ID | Accepted; UH linkage implementation pending | 2026-09-29; amendment 2026-10-07 |

## Template

```markdown
# NNNN Decision title

- Date: YYYY-MM-DD
- Status: Proposed / Accepted / Rejected / Superseded
- Related specification: [section]
- Supersedes: [if applicable]

## Context

## Decision

## Rationale

## Alternatives

## Impact

## Migration

## Reconsider When
```
