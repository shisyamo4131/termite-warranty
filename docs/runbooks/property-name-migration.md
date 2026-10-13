# 物件名統合のDev移行

対象・新旧名称・保全・差戻しの契約は[設計](../design/property-name-unification.md)。通常Devを停止せず、最大300件の現在名称だけを移行する。今回のオーナー指示がDev配備と既存文書の移行を承認。HS実資料の投入、Auth／IAM変更、バックアップ再開や別DB削除を含まない。

1. Local全7ゲートと独立レビューを完了し、実行ソースをcommitする。通常業務接続は(default)、制御DBはrecovery-control、双方normal・同じ世代、運用ロックなしを実読取で確認。
2. 新コードをDevの既存19 Functions／Hostingへ反映する。バックアップ自動処理のfalseを維持する。実配備原本・画面成果物・通常世代を正式preflightで照合する。Cloudの現版を期待値に流用しない。
3. `node scripts/property-name-migration.mjs inspect --project termite-warranty-dev --control recovery-control`で直前計画を作る。出力は件数・衝突件数・計画hashのみ。衝突0以外は適用しない。私的名称をGitやログへ出さない。
4. 新しい操作IDを選び、同じIDが未使用であることをstatusで確認。実世代・実HEAD・直前計画hashを指定してapplyする。

```powershell
node scripts/property-name-migration.mjs status --project termite-warranty-dev --control recovery-control --operation <未使用操作ID>
node scripts/property-name-migration.mjs apply --project termite-warranty-dev --control recovery-control --operation <未使用操作ID> --generation <実世代> --plan-hash <直前hash> --revision <実HEAD> --apply --confirm property-name-migration
```

5. 全対象の現在ownerName不在、name維持、revision+1、全その他項目・旧履歴・番号不変、checkpointと非公開保全のhash一致、normal／ロックなしを再読取で確認。古い画面のownerName要求は再読込を案内して拒否する。
6. HSへ[名称とCSVの受入手順](../../deliverables/dev-import-acceptance-2026-10-08/README.md)を提示。通常Devの停止／再開は行わないので、別の復旧確認・再開了承を流用しない。

## 失敗時

計画と実文書の同時変更は全件拒否する。結果不明、途中中断、保全記録不整合ではstatusでcheckpoint・保全・正確な運用ロック所有者を確認する。元の作業プロセスが終了したことを確認した場合だけ、同じ操作ID／hash／世代で`--resume-owner <statusのowner> --previous-worker-ended`を指定する。移行完了checkpointが一致すれば、後続の正当な通常編集は維持して完了記録を閉じる。確認に失敗した中断ロックを勝手に削除しない。

移行前の適用不能が確定した場合は修正・再計画する。配備の途中失敗では成功済み対象を確認し、同じ検証済み版を残りへ反映する。互換性のない旧版へ盲目的に戻さない。

## 差戻し

データ差戻しは全対象が厳密な移行直後の完成像と一致する場合だけ、同じ操作ID・hash・世代を指定したrollback（`--apply --confirm property-name-rollback`）で行う。旧ownerNameを保全値から戻し、revisionはさらに+1。通常更新が入っていれば全件拒否し、別の具体的な回復案をレビューする。原子的更新とcheckpointで部分差戻しは行わない。保全記録は無断削除しない。Devで差戻しを実行したとは扱わず、Localの実検証結果を区別する。
