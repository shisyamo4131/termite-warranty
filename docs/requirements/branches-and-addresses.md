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

Postal code accepts seven digits, with an optional hyphen. Normalize the stored value. The adopted lookup source is Japan Post's official nationwide UTF-8 postal-code CSV, transformed into same-origin Firebase Hosting search data; the update command, generated shards, and freshness warning remain unimplemented.

Postal code, prefecture, municipality, and street/town and number are required. Building name is optional. A homeowner additionally has optional telephone, fax, and notes fields. A nonempty telephone or fax accepts only ASCII digits and hyphens after trimming; no digit-count or separator-position rule applies.

## Construction-Company Address and Contact Details

Construction-company addresses use the same five stored parts as property addresses. Postal code, prefecture, municipality, and street/town and number are required; building name is optional. Telephone, fax, contact person, contact details, and notes are optional. Telephone and fax use the same digits-and-hyphens rule as homeowner contact values; contact person and contact details remain unrestricted free text. The construction-company master does not store an email address; the separately issued construction-company account owns its login email.

The selected postal-data direction covers property, homeowner, and construction-company entry with the same multiple-match, no-match, manual-correction, and failure fallback behavior. Prefecture and municipality are completed from a match, and the town-area becomes the initial value or leading portion of the existing `street/town and number` field. The user appends or corrects chome and lot number in that same field; building name remains a separate manual field. All fields remain editable after candidate selection, and no new persisted address field is added.

## Confirmed Postal-Code Data Direction

- Use Japan Post's official nationwide 「住所の郵便番号（1レコード1行、UTF-8形式）」 CSV. Transform it for search, split by postal-code leading digits or an equivalent bounded shard key, and serve it from Firebase Hosting on the same origin.
- Provide an initial-release manual update command and monthly update check. Record source/basis date, last-check date, generation date, schema version, shard/count/checksum manifest data, and warn administrators when the last check is at least 60 days old. Automatic updates are future scope.
- No runtime external API, API key, billing, quota, App Check, or Google attribution is required. The provider-neutral foundation may remain reusable, but CSV transformation, publication, and freshness operations are not implemented yet.

When one postal code has multiple matching town-area records, the staff member selects a candidate. The lookup populates prefecture, municipality, and the town-area portion of the existing street/town-and-number field; the staff member enters or corrects chome and lot number in that same field, plus the separate building-name field.

The future integration must retain manual entry when no address is found or a business/other special postal code is entered. Staff may also correct prefecture and municipality after automatic input. No additional address-validity check runs after automatic input or manual correction; required fields and postal-code normalization still apply.

The future integration must show an address-lookup failure message, retain all existing input, and allow staff to enter or correct the address manually and save it.

## Unresolved-Matter Routing

HSC-017, HSC-018, and HSC-019 are resolved. The remaining implementation and operational work is recorded in TR-009.

## Technical References

- [Japan Post: UTF-8 postal-code data download](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)
- [Japan Post: postal-code data notes](https://www.post.japanpost.jp/service/search/zipcode/download/readme.html)
