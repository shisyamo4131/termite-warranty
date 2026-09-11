# HSC-001: Case, Applied-Warranty, and Referenced-Master Data Retention

- Status: Not yet asked
- Created: 2026-09-11
- Confirmation owner: House Solution
- Decision authority: House Solution, followed by explicit project approval

## Confirmed Context

- A case directly references homeowner, property, construction-company, and responsible-branch masters. Applied warranties belong to the case and reference warranty-service masters.
- A master referenced by a retained case is currently inactivated rather than physically deleted.
- Inactive masters are excluded from new-case selection. A property whose referenced homeowner or construction company is inactive is also unusable for new-case registration.
- Current Firestore rules deny physical deletion of cases, applied warranties, and masters. No trusted retention-deletion process is implemented.
- Existing cases display construction-company and homeowner names, property name and address, responsible-branch name, and applied warranty-service name from their current masters. Those displayed names and the property address are not stored as historical case snapshots.
- Cancelled or invalid cases and applied warranties are retained as readable history rather than physically deleted.
- The current planning upper bound is approximately 14,400 new cases per year if all 40 daily telephone contacts become cases. This is a planning assumption, not measured volume.
- No case, applied-warranty, or referenced-master retention period has been confirmed.

## Proposal for Discussion — Not Confirmed

- Retain a case and its applied warranties for a defined period measured from the latest relevant business event rather than from initial registration alone.
- Candidate events are case closure, final applied-warranty expiry, final billing or payment, and completion of the last claim, complaint, or warranty response.
- Use ten years after the latest applicable event as a conservative starting point for discussion, not as a confirmed legal requirement.
- Suspend deletion while litigation, a complaint, an unpaid balance, an investigation, or another documented hold applies.
- Keep every master referenced by a retained case. After the final reference is removed through approved case deletion or anonymization, assess that master separately for deletion or anonymization.
- Treat an inactive master as eligible for physical deletion only after the retention policy permits it, no retained case or applied warranty references it, no other master references it, and no legal, billing, migration, backup, or investigation hold requires it. Eligibility would not require automatic deletion.
- At the end of the period, choose coordinated deletion or anonymization. Merely hiding or archiving a Firestore record does not reduce stored data.

## Questions for House Solution

1. For how many years must completed, cancelled, and invalid cases remain available?
2. Which event starts that period: case closure, final warranty expiry, final billing/payment, last warranty response, or the latest of these events?
3. Which circumstances must suspend deletion, such as an unresolved complaint, claim, unpaid balance, investigation, or dispute?
4. At the end of the period, should the system physically delete the case and its applied warranties, or anonymize personal information while retaining non-identifying business totals?
5. Must the system preserve the homeowner, billing party, construction company, property, and warranty-service information as it appeared at application or billing time, independently of later master changes?
6. Are invoices, contracts, claim records, or other legally relevant records stored in this system, or are they retained authoritatively in another system?
7. After all applicable retention periods and holds end, may the system physically delete an inactive master that has no remaining references from cases, applied warranties, or other masters?

## Why Confirmation Is Required

- The answer affects warranty support, billing evidence, complaints and disputes, personal-information minimization, Firestore storage, backup, migration, and deletion procedures.
- The current live-master display model requires referenced masters to remain available for as long as retained cases need those values. Preserving past values independently would require a separate snapshot requirement and data-model change.
- Japanese tax guidance commonly requires corporate books and transaction documents to be retained for seven years, and for some periods ten years. Whether a particular system record is itself subject to those rules depends on its content and role, so this does not determine the product retention period by itself.
- Japan's Personal Information Protection Commission states that the Act does not prescribe one general retention period and that personal data should be deleted without delay when its use is no longer necessary. The business purpose and other retention obligations therefore need to be identified first.

## Expected Impact of the Answer

- Confirmed requirements and open decisions in `docs/specification.md` and the relevant records under `docs/requirements/`
- Firestore data contract and indexes
- Case and master lifecycle behavior
- Archive, anonymization, recursive deletion, backup, and recovery operations
- Migration and acceptance tests
- Privacy and operating-cost requirements

## Technical Constraint to Account For

Firestore time-to-live deletion is asynchronous and does not delete a document's subcollections. It cannot by itself enforce the cross-record retention and reference checks described here. Any adopted deletion policy needs a trusted coordinated process and a deletion-hold check.

- For homeowner and construction-company deletion, check both cases and properties. For warranty-service deletion, check every applied warranty. For property and branch deletion, check every retained case regardless of status.
- Case deletion must also define recursive applied-warranty deletion and the treatment of case-number reservations and counters; deleting only the parent case document is insufficient.
- The no-reference check and deletion must be serialized or otherwise made race-safe. A separate query followed later by deletion can become stale.
- The current trusted edit path can keep or assign inactive homeowner/construction-company references on an inactive property. A future physical-deletion implementation must close or coordinate that write path before relying on a zero-reference result.

## Sources Consulted

- National Tax Agency, “No.5930 Books and documents to be retained by corporations”: <https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5930.htm>
- Personal Information Protection Commission FAQ 5-2: <https://www.ppc.go.jp/all_faq_index/faq1-q5-2/>
- Firebase, “Manage data retention with TTL policies”: <https://firebase.google.com/docs/firestore/ttl>
- Firebase, “Delete data from Cloud Firestore”: <https://firebase.google.com/docs/firestore/manage-data/delete-data>

## Resolution Record

No answer has been received. Do not promote this proposal to a confirmed requirement.

When resolved, record the approved decision, decision maker, decision date, supporting chat/task or other evidence, affected authoritative documents, and reflected revision or commit here.
