# Changelog

## 2026-10-05 折りたたみ式検索の採用

物件・保証一覧は常設の物件名／施主名／住所検索と詳細条件の折りたたみを採用。既定は閉じ、詳細条件は既存項目を保持。検索成功後に閉じ、入力エラー時は開く。適用済み条件を削除可能なChipで表示し、削除時に再検索する。条件なしの最新20件とページネーション、他一覧の条件は維持。モバイル全面対応ではなく幅に応じた折り返しを行う。

## 2026-10-05 本登録・下書き保存後の終了

本登録または下書き保存の成功時は入力ダイアログを自動で閉じ、Snackbarで完了を通知する。失敗時は閉じずに入力を保持。本登録済みの編集保存など、他の操作は従来どおり。

## 2026-10-05 本登録確認画面

- 説明をv-alert化し、物件・日付・保証期間を登録内容カード内で整理。

## 2026-10-05 保険報告一覧の表示修正

- 欠落していた保証期間を追加し、保険／保証のラベル付き2段表示へ修正。

## 2026-10-05 一覧の詳細リンク

物件・保証、保険報告、請求、保証／保険満了案内の物件名は詳細を開くリンクに統一する。カード内の業務操作ボタンの見た目を一覧の詳細トリガーへ適用しない。

## 2026-10-05 満了案内を対応対象一覧へ統一

保証満了案内は案内状態の選択を廃止し、アラート対象の未案内分に固定。案内済みの確認・取消は物件／保証詳細で行う。保険満了案内も検索条件を廃止し、保険満了日のアラート対象のみ表示。保険に案内済み状態は新設せず、報告済み保険も更新前なら対象となり、更新報告によって次の満了日へ進めば対象外になる。最終満了の扱いに関する未決事項は維持。

## 2026-10-05 保証満了案内

- 保証満了案内の条件を案内状態だけに整理。非表示の検索条件が送信されないよう修正。

## 0.1.106 — 2026-10-05

- カード・ダイアログの操作ボタンに背景または枠線を明示し、取消操作を赤い枠付きに統一。

- 次回報告対象年月の値と「保険対象期間の開始前」をsmall Chip表示へ統一。

- 保険カードの次回報告表示を、初回未報告・更新対象月・次回不要に分離。記録不足を要確認のまま保持。
- 初回保証・延長保証、前半／後半5年の保険、保険対象期間の開始前を明記。
- キャッシュ設定は変更なし。開いたままの旧版に対する新版通知は提案段階。

## 0.1.105 — 2026-10-05

- 年月入力で日まで選ぶ必要があったカレンダーを、年・月専用の選択へ変更。
- 物件／保証一覧を申込日→引渡日の順へ変更。保証期間の下に保険期間または「未報告」を表示し、物件名を詳細リンクへ変更。
- Devでの動作確認は通常の本登録も実施可能と受入手順へ明記。正式な過去番号取込みとは区別。

## 0.1.104 — 2026-10-05（Dev反映済み）

- 延長請求は保証開始月、過去物件の初回保険は5年区切り後の次期間、満了の減少報告不要・取消はHS外部対応を確定。
- 全体取消の事前保険報告取消は不要と再確認。取消済みのCSV保管後削除を後発要件に整理。
- 延長請求開始月・CSV基準日表示、初回保険の対象月判定を実装。月内保証終了もHSが選択し、未選択では状態変更しない。全7ゲート・Dev反映済み。削除詳細・アラート用途・請求先単位等は残件。
- オーナー指示によりDevの物件／保証・工務店・支店・採番と関連処理記録を初期化。保証グループ・全アカウント・設定は前後照合して保持。下書き入力用の開始位置を受入手順へ追記。

## 0.1.103 — 2026-10-05

- 保証・保険カードをVuetify既定の表示へ戻し、全v-alertをdensity=compactに統一。
- 延長取消・全体取消の説明を指定文言へ変更。「現在の保証」の重複表示を削除。UX102-4はユーザー確認済み。

## 0.1.102 — 2026-10-04

- 保証期間カードへ請求状態を集約し、保険を保証期間ごとの前半／後半5年で開閉表示。報告・請求詳細の表示を共通化。「案内済みにする」に短縮。
- DevでUI受入をすぐ行える専用架空データ3件を準備済み。保存契約・業務制約・権限は変更しない。

## 0.1.101 — 2026-10-04 保証区間ごとの請求・保険報告

初回／延長の10年区間に請求状態と5年区間の保険報告を紐づけ、取消は依存する後続処理から実施。すべて戻せば引渡日を訂正可能。請求対象期間のCSV、全体取消の影響確認、旧データの未確認表示を追加。[検証・配備状況](docs/design/evidence/lifecycle-101-2026-10-04.md)。

## 0.1.100 — 2026-10-04 案内取消の文言と整合性確認

「未案内に戻す」、タイトル「保証満了案内を取り消す」、影響説明をv-alertへ変更。延長取消の既存復元動作の追加試験。全7ゲート成功、Dev Hosting反映・実画面確認済み。[記録](docs/design/evidence/ux-100-2026-10-04.md)。業務仕様・未確定事項の変更なし。

## 0.1.99 — 2026-10-04 案内状態・取消配置

カレンダー、報告/請求カード、延長配置はオーナーOK。保証満了案内の状態と操作を直近保証行へ集約し、全体取消を右上の色付きボタンへ変更。Dev Hosting反映・実画面確認済み。全7ゲートexit 0。[記録](docs/design/evidence/ux-099-2026-10-04.md)。保証上限到達時の保証/保険アラート除外はHSC-036で確認、抽出条件は不変。全体進捗の加点なし。

## 0.1.98 — 2026-10-04（Dev配備済み・差分UI/UX確認待ち）

- カレンダー選択日の背景／文字色をVuetify既定へ戻す。共通textボタン強制色を撤去。
- 報告・請求詳細を閲覧専用カード化。延長はカード右下、延長取消は直近期間行右へ移動。
- UX-R01/R06をOKとして記録。請求年月・未請求管理と保険満了一覧用途は再確認、現行業務規則は維持。


## 0.1.97 — 2026-10-04（Dev配備済み・UI/UX再確認待ち）

- 入力候補抑制、Vuetify既定の入力枠と余白、日付文字入力、一括選択、請求年月の説明を追加。
- 延長・取消ボタンを関連カードへ移し、取消確認を比較表へ整理。満了案内は読み取り専用画面へ分離。
- U07/U09はユーザーOK。請求先単位はHSC-010で後発確認、C12は保留。

## 0.1.96 — 2026-10-04（Dev配備済み）

- HSの理由付き保証延長取消を追加。番号・履歴・保険状態を保持し、取消済み延長を請求対象から除外する。
- Dev機能検証をCodexが担当し、オーナーは業務フロー・UI/UXを確認する。A13-R/A15-Rはオーナー確認済み。


## 2026-10-04 — 0.1.93〜0.1.95の追加改修をDevへ配備

HostingとpropertyPrototypeを更新。全7ゲートと公開成果物照合成功。入力・完了通知、Autocomplete、同名同住所判定廃止、年月検索、保証満了表示、上限制限、履歴ダイアログを反映。データ・アカウント保持。受入手順を配備済みへ更新、実画面の再確認は未実施。

## 2026-10-04 — A11〜A16受入対応（Dev未配備）

30年延長後の上限20年選択をUIで禁止し、既存サーバー拒否時にデータが変わらない試験を強化。手続き履歴を別ダイアログへ分離し日付ラベル追加。A14は専用3物件・年月別期待行数・CSV照合手順を追記。Devで保存できた原因は未確定。

## 2026-10-04 — A05〜A10受入対応（Dev未配備）

保険報告の検索条件を年月だけへ限定。通常画面の処理完了通知を共通Snackbarへ統一。次の保険更新が保証期間外なら「保証満了」と表示。A05〜A10の確認結果を受入手順へ追記。

## 2026-10-04 — 入力通知・工務店Autocomplete・同名同住所判定廃止（ローカルのみ）

仕様書0.1.93。入力エラーを画面上部Snackbarで通知。工務店検索／選択をAutocompleteへ統合。同名同住所による登録警告を廃止し、保証番号一意性・日付注意は維持。ユーザーのA00-R／A02-R／A04-R合格内容を手順書へ記録。

## 2026-10-04 — A02-R入力検証とエラー表示（Dev配備済み）

仕様書0.1.92。通常画面の入力検証をrulesとフォーム検証へ揃え、一覧・編集・確認ダイアログのエラーを分離。下書きの必須条件とサーバー検証は維持。郵便番号空欄登録の成功と、8桁時の追加指摘を受入手順へ記録。

## 2026-10-04 — Dev受入A00〜A04への対応（Dev配備済み）

接頭辞の区切りを自動付与し旧設定と互換にした。支店住所と会社／支店の郵便番号任意化、工務店候補検索の説明・読込表示分離、本登録の毎回確認と注意事項の追加確認、必須表記・保証保険期間のレイアウトを改修。Dev受入結果は部分記録であり、今回修正のDev受入は未実施。後続指示によりFunctions/HostingをDevへ配備し公開成果物を照合。手順書の全34項目にユーザー検証結果欄を追加。登録済みデータを保持。

## 2026-10-03 — プレゼン後の全体整理

仕様書0.1.90は既決事項を業務別に統合し、旧試作と現行初期範囲の重複・矛盾を整理。HS入力、Word／Excel向けCSV、5年保険報告、年次採番、満了案内、取消・保存・初期登録を統合した。新規仕様の採用ではない。回答済みHSC-032を解決へ移し、未決14→13（HS確認・準備等8、技術2、将来3）と整理。

「第1回プレゼン後提案事項」を12ページに全面更新し、HS向け業務確認3テーマ、資料・日程・運用条件、将来対応を分離。資料索引・ロードマップ・参照導線を現行化。旧PDF5点は当時の記録として保持し、現行配布対象から外した。Prod現地手順・受領原本は保管継続。アプリ・データ・配備・ガバナンスは変更せず、進捗加算なし。

## 2026-10-03 — 延長後の保証書CSVの日付

仕様書0.1.89：保証書用CSVは元の開始日・延長後満了日を出力し、保証番号を維持。文書のみでアプリ・配備・PDF未変更。

## 2026-10-03 — CSV対象と印刷履歴の初期範囲

仕様書0.1.88：保証書CSVはチェックした物件のみ、印刷履歴は要望があれば後発。保険CSVの保険申込欄は空欄。提案PDFに保証書印刷と将来対応のページを追加。アプリ・配備変更なし。

## 2026-10-03 — 提案資料へ過去物件の報告判断を追記

「第1回プレゼン後提案事項」3ページ下部に、初期過去物件の報告時期・対象はHSが判断する旨を追記。翌月に回すのは想定運用とし、自動繰越とはしない。他ページは変更せず、質疑全体のPDF反映は後続。アプリ・配備変更なし。

## 2026-10-03 — 保証番号の検索

仕様書0.1.87：保証番号全体の完全一致検索を採用し、接頭辞・年度の推測補完は行わない。HSC-004の初期業務仕様を解決。コード・配備・PDF未変更。

## 2026-10-03 — マスタ画面の初期範囲

仕様書0.1.86：試作画面を基本に確定階層・有効状態を整備、個人設定・一括編集等は初期追加なし。HSC-008の業務範囲を解決。保険区間の判定基準日は未承認。文書のみ、コード・配備・PDF未変更。

## 2026-10-03 — 有効なマスタの既定表示と保険CSV

仕様書0.1.85：保証グループ・工務店・支店は有効のみを既定とし明示的に無効を含める。保険会社向けはCSV出力、必要なExcel整形はHS対応。文書のみ、コード・配備・PDF未変更。

## 2026-10-03 — 満了案内の取消復元・初期取込

仕様書0.1.84：取消・復元で案内状態を保持、取消中は一覧除外、復元時再判定。過去物件は未案内を基本にHS確認済みだけ案内済みを継承。HSC-005初期運用解決。文書のみ、コード・データ・配備・PDF未変更。

## 2026-10-03 — 重複候補と初期の検証規模

仕様書0.1.83：同住所・同物件名は注意後HS確認で登録可能。初期は同時2名程度、累計件数は初期データで確認、利用上限ではない。HSC-003/026の業務判断を解決。文書のみで実装・性能検証・データ変更・配備・PDF更新なし。

## 2026-10-03 — 受入基準と通信エラー時の再試行

仕様書0.1.82：初期は業務フロー・データ正確性で受入、業務効果の数値目標なし。通信エラー時の入力保持・結果確認・安全な再試行・二重処理防止を確定。HSC-027/028解決。文書のみでコード・データ・配備・PDF未変更。

## 2026-10-03 — 所有者履歴と再登録日付

仕様書0.1.81：変更前の所有者情報と変更日を履歴保存。所属誤登録による再登録では元の正しい申込日・引渡日と保証期間を維持し新番号を採番。HSC-029の初期業務方針を解決、技術設計・実装は後続。文書のみ、コード・データ・配備・PDF未変更。

## 2026-10-03 — 物件の通常移管なしを確認

仕様書0.1.80：別工務店・支店へ物件を移す運用はなく、本登録後は固定。誤登録の取消・再登録方針と合わせて確定。文書のみ、コード・データ・配備・PDF未変更。

## 2026-10-03 — 所属の誤登録は取消・再登録

仕様書0.1.79：工務店・支店の誤登録は開発側の直接訂正ではなく取消・再登録。番号非再利用と新規採番を維持。文書のみ変更、実データ・コード・配備・PDF未変更。

## 2026-10-03 — 所有者変更とグループ訂正機能

仕様書0.1.78：所有者変更時も同一物件の保証番号・期間を維持。グループ誤設定は当面開発側で訂正し、後発でHS向け訂正機能を提供する要求を記録。物件の工務店／支店変更は回答解釈を確認中。文書のみでコード・データ・配備・PDF本体は未変更。

## 2026-10-03 — 申込日定義とHSによる不足日付補完

仕様書0.1.77：申込書記載日を申込日とする。初期データの不足する申込日と全空欄引渡日はHSが補完して提供。未来・引渡後の申込日は注意確認後に登録可能。文書のみ、コード・原資料・実データ・配備・PDF本体は未変更。

## 2026-10-03 — 受入担当と連絡先文字制限

仕様書0.1.76：HS実務担当者が業務確認、HS社長が最終了承、AriLaboが日程調整・連絡。開始日は未定。TEL/FAXは半角数字とハイフンのみを維持しHSC-019解決。文書のみでアプリ・配備・PDF未変更。

## 2026-10-03 — 初期画面・対応端末・問い合わせ経路

仕様書0.1.75：初期は試作版をベースに必要機能、ダッシュボードは将来。Windows Chrome/Edgeを初期対象にし、モバイルはポータル再開時に検討。問い合わせはHS→AriLabo→開発者。初期範囲2大項目解決。文書のみ、コード・配備・PDF未変更。

## 2026-10-03 — 請求用年月・初期登録範囲と見本受領の訂正

仕様書0.1.74：請求用の新規は申込年月、延長は手続き年月。初期登録は開始時保証継続中の全件、終了・取消済みを除外し既使用番号は照合する。保険一覧7項目の見本を共有済み原本で確認し、未受領としての再依頼を撤回。文書のみ更新、コード・配備・PDF本体・原本は未変更。

## 2026-10-03 — 終了データの手動削除・個別復元

仕様書0.1.73：HS管理者がCSV保存を確認して終了物件を手動削除。削除後の延長は開発側が保存CSVから元の番号・期間を復元して個別対応。取消済みの一定期間後CSVなし削除はHS確認待ち・保留。文書のみ更新、機能実装・実データ削除・配備・PDF変更なし。

## 2026-10-03 — HS権限とCSV保管後の削除方針

仕様書0.1.72：初期HSの通常業務権限を共通化し利用者管理・設定を管理者限定。HSによる初期登録了承後は管理Excelへの二重入力を終了。HSC-024/016の初期方針を解決。保証終了データはCSVをHSファイルサーバー保管後に削除する方針を採用、詳細はHSC-001継続。文書のみでコード・配備・PDF・実データは未変更。

## 2026-10-03 — 基本契約でも5年継続報告を維持

仕様書0.1.71：物件別5年満了・翌月月初の継続報告を維持。減少分の報告支援は明示保留、HS個別対応は未確定。保証書CSVをHSのWordひな型／差し込み項目に合わせる方針を採用。仕様・関連要件・台帳・資料メモのみ更新。コード・配備・PDF本体は未変更。

## 2026-10-03 — 基本契約方式の保険とHS側帳票作成

仕様書0.1.70：基本契約への物件追加・除外と月次精算の報告を記録、保険料管理は対象外。初期納品は保証書CSV→HSのWord差し込み印刷、請求用年月別一覧・CSV→HSのExcel。正式PDF生成・請求／入金・送付管理を初期範囲から除外。HSC-010解決。5年報告への影響とCSV項目は継続確認。文書のみ、コード・配備・PDF本体は未変更。

## 2026-10-03 — 初期の保険報告状態とデータ照合手順

仕様書0.1.69：既報告物件ゼロ、初期は初回未報告を確定。過去物件の引渡日起算5年区間の既決事項を再確認し、初回適用日の別入力は採用しない。元資料確認・初期登録・HS照合了承後の通常登録開始を確定。仕様・関連要件・未決事項台帳・資料メモを更新。アプリ・データ契約・配備・実データ・PDFは未変更。

## 2026-10-03 — 階層管理のローカル改修と質疑優先への切替

仕様書0.1.68：会社の所属変更は新規本登録だけへ適用し、既存保証は旧グループ・番号を保持。保証グループ→工務店→支店の管理画面、支店上書き廃止、会社／支店の無効化・再有効化をローカル実装。未配備。検証・差分範囲は既存の試作証跡へ記録。提案事項PDF6ページの所属変更欄を確定内容に更新。以後は質疑を先行し、毎回残数を提示する。

## 2026-10-03 — 保証グループ・工務店・支店の定義訂正

仕様書0.1.67：保証グループ→工務店→支店の従属関係を確定。支店のグループ上書きを廃止し、接頭辞はグループで統一。別の工務店グループは設けない。管理画面の親子構成への変更要求を記録。会社／支店の無効化・再有効化、新規停止と既存保証継続を確定。所属変更時の既存保証の扱いは確認中。仕様・設計方針と説明資料のみで、実装・移行・配備は未実施。

## 2026-10-03 — 取消後の扱いを確定

仕様書0.1.66：取消中は閲覧・復元のみ、編集・延長・保証書出力は禁止、満了案内と通常保険報告対象から除外。取消／復元は保険情報を保持。誤登録も取消に統一し無効を別機能にしない。対外訂正後の情報補正手順は未確定。文書のみ、アプリ・配備・PDFは未変更。

## 2026-10-03 — HSによる取消と復元

仕様書0.1.65：理由付き取消、データ・番号保持と番号再利用禁止、HSの理由付き復元と元の番号・保証期間維持を確定。保証書発行・保険報告後も取消可能とし、確認画面で対外対応の確認を促しHSが連絡する。自動連絡なし。文書のみ、アプリ・配備・PDFは変更なし。

## 2026-10-03 — 新規本登録時の満了案内状態

仕様書0.1.64：新規本登録時は未案内とし、設定した案内時期から一覧表示する。保証書交付状態とは区別。文書のみ更新、アプリ・配備・PDFは変更なし。

## 2026-10-03 — 満了案内は現在状態のみ管理

仕様書0.1.63：初期は未案内／案内済みだけを管理し、連絡日時・担当者・履歴は持たない。ポータル利用開始時に再検討する。保証延長履歴や保険報告状態とは区別。文書のみ更新、アプリ・配備・PDFは変更なし。

## 2026-10-03 — 未案内の満了後継続表示

仕様書0.1.62：未案内の物件は満了後も一覧に残し「満了済み」を表示。保証延長時は新満了日の案内時期で再判定する。文書のみ更新、アプリ・配備・PDFは変更なし。

## 2026-10-03 — 最終満了の案内対象化

仕様書0.1.61：最長20年／30年に達する物件も満了案内対象とし、「最終満了・延長不可」を表示。文書のみ更新、アプリ・配備・PDFは変更なし。

## 2026-10-03 — 満了案内一覧の表示切替

仕様書0.1.60：通常は未案内のみを表示し、案内済み／すべてへ切替可能と確定。案内対象期間の条件は維持。文書のみ更新、アプリ・配備・PDFは変更なし。

## 2026-10-03 — 延長後の満了案内状態

仕様書0.1.59：延長後は未案内に戻し、新しい満了日の案内開始時期まで対象一覧に表示しない。保険報告状態は変更しない。仕様文書のみ更新、実装・配備は未変更。

## 2026-10-03 — 満了案内の対応状態を採用

仕様書0.1.58：物件ごとにHSが「未案内／案内済み」を手動で切り替える機能を初期リリースに採用。保険会社への報告状態とは別管理。延長時の状態等は未確定。仕様のみ更新し、コード・配備は未変更。

## 2026-10-03 — 初期の満了案内方法確定

仕様書0.1.57：工務店ポータル延期に伴い、満了案内対象の一覧表示までをシステムで行い、HS担当者がシステム外で連絡する。自動配信は含めず、既定2か月前・設定変更可能を維持。対応状態記録は未確定。仕様文書のみ更新し、アプリ・配備・PDFは変更なし。

## 2026-10-03 — 保証延長の受付時期確定

仕様書0.1.56：HSは満了前・満了後とも保証を延長可能。従来満了日に10年を追加し、操作日から数え直さない。上限20年／30年は維持。説明PDF5ページ下部に手続き時期と日付例を追加。仕様・資料のみでアプリ改修・配備なし。

## 2026-10-03 — 登録後の保証上限変更

- HSによる登録後の20年／30年変更を確定。30年延長済みなら20年へ変更不可。上限変更だけでは期間延長しない。仕様書0.1.55・資料5ページ目へ反映、コード・配備は未変更。

## 2026-10-03 — 登録項目と保証上限

- 登録時の20年／30年選択は自動判定なし。基礎断熱材の有無・使用資材の自由入力を追加、有の場合は資材必須。物件郵便番号を任意化。仕様書0.1.54、資料1ページ目更新・5ページ目追加。未実装・未配備。

## 2026-10-03 — 保証期間の単位確定

- 初回・最短10年、10年ごとに延長、通算最長20年または30年を確定。5年保証は対象外。30年の適用条件は未確定。仕様書0.1.53・提案資料1ページ目へ反映。コード・配備は未変更。

## 2026-10-03 — 初期値001への訂正・取込後の続き採番

- 通番初期値を000から001へ訂正。グループ／年度別最大値の次から採番し欠番は埋めない方針を確定。必要グループを先行登録し将来追加可能とする。仕様書0.1.52、資料4ページ目を更新。未実装・未配備。

## 2026-10-03 — 初期登録担当と年度別採番

- 一意性担保のため開発側が初期登録。通番は0始まり・3桁まで0埋め・4桁以上可・年度リセットと確定。仕様書0.1.51、提案資料4ページ目へ反映。取込後の開始位置は追加確認、未実装。

## 2026-10-03 — 過去物件の適用区間ルール

- 引渡日起算の5年区間から、初回適用時点を含む区間を選ぶ共通ルールを採用。保証継続が前提。仕様書0.1.50と提案PDF3ページ目を更新。基準日の入力方法は未確定、未実装。

## 2026-10-03 — 過去物件の初回適用区間

- 2019年引渡し・2026年初回適用の例は、2019〜2024年は適用なし、2024〜2029年が新規適用対象と確定。起算日と実際の適用区間を区別。仕様書0.1.49と提案資料3ページ目へ反映、未実装。

## 2026-10-03 — 過去物件の保険開始日

- 過去物件も引渡日＝保険開始日で統一。別の開始日を登録する提案は不採用。5年以上経過した物件の初回報告・初期状態は追加確認。仕様書0.1.48、未実装・未配備。

## 2026-10-03 — 保険更新後の引渡日訂正

- 保険更新後の引渡日は画面編集不可、HSから開発者へ連絡して個別対応。更新報告を取り消しても編集解禁しない。仕様書0.1.47と提案資料2ページ目へ反映、未実装・未配備。

## 2026-10-03 — 初回報告後の引渡日訂正

- 初回報告済み中は引渡日編集不可。取消→訂正・期間再計算→保険会社へ訂正連絡→再度報告済みの手順を採用。仕様書0.1.46、未実装。
- 説明PDFを「第1回プレゼン後提案事項.pdf」へ改名し、初回報告後の訂正をHSへの提案として2ページ目に追加。

## 2026-10-03 — 報告取消の復元範囲・プレゼン事象

- 直近の報告済み操作を取り消す方針を確定。初回は日付維持、更新は直前の満了日・更新年月へ復元。仕様書0.1.45、説明PDFへ反映。
- 本登録時の入力訂正後も同じエラー、工務店登録時の存在しないHSC選択と追加後も続くエラーを、ユーザー観測・未再現の後続改修事項としてTR-010へ記録。コード・配備は未変更。

## 2026-10-03 — HSによる報告済み取消（仕様のみ）

- HSの物件／保証編集画面で、判断に必要な情報を示す確認ダイアログを経て報告済みを取り消す要件を確定。更新時の期間復元等は確認中。仕様書0.1.44と説明PDFを更新、未実装・未配備。

## 2026-10-03 — 報告履歴も将来構想

- 報告履歴の蓄積・閲覧は初期実装に含めず、要望時に検討。現段階は報告済み操作と既決の状態・期間反映を維持。HS担当者2名前後はオーナーの推定として記録。仕様書0.1.43と説明PDFを更新、未実装・未配備。

## 2026-10-03 — 保留機能は将来構想

- 年間200件超程度というオーナー申告と操作の簡潔さを踏まえ、保留機能を初期実装から除外。未選択を未報告で残す運用を維持。仕様書0.1.42・説明PDFを更新、アプリ・配備は未変更。

## 2026-10-03 — 選択した物件の報告（仕様のみ）

- HSが選択した物件だけを出力し、実際に報告した分だけを報告済みにする。未選択は未報告を維持。仕様書0.1.41と説明PDFへ反映、アプリ・配備は未変更。

## 2026-10-03 — 新規加入の報告漏れ（仕様のみ）

- 指定年月より前の引渡しで初回未報告の物件を「過去の未処理分（新規）」として別表示。仕様書0.1.40と説明PDFへ反映、未実装・未配備。

## 2026-10-03 — 更新報告漏れの表示（仕様のみ）

- 指定年月より前に満了した更新未処理物件を、保証残存・取消なしを条件に「過去の未処理分」と区別して表示する仕様を確定。仕様書0.1.39。説明PDFを同方針へ更新、アプリ・配備は未変更。

## 2026-10-03 — 初回保険満了日の保存時点（仕様のみ）

- 本登録時に満了日・保険必須更新年月を保存し、初回報告済み操作では日付を変更しない。出力だけでは未報告を維持。仕様書0.1.38、未実装・未配備。

## 2026-10-03 — 更新年月と引渡日必須（仕様のみ）

- 保険必須更新年月＝保険満了年月を確定。全保証グループで引渡日必須、UHで不明の場合はHSが運用ルールに従って設定。仕様書0.1.37へ反映、未実装・未配備。

## 2026-10-03 — 保険更新後の期間確定（未実装）

- 更新報告済み操作で、前の満了日の翌日から5年間へ継続し、満了日を更新する方針を確定。
- 月のみ指定の問題、満了月と報告月の違いを説明する資料を追加。報告年月を入口とする案は未採用。

## 2026-10-03 — 保険更新の検索軸・報告時期（未実装）

- 更新分は保険満了年月で抽出し、翌月月初に報告する。次の保険開始月で抽出する案は不採用。

## 2026-10-03 — 保険報告の部分確定（未実装）

- 新規分は指定引渡月で出力し、利用者の別操作で報告済みと初回保険満了日を記録する方針を確定。
- 10年で保証終了の場合、5年目は保険更新、10年目は更新しない。更新分の報告時期・抽出方式は検討中。

## 2026-10-03 — 初期運用担当の確定（仕様のみ）

- 初期運用はすべてHS入力。工務店入力機能は残し、周知の時間不足により利用開始を保留。
- 保証書出力はHS専用とする。仕様書0.1.33へ反映、実装・配備は未変更。

## 2026-10-03 — 後発仕様の確定（未実装）

- 各種一覧のページ操作を常時表示する方針を採用。条件なしは最新20件限定を維持し、1ページ・前後移動無効とする。
- 試作のコード・配備は変更しない。検索を主な到達手段とする設計理由を仕様書0.1.32へ記録。

## 2026-10-02 — Dev配備・デモ初期化

- 申込日入力／固定、引渡日期間CSV、保証グループ固定・無効化をDevへ配備。
- 最新指示により物件・保証と業務マスタ・採番カウンターを削除。管理者2名のみ保持、パスワード変更なし。
- 保険報告状態・延長期限・定時更新は仕様確認まで保留。運用文書に秘密を含まない管理者識別情報を記録。

## 2026-10-01 — デモ確認後の改修（2026-10-02 Dev配備済み）

- 保険報告用一覧・CSVの対象を引渡日期間で抽出。
- 申込日を本登録前に入力・訂正し採番年度に利用、本登録後は固定。
- 保証グループの接頭辞・年度開始月を作成直後から固定。有効／無効を追加し、新規利用を制限。
- 年度2桁を受領サンプルで確認。会社／支店停止と保険報告状態の運用案は未採用。

## 2026-10-01 — 満了案内設定・引渡日未設定（Dev配備済み）

- 保証・保険の案内時期を既定2か月として管理者設定を追加。保険は引渡日から初回5年の別一覧。
- 全グループで引渡日未設定で本登録・採番でき、後日の日付入力で期間計算。未設定の表示・絞込を追加。
- 既存保証番号と重複する新規登録を拒否。年度リセット・取込・請求書は保留。


## 2026-10-01 — 打ち合わせ用試作（開発環境へ配備済み）

- 担当者別工務店アカウント、本店／支店範囲、物件中心の恒久保証へ変更。
- 下書き・本登録採番、10年延長、上限20/30年、引渡日訂正履歴、理由付き取消／HS復元。
- グループ設定、期間指定CSV、直接保存できる見本保証書PDF、画面のみの満了案内。
- 開発試験データの初期化手順を追加。実行・配備・最終検証は運用記録で区別する。

## Unreleased

- Confirmed group-assignment changes apply only to new warranties. Existing warranties retain their group and permanent number through renewal; company assignment and issued-warranty group are distinct (2026-10-01). Specification-only; implementation/migration pending.

- Adopted company property/warranty registration and extension without per-submission HS approval, retaining HS-issued accounts and company ownership boundaries (ADR 0034, 2026-10-01). New numbering uses the assigned group and application-date year; implementation, pending-request migration and validation remain pending.

- Excluded HS branches from the target scope, including their master and responsible-branch entry/display/filter requirements (HSC-033, 2026-10-01). Construction-company branches remain separate. Prototype removal and data compatibility work are pending; existing records are unchanged.

- Confirmed the application date as the warranty-number year basis (2026-10-01 owner decision prioritizing the Google Form answer). Fiscal-year boundaries/unification and number format remain open. Specification-only change; numbering implementation and data conversion are pending.

- Confirmed one permanent warranty per property with an unchanged number across renewal and retained period history (ADR 0033, 2026-09-29). Recorded warranty-group purpose and separated insurance decisions. Specification/design reflection only; implementation, data conversion and deployment remain pending. Refreshed the clarification register with the second response sheet and reported LINE answers; next questions require owner wording review before a new PDF.

- Recorded the 2026-09-28 confirmed HS clarifications: date meanings, date-only warranty periods, inspection exclusion, construction-company expiry recipients, and monthly insurance reporting/basic fields. Dependent migration, billing, portal, and insurance-cycle work remains paused pending answers.
- Fixed postal lookup retry after a transient manifest failure; a failed fetch no longer prevents all later lookups in the same application session. Local regression passed; homeowner/company save/reload and stale-warning smoke were checked. A subsequent local retry verified property save/reload for autofill, no-match/manual entry and candidate selection, plus bounded desktop/narrow-screen and keyboard smoke. Formal accessibility acceptance remains pending. The retry fix is not deployed.

- Implemented and deployed the Japan Post UTF-8 postal-data transformation, 948 same-origin Hosting shards, manifest integrity metadata, provider lookup, candidate selection, and manual fallback for all three address master forms; public manifest/shard smoke and authenticated lookup/candidate/manual-correction UI smoke passed. Save/persistence, responsive/layout, and accessibility acceptance remain unverified. Dev revision `1d113e5b3e719679ed8d7d82ac3c313b0e6daf71` was deployed by workflow run `35303604261` after push verification run `35303358082`.
- Improved the same-site password setup/reset form with a verified username field and stable password-manager attributes; revision `3a59f1110f6eba54bae3de42fb32206ed3b5f0df` was deployed to Dev on 2026-09-18 by GitHub Actions run 35297212067. On 2026-09-18, Chrome associated and saved the generated reset password with the correct account email as intended.
- Resolved HSC-020 with House Solution production ownership, separated Dev/Prod operations, conditional Firestore/Functions region, deployment authentication and approval baseline, bounded backup/recovery targets, and monitoring thresholds; provisioning and implementation remain pending.
- Resolved HSC-017 by withdrawing Google Geocoding and adopting Japan Post's official nationwide UTF-8 postal-code CSV with same-origin Hosting lookup design; ADR-0022 is superseded and the lookup is implemented and deployed to Dev.
- Resolved HSC-011 and recorded data responsibility and decision authority: House Solution directs business-data purpose and lifecycle; processors and cloud-provider production terms remain bounded and partly unconfirmed.
- Resolved HSC-012: no direct homeowner account or self-service access in the initial release; homeowner requests use a House Solution contact channel, while contact and notification behavior remain open.
- Resolved HSC-009: retained live master values for existing cases without use-based snapshots, edit warnings, reasons, approvals, or master edit history; preserved ordinary validation, reference integrity, and lifecycle rules.
- Aligned the warranty-service list with the responsive data-table design used by the other master lists while retaining type, short name, and default warranty period.
- Integrated the user-authored responsive property-list table while retaining parent-owned search, paging, navigation, and lifecycle mutations.
- Added inclusive application-date and handover-date range filters with one-sided ranges and reversed-bound validation; rejected mandatory/default case year-month filtering while retaining freshest-20 and complete filtered paging behavior.
- Extended the provider-neutral postal-lookup seam to construction-company forms, added blocking digits-and-hyphens validation for homeowner/construction-company TEL and FAX, and confirmed minimal normalized authentication-email validation.
- Accepted the shared-account construction-company portal as the initial structured response workflow, defined reversible non-deleting account lifecycle and the financial/contracting-party boundary, and removed the obsolete cross-service FileMaker cutover assumption.
- Added the tracked contract and ignored scaffold/fixture/preview foundation for user customization of the property-list table.
- Added five-record pagination to dependent-property lists on master details and the applied-warranty list on case details; kept the notification-management guidance alert from shrinking and aligned property-form field order.
- Added required property building area, required warranty-service type, case filtering by warranty-service type, and development-only backfill defaults.
- Aligned staff and construction-company new-case dates with protected handover-to-warranty-start auto-fill, derived the portal response email from the authenticated company account, and added retained pre-approval new-case withdrawal.
- Recorded deterioration countermeasure grade and grade-based warranty limits as HSC-034 and deferred prototype implementation.

- Added a manual, development-only seed for 25 internally consistent fictional construction-company, homeowner, property, and case records so filtered lists can verify results beyond 20; upgraded GitHub Actions dependencies to their Node.js 24-based current majors.
- Kept timestamp-free branch names visible when a case filter switches the list to complete-collection mode.

- Added 20-record pagination and total counts for complete filtered case/master results, added role-bounded House Solution staff-account management, and limited warranty-service short names to six displayed characters.

- Changed case and master lists so blank conditions show the freshest 20 records while any active condition searches the complete ordered collection; moved case conditions into an apply/cancel dialog with a draft reset action.

### Added

- Added required warranty-service short names, optional warranty-service/property notes, aligned list layouts and titles, and a development-only short-name backfill.

- Added a provisional construction-company portal prototype with one shared account per company, self-service password setup/reset, company-scoped pending case work, staff return/approval, atomic promotion to registered data, and explicitly simulated queued email notifications.

- Added the zero-network TR-009 postal-lookup foundation with optional property/homeowner-only provider injection, sanitized provider-neutral results, per-field stale-response protection, and save/close/reset cancellation; no Google adapter or credential is present.
- Added the TR-009 pre-implementation design for property/homeowner Google postal-code lookup, including an authenticated server proxy, function-scoped environment credentials, manual-entry fallback, and explicit gates for Japanese response mapping and external setup.
- Added an ignored, user-owned JavaScript UI component workbench, contract-and-fixture workflow, and isolated Nuxt/Vuetify preview for collaborative visual authoring without tracked-application or Firebase coupling.
- Provisioned the developer-owned `termite-warranty-dev` Firebase environment and added an explicit dual-runtime configuration for local Emulator verification and same-site Firebase Hosting deployment in Tokyo.
- Added homeowner postal/address, optional telephone/fax/notes, and compatible master-management/detail/seed handling. Postal-code API lookup remains explicitly deferred in the local prototype until its integration information is available.
- Added active-case applied-warranty add/edit/cancel/invalidate controls backed by an atomic callable transaction with stale-update protection and immutable service/period history.
- Adopted the Clear Sky Vuetify theme across the local prototype UI.
- Added separate, list-linked detail routes for the four supported masters and cases. The screens reuse existing edit dialogs, preserve readable inactive masters and terminal cases, provide return/not-found states, show all applied-warranty details, and list a construction company's linked properties.

### Changed

- Restored the provisional authentication-focused Firestore Rules posture for staff business data. Rules retain enabled-account, construction-company ownership, account, and server-owned-state boundaries but no longer claim schema, workflow, or soft-delete integrity for authenticated requests outside the supported application flow.
- Added a deterministic, clearly synthetic local Emulator case dataset covering active alert/non-alert, notification, cancelled, and invalid states without selecting a real Firebase project.
- Added button-triggered create/edit dialogs for the four supported masters and case registration, including nested four-master creation that preserves the current case draft.
- Added active-case editing with stale-update protection and property-derived homeowner/company references, plus exact case/master/address/warranty filters with Vuetify expiry-date input.
- Added required case application and handover dates to registration, active-case editing, and the local Firestore contract.
- Added required construction-company address fields and optional building, telephone, fax, contact-person, contact-details, email, and notes fields to full and quick-create dialogs.
- Added dashboard-first Navigation Drawer navigation, trusted create/edit/inactivate/reactivate screens for construction-company, homeowner, warranty-service, and property masters, and Vuetify date selection for case registration.
- Added optimistic master revisions and server-derived N-Gram updates.
- Approved and documented a local-prototype-only Firestore data contract and fictional `demo-termite-warranty` emulator identifier without selecting a real Firebase project or production schema.
- Pinned the official-package local prototype baseline for Nuxt 4, Vuetify 3, Firebase Web, Firebase CLI, Cloud Functions, Admin SDK, and rules testing in the manifest and lockfile.
- Added a local-emulator-only Nuxt/Vuetify vertical slice with synthetic authentication, enabled-staff Firestore access, seeded master selection, atomic case/first-warranty registration, current-master list display, alert evaluation, and Firestore Rules regression tests.
- Added the first dependency-free prototype domain slice for warranty expiry and alert calculations, extension start dates, initial enrolment dates, and confirmed N-Gram search normalization/token generation, with Node.js unit tests and a machine-readable domain-test verification gate.

### Changed

- Displayed approved staff notes as confirmation comments in the construction-company portal while retaining the correction label and warning treatment for returned work.
- Allowed an approved one-to-one construction-company portal record to be reinitialized for a later renewal request while continuing to reject duplicate unfinished work.
- Corrected the Dev authentication-email record: Firebase currently rejects the approved `.web.app` action URL with `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`, so same-origin password setup/reset remains pending provider resolution or a separately approved delivery alternative.
- Added a same-site Japanese Firebase password setup/reset action page and Japanese reset-email localization while retaining Firebase's standard email delivery.
- Made the staff Navigation Drawer initially closed and applied Vuetify's slim list spacing to reduce the icon-to-title gap.
- Replaced page-width operation-result alerts with a shared bottom snackbar across staff and construction-company screens, while retaining contextual guidance and form-local errors inline.
- Removed email from the construction-company master schema and form, display the separately issued account email on company details, added linked-property sections to homeowner and warranty-service details, renamed the company section to `担当物件`, and added Navigation Drawer menu icons.
- Split staff construction-company portal management into notification-first `通知管理` and `アカウント管理` submenu screens while preserving `/company-portal` as a redirect to notification management.
- Removed the notification screen's unnecessary descending branch document-ID index dependency and surfaced branch-listener failures through the existing error alert.
- Deployed the construction-company portal prototype and corrected new-service boundary documentation to the development environment after all comprehensive gates passed; unauthenticated smoke verification confirmed the shared login, self-service password setup/reset action, and protected staff/company routes without writing data.
- Integrated the accepted user-authored homeowner table with responsive columns, accessible lifecycle/detail actions, loading and empty states, and typed bounded-list inputs while retaining all navigation and Firestore responsibilities in the parent screen.
- Deployed the zero-network TR-009 postal-lookup foundation to the development environment after the comprehensive workflow passed, and smoke-verified the supported manual property/homeowner behavior and continued construction-company exclusion without changing data.
- Replaced the planned Japan Post postal-code API with Google Maps Platform Geocoding API to align Dev/Prod project and credential management with Firebase, while retaining a replaceable provider boundary and manual-entry fallback; production ownership and billing remain unresolved.
- Deployed the current prototype to the `termite-warranty-dev` Firebase environment after comprehensive verification, removed four obsolete remote Callables, and enabled one-day cleanup for generated Functions container images.
- Integrated the first user-authored UI component into the construction-company master list, preserving its responsive table design while adding typed inputs and legacy address compatibility.
- Adopted the ignored user-owned JavaScript UI component workbench as a governed optional collaboration workflow, including contract-based review outcomes and coordinator-owned tracked integration.
- Bounded unfiltered case and master subscriptions to the freshest 20 documents with stable cursor ordering, removed per-case warranty listeners from case lists through an atomic parent projection, and clarified that current filters and dashboard totals cover the visible window.
- Split the former aggregate prototype-data composable into typed case command, master catalog, list query, detail query, pure date/draft, and thin UI orchestration boundaries with explicit loading/ready/error state, independently testable retry and listener cleanup, and protection from late callbacks emitted by removed warranty listeners.
- Consolidated the four master form models, initialization, field sections, and write-payload mapping across full creation, quick creation, and detail editing while preserving their existing UI and persistence behavior.
- Restricted local seeding to this project's exact dedicated Auth and Firestore Emulator endpoints so inherited environment variables cannot redirect writes into another local project's Emulator process.
- Moved the local Nuxt and Firebase Emulator services to a dedicated non-conflicting port set, with the colocated AirGuardV2 environment retaining priority.
- Removed the unused self-profile Callable from the local Functions surface while retaining the live Rules-governed staff-profile subscription and the separate future server-enforced account-management boundary.
- Replaced construction-company, homeowner, property, and warranty-service CUD Callables with direct Firestore writes, while retaining atomic revision diagnostics and removing the unused master Functions surface. Its original Rules-based data-integrity boundary was later superseded by ADR 0025.
- Made the development Firebase deployment fail closed behind every registered verification gate, bound Hosting deployment to the verified generated artifact, registered the complete Callable integration set, recursively syntax-checked all Functions modules, and removed the routine general-purpose `--force` bypass.
- Made the generated Functions copy of `src/domain` deterministic and self-verifying across the supported Emulator, Callable-test, syntax-check, and Firebase predeploy paths, with an independent drift check.
- Implemented last-write-wins for the four trusted-callable master update and lifecycle paths while retaining server-managed revisions, validation, atomic writes, property non-propagation, and the separate case/applied-warranty stale-baseline policy; the registered Emulator gate now covers the master Callable boundary and concurrent full-payload behavior.
- Adopted last-write-wins for master changes, bounded unfiltered subscriptions to the 20 freshest documents, and a governed technical-remediation backlog covering Functions shared-code preparation, verification/deploy gaps, master-form duplication, list-query scaling, and `usePrototypeData` responsibility separation. Case year/month filtering remains unresolved.
- Excluded current-system data migration from the new-system release, resolved the migration-scope and FileMaker-delivery questions, and reframed cutover around new registrations, system-of-record ownership, and rollback without data import.
- Made case homeowner and construction-company references independently editable after property-driven initial selection in both registration and active-case editing, with active-reference validation and stale-update protection.
- Preserved every existing case's homeowner and construction-company references when either corresponding property reference changes; explicit property selection in case registration/editing still supplies editable defaults.
- Moved the project into prototype implementation and selected Firebase Emulator Suite for local verification until the developer-owned development Firebase environment is provided.
- Recorded the peak-call planning upper bound of 40 per day (approximately 1,200 per 30-day month and 14,400 per year if every call is a new case), adopted temporary parallel operation before cutover, and excluded operation-history/audit-log records from the initial release.
- Defined extension-warranty start-date default as the day after the existing expiry, while permitting staff edits and overlap; required a House Solution-confirmed migration report before cutover; allowed actual homeowner data in development and migration testing after a separate confidentiality agreement.
- Adopted manual Firebase Console bootstrap for the initial developer superuser without custom claims, deferred email-address verification, and retained password-setup email delivery.
- Defined warranty extension as adding a new applied warranty to the existing case, preserving the prior applied warranty as history.
- Changed legacy-data migration to best effort after source inspection; House Solution retains the FileMaker data and complete historical migration is not a release acceptance condition.
- Adopted Nuxt, Vuetify, and Firestore with a 1- and 2-character N-Gram token map for the prototype; added property names and defined two-character free-text matching for names.
- Made property name required, fixed branch/service case filters as master-record selections, and recorded the reference N-Gram normalization behavior.
- Replaced direct case-list name search with master-record filtering; retained the N-Gram capability and three-or-more-character AND-match rule for a future selected free-text feature.
- Added homeowner ID to cases as an independently retained case reference.
- Defined N-Gram master-name search for construction companies, homeowners, and properties, including case-filter selection dialogs.
- Added email/password staff authentication, administrator account lifecycle UI, and password-reset requirements while retaining the provisional access-control boundary.
- Adopted Firebase Authentication; required password-setup emails and immediate disabled-account access revocation, with enforcement design explicitly pending.
- Adopted Nuxt SPA and Cloud Functions for Firebase; approved Firebase Admin SDK account management, enabled-account Firestore access checks, and non-deleting account disablement.
- Made browser-session persistence an initial-release requirement: closing the browser window clears staff authentication, while account disablement remains separately enforced.
- Adopted Firebase Hosting and defined the developer-superuser, House Solution-administrator, and general-staff account-management boundary; no inactivity-time logout is required initially.
- Allowed the developer superuser to disable House Solution administrators and defined the editable general-staff account fields.
- Fixed House Solution administrator account assignment to general staff; future selectable roles exclude administrator and developer-superuser roles.
- Required separate Firebase projects for development and production, set CSV as the planned FileMaker-data reception format, and recorded provisional authentication-email identity requirements.
- Recorded developer ownership of the development Firebase project while production ownership remains under confirmation.
- Deferred custom Gmail authentication-email delivery and selected the standard Firebase Authentication email configuration for the initial release.
- Replaced imported Japan Post postal-code data and monthly manual updates with automatic external-API lookup; retained a replaceable provider boundary.
- Defined seven-digit postal-code validation with optional hyphen, focus-loss lookup, multiple-town-area handling, manual no-match/special-code entry, and post-lookup address correction.
- Defined postal-code API-failure behavior: show a message, preserve input, and permit manual address entry and saving.
- Adopted Japan Post's official Postal Code and Digital Address API for postal-code address lookup.
- Excluded file attachments from the initial release and recorded free-text-search architecture as an unresolved technology decision.
- Recorded the mandatory end-of-October 2026 production release target, including data migration, and its initial delivery roadmap.
- Defined the initial-release scope and the full-history migration target; recorded deferred construction-company submission alternatives.
- Added provisional alert, data-model, role, and access-control requirements, including documented security residual risks.
- Defined the initial notification-state flow and recorded the working case-based construction-company snapshot direction.
- Added provisional property management, expiry-date calculation/override, and initial search-filter requirements.
- Added whole-year warranty periods, separate case-per-service registration, and master-management entry requirements.
- Defined expiry-date calculation, reversible master inactivation, and default expiry-date-descending ordering.
- Defined case-list columns, inactive-master selection behavior, and non-retroactive warranty-period changes.
- Added editable but non-deletable case handling, continuing expiry alerts, list emphasis, and dashboard alert listing.
- Defined active/cancelled/invalid case statuses, alert eligibility, and dashboard columns.
- Defined irreversible cancelled/invalid cases and required case-registration fields.
- Defined warranty-period snapshots on cases, with the service period as the new-case default.
- Added branches, five-part property addresses with postal-code auto-fill, duplicate-master acceptance, and multiple applied warranties per case.
- Changed alert and list/dashboard requirements to one case per row: applied warranties determine alert eligibility, while warranty-period and expiry-date details are shown only on the case detail screen.
- Removed case-wide warranty-period, expiry-date, and enrolment-date requirements; each applied warranty supplies its own expiry calculation.
- Added applied-warranty start dates, applied-warranty cancellation/invalidation, and case-level expiry-date filtering when any applied warranty matches.
- Defined initial-enrolment-date derivation from the oldest active applied warranty, retention of cases without active applied warranties, and applied-warranty-level notification status.
- Defined initial notification-status choices, a case-level `not notified` marker, and fixed case ordering by update date then registration date in descending order.
- Moved responsible-branch ownership from construction-company, homeowner, and property masters to the case.
- Defined case-level notification-status filtering by any matching applied warranty, editable case branch assignment, and branch-master-name tracking on existing cases.
- Defined warranty-service name tracking, default-period behavior for newly added applied warranties, and immutable applied-warranty periods with start-date-triggered expiry recalculation.
- Added responsible-branch search, positive-integer warranty periods, and case update-date propagation from applied-warranty changes.
- Replaced case-level construction-company snapshots with direct construction-company, homeowner, and property references whose displayed values follow master changes.
- Permitted repeated applied-warranty products and defined the February-29 expiry rule.
- Defined free-text cancellation/invalidation reasons and deferred notification timestamps, attribution, and response handling.
- Locked cancelled/invalid cases against all edits while allowing confirmed active-case reference changes.
- Defined non-propagation from property-master homeowner and company changes and required property-address components.
- Added automatic case numbering with list/dashboard display, responsible-branch display, and `not notified` as the default for newly added applied warranties.
- Defined provisional fixed-width case numbering, legacy case-number retention during migration, and exact-match case-number search.

### Fixed

### Removed

### Security


## 2026-10-03 独立先行改修（Local・未配備）

- 本登録の引渡日必須、物件郵便番号任意、基礎断熱材／資材、面積精度、注意確認、所属固定、年度別採番を反映。
- 保険年月抽出・選択7列CSV・報告済み／直近取消、保証案内状態と延長時リセット、請求年月CSVを追加。過去初回区間・Word項目・削除は保留。
- ログイン取得失敗と再試行、工務店検索・支店候補、ページ表示を改善。初期画面の見本PDFを外しWord項目待ちを明示。
- [Local受入手順](docs/runbooks/local-acceptance-2026-10-03.md)と[検証記録](docs/design/evidence/independent-implementation-2026-10-03.md)。ユーザーのLocal受入と配備は別途。


## 2026-10-03 Dev受入先への切替

- オーナーは独立先行改修のDev反映と、Devテストによる今回改修の受入を承認。受入手順へDevの開始方法と保証グループ作成を追加。
- 管理者2名を保持し、デモ用アカウント・物件・マスタ・採番の初期化を明示承認。実行結果は[運用記録](docs/operations.md#2026-10-03-dev受入用配備と空データ初期化)で管理する。Prodは対象外。
