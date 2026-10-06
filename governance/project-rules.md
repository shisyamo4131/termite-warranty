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

The product boundary is an independent business-management system for a new termite-warranty service, not a replacement for the current FileMaker service. The current service and its member page are reference context only; their data and accounts will not be migrated into the new system. System ownership, data ownership, detailed access model, and external-service boundaries remain unconfirmed. Do not infer them from the repository name or technology candidates.

## List Query and Subscription Boundaries

- When a list has no search or filter value, subscribe to at most the 20 documents with the freshest server-maintained update timestamp, in descending order, using document ID as a stable tie-breaker.
- Do not implement an unfiltered list by subscribing to an entire business collection or by creating one child listener per parent record. A record type without a reliable server-maintained freshness field must gain one before this default can be implemented.
- Property/warranty list search is exact full warranty number only, as approved on 2026-10-06. Query that equality in Firestore and preserve account scope; unfiltered reads remain bounded to the freshest 20. Other search axes require business specification before adoption. For other approved prototype lists, the filtered complete-read exception remains as recorded in the specification; do not extend it to the property/warranty list or unfiltered lists.
- Case-list month semantics are not confirmed by this rule. Route the choice of application month, handover month, applied-warranty expiry month, default month, and result-limit interaction through HSC-032.

## Project-specific Roles and Workstreams

Use the standard five agents generated by the scaffold. Do not add optional agents until project risk establishes a need.

## User-authored UI Component Collaboration

- The user-authored JavaScript UI component workflow is an adopted project practice. Use it when the user chooses to express detailed appearance or interaction through a working component instead of prose.
- Route every such component through `docs/runbooks/custom-ui-component-collaboration.md` and a tracked contract under `docs/design/ui-component-contracts/`. The tracked contract, not the ignored workbench copy, is authoritative.
- The user owns component and note files under the ignored `/.user-ui-workbench/`. Agents must preserve that ownership boundary, provide a Japanese convenience contract and fictional fixtures when needed, and use the isolated preview without coupling it to Firebase or tracked application code.
- Integration begins only after the user identifies the component as ready and the coordinator completes a contract review. The coordinator reports either acceptance or requested changes, then adapts the accepted design into tracked code, converts it to TypeScript when useful, and runs the verification gates selected for the actual integration impact.
- The workbench remains disposable and must never become a tracked dependency, source of truth, production-data location, or substitute for application verification.

## Recovery Maintenance Boundary

The owner-approved recovery maintenance mode is a bounded operational access exception to the normal staff authentication/enabled-only Rules posture. Enforce recovery-in-progress business access denial, verification-phase developer/HS-administrator read-only access, retired-database denial, and server-owned runtime/backup metadata boundaries. Keep ordinary business schema/invariants in application/server commands. Recovery operations are developer-operated external commands; HS approvals and communication stay outside the system. Follow `docs/design/backup-recovery-implementation.md`; no production configuration or destructive database cleanup is implied.

## Owner-reported Incident Entry

The owner explicitly instructed on 2026-10-06 that reporting an actual incident in this project must start developer-operated maintenance/recovery, rather than another discussion of whether to prepare it. Route such a report immediately to the incident section at the start of `docs/runbooks/backup-recovery.md`, verify the configured target from repository authorities and the actual cloud state, and execute the reviewed maintenance entry without asking again whether to stop. This standing instruction currently covers the configured Dev business `(default)` and its separate control database only; Prod is not configured or authorized by this rule. A discussion, hypothetical example, or readiness test is not an incident report.

Persist and follow the existing A–D checkpoints: close new updates and HS business access, confirm drain, preserve current authorization/numbering, obtain the external recovery-point approval, restore/verify a new temporary DB, fully reconcile `(default)`, expose HS read-only verification only after technical gates, and reopen only after separate external HS consent. Missing recovery-point consent, identity/state conflict, unavailable credentials/control, incompatible data, or uncertain prior execution is a concrete blocking condition to report with the next required action. Do not infer consent to Auth repair, IAM changes, database/evidence deletion, or unbounded data changes from an incident report. Preserve unknown operation results; never repeat restore submissions or release maintenance blindly. The readiness implementation is not permission to stop the current healthy Dev for a rehearsal.

## Shared UI Design Rules

- Existing and future screens must follow the approved alert and input layout rules in `docs/design/clear-sky-theme.md`. Read that document before adding or changing input or alert components.
- Keep alert defaults in `nuxt.config.ts` and alert typography in `app/assets/clear-sky-theme.css`; do not reproduce or override them per screen. All alert types use tonal backgrounds, compact density, 20px icons and 0.875rem body/title text. Information uses info, attention/warning uses warning, failures use error and completion uses success. Preserve semantic message types.
- Use 16px contextual top/bottom spacing around alerts; use the shared 12px icon-to-text gap. Do not add per-screen colours, font sizes or decorative borders. A design exception requires an explicit approved change to the authoritative design rules.
- Do not use `hide-details="auto"` or its bound equivalent on Vuetify inputs. Reserve the message region even when empty; existing selection-only checkboxes that always hide details may remain. Do not clip long validation messages to force a fixed height.
- Verify new/changed screens against the shared defaults and design rules through the applicable project verification gates.

## Project-specific Approval and Safety Boundaries

Customer and home-related information is expected to be handled, but its exact fields, classification, retention, and legal obligations are unconfirmed. Keep secrets and private records out of the repository. Network, external writes, deployment, and destructive operations require separate human approval.

## Project-specific Implementation and Verification

The approved prototype stack is a Nuxt SPA with Vuetify, Firebase Hosting, Firestore with application-maintained N-Gram search indexes, Firebase Authentication email/password sign-in using browser-session persistence, and Cloud Functions for Firebase for Firebase Admin SDK account management. Exact local-prototype dependency versions are authoritative in `package.json` and `package-lock.json`; do not infer real Firebase project IDs, deployment configuration, production dependency promotion, or production database selection from them. Local verification uses only the fictional `demo-termite-warranty` identifier and required emulators. Firestore access has one bounded authorization exception: the signed-in account must be enabled, so immediate account disable is enforceable. PostgreSQL may replace Firestore only through a recorded architecture decision and an updated schema/migration assessment. The dependency-free domain slice is verified with `npm test`; additional runtime and integration commands become confirmed only after successful local execution and policy registration. Use the project-owned policy as the machine-readable source; classify impact before work. Governance scaffolding, migration, managed sync, common-contract, permission/agent-policy, and release/deploy work require comprehensive validation. Record each selected command and exit status independently; never use status-masking command chains as completion evidence.

For staff-facing business collections, Firestore Rules are limited to authentication and the live enabled-account check. Do not use Rules to enforce document schemas, field allowlists, types, business invariants, lifecycle transitions, soft deletion, or application workflow. The prototype explicitly does not guarantee integrity for authenticated Create, Update, or Delete requests made outside the supported application flow. Keep schema and business validation in the application or a trusted server command where that command is required by the supported workflow. Account records, construction-company ownership boundaries, notification outbox records, account bindings, and server-owned numbering state may remain denied or scoped in Rules because they are authentication/identity or server-authority boundaries rather than staff business-schema validation.

## Project-specific Progress and Reporting

The 2026 initial-delivery effort is multi-phase. Track it in `docs/roadmaps/2026-initial-delivery.md`; report progress only from verified milestone evidence, never elapsed time. The default coordinator handoff threshold is 300 MiB per session.

## Project-specific Task Lifecycle

Use the primary repository directory configured by the user. A separate worktree requires prior explicit approval. Start every task by reading `AGENTS.md`, this file, and routed authorities. Prefer event-driven callbacks for delegated checkpoints; report unresolved approvals and unverified facts explicitly.
