# Construction Company Table Component Contract

- Status: Integrated
- User workbench file: `/.user-ui-workbench/components/ConstructionCompanyTable.vue`
- Proposed tracked destination: `/app/components/ConstructionCompanyTable.vue`
- Initial integration point: the construction-company branch of `/app/components/MasterManagement.vue`
- Product boundary: current-prototype table only; final master-list columns and filters remain unresolved in HSC-008

## Purpose and Placement

This is the presentation-only table shown beneath the search field on the construction-company master list. It replaces only the current construction-company `<v-table>` rendering. The page retains data subscription, search, notifications, registration dialog, and Firebase writes.

## Responsibilities

The component:

- renders the supplied construction-company items without requiring a parent-side display mapping;
- makes company name, address, active state, and row actions understandable;
- offers a detail trigger and an active/inactive change trigger for each row;
- represents loading and empty states;
- contains horizontal overflow or otherwise remains usable in a narrow viewport.

The visual hierarchy, spacing, borders, row density, supplemental TEL/contact display, and desktop-to-narrow presentation are open to the user's design as long as the acceptance rules below remain true.

## Non-responsibilities

The component must not:

- read, search, sort, page, create, edit, or mutate Firebase data;
- implement the search field or the new-registration button;
- open the registration/edit dialog;
- navigate with Vue Router or construct route URLs;
- decide whether an inactivation is allowed;
- detect other users' edits, lock a row, or show an editing-conflict message; master updates remain last-write-wins;
- show application-level success or error alerts;
- modify a prop or a row object received from the parent.

## JavaScript Props

### `items` (required)

The construction-company objects already held by the parent. The parent passes them through without creating table-specific row objects. The component may read the following existing fields and ignores additional domain fields:

```js
[
  {
    id: 'company-001',
    name: 'ひだまり住宅株式会社',
    address: {
      postalCode: '1000001',
      prefecture: '東京都',
      municipality: '千代田区',
      streetTownAndNumber: '丸の内1-1-1',
      buildingName: 'ひだまりビル3階',
    },
    telephone: '03-0000-0001',
    contactPerson: '山田 花子',
    active: true,
  },
]
```

- `id`: non-empty string; stable row identifier.
- `name`: string; always present but may be long.
- `address`: the existing address object with `postalCode`, `prefecture`, `municipality`, `streetTownAndNumber`, and nullable `buildingName`. The component decides how to display it.
- `telephone`: string or `null`; optional supplemental display.
- `contactPerson`: string or `null`; optional supplemental display.
- `active`: boolean; `true` means 有効 and `false` means 無効.

### `loading` (optional, default `false`)

Boolean. While true, communicate that data is being loaded. This flag must not hide items that the parent has already supplied. When the parent wants no prior results shown during a new request, the parent clears `items` itself. The ordinary no-data display applies only when `loading` is false and `items` is empty; no separate empty-state prop is required.

## Emitted Events

### `show-detail`

Emit after the user selects the detail trigger:

```js
emit('show-detail', { id: 'company-001' })
```

### `change-active`

Emit after the user selects 無効化 or 再有効化. The component does not optimistically change the row:

```js
emit('change-active', { id: 'company-001', nextActive: false })
```

For an inactive row, `nextActive` is `true`.

## Slots

No slots are required for this first version. Adding a slot during authoring is permitted only as a documented proposal; integration will not depend on an undeclared slot.

## Required States and Interaction

- Normal: multiple active rows and at least one inactive row are distinguishable without relying on color alone.
- Long content: long company names and addresses wrap or truncate in a way that keeps the row actions usable; meaningful content must remain obtainable without editing source.
- Missing optional values: nullable building/TEL/contact values do not render as `null` or `undefined`.
- Loading: a progress indicator or skeleton is shown, not the empty message.
- Empty: one clear message occupies the table area.
- Detail action: always emits `show-detail`; it performs no navigation itself.
- State action: its accessible name contains the company name and the resulting operation, for example `ひだまり住宅株式会社を無効化`.

## Vuetify, Theme, and Accessibility

- Use Vue 3 JavaScript with `<script setup>` or `<script setup lang="js">` and Vuetify 3 components where useful.
- Use the application's Clear Sky theme colors through Vuetify semantic names such as `primary`, `success`, and `surface`; do not hard-code a separate brand palette.
- Keep readable contrast and a visible keyboard focus state.
- Use actual button controls for actions. Icon-only controls require an `aria-label` and tooltip or visible explanation.
- Associate column headings with data when using a semantic table.
- On narrow screens, contain horizontal scrolling inside the component or use another legible narrow layout; do not force the whole page wider than the viewport. Mobile product support remains unresolved, so this contract requires graceful narrow display but does not introduce mobile-only business behavior.

## Display Fixture and Preview

- Fixture: `/.user-ui-workbench/fixtures/construction-company-table.js`
- Export: `constructionCompanyItems`
- The array includes normal, inactive, missing-optional-value, and long-content examples in the same nested shape received from the parent.
- The ignored preview harness derives normal, loading, and no-data demonstrations by changing only `items` and `loading`. It runs without Firebase through `npm run dev:ui-workbench` at `http://127.0.0.1:23610/`.

## Acceptance and Integration Checks

The workbench version is ready for review when:

1. it renders all preview states without console errors;
2. detail and active-state controls emit exactly the payloads above;
3. inactive state and operation meaning are understandable without color alone;
4. a long row and a 360-pixel-wide viewport do not make actions unusable;
5. no Firebase, API, router, global store, or environment access exists in the component.

After submission, the coordinator will review the component against this contract, adapt it to TypeScript if useful, integrate it without importing the ignored fixture, and run the verification gates selected for the actual tracked UI change.

## Integration Record

- Integrated tracked component: `/app/components/ConstructionCompanyTable.vue`
- Integrated parent: the construction-company branch of `/app/components/MasterManagement.vue`
- The tracked version preserves the accepted display and events, declares typed required `items` and optional `loading` props, and safely renders readable legacy rows that do not contain an address.
- The tracked application does not import the ignored workbench component or fixture.
