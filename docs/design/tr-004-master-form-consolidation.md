# TR-004 Consolidate Master Form Fields and Payload Mapping

- Status: Implemented and independently accepted
- Date: 2026-09-12
- Roadmap: [TR-004](../roadmaps/technical-remediation.md#tr-004-consolidate-master-form-fields-and-payload-mapping)
- Baseline: `bf44cfcf6ac6b0f7175a3622baf80d9fed0f9381` on `codex/tr-004-master-form-consolidation`

## Objective

Remove the three independent definitions of master form state, initialization, field markup, and write-payload mapping while preserving every confirmed create, quick-create, and detail-edit behavior.

## Scope and Boundaries

- Consolidate `MasterManagement.vue`, `QuickCreateMasterDialog.vue`, and `MasterEditDialog.vue` onto one typed discriminated form model and pure initialization/payload functions.
- Reuse explicit small components for address fields, property references, construction-company contacts, and homeowner contacts behind a thin shared form-field component.
- Keep list/search/subscription behavior, dialog orchestration, quick-create events, edit reference inclusion, success/error wording, and direct Firestore persistence in their existing owners.
- Do not introduce a metadata-driven form renderer, global store, new component-test framework, schema/rules change, query change, postal-code integration, or new validation behavior.
- Do not read or modify `/.user-ui-workbench/`; the user-authored construction-company table is integrated only after the user marks it complete.

## Typed Model and Pure Functions

- A form draft is a discriminated union keyed by `masterType`. Each master type exposes only its applicable editable fields.
- Address editing uses one typed nested draft. Persisted nullable optional values become empty strings for editing.
- `createMasterFormDraft(masterType, row?)` creates a fresh empty draft or hydrates an edit draft without sharing nested state.
- `masterFormDraftToFields(draft)` returns the exact input shape already expected by `normalizeMasterFields`; empty optional strings become `null` as before.
- The downstream normalizer remains responsible for validation, trimming, postal-code normalization, N-Gram generation, and rejection of unsupported shapes.

## Component Structure

- `MasterFormFields.vue`: name, warranty-period routing, homeowner information notice, and explicit master-type routing only.
- `MasterAddressFields.vue`: postal code, prefecture, municipality, street/town/number, and optional building.
- `MasterPropertyReferenceFields.vue`: homeowner and construction-company selections.
- `MasterConstructionCompanyContactFields.vue`: telephone, fax, contact person, contact details, email, and notes.
- `MasterHomeownerContactFields.vue`: telephone, fax, and notes.
- `masterFormSubmission.mjs`: injectable create/update submission adapters that keep payload mapping and success-callback ordering executable without introducing a component-test framework.

The three entry components retain their current dialog titles, activators, close behavior, messages, persistence commands, and emitted events. `MasterEditDialog` retains inclusion of the current property references even when inactive. The currently unreachable list-dialog update branch is removed rather than encoded into the shared form.

## Validation

- Parameterized unit tests cover empty drafts, independent nested state, row hydration, nullable editing values, exact payloads, and downstream normalizer acceptance for all four master types.
- Executable submission-adapter tests cover the exact fields delivered by full create, quick create, and detail edit, including their success callbacks, quick-create event payload/reset, and edit close/saved behavior. Source-wiring smoke tests prove the three entry components use those tested adapters, preserve inactive property-reference loading, and retain the explicit shared field-section routing. Nuxt typecheck and build remain the executable SFC compilation checks; no claim is made that these tests execute DOM focus or click behavior.
- The registered aggregate Emulator suite verifies the unchanged direct master create/update/inactivate/reactivate and Rules boundary.
- Final completion uses the policy-selected gates: governance, domain/workflow tests, typecheck, build, aggregate Emulator tests, recursive Functions syntax, and seed syntax.

## Rollback

Revert the TR-004 commit to restore the three local form implementations. No stored-data migration, Emulator reset, external deployment, or remote rollback is required.

## Completion Evidence

- The four master types now use discriminated form drafts, one pure draft initializer, one pure payload mapper, and explicit reusable field sections across full creation, quick creation, and detail editing.
- Executable tests cover all four draft/payload contracts and the three entry-point submission outcomes; source wiring preserves current inactive property references during property editing. Independent review found no remaining High, Medium, or Low issue after two corrections.
- Final registered gates passed on 2026-09-12: domain/workflow tests 65 passed with 2 host-limited symbolic-link fixtures skipped; Nuxt typecheck and static build exited 0; the aggregate Auth/Firestore/Functions Emulator suite passed 77/77; recursive Functions syntax, seed syntax, and governance validation exited 0.
- The Emulator interruption required by the aggregate gate was approved by the user. The development Emulator was restarted and reseeded afterward; the application, UI workbench preview, and Emulator UI each returned HTTP 200. No external deployment or stored-data migration was performed.
- DOM focus and click behavior was not automated. The SFCs were compiled by typecheck/build, submission behavior was executed through injectable adapters, and the remaining interaction surface was statically and independently reviewed.
