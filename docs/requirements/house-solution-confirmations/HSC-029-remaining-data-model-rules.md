# HSC-029: Remaining Data-Model Rules

## 2026-10-03 Resolution — 初期の所有者・所属変更の業務方針

①「残してください」：所有者変更時は変更前の所有者情報と変更日を履歴として保存する。現在の所有者情報を更新しても、保証番号・保証期間は維持する。②YES：工務店・支店だけを誤登録して取消・再登録する場合、元の正しい申込日・引渡日を使用し、操作当日に置き換えない。保証期間を変えず、新番号を採番する。

物件中心・1物件1恒久保証、所有者変更時の継続と履歴、本登録後の所属固定、誤登録時の取消・再登録、既存保証グループ維持という初期業務方針は解決。残るデータ型・履歴格納・互換性・実装検証は開発側の設計作業とし、同じ業務質問を残さない。初期資料の受領・補完・投入はHSC-015、採番はHSC-004、保険はHSC-036、取消後削除はHSC-001の各事項で扱う。

決定者：プロジェクトオーナー。日付・根拠：2026-10-03本Codex会話の一連の回答と今回①②。仕様書0.1.81、case-warranties、initial-data-modelへ反映。未コミット・実装未変更。旧案件構造の検証や移行が完了したとの主張ではない。

## 2026-10-03 確定：通常の所属移管なし

オーナー追加回答「移す運用があるかないかね。ないよ」により、物件を別工務店・支店へ移す通常運用はない。本登録後は工務店・支店を固定し、誤登録時は既決の取消・再登録で対応する。下書き時の選択や会社自体の所属保証グループ変更とは別の事項。仕様書0.1.80へ反映。直前の通常移管未確認を解消。文書のみ、実装未変更。

## 2026-10-03 ②回答の明確化：所属の誤登録は取消・再登録

オーナーの追加回答「誤登録時は取消→再登録」により、物件の工務店・支店を誤登録した場合は元の物件／保証を取り消し、正しい所属で再登録する。直前の開発側による直接訂正案は採用しない。取消番号の非再利用と本登録時採番の既決ルールに従い、再登録は新番号となる。誤登録以外の通常の移管運用が存在するかまでは、この回答から確定しない。

根拠：同日質問②への追加回答。仕様書0.1.79、未実装・実データ未変更。上の回答解釈待ちは誤登録対応について解消。

## 2026-10-03 所有者変更後の保証引継ぎ

①YES：売買・相続などで所有者が変わっても、同じ物件の保証番号・保証期間を維持して保証を引き継げる。所有者変更だけで新規保証を発行しない。旧所有者情報・変更履歴の持ち方まで今回確定したとは扱わない。

②は「変更業務はあるか」と「本登録後固定・誤登録時だけ開発側訂正の案」が混在した質問へのYESであり、どちらへの回答か確認中。物件の工務店／支店変更可否を推定しない。根拠：2026-10-03本Codex会話①②。①を仕様書0.1.78へ反映。コード・データ契約・実データは変更しない。

- Status: Partially resolved; property-centric design proposed, migration open
- Decision owner: House Solution, then project

## 2026-10-01 回答照合（仕様採用前）

出典：[資料台帳](../source-materials.md)。フォームは全1件、送信日時の表示2026/10/01 12:13（時間帯表示なし）を直接確認。電話はユーザー転記。過去の未送付・回答待ちの記述は当時の状態であり、この節が現在の確認状態を示す。

電話報告によって、HSが物件ごとに保証を販売し保険を仕入れる関係、保証10年・保険5年、既販売分では満了日が一致しないことが示された。物件に恒久保証1件と保証期間履歴・保険加入期間履歴を持たせる案を推奨するが、案件管理廃止と汎用保証商品マスタ廃止はユーザーの検討案であり未採用。現行案件の申込日・担当支店等の移管先、旧案件・適用保証の対応付け、番号重複・重複期間の整理が必要。フォームの承認なし登録要望（HSC-013）を併せて検討する。承認工程をなくしても入力者・登録日時等の記録を削除する意味にはしない。構造変更前に影響範囲・移行・バックアップ／復元・回帰テストを具体化する。

## Confirmed Context

2026-10-01試作方針⑲A・⑳A：施主情報は物件内に持ち、独立した施主管理画面は設けない。同一施主の複数物件も各物件で入力。土曜日に所有者変更時の扱い・旧所有者の保存・保証との関係を確認する。保証商品マスタは保証グループ設定に整理し、初回10年・10年延長を共通化、最長期間は物件側の選択とする。現在の施主参照・商品参照の移行設計と旧記録保全は実装前に必要。画面廃止をデータ削除と同一視しない。本番確認・実装は未完了。

2026-10-01試作方針⑯採用：案件管理画面を物件管理へ統合し、施主・担当工務店／支店・保証番号・保証期間・延長履歴を物件詳細にまとめる。新規登録・延長の入口も統合。申込日・手続き履歴は保持し、画面統合だけを理由に既存記録を削除しない。旧案件／適用保証の移行対応と整合検証は実装前に設計する。実装・本番確認は未完了。

The principal entities, required fields, lifecycle states, and core references are provisionally defined. Duplicate master records are permitted without a warning or merge requirement. Several concrete questions are tracked separately in this register.

## Questions

1. What remaining identifier, data type, normalization, uniqueness, relationship, and edit rules are required after legacy-data inspection?
2. Which rules are business requirements from House Solution and which are implementation constraints?
3. What compatibility or migration behavior is required for older records missing later-required fields?

## Affected Documents

Initial data model, data contract, migration, validation, application logic, and tests.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 4 — 保証と保険の持ち方と延長時の記録

『同時に複数の保証はない』と『保証10年・保険5年を両方管理する』という回答をいただきました。現在は、同じ物件の案件に保証・保険や更新分を複数記録できる作りです。

1. 『複数なし』は保証商品についての意味で、1物件に保証1本と保険1本が同時に付く理解でよいですか。
2. 延長時は最新の満了日が更新されればよいですか。それとも、以前の期間を上書きして残さない必要がありますか。
3. 更新前の保証期間・保証書番号・更新しないという回答は残す必要がありますか。工務店から延長リストを受け取れば確定ですか、それ以外に入金確認等が必要ですか。

### Outgoing question 7 — 施主と担当工務店の関係

担当工務店の変更や未定はないと回答されています。ただし、同じ施主が複数の物件を所有する場合の扱いはまだ読み取れません。

1. 同じ施主が、別々の工務店で複数の物件を建てることはありますか。担当工務店は施主ごとに固定ですか、物件ごとですか。
2. 工務店の廃業・引継ぎや、誤登録を訂正する場合も変更しない運用ですか。例外があれば教えてください。

### Outgoing question 13 — 不足項目と日付変更の扱い

グループ③には『申込月』『上棟日』がありますが、引渡日・住所・建面積の列がありません。上棟日と引渡日が同じとは推定できません。

1. 不足する引渡日・住所・建面積は別資料から補えますか。補えない場合、未確認として登録できますか。それとも登録前に必ず確認しますか。
2. 申込日が月までしか分からない場合はどう記録しますか。上棟日は引渡日とは別項目として残しますか。
3. 引渡日の訂正時、保証開始日・満了日・保険予定・発行済み書類も変更しますか。保証開始日だけを別日に直す例外はありますか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Partial Resolution — Warranty Identity

- Decision: one property to one warranty; permanent warranty number across renewal; keep initial and renewal-period history under that warranty. The product master remains separate. The warranty refers to its certificate-form/property-extraction group. Insurance cardinality, numbers, cycle and history are not decided here.
- Decision maker/date: project owner, 2026-09-29, after reporting HS LINE responses and explicitly confirming the one-to-one relationship.
- Evidence: task `01a0e5c9-ec13-78e0-acd2-62e03f732c95`, adoption instruction. The reported HS answer permitted either numbering approach; the owner selected permanent numbering.
- Reflected surfaces: specification 0.1.24, case-warranties, initial-data-model, ADR 0033 and its index, roadmap, operations and user explanation. No implementation or data conversion yet; uncommitted documentation checkpoint.
- Superseded questions: warranty one-to-one, renewal renumbering choice and whether to retain warranty-period history are answered. Do not resend them.
- Remaining: insurance relationship; homeowner/company relationships; missing/incorrect source data; group assignment changes; cancellation/correction edge cases; and mapping existing multiple/overlapping prototype records into the new model. Refer numbering to HSC-004, renewal operation to HSC-005, dates to HSC-003 and groups to HSC-037.
- Next-question wording is reviewed with the project owner before any new PDF. Prior questionnaire sections remain historical snapshots.
