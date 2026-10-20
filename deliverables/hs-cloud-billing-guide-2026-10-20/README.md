# HS向け Google Cloud請求先・カード登録手順

- 成果物：[スクリーンショット付きPDF](../../output/pdf/HS_GoogleCloud_請求先とカードの登録手順.pdf)
- 生成元：`build_pdf.py`。ReportLabとWindows BIZ UD Gothicで生成。
- 実画面：`screenshots/` の5枚。2026-10-20、HSログインのGoogle Cloudで撮影。実カード・会社住所・支払プロファイルは入力していない。
- 確認範囲：ホーム→課金→リンクされた請求先→請求先管理→追加→無料トライアル規約画面。追加規約の同意前で停止。「自分のプロジェクト」のProd行で「お支払い情報を変更」メニューがあることも読取り確認。
- 会社情報・カード入力・登録完了・有料化・関連付け・差替えは説明図と公式資料で補足。実登録済み・実画面撮影済みとは扱わない。今回の資料作成は請求先作成や切替の実行許可ではない。
- 既存ProdのOwner・請求先、バックアップ・PITR・Auth退避保留、アプリ・CIは変更していない。
- 検証：`build_pdf.py` による生成、`pdftoppm` による描画、`pypdf` による全10ページの文字抽出は終了コード0。全ページのレイアウトを目視確認し、8ページの三点メニュー表記の欠字を修正して再生成・再確認済み。文書のみの変更として包括アプリ検証は対象外。生成元・画像5枚・PDF・本READMEの8ファイルを内容確認のうえ、CIの完全一致文書許可リストへ登録する。分類の初回変更は技術検証も行い、文書とアプリの混在・未分類ファイルの拒否を維持する。以後この資料だけの変更は文書扱いとし、配備しない。

公式参照（2026-10-20確認）：

1. https://docs.cloud.google.com/billing/docs/how-to/create-billing-account
2. https://docs.cloud.google.com/billing/docs/how-to/payment-methods
3. https://docs.cloud.google.com/free/docs/free-cloud-features
4. https://docs.cloud.google.com/billing/docs/how-to/modify-project
