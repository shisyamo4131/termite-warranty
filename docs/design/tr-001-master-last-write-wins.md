# TR-001 Master Last-write-wins Detailed Design

- Status: Approved for implementation
- Decision authority: [ADR 0016](../decisions/0016-master-last-write-wins.md)
- Remediation authority: [TR-001](../roadmaps/technical-remediation.md#tr-001-align-master-writes-with-last-write-wins)
- Working branch: `codex/tr-001-master-last-write-wins`
- Recovery baseline: `35c850e81f6c4f8d386068fb3391d456f06e6520`
- Trial started: 2026-09-12 08:04:48 JST

## Objective

Make update, inactivation, and reactivation of the four trusted-callable masters use last-write-wins. Remove the caller-provided revision as a write precondition while preserving server validation, Firestore transaction retry behavior, atomicity, timestamps, and monotonically increasing revision metadata.

The four masters are construction company, homeowner, warranty service, and property. Branch management, case editing, applied-warranty management, list-query remediation, shared Functions generation, and verification/deploy rewiring are outside this change.

## Current Behavior

- The update and lifecycle callable DTOs require `expectedRevision`.
- The Functions transaction rejects the request with `aborted` when the stored revision differs.
- The Functions transaction calculates the next revision from the caller's expected revision.
- The Nuxt gateway and its two callers submit the displayed row revision.
- Domain and Emulator tests require stale-write rejection.

## Target Contracts

### Callable request DTOs

- Update: exactly `{ masterType, id, fields }`.
- Lifecycle: exactly `{ masterType, id, active }`.
- `expectedRevision` is removed rather than accepted and ignored. The strict request parser must reject obsolete or unsupported extra fields.
- Create remains exactly `{ masterType, fields }` and remains unchanged.

### Callable responses and stored metadata

- Preserve `{ id, revision }` responses for create, update, inactivation, and reactivation.
- Preserve the stored positive-integer `revision` field for ordering and diagnostics.
- Update/lifecycle transactions read the current stored revision and write `currentRevision + 1`.
- If the current stored revision is not a positive integer, fail with `failed-precondition`; do not repair it implicitly or derive a value from the caller.
- Continue to write `updatedAt` with a server timestamp. Preserve `createdAt`, document ID, and every field outside the operation's allowed mutation set.

### Last-write-wins transaction semantics

- Keep update and lifecycle operations inside Admin SDK Firestore transactions.
- Read the enabled staff record and target master in the transaction.
- A missing master still returns `not-found`.
- Concurrent writes may cause Firestore to retry the transaction. Each retry must use the then-current master snapshot, re-run applicable validation, increment that snapshot's revision once, and commit the submitted operation.
- Two valid concurrent mutations must both be capable of succeeding. The final document contains the fields or active state from the mutation that commits last, and the final revision reflects both committed mutations.
- Do not implement field merging, dialog-open snapshots, conflict prompts, or client-generated timestamps.

### Validation retained unchanged

- Only an authenticated enabled staff account may invoke a trusted master mutation.
- Master type, document ID, exact request keys, supported fields, required text, address normalization, nullable contact values, search-token generation, and warranty-period rules remain server validated.
- Updating an active property still requires active referenced homeowner and construction company records.
- Updating an inactive property still requires both referenced records to exist, without requiring them to be active.
- Reactivating a property still requires both current references to be active.
- Inactivation/reactivation remains reversible; physical deletion is not added.
- A property master change still does not propagate its homeowner or construction-company references into existing cases.

### Nuxt client contract

- `updateMaster` accepts `(id, fields)` and sends no revision.
- `setMasterActive` accepts `(id, active)` and sends no revision.
- `MasterEditDialog` and `MasterManagement` stop passing the live row revision as a mutation condition.
- `ManagedMaster.revision` and `MasterMutationResult.revision` remain because the server retains revision metadata; UI success does not depend on predicting it.
- Do not add a client-side last-write-wins implementation. The trusted server transaction is authoritative.

## Owned Implementation Surface

The implementation checkpoint may edit only:

- `src/domain/master-data.mjs`
- `functions/master-management.js`
- `app/composables/useMasterManagement.ts`
- `app/components/MasterEditDialog.vue`
- `app/components/MasterManagement.vue`
- `test/master-data.test.mjs`
- `test/emulator/master-management.test.mjs`
- `test/emulator/callable-master-management.test.mjs`
- `package.json`, only to make `npm run test:rules` prepare the Functions domain copy, start the Auth/Firestore/Functions Emulators, and include the new master callable test in that existing registered gate

The implementation checkpoint must not edit requirements, ADRs, roadmaps, this design, Firestore Rules, case/applied-warranty code or tests, package/deploy configuration, generated `functions/domain`, or unrelated files. Documentation status and final integration remain coordinator-owned.

## Acceptance Tests

1. Domain request parsing accepts update/lifecycle DTOs without `expectedRevision` and rejects the obsolete extra field.
2. All four master types still create, update, inactivate, and reactivate with stable IDs and monotonically increasing revisions.
3. Two concurrent valid updates starting from the same stored state both succeed; returned revisions cover the next two revisions, the final revision is the higher value, and the final payload is the payload associated with that higher server revision. The test must not assume invocation order equals commit order.
4. A concurrent update and lifecycle mutation both succeed when each is valid; the final state matches commit order without a stale-revision error. Updating fields must not implicitly change `active`, and a lifecycle mutation must not change business fields.
5. Missing master, disabled/missing staff, malformed DTO, invalid fields, invalid property references, and invalid reactivation remain atomic failures with no partial write.
6. A property reference update leaves linked active, cancelled, invalid, and unrelated cases byte-for-byte unchanged.
7. The callable boundary accepts the new DTO and returns the new revision; an obsolete `expectedRevision` produces `invalid-argument`, not silent compatibility behavior. This test is included in the registered `npm run test:rules` gate.
8. Existing case and applied-warranty stale-baseline tests remain unchanged and pass.
9. Type checking proves the two UI callers use the new gateway signatures.

The existing registered `firestore-rules-test` gate runs `npm run test:rules`. For this checkpoint, that script must be extended to include the new Web Functions SDK master callable test and to start Auth, Firestore, and Functions Emulators. Use an npm `pretest:rules` lifecycle script to run the existing deterministic preparation command before the gate; do not use a stale ignored copy or commit generated `functions/domain` content. This is only the narrow preparation and callable coverage required by TR-001. It does not complete the broader TR-002 or TR-003 remediation.

## Required Validation

Run each command separately and record its exit status against the final worktree state:

1. `node scripts/prepare-functions-deploy.mjs`
2. `npm test`
3. `npm run typecheck`
4. `npm run test:rules` (the registered gate must include the master callable test)
5. `node scripts/check-functions-syntax.mjs`
6. `node --check scripts/seed-emulator.mjs`
7. `npm run build`
8. `./scripts/check-governance.ps1`
9. `git diff --check`

No deployment, Firebase project write, dependency installation, data migration, or physical deletion is authorized.

## Recovery and Integration

- The immutable recovery point is the verified clean commit `35c850e81f6c4f8d386068fb3391d456f06e6520` on `main`.
- Work occurs only on the named branch in the primary project directory; no alternate worktree is used.
- If implementation is rejected, preserve its diff or commit for diagnosis and return the primary branch to the recovery baseline without rewriting history.
- The developer stops after editing and targeted validation. The coordinator reviews the exact diff, runs final acceptance, updates affected documentation/status, and creates the accepted integration commit.

## Efficiency Trial Method

- Actual path: Sol/Medium coordinator design and acceptance, Terra/Medium developer implementation, then Sol/Medium coordinator review and verification.
- Record actual wall-clock timestamps for design start, developer dispatch, developer callback, review start, and accepted completion.
- Exact per-agent token billing is not exposed in the repository workflow. Report token use as an explicitly labeled estimate or relative range, not as measured fact.
- Counterfactual comparison: estimate how long and how many tokens the coordinator would likely have used to inspect, implement, test, diagnose, and document the same bounded change alone. It is not an experimental control and must be labeled as a projection.
- Compare deliverable quality using the same acceptance contract and final gates; speed without passing the same contract does not count as an efficiency gain.
