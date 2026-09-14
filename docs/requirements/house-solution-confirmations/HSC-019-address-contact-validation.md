# HSC-019: Address and Contact-Field Validation

- Status: Resolved
- Decision owner: House Solution

## Confirmed Context

Required address parts and postal-code normalization are specified. Telephone, fax, and other optional contact formats are not specified. On 2026-09-13, the project owner confirmed that email is not a construction-company master field; the separately issued construction-company account owns its login email, so master-email validation is no longer part of this matter.

## Resolution

- Decision: Do not perform an additional address-validity check after automatic input or manual correction. Existing required-field and postal-code normalization checks still apply.
- Decision: Optional TEL and FAX accept only ASCII digits and hyphens after surrounding whitespace is removed. A nonempty value containing another character blocks saving. No separator position or digit-count rule is imposed.
- Decision: Email belongs to authentication accounts, not the construction-company master. Account input removes surrounding whitespace, converts to lowercase, and applies only the existing minimal regular-expression check before Firebase Authentication's own acceptance checks.
- Decision: No additional format rule applies to the construction-company contact-person or contact-details free text.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md`, master/address requirements, prototype data contract, implementation, and tests.

## Affected Documents

Master requirements, validation logic, UI, migration cleaning, and tests.
