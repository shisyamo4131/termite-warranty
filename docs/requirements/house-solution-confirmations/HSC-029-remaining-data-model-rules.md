# HSC-029: Remaining Data-Model Rules

- Status: Open decision
- Decision owner: House Solution, then project

## Confirmed Context

The principal entities, required fields, lifecycle states, and core references are provisionally defined. Duplicate master records are permitted without a warning or merge requirement. Several concrete questions are tracked separately in this register.

## Questions

1. What remaining identifier, data type, normalization, uniqueness, relationship, and edit rules are required after legacy-data inspection?
2. Which rules are business requirements from House Solution and which are implementation constraints?
3. What compatibility or migration behavior is required for older records missing later-required fields?

## Affected Documents

Initial data model, data contract, migration, validation, application logic, and tests.
