# 0008 Postal-Code Address API

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Functional Requirements](../specification.md#functional-requirements)
- Supersedes: None

## Context

Property registration requires postal-code-driven address input. The initial direction to import Japan Post CSV data would require manual refresh work. The product now requires automatic API retrieval while retaining manual entry when a result is absent or unavailable.

## Decision

Use Japan Post's official Postal Code and Digital Address API (郵便番号・デジタルアドレスAPI) for postal-code address lookup.

Do not import Japan Post CSV data or conduct manual monthly data refreshes for the initial release. Maintain a replaceable lookup component so a different provider can be selected later.

## Rationale

The provider is operated by the postal-code data owner and is aligned with the required Japanese address lookup. It removes the initial manual data-maintenance task while keeping the source official.

## Impact

- Verify the current API agreement, credential requirements, availability behavior, cost, and technical interface before implementation; do not infer these from this decision.
- Keep API credentials out of source control and environment-independent documentation.
- On an API failure, preserve the entered values, show a lookup-failure message, and allow manual entry and saving.
- When a postal code yields multiple town-area records, only prefecture and municipality are automatically applied; staff select or enter the street/town and number.

## Alternatives

- Import Japan Post CSV data and manually apply monthly differences: rejected for the initial release because of the ongoing refresh workload.
- Use an unspecified third-party address API: not selected because the official Japan Post API is available.

## Reconsider When

Reconsider if the API's confirmed terms, cost, availability, or interface cannot meet the delivery schedule or operating requirements.
