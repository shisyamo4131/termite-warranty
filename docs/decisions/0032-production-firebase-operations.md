# 0032 Production Firebase Environment and Operations

## 2026-10-13 Aでの先行構築・後日HS引継ぎ

GOVERNANCE-MANAGER（`01a1015f-0477-7ad3-8b3c-ef77242b4dcf`）でオーナーが採用。ProdはまずA（開発者個人アカウント）で組織なしとして構築し、後日HSへ管理を引き継ぐ。HSのメール・アカウント管理ルールが不明なためWorkspaceは用意しない。以下の初期HS所有／HS管理者紐付け後の請求設定という順序を、この決定で置換する。HSによる最終管理と開発者の同等保守権限、Dev分離、保存・保護条件は維持する。

A→BのSpark試験では、オーナー招待・受諾、旧A削除、Firestoreデータ保持とBの読み書き、反映待ち後のAアクセス拒否を確認。請求先変更・組織移行・実Prodサービスの引継ぎは未検証。同日の追加指示で、初期請求先はAの既存Cloud Billingアカウントを使用し、後日HS側へ変更する方針を採用。既存請求先の実ID・利用権限・有効状態は実行前に照合する。請求先変更の実証は未完了のままとし、この文書更新では課金操作しない。実行・完了条件と試験記録は[Prod手順](../runbooks/production-bootstrap-review.md)のB／H工程を正本とする。今回のProd変更は文書のみで、構築・課金・引継ぎは未実施。

## 2026-10-08 オーナー決定による現在の状態

本番Firestore採用は[ADR0038](0038-production-firestore.md)で確定。開発者へHS管理者と同等の権限を付与する方針に変更し、従前の必要権限のみ／プロジェクト削除不可の保守方針を置換する。実IAMは構築時照合。通知先はオーナーGoogleアカウント、管理者メール紐付け後に請求登録。Prod workflowは情報が揃ってから、PITR等は構築後、予算設定は後発。バックアップ初回取得・通知・復元互換性の提供前確認は維持。今回は文書のみでProd・IAM・課金変更なし。

## 2026-10-07 開発期間のバックアップ停止

オーナーはDevの自動取得・PITR停止と取得済み像の削除を採用。意図は変更後のアプリと古い像の復元互換性への懸念であり、バックアップ自体を書換える処理ではない。復旧基盤と私有Auth設定は保持し、Prod提供前に自動取得・PITRを有効化して実取得・互換性・通知を確認する。実Prod設定は未実施。[運用例外](../runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)。

## 2026-10-06 Incident entry amendment

The owner explicitly instructed that a real incident report in this Codex project should immediately start developer-operated maintenance/recovery. Persist that report as the maintenance-entry instruction for the currently configured Dev target, verify actual identities/state and proceed without reasking whether to stop. A preparedness discussion is not an incident. Preserve the adopted external recovery-point approval and separate HS reopening approval, fixed `(default)` restoration, independent Auth repair and separately authorized cleanup. This makes the existing developer recovery responsibility actionable across tasks; it does not provision or authorize the unconfigured Prod target. [Formal incident route](../runbooks/backup-recovery.md#障害通知からの開始2026-10-06採用). Local implementation and verification are distinct from new live recovery/deployment acceptance.

- Date: 2026-09-17
- Status: Accepted
- Related specification: [Environment and Boundaries](../specification.md#environment-and-boundaries)
- Supersedes: None

## Context

ADR-0007 established separate development and production Firebase projects, but production ownership, provisioning, deployment, monitoring, backup, and recovery remained open. The development project is developer-owned and technically deployed; production has not been provisioned or configured. HSC-022 production database selection and HSC-025 detailed service/risk requirements remain unresolved.

## Decision

- House Solution owns and contractually controls the production Firebase/Google Cloud project, billing, and final administrative decisions. The project ID, accounts, IAM bindings, and settings are recorded during provisioning.
- Initial provisioning may use a temporary account supplied by House Solution. House Solution retains recovery access; after verification it changes the password, revokes active sessions, and the temporary credentials are destroyed. Ongoing maintenance uses individually assigned developer Google accounts with only necessary permissions. A House Solution backup administrator is recommended, not mandatory; routine maintenance cannot delete the project.
- Keep development and production as separate Firebase projects. If Firestore is selected under HSC-022, production Firestore and Cloud Functions use `asia-northeast1`; production uses the Blaze plan.
- Use environment-fixed separate workflows for future `dev` push→Dev and `main` push/merge→Prod deployment. Each verifies the explicit target, authenticates for that environment, deploys a verified revision-bound artifact, prevents concurrent deployments, and has a reviewed rollback procedure.
- Prefer GitHub Actions Workload Identity Federation, contingent on successful Firestore/Functions/Hosting Firebase CLI verification. If unavailable, use a restricted, rotated, monitored service-account key.
- Within production, use 7-day Firestore PITR, 30-day daily managed backups, and weekly/important-change Firebase Authentication exports to private production Storage retained 30 days. Managed backups are Firestore-managed and are not a Storage bucket.
- Target a maximum 24-hour data-loss window and restoration of critical business operations within 4 business hours. Send automatic email alerts for production unavailability, repeated severe Functions errors, deployment failure, backup/Auth-export failure, and budget levels 50%, 80%, and 100%.
- Development/maintenance handles first technical response; House Solution handles business decisions. Codex is a support tool, not the accountable operator. Full restoration from House Solution-controlled deletion/suspension/change is not guaranteed and requires separate discussion if possible.

## 2026-10-06 Recovery Operation Amendment

- Superseding owner decision on the same date: normal business connections are always `(default)`. A separate database is temporary restore/developer-verification space, never the permanent business destination. Apply the verified complete business image, including excess-document removal, to existing default while preserving recovery control, current authorization and issued-number safety. Verify default before administrator read-only/non-mutating CSV access; require separate external HS reopening consent. Redeployment is permitted in principle; actual Dev stopping/data application/deployment requires a concrete plan and approval. [New design](../design/default-database-recovery.md) replaces the prior permanent named-DB cutover decision. Control DB retention, differential full synchronization and anchor removal are technical designs, not live implemented capabilities. Auth remains separately repaired only when needed. Current Dev must migrate its latest data without rolling back reopened changes. No database deletion is implied.

- Additional owner adoption on 2026-10-06: Auth repair restores missing identities with the original UID while preserving existing identities and current profile authorization/enabled state. This covers total identity loss when current profile authority is intact, not corrupted credentials of surviving users. First implement/verify with fictional Local data; do not modify normal Dev Auth. Collision/partial-failure controls and remaining live-import boundaries are recorded in [the design](../design/backup-recovery-implementation.md#2026-10-06-missing-identity-auth-repair-increment). Rationale: bulk import can overwrite surviving users, while historic Auth data cannot establish current permissions.

- Implementation start authorized on the same date. [Implementation design](../design/backup-recovery-implementation.md) and [runbook](../runbooks/backup-recovery.md) define the Local increment: a separate control database, generation-fenced commands, business access markers, mutation drain, current authorization/numbering preservation, sealed original/reconciled receipts and stopped-worker recovery. The Q&A-time offline-only/unimplemented descriptions below are superseded for this Local code scope. Dev configuration, notification delivery, PITR restoration/cutover and owner-approved reopening are verified in the linked evidence. First managed-backup restoration remains unverified; Auth import is Local-verified only and live import remains unavailable. The default database activation anchor must be retained, so deletion of that former business database requires a separate anchor migration decision. No production target or destructive operation is introduced.

- Owner adoption on 2026-10-06: do not immediately delete the former database after cutover. Isolate it from normal business access and retain it until recovery verification/incident investigation are complete, then decide deletion separately. Rationale: preserve investigation evidence and the former state during recovery verification. Retention duration, investigation access, completion evidence and deletion procedure remain undecided. No live deletion is authorized or performed by this policy adoption.

- Owner adoption on 2026-10-06: rehearse isolated restoration/data/behavior verification, then put normal Dev into maintenance and exercise connection cutover, awaiting-HS-verification and reopening. Coordinate downtime before execution. Existing-database overwrite and live Dev Auth rollback are outside this scope. Exact targets, settings/permissions and stop/cutover/rollback procedures require preflight; no drill has run.

- Owner adoption on 2026-10-06: automatic backup-failure email alerts go to development for investigation/response. Development contacts HS outside the system when needed; automatic simultaneous HS notification is not adopted. Actual recipients are verified during production provisioning. Detection/notification mechanisms are not implemented.

- Evidence: owner instructions and explicit adoption of recommended proposals in this Codex chat on 2026-10-06. Whole-business-database recovery only; individual property/warranty recovery is outside this preparation scope.
- Development enters maintenance, proposes a safe recovery time and explains registrations/updates after that point that will not be recovered. Obtain HS approval outside the system before restoration. Development then restores, validates and reports. HS verifies and approves reopening before development lifts maintenance. The two approvals are separate; their evidence method remains undecided.
- All recovery reporting, discussion and approval with HS occur outside the business system. No in-system communication/approval workflow is a required recovery path. Specific external channels and evidence storage remain undecided.
- Maintenance has recovery-in-progress and awaiting-HS-verification phases. During recovery, HS administrators see a maintenance notice only. After restoration, technical validation and account consistency checks, open viewing and non-mutating CSV export. Registration, editing, deletion and export-related business-state writes stay stopped until approved reopening.
- Authentication is not automatically rolled back with the business database. Preserve current login information when only business data is damaged; restore Authentication separately only when its own damage/loss requires recovery. Development verifies identity correspondence, roles and disabled state against the restored database in either case. Unresolved inconsistencies block reopening; technical restoration/reconciliation procedures remain to be designed.
- Developer-operated maintenance transitions, restoration, validation and reopening use dedicated commands outside the business application. In-app UI provides state/backup-history viewing only, with no recovery-operation buttons. Current CLI capabilities remain offline mock only; real command/IAM contracts and operation during application outage require design and verification.
- The state/backup-history screen is viewable by developer superusers and HS administrators, not general staff or construction-company users. Include automatic backup last-success time, failure and absence of backups. Recovery-in-progress notice-only access for HS administrators remains unchanged. Screen and data-access enforcement are not implemented.
- Rationale: development owns technical recovery; HS confirms business readiness. Recovery communication and technical operations must not depend on the affected business application's availability. Backup frequency/retention, separate Auth backup and existing recovery targets remain unchanged. Authorization does not guarantee service availability during an outage.
- Implementation impact: design backup monitoring, maintenance-aware access, external commands, restored-data/application compatibility, connection cutover/rollback, interrupted work, Auth consistency and HS approval evidence; validate in Dev. No actual configuration, restore, cutover, production provisioning, IAM change or destructive operation has been performed under these decisions.

## Rationale

This assigns production control to the operating business, preserves development isolation, and gives a small project a bounded deployment and recovery baseline without assuming a production database or adding active-active infrastructure. WIF reduces long-lived CI credentials when the actual Firebase CLI path supports it; the restricted key fallback preserves a practical path if compatibility blocks adoption.

## Impact

HSC-020 is resolved. Specification, environment, delivery, security, and operations documents record the decision. Production provisioning, IAM, billing, monitoring, backup, Auth export, deployment workflow, and rollback remain implementation/setup work. HSC-022 was resolved by ADR0038 on 2026-10-08. HSC-025 retains its remaining operating questions; budget configuration is deferred.

## Migration / Rollout

No production migration is authorized. Provision the separate project, record its identifiers and settings, establish ownership/recovery, verify deployment authentication, and rehearse backup/restore and rollback before production release.

## Reconsideration Trigger

Reconsider through a new decision if the adopted Firestore architecture no longer meets measured requirements, HSC-025 establishes incompatible service/risk targets, Firebase CLI/WIF verification fails, or House Solution changes ownership, recovery, region, retention, or cost requirements.
