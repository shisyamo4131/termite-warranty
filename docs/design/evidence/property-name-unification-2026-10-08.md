# 物件名統合・架空CSV受入準備の実行記録

## 対象と許可

2026-10-08のオーナー指示：「物件名と施主は統合。項目名は『物件名』。Dev反映・マイグレーションも含めて作業開始」。加えてテンプレート入手を含むDev一括取込みの手順・開発側の架空CSV準備。HS実資料取込みは回答まで保留。

事前ソースHEADはcbb58598e3cece7f2118911da2569fe0ecfa5487。実Dev読取はtermite-warranty-dev／(default)／recovery-control、normal／世代10、両名称あり16件・一致16件・不一致0件、旧名称履歴8件、運用ロックなし。実Cloud読取で既存19 Functions ACTIVE、全件control=recovery-control／automation=false。配信版f97cf1b40612d67f、比較用同site版b053d7fc67931cdeはFINALIZED。秘密値・実名は記録しない。

## 独立レビューと修正

NAME-REVIEW-00の無変更route確認後、NAME-REVIEW-01／02／03をread-only reviewerへ依頼。レビューで、通常操作の旧名称無条件削除と、中断操作の保全記録確認失敗時のロック解除を指摘された。既読文書の名称一致ガード、中断ロック保持、複数対象の計画後競合・保全改変・異なるownerの再開拒否・UIの旧項目除去検証を追加。NAME-REVIEW-03で残るsource blockerなし。レビューはCloud操作・実行結果の認証ではない。

## Local検証（最終版）

| コマンド | 結果 | exit |
| --- | --- | --- |
| ./scripts/check-governance.ps1 | 整合検証成功、7 gate／policy一致 | 0 |
| npm test | 286件中284成功・既存2skip、失敗0 | 0 |
| npm run typecheck | 型検査成功 | 0 |
| npm run build | SPA生成成功 | 0 |
| npm run test:rules | 最終131件成功・失敗0・skip0 | 0 |
| node scripts/check-functions-syntax.mjs | 全Functions構文・生成domain一致 | 0 |
| node --check scripts/seed-emulator.mjs | 構文成功 | 0 |
| node --check scripts/property-name-migration.mjs | CLI構文成功 | 0 |
| 同梱Nodeでtmp/name-csv-authoring/create.mjs | 架空CSV7本、17列・文字列往復・期待件数／拒否理由一致 | 0 |

選定はUI・ロジック・データ契約／移行・配備の和集合で全7 gate、除外なし。初回sandboxのnpm testはrenameのEPERMでexit1、その後Local検証のみ制限外で再実行しexit0。エミュレータの再起動は制限下でport timeout／exit1、制限外のdemo専用再実行で継続。失敗結果を成功として扱わない。途中の131件成功結果はロック保持の最後の修正で失効したため、最終版で再実行する。テンプレート内の空行の末尾空白を除去し、型検査・ビルドも再実行済み。これは表示／保存処理を変えず、開始済みのサーバー回帰を失効させる変更ではない。

## Devと残件

実装・架空CSV・移行手順25ファイルは6b2573d26862f90d9183bdb780659b5cca20199cへ統合。runtime対象のapp／src／functions／scripts／test／package／Firebase設定はcleanで、既存の別作業の文書差分は保全してコミットへ混ぜていない。今回の確定要件・現在地を仕様、case-warranties、initial-data-model、source-materials、meeting-prototype、technical-remediation、operations、初期提供roadmap、CHANGELOG、文書／設計索引へ反映する。未決事項台帳は先行差分があり更新規則に従って触らず、今回の仕様正本は更新済みのspecificationと統合設計とする。

| Devコマンド | 結果 | exit |
| --- | --- | --- |
| npm run build:recovery-release -- --revision 6b2573d26862f90d9183bdb780659b5cca20199c | 新HEADの決定的成果物・fresh build照合 | 0 |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project termite-warranty-dev --non-interactive | 既存19 Functions反映 | 0 |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project termite-warranty-dev --non-interactive | Hosting反映 | 0 |
| node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 6b2573d26862f90d9183bdb780659b5cca20199c --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/b053d7fc67931cde --dev-inspect | 最終全check pass、19処理／原本19／配信993path、索引11・除外30、normal10・ロックなし | 0 |
| node tmp/verify-paused-backups-after-release.mjs | automation=false全19、Scheduler PAUSED、PITR停止、予定0・バックアップ0 | 0 |
| node scripts/property-name-migration.mjs inspect --project termite-warranty-dev --control recovery-control | 実行直前16件・変更16・衝突0、直前hash一致 | 0 |
| node scripts/property-name-migration.mjs status --project termite-warranty-dev --control recovery-control --operation name-dev-20261008-unify1 | 事前ID未使用、事後完了・ロックなし・保全16 | 0 |
| node scripts/property-name-migration.mjs apply --project termite-warranty-dev --control recovery-control --operation name-dev-20261008-unify1 --generation 10 --plan-hash 3465f4c8a50c6c9b373b50ba1f6e7f750dc02ad112ad0746e57d83c1f4db9a9d --revision 6b2573d26862f90d9183bdb780659b5cca20199c --apply --confirm property-name-migration | 16件を原子的に移行、再適用なし | 0 |
| node tmp/name-migration-readback.mjs name-dev-20261008-unify1 | 16／16厳密完成像hash一致、name／全その他項目不変、旧root ownerName0、旧履歴8保持、normal10、ロックなし、保全保持 | 0 |

新Hosting版はsites/termite-warranty-dev/versions/e71043ed17793dd4。最初の正式preflightはhosting-release-proofのみblockedで、exit0は検査実行成功であって照合成功ではない。診断でアプリ991path全hash一致・設定一致と、Firebase提供2pathの正式由来照合を確認した後、同じ正式preflightを再実行して全項目pass。最初の原因は確定しておらず、伝播遅延等とは断定しない。検証を緩和・除外せず、その間データ移行は待機した。read-onlyのready=falseは実行権限を付与しない表示で、checksのpassとは区別する。

全体バックアップからの復元、Auth変更、業務停止、PITR再開、他DB削除は実行していない。移行はroot ownerName削除とrevision+1だけで、updatedAt等を変えていない。非公開の名称保全・checkpointは保持。Cloud上の差戻しは未実施で、Local検証済みとしてのみ扱う。架空CSV5件のユーザー受入、任意300件のDev容量実行、実HS資料投入は未実施。実HS資料は回答まで保留。

実装の変更対象はapp/components/MeetingPrototype.vue、functions/property-warranty.js、src/domain/property-warranty.mjs／property-bulk-import.mjs／sample-certificate.mjs、scripts/property-name-migration.mjs／lib/property-name-migration.mjs、package.json、test/property-warranty.test.mjs／property-bulk-import.test.mjs／property-name-migration.test.mjs／emulator/property-warranty.test.mjs／emulator/property-name-migration.test.mjs。成果物はdeliverables/dev-import-acceptance-2026-10-08のCSV01〜07、README.md、verification.json、ZIP。新しい設計・移行runbookと本実行記録を索引から辿れるようにする。

[設計](../property-name-unification.md)、[移行手順](../../runbooks/property-name-migration.md)、[ユーザー手順とCSV7本](../../../deliverables/dev-import-acceptance-2026-10-08/README.md)。現在名称のみを統合し、恒久ID／保証番号のADR0033、Rules・索引・権限・バックアップ停止の設定は維持。未決事項台帳の別作業差分は触らず、今回の確定要件は仕様と該当要求記録・設計・運用記録へ反映する。
