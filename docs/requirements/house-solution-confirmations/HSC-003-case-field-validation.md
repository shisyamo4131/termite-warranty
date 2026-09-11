# HSC-003: Case Field Validation

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Case registration requires application date, handover date, property, homeowner, construction company, responsible branch, and at least one applied warranty. No ordering rule between application and handover dates is currently specified.

## Questions

1. Must application date be on or before handover date?
2. What other field combinations, date ranges, correction limits, and validation messages are required?
3. Which validation failures must prevent saving?

## Affected Documents

Workflow, case requirements, validation logic, UI, and tests.
