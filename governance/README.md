# Project Governance Index

This is the entry point for project-specific governance. It keeps operating rules short and routes detail to the authoritative document for each subject.

## Start Here

1. Read [project rules](project-rules.md).
2. Read the [documentation map](../docs/README.md).
3. Read the current [specification](../docs/specification.md) and only the task-routed record under [requirements](../docs/requirements/README.md).

## Governance Topics

| Topic | Authority |
| --- | --- |
| Project-specific instructions, safety, approval boundaries, and task lifecycle | [project-rules.md](project-rules.md) |
| Current confirmed requirements and open decisions | [specification](../docs/specification.md) |
| Business context and terms | [business context](../docs/requirements/business-context.md) |
| Current and target business workflows | [workflow](../docs/requirements/workflow.md) |
| Future construction-company submission alternatives | [external submission options](../docs/requirements/external-submission-options.md) |
| Provisional business entities and notification state | [initial data model](../docs/requirements/initial-data-model.md) |
| Initial search and list requirements | [search and list](../docs/requirements/search-and-list.md) |
| Search-architecture alternatives and constraints | [search architecture](../docs/requirements/search-architecture.md) |
| Initial master-management requirements | [master management](../docs/requirements/master-management.md) |
| Initial alert and dashboard requirements | [alerts and dashboard](../docs/requirements/alerts-and-dashboard.md) |
| Case warranty structure | [case warranties](../docs/requirements/case-warranties.md) |
| Branch and address requirements | [branches and addresses](../docs/requirements/branches-and-addresses.md) |
| Provisional security and access posture | [security and access](../docs/requirements/security-and-access.md) and [decision 0001](../docs/decisions/0001-provisional-access-control-posture.md) |
| New-service rationale and legacy-system context | [legacy and objectives](../docs/requirements/legacy-and-objectives.md) |
| Delivery approach and prototype technology | [delivery and technology](../docs/requirements/delivery-and-technology.md) |
| Delivery milestones and verified progress | [2026 initial-delivery roadmap](../docs/roadmaps/2026-initial-delivery.md) |
| Current unresolved matters, including House Solution confirmations and technical decisions | [Unresolved-matter register](../docs/requirements/house-solution-confirmations.md) |
| Shared alert and input design, including future screens | [Clear Sky theme](../docs/design/clear-sky-theme.md) and [project rules](project-rules.md#shared-ui-design-rules) |
| Verification selection and evidence reuse | [verification-policy.json](verification-policy.json), [Dev反映の目的別・変更別判断／現行ツールの制約](../docs/operations.md#dev反映で確認する目的と範囲), and [evidence validity / retry](../docs/operations.md#evidence-validity-and-retry); selecting the comprehensive gates does not itself require rerunning every command |
| Local受入れ試験データの操作（都度承認不要） | [恒常承認の範囲](project-rules.md#local受入れ用データの恒常承認) |
| 検証データ・採番変更の隔離と後片付け | [project rules](project-rules.md#検証データ採番変更を実運用へ残さない) |
| 常用Localと自動試験の競合・試験データの準備 | [利用調整・用途別分離](../docs/operations.md#localと自動試験の利用調整)、[変更した入口と既存試験の準備確認](../docs/operations.md#検証の進め方) |
| Durable architecture or product decisions | [decisions](../docs/decisions/README.md) |
| User-authored UI component collaboration | [custom UI component runbook](../docs/runbooks/custom-ui-component-collaboration.md) and [decision 0021](../docs/decisions/0021-user-authored-ui-component-collaboration.md) |

## Local Governance Maintenance

検証・統合フローの承認済み候補は[ADR0047](../docs/decisions/0047-single-verification-and-nonproduct-pr.md)と[配備手順](../docs/runbooks/application-deployment.md)。未統合・未配備の状態を保ち、導入後は通常非製品1PR・上流の検証・記録だけでは無効化しない証拠の扱いを適用する。Prod昇格に機能試験工程を置かず、不足時はDev側または試験/CI変更の技術確認へ戻す。main→devの非製品同期は製品不変の確認と技術検証のためだけに許可し、配備しない。operationsの2026-10-12時点の固定CI制約や旧ADR0046を、新候補を旧方式へ戻す要件として使わない。必要ゲートと失効条件の正本は引き続きローカルのverification-policy.jsonである。

The project owns its governance after initial scaffolding; the installed scaffold skill is not part of maintenance. See [decision 0042](../docs/decisions/0042-project-owned-governance.md). Edit the [local contract](common-governance.md), project rules, policy or local tools; run `./scripts/render-governance.ps1 -Check` for comparison, approved `-Apply` to regenerate, then `./scripts/check-governance.ps1`. Generation touches only AGENTS, the operations policy-summary block, and local-generation lock fields. Origin hashes are retained as provenance. For render/check/helper changes, run the focused safety regression `node --test test/governance-tools.test.mjs` before the selected completion gates. `check-governance.ps1 -SourcesOnly` is internal source preflight, not completion evidence; use the ordinary checker after generation.

## Authority Boundaries

- A technology candidate, working hypothesis, or requested outcome is not an approved implementation decision.
- Update the specification only after a confirmed requirement or acceptance criterion changes.
- Record a durable decision under `docs/decisions/` only after it is explicitly made.
- Keep personal, customer, property, and credential data out of repository documents and examples.
