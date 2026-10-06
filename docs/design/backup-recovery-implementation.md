# Backup and Recovery Implementation

- Status: Initial Local implementation verified; full recovery delivery remains in progress. Real cloud configuration and Dev drill not performed; Auth import unimplemented.
- Authority: Implements the owner-approved recovery scope in the [specification](../specification.md#2026-10-06-バックアップ復元の対象範囲) and [ADR0032](../decisions/0032-production-firebase-operations.md#2026-10-06-recovery-operation-amendment).
- Start instruction: owner requested implementation on 2026-10-06 after the recovery Q&A.
- Baseline: primary repository `main`, `e88214d2ae2172c8c27c1e0dea72070c8abd0252`, plus the accepted uncommitted recovery documentation. Preserve unrelated README/operations edits.

## Implementation Boundary

Implement and locally verify operational controls, read-only status UI, real-provider CLI preparation, automatic-backup policy/monitor preparation and isolated restore verification. No production target is configured. Dev database creation, settings/IAM, deployment and live restoration require target preflight; normal Dev downtime is coordinated before the drill. No database deletion is included.

## Runtime and Maintenance

- Operational state lives in a separately configured Firestore control database, outside all business database restore targets. Its external ID is not yet confirmed. `RECOVERY_CONTROL_DATABASE` is an explicit deployment parameter; an empty value preserves existing, unactivated operation until initialization and verified deployment.
- The control database publishes only phase (`normal`, `recovering`, `verification`), active business database ID and generation. Private backup metadata/operation receipts are not exposed by public reads. They are returned only to enabled developer/HS administrators through a trusted read-only Callable.
- Every business database has a server-owned access marker. A retired marker blocks client business access; recovering blocks all business reads/writes; verification permits enabled developer/HS administrators to read and denies every client business write. Existing account self-reads remain available to establish login identity. Existing live-enabled/company-scope checks remain intact.
- Functions resolve the active business database from the control state and authorize maintenance access server-side. All mutations acquire a control transaction lease only in normal mode and release it on completion. Entering recovery first stops new admissions, then closes the business marker; restore/cutover requires outstanding operations to be zero. Hung leases are not automatically expired or silently cleared.
- Read commands do not create/delete leases. A fresh runtime check before returning fences in-flight responses at maintenance/cutover. In activated normal mode the wrapper performs four document reads (anchor, runtime, marker, final runtime); business authorization and data reads are additional. Verification adds current administrator checks. Unactivated compatibility adds one anchor read per Callable. This bounded overhead is intentional and must be measured again in Dev; no measured cloud savings are claimed.
- Browser startup resolves the active database before session/profile initialization. Runtime changes hide/unmount the business UI and force clean reconnection; old subscriptions, drafts and reference caches must not continue writing the old database. The controls do not guarantee service availability during a cloud outage.
- Every Callable request carries its runtime generation, checked again during lease admission. A default-DB activation anchor prevents empty or mismatched configuration falling back after activation. Restored access markers must match their actual database identity; restore targets remain quarantined until recovering markers and reviewed Rules are installed.
- Preserve the current authorization baseline outside the restored database. Auth identity alone cannot establish the current role or company/branch scope. Verification receipts bind the target, restore operation/time, generation, implementation revision and authorization baseline; reconciliation or another restore invalidates them.
- No in-app maintenance/restore/approval/reopen buttons. During recovering, HS administrators see a maintenance notice; during verification they receive read-only property/detail/export access. Non-mutating CSV is allowed, report/billing status writes are not.

## External Commands

- Read-only by default. Real writes require explicit project/control/source/target identifiers, inspected generation, apply confirmation and operation-specific preconditions. Emulator mode is restricted to the registered `demo-termite-warranty` endpoints.
- Initialize control and access markers, enter maintenance, inspect/drain active operations, list backup schedules/backups, configure daily 30-day backup/PITR, restore to a new target or clone an eligible PITR time, inspect asynchronous completion, verify, cut over to verification and reopen after external HS approval.
- Recovery-time and reopening approvals are different non-secret evidence references. Refuse unsupported/unknown options, unapproved targets, source=target/control, stale generation, unfinished/failed restore and incomplete verification. Never print document contents, Auth export/hashes, credentials or private business identifiers.
- Snapshot verification scans recursively with bounded pages and compares canonical per-document hashes/counts in memory. Validate numbering/reference consistency and current Auth/account identity/role/disabled-state compatibility. Account locks, unknown collections, schema mismatch and ambiguous credentials/state fail closed. Verification of a historic backup must not incorrectly compare it against today's changed data; use recovery-point evidence or mark that comparison unavailable.
- Keep former databases retired after cutover. Retention duration/deletion remains undecided; no delete operation is provided.
- Original restored content and current-authority/numbering reconciliation are different receipts. The current source may have broken business references; only its recoverable authorization/high-water authority is required. Limited reconciliation preserves current account profiles and raises restored counters, retaining the original hash separately. Pre-effect validation rejections release the operator lock; interrupted effects have an inspected, worker-stopped resume command. Restore POST is never automatically retried after an unknown outcome.
- Completed reconciliation receipts are immutable. Partial retries compare a persisted hash of every non-reconciliation business path/field; unrelated changes stop recovery. Account role/scope, company existence, branch affiliation and applicable legacy bindings are checked before verification. Reconciliation does not recreate missing companies or silently assign other scopes. Change counts describe the final application attempt, while original and completed hashes cover the full result.
- Real CLI writes require the supplied revision to match actual Git HEAD and runtime source to be clean. Recovery resumes recheck deployed control/target Rules. Private account baseline storage is limited to 1000 profiles and 750 kB before other receipt fields.

## Operational Data Contract

These are new operational metadata, not a change to the property/warranty schema. No metadata collection may be included as the business recovery authority after restore.

| Location | Contents and access |
| --- | --- |
| Business `_recovery/activation` in default DB | Permanent control-DB identity; Admin/operator only |
| Business `_recovery/access` | Actual DB identity, phase and generation; Admin/operator writes, Rules enforce access |
| Control `recovery/runtime` | Public document get only: phase, generation and business/control DB IDs; no document list or client writes |
| Control `recoveryOperations` / `recovery/operatorLock` | Mutation leases and interrupted operator intent/ownership; private, never expire automatically |
| Control `recoveryBaselines`, `recoveryTargets`, `recoveryReconciliations`, `recoveryVerifications`, `recoveryAudit` | Private authorization/high-water baseline, submitted restore provenance, sealed original/reconciled hashes, transition evidence and non-secret external approval references |
| Control `recovery/backupHealth`, `backupHistory`, Auth export lock/epoch/request/last-success docs | Private backup status/provenance and export fencing; administrator Callable returns only sanitized status/time/history, never storage paths, account bodies or hashes |

Status preserves separate last-success times even when more than 20 newer failures exist. History is a bounded 20-row view, not a retention/deletion policy. Retention of private incident evidence and old DBs remains a later operational decision; no automatic cleanup is implemented. Evidence and authority snapshots remain outside all business restore targets.

## Backup and Auth Configuration

Managed Firestore backup/PITR uses verified official API shapes. The initial policy remains daily/30 days/PITR 7 days. Monitoring and Auth export require explicit private storage and developer notification configuration; missing configuration is displayed as unavailable, never simulated success. Authentication is restored only when needed, with separate private evidence and account consistency validation. No live Dev Auth rollback is performed by an isolated drill.

The scheduled job is disabled until configured. It inspects READY backups daily at 10:00 Japan time (36-hour stale threshold) and exports Auth weekly/after account changes into a private 30-day bucket. A transactional account epoch/export lock prevents mixed exports being marked successful. Cloud Monitoring developer-only email channel/policy and delivery test are external setup gates. Actual Auth import is not implemented in this increment; its private hash settings and a separate repair procedure remain a release blocker for Auth-loss recovery. The default activation anchor is retained even when its former business data is retired; deleting that database requires a later anchor migration design.

Operator flow and remaining cloud/repair boundaries: [backup recovery runbook](../runbooks/backup-recovery.md). Measured Local results and remaining work: [implementation evidence](evidence/recovery-implementation-2026-10-06.md).

## Verification and Completion

Mixed UI/application/data-contract/governance/config impact selects all seven project gates. Focused tests cover transition races, leases, stale clients, retired database denial, administrator read-only access, non-admin rejection, restore state/evidence and absent monitoring configuration. Emulator tests exercise Rules and Callable boundaries. UI validation checks shared alert/input design and role/maintenance views. Run the final gate set before claiming Local completion. Cloud settings, real mail/Auth export and Dev drill remain unverified until separately executed and measured.

## Technical Sources

- [Firestore databases](https://firebase.google.com/docs/firestore/manage-databases): named database connections and per-database Rules.
- [Backup schedules API](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.backupSchedules/create).
- [Restore API](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases/restore).
- [Functions configuration](https://firebase.google.com/docs/functions/config-env).
