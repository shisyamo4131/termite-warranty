# Meeting prototype verification — 2026-10-01

## 2026-10-03 Hierarchy Management Checkpoint

Scope: specification 0.1.68 hierarchy, company/branch disable and existing-warranty preservation. Local only, no deployment or real-data changes. This does not implement the remaining insurance, notification or annual-counter requirements. The owner has requested finishing Q&A before additional implementation.

Owned application/test files at this checkpoint: `app/components/MeetingPrototype.vue`, new `app/components/WarrantyOrganizationManagement.vue`, `functions/property-warranty.js`, `test/emulator/property-warranty.test.mjs`. All four remain untracked in this pre-existing prototype worktree; no commit/push was made and unrelated changes were preserved. The diff adds parent-filtered management and pagination, company-only group selection for new registration, transactional enabled/parent checks, disable/reactivate controls and related regression cases. Existing branch override values are not purged; new commands ignore them.

Selected classes: documentation, UI, application logic and data contract; union of all seven policy gates. Observed results for final applicable application code:

| Command | Result | Exit |
| --- | --- | ---: |
| `npm test` | 129 passed, 2 existing Windows symlink fixture skips, 0 failed | 0 |
| `npm run typecheck` | Passed; rerun after final UI adjustment | 0 |
| `npm run build` | Passed; rerun after final UI adjustment | 0 |
| `node scripts/check-functions-syntax.mjs` | Passed | 0 |
| `node --check scripts/seed-emulator.mjs` | Passed | 0 |
| `npm run test:rules` | Initial attempt failed before startup: Firebase CLI config-store EPERM | 1 |
| `npm run test:rules` with local `XDG_CONFIG_HOME` and `CI=true` | 76 passed, 0 failed, 0 skipped | 0 |

The retry used process-local `XDG_CONFIG_HOME=tmp/firebase-hierarchy-config`, without reading or modifying the inaccessible user config-store. Fictional local emulators were shut down by `emulators:exec` after success. No credential copy or hosted operation was performed. The final governance command is run after documentation edits; its separately observed result is reported in the task completion response. No selected gate is intentionally omitted.

Coverage includes legacy branch override ignored; existing guarantee retains group/number through company reassignment and extension; new registration uses current company group; parent disable and individual branch disable; reactivation preserves an individually disabled branch; existing property operations remain possible; invalid enabled types and branch overrides rejected; filtered hierarchy finds children beyond the first 20; company-user scope remains restricted. Browser interaction, hosted behavior and HS acceptance remain unverified.

Affected documentation: specification and topic records carry 0.1.68 decisions; meeting contract carries compatibility/rollback; ADR 0034 clarifies new-only reassignment; operations, roadmap, changelog and deliverable README record local status and Q&A priority. Existing indexes already link these authorities; no new documentation authority or roadmap milestone completion is introduced. Managed governance and policy are unchanged.

Proposal PDF: six pages, version 0.1.68. Page 6 replaces the pending reassignment box with confirmed preservation of existing warranty group/number and new-registration-only group changes. Pages 1–5 have version-only changes. Generation/rendering completed and updated page 6 was visually inspected. This proposal PDF is not a complete unresolved-matter questionnaire.

## Scope and state

The [meeting contract](../meeting-prototype-2026-10-03.md) implements the 27 owner decisions. The owner separately authorized deployment on 2026-10-01, and Dev deployment completed with exit 0. No production acceptance is claimed. No Git commit/push was made; this primary worktree also retains earlier specification and postal-lookup work from the same conversation.

## Changed implementation files

- `app/app.vue`, `app/components/MeetingPrototype.vue`, `app/composables/useSession.ts`, `app/types/company-portal.ts`
- `functions/index.js`, `functions/property-warranty.js`
- `src/domain/property-warranty.mjs`, `src/domain/property-warranty.d.mts`, `src/domain/sample-certificate.mjs`, `src/domain/sample-certificate.d.mts`
- `firestore.rules`, `firestore.indexes.json`, `package.json`
- `test/property-warranty.test.mjs`, `test/emulator/property-warranty.test.mjs`, `test/company-portal.test.mjs`, `test/firestore-rules.test.mjs`
- `scripts/reset-meeting-prototype.mjs`, `scripts/seed-meeting-emulator.mjs`, `.gitignore` (PDF QA intermediates only)

Root routes now show property-centred workflow for both staff and company users. Earlier modules remain as historical regression/reference code, not routed UI. Role/company/branch checks run on the trusted command. Staff business Rules preserve the previously approved enabled-account-only posture; browser-external staff integrity is not newly guaranteed. New default property and company/branch reads are bounded to 20; explicit searches remain scoped. Owner-requested samples use a Japanese CID font and are not formal certificates.

## Final applicable gates

All selected commands were independently observed with exit status 0:

| Command | Result | Exit |
| --- | --- | ---: |
| `npm test` | 128 passed, 2 skipped, 0 failed | 0 |
| `npm run typecheck` | Nuxt typecheck passed | 0 |
| `npm run build` | Static Hosting artifact generated | 0 |
| `npm run test:rules` | 71 passed, 0 skipped, 0 failed | 0 |
| `node scripts/check-functions-syntax.mjs` | All discovered deployable modules passed | 0 |
| `node --check scripts/seed-emulator.mjs` | Syntax passed | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | Managed hashes/policy/alignment passed; rerun after final documentation | 0 |
| `node --check scripts/reset-meeting-prototype.mjs` | Syntax passed | 0 |
| `node --check scripts/seed-meeting-emulator.mjs` | Syntax passed | 0 |
| `git diff --check` | No whitespace errors | 0 |

The two domain skips concern symbolic-link fixtures not permitted by this Windows environment, not omitted business tests. No selected gate was omitted. The local emulator tests cover concurrent numbering, duplicate request replay, fixed identity across renewal, changed group assignment for new registrations, 20/30-year limits, handover correction history, cancellation/HS restoration, disabled accounts, company/branch isolation in commands and Rules, and an actual Callable-issued individual company account.

## Browser and artifacts

- Local browser: HS sign-in; company creation; postal lookup; draft without a number; formal registration HSC-26-001; extension retaining that number with initial/extension periods and history.
- Chrome: generated sample PDF downloaded and reopened by pypdf (one page, Japanese sample label, correct property and number); report CSV downloaded and parsed (14 columns, one data row). The in-app-browser download wait timed out; Chrome completed the same output check.
- [Unresolved-matter PDF](../../../output/pdf/HS_未確定仕様事項_全件_2026-10-01.pdf): 30 pages, 28 unresolved IDs exactly match the register, priority ordered, no duplicate/missing IDs.
- Historical presentation flow PDF: seven pages, 14 primary steps plus exceptional scenarios and notes. Deleted as superseded on 2026-10-02 at the owner's request; use the [current operator guide](../../../output/pdf/HS_当日画面操作手順書_2026-10-03.pdf). This entry records the original verification, not verification of the replacement.
- Poppler rendered all pages; full-page and contact-sheet inspection confirmed Japanese rendering and no clipped/overlapping content. Poppler reported fallback-font warnings; Japanese text remained visible. Formal template/font compatibility remains a later acceptance item.
- Source: `deliverables/meeting-2026-10-03/questions.json`, `build-pdfs.py`, `README.md`. No external submission to HS/AriLabo was performed.

## Development reset actually executed

The requested system administrator and HS administrator were resolved by owner-supplied email, checked against live Auth and staff profile roles/enabled state, and retained. No credentials were changed or placed in repository files. Dev inventory had four Auth accounts. `node scripts/reset-meeting-prototype.mjs --system-email <owner-supplied> --hs-email <owner-supplied> --apply --confirm-project termite-warranty-dev` completed with exit 0. It verified exactly two remaining Auth and staff accounts, three warranty-group settings, and zero business records. Old case subcollections were recursively removed along with disposable test records. No production environment was targeted.

## Documentation alignment and remaining boundaries

Specification 0.1.29 links the current bounded demo contract; overlapping older runtime descriptions are explicitly superseded. Affected workflow/access/model/master/search/branch/alerts/insurance/user guidance, ADR 0033/0034, design indexes, roadmap and changelog point to this scope. Managed governance and verification policy are unchanged. M1 remains unearned and overall roadmap progress remains 0% pending complete acceptance.

Remaining: authenticated Dev business-flow smoke, actual mail delivery to real demonstration recipients, formal templates and all production decisions in the 28-matter PDF. No insurance eligibility/contract decision is automated. All present UI test fixtures are local and disposable; they are not left in Dev.

## Authorized Dev deployment — 2026-10-01

- `npx --no-install firebase deploy --project termite-warranty-dev --only firestore,functions,hosting --non-interactive`: exit 0. Hosting, Firestore Rules/index definitions and Functions deployed; `propertyPrototype` created in `asia-northeast1`. No force/deletion override was used.
- All seven applicable gates above remain the deployment prerequisites. Their successful evidence was reused under the verification-policy invalidation rules: no application, dependency, schema or configuration changes occurred after the recorded checks. Source/artifact timestamps and test logs were inspected; only deployment documentation is edited in this turn. The final documentation governance check is recorded below.
- Published root `https://termite-warranty-dev.web.app/`: HTTP 200 and content exactly equal to `.output/public/index.html`; comparison command exit 0. SHA-256 of that HTML: `BB12B9035DD93381E123C7508F65968DC88E4A92D07BF866556727743F33C86B`. Cache header: `no-store, must-revalidate, no-cache`.
- Chrome visibly rendered the common staff/company login form. No existing authenticated application session was available; no credentials were reset or new test accounts created for remote smoke.
- `npx --no-install firebase functions:list --project termite-warranty-dev`: exit 0.
- `npx --no-install firebase firestore:indexes --project termite-warranty-dev --pretty`: final exit 0; all seven deployed indexes are READY, including the three new company/branch/property indexes. Earlier CREATING states were not treated as ready.
- Post-documentation `pwsh -NoProfile -File ./scripts/check-governance.ps1`: exit 0; `git diff --check`: exit 0. This turn changed only this evidence, the meeting contract status, operations, roadmap checkpoint and changelog heading; earlier owned and unrelated worktree changes remain uncommitted and preserved.
- Read-only `reset-meeting-prototype.mjs` inventory, using the two owner-confirmed email arguments and no `--apply`: exit 0, retained roles/enabled state verified, Auth 2, staff profiles 2, warranty groups 3, no business collections. The reset was not repeated.
- The CLI warned that the installed `firebase-functions` package is outdated; deployment nevertheless succeeded. Dependency upgrades are outside this deployment and were not performed.
- Production, managed governance, permissions policy, specification semantics and ADR decisions were not changed. Rollback of application code does not restore the earlier deleted test data.


## Subsequent alert / optional-handover changes (local only)

Owner decisions after reviewing five additional files changed the local demo, after the successful base deployment above. Current scope: configurable calendar-month lead times (default two), HS-only initial five-year insurance alert list derived from handover, optional handover on formal registration for every group, pending-date list/filter and deferred period calculation, and transaction-level rejection of an existing warranty number. The first UH-only exception and manual insurance-start proposal were superseded by later owner instructions before completion. No annual-reset numbering, import, invoice generator, insurance enrollment/renewal state or report-selection workflow was implemented.

Owned implementation: `app/components/MeetingPrototype.vue`, `functions/property-warranty.js`, `src/domain/property-warranty.mjs`, its `.d.mts`, `test/property-warranty.test.mjs`, `test/emulator/property-warranty.test.mjs`, and `scripts/reset-meeting-prototype.mjs` (new settings collection classification only; not executed). Documentation: specification 0.1.30, meeting contract, alerts/insurance requirements, source-materials register, operations, roadmap checkpoint, changelog, and the individual HSC-003/004/005/010/015/036/037/038 records with only their corresponding index rows. Earlier worktree changes are preserved. No Git mutation, external deployment, data reset or managed-governance/policy edit was performed.

Impact: UI + application + data contract + documentation. Union selects all seven gates. Existing Rules remain unchanged: the new settings collection is denied by default and handled only by the manager-checked callable. No separate ADR is required for these bounded demo additions; existing permanent-number/ownership decisions remain unchanged. Older PDF question/flow snapshots have not been regenerated, and their dated current status is noted in operations.

Final gate results are recorded below after completion. Runtime browser verification of these added controls and a new Dev deployment remain outstanding; the base deployment smoke does not verify these additions. Generated local test fixtures are disposable Emulator data only.


Final applicable commands (each independently completed):

| Command | Result | Exit |
| --- | --- | ---: |
| `npm test` | 129 passed, 2 Windows symlink-fixture skips, 0 failed | 0 |
| `npm run typecheck` | Passed | 0 |
| `npm run build` | Static artifact generated | 0 |
| `npm run test:rules` | 72 passed, 0 skipped, 0 failed | 0 |
| `node scripts/check-functions-syntax.mjs` | All discovered deployable modules passed | 0 |
| `node --check scripts/seed-emulator.mjs` | Passed | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | Passed after documentation alignment | 0 |
| `node --check scripts/reset-meeting-prototype.mjs` | Passed | 0 |
| `git diff --check` | Passed; existing LF/CRLF advisories only | 0 |

No selected gate was omitted. Initial sandbox Rules test exited 1 before emulator startup because Firebase CLI configuration was inaccessible; the authorized elevated local-only retry and final post-change run exited 0. Emulator tests cover all three initial groups with absent handover, later-date establishment, deferred insurance alerts, manager settings access, company insurance-list denial and existing-number collision rejection. Domain tests cover exact calendar-month thresholds, leap years, overdue/cancelled/undated eligibility and five-year insurance expiry. Local servers/emulators stopped; a separate listener check found all project ports free (exit 0). No later executable changes invalidated these results.


## Second authorized Dev deployment — alerts and optional handover

The owner explicitly requested Dev deployment after confirming the company/branch and warranty-selection structures. `npx --no-install firebase deploy --project termite-warranty-dev --only firestore,functions,hosting --non-interactive` completed with exit 0 on 2026-10-01. The updated `propertyPrototype` and other packaged Functions, Firestore configuration and Hosting were released. No force override, reset, account mutation or production deployment was performed.

All seven successful final gates in the preceding section were reused under the policy invalidation rules: the final application/backend/test source timestamps precede those successful checks and build; no executable/configuration changes occurred in this deployment turn. Only deployment status/evidence documents changed. The CLI's outdated firebase-functions advisory did not prevent deployment; no dependency upgrades were made.

`npx --no-install firebase firestore:indexes --project termite-warranty-dev --pretty` exited 0 and showed all seven indexes READY. A separate HTTP check exited 0: the public root returned 200 and exactly matched the verified local HTML. HTML SHA-256: `5F449B509DB21DE7DE946A000DE48DD3AEAB3D5DDC6AC447AEB952793ACDCCD6`. Public URL: https://termite-warranty-dev.web.app/ . Authenticated remote operation remains unverified because the available browser is signed out. No existing credentials were changed or obtained to bypass this boundary.

This turn updates operations, meeting-contract status, changelog heading, roadmap deployment evidence and this record only. Specification/data contract/ADRs/permissions remain unchanged. Existing uncommitted work remains preserved; no commit or push was made. The earlier local-only status above is historical and is superseded by this successful deployment.


## Demo feedback verification — 2026-10-01, local only

Scope: UI, application logic, data contract and documentation. All seven union gates selected, none omitted. Evidence binds to the uncommitted primary worktree after the application-date, handover-report and group-lifecycle edits. Source files below were unchanged after the successful executable checks; later edits only align documentation. No deployment, Git commit/push or remote data operation was performed. Existing worktree changes from this task remain preserved.

| Command | Result | Exit |
| --- | --- | --- |
| `npm test` | 129 passed, 2 existing symlink-related skips, 0 failed | 0 |
| `npm run typecheck` | Passed | 0 |
| `npm run build` | Static artifact generated | 0 |
| `npm run test:rules` | 74 passed, 0 skipped, 0 failed; emulators stopped | 0 |
| `node scripts/check-functions-syntax.mjs` | All discovered modules passed | 0 |
| `node --check scripts/seed-emulator.mjs` | Passed | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | Passed | 0 |
| `git diff --check` | Passed; pre-existing LF/CRLF advisories only | 0 |

Initial Rules command exited 1 before startup because the sandbox could not read the Firebase CLI configuration; the elevated local-only retry exited 0. A diagnostic Get-NetTCPConnection command could not establish listener state (exit 1); subsequent `netstat -ano -p tcp` filtering found no entries for project ports 23600, 29099, 28080, 25001, 24400, 24500, 24000 (exit 0). No local web server was started. Browser interaction and authenticated remote acceptance of this revision were not performed.

Tests cover handover period endpoints/unknown dates/cancellation, an application dated March 31 producing the prior April-start fiscal year despite later registration, draft correction and formal-date freeze, retained dates for old-client edits, immutable unused group settings, disabled-group registration/assignment rejection, preserved existing extension and continuing sequence after re-enabling.

Changed executable/test files in this checkpoint:
- `app/components/MeetingPrototype.vue`
- `functions/property-warranty.js`
- `src/domain/property-warranty.mjs`
- `test/property-warranty.test.mjs`
- `test/emulator/property-warranty.test.mjs`

Affected documentation aligned:
- `docs/specification.md` (0.1.31)
- `docs/design/meeting-prototype-2026-10-03.md` (current demo data contract and rollback)
- `docs/requirements/insurance-reporting.md`, `case-warranties.md`, `master-management.md`, `search-and-list.md`, `user-explanation-items.md`
- `docs/requirements/house-solution-confirmations.md` and only the corresponding HSC-003, HSC-004, HSC-036, HSC-037 and HSC-038 matter files
- `docs/operations.md`, `docs/roadmaps/2026-initial-delivery.md`, `CHANGELOG.md`, this evidence file

No new ADR: this refines the bounded demo without changing its architectural decision. Historical data-contract index already routes to the meeting contract; no new document/index entry is needed. Managed governance, access Rules, dependencies and deployment configuration are unchanged. Existing PDF snapshots were not regenerated. Company/branch disable and report-batch state remain documented proposals, not implemented behavior. Manual period confirmation for historic insurance and same-prefix group correction remain unresolved.

Executable/test SHA-256 values:

- `app/components/MeetingPrototype.vue`: `d7d5c9c781bc83872ee6504b212a258e6e3955a4c6e750fa533cb1830fcac8e0`
- `functions/property-warranty.js`: `e14d0b5d26b3f44b9d321d8dfa43e9737456a5f35f405807cea9fee86a66f3fa`
- `src/domain/property-warranty.mjs`: `b55e9311c1defc6d085a51a10aff7965c1866720e9a0e13c423ab52c61efb195`
- `test/property-warranty.test.mjs`: `2786d0e63f420629b2695c12d1c08af4b488d454ad665e45425c6d22d71a9e5d`
- `test/emulator/property-warranty.test.mjs`: `2aa7abb04ef415d163c74abb70821e883b0f74bea30e910ac6cfbf55a881eec6`


## 2026-10-02 release and demo cleanup checkpoint

Owner authorized deployment of the current worktree, initially selective cleanup and then explicitly deletion of masters and reuse of numbers. Insurance report state/renewal workflow remains on hold. Required release classification: all seven comprehensive gates; none omitted. Final executable application source is unchanged from the preceding feedback checkpoint. Reset-script changes are operational only and separately syntax-checked; no deployed module, dependency, Rules or schema change was introduced in this turn.

| Command | Result | Exit |
| --- | --- | --- |
| `npm test` | 129 passed, 2 existing skips, 0 failed | 0 |
| `npm run typecheck` | Passed | 0 |
| `npm run build` | Static Hosting artifact generated | 0 |
| `npm run test:rules` | 74 passed, 0 failed; emulators shut down | 0 |
| `node scripts/check-functions-syntax.mjs` | Passed | 0 |
| `node --check scripts/seed-emulator.mjs` | Passed | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | Passed | 0 |
| `node --check scripts/reset-meeting-prototype.mjs` | Passed after final empty-master mode edit | 0 |
| `git diff --check` | Passed with existing line-ending advisories | 0 |

Read-only Dev inventory completed with exit 0 in both proposed cleanup modes: two property warranties, two companies, two branches, three groups, one counter, two company accounts and two retained staff/admin accounts; four Auth accounts total. The final requested mode is `--empty-masters`, not `--preserve-masters`. Retained account identifiers were verified live and recorded without credentials in operations. Deployment/cleanup completion is recorded below only after actual execution.


### Completed deployment and empty-master reset

`npx --no-install firebase deploy --project termite-warranty-dev --only firestore,functions,hosting --non-interactive` exited 0. Hosting, Firestore and all packaged Functions updated successfully. No force override or production action. Then `node scripts/reset-meeting-prototype.mjs --empty-masters --apply --confirm-project termite-warranty-dev --system-email <verified-system-email> --hs-email <verified-hs-email>` exited 0: two Auth users and two matching staff records retained; property/master/counter collections empty, no initial warranty groups recreated, retained passwords unchanged. No alert settings collection existed, so default alert settings remain applicable. Deletion was explicitly authorized by the owner's latest instructions.

An independent post-reset inspect using the same script without `--apply` exited 0: only staffAccounts (2 documents), Auth accounts 2, retained roles/enabled state verified. There were no HS general-staff accounts to delete; two company Auth accounts were deleted. A separate HTTP check exited 0: Dev root HTTP 200 and exact equality with local generated HTML. SHA-256: `E4024677C2B3A457F1782BF7D29FF7C6D7F2968CE2869BEF509EEC2EF8C254A7`. Authenticated browser business-flow acceptance was not performed, and no replacement demo records were created. Emulator shutdown completed; the listener diagnostic showed only TIME_WAIT connections on project ports, no listening server.

This turn changes the reset script, specification checkpoint, meeting contract, insurance topic, HSC-036 and its index row, operations/admin identity register, docs index, changelog, roadmap and this evidence. No application code, managed governance, dependency, IAM or authentication-method change. Existing primary worktree edits remain uncommitted and preserved. No new ADR or data schema was adopted; reporting/renewal design is expressly on hold. Documentation-only edits after the gates do not invalidate executable checks; governance is rerun after final alignment. The owner can now prepare Dev demo data, starting with warranty groups; new counters start at one.
