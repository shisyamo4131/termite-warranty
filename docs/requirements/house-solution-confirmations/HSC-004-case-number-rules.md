# HSC-004: Production Case-Number Rules

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

New cases currently receive a fixed-width sequential number represented as `000001`. Legacy case numbers are not imported; the production format for newly registered cases remains open.

## Project Recommendation for Discussion — Not House Solution-Confirmed

### Production number format and lifecycle

- Recommend `TW-000001`: a fixed `TW-` prefix followed by a six-digit global sequence beginning at 1.
- Do not encode year, branch, warranty service, or status in the number. Do not reset the sequence.
- Maintain separate counters per environment. Once assigned, a number must never change or be reused. Cancelled, invalid, or later-deleted records retain their number reservation, and gaps are allowed.
- If a collision is detected, stop and investigate it rather than silently selecting another number. A mistaken case should be invalidated and recreated with a new number, not renumbered.
- Keep the legacy/FileMaker number namespace separate. The `TW-` prefix distinguishes new numbers; if a future legacy reference is needed, store it in a separate legacy-number field.
- Six digits supports about 69 years at the documented planning upper bound of 14,400 cases per year. New numbers can later be extended beyond six digits without changing existing identifiers.
- Replace `TW` only if House Solution supplies an official abbreviation.

### Exact-number search recommendation

The stored and displayed number should remain canonical, for example `TW-000123`. Exact-number search should also accept an omitted prefix using only the following normalization:

- `123`, `000123`, and `TW-000123` all normalize to `TW-000123`.
- Trim surrounding whitespace. Numeric-only input is treated as omitted-prefix input and is left-padded to six digits.
- Do not use partial matching. Do not add broader aliases, such as omitted-hyphen or full-width conversion, unless House Solution separately approves them.
- Invalid, too-long, or out-of-range input should receive a clear validation message and should not be sent as a query.

These are project recommendations for discussion only. They do not change the current prototype representation or establish a confirmed production identifier.

## Questions

1. Does House Solution accept or revise the `TW-000001` format, official prefix, global sequence, no-reset policy, separate environment counters, and six-digit extension approach?
2. Does House Solution accept or revise the lifecycle rules for reservations, gaps, collisions, mistaken cases, and the separate legacy/FileMaker namespace?
3. Does House Solution accept or revise the exact-search normalization and validation rules, including omitted-prefix numeric input, canonical display, no partial matching, and the explicitly excluded broader aliases?

## Affected Documents

Case requirements, data contract, registration service, and tests.
