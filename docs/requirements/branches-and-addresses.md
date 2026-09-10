# Branches and Addresses

## Branch Master

- House Solution branches are managed as a master with a branch name.
- Each case carries a responsible branch reference. Construction companies, homeowners, and properties do not carry a responsible branch reference.
- A case's responsible branch is editable.
- When a branch-master name changes, existing cases display the new name through their branch reference; a branch name is not stored as a case snapshot.

## Property Address

Property addresses are stored in these five parts:

1. Postal code
2. Prefecture
3. Municipality
4. Street/town and number
5. Building name

Postal code accepts seven digits, with an optional hyphen. Normalize the value before lookup and perform automatic address lookup when the field loses focus.

Postal code, prefecture, municipality, and street/town and number are required. Building name is optional.

## Confirmed Postal-Code Data Direction

- Use Japan Post's official Postal Code and Digital Address API (郵便番号・デジタルアドレスAPI) for automatic address lookup. Do not import Japan Post CSV data or perform monthly manual data updates in the initial release.
- Keep the lookup component replaceable so a later API provider can replace Japan Post's API.
- API agreement/credentials, availability target, cost, and detailed integration behavior remain open.

When one postal code has multiple matching town-area records, automatically populate prefecture and municipality only. The staff member selects or manually enters street/town and number.

When no address is found or a business/other special postal code is entered, staff may manually enter the address. Staff may also correct prefecture and municipality after automatic input.

When the API request itself fails, show an address-lookup failure message, retain all existing input, and allow staff to enter or correct the address manually and save it.

## Open Decisions

- API agreement/credentials, availability target, cost, and detailed integration behavior.
- Detailed address-format validation after automatic input or manual correction.

## Technical Reference

- [Japan Post: postal-code data download and official API overview](https://www.post.japanpost.jp/service/search/zipcode/download/)
