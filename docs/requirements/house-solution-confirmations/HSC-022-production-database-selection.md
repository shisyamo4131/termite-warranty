# HSC-022: Production Database Selection

## 2026-10-02 判断内容の具体化（未決）

開発側が判断するのは、確定した保険期間・報告履歴・保証書発行履歴等をFirestoreで無理なく保持・更新・検索できるか、必要ならPostgreSQLへ切り替えるか。HSにはDB製品名ではなく、対象件数・増加量・同時利用・必要な一覧／集計・許容待ち時間・費用上限を確認する。

代表的な保険報告例、採番の重複防止、同時更新、権限境界、検索の欠落と速度、復旧・保守負荷、移行作業を評価して決定する。現時点の推奨はFirestore継続を第一候補として具体的な検索・運用条件で検証すること。件数が少ないとの推測だけで決めず、保証・保険の関係があるという理由だけでもDBを変更しない。仕様・ADR・本番構築は未変更。

- Status: Open technical decision
- Decision owner: Project, with House Solution input

## Confirmed Context

Firestore is adopted for the prototype. PostgreSQL may replace it after a documented production reassessment.

## Questions

1. What representative-data volume, query behavior, response-time target, and operating-cost ceiling must Firestore satisfy?
2. What schema, search, migration, consistency, or delivery risks would require PostgreSQL?
3. By which project date must the production database decision be made?

## Affected Documents

Technology decision, data contract, search design, migration, roadmap, cost, and tests.
