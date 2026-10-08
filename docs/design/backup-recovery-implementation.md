# Backup and Recovery Implementation

## 2026-10-07 Dev保護停止とProd提供前ゲート

オーナー承認でDevの自動取得・PITR・Auth自動退避を停止し、取得済み像を削除した。取得／監視コードとAuthハッシュ設定は保持。controlのbackupHealthはmonitoring/authBackupをpaused、lastFirestoreSuccessTimeをnullとし、lastAuthBackup参照を除去。backupHistoryは監査履歴。新状態画面のpaused「停止中」はDev配備済み。Prod提供前の初回取得・PITR開始・互換性・通知ゲートは[現在の例外](../runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)を参照。

共通取込みのexternalKeyReservations／branchCodeReservations／propertyImportSources／propertyImportReceiptsを業務復旧対象へ追加する変更。予約・物件・受領・実行結果の双方向対応を検証し、欠落・重複・不正な実行記録では開放しない。予約は業務復旧時点へ揃える。現在権限と発行済み番号の独立保全は従来通り維持する。2026-10-07後続の追加Local改修では、通常登録にも外部キー予約を使い、全キー付き物件の予約を照合する。受領行／成功記録は取込由来の物件だけを対象とし、通常登録へ捏造しない。保証グループの必須設定・名称と外部キー文字列も共通検証する。追加分cbb5859はDev19 Functions／Hostingへ反映・正式照合済み。通常10、取得停止は維持。HS追加受入・実Cloud容量／復旧障害試験は未完了。

住所統合の稼働中データ移行はバックアップからの復元とは別操作。移行前baselineと完了したprivate住所journalから全体不変を照合する公開専用plan-addressをLocal実装・検証・独立レビュー済み。source/targetはともに(default)だがデータ反映applyとDB廃止を実行しない。既存publish/reopenによる配備確認・HS読み取り確認・別再開了承は維持する。正式な障害A–Dに一時DBなしの復元経路を加える変更ではない。

## 2026-10-06 Incident preparation increment

The owner requires a real incident report in the project to start reviewed Dev maintenance rather than a new readiness discussion. The entry and consent checkpoints are in [the runbook](../runbooks/backup-recovery.md#障害通知からの開始2026-10-06採用). The formal CLI now includes bounded no-build observation and provider initialization provenance; current application data/Rules/schema are unaffected.

Private `recoveryBaselines/<id>` now also stores `bindings: [{id, fields}]`, the complete current `constructionCompanyAccountBindings` snapshot. Profiles and bindings each have a 1000-record cap; their combined profiles/bindings/high-water/snapshot serialized payload must fit 750 kB. B reconciliation replaces those bindings alongside current profiles, comparing the current binding baseline before/after and retaining the hash invariant for all other business fields. Fixed protocol2 rejects a baseline without bindings; create a fresh baseline under the reviewed revision rather than attaching guessed fields to an old receipt. Historical legacy receipts keep their prior limited behavior. Missing restored company/branch affiliations still block verification; this correction does not recreate companies or broaden permissions. These are private operational metadata, not a new business schema. Auth restoration is unchanged.

Provider proof requires an explicitly inspected older same-site version that the authenticated live release history records as DEPLOY before the current live release. FINALIZED alone is insufficient. It then checks management/public configuration, both provider hashes and the full application artifact, preserving version stability. The list route is documented in the [official Hosting API](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.releases/list). Unpublished, current, future or foreign baselines are refused. Changed provider configuration/hash requires independent investigation, not automatic baseline adoption.

> 2026-10-06の方式変更：通常業務は(default)固定へ変更する。[新方式の設計](default-database-recovery.md)が今後の目標仕様。以下の動的切替・anchor・別DB通常稼働は現行／旧方式の実装履歴であり、新方式の完成を示さない。新固定runtimeとLocal専用同期／回復処理は全7Localゲート・独立レビュー済みで、実Dev用実行ゲート・配備・移行は未実施。Authの承認済み区切りは非公開退避・readbackとLocal消失復元検証まで。実Auth取込／復元後ログイン／部分失敗の手動回復は未完了。

- Status: Initial Local implementation verified; Dev configuration, deployment, notification delivery and PITR restoration/cutover verified. The owner confirmed HS-administrator acceptance and separately approved reopening on 2026-10-06; Dev is normal, generation 4. Live private Auth export/readback succeeded for 3 accounts. First managed backup remains unverified; missing-identity import is Local-verified only and live Auth import is unavailable. The monitor status correction was locally verified, deployed to Dev, and confirmed by a live trial. Current evidence is in [the verification record](evidence/recovery-implementation-2026-10-06.md).
- Authority: Implements the owner-approved recovery scope in the [specification](../specification.md#2026-10-06-バックアップ復元の対象範囲) and [ADR0032](../decisions/0032-production-firebase-operations.md#2026-10-06-recovery-operation-amendment).
- Start instruction: owner requested implementation on 2026-10-06 after the recovery Q&A.
- Baseline: primary repository `main`, `e88214d2ae2172c8c27c1e0dea72070c8abd0252`, plus the accepted uncommitted recovery documentation. Preserve unrelated README/operations edits.

## Implementation Boundary

Implement and locally verify operational controls, read-only status UI, real-provider CLI preparation, automatic-backup policy/monitor preparation and isolated restore verification. No production target is configured. Dev database creation, settings/IAM, deployment and live restoration require target preflight; normal Dev downtime is coordinated before the drill. No database deletion is included.

## Runtime and Maintenance

- Operational state lives in a separately configured Firestore control database, outside all business database restore targets. Dev's `recovery-control` was created and matched through the live API on 2026-10-06; no production ID is confirmed. `RECOVERY_CONTROL_DATABASE` is an explicit deployment parameter; an empty value preserves existing, unactivated operation until initialization and verified deployment.
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
| Control protocol2 `recoveryBaselines/<id>.typedHash` | 移行前の全業務文書を型・参照先DB・日時精度込みで照合するhash。追加の停止中走査で取得。住所公開計画はこの値のない旧baselineを拒否する |
| Control `defaultRecoveryPlans/<id>` kind=`address-migration`, publicationOnly=true | 完了住所journal／checkpointと移行前baselineのhash、移行後期待像、停止世代・revision・公開了承を封印。source/authoritySource/targetは(default)、migration=false・total=0、通常apply/resume不可。現行復元計画とは区別 |
| Control `addressMigrations/<id>/preimage` と business `_recovery/addressMigration` | 住所だけの変更前値・全対象文書の変更前後hashと、同じtransactionの適用完了印。通信断照合／差戻し／公表検証のため保持し、無断削除しない |
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


## 2026-10-06 Missing-Identity Auth Repair Increment

Owner adopted restoring missing Auth accounts only after the live backup inspection. Existing identities, passwords, current profile roles and enabled/disabled authority are preserved. An empty Auth directory can be repaired for all currently authorized profiles; a historical snapshot must not resurrect a profile that has since been removed. Existing-UID credential corruption is outside this increment.

The implementation adds `scripts/auth-recovery.mjs` and `scripts/lib/auth-recovery.mjs`. Dev supports **read-only inspect only**; real Auth import remains deliberately unavailable pending a separately approved repair rehearsal. Local restore uses fictional fixtures and the dedicated emulators. This Local increment passed all seven selected gates, including total identity loss and simulated partial success/uncertain response; it is not yet accepted as production credential recovery. See the [measured evidence](evidence/recovery-implementation-2026-10-06.md#消失authのみ復元するlocal追加実装).

Restore is permitted only in drained recovering mode with matching activation/control/business markers, a separate Auth approval, generation and shared operator lock. Before every import, compare current profiles and live identities; reject duplicate UID/email, missing/mismatched current email, inconsistent enabled state, unprofiled users, unsupported providers/custom claims, invalid SCRYPT parameters or evidence. Convert private base64 hash/salt to byte buffers. The initial bounded implementation allows up to 1000 accounts. Preserve existing identities; import only missing UIDs with disabled state from current profiles. No application role or company scope is taken from historic Auth data.

The private `recoveryAuthRepairs` journal records counts, generation/revision, evidence digests, separate approval and status, never user payloads or secrets. It shares `recovery/operatorLock` with business restoration and checks `authExportLock`. A partial/uncertain import leaves maintenance and the lock intact; no automatic rollback/deletion/retry is supplied. Generic operator resume does not handle this new intent: stopped-worker inspection and a separately designed manual reconciliation remain required. Imports are non-atomic and have no create-only precondition; the operator must ensure no parallel Console/Admin/Auth changes during repair. Local tests cannot establish that real Firebase SCRYPT credentials permit login after import.

If Auth is already missing, repair identities against the current, intact business profiles **before** the existing baseline step, which requires Auth/profile correspondence. If current profile authority is also lost or unreliable, stop for manual recovery design; do not derive current roles/disabled state from the historical Auth snapshot or bypass the baseline check. Normal business-database recovery keeps current Auth unchanged.

Evidence source: owner adoption in this Codex chat on 2026-10-06. Official behavior: [Auth bulk import](https://firebase.google.com/docs/auth/admin/import-users) replaces existing same-UID records, skips uniqueness checks and may partially succeed; this is why collision checks, exclusive operation and retained failure state are required.

Private inspection honors the stored hash-configuration object generation. Legacy Auth backup references currently lack a stored generation and are explicitly reported as `backupReferencePinned=false`; their latest metadata generation is used only to make that individual read consistent, not as immutable provenance. Live import remains disabled until stronger snapshot provenance and an isolated real credential rehearsal are completed.
