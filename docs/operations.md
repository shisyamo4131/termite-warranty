# Operations

## Current Availability

[Implemented, planned, and unavailable capabilities.]

## Preparation

[Dependencies, configuration, access, and safe sample data.]

## Normal Operation

[Verified steps only. Select required gates from the matrix below instead of listing every known command as unconditionally mandatory. Each selected validator, test, build, lint, migration check, or other gate must expose its result and exit status. If checks are grouped, require a verified fail-fast wrapper or verified aggregate runner that preserves each included gate's named result and exit status and exits nonzero when any check fails. Prohibit `;` or other status-masking chains as completion evidence. Label diagnostic batches and prohibit reusing them for completion, handoff, commit, integration, or release decisions.]

## Verification Matrix

`governance/verification-policy.json` is the machine-readable source for class selection, stable gate IDs, stages, inclusion, invalidation, comprehensive fallback, and omission destinations. This document explains the same policy for humans. Classify all applicable rows before implementation. Mixed changes use the union of selected gates. Unknown or unbounded impact uses the comprehensive project suite. Replace the JSON template placeholders with verified project commands and triggers; do not assume every project has the same fast checks.

The same JSON is the sole runtime-profile authority for compatibility-sensitive migration work. Declare platform, PowerShell edition, executable, a non-exact version rule, required status, and support status; do not infer that an untested platform is supported.

Every literal `.ps1` path in a gate command must identify an existing script. The managed project validator's canonical path is `scripts/check-governance.ps1`.

| Change class | Path or impact triggers | Iteration checks | Targeted regression | Completion gates | Release-only gates | Omittable when unaffected |
| --- | --- | --- | --- | --- | --- | --- |
| `documentation-only` | Markdown, help text, indexes; no executable/config/data behavior | Project-defined direct docs gate IDs | Project-defined affected navigation gate IDs | Project-defined docs completion gate IDs | None unless packaging docs | application, UI runtime, data, governance, build/deploy |
| `ui-css-layout` | styles, templates, components, visual or interaction layout; no data-contract change | Project-defined focused UI gate IDs | Project-defined component/browser/visual/accessibility gate IDs | Project-defined UI completion gate IDs | Artifact/browser matrix only when releasing | data/schema/migration and governance gates when untouched |
| `application-logic` | executable business or integration logic | Project-defined focused static/unit gate IDs | Project-defined service/domain/integration gate IDs | Project-defined application completion gate IDs | Release artifact gates only when releasing | unrelated data, UI, governance, deploy gates |
| `data-contract-schema-migration` | schema, serialization, persistence meaning, compatibility, migration | Project-defined focused contract/schema gate IDs | Project-defined compatibility/migration/reader-writer gate IDs | Project-defined data safety and application gate IDs | Real migration/deploy gates only when authorized | unrelated UI and governance gates |
| `project-guidance-metadata` | descriptive project guidance, phase/progress, project metadata, links/history, GOV-DOC-only structure | Project-defined diff/static gate IDs | Project-defined narrow documentation gates | Project-defined narrow documentation gates | none | comprehensive, application, build, and runtime gates |
| `governance-permissions-agents` | common/managed governance or effective permission, approval, safety, authority, delegation/Git integration, callback semantics, active-task instruction, agent authority, managed sync, verification behavior | Project-defined syntax/render gate IDs | Project-defined governance/routing gate IDs | Comprehensive governance/repository gate IDs | Installation/publication gates only when authorized | unrelated product runtime gates unless governance changes them |
| `build-release-deploy` | build configuration, packaging, release, install, deploy target or procedure | Project-defined configuration gate IDs | Project-defined build/package gate IDs | Project-defined artifact/rollback gate IDs | Publish/install/deploy/environment acceptance gate IDs | unrelated product/data gates only when impact analysis proves exclusion |

<!-- BEGIN GENERATED VERIFICATION POLICY SUMMARY -->
- Root: schemaVersion=1.0; comprehensiveGateIds=[governance-check]; unknownImpactGateIds=[governance-check]
- RuntimeProfile: id=powershell; platform=windows; edition=PowerShell; executable=pwsh; versionRule=minimum-major=7; required=True; supportStatus=supported
- Class: id=documentation-only; triggers=[Markdown or documentation files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=ui-css-layout; triggers=[UI\, CSS\, or layout files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=application-logic; triggers=[application source files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=data-contract-schema-migration; triggers=[schema\, migration\, or data-contract files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[governance-check]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=project-guidance-metadata; triggers=[project guidance and metadata files]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=governance-permissions-agents; triggers=[governance\, permissions\, or agent configuration files,Explicit-only skill invocation policy or instruction-entrypoint routing]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[]; omittableGateIds=[]; omissionRecord=task completion report
- Class: id=build-release-deploy; triggers=[build\, release\, or deploy configuration]; iterationGateIds=[governance-check]; targetedRegressionGateIds=[governance-check]; completionGateIds=[governance-check]; releaseOnlyGateIds=[governance-check]; omittableGateIds=[]; omissionRecord=task completion report
- Gate: id=governance-check; command=./scripts/check-governance.ps1; stages=[iteration,targeted,completion,release]; includes=[]; invalidatedBy=[any governance input\, policy\, configuration\, or managed artifact change]; evidenceDestination=task completion report
<!-- END GENERATED VERIFICATION POLICY SUMMARY -->

### Gate Catalog and Inclusion

The exact marker-bounded summary immediately above is the generated gate catalog. It preserves commands containing pipelines without parsing Markdown table separators. Do not maintain a second manual gate table.

The inclusion graph must be acyclic and may not reference an unknown gate. When a selected parent gate preserves an included child's named result and exit status and fails when the child fails, do not invoke that child again as an unconditional separate command. A diagnostic run never satisfies a completion gate.

### Evidence Validity and Retry

- Record passing counts, acceptance, and completion evidence only after the command completes with exit status 0.
- Bind evidence to the applicable revision or worktree state and impact classification.
- After failure or a later edit, rerun the failed gates and any gates invalidated by the changed paths, configuration, dependencies, generated artifacts, or environment. Unaffected successful evidence may be reused only when the matrix proves it remains valid.
- Record omitted gates and matrix-based reasons in [task callback, completion report, or durable release evidence]. Never omit a gate merely to avoid a known failure.
- Preserve comprehensive validation for scaffold creation, governance migration, managed sync, common-contract changes, permission/agent-policy changes, and release/deploy operations.

## Migration Orchestration

[Use existing specification and roadmap facts for migration scope, progress, and next work. Select checks from the project verification policy and report actual results.]

## Git Integration

[Require every project task to use the repository in the user-configured primary working directory. Prohibit task-specific linked worktrees and alternate repository copies unless the user explicitly approves a stated reason, path, branch, owner, integration method, lifetime, and cleanup plan. If an unapproved separate worktree is discovered, preserve it and stop state-changing work there pending user direction. Prefer delegated tasks to edit and validate owned files, then report exact files, diff, tests, unverified items, and worktree state. Record that the coordinator reviews the result, stages only accepted owned files, creates the commit, and performs integration. Reuse reviewed task commits rather than duplicating them. When project-local permission profiles and auto-review are used, record the selected settings, external-write restrictions, file-scoped Git procedure, and failure behavior.]

## Project Management Task Loop

[For ongoing coordinated work, prefer event-driven task-to-task chat. Record coordinator and task IDs/hosts as routing metadata, worktree, checkpoint contract, user-defined ending condition, callback destination, ordinary delegated-task no-change callback, one-shot notification behavior, coordinator verification and Git integration, next-instruction rule, final summary, immediate-report exceptions, and callback/abrupt-shutdown recovery. Coordinator replacement routes to `references/task-turnover-contract.md`. Keep routine task traffic out of user-facing reports. If callbacks are unavailable or the user explicitly chooses scheduled polling, record cadence, targets, silent delta-only behavior, stop condition, and recovery as a fallback.]

## Critical Identifier Preflight

[Name the project-local authoritative sources and deterministic commands for package name/version/integrity, repository and Git references, environment/project/database IDs, deploy targets, and data targets. Require verification in the current turn before presenting an identifier as confirmed in a delegation and again by the delegated task before state change. Permit read-only discovery of explicitly unconfirmed values. Treat prompts and agent reports as leads only. Stop on missing or contradictory metadata without an application diff. For published artifacts, compare source or tag manifest, release or registry evidence, and consumer manifest or lock name, version, resolved location, and integrity; leave unapproved remote verification explicitly unverified.]

## Governance Updates and Task Turnover

[Managed sync refreshes the common contract, generated instructions, validators, lock, and policy summary. A user-requested replacement follows the two-step procedure in references/task-turnover-contract.md; every new task uses ordinary repository startup.]

## Coordinator Session Lifecycle

[Use ordinary repository startup for every task, including manual creation and recovery when the previous task is unavailable. On user-requested replacement, first update authoritative facts and next work and commit sensible groups to a clean primary repository; then create a fresh non-fork task with the same base name and next sequence. Keep ordinary delegated callbacks separate. Capacity measurement uses the route below.]

Route `容量チェック`, `タスク容量確認`, `セッション容量確認`, and `session size / handoff threshold確認` through `docs/runbooks/project-coordination.md`. Require the current task ID, the project-local `scripts/check-codex-session-size.ps1`, the default 300 MiB handoff threshold, the 10 GiB Codex-wide warning threshold, standard report fields, and the stop/error contract. Do not confuse task/session storage with model token or context-window capacity.

## Outputs

[Where results appear and how success is confirmed.]

## Errors and Recovery

[Failure categories, safe retry rules, rollback, and escalation.]

## Backup and Retention

[Project-specific rules.]

## Sensitive Information

[How secrets and private data are handled.]
