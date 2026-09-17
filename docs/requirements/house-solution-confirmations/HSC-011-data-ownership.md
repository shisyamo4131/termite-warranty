# HSC-011: Legal and Operational Data Ownership

- Status: Resolved
- Decision owner: Project owner

## Confirmed Context

The system handles customer, property, warranty, notification, and staff-account information. Legal and contractual treatment must be distinguished from operational responsibility and decision authority; the latter is resolved below without describing the arrangement as a simple transfer of data ownership.

## Resolution

- Decision: House Solution has operational authority and is the final decision-maker for business data in the new system, including cases, applied warranties, masters, notifications, and staff accounts. House Solution decides purpose, access, correction, retention, and deletion.
- Decision: A homeowner is the personal-information subject, not a database-record owner. Requests for disclosure, correction, restriction of use, or similar handling are received through House Solution and handled under applicable law, contracts, and retention duties.
- Decision: A construction company is responsible for the lawful acquisition context and content it submits through the portal. While a submission remains editable, the company corrects it; once submitted, including while it is awaiting review and after registration, House Solution manages it operationally. This is not described as an ownership transfer.
- Decision: Development and maintenance providers are processors acting under House Solution instructions, limited to the necessary scope. They may not independently use, provide to third parties, export, remove, or take copies of the data.
- Decision: Google/Firebase are treated as cloud processing providers for planning purposes. The exact production contracting entity, storage region, subprocessors, and contract-termination conditions remain unconfirmed under HSC-020/HSC-025 and related production gates.
- Decision: Routine access and correction use approved business permissions. Outputs require House Solution administrator approval; retention/deletion policy is decided by the House Solution business owner; individual deletion requires checking retention periods and complaint, dispute, investigation, or legal holds. Developers and construction companies may not perform unilateral bulk export or deletion. Detailed permissions remain under HSC-024, and retention periods remain under HSC-001.
- Decision: On contract termination, House Solution must be able to receive necessary data. After handover is confirmed, development/maintenance copies are deleted within the contractually specified period. An export feature is not approved for initial-release implementation by this decision.
- Decision: Source-code/IP, fees, and the contract's termination terms themselves are separate contract matters outside HSC-011.
- Rationale: The Personal Information Protection Commission's guidance on supervision of processors (selection, contracting, and understanding safety-management conditions) supports this responsibility split. This record is not legal advice or a conclusion about a particular contract.
- Decision maker/date: Project owner, 2026-09-17.
- Evidence: Explicit user approval in the current Codex task.
- Promoted to: `docs/specification.md`, `docs/requirements/business-context.md`, `docs/requirements/security-and-access.md`, `docs/operations.md`, and [decision 0029](../../decisions/0029-data-responsibility-and-decision-authority.md).

## Affected Documents

Security, privacy, access control, operations, contracts, and data-retention requirements.
