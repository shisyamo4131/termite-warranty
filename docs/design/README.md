# Design Index

- Status: Active
- Authority: Design records describe implementation choices and assumptions; they do not override confirmed requirements in `docs/specification.md`.

- [Prototype Firestore data contract](prototype-firestore-data-contract.md): local-emulator contract for the first vertical slice. All schema choices remain provisional until representative legacy data and production constraints are assessed.
- [TR-001 master last-write-wins](tr-001-master-last-write-wins.md): approved implementation and acceptance contract for removing caller revision preconditions from the four trusted master mutations.
- [TR-002 deterministic Functions domain preparation](tr-002-functions-domain-preparation.md): approved implementation and acceptance contract for preparing and verifying the generated Functions copy of shared domain modules.
- [TR-003 verification and development-deploy gates](tr-003-verification-deploy-gates.md): implementation and acceptance contract for complete Callable/syntax coverage and fail-closed development deployment prerequisites.
