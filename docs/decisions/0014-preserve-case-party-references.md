# 0014 Preserve existing case party references

- Date: 2026-09-11
- Status: Accepted
- Related specification: [Functional Requirements](../specification.md#functional-requirements)
- Supersedes: The provisional property-homeowner propagation rule recorded in specification version 0.1.4

## Context

A property references its current homeowner and construction company, while a case also stores its own homeowner and construction-company references. Changing a property reference may represent either correction of a mistaken registration or a real-world change after earlier case activity. Automatically rewriting every linked case helps the first situation but can destroy the historical relationship needed in the second. The homeowner may also be related to who pays for a warranty service, but a separate payer or contracting-party model is not yet confirmed.

## Decision

Changing a property's homeowner or construction-company reference changes only the property. It does not rewrite homeowner or construction-company references on any existing case, including active, cancelled, and invalid cases.

When registering a case or explicitly selecting a property while editing an active case, the property still provides the initial homeowner and construction-company selections. Staff may change either case selection before saving.

## Rationale

Preserving the case references avoids silently changing historical business relationships when a property is sold, its responsible construction company changes, or another real-world transition occurs. A mistaken registration and a real-world transition cannot be distinguished reliably from the reference change alone.

## Alternatives

- Automatically propagate every property reference change. This simplifies correction but can rewrite historical cases.
- Infer whether to propagate from case status or timing. No confirmed rule can reliably distinguish correction from a real-world transition.
- Provide an explicit correction operation with an affected-case preview. This remains a possible future feature but is not part of this decision or the current implementation scope.

## Impact

- Existing case homeowner and construction-company IDs remain unchanged when a property is edited.
- A case continues to display the current name of the master that its own stored reference identifies; this decision does not introduce a name or address snapshot.
- Whether a warranty payer or contracting party is modeled separately remains open.

## Migration

Remove the local prototype's homeowner fan-out update and its transaction-size limit. No production data migration or retroactive correction is authorized by this decision.

## Reconsider When

- Operations confirm an explicit correction workflow with a reviewed affected-case selection.
- Billing requirements establish a separate payer or contracting-party model.
- Legacy-data inspection reveals a different authoritative relationship lifecycle.
