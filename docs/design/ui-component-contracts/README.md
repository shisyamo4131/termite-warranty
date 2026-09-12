# UI Component Contracts

- Status: Active
- Authority: Each file records the approved integration contract for one user-authored UI component. It does not itself approve unrelated product behavior.

Create one file per target component before authoring begins. Use a stable kebab-case filename and include:

- purpose and placement;
- responsibilities and non-responsibilities;
- JavaScript-facing props with required/default values and examples;
- emitted events and payloads;
- slots;
- applicable UI states and responsive behavior;
- Vuetify/theme and accessibility constraints;
- acceptance examples;
- tracked integration destination and required verification.
- optional workbench fixture filename, exported JavaScript values, and visual states represented.

The disposable implementation belongs under `/.user-ui-workbench/components/`; the accepted integrated implementation belongs in the tracked application path named by its contract.

## Contracts

- [Construction company table](construction-company-table.md)
- [Homeowner table](homeowner-table.md)
