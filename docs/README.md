# Documentation Map

- Status: Active
- Last verified: YYYY-MM-DD
- Authority: Navigation only. `docs/specification.md` is authoritative for confirmed requirements and `docs/roadmaps/` for verified progress.

## Project and Governance Entry Points

- [Project governance index](../governance/README.md): project-specific governance, approval boundaries, and document routing.
- [Current specification](specification.md): authoritative summary of confirmed requirements and open decisions.
- [Requirements index](requirements/README.md): topic-specific requirement records used during discovery.
- [External submission options](requirements/external-submission-options.md): unapproved alternatives for future construction-company form submission.
- [Initial data model](requirements/initial-data-model.md): provisional business entities and fields; not an implemented schema.
- [Search and list](requirements/search-and-list.md): initial-release search filters and list requirements.
- [Search architecture](requirements/search-architecture.md): proposed approaches for free-text search and their selection criteria.
- [Master management](requirements/master-management.md): master screens and case-registration creation flow.
- [Alerts and dashboard](requirements/alerts-and-dashboard.md): continuing expiry alerts, list emphasis, and dashboard cases.
- [Case warranties](requirements/case-warranties.md): multiple warranty services and periods within a case.
- [Branches and addresses](requirements/branches-and-addresses.md): branch master, split addresses, and postal-code lookup.
- [Security and access posture](requirements/security-and-access.md): provisional access policy and explicitly recorded residual risks.
- [Delivery roadmap](roadmaps/2026-initial-delivery.md): planned milestones and verified progress for the mandatory 2026 release.
- [Environments and authentication email](requirements/environments-and-authentication-email.md): Firebase project separation and password-email delivery requirements.
- [Design index](design/README.md): implementation designs and explicitly provisional contracts.
- [Prototype Firestore data contract](design/prototype-firestore-data-contract.md): local-emulator-only collection and invariant assumptions for the first vertical slice.

## How to Start Work

1. Read `AGENTS.md`.
2. Read `governance/project-rules.md`.
3. Select the current work type from the routing table below.
4. Read the relevant roadmap and ADRs.
5. Inspect linked design, implementation, tests, and evidence before changing anything.

For project-specific verification or operations, select the applicable procedure from the routing table. Do not wait for each assignment to repeat the procedure path or its steps.

## Work Routing

| Work type | Required documents | Additional implementation or evidence |
| --- | --- | --- |
| Delegate or act on package, repository, environment, deploy, or data identifiers | Authoritative specification, manifest, data contract, release evidence, or operations source | Verify exact source/location/command and value in the current turn; stop on mismatch before state change |
| Select validation for a daily change | `governance/verification-policy.json` plus `docs/operations.md` verification matrix or its indexed testing document | Classify all change/impact surfaces; select iteration, targeted, completion, and release-only gate IDs; record omissions and invalidated evidence |
| Plan or report the 2026 delivery | `docs/specification.md`, `docs/requirements/delivery-and-technology.md`, and `docs/roadmaps/2026-initial-delivery.md` | Record only verified progress; revise milestone scope, evidence, and risks together when the plan changes |
| `容量チェック` / `タスク容量確認` / `セッション容量確認` / `session size / handoff threshold確認` | `docs/runbooks/project-coordination.md` | `scripts/check-codex-session-size.ps1`; use the current task ID and never infer the newest session |
| [Work type] | [Specification section, roadmap, ADR, design links] | [Code, tests, acceptance, or operations links] |

## Document Authority

| Document | Authoritative content |
| --- | --- |
| `governance/common-governance.md` | Managed cross-project governance; do not edit in the project |
| `governance/project-rules.md` | Project-specific instructions, ownership, safety, and approval boundaries |
| `governance/verification-policy.json` | Machine-readable change classes, gate stages, inclusion, invalidation, fallback, and omission routing |
| `docs/specification.md` | Current confirmed requirements and explicitly separated open decisions |
| `docs/requirements/` | Topic-specific requirement records that support the current specification; each record identifies confirmed facts and open decisions |
| `docs/roadmaps/` | Goals, remaining work, completion criteria, and verified progress |
| `docs/decisions/` | Material decision status and rationale |
| `docs/design/` | Product design, proposals, and evidence, classified by status |
| `docs/operations.md` | Implemented, planned, and unavailable operational behavior |
| `CHANGELOG.md` | Concise visible change history |

## Documentation Completion Criteria

- Every important document is linked from this map or a product/domain index.
- Roadmap milestones link to their principal evidence.
- Confirmed, partially confirmed, proposed, evidence, and historical material are distinguishable.
- Relative links, index coverage, roadmap progress, and ADR statuses pass the repository documentation check.
- The verification matrix covers every required change class, documents aggregate inclusion and invalidation, and routes omission reasons and completion evidence.
