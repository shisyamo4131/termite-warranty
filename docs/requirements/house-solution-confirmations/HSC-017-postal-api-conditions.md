# HSC-017: Postal-Code API Operating Conditions

- Status: Partially answered
- Decision owner: Project, with House Solution production input

## Confirmed Context

Google Maps Platform Geocoding API is the selected provider for property and homeowner postal-code lookup. This supersedes the former Japan Post API selection. Local manual entry remains available before and after integration when lookup is unavailable or inconclusive.

The provider choice was approved on 2026-09-12 after comparing data-source authority with operational ownership. Google was selected because the development and production API resources can follow the existing separate Google Cloud/Firebase project boundary. Development remains developer-owned; production project, billing, and credential ownership still require House Solution confirmation. Credentials and passwords are never stored in chat-derived documents or source control.

## Questions

1. Will House Solution own the production Google Cloud project, billing account, quota policy, and production API credential, as currently intended?
2. Which API authentication method and application/API restrictions will be used for browser-to-service or server-to-service access without exposing an unrestricted key?
3. What monthly and daily quota, budget alert, hard usage limit, support level, and failure procedure are acceptable?
4. When must the integration be available relative to production release?
5. Which exact Google response components map to prefecture, municipality, and street/town and number for ambiguous and Japan-specific results?

## Affected Documents

Address requirements, external-service boundaries, secrets, operations, cost, and tests.

## Decision Evidence

- Decision: adopt Google Maps Platform Geocoding API for postal-code lookup.
- Decision maker: Project owner.
- Decision date: 2026-09-12.
- Evidence: current Codex task instruction, “GoogleのGeocoding APIを採用します。” A task/thread or share identifier was not available to the repository authoring context.
- Reflected documents: current specification, delivery/technology requirements, branch/address requirements, ADR 0022, operations, and changelog.

This matter remains unresolved because production ownership, restrictions, quotas, cost controls, availability, and response mapping still require confirmation.
