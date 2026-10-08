# HSC-023: Firestore N-Gram Query and Consistency Design

## 2026-10-08 現行仕様と実測

最新の採用指示：月別取得とgetAllを実装。2026-10-09 JST、Dev反映・307件補完・全業務値不変・6か月12条件のDB対象集合一致を確認。Localは142件のFirestore／Callable試験成功。読取単体比較は中央値6272→111ms。既存Chrome管理者で2026-10保険の画面・CSV・Functions物件取得305件一致を確認。新規アカウント不要。元タブの操作接続は復帰。CSV保存と認証付き再取得は成功し、操作ツールのdownload待機のみ失敗を再現。300件プレビュー3回と全行照合を完了、Functions中央値18,248→1,031ms（in30＋getAll合算）。別月・請求CSVの実画面検証は未完了。[ADR0039](../../decisions/0039-monthly-query-projections.md)、[現行設計・状態](../../design/monthly-queries.md)。以下は着手前の問題記録であり、現行の全件取得を意味しない。

追加指摘：月別一覧は指定年月をFirestoreの取得条件に反映すべきで、全物件の取得は通常仕様として容認しない。現行コードは全件取得後に月別判定しており未改修。保険は指定月の新規・更新と過月未処理を含め、要確認データの欠落を防ぐ。請求は申込年月と延長後の保証開始年月の両方を扱うため、申込年月だけのクエリでは不十分。改修ではこれらの抽出条件・必要索引（必要なら保存時の検索用年月）を整合させ、報告／取消・延長／取消・引渡日訂正後も対象が一致することを検証する。単純な当月一致への置換で過月未報告を落とさない。現時点では方式設計・実装・既存データ補完・Dev比較は未完了。

本番FirestoreはHSC-022で確定。共有マスタは有効・無効を全件購読してAutocomplete標準で絞るため、同用途のN-Gram設計は残件ではない。物件保証番号完全一致・無条件最新20件は維持。[Dev実測](../../design/evidence/prod-readiness-2026-10-08.md)で300件取込／CSV完全性と取得時間を確認。月別一覧は各回307文書を取得し301件に絞るためRead削減候補として残す。その他の業務検索軸・実初期規模と複数利用者の同時処理は別検証。下記の旧N-Gram導入案は現在の実装要求ではない。


## 2026-10-06 検索仕様の限定と残る検討

- 決定者：プロジェクトオーナー。同日の本タスク（01a10af9-3ed6-78e0-9642-7c35fd362421）で「保証番号完全一致検索のみ」「その他の検索軸は業務内容に合わせて検討」を指示し、後続メッセージでDev反映まで承認。
- 確定：物件／保証一覧は番号全体の完全一致のみ。無条件最新20件は維持。名前・住所・詳細条件を撤去し、DB側の番号条件で取得する。仕様書0.1.107、検索・一覧要件、試作契約へ反映。
- 置換：下記10月5日の物件一覧tokenMap導入目標は現行の実装指示ではない。N-Gram・全組合せ索引・汎用ページングは今回採用しない。
- 状態：一部確定。その他の検索軸は業務仕様確定が先行する。未採番下書きの探索、業務別集計・CSVの対象、マスタ検索の本番規模での整合・費用は未決。
- 判断者：業務条件はオーナー／HS、取得設計はProject。検索利用場面と必要な結果範囲を確認してから取得方式を設計する。
- 実装・Local／Dev検証の実績は[改修台帳](../../roadmaps/technical-remediation.md)で管理する。本件は未決台帳に維持し、全体解決としない。


## 2026-10-05 物件／保証一覧の検索改修を高優先度に指定

- 状態：高優先度の要改修事項。検索方式の具体設計・実装は未完了。
- 根拠：同日のオーナー指示「検索条件が指定されていない場合の最新20件の取得はlimitを使う」「物件／保証一覧の検索機能は優先度高めの要改修事項として記録を更新」。タスク`01a10af9-3ed6-78e0-9642-7c35fd362421`。
- 確認済みの現行動作：`functions/property-warranty.js`のlistは、検索条件なしならupdatedAt降順・文書ID降順に`query.limit(20)`を付けてFirestoreから取得する。画面側だけで20件に切っているわけではない。この部分は要求を既に満たし、今回コード変更不要。
- 残る問題：検索条件が一つでも指定されるとlimitを外し、閲覧権限内の全物件／保証を取得する。物件名・施主名・住所のN-Gramは取得後のFunctions内で生成・照合しており、DBの読取削減に使われていない。
- 改修目標：検索条件がある場合にも全件取得を避ける。文書へのtokenMap保持・編集時の同時更新・DB側AND検索を軸に、他の完全一致条件、日付範囲、並び順、索引、一覧／CSVの完全性、既存文書の補完と権限scopeを設計・検証する。
- 未確定：N-Gram候補を取得後に日付範囲と並び順を処理する案は提案で、まだ採用されていない。DBで処理する条件と取得後に処理する条件、ページング方式を決めてから後続改修へ進む。今回の指示は条件なしlimit確認と高優先度の記録更新であり、検索改修・既存データ補完・配備を実行する指示とは扱わない。

進行と完了条件は[技術改修台帳](../../roadmaps/technical-remediation.md)へ集約する。HSC-023は解決扱いにしない。

## 2026-10-02 判断内容の具体化（未決）

現行試作は無条件20件、検索条件を入れると権限範囲内を全件取得してアプリ側で照合する。20件ずつの画面表示は検索時の読取件数を20件へ制限するものではない。現行試作契約が旧マスタ構造の記述に優先する。

本番では、どの条件をDB側で絞るか、結果を何件ずつ取得するか、検索用項目をいつ更新するか、氏名・住所等の文字検索にどの方式を使うか、CSVを漏れなくどう取得するかを判断する。特に保険報告の対象定義はHSC-036、検索の実現方式は本件として分離する。

判断材料は想定件数での検索結果の正確性・待ち時間・読取量／費用・同時更新時の整合性。全文検索と日付／状態絞込みを同一問題として扱わず、未決の保険報告条件を先に自動実装しない。

- Status: Open technical decision
- Decision owner: Project technical decision

## Confirmed Context

Normalization and 1- and 2-character N-Gram token generation are confirmed for selected master-name searches. The production query and maintenance mechanism is not finalized.

## Questions

1. What token-map shape, query strategy, and indexes are required?
2. How are tokens updated atomically or reconciled after master changes?
3. What representative-data tests prove correctness and acceptable cost?

## Affected Documents

Search architecture, Firestore indexes, trusted writes, data contract, and tests.
