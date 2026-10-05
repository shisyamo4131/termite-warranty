# HSC-026: Scale and Response-Time Targets

## 2026-10-03 Resolution — 初期の検証規模

HS担当者2名前後・年間200件超程度という既報告を踏まえ、初期は同時利用2名程度を想定して検証する。累計件数は初期データを確認して設計へ反映する。人数・登録件数の制限ではなく、実測性能や料金の保証でもない。既存の40件/日から算出した計画上限を現在の実件数として使わない。

初期の業務側前提は解決。原資料件数の取得はHSC-015、DB・検索方式と性能・読取量の実測判断はHSC-022/023、費用条件はHSC-025で管理する。未採用の検索2条件必須化を今回採用しない。決定者：オーナー、日付・根拠：2026-10-03本Codex会話②YES。仕様書0.1.83とdelivery-and-technologyへ反映。未コミット・性能検証未実施。

## 2026-10-02 土曜日の情報収集項目

オーナー指示により、初期保証件数（グループ別・有効／終了／取消）、月の新規・延長件数、将来増加量、会社・支店・HS／工務店利用者数、同時利用人数と集中時期、通常／最大の報告出力件数、実際の検索例、許容待ち時間、端末、利用時間帯、運用費目安を当日確認資料へ整理する。正確な数が分からなければ概数と確認担当・回答期限を得る。

件数や番号桁数から未確認の規模を断定しない。HSへDB製品や索引の設計を依頼するのではなく、開発側がHSC-022／023の判断に使う業務条件を聞く。下記の検索2条件必須案は歴史的な未採用案で、今回の当日提案には含めない。関連する保存期間・費用・端末・開始日は各事項に回答を反映する。

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Forty telephone contacts per day is only a planning upper bound. Actual new-case rate, historical count, concurrent users, and response-time targets are unknown.

## Project Recommendation for Discussion — Not House Solution-Confirmed

- With no conditions, use a realtime subscription to the latest 20 cases.
- When conditions are present, the production target is to subscribe to or load all matching cases and paginate 20 rows at a time in the client. Require at least two search conditions to execute, except that exact case number may execute alone. The purpose is to avoid excessively broad result sets and results users cannot practically inspect.
- This two-condition rule reduces Firestore reads only when enough filtering is executed server-side or against an approved query/read model. The current prototype's complete-collection client-side filtering still reads the collection, so this is a proposed production target dependent on HSC-023 query/index design and measured HSC-026 scale. It is not implemented or confirmed.
- As a business assumption for discussion, case search appears secondary and construction-company interaction is expected to be property-centered; case search remains necessary. This is an observation/recommendation, not a confirmed fact.
- If volume becomes large, introduce stronger or selective mandatory axes, or another search architecture, after measured count, cost, and response evidence. Any such change must be approved and must supersede the relevant confirmed behavior before implementation; do not alter resolved HSC-032 or the current prototype rule that any optional condition may execute alone.

## Questions

1. Does House Solution accept or revise the latest-20 unfiltered behavior, 20-row matching pagination, two-condition minimum, and exact-case-number exception?
2. What active and historical case, warranty, master, and user volumes, peak concurrency, costs, and response-time targets should determine thresholds?
3. Does House Solution accept or revise the assumption that case search is secondary while property-centered construction-company interaction remains primary?
4. Which selective mandatory axes, query/read model, or alternative architecture should be adopted if measured scale makes the proposed target unsuitable?
5. What response-time targets apply to lists, search, registration, editing, and dashboard loading, and how should they be measured?

## Affected Documents

Non-functional requirements, database selection, query design, indexes, performance tests, and budget.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 14 — 利用者と利用開始前の確認

帳票等の仕様とあわせ、使える人・使う端末・困ったときの連絡先を確認します。技術的な方式は開発側で整理しますので、業務上必要な条件をお答えください。

1. 閲覧だけの人、登録・修正する人、取消・無効化や帳票出力をする人を分けますか。工務店内でも他支店の物件を見せない制限が必要ですか。取消と誤登録の無効化は、どの場面で使い分けますか。
2. 主にパソコンで使いますか、スマートフォン・タブレットも必須ですか。利用人数、同時利用人数、月の登録件数の目安を教えてください。
3. 利用開始後の問合せ窓口・必要な対応時間帯・月額運用費の上限について、ご希望または決定担当者を教えてください。未決の場合は確認予定日をご記入ください。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.
