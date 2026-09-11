# HSC-032: Case-list Year/Month Basis

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

An unfiltered list subscribes to at most the 20 documents with the freshest server-maintained update timestamp. House Solution expects that the case list will probably always be narrowed by a selected year and month, potentially by whether an applied warranty expires in that month. The exact month semantics are not yet confirmed.

## Questions

1. Which date defines the selected year/month: application date, handover date, any applied-warranty expiry date, or a selectable date type?
2. Which year/month is selected initially, and can users clear it to use the 20-freshest default?
3. When a month is selected, does the list show every matching case, the freshest 20 matches, or paginated matches, and how are cases with multiple matching warranties handled?

## Affected Documents

Case search/list requirements, dashboard behavior, Firestore query/read-model design, indexes, UI controls, and performance tests.
