# Master Management

## Status

These are provisional initial-release requirements. They do not prescribe screen layout or database implementation.

## Required Master Types

- Construction companies
- Homeowners
- Properties
- Warranty services
- House Solution branches

## Required Property Fields

- Property name is required.
- Postal code, prefecture, municipality, and street/town and number are required; building name is optional. See [branches and addresses](branches-and-addresses.md).

## Required Entry Points

- Staff must be able to create a needed master record while registering a case, without abandoning the case-registration flow.
- Each master type must also have a separate list/management screen.

The case-registration flow is the expected primary business starting point.

## Master Name Search

- Construction-company, homeowner, and property master lists and their case-filter selection dialogs support name search using the adopted N-Gram normalization and token-generation behavior.
- The case list itself does not directly perform a name-based free-text query; it filters cases by the selected master record IDs.

## Lifecycle Requirement

Master records that are already referenced by a case are not physically deleted. Staff can set them inactive and later restore them to active.

- Inactive masters are excluded from selection for a new case.
- Existing cases retain their master references and continue to display the current master name/address even after the master becomes inactive.
- Construction-company names, homeowner names, and property names/addresses in existing cases follow the respective master changes; none is stored as a case snapshot.
- A property's homeowner reference is editable after the property is used by a case. When it changes, the homeowner ID on every affected case follows the new homeowner.
- This automatic reference update applies to every affected case, including a cancelled or invalid case; it does not make those case records staff-editable.
- A property holds a construction-company ID. Selecting the property while registering a case automatically applies that construction company to the case.
- Changing a property master's construction-company ID does not alter existing cases. Changing the property selected on an active case replaces that case's construction company with the newly selected property's construction company.
- An applied warranty displays the current name of its warranty-service master. A master-name change therefore appears on existing cases.
- A warranty-service master's default warranty period is a positive integer number of whole years. Changing it affects only newly added applied warranties; existing applied warranties retain their fixed periods and expiry dates.

## Open Decisions

- Editing rules, including which fields can change after a master is used by a case.
- Duplicate records are permitted without a warning or merge requirement.
- Separate master search/list filters, display columns, sort order, and pagination.
- Whether creation from case registration occurs in a dialog, a separate page, or another interaction pattern.
