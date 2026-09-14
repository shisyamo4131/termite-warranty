# TR-009 Google Postal-Code Lookup Boundary

- Status: Provider-neutral foundation implemented; Google adapter and external setup not started
- Date: 2026-09-12
- Roadmap: [TR-009](../roadmaps/technical-remediation.md#tr-009-add-google-postal-code-lookup)
- Baseline: `a490f50d48c02ea2aa8abb498a0d981c0b85164c` on `main`
- Decision: [ADR 0022](../decisions/0022-google-geocoding-postal-lookup.md)
- Open matter: [HSC-017](../requirements/house-solution-confirmations/HSC-017-postal-api-conditions.md); HSC-018 is resolved

## Objective

Add the approved Google Maps Platform Geocoding API behind a replaceable, authenticated server boundary for property, homeowner, and construction-company postal-code lookup. Preserve manual address entry and the existing stored address shape.

This design does not authorize API enablement, billing changes, credential creation, a real Google request, deployment, or production-resource setup.

## Confirmed and Unresolved Boundaries

Confirmed:

- The lookup applies identically to property, homeowner, and construction-company create/edit flows.
- A request is restricted to Japan and the normalized seven-digit postal code.
- The application reads typed response components rather than parsing `formatted_address`.
- A failed, missing, partial, or ambiguous result must leave existing input editable and saveable.
- Only unambiguous values are auto-filled. Staff may correct every auto-filled address field.
- Google remains replaceable and no new persisted fields or data migration are required.
- Development and production use separate Google Cloud projects, quotas, and credentials.

Unresolved and therefore not selected by this design:

- Production project, billing, credential, quota, budget, monitoring, support, and operational ownership.
- API key versus supported OAuth authentication, and the final application restriction or server egress restriction.
- The exact mapping of Japan-specific Google component types to prefecture, municipality, and street/town and number.
- The applicable Google Maps Platform agreement, structured-address persistence conditions, attribution, public Terms of Use, and Privacy Policy changes for the production billing owner and application use case.

## Existing Behavior

At the recorded baseline, `MasterAddressFields.vue` exposed five editable address fields and `MasterFormFields.vue` reused it in property, homeowner, and construction-company flows; the homeowner flow explicitly said automatic entry was not connected. The three addressed master types persisted the same address shape through the shared master-form mapper. No postal lookup client, Callable, provider adapter, credential binding, or Google fixture existed at that baseline.

The provider-neutral foundation now adds an optional injected provider, canonical result handling, per-field and per-generation stale-response protection, synchronous cancellation from the three current master-form hosts, and dependency-free tests. No current host injects a provider, so this foundation's local behavior—and its behavior when deployed unchanged—remains manual, silent, and zero-network until a later approved integration slice.

## Proposed Application Boundary

```text
Property/Homeowner/Construction-company form
  -> postal lookup client gateway
  -> authenticated Firebase Callable
  -> enabled staff-account check
  -> replaceable postal lookup provider
  -> Google Geocoding HTTPS endpoint
```

- The SPA sends only the postal code needed for lookup. The supported UI exposes this behavior on all three addressed master forms, while HSC-017 separately decides acceptable App Check, rate, concurrency, quota, and cost-abuse controls.
- The Callable normalizes and validates the postal code again. It constructs the provider request itself; the client cannot supply a URL, Google parameters, headers, locale, country, or credential.
- The Callable verifies both Firebase Authentication and the caller's enabled `staffAccounts/{uid}` record before any provider call. Admin SDK access must not bypass the immediate-disable requirement.
- The provider adapter receives a canonical postal code and returns a provider-neutral result. Google status strings, raw response objects, coordinates, place IDs, formatted addresses, and credentials do not cross into the SPA.
- The initial provider-neutral result categories are `resolved`, `ambiguous`, and `not_found`. Transport, authentication, quota, denial, and unexpected provider failures are returned as a generic unavailable result to the UI while preserving an internal error category for tests and operational metrics.
- The final field-level DTO is blocked on the HSC-017 response-mapping decision. No component type is treated as the definitive Japanese municipality or town field merely because it appears in a sample.

## UI and Concurrency Behavior

- Trigger lookup when a property, homeowner, or construction-company postal-code field loses focus and the value can be normalized to seven digits, matching the confirmed interaction. Invalid or incomplete input does not call the provider.
- Keep the address fields editable throughout lookup. Do not clear them when a request starts.
- Associate every request with the normalized postal code, a request generation, and a baseline version or value for each writable address field. Apply a returned field only when the request is still current, the postal code is unchanged, and that field has not been edited since dispatch. Save, dialog close, component unmount, and a later request invalidate all earlier generations.
- A resolved response fills only the fields classified as unambiguous by the approved mapping. It never overwrites the building name.
- An ambiguous or multiple-town-area response may fill only prefecture and municipality when each is unambiguous. It must leave street/town and number unchanged even if candidate results share a value, then ask staff to select or enter that field. The selection model is not finalized until representative Japanese responses have been reviewed.
- `not_found` and unavailable outcomes show a concise Japanese message, keep every existing field value, and do not prevent save.
- Every addressed master retains manual entry before, during, and after lookup. No additional address-validity check runs after an automatic result or manual correction; required fields and postal-code validation still apply.

## Dev and Prod Credential Boundary

- Browser bundles, Nuxt runtime configuration, Firestore documents, repository files, fixtures, logs, chat evidence, and GitHub artifacts must never contain the Google credential.
- A server credential, if HSC-017 selects one, is stored in Google Cloud Secret Manager in the same environment-scoped project as the Callable and is bound only to the postal lookup function. Other functions must receive no access to it.
- Development and production secrets are distinct resources in distinct projects. A development secret must never be copied to production, and production IAM must not grant the developer-owned development runtime access.
- The emulator uses an explicit ignored local secret override only for a separately approved live-provider check. Normal automated tests inject a fake provider and use no credential or network. This avoids the emulator's fallback attempt to read a deployed secret.
- If an API key is selected, restrict it to the Geocoding API. The application restriction remains blocked until the actual server egress model is known; do not claim that an IP restriction is effective when the runtime has no confirmed stable egress address.
- If supported OAuth is selected, use short-lived server-side tokens and never export a service-account key to the client. The precise IAM roles and token flow require a separate reviewed setup design.
- Credential setup, API enablement, billing attachment, quota changes, and deployment are external writes and each requires explicit approval after exact target verification.

Authentication prevents anonymous use but does not by itself bound an enabled staff member's request rate. Before any live-provider release, HSC-017 must record the approved App Check posture, per-caller and aggregate throttling or concurrency policy, Google quota/cost controls, and the accepted residual abuse risk. These controls must fail without retry storms and must not weaken manual entry.

## Request, Response, and Logging Safety

- Construct the HTTPS request on the server with a `components` filter containing the normalized postal code and country `JP`. Do not duplicate the postal code or country across request parameters.
- Set an explicit timeout and bounded retry policy. Retry only transient provider failures with bounded backoff; do not retry invalid requests, denials, or quota exhaustion in a loop.
- Do not log the request URL, credential, raw Google body, full address, postal code, Firebase token, or staff identity. Operational events may record a coarse result category, duration bucket, environment, and a generated correlation ID after the monitoring policy is approved.
- Do not persist raw Google responses or derived coordinates. Persisting manually correctable structured address fields remains the intended product flow, but it is blocked until the applicable agreement and attribution review below confirms that this shared staff application may do so under the production billing owner's terms.
- Return a stable Japanese user-facing failure message rather than provider text, whose presence and wording are not stable.

## Provider Policy and Attribution Gate

The official Geocoding policy requires Google Maps attribution when Geocoding content is displayed without a Google Map and also calls for publicly accessible application Terms of Use and a Privacy Policy. The current Service Specific Terms include conditions for retaining structured Geocoding address values for direct end-user-facing functionality, but the applicable agreement can depend on the billing owner and location, and the stated logical-isolation condition may not fit a master record shared among staff. This design therefore does not decide that persistence is permitted.

Before the real adapter or live-provider UI is implemented, a qualified project owner must review the then-current applicable agreement and record under HSC-017:

1. Whether corrected structured address fields may be retained as shared business master data, for how long, and under what isolation or refresh conditions.
2. The exact Google Maps attribution location and treatment for auto-filled content displayed without a map, including edit and later detail/list views if required.
3. Required public Terms of Use, Privacy Policy, and user notice changes.
4. Whether these conditions preserve the confirmed workflow; if not, reconsider the provider under ADR 0022 rather than silently changing storage behavior.

## Response-Mapping Approval Gate

Before implementing the Google parser, collect a reviewable set of non-customer Japanese postal-code responses through a separately approved development-only check. Include ordinary, municipality/ward, multiple-locality, business/special, no-result, partial-match, and component-missing cases. Redact credentials and do not commit raw URLs or customer/property data.

The review must decide, and record under HSC-017, all of the following:

1. Which component types and precedence produce prefecture, municipality, and street/town and number.
2. Which result types, `partial_match` values, missing components, multiple results, and `postcode_localities` values are accepted, ambiguous, or rejected.
3. Whether a postal-code mismatch in a returned component is rejected.
4. Which fields may be auto-filled for each accepted result class, without expanding the confirmed rule that ambiguous/multiple-town-area results may fill only prefecture and municipality.

Until that gate is resolved, implementation may add provider interfaces, fake-provider tests, and stale-response UI protection, but it must not claim working Google address mapping.

## Implementation Slices

1. Provider-neutral foundation — implemented: canonical lookup DTOs, fake-provider behavior, per-field stale-response protection, synchronous save/close/reset cancellation, and optional property/homeowner/construction-company UI wiring. Current hosts inject no provider and make no network request.
2. Google adapter after mapping approval: add server request construction, parser fixtures, enabled-staff enforcement, timeout/error normalization, and function-scoped secret binding.
3. Development setup after separate approval: verify the exact development project, enable only the required API, configure the approved credential/restrictions/quota, bind the secret, deploy, and run synthetic smoke checks.
4. Production setup only after ownership and operations decisions: create independent production resources, rehearse rollback, and obtain release approval.

## Validation Contract

The implementation affects documentation, UI interaction, application logic, and Functions. Against the final implementation state, run each selected gate separately and record its exit status:

- `./scripts/check-governance.ps1`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run test:rules`
- `node scripts/check-functions-syntax.mjs`
- `node --check scripts/seed-emulator.mjs`

Focused coverage must include invalid/incomplete postal codes, all three addressed-master UI paths, enabled/missing/disabled staff, accepted burst/rate-control behavior, stale and out-of-order responses, per-field edits during flight, save/close/unmount invalidation, manual correction, no-match, ambiguous results that leave street/town and number untouched, provider timeout/denial/quota failures, credential redaction, and proof that fake-provider tests issue no network request. Attribution and structured-address persistence acceptance checks are required if the policy review requires them. Google parser fixtures and live synthetic checks remain blocked until the response-mapping, provider-policy, and external-setup gates are approved.

## Provider-Neutral Foundation Evidence

- Added `src/domain/postal-lookup.mjs` and its declaration contract for postal-code normalization, all three addressed-master scopes, sanitized provider-neutral results, optional provider resolution, and stale-response coordination.
- `MasterAddressFields.vue` and `MasterFormFields.vue` expose optional lookup wiring while the three current full/quick/edit hosts cancel in-flight work before save, close, reset, and unmount. Construction-company forms receive no lookup subject or provider.
- The registered dependency-free test covers normalization, no-call cases, resolved/ambiguous/failure results, blank/inherited/extra response fields, per-field edits, overlapping requests, provider replacement/removal, cancellation, reset/reopen, and source-level host wiring.
- Independent read-only review accepted the corrected implementation with no remaining code defect or specification drift. Mounted Vue/Vuetify event and exposed-ref behavior is not automated; the required Dev smoke check covers the unchanged manual form behavior and browser errors. Deferred provider timing and replacement behavior cannot be exercised in Dev until an approved provider is injected and remains a required integration check for slice 2.
- Local unit, type, build, Functions syntax, seed syntax, and governance checks exited 0. The local Emulator Rules gate was not completed because its dedicated ports were occupied by processes whose ownership was not confirmed; the user subsequently set Dev deployment and Dev behavior verification as the completion condition. [GitHub Actions run 25](https://github.com/shisyamo4131/termite-warranty/actions/runs/34679900328) passed the full pre-deploy suite, including the Rules/Callable Emulator gate, and deployed revision `7843ebcf179ba0f69a59e82c449115cd84d257d7`. Authenticated Dev smoke verification confirmed the homeowner manual-entry notice, property address rendering, and continued exclusion of construction-company lookup; all dialogs were cancelled without data writes. A fresh Dev tab logged no console errors. The existing authenticated tab contained four identical message-channel closure errors at one timestamp, with no later or application-specific exception observed during the smoke check.

## Rollback

Before external setup, revert the provider-neutral UI/gateway/Callable changes and this TR's documentation; stored data remains compatible because the address shape does not change.

For a normal, non-incident feature rollback after an approved deployment, disable the official UI lookup path while retaining manual entry, then remove the Callable and revoke its environment-specific credential through the approved deployment procedure.

For credential exposure, unexpected cost, quota abuse, or provider-policy incidents, UI removal is not containment. Execute a preapproved server-side kill switch, credential disable/revocation, or quota stop first so custom clients can no longer reach the provider; then disable/remove the Callable and official UI. HSC-017's failure procedure must name the exact environment target, owner, approval authority, observable stop signal, recovery order, and safe re-enable criteria. Synthetic/custom-client rollback verification must prove that provider requests stop before UI cleanup. Documenting this order does not authorize any external rollback action.

## Official References Checked

- [Geocoding request and response](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding): HTTPS, component filtering, response statuses, typed components, component variability, partial matches, and multiple-locality metadata.
- [Google Maps Platform security guidance](https://developers.google.com/maps/api-security-best-practices): server-side credential protection, API/application restrictions, authenticated proxy behavior, and response filtering.
- [Cloud Functions for Firebase environment configuration](https://firebase.google.com/docs/functions/config-env): function-scoped Secret Manager binding and explicit emulator secret overrides.
- [Policies and attributions for Geocoding API](https://developers.google.com/maps/documentation/geocoding/policies): attribution, public Terms of Use, Privacy Policy, and content-use guidance.
- [Google Maps Platform Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms): current Geocoding use and caching conditions; the applicable agreement and billing-owner location still require project review.
