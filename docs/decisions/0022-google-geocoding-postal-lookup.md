# 0022 Google Geocoding for Postal-Code Lookup

- Date: 2026-09-12
- Status: Superseded
- Related specification: [Functional Requirements](../specification.md#functional-requirements)
- Supersedes: [0008 Postal-Code Address API](0008-postal-code-address-api.md)
- Superseded by: [0031 Japan Post postal data](0031-japan-post-postal-data.md)

## Context

ADR 0008 selected Japan Post's official API because it is the authoritative Japanese postal-code data source. Subsequent review found a material operational tradeoff: Japan Post requires its own business-account and organization administration, while the application already separates development and production through Firebase/Google Cloud projects and their owners.

The project owner selected Google Maps Platform Geocoding API after considering the reduced account, billing, and credential-management surface. Google is not the Japanese postal authority, and its geocoding response may be incomplete, ambiguous, or change component structure over time. Manual address entry must therefore remain available.

## Decision

Use Google Maps Platform Geocoding API for postal-code address lookup.

- Restrict lookup to Japan and the entered postal code.
- Read typed address components; do not parse `formatted_address` as a stable schema.
- Keep the provider behind a replaceable application boundary.
- Apply the same lookup and preserve manual entry and correction for property, homeowner, and construction-company forms on no-match, ambiguous, partial, and failed requests.
- Separate development and production Google Cloud projects, quotas, and credentials in accordance with the environment isolation policy. Keep billing and ownership environment-scoped; their production assignment remains unresolved.
- Never reuse an unrelated application's key or store credentials in source control, documentation, fixtures, logs, or chat-derived evidence.

## Rationale

This keeps postal lookup within the existing Google Cloud account, project, IAM, billing, and monitoring model. Separate environment resources reduce cross-environment credential and cost coupling. The choice accepts lower source authority than Japan Post in exchange for simpler operational ownership and future access to broader geocoding capabilities.

## Alternatives

- Japan Post Postal Code and Digital Address API: superseded for this project. It remains a viable fallback if Google accuracy, pricing, terms, or Japanese response behavior do not meet requirements.
- Imported Japan Post CSV: remains rejected because it introduces recurring data-refresh work.
- Unspecified anonymous third-party API: rejected because ownership, support, accuracy, and production terms are not established.

## Impact

- Google Cloud billing must be enabled and a credential or supported OAuth path is required.
- Dev and production use separate API resources. Development remains developer-owned; production ownership and access require confirmation before setup.
- API and application restrictions, quotas, budget controls, monitoring, response mapping, and failure handling must be designed and verified before production use.
- Existing stored address fields and manual-entry behavior do not change, so this provider decision requires no data migration.

## Migration

No application migration is required because postal lookup is not implemented. Update the design before implementation; do not enable APIs, create keys, or change billing merely by adopting this ADR.

## Reconsider When

Reconsider if Japanese postal-code coverage, ambiguity handling, terms, cost, credential security, or production ownership cannot satisfy the approved requirements. Japan Post's API is the first fallback to reassess.

## References

- [Google Geocoding request and response](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Google Maps Platform API security](https://developers.google.com/maps/api-security-best-practices)
