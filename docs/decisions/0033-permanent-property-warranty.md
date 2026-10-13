# 0033 One Permanent Warranty per Property

## 2026-10-07 通常登録と取込みの外部識別を統一（Accepted・Dev反映済み、受入待ち）

オーナーの改修指示に基づき、外部キーの全物件一意予約を通常登録にも適用する。グループの必須設定は作成後不変とし、表示名の変更は保存値・内部ID・保証番号へ影響させない。保存済みキーは取消でも保持する。通常登録をCSV受領文書に偽装せず、内部IDと外部値、受領履歴を分離したまま復旧検証する。[確定仕様](../specification.md#2026-10-07-通常登録の外部キー必須設定表示名)、[設計](../design/property-bulk-import.md)。旧の「取込み専用」記録はこの範囲で置換し、cbb5859をDevへ反映し、UHグループ設定書込み・readbackと通常再開／世代10を完了。HS追加受入は未完了。[実測](../design/evidence/common-import-address-2026-10-07.md#2026-10-07-外部キー改修のdev反映通常再開)。

## 2026-10-07 外部キーによる新規取込識別を追加

オーナーがUH一括取込みを確定し、物件／保証へ将来の他提供元にも使える外部キーを保持することを指示。全UHで一意な契約Noを外部識別へ用い、既取込みキーがあるファイルは全件棄却する。通常編集で物件を訂正する。契約No先頭と支店コードの不一致は許容する。これは外部入力の重複防止に用いる識別で、既決の物件／受領文書の固定内部IDや恒久保証番号を置き換えない。

下の「UH管理自体が未確定」は以前の状態。今回の採用後も別コレクションの物理形状・全原本履歴の保持・外部キーの解放／訂正／復旧時の扱いを勝手に確定しない。[現在の要件](../specification.md#2026-10-07-uh一括取込みの実装を確定)、[準備設計](../design/uh-integration-import.md)。設計記録のみ、実装・移行・実取込なし。

## 2026-10-07 UH受領データとの内部IDによる関連付け

状態：内部識別の方針だけAccepted、実装なし。根拠は2026-10-07の本Codex会話でオーナーが「契約番号に頼らずシステム内部で取込文書と物件／保証文書を紐づける案は採用」と明示したこと。

UH受領文書と既存の恒久的な物件／保証との関連はシステム内部の固定IDで維持する。未確認の契約番号の一意性・再利用へ依存せず、番号訂正だけで関連を失ったり、新しい保証を作ったりしない。契約番号は外部の受領情報として別に扱う。外部番号そのものへ内部の関連を固定する案は選ばない。

この決定はUH管理・別コレクションの具体的な形状・取込方法・再送Excelの照合方式・全受領履歴の保存・10年選択肢を承認しない。UHの採用自体が未確定のためスキーマと移行を実行せず、既存データの変更や番号の再発行もない。詳細設計では関連の一貫性、番号訂正、再取込・部分失敗、取消維持を架空データで検証する。下記の恒久保証と1物件1保証の方針を維持する。[現在の仕様](../specification.md#2026-10-07-追加指示判定だけ修正uh内部idの関連付け)、[検討と未決](../design/uh-integration-proposal-2026-10-06.md)。

> 2026-10-01 follow-up: implementation is authorized by the [meeting prototype contract](../design/meeting-prototype-2026-10-03.md). Individual operator scope, group numbering, period changes and reasoned HS restoration follow the 27 adopted decisions. The owner authorized disposal of prior test data instead of conversion; this does not authorize production-data migration. Earlier “implementation pending / no deletion authorized” paragraphs describe the previous checkpoint. Verification and deployment are separate gates.

- Date: 2026-09-29
- Status: Accepted; application implementation pending
- Related specification: [Case warranties](../requirements/case-warranties.md)
- Supersedes: [ADR 0009](0009-warranty-extension-history.md) for warranty (`保証`) identity and renewal structure only. Insurance (`保険`) is not changed by this decision.
- Evidence: The project owner reported the HS LINE answers and explicitly adopted the recommendation on 2026-09-29 in task `01a0e5c9-ec13-78e0-acd2-62e03f732c95`: property-to-warranty is one-to-one; warranty numbers are permanent across renewals; retain renewal history. HS had allowed either renewal method because certificates had not yet been issued. The selection of the permanent-number method is the project owner's decision, not an exclusive method imposed by HS.

## Decision

1. A property under warranty management has one individual warranty. It is not one new warranty identity per renewal, per product, or per case. Creating another case must not allow a second warranty for the same property.
2. The individual warranty keeps its identity, property association and warranty number across renewals. A renewal must not allocate a replacement number or create a second independent warranty.
3. Retain the initial coverage period and subsequent renewal periods under that same warranty. Renewing advances its current coverage while preserving earlier periods. Updating the current expiry without retaining the former period is not the adopted model.
4. Keep the warranty-service/product master separate from the individual warranty. The master defines shared product settings; the individual warranty identifies coverage for the property.
5. The individual warranty carries its warranty group. HS's reported LINE answer establishes that groups distinguish certificate forms and are used to extract the relevant properties. A group is not merely a number-prefix rule. This answer does not establish group membership rules, changing groups, all templates, or group-based duration/price rules.
6. Do not infer the insurance cardinality, number, renewal cycle or history policy from the warranty decision.

## Rationale and Alternatives

The permanent identity represents continuous coverage of the same property, while period history preserves what applied before a renewal. HS allowed implementation choice; keeping one number makes continuity explicit. A new warranty number for every renewal was allowed by HS but was not selected by the project owner. Overwriting the expiry and discarding previous periods is rejected.

## Implementation Impact and Open Boundaries

The prototype currently stores independent applied-warranty records under cases and assigns case numbers, not warranty numbers. Its existing domain, server commands, portal approval, UI, projections and tests do not yet implement this decision. Do not relabel `caseNumber` as a warranty number or silently treat every existing applied record as a new warranty.

Before an end-to-end implementation checkpoint, settle the number format/allocation scope (HSC-004), renewal confirmation and date-correction behavior (HSC-005/HSC-003), and the treatment of existing multiple/overlapping prototype records (HSC-029). The formal public number format is not established by the example `001`. Case identity, warranty identity and certificate issuance are distinct concepts; retaining the case as an application record does not change the one-warranty-per-property invariant.

The initial period and renewal history are business records. They do not introduce a general edit audit log or settle retention/deletion policy. Cancellation, erroneous registration, reissue, group changes and whether an unregistered property draft must already have a warranty remain subject to their existing confirmation items. Insurance continues to use the existing prototype behavior pending its own decision; this is not an endorsement of that behavior for production.

## Compatibility, Migration and Rollback

No automatic data conversion, number assignment, data deletion or deployment is authorized by this documentation checkpoint. Before migration, inventory warranty-type and insurance-type applied records separately, group warranties by property across all cases, and report multiple/overlapping/conflicting records for explicit mapping. Do not pick a winner by date, overwrite records, fabricate historical numbers or merge insurance into warranty history.

A future migration needs a reviewed mapping, retained source data/backup, repeatable dry-run, count and identity reconciliation, and a tested rollback. Code rollback alone is insufficient after persisted data changes. The current checkpoint changes only requirements and decision records, so the current application data contract continues to describe the unchanged runtime, not the target product requirement.

## Required Future Acceptance Evidence

- Concurrent or cross-case registration cannot create a second warranty identity for one property through supported commands.
- Initial registration produces one warranty and its initial period; renewed registration retains the warranty ID/number/property and adds history exactly once.
- Failed or duplicate renewal submission cannot leave a changed expiry without its history or generate an additional number.
- Past periods remain readable after later renewal and ordinary master edits; changing a product default cannot rewrite them.
- Property/guarantee detail, group-based property extraction and certificate selection agree with the same warranty identity.
- Existing insurance operations are not silently converted to the warranty model.
- Migration ambiguity is reported, and rollback is verified on fictional fixtures before any approved execution.
- Select the union of application, UI, data-contract and documentation gates from the project verification policy for the actual implementation.

## Current Completion Boundary

The one-to-one relationship, permanent number, retained period history and group purpose are confirmed. Their specification/decision reflection is a documentation checkpoint; implementation, migration, runtime acceptance and deployment are pending. No prototype or roadmap completion credit is earned by this decision alone.
