# 0021 User-authored UI component collaboration

- Date: 2026-09-12
- Status: Accepted
- Related governance: [project rules](../../governance/project-rules.md)
- Procedure: [custom UI component collaboration](../runbooks/custom-ui-component-collaboration.md)
- Supersedes: None

## Context

Fine visual adjustments and interaction details can be difficult for the user to communicate completely in prose. The user can express that intent directly by authoring a Vue component in JavaScript while the coordinator continues non-conflicting project work. A trial established a tracked component contract, a Japanese convenience copy, fictional display fixtures, an isolated local preview, and a contract-based coordinator review.

The trial also showed that the workbench must remain separate from tracked application code: a visually useful submission can still need changes for product rules, accessibility, data compatibility, or bounded-list behavior before integration.

## Decision

Adopt the user-authored UI component workflow as an optional project practice:

1. The coordinator records the authoritative component contract before authoring and provides a Japanese convenience copy and fictional display fixtures when useful.
2. The user authors JavaScript component and note files only in the ignored `/.user-ui-workbench/` area and identifies a version when it is ready for review.
3. The coordinator does not modify the user-owned component unless explicitly asked. The coordinator reviews it against the contract and reports either acceptance for integration or concrete requested changes.
4. Only an accepted design is adapted into tracked application code. The coordinator may convert it to TypeScript, separates presentation from business and data responsibilities, and validates the resulting tracked implementation according to its actual impact class.
5. The workbench and its fixtures remain disposable. They are never a source of truth, production dependency, test-data authority, backup, or location for real customer data or credentials.

## Rationale

This preserves the user's ability to shape the interface visually, permits genuinely non-conflicting parallel work, and keeps product, security, data, accessibility, and integration quality under the normal repository review and verification controls.

## Alternatives

- Prose and screenshots only: retained as available methods but not required, because they can be inefficient for fine visual intent.
- Let the user edit tracked application components directly: rejected as the default because concurrent edits can conflict and presentation experiments can unintentionally acquire application responsibilities.
- Treat the workbench component as production-ready source: rejected because it bypasses contract review, typed integration, and repository verification.

## Impact

- Each user-authored component needs a tracked contract before work begins.
- The coordinator may create disposable fictional fixtures and the preview harness within the boundaries defined by the runbook.
- A review can request changes without modifying the user's work.
- Acceptance of the visual component does not by itself certify or complete its tracked application integration.

## Migration

No application or data migration is required. Existing workbench files remain ignored and disposable. Existing tracked component contracts continue under this adopted procedure.

## Reconsider When

- The workbench can no longer preview the supported Nuxt/Vuetify stack without application coupling.
- The ownership boundary causes recurring lost work or merge conflicts.
- The review step does not detect material accessibility, product-rule, or integration defects before tracked adoption.
