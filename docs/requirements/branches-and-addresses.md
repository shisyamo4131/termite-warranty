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

Construction-company addresses use the same five stored parts as property addresses. Postal code, prefecture, municipality, and street/town and number are required; building name is optional. Telephone, fax, contact person, contact details, email, and notes are optional free-text fields.

The selected future postal-code API direction covers property and homeowner entry. Applying automatic lookup to construction-company entry, and detailed validation for telephone, fax, email, and other optional contact fields, remain open.

## Confirmed Postal-Code Data Direction

- When integration information is available, use Japan Post's official Postal Code and Digital Address API (郵便番号・デジタルアドレスAPI) for automatic address lookup for property and homeowner entry. Do not import Japan Post CSV data or perform monthly manual data updates in the initial release.
- Keep the lookup component replaceable so a later API provider can replace Japan Post's API.
- API agreement/credentials, availability target, cost, and detailed integration behavior remain open.

The future integration must, when one postal code has multiple matching town-area records, automatically populate prefecture and municipality only. The staff member selects or manually enters street/town and number.

The future integration must retain manual entry when no address is found or a business/other special postal code is entered. Staff may also correct prefecture and municipality after automatic input.

The future integration must show an address-lookup failure message, retain all existing input, and allow staff to enter or correct the address manually and save it.

## Open Decisions

- API agreement/credentials, availability target, cost, and detailed integration behavior.
- Detailed address-format validation after automatic input or manual correction.
- Whether construction-company postal codes use the same automatic lookup behavior as properties.
- Telephone, fax, email, and other optional construction-company contact-field formatting.

## Technical Reference

- [Japan Post: postal-code data download and official API overview](https://www.post.japanpost.jp/service/search/zipcode/download/)
