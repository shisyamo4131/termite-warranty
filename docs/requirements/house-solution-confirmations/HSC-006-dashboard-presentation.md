# HSC-006: Dashboard Presentation and Accessibility

## 2026-10-03 Resolution — 初期は試作ベース、ダッシュボードは将来

初期は試作版をベースに必要機能の実装を優先する。ダッシュボード化は将来構想で、直前の「対応対象を集約した初期画面」の提案も今回必須にしない。過去の未採用ダッシュボード案・統計・強調表示案は初期受入条件から外す。既決の満了案内や保険報告の必要機能は維持する。

初期範囲の判断として解決。将来ダッシュボードへ進む際に表示・集計・アクセシビリティ要件を改めて整理する。決定者：オーナー、日付・根拠：2026-10-03本Codex会話①。仕様書0.1.75、alerts-and-dashboardへ反映。未コミット・文書のみ。質疑を終える前に実装開始する新たな指示とは解釈しない。

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

The dashboard lists alert-eligible cases and marks cases with an unnotified applied warranty. Exact presentation limits and emphasis behavior remain open.

## Project Recommendation for Discussion — Not House Solution-Confirmed

### Dashboard purpose and summary

Treat the dashboard as an operational action queue, not as potentially misleading statistics derived from only the latest 20 records. Recommend summary counts for:

- Expired and unresolved renewal.
- Awaiting House Solution review.
- Expiring within 7 days.
- Expiring within 30 days with renewal still unrequested.

Counts should cover the intended actionable dataset or clearly disclose their scope; they must not imply global totals when they are calculated from a limited window. This recommendation depends on the HSC-005 renewal-handling decision and HSC-026 query/performance decisions and does not claim that the current prototype implements it.

### Action list

- Show 20 rows per page with pagination; do not silently truncate the actionable list.
- Recommend columns in this priority: priority, case number, homeowner, property address, construction company, responsible branch, target warranty, expiry date, and renewal-handling status.
- Align pending HSC-005 terminology: `unrequested`, `awaiting company response`, `company draft`, `awaiting HS review`, `needs correction`, `renewed/registered`（更改済み）, and `renewal declined`（更改辞退）.
- Exclude `renewed/registered`（更改済み） and `renewal declined`（更改辞退） items from the default action list, while making them available through a filter or history view.
- Keep the current confirmed one-row-per-case behavior. As a proposal, aggregate child applied-warranty states for the row and link to case detail with the target warranty emphasized; make the portal response reachable where applicable.
- Prioritize rows in this order: expired but unresolved; awaiting House Solution review; within 7 days and unrequested or awaiting company response; then 8–30 days. Use earliest expiry as the tie-breaker.
- Exclude cancelled and invalid cases and cancelled and invalid applied warranties.

### Reduced accessibility boundary for initial release

For the fixed internal-user context, recommend that initial-release acceptance exclude a screen-reader/read-aloud feature, dedicated screen-reader optimization or acceptance, custom arrow-key navigation or keyboard shortcuts, exhaustive keyboard-only workflow acceptance, and formal WCAG 2.2 AA certification. This is a scope recommendation, not a legal conclusion.

Retain this low-cost baseline:

- Do not convey state or priority by color alone; retain readable contrast from the existing theme.
- Use the case number as an ordinary link and pagination as ordinary buttons.
- Provide accessible names for icon-only controls.
- Do not remove browser or component default focus indication.
- Use ordinary semantic table headings.
- Rely on standard browser/Vuetify Tab and Enter behavior without special keyboard UI.

Specific user needs or policy/legal requirements could reopen this boundary.

## Questions

1. Does House Solution accept or revise the dashboard's operational-queue purpose, summary counts, disclosed count scope, 20-row pagination, navigation, and HSC-005/HSC-026 dependencies?
2. Does House Solution accept or revise the proposed columns, child-warranty aggregation, renewal-handling terminology, default exclusions/history filter, and priority order?
3. Does House Solution accept or revise the reduced accessibility boundary and retained baseline, including any specific user, policy, or legal needs that should reopen the scope?

## Affected Documents

Dashboard requirements, visual design, UI implementation, and acceptance tests.
