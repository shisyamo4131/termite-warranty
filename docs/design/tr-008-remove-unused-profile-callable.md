# TR-008 Remove the Unused Profile Callable

- Status: Implemented and independently accepted
- Date: 2026-09-12
- Roadmap: [TR-008](../roadmaps/technical-remediation.md#tr-008-remove-the-unused-profile-callable)
- Baseline: `1b80283ae2d46fa927405424be0d5c962e2e2ba0` on `codex/tr-008-remove-profile-callable`

## Objective

Remove the unused `getOwnProfile` Callable without changing session behavior, immediate account-disable handling, Firestore Rules, or the future server-enforced account-management boundary.

## Design

- Remove only the `getOwnProfile` export from `functions/index.js`.
- Keep `useSession` as the single profile path: it subscribes to the authenticated user's own staff document and signs out on missing, disabled, invalid-role, or listener-error state.
- Remove only the obsolete profile Callable wrapper test. Keep registration wrapper tests in the existing aggregate Emulator file and keep Rules tests for self-read and disabled-account denial.
- Record that source removal does not authorize or prove deletion of a deployed remote function.
- Leave future account-management Callables unchanged in scope; they must enforce caller and target roles with Admin SDK authority.

## Validation

- Registered domain/workflow tests.
- Application typecheck to preserve the existing session path.
- Aggregate Auth/Firestore/Functions Emulator regression, confirming the remaining three exports and retained account-access Rules.
- Recursive Functions syntax and seed syntax.
- Governance validation for the ADR, design, roadmap, indexes, and changelog.
- TR-008 alone does not require a build because it changes no application, Nuxt, dependency, TypeScript, or build configuration. The combined worktree also changed local development configuration, so the comprehensive gate set, including the application build, was run.

## Evidence

- The local Functions source exports only `registerCase`, `addAppliedWarranty`, and `updateAppliedWarranty`; the aggregate Emulator run loaded exactly those three functions.
- No repository client refers to `getOwnProfile`. The live Firestore self-profile subscription and its Rules tests remain.
- `npm test` passed 59 tests with 2 host-limited symbolic-link fixture skips; the dedicated-port regression includes inherited AirGuard and alternate-host rejection.
- `npm run typecheck`, `npm run build`, the 77-test aggregate Emulator suite, recursive Functions syntax, seed syntax, and governance validation each exited 0 on the final implementation state before this evidence-only documentation update.
- The independent follow-up review reported no High or Medium findings. Its one non-blocking preview-port drift observation was also resolved by adding the preview port to the shared allocation and regression test.
- Remote function inventory, repository-external consumers, deployment, and deletion were not inspected or changed.

## External Boundary

Do not inspect, deploy, or delete a remote function in this TR. A future deployment must inventory the actual target and repository-external consumers. Remote deletion, if required, is a separate destructive external action and approval.

## Rollback

Revert the TR-008 commit to restore the local export and its wrapper test. Remote state is unaffected by this local rollback.
