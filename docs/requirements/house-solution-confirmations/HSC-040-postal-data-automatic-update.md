# HSC-040: 郵便番号データの定期自動更新

> 2026-10-20後続決定：オーナーがzipcloudのLocal実装・検証を承認。[ADR0050](../../decisions/0050-zipcloud-postal-lookup.md)により独自定期更新の採用検討を終了し、旧Local自動更新は非起動の復帰用資産とする。残るのはzipcloudの受入れ・配備判断と納品書への依存条件記載。以下は旧方式の記録。

- Status: Resolved（2026-10-20、独自定期更新案をzipcloud利用へ置換）
- Decision owner: Project owner
- Raised: 2026-10-05
- Evidence: 2026-10-20、オーナーが推奨するLocal自動更新方式を採用し、実装・Local検証を指示。クラウド自動公開方式の採用・設定・実行は未承認。

Localの決定は[ADR0049](../../decisions/0049-local-postal-auto-update.md)、手順・検証は[TR-009](../../design/tr-009-japan-post-postal-data.md#local自動更新2026-10-20)。以下の公開・IAM・通知・並行配備判断はDev／Prod向け残件であり、Localにそれらを導入しない。

## 現行と判断事項

[HSC-017](HSC-017-postal-api-conditions.md)は日本郵便CSV、Hosting分割JSON、月次の手動確認を採用。取得・変換・検証・更新日時の記録は実装済みだが、公開データを変更するにはHosting反映が必要。住所検索自体はFirestoreを読まない。

提案は月次ジョブで公式ソースの取得・妥当性検証・変更検出・基準日確認・公開・失敗通知を行う方式。正常時は開発者の月次作業を省き、例外時のみ対応する。通常アプリの未配備改修を郵便番号更新に混ぜず、現在配備されている検証済みアプリ成果物と郵便番号データだけを組み合わせる境界が必要。

採用前に実行基盤/日時、更新元の基準日の取得方法、公開の自動化範囲、変更なし時のlastCheckedAt公開、IAM、失敗通知と最後の正常版への差戻しを決める。公開中のHosting全体の旧版上書きを避ける並行配備制御も必要。データをFirestoreへ移す案は今回採用しない。

## 状態

Local起動時・24時間ごとの確認処理を実装。クラウド自動ジョブ・IAM・公開設定は未実装/未変更。手動運用は[TR-009](../../design/tr-009-japan-post-postal-data.md)を参照。
