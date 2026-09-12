# TR-003 Verification and Development-deploy Gates

- Status: Implemented and accepted
- Date: 2026-09-12
- Roadmap: [TR-003](../roadmaps/technical-remediation.md#tr-003-close-verification-and-development-deploy-gaps)
- Baseline: `f00424a58c2db40d1e9433bb0ec68bcb22db99e1` on `codex/tr-003-verification-deploy-gates`

## Objective

Make the development deployment fail closed unless every comprehensive verification gate passes, while closing the known Callable and Functions syntax coverage gaps. Deployment itself remains a separately authorized external action.

## Current Behavior and Risk

- `test/emulator/callable-applied-warranty.test.mjs` exercises the Web Functions SDK boundary but is omitted from the registered `npm run test:rules` gate.
- `scripts/check-functions-syntax.mjs` uses a hand-maintained list that omits `functions/applied-warranty-management.js` and can silently miss future modules.
- the development workflow authenticates before verification and deploys after only a Hosting generation step.
- Firebase CLI 15.29.0 defines `deploy --force` as deleting Functions absent from local source and bypassing interactive prompts. Its local implementation also uses the flag for unsafe function migrations, minimum-instance cost increases, cleanup-policy creation, and security changes. The existing documentation describes only the cleanup-policy effect.

## Required Design

### Registered Callable integration coverage

Keep the stable `firestore-rules-test` gate and its `npm run test:rules` command. Register every maintained Web Functions SDK integration test inside that aggregate Emulator command so Auth, Firestore, and Functions use one prepared Emulator process.

The integration tests must cover the exported Callable families at their real wrapper boundary:

- profile authentication and enabled-account authorization;
- case-registration authentication, permission mapping, successful DTO/result mapping, and validation-to-`failed-precondition` mapping;
- master Callable DTO and wrapper behavior already covered by the existing registered master test; and
- applied-warranty authentication, permission mapping, validation mapping, success, stale-baseline `aborted` mapping, and atomic rejection.

Transaction-level tests remain responsible for detailed business-rule matrices. Wrapper tests prove transport authentication and error-code mapping without duplicating every transaction scenario.

### Complete Functions syntax discovery

After canonical TR-002 preparation, recursively discover regular `.js`, `.mjs`, and `.cjs` files beneath the configured `functions` source. Sort repository-relative paths before checking them, exclude dependency directories, and reject symbolic links or unsupported entries rather than following them. This covers current service modules and the generated shared-domain modules without a hand-maintained filename list.

Unit tests must prove recursive discovery, stable ordering, extension filtering, dependency exclusion, and symlink rejection where the host permits the fixture. A repository-level assertion must prove that every maintained Functions module is in the discovered inventory.

### Fail-closed development workflow

Use two jobs:

1. `verify` runs on the policy-supported Windows/PowerShell profile, installs Node.js 22, Java 21, and dependencies, then runs each ID in `comprehensiveGateIds` as its own step using the exact registered command.
2. `deploy` depends on `verify`, checks out the same revision, installs dependencies, downloads the revision-bound verified Hosting artifact, authenticates, and invokes the explicitly targeted Firebase deployment.

For this static SPA, the stable `npm run build` gate must run `nuxt generate`, assert the Hosting output through artifact upload, and produce `.output/public/index.html`. The deploy job must not run a second build.

Authentication and repository secrets belong only to the dependent deployment job. Normal step failure semantics remain enabled; no verification step may use `continue-on-error` or an unconditional continuation.

A dependency-free workflow-contract validator reads the workflow and verification policy and rejects a missing, reordered, conditional, or non-failing gate; an unguarded deployment job; authentication in the verification job; a missing revision-bound artifact handoff; a second deployment build; any extra or retargeted deploy command; bypass flags; or unconditional `--force`. The upload explicitly includes the generated `.output/public` content despite its hidden parent directory. Unit tests deliberately mutate each boundary to prove the validator fails.

### `--force` disposition

Remove unconditional `--force`. If a non-interactive deployment requires deletion, an unsafe migration, a minimum-billing increase, a cleanup policy, or a security change, the job must fail closed. The specific action is then reviewed and authorized separately. Artifact Registry retention should be configured through the dedicated Firebase artifacts-policy operation, not by granting every deploy a general bypass.

## Scope

- `.github/workflows/deploy-development.yml`
- `package.json`
- `scripts/check-functions-syntax.mjs`
- `scripts/functions-syntax.mjs`
- `scripts/development-workflow-contract.mjs`
- `test/functions-syntax.test.mjs`
- `test/development-workflow-contract.test.mjs`
- maintained Callable Emulator tests and their registered command
- affected verification policy, operations, roadmap, indexes, and changelog

## Explicit Non-goals

- Do not deploy or contact a live Firebase project.
- Do not change a Firebase project ID, secret, environment, runtime dependency, application behavior, Firestore schema, or Firestore Rules.
- Do not implement TR-007 or otherwise change which application mutations use Callable Functions.
- Do not establish an Artifact Registry cleanup policy; that is an external write requiring separate review and authorization.

## Completion Contract

- Every comprehensive policy gate is a separate prerequisite step for the development deploy job and a deliberate omission is rejected by a local test.
- All maintained Web Functions SDK tests run in the registered Emulator gate from a checkout where TR-002 prepares the generated domain copy.
- Every deployable Functions JavaScript module is discovered and syntax checked.
- Unconditional `--force` is absent and sensitive authentication occurs only after verification succeeds.
- Documentation and the machine-readable policy describe the same implemented path.

## Required Validation

Run each command separately and record its exit status against the final worktree:

1. `./scripts/check-governance.ps1`
2. `npm test`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test:rules`
6. `node scripts/check-functions-syntax.mjs`
7. `node --check scripts/seed-emulator.mjs`
8. `node scripts/development-workflow-contract.mjs`

The workflow must be validated locally without dispatching it. No external deployment is authorized.

## Rollback

Revert the TR-003 implementation commit. No application or Firestore data migration is involved. Restoring `--force` is not part of the rollback unless its broader destructive and cost-related boundary receives separate explicit approval.
