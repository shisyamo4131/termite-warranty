# 0038 本番DBはFirestore

- Status: Accepted
- Date: 2026-10-08
- Decision owner: Project owner
- Source: 本タスクの「本番DB: Firestoreで決定」指示。

本番データベースをFirestoreに確定する。HSC-022の製品選定は解決し、PostgreSQLとの比較をProd構築の前提にしない。DevとProdは別プロジェクトとし、既決の東京リージョン・HS所有方針を維持する。

採用は性能試験の合格や費用保証を意味しない。Devの架空データで容量・検索・CSV完全性・FunctionsログのRead/Write観測を検証し、結果に応じて取得方式を調整する。請求件数との一致は求めない。共有Storeは有効／無効全件購読を維持し、①への変更は計測後の別判断とする。

データ移行・Prod作成・IAM変更はこの決定では実行しない。初期実データ投入はオーナー準備待ち。将来DB変更が必要になった場合は別ADRと移行計画を承認する。

関連：[仕様](../specification.md)、[本番準備](../operations.md#2026-10-08-prod構築前の整理)、[HSC-022](../requirements/house-solution-confirmations/HSC-022-production-database-selection.md)。
