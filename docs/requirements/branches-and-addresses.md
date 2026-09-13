# Branches and Addresses

## Branch Master

- House Solution branches are managed as a master with a branch name.
- Each case carries a responsible branch reference. Construction companies, homeowners, and properties do not carry a responsible branch reference.
- A case's responsible branch is editable.
- When a branch-master name changes, existing cases display the new name through their branch reference; a branch name is not stored as a case snapshot.

## Property and Homeowner Address

Property and homeowner addresses are stored in these five parts:

1. Postal code
2. Prefecture
3. Municipality
4. Street/town and number
5. Building name

Postal code accepts seven digits, with an optional hyphen. Normalize the stored value. The local prototype keeps the address fields available for manual entry; automatic lookup on field focus loss is deferred until the selected API's agreement, credentials, and interface are available.

Postal code, prefecture, municipality, and street/town and number are required. Building name is optional. A homeowner additionally has optional telephone, fax, and notes fields; no format rules are currently specified.

## Construction-Company Address and Contact Details

Construction-company addresses use the same five stored parts as property addresses. Postal code, prefecture, municipality, and street/town and number are required; building name is optional. Telephone, fax, contact person, contact details, and notes are optional free-text fields. The construction-company master does not store an email address; the separately issued construction-company account owns its login email.

The selected future postal-code API direction covers property and homeowner entry. Applying automatic lookup to construction-company entry, and detailed validation for telephone, fax, and other optional contact fields, remain open.

## Confirmed Postal-Code Data Direction

- Use Google Maps Platform Geocoding API for automatic postal-code address lookup for property and homeowner entry. Restrict requests to Japan and the entered postal code, and map typed response components instead of parsing the formatted-address string. Do not import Japan Post CSV data or perform monthly manual data updates in the initial release.
- Keep the lookup component replaceable so another provider can be selected later.
- Billing, Google Cloud project and credential ownership, API-key or OAuth handling, quota and cost controls, availability target, and detailed Japanese response mapping remain open under HSC-017.

The future integration must, when one postal code has multiple matching town-area records, automatically populate prefecture and municipality only. The staff member selects or manually enters street/town and number.

The future integration must retain manual entry when no address is found or a business/other special postal code is entered. Staff may also correct prefecture and municipality after automatic input.

The future integration must show an address-lookup failure message, retain all existing input, and allow staff to enter or correct the address manually and save it.

## Unresolved-Matter Routing

See [HSC-017 postal API conditions](house-solution-confirmations/HSC-017-postal-api-conditions.md), [HSC-018 construction-company postal lookup](house-solution-confirmations/HSC-018-company-postal-lookup.md), and [HSC-019 address/contact validation](house-solution-confirmations/HSC-019-address-contact-validation.md) in the central register.

## Technical References

- [Google Geocoding request and response](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Google Maps Platform API security](https://developers.google.com/maps/api-security-best-practices)
