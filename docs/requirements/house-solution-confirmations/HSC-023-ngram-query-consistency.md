# HSC-023: Firestore N-Gram Query and Consistency Design

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
