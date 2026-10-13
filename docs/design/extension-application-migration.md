# 既存保証延長の申込日補完

2026-10-13現在：本件はDev反映・開発側受入れ済み。以降の未反映・禁止は当時の状態。実データの延長履歴は0件で申込日補完は不要。HS業務受入れは別途。[導入結果・確認範囲](../operations.md)。

2026-10-12のオーナー指示による実装・Local検証対象。業務要件の正本は[仕様](../specification.md#2026-10-12-保証延長申込日請求基準確定改修中)。Dev更新・保守停止・配備は別途明示指示が必要。本書はその実行承認ではない。

## 補完と保全

`scripts/extension-application-migration.mjs` と同名の `scripts/lib/` が開発者向け操作を提供する。読取りのinspect／plan／statusと、書込みのapply／stopを分ける。CLI認証情報はメモリー内で扱い、通常出力は件数・照合hashに限定する。inventoryの物件ID・イベントIDは `--output` を指定した本人限定フォルダー内へ新規保存する。既存ファイルは上書きしない。根拠・顧客情報を追跡ファイルへ含めない。

確認入力は配列で、各要素を `propertyId`、`eventId`、`extensionApplicationDate`、`sourceReference` の4項目に限定する。実際に確認した申込日とその根拠の参照先を入力する。日付・根拠の自動生成や、操作日・保証開始日による推定はしない。inventoryのnull欄は未確認を表し、そのままapplyできない。

- 有効な延長イベントと保証期間が一対一に対応することを確認。物件自体が取消済みでも復元に備えて有効延長の申込日を補完する。取り消された延長イベントは変更しない。
- 初回申込日、履歴の既存値・理由、番号、請求済み状態、保険・保証書、更新日時は不変。対象延長の履歴に申込日だけを追加し、`billingQueryVersion`／`billingPendingMonth`／`billingQueryMonths`だけを再計算する。画面の古い保存を拒否するため、変更物件のrevisionを1増やす。
- 既存日付の上書き、入力の重複・余剰、不明な日付、履歴と期間の不整合、イベントのない取込み延長、容量不足は停止条件。保険の取消予約容量も共通検査で確認する。未確認のまま移行完了とはしない。
- 全物件の内容と確認入力を計画hashで固定。現在の運用上限は走査1,000物件、変更100物件、書込み計画7MB以内。これは業務上の件数制限ではなく、一括移行の安全範囲であり、超過時は分割して強行せず再設計する。

## 実行と中断

実行前に対象環境・DB、保全、稼働版、確認入力とplan、全writerの停止・処理終了を照合する。applyはcontrolのruntimeと業務側markerがともにrecovering、同じ世代・DBの場合だけ許可する。保守状態への移行・通常再開は本CLIが自動実行しない。業務更新を止める実操作には別途の環境別承認が必要。

controlの `recovery/operatorLock` と `recoveryOperations/extension-application-{operationId}` で所有者を保持。他の処理が残っている場合は停止する。業務DBの一つのtransaction内で全件を再読取りし、計画hashを再照合して、全対象物件と `_recovery/extensionApplicationMigration/receipts/{operationId}` の完了記録を同時確定する。計画後の追加・削除・変更も拒否し、一部の物件だけを補完しない。

結果不明・失敗時はlockとleaseを保持する。statusで所有者を確認し、旧実行が終了したことを確認後、同じoperation／generation／plan／入力と `--resume-owner`／`--previous-worker-ended` で再開する。完了記録があれば対象全件の期待hashと一致するときだけ完了を確認し、revisionを再加算しない。完了後に対象が変わっていれば自動再実行せず手動照合へ止める。中止はexact ownerによるstopでlock／leaseだけを解放し、保守状態も業務データも変更しない。

追加日付を消して旧請求基準へ戻す自動rollbackは提供しない。移行前の不成立は全件未変更、成立後は完了記録から確認して前進修正する。旧版へのコード差戻しで申込日が無視されることを避け、新履歴を保全する。バックアップ復元が必要なら既存復旧手順と別途承認へ進む。

## コマンドと検証

読取り例：`node scripts/extension-application-migration.mjs inspect --project termite-warranty-dev --control recovery-control`。確認入力がある場合はplanへ `--confirmations <本人限定JSON>` を追加する。詳細inventoryの保存は `--output <本人限定フォルダー内の新規ファイル>` を追加する。

applyは同じ対象に加えて `--apply --writers-drained --generation <確認世代> --operation <実行ID> --plan-hash <plan結果> --artifact-hash <artifact結果> --confirmations <確認JSON>` が必要。artifactサブコマンドは追跡／未追跡の非ignoredソースからhashを計算する。パラメーター記述は実行許可の代替ではない。Localは `FIRESTORE_EMULATOR_HOST=127.0.0.1:28080` が必須。Devにエミュレーター環境変数が残っていれば拒否する。

移行・操作手順の変更として包括7ゲートを選定。結合試験は確認入力の拒否、通常モード／writer未停止／別処理の拒否、請求CSVとの一致、履歴保全、取消物件、計画後変更の全件停止、結果不明からの一度だけの確定を検証する。実測結果は[運用記録](../operations.md#2026-10-12-既存延長申込日の棚卸し移行処理)、進捗とDev判断は[ロードマップ](../roadmaps/expiry-notice-read-reduction.md#保証延長改修の工程)に記録する。
