# HSC-023: Firestore N-Gram Query and Consistency Design

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
