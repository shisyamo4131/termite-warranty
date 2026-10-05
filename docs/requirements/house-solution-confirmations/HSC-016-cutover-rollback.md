# HSC-016: Cutover, Parallel Operation, and Rollback

## 2026-10-03 Resolution — 管理Excelへの二重入力終了

初期登録のHS照合・了承後は新システムを物件／保証の正しい記録とし、元の管理Excelへの二重入力を終了する。請求書用ExcelとWord差し込み印刷は継続使用する。FileMakerの既決の独立運用は変更しない。初期登録の実施日程・元資料受領はHSC-015、技術的な障害復旧は本番運用事項として残し、このExcel併用方針とは区別する。

決定者：プロジェクトオーナー。日付・根拠：2026-10-03本Codex会話③YES。仕様書0.1.72、delivery-and-technology、台帳へ反映。未コミット・未実行。現行Excelや実データを削除する許可ではない。

- Status: Reopened for Excel transition; FileMaker decision retained
- Decision owner: House Solution

## Confirmed Context

The new system is for a new service and does not replace the current FileMaker service. Existing-system data and accounts are not migrated.

## Resolution

- Decision: There is no business-data cutover, parallel system-of-record operation, or rollback between the current FileMaker service and the new service. Each service retains and manages its own records.
- Boundary: Deployment rollback, backup/recovery, and incident response for the new system remain production-operation matters; they are not a FileMaker cutover.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task, together with the confirmed independent-new-service boundary.
- Promoted to: `docs/specification.md`, delivery/technology, roadmap, and decision 0028.

## Affected Documents

Cutover runbook, system-of-record boundary, rollback, support, and acceptance criteria.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q9は現行Excelとの並行運用について「相談したい」。過去のFileMakerと新サービスを独立させる決定は取り消されていない。今回確認すべきはExcelと新システムをどう併用・切替するかである。

### 残る確認（文面はユーザー確認前）

使い始めはExcelも更新するか、どちらを正しい記録とするか、切替担当と日程を確認する。FileMaker移行を当然の前提にしない。
