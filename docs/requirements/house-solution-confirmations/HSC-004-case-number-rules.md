# HSC-004: Production Case-Number Rules

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

New cases currently receive a fixed-width sequential number represented as `000001`. Legacy case numbers are not imported; the production format for newly registered cases remains open.

## Questions

1. What production format, starting value, and reset policy apply?
2. Must legacy and new numbers share one uniqueness space?
3. How should collisions, missing legacy numbers, and corrected numbers be handled?

## Affected Documents

Case requirements, data contract, registration service, and tests.
