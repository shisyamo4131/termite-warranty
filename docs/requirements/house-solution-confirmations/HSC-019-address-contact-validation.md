# HSC-019: Address and Contact-Field Validation

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Required address parts and postal-code normalization are specified. Telephone, fax, and other optional contact formats are not specified. On 2026-09-13, the project owner confirmed that email is not a construction-company master field; the separately issued construction-company account owns its login email, so master-email validation is no longer part of this matter.

## Questions

1. What address validation applies after automatic input or manual correction?
2. What telephone, fax, and contact-detail formats are accepted and normalized?
3. Should invalid optional contact values block saving or show warnings only?

## Affected Documents

Master requirements, validation logic, UI, migration cleaning, and tests.
