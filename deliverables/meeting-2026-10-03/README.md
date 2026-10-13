# 第1回プレゼン後の資料索引

- 整理日：2026-10-03
- 基準：仕様書0.1.90（0.1.89までの回答を整理。新規仕様の採用なし）
- 状態：説明・確認資料の整理。アプリの改修・配備・実データ操作は実施しない。外部未送付。

## 現在使用する資料

[第1回プレゼン後提案事項](../../output/pdf/第1回プレゼン後提案事項.pdf)をプレゼン後の説明・確認に使う。12ページに再構成し、オーナーとの確定事項、HSへ確認する事項、資料提供・日程依頼、将来対応を明示する。資料名は依頼どおり維持するが、全内容が未採用の提案という意味ではない。HSの最終受入・実装完了を示さない。

| ページ | 内容 | 旧版からの変更 |
| --- | --- | --- |
| 1 | 初期範囲と全体の流れ | HS入力・CSV中心の初期運用を明示 |
| 2 | 保証グループ・工務店・支店 | 階層、所属変更、無効化、既定有効表示を統合 |
| 3 | 登録項目・保証番号 | 引渡日必須、物件郵便任意、年度リセット、番号検索を整理 |
| 4 | 保証延長・満了案内 | 10年単位、上限選択、時期制限なし、案内状態を統合 |
| 5 | 保険を年月で管理する理由 | 月だけの欠点と更新年月のメリットを維持し基本契約を明示 |
| 6 | 保険報告と訂正 | 選択CSV、報告済み、直近取消、引渡日訂正を統合 |
| 7 | 過去物件・初期登録 | HSの報告判断、開発側取込、HS照合、未報告初期値 |
| 8 | 保証書・保険・請求のCSV | Word印刷、延長後の日付、保険申込空欄、請求Excel |
| 9 | 所有者変更・取消・終了データ | 旧所有者履歴、所属誤り再登録、CSV保管後削除 |
| 10 | HSに確認する事項 | 優先順で保険減少分、取消削除、30年条件を掲載 |
| 11 | 資料提供・開始準備・運用条件 | Word、初期データ、日程、対応時間・費用条件 |
| 12 | 将来対応・開発側の検討 | 要望時対応と後発要求、技術判断を分離 |

生成元は[build-post-presentation-guide.py](build-post-presentation-guide.py)。旧コマンド[build-insurance-month-guide.py](build-insurance-month-guide.py)も同じ生成元を実行するため、旧内容へ戻らない。PDFの再生成は既存ファイルを更新する。個人情報・アカウント・秘密情報は掲載しない。

## 未決事項の数え方

[未決台帳](../../docs/requirements/house-solution-confirmations.md)が唯一の管理元。現在13大項目。直前の14から、回答済みだったHSC-032の年月基準を解決へ移した。実装が完了したための減算ではない。

| 区分 | ID | 扱い |
| --- | --- | --- |
| HS確認・資料待ち・運用準備を含む8項目 | 001、002、015、025、034、035、036、037 | PDF10〜11ページで質問と依頼に編集。1項目に複数種類の残件あり |
| 開発側技術判断2項目 | 022、023 | DB・検索・費用等を実測し判断。HSに製品選択を求めない |
| 将来対応3項目 | 013、030、038 | ポータル再開、独自メール差出人、送付管理等。初期の未回答扱いにしない |

HSへの実質的な業務確認は、PDF10ページの3テーマと、11ページの資料・日程・運用条件。将来対応や開発側の技術細目でHS向け質問を増やさない。未定・保留を機能不要や実装承認に変換しない。

## 旧資料の位置付け（再配布用の最新版ではない）

以下は当時のデモ手順・検討の記録として保持する。現在の初期納品仕様は上の資料と仕様書を優先し、旧記述を再採用しない。ファイルを削除・複製・改名して参照を切らない。

| 資料 | 今後の使い方 |
| --- | --- |
| [当日画面操作手順書](../../output/pdf/HS_当日画面操作手順書_2026-10-03.pdf) | 当日試作機の操作記録。改修後の現行マニュアルとして使わない |
| [土曜日確認資料](../../output/pdf/HS_土曜日確認資料_2026-10-03.pdf) | 打合せ前の質問。今回資料に置換し、新規回答依頼には使わない |
| [未確定仕様全件](../../output/pdf/HS_未確定仕様事項_全件_2026-10-01.pdf) | 2026-10-01時点のスナップショット。質問を再送しない |
| [担当者別フロー図](../../output/pdf/HS_業務フロー図_02_担当者別_2026-10-03.pdf) | 旧試作のプレゼン図。工務店入力・PDF等を現行と混同しない |
| [物件ライフサイクル図](../../output/pdf/HS_業務フロー図_03_物件のライフサイクル_2026-10-03.pdf) | 同上。今回資料1・4・9ページが現在の説明 |
| [27項目の試作質疑](../../docs/requirements-review-2026-09-29.md)／[質問原稿](questions.json) | 過去の根拠。独立した現行仕様・未決台帳ではない |
| [Prod現地手順](../../docs/runbooks/production-bootstrap-review.md) | 後日使用する手順案として保管。実行・構築は今回しない |

## プロジェクト内の正本

- [仕様書](../../docs/specification.md)：業務別の現行確定仕様。日付順の重複・古い試作記述を整理。
- [未決台帳](../../docs/requirements/house-solution-confirmations.md)：未確定事項・根拠・担当。
- [ロードマップ](../../docs/roadmaps/2026-initial-delivery.md)：工程と完了証拠。文書整理で進捗加算なし。
- [技術改修台帳](../../docs/roadmaps/technical-remediation.md)：既知不具合・改修。
- [運用記録](../../docs/operations.md)／[試作契約](../../docs/design/meeting-prototype-2026-10-03.md)：既存動作・配備・検証証拠。
- [受領資料台帳](../../docs/requirements/source-materials.md)：初回4点・追加資料。原本を変更しない。

## 検証・未反映境界

文書のみの変更としてgovernance-check、PDF再生成、全ページ描画・目視、必須文言・ページ数・未決ID対応・リンクを確認する。アプリ試験・エミュレータ・ビルド・配備は対象外。データ契約・ADR・アプリ・実行用運用手順は変更しない。新しい業務判断はなく、物理設計／互換性／試験への実装反映は未完了のまま。既存未コミット差分を保持し、コミット／外部送付は行わない。

### 2026-10-03 検証記録

以下は本整理後のワークツリーに対する実行結果。PDF生成後に全12ページを描画・目視し、文字切れ・重なりを確認。禁則と英数字の改行を調整後、再生成・再描画した最終版を全ページ再確認した。旧生成コマンドの転送も実行確認済み。

| コマンド／確認 | 結果 | 終了コード |
| --- | --- | --- |
| bundled Python + `build-post-presentation-guide.py` | 12ページ生成 | 0 |
| bundled Python + `build-insurance-month-guide.py` | 同じ現行生成元へ転送、最終版12ページ生成 | 0 |
| bundled Poppler `pdftoppm -scale-to 1100 -png` | 最終版12ページ描画 | 0 |
| bundled Python + [check-post-presentation-guide.py](check-post-presentation-guide.py) | 必須文言、文字の用紙内配置、個人メール非掲載、台帳13ID、ローカルリンク、重み合計100、日付例を確認 | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | 文書・管理ファイル・検証方針整合 | 0 |

PythonとPopplerはこのタスクで確認したCodex同梱ランタイムを使用。外部料金・保険契約原文の独立検証は行っていない。PDFの確定事項はオーナーの明示回答に基づき、契約解釈や実装済みの証明ではない。

### 今回の変更ファイル

- `docs/specification.md`、`docs/README.md`、`docs/roadmaps/2026-initial-delivery.md`、`docs/requirements-review-2026-09-29.md`、`CHANGELOG.md`。
- `docs/requirements/` の `workflow.md`、`master-management.md`、`search-and-list.md`、`alerts-and-dashboard.md`、`case-warranties.md`、`insurance-reporting.md`、`initial-data-model.md`、`branches-and-addresses.md`、`security-and-access.md`、`delivery-and-technology.md`：現行仕様への読取導線を明示。権限・ガバナンスの変更ではない。
- `docs/requirements/house-solution-confirmations.md` と配下の `HSC-013-construction-company-submission.md`、`HSC-032-case-list-month-basis.md`、`HSC-038-company-branches-recipients.md`：順次更新、他事項を保持。
- 本 `README.md`、`build-post-presentation-guide.py`、`build-insurance-month-guide.py`、`check-post-presentation-guide.py`、`output/pdf/第1回プレゼン後提案事項.pdf`。

ガバナンス／エージェント設定の変更なし。既存アプリ差分・既存資料削除差分等は今回操作せず保持。未コミット。ユーザーの次の確認箇所はPDF10〜11ページ。外部送付は未実施。
