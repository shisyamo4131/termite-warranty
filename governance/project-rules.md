# termite-warranty Project Rules

- Status: Active
- Owner: Project
- Common governance: `governance/common-governance.md`
- Rule: This file may add project-specific requirements but must not weaken the common governance contract.

## Project and Current Scope

The project is for House Solution Co., Ltd. and its termite-warranty operations. The repository remains in requirements discovery; only the facts recorded in `docs/specification.md` and `docs/requirements/` are confirmed. Implementation scope is intentionally open until explicitly approved.

## Required Reading and Sources of Truth

Start with `governance/README.md` and `docs/README.md`, then read only the documents routed for the task. `docs/specification.md` is the current authoritative requirement summary; `docs/requirements/` holds the supporting, topic-specific requirement records. Operations and verification rules live in `docs/operations.md`; durable decisions live in `docs/decisions/`.

Approved implementation remediation is tracked in `docs/roadmaps/technical-remediation.md`. Record confirmed defects and approved structural work there with their current implementation evidence, target state, completion contract, and validation. Do not use the remediation backlog as a substitute for confirmed product requirements or the unresolved-matter register.

## Unresolved-Matter Register

- `docs/requirements/house-solution-confirmations.md` is the sole index of current unresolved matters. Its historical name is retained, but it covers both matters requiring confirmation by House Solution and project technical decisions.
- Store each matter in one Markdown file under `docs/requirements/house-solution-confirmations/`; do not place the full discussion in the index or combine unrelated matters in one file.
- Concurrent writes to the register are prohibited. Before changing the index or a matter file, inspect both register paths for existing worktree changes; if another work item has changed either path, remain read-only until that work is integrated. Do not assign register writes to parallel tasks.
- Give each matter the next unused stable sequential ID after confirming that the register has no other in-progress changes. Within the register index and `docs/requirements/house-solution-confirmations/`, a task that creates or updates a matter may change only that matter's file and its corresponding index row and must preserve every other entry. Normal approved changes outside the register follow their own document and verification rules.
- Record confirmed context, exact questions, status, decision owner, and affected documents. Add the reason or answer-specific effects when they are material and known. Keep facts, proposals, and unanswered questions visibly separate.
- An answer recorded in the register does not become a confirmed requirement by itself. Promote it to `docs/specification.md`, the affected topic records, data contracts, decisions, operations, or implementation only after explicit confirmation and the normal approval process.
- When a matter is resolved, keep its file and add a resolution record containing the approved decision, decision maker, decision date, evidence, affected authoritative documents, and the revision or commit that reflects the decision when available. Move its index row from unresolved to resolved; do not delete or reuse its ID.
- Evidence may cite a user instruction in a Codex chat, meeting minutes, email, ticket, or another reviewable source. For chat evidence, persist a concise decision summary and the message date plus task/thread or share identifier when available; do not depend on chat history remaining retrievable, and do not copy secrets or unrelated personal information.
- Confirmed product behavior belongs in `docs/specification.md` and its supporting topic record. Use an ADR when the resolution is a durable architectural or operational decision with rationale and tradeoffs. The unresolved-matter file remains the decision-evidence and promotion record, not the sole source of the resulting requirement.
- When the user asks to present or review unresolved matters, start from this index and open its linked matter files. Filter by decision owner only when the user asks specifically for House Solution confirmations or technical decisions. Do not rely on chat history or topic-document `Open Decisions` sections as a separate list.

## Product and Domain Boundaries

The product boundary is a replacement business-management system for termite warranties. Existing-system data will not be migrated into the new system. System ownership, data ownership, detailed access model, and external-service boundaries remain unconfirmed. Do not infer them from the repository name or technology candidates.

## List Query and Subscription Boundaries

- When a list has no search or filter value, subscribe to at most the 20 documents with the freshest server-maintained update timestamp, in descending order, using document ID as a stable tie-breaker.
- Do not implement an unfiltered list by subscribing to an entire business collection or by creating one child listener per parent record. A record type without a reliable server-maintained freshness field must gain one before this default can be implemented.
- A filtered list must use a bounded query or another approved bounded read model. If the requested filter cannot be implemented without an unbounded read, stop and record the query/read-model decision rather than silently falling back to all-record client filtering.
- Case-list month semantics are not confirmed by this rule. Route the choice of application month, handover month, applied-warranty expiry month, default month, and result-limit interaction through HSC-032.

## Project-specific Roles and Workstreams

Use the standard five agents generated by the scaffold. Do not add optional agents until project risk establishes a need.

## Project-specific Approval and Safety Boundaries

Customer and home-related information is expected to be handled, but its exact fields, classification, retention, and legal obligations are unconfirmed. Keep secrets and private records out of the repository. Network, external writes, deployment, and destructive operations require separate human approval.

## Project-specific Implementation and Verification

The approved prototype stack is a Nuxt SPA with Vuetify, Firebase Hosting, Firestore with application-maintained N-Gram search indexes, Firebase Authentication email/password sign-in using browser-session persistence, and Cloud Functions for Firebase for Firebase Admin SDK account management. Exact local-prototype dependency versions are authoritative in `package.json` and `package-lock.json`; do not infer real Firebase project IDs, deployment configuration, production dependency promotion, or production database selection from them. Local verification uses only the fictional `demo-termite-warranty` identifier and required emulators. Firestore access has one bounded authorization exception: the signed-in account must be enabled, so immediate account disable is enforceable. PostgreSQL may replace Firestore only through a recorded architecture decision and an updated schema/migration assessment. The dependency-free domain slice is verified with `npm test`; additional runtime and integration commands become confirmed only after successful local execution and policy registration. Use the project-owned policy as the machine-readable source; classify impact before work. Governance scaffolding, migration, managed sync, common-contract, permission/agent-policy, and release/deploy work require comprehensive validation. Record each selected command and exit status independently; never use status-masking command chains as completion evidence.

## Project-specific Progress and Reporting

The 2026 initial-delivery effort is multi-phase. Track it in `docs/roadmaps/2026-initial-delivery.md`; report progress only from verified milestone evidence, never elapsed time. The default coordinator handoff threshold is 300 MiB per session.

## Project-specific Task Lifecycle

Use the primary repository directory configured by the user. A separate worktree requires prior explicit approval. Start every task by reading `AGENTS.md`, this file, and routed authorities. Prefer event-driven callbacks for delegated checkpoints; report unresolved approvals and unverified facts explicitly.
