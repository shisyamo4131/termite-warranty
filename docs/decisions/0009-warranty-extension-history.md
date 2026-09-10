# 0009 Warranty-extension History

- Date: 2026-09-10
- Status: Accepted
- Related specification: [Functional Requirements](../specification.md#functional-requirements)
- Supersedes: None

## Context

A property case can have multiple warranty services and periods. Warranty coverage may be extended, and overwriting an existing applied warranty would lose the original product, period, expiry, status, and notification history.

## Decision

For a warranty extension, add a new applied warranty to the existing case. Do not overwrite, replace, or duplicate the case itself solely for the extension. Initialize its start date to the day after the existing warranty's expiry date; staff may edit it and overlapping warranty periods are allowed.

The existing applied warranty remains retained as its own historical record. Its lifecycle and notification status remain independent of the new applied warranty.

## Rationale

This keeps the property-centered case intact while retaining warranty history and avoiding a separate duplicated-case workflow.

## Alternatives

- Overwrite the existing applied warranty: rejected because it loses history.
- Create a copied new case: rejected because the case represents the property and can contain multiple applied warranties.

## Impact

- The case detail and registration/edit flow must support adding an applied warranty to an existing active case.
- Alert and notification evaluation continue to operate per applied warranty.
- The initial start date is a convenience value, not a validation constraint; staff may choose a different date and overlapping periods remain valid.

## Migration

No historical migration mapping is defined by this decision.

## Reconsider When

Reconsider if operations require warranty extensions to replace rather than coexist with historical coverage.
