# Master Management

## Status

These are provisional initial-release requirements. The overall data behavior remains implementation-independent; the current local prototype navigation described below is confirmed separately.

## Required Master Types

- Construction companies
- Homeowners
- Properties
- Warranty services
- House Solution branches

## Required Property Fields

- Property name is required.
- Postal code, prefecture, municipality, and street/town and number are required; building name is optional. See [branches and addresses](branches-and-addresses.md).

## Required Homeowner Fields

- Homeowner name, postal code, prefecture, municipality, and street/town and number are required.
- Building name, telephone, fax, and notes are optional. No telephone or fax format rule is currently specified.
- Existing pre-change homeowner records without these fields remain readable. A normal edit supplies the required address parts.

## Required Construction-Company Fields

- Construction-company name, postal code, prefecture, municipality, and street/town and number are required.
- Building name, telephone, fax, contact person, contact details, email, and notes are optional.
- No telephone, fax, or email format rule is currently specified. See [branches and addresses](branches-and-addresses.md).

## Required Entry Points

- Staff must be able to create a needed master record while registering a case, without abandoning the case-registration flow.
- Each master type must also have a separate list/management screen.

The case-registration flow is the expected primary business starting point.

## Confirmed Local Prototype Navigation

- After login, the top page is the dashboard and business menus are presented in a Navigation Drawer.
- The current local increment has separate management entries for construction companies, homeowners, warranty services, and properties.
- Branch management remains an initial-release requirement but is outside this four-master increment.
- In these screens, a delete action means reversible inactivation. No physical-delete control is provided.
- Registration and editing forms for the four current masters open as dialogs from their respective registration and row-edit buttons.
- The case-registration dialog can open the required four-master creation dialogs without discarding the unsaved case input. Branch creation remains outside this increment.
- Each of the four current master lists links to a separate detail screen at `/masters/{master-type}/{id}`.  The detail screen has a fixed link back to its master list and its edit button opens the same dialog used by the list; it does not provide a separate edit form.
- An inactive current master remains readable from its list and detail URL.  A missing master ID shows an in-app not-found message and a link back to the corresponding list; a read failure is shown separately from not-found.
- A construction-company detail screen lists every property whose stored construction-company ID matches the company, including inactive properties, and each row links to that property's detail screen.
- A property detail screen shows its current homeowner and construction-company references as links when their records can be resolved.  Missing referenced records remain visibly unresolved rather than being inferred or recreated.

## Master Name Search

- Construction-company, homeowner, and property master lists and their case-filter selection dialogs support name search using the adopted N-Gram normalization and token-generation behavior.
- The case list itself does not directly perform a name-based free-text query; it filters cases by the selected master record IDs.

## Master Update Concurrency

- Master update, inactivation, and reactivation use last-write-wins. The last trusted write that commits becomes the stored state; an edit is not rejected solely because another user updated the same master after the form was opened.
- The trusted callable implementation conforms to this rule: clients do not submit a revision precondition, while the server retains and increments revision metadata inside the transaction. Input/reference validation and atomic writes remain enforced.

## Lifecycle Requirement

Master records that are already referenced by a case are not physically deleted. Staff can set them inactive and later restore them to active.

- Inactive masters are excluded from selection for a new case.
- Existing cases retain their master references and continue to display the current master name/address even after the master becomes inactive.
- Construction-company names, homeowner names, and property names/addresses in existing cases follow the respective master changes; none is stored as a case snapshot.
- A property's homeowner and construction-company references remain editable after the property is used by a case. Changing either property reference changes only the property and does not rewrite an existing case, including a cancelled or invalid case.
- A property holds homeowner and construction-company IDs. Selecting the property while registering a case, or changing the property on an active case, initially selects both references; staff may change either case value before saving.
- Changing a property master's homeowner or construction-company ID does not alter existing cases. See [decision 0014](../decisions/0014-preserve-case-party-references.md).
- An applied warranty displays the current name of its warranty-service master. A master-name change therefore appears on existing cases.
- A warranty-service master's default warranty period is a positive integer number of whole years. Changing it affects only newly added applied warranties; existing applied warranties retain their fixed periods and expiry dates.

## Unresolved-Matter Routing

See [HSC-008 master-list behavior](house-solution-confirmations/HSC-008-master-list-behavior.md) and [HSC-009 used-master editing](house-solution-confirmations/HSC-009-used-master-editing.md) in the central register. Duplicate master records remain permitted without a warning or merge requirement.
