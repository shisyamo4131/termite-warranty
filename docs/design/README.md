# Design Index

- Status: Active
- Authority: Design records describe implementation choices and assumptions; they do not override confirmed requirements in `docs/specification.md`.

- [Prototype Firestore data contract](prototype-firestore-data-contract.md): local-emulator contract for the first vertical slice. All schema choices remain provisional until representative legacy data and production constraints are assessed.
- [TR-001 master last-write-wins](tr-001-master-last-write-wins.md): approved implementation and acceptance contract for removing caller revision preconditions from the four trusted master mutations.
- [TR-002 deterministic Functions domain preparation](tr-002-functions-domain-preparation.md): approved implementation and acceptance contract for preparing and verifying the generated Functions copy of shared domain modules.
- [TR-003 verification and development-deploy gates](tr-003-verification-deploy-gates.md): implementation and acceptance contract for complete Callable/syntax coverage and fail-closed development deployment prerequisites.
- [TR-004 master form consolidation](tr-004-master-form-consolidation.md): implementation contract for typed shared form drafts, pure payload mapping, and explicit reusable field sections across three master entry points.
- [TR-005 bounded list subscriptions](tr-005-bounded-list-subscriptions.md): implementation contract for 20-document list windows, stable cursors, exact-reference master resolution, and a parent-case warranty projection.
- [TR-006 prototype-data responsibility split](tr-006-prototype-data-responsibility-split.md): implementation contract for separating case commands, master catalogs, list/detail queries, pure helpers, and UI orchestration.
- [TR-007 direct master writes](tr-007-direct-master-writes.md): implementation contract for replacing the four master CUD Callables with direct, Rules-governed Firestore writes.
- [TR-008 remove unused profile Callable](tr-008-remove-unused-profile-callable.md): implementation contract for removing the redundant self-profile endpoint while preserving live account-disable handling.
- [UI component contracts](ui-component-contracts/README.md): one durable integration contract per user-authored JavaScript component.
