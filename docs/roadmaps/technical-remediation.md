# Technical Remediation Backlog

- Status: Active
- Scope: Approved corrections and structural improvements identified during the 2026-09-11 implementation review
- Progress rule: An item is complete only when its implementation, required tests, affected contracts, and measured evidence all satisfy its completion contract. No elapsed-time or partial percentage is reported.
- Application-code baseline reviewed: `5f2a0fb47ce41d703a31cfbe7f29020c1a9d7c96`
- Repository baseline before this documentation change: `1b42ca682f423679e4345427705a25ddc12b022a` (the intervening commit from the application-code baseline changed documentation only)

This backlog records approved implementation work. It does not turn unresolved product choices into requirements. HSC-032 remains the authority for case-list year/month semantics.

## Recommended Order

1. TR-001, TR-002, and TR-003: correct write semantics and make the verification/deploy path trustworthy.
2. TR-007: after that foundation phase is complete, remove the unnecessarily strong Callable boundary from the four master CUD paths before further master-form restructuring.
3. TR-004 and TR-006: remove duplicated form logic and split the central composable before adding more fields or screens.
4. TR-005: replace unbounded list reads after the query boundary exists; implement the common 20-document default independently of the unresolved case-month details where possible.

## TR-001: Align Master Writes with Last-write-wins

- Status: Implemented and accepted on `codex/tr-001-master-last-write-wins`; integration is recorded in Git history
- Detailed design: [TR-001 master last-write-wins](../design/tr-001-master-last-write-wins.md)
- Evidence: update/lifecycle DTOs and both Nuxt call sites omit `expectedRevision`; Functions derives the next safe revision from the current transaction snapshot; the registered Emulator gate covers all four masters, full-payload concurrent writes, lifecycle boundaries, invalid references/revisions, the Web Functions SDK callable boundary, and unchanged case/applied-warranty conflict behavior.
- Target: Master update, inactivation, and reactivation accept the latest trusted mutation that commits, while retaining server-side field/reference validation and atomic writes. Revision may remain as diagnostic/order metadata but not as a rejection precondition.
- Completion contract: callable DTOs, server transactions, UI calls, prototype data contract, and tests all use the rule in ADR 0016. Concurrent-write tests demonstrate last-write-wins. Case and applied-warranty stale-baseline behavior remains unchanged.
- Required validation: domain/type/build gates, master Emulator tests, Firestore Rules regression, and a UI or callable integration test that submits two edits opened from the same initial state.

## TR-002: Make Shared Domain Code Deterministic for Functions

- Status: Approved; not implemented
- Purpose confirmed from repository evidence: `src/domain` contains Firebase-independent warranty, search, projection, and master-normalization logic used by both Nuxt and Functions. Because `firebase.json` declares `functions` as the Functions source directory, deployable Functions currently import a generated copy at `functions/domain`.
- Current risk: `functions/domain` is ignored by Git and generated only by the Firebase predeploy hook. A clean checkout cannot run every Functions path without preparation, and a developer can test an old generated copy before deployment replaces it.
- Recommended target for the current project: keep `src/domain` as the sole authored source; add one deterministic `prepare:functions` command; make every Functions syntax test, Functions Emulator start, callable integration test, and deploy path invoke it; then run a source/copy equality check that fails on drift. Never treat an existing ignored copy as test input without preparation.
- Longer-term option: evaluate a tracked internal workspace package consumed by both Nuxt and Functions. Adopt it only after proving that the Firebase deployment bundle installs and resolves the local package in a clean checkout; Firebase's documented deployment boundary remains the configured Functions source package.
- Completion contract: deleting `functions/domain` and starting from a clean checkout still permits the registered Functions tests and Emulator command to prepare the exact current source automatically; drift is detected; generated content remains excluded from commits.
- Required validation: clean-copy rehearsal, source/copy hash comparison, Functions syntax, callable integration, Emulator regression, and build/deploy dry preparation without an external deployment.

## TR-003: Close Verification and Development-deploy Gaps

- Status: Approved; not implemented
- Current evidence: the existing Web Functions SDK applied-warranty test is not in a registered gate; the Functions syntax checker omits `applied-warranty-management.js`; the development deployment workflow builds and deploys without first running the project verification policy.
- Target: register an Auth+Firestore+Functions callable integration gate; cover callable wrappers and error mapping; discover or explicitly enumerate every maintained Functions module in syntax validation; make the development deploy job depend on all policy-selected gates. Review the current unconditional `--force` separately and retain it only with a documented deletion boundary.
- Completion contract: a deliberate failure in each gate blocks deployment; the callable test runs from a clean checkout using TR-002 preparation; every Functions service module is covered; deploy remains external-write gated.
- Required validation: fail-pass tests for the aggregate workflow, independent exit-status evidence for every gate, and a no-deploy workflow validation or pull-request run before enabling the changed deployment job.

## TR-004: Consolidate Master Form Fields and Payload Mapping

- Status: Approved; not implemented
- Current evidence: full creation, quick creation, and detail editing separately define the same fields, initial state, conditional sections, and form-to-payload mapping in `MasterManagement.vue`, `QuickCreateMasterDialog.vue`, and `MasterEditDialog.vue`.
- Target: share typed form models, initialization, and pure payload mappers; reuse small field-section components for address, company contact, property references, and homeowner contact. Keep the existing list/detail shells and avoid a general metadata-driven form engine.
- Completion contract: each field is declared and mapped once per master type; full create, quick create, and edit produce the same validated payload shape; master-specific differences remain explicit and typed; no `Record<string, any>` form state remains.
- Required validation: parameterized mapper tests for every master type, component tests for the three entry points, typecheck, build, and Emulator master CRUD regression.

## TR-005: Replace Unbounded List Subscriptions

- Status: Approved; not implemented; case-month portion depends on HSC-032
- Current evidence: case and master lists subscribe to full collections, case listing creates one applied-warranty listener per case, and repeated snapshots re-project all cases in memory.
- Target: enforce ADR 0017. An unfiltered list subscribes to the freshest 20 documents using server-maintained `updatedAt` and a document-ID tie-breaker. Introduce a query/repository boundary, cursor support, and the indexes needed by bounded queries. Case warranty-derived filters use a bounded query or rebuildable list projection rather than per-case child listeners.
- Completion contract: instrumentation shows that initial listener count and reads are bounded by the visible query window rather than lifetime record count; no unfiltered full-collection fallback remains; all list types have a reliable freshness field; filtered query behavior is explicit.
- Required validation: query and index tests, listener cleanup/error tests, 20/21-record boundary tests, equal-timestamp tie-break tests, representative-volume read/listener/latency measurement, and HSC-032-specific tests after its resolution.

## TR-006: Split `usePrototypeData.ts` by Responsibility

- Status: Approved; not implemented
- Current evidence: one composable contains UI-facing types, date helpers, dialog draft logic, client transactions, callable gateways, master loading, case-list subscriptions, and case-detail subscriptions.
- Target: separate shared types and pure transformations, case command gateway, case list query repository, case detail query repository, and UI orchestration composables. Keep Firebase-free domain rules in the shared domain boundary. Do not add a global store unless a demonstrated cross-page state need exists.
- Completion contract: each module has one principal reason to change; UI components depend on query/command interfaces rather than raw Firestore assembly; list and detail loading expose explicit ready/error states; listener cleanup and retry behavior are testable independently.
- Required validation: existing domain and Emulator regressions, focused query/command tests, listener ordering/error/cleanup tests, component smoke tests, typecheck, and build.

## TR-007: Replace Master CUD Callables with Direct Firestore Writes

- Status: Approved; deferred until TR-001, TR-002, and TR-003 are complete
- Decision: [ADR 0018](../decisions/0018-direct-master-writes.md)
- Current evidence: direct client create/update is denied for construction-company, homeowner, property, and warranty-service masters, and every create, update, inactivation, and reactivation goes through a trusted Callable. This boundary was introduced primarily so a server could derive name-search N-Gram maps and was later expanded to uniform revision, lifecycle, timestamp, and reference validation. The previously server-atomic property-to-case propagation requirement no longer exists.
- Target: enabled authenticated staff write the four master types directly through the Firestore client. Rules retain the approved minimum boundary and data-safety invariants: enabled-account access, exact supported document shape and types, immutable creation metadata, server update timestamps, valid property references where required, and no physical delete. Do not introduce role- or record-level business-data authorization. Generate application-maintained search fields from the shared domain implementation and write them atomically with their canonical fields; explicitly accept that Rules cannot prove semantic equality between a name and its submitted dynamic N-Gram map under the provisional threat posture.
- Boundary: keep Callable/Admin SDK paths whose server authority or multi-document transaction is separately justified, including account administration, atomic case registration and numbering, and current applied-warranty/parent-case mutation. Reassess `revision` during detailed design because last-write-wins no longer uses it as a client conflict precondition; do not preserve it merely to imitate the current Callable implementation.
- Completion contract: no master UI path invokes `createMaster`, `updateMaster`, or `setMasterActive`; the unused exported Functions and server master-mutation module are removed; direct client writes preserve current valid create/update/inactivate/reactivate behavior and reject unsupported shapes, invalid references, unauthenticated/missing/disabled staff, and physical deletion; the prototype data contract, rules, operations, tests, and deployment surface agree on the reduced boundary; accepted residual risk is documented without presenting the change as browser-external attack protection.
- Required validation: detailed design review, domain mapper/token tests, direct Web Firestore SDK Emulator CUD tests for all four masters, Firestore Rules authorization/invariant regression, property-reference and lifecycle boundaries, last-write-wins concurrency, typecheck, build, Functions syntax, clean-copy Functions preparation, and confirmation that retained Callable workflows still pass their integration tests.

## Evidence Source

- Review: coordinator plus read-only architecture, frontend, data, and test reviewers on 2026-09-11.
- Approval and decisions: user instruction in the current Codex task on 2026-09-12. A task/thread identifier was not available to the repository authoring context.
- External documentation checked for TR-002: [Firebase Manage functions](https://firebase.google.com/docs/functions/manage-functions) documents that the CLI deploys Functions from the default/configured Functions source, and [Organize multiple functions](https://firebase.google.com/docs/functions/organize-functions) documents codebases and multiple source packages. These sources support the identified packaging purpose but do not by themselves validate a local workspace-package solution.
