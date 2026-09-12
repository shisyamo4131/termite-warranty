# TR-006 Split Prototype Data Responsibilities

- Status: Implemented and independently reviewed
- Date: 2026-09-12
- Roadmap: [TR-006](../roadmaps/technical-remediation.md#tr-006-split-useprototypedatats-by-responsibility)
- Baseline: `fe89ff69ed02a6c21775f6581fdac1297041753d` on `codex/tr-006-prototype-data-split`

## Objective

Replace the 386-line `usePrototypeData.ts` aggregate with narrow typed modules so commands, master catalogs, case-list queries, case-detail queries, and UI orchestration each have one principal reason to change. Preserve confirmed case and warranty behavior while creating the query seam required by TR-005.

## Scope and Boundaries

- Move UI-facing data contracts to one TypeScript source and name the applied-warranty row contract.
- Move canonical local-date and applied-warranty draft transformations into Firebase-free utilities.
- Isolate case registration, case editing, and applied-warranty mutation behind one command gateway and a thin Nuxt composable.
- Isolate master catalog loading/filtering, case-list subscription, and case-detail subscription behind separate repositories and thin Nuxt composables.
- Replace callback combinations with explicit `loading`, `ready`, and `error` query states while keeping progressive data available during loading.
- Add injectable subscription sources so ordering, readiness, error, retry-generation, and idempotent cleanup are executable in dependency-free Node tests.
- Migrate every current consumer and test, then remove `usePrototypeData.ts`; do not retain a compatibility facade.
- Do not implement TR-005 query limits, pagination, month semantics, new indexes, schema/rules changes, new product behavior, a global store, or a new test framework.
- Do not read or modify `/.user-ui-workbench/`; the user-authored table remains independent until the user declares it complete.

## Module Contract

- `app/types/prototype-data.ts`: master, case, filter, mutation, callable DTO, and explicit query-state types.
- `app/utils/canonicalLocalDate.ts`: current local date plus strict parse/format functions.
- `app/utils/appliedWarrantyDraft.ts`: timestamp serialization, initial extension start, draft hydration, and expiry recalculation.
- `app/gateways/caseCommandGateway.ts`: exact Callable names/DTOs, direct case transaction, conflict error, and injectable command creation.
- `app/repositories/masterCatalogRepository.ts`: the five collection names, raw master mapping, full catalog loading, empty catalog creation, and active filtering.
- `app/repositories/firestoreCaseQuerySource.ts`: the only raw Firestore snapshot adapter used by case queries.
- `app/repositories/caseListRepository.ts`: list maps, dynamic warranty listener ownership, projection, readiness, errors, and teardown.
- `app/repositories/caseDetailRepository.ts`: one-case projection, stable warranty listener ownership, readiness, errors, and teardown.
- `app/composables/useCaseCommands.ts`, `useMasterCatalog.ts`, `useCaseList.ts`, and `useCaseDetail.ts`: Nuxt/Vue binding and UI-facing state/start/retry/stop orchestration only.

## Query-State Semantics

- `loading` may contain progressively projected data but does not mean every initial source has responded.
- List state becomes `ready` only after the case collection, all five master collections, and the first warranty snapshot for every current case have responded.
- Detail state becomes `ready` only after the case document, all five masters, and the warranty snapshot for an existing case have responded. A missing case is `ready` with `row: null`; master callbacks cannot create a transient not-found result.
- A list source error preserves the current catalog, clears rows as the current implementation does, and reports `error`. A detail source error retains the last visible row/catalog as the current implementation does and reports `error`.
- Errors do not implicitly stop live listeners, matching current recovery behavior. Explicit retry first stops the old generation and starts a new one; late callbacks from stopped generations are ignored.
- Stop and retry cleanup are idempotent. Removed list cases and deleted detail cases stop their warranty listeners exactly once.
- A detail update for the same case retains the current warranty data and listener rather than temporarily hiding warranties and recreating the listener.

## Compatibility

- Registration and applied-warranty commands retain their exact Callable names, DTOs, timestamp precision, results, and propagated errors.
- Case editing retains its full-timestamp conflict rule, active-case restriction, property/default override behavior, reference checks, date checks, terminal reason rules, and server timestamp write.
- All current fields, labels, Japanese errors, filtering, details, counts, events, and route cleanup remain owned by their current components.
- Duplicate one-shot master loads before live list subscription are removed. Quick-create refresh remains available through the master repository.
- `loadActiveMasters`, which has no caller, is removed.

## Validation

- Dependency-free tests cover dates, warranty drafts, timestamp DTOs, command delegation, exact Callable names, master loading, all relevant listener delivery orders, readiness barriers, errors, dynamic child listeners, retry generations, late callbacks, case deletion, and idempotent cleanup.
- Source-wiring tests confirm every consumer uses only the narrow composables/types/utilities and no `usePrototypeData` reference remains.
- Existing domain, Callable, transaction, and Rules regressions remain authoritative for product behavior.
- Final completion uses the policy-selected governance, domain/workflow, typecheck, build, aggregate Emulator, recursive Functions syntax, and seed syntax gates.

Completion evidence on 2026-09-12:

- `npm test`: 77 passed, 2 host-limited symbolic-link tests skipped, 0 failed (exit 0).
- `npm run typecheck`: passed (exit 0).
- `npm run build`: passed (exit 0); the existing large-client-chunk and Nuxt/Nitro warnings remain non-fatal.
- `npm run test:rules`: 77 passed, 0 skipped, 0 failed (exit 0).
- `node scripts/check-functions-syntax.mjs`: all discovered Functions modules passed (exit 0).
- `node --check scripts/seed-emulator.mjs`: passed (exit 0).
- `./scripts/check-governance.ps1`: passed before the completion-evidence documentation update and is rerun after it.
- Local browser smoke: synthetic login, dashboard, six-row case list, one active case detail, and its applied-warranty row rendered without browser console errors.
- Independent read-only review found one removed-listener late-callback race. Per-subscription identity guards and list/detail regressions were added; follow-up review found the issue resolved and no remaining High or Medium finding.
- The dedicated Emulator was restarted and reseeded after the Rules gate. Application, isolated UI workbench, and Emulator UI endpoints each returned HTTP 200.

## Rollback

Revert the TR-006 commit to restore `usePrototypeData.ts` and its existing consumers. No stored-data migration, Emulator reset, external deployment, or remote rollback is required.
