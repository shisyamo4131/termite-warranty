# 0053 通常アプリの手元からの直接配備

- Status: Accepted; 実装・切替検証中
- Date: 2026-11-16
- Approval: 本チャット01a1e3b3-f313-7320-8b6f-bacd8cb40550で、本人が「手元のコマンドで直接配備する」を選択し、その後コード統合も含めPRを一切使わないと明示、切替からDev／Prod実証・実測・記録更新まで承認。S2のmain統合・Prod実証承認を、Actions上のLinux実証から直接配備の準備・検証へ組み替える。
- Supersedes: ADR0048の通常Dev／Prod配備と配備のPR／Actions来歴依存。必要検証・製品受入れ・対象照合・保護設定維持の判断は保持する。

## 判断

PRの変更分類・成功run・確認欄と配備の実行を切り離す。通常配備は手元の `npm run deploy -- dev|prod --account <ログイン済みメールアドレス>` で明示実行する。Gitは配備版の特定とコード統合に使い、特定branch・PR本文・Actions成功を配備コマンドの条件にしない。コード統合にもPRを一切使わず、検証後に通常pushする。dev/mainのPR必須・PR専用必須checkを解除し、強制push・branch削除は禁止する。必要なLocal試験と受入れは作業者が影響に応じて実施・記録する。

通常のDev／Prod配備とPR確認の3 workflowを撤去する。復旧・保守基準版用の既存Actionsは通常アプリ配備と別の運用範囲であり、今回変更しない。既存WIF・Cloud IAM・secret・DB保護設定を削除・変更する作業は含まない。未統合PR86のCI再配備例外は不採用として閉じ、復活させない。

## 必要な確認

対象環境とアカウントを明示し、既定アカウントへの暗黙fallbackを拒否する。cleanなcommitから認証情報を渡さない子プロセスでbuildし、固定した配備用コピーにのみFunctions依存をlockで導入する。root npm ciを配備ごとに繰り返さず、配備中の再buildも行わない。Prodは既存のbundle／全5照合、Devは既存の対象・公開入口・Functions・保護保留の確認を再利用する。

配備前後に実環境の保護設定とruntimeを確認し、配備を設定変更・業務データ操作に使わない。同一端末の多重起動は環境別lockで拒否する。別端末・Consoleを含む分散排他は保証せず、作業者が同時配備を避ける。失敗・結果不明時は自動再実行せず、稼働版と部分反映を確認する。

## 移行・検証・切戻し

包括7gateを選定し、今回失効する証拠だけ更新する。拒否系・固定成果物・認証分離・失敗後の非再実行・後始末を検証し、独立レビュー後にDev、Prodの順に実配備する。実測はActionsと手元PCの基盤差、cache、Functions更新有無を明記し、単純な速度保証にしない。

業務API・schema・ユーザー画面は変更しないため、業務受入れの再実施を自動で要求しない。コード統合と直接配備の成功、検証範囲、未確認事項を既存operations／roadmapへ記録する。切戻しは既知の良好なコードへ修正commitを通常pushして戻し、必要検証後に直接再配備する。旧Actions自動配備の復活やデータ復元を黙って行わない。

[現行手順](../runbooks/application-deployment.md)・[進捗](../roadmaps/technical-remediation.md#2026-11-16-firebase更新のprod反映と保守手順の簡素化)。
