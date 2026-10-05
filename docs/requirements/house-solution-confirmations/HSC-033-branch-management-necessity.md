# HSC-033: Branch Management Necessity

- Status: Resolved; HS branches excluded, implementation pending
- Decision owner: Project owner

## Confirmed Context

Current decision (2026-10-01): HS branches are excluded. The bullets and outgoing questions below are historical context describing the superseded requirement and unchanged prototype.

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

- Decision: remove the HS branch concept from the target, including its master, registration/edit field, list/dashboard column and search filter. Construction-company branches are not affected.
- Decision maker/date/evidence: project owner, 2026-10-01, current Codex conversation: 「HS側の支店は不要として判断してください。」
- Reflected: specification 0.1.26; branch/address, master, search/list, dashboard, workflow and initial-model requirements; operations; delivery roadmap; changelog. Documentation is uncommitted. No implementation or migration has occurred.
- Remaining implementation: remove HS branch dependencies from UI, validation, commands, queries, seed fixtures and tests; inspect schema/index compatibility. Keep existing data until migration mapping and backup/rollback are approved. Do not reinterpret HS branch IDs as construction-company branch IDs.
- Acceptance: registration/editing, portal submission, lists/dashboard and filters operate without HS branches; company ownership and other field validation still apply; old records remain readable. Run the implementation impact-selected application/data/UI gates. The current documentation checkpoint uses the documentation-only gate.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 10 — 工務店の本支店と書類の送付先

新資料は工務店の本社・支店と、書類ごとの送付先を管理する形です。現在システムにある『担当支店』はHS様の支店で、工務店の支店とは別です。

1. 工務店の各本支店に登録する担当者は、表のように2名までですか、3名以上も必要ですか。
2. 保証書・請求書・更改案内は、それぞれ複数の宛先へ送れますか。メール・郵送のどちらですか。物件に担当支店・担当者を指定しますか。
3. ログイン用メールと書類送付用メールは別々に登録してよいですか。HS様自身の支店管理・案件の担当支店は引き続き必要ですか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.
