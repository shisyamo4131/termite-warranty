# 0033 One Permanent Warranty per Property

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
