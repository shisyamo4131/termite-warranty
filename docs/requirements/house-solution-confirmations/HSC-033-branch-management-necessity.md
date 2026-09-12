# HSC-033: Branch Management Necessity

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

- The confirmed specification currently requires a House Solution branch master.
- Each case currently requires a responsible-branch reference; the responsible branch is editable, appears in case lists and the dashboard, and is selectable as a case-list filter.
- Construction-company, homeowner, and property masters do not carry a responsible-branch reference.
- The current implementation already stores and displays case branch references and seeded branch records, but it does not provide a branch-management screen.
- On 2026-09-12, the project owner stated that branch management might become unnecessary and instructed the project to preserve the current behavior while recording the question. This does not yet change the confirmed specification or implementation.

## Questions

1. Is the House Solution branch concept itself unnecessary, or is only the branch-master management screen unnecessary?
2. If branches remain on cases but users do not manage them, who creates, renames, inactivates, and restores branch records, and by what procedure?
3. If branches are removed entirely, should responsible branch also be removed from case registration/editing, lists, dashboard display, filters, Firestore records, indexes, and retention rules?
4. If only one branch exists initially, should the case value be fixed automatically while retaining the data model for future expansion?

## Impact of Each Direction

- Keep branch management: implement the outstanding list/detail/dialog master UI and preserve the current case and query model.
- Keep branches but omit end-user management: preserve case references and define an administrator, Console, seed, or deployment-time maintenance procedure.
- Remove branches: make a material specification and data-contract change, then remove the field and references consistently across UI, Functions, Firestore Rules/indexes, seed data, tests, retention policy, and documentation.

## Affected Documents

Specification, branch/address requirements, master management, case/search/dashboard requirements, data contract, retention policy, roadmap, UI, Functions, Firestore Rules/indexes, seed data, tests, and operations.

## Resolution Record

No answer has been received. Preserve the current specification and implementation until House Solution confirms a direction and the change is separately approved.
