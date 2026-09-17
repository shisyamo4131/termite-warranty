# 0029 Data Responsibility and Decision Authority

- Date: 2026-09-17
- Status: Accepted
- Related specification: [Data responsibility boundary](../specification.md#environment-and-boundaries)
- Supersedes: None

## Context

The system handles cases, applied warranties, masters, notifications, staff accounts, and portal submissions. Describing all of these records as simply “owned” by one party would conflate legal treatment, contractual roles, and operational decision authority. Production cloud-contract details remain unresolved.

## Decision

- House Solution has operational authority and is the final decision-maker for business-data purpose, approved access, correction, retention, and deletion.
- A homeowner is the personal-information subject, not a database-record owner. House Solution receives disclosure, correction, restriction-of-use, and similar requests and handles them under applicable law, contracts, and retention duties.
- Construction companies are responsible for the lawful acquisition context and content they submit through the portal. They may correct editable submissions; once submitted, including while it is awaiting review and after registration, House Solution manages the data operationally. This is not an ownership transfer.
- Development and maintenance providers are processors under House Solution instruction, limited to necessary handling. They may not independently use, provide, export, remove, or copy the data.
- Google/Firebase are planned cloud processing providers. House Solution production ownership and operation are resolved under HSC-020; exact provider contract terms, subprocessors, and termination conditions require separate confirmation under HSC-025.
- Routine access and correction use approved permissions; output requires House Solution administrator approval. Retention/deletion policy remains under HSC-001, and detailed role permissions remain under HSC-024. Contract termination must allow House Solution to receive necessary data before provider copies are deleted within the contractually specified period. No export feature is approved for initial-release implementation by this decision.
- Source-code/IP, fees, and contract-termination terms themselves are separate contract matters.

## Rationale

This separates operational accountability from legal and contractual concepts, preserves the unresolved production gates, and avoids treating UI permissions or a future export capability as proof of legal ownership. The Personal Information Protection Commission's guidance on processor supervision supports considering selection, contracting, and safety-management monitoring; this decision is not legal advice.

## Alternatives

- Describe House Solution as the unrestricted legal owner of all records: rejected because legal and contractual treatment is not confirmed and the wording would overstate the decision.
- Assign ownership to the development or cloud providers: rejected because they act under House Solution direction for necessary processing.

## Impact

Update specification, business context, security/access, operations, HSC-011, and the central register. Keep HSC-001, HSC-024, and HSC-025 open where they govern retention, detailed permissions, and remaining production provider-contract details; HSC-020 is resolved by this project's separate operations decision.

## Migration

None. Existing records and prototype data flows are unchanged. Any future export, contract handover, deletion, or production-provider setup requires its own approved procedure.

## Reconsider When

House Solution requests a different operational authority, a specific legal or contractual arrangement is confirmed, production cloud terms are approved, or a new export/portability requirement is explicitly adopted.
