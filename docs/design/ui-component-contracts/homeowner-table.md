# Homeowner Table Component Contract

- Status: Integrated after accepted review on 2026-09-13
- User workbench file: `/.user-ui-workbench/components/HomeOwnerTable.vue`
- Proposed tracked destination: `/app/components/HomeOwnerTable.vue`
- Initial integration point: the homeowner branch of `/app/components/MasterManagement.vue`
- Product boundary: current-prototype table only; final master-list columns and filters remain unresolved in HSC-008

## Purpose and Placement

This is the presentation-only table shown beneath the search field on the homeowner master list. It replaces only the current homeowner table rendering. The page retains data subscription, search, notifications, registration dialog, and Firestore writes.

## Responsibilities

The component:

- renders the homeowner objects supplied by the parent without requiring a table-specific display mapping;
- makes homeowner name, address, active state, and row actions understandable;
- emits a detail trigger and an active/inactive change trigger for each row;
- communicates loading without hiding items already received;
- shows a natural empty state when loading is false and items are empty;
- remains usable in a narrow viewport without widening the whole page.

The visual hierarchy, spacing, borders, density, optional telephone/fax display, and narrow-screen arrangement are open to the user's design.

## Non-responsibilities

The component must not:

- read, search, sort, page, create, edit, or mutate Firebase data;
- implement the search field or new-registration button;
- navigate with Vue Router or construct route URLs;
- decide whether lifecycle changes are allowed;
- detect concurrent edits, lock rows, or show editing-conflict messages;
- show application-level success or error alerts;
- modify the `items` array or a row object received from the parent.

## JavaScript Props

### `items` (required)

The parent passes its existing homeowner objects directly. The component may read the fields below and ignores additional domain fields:

```js
[
  {
    id: 'homeowner-001',
    name: '青空 花子',
    address: {
      postalCode: '1000001',
      prefecture: '東京都',
      municipality: '千代田区',
      streetTownAndNumber: '丸の内1-1-1',
      buildingName: '青空ハイツ101号室',
    },
    telephone: '03-0000-1001',
    fax: null,
    active: true,
  },
]
```

- `id`: non-empty stable string.
- `name`: string; always present but may be long.
- `address`: existing address object. `buildingName` may be a string or `null`.
- `telephone` and `fax`: string or `null`; optional supplemental display.
- `active`: boolean; `true` means 有効 and `false` means 無効.

### `loading` (optional, default `false`)

Boolean. While true, communicate loading but continue to display any supplied items. If the parent wants old results hidden during a request, the parent clears `items`. A separate empty-state prop is not required: show the empty message only when `loading` is false and `items` is empty.

## Emitted Events

### `show-detail`

```js
emit('show-detail', { id: 'homeowner-001' })
```

This is available for active and inactive homeowners. The component does not navigate.

### `change-active`

```js
emit('change-active', { id: 'homeowner-001', nextActive: false })
```

For an inactive row, `nextActive` is `true`. The component does not update the row optimistically.

## Slots

No slot is required. A proposed slot must be documented during review and integration must not depend on an undeclared slot.

## Required States and Interaction

- Normal: multiple active rows and at least one inactive row.
- Long content: long names and addresses remain understandable and row actions remain usable.
- Missing optional values: nullable building name, telephone, and fax never appear as `null` or `undefined`.
- Loading with items: existing rows remain visible and loading is communicated.
- Empty: one clear empty message when loading is false and items are empty.
- Detail: always emits `show-detail`, including for an inactive row.
- Lifecycle action: accessible name contains the homeowner name and resulting operation.

## Vuetify, Theme, and Accessibility

- Use Vue 3 JavaScript with `<script setup>` or `<script setup lang="js">` and Vuetify 3 where useful.
- Use Clear Sky semantic theme colors such as `primary`, `success`, `error`, and `surface`; do not hard-code another brand palette.
- Do not rely on color alone for active/inactive meaning.
- Use actual buttons. Icon-only buttons need an `aria-label` and tooltip or visible explanation.
- Use associated column headings when presenting a semantic table.
- Keep keyboard focus visible.
- At 360 pixels wide, contain horizontal scrolling inside the component or use another legible layout.

## Display Fixture and Preview

- Fixture: `/.user-ui-workbench/fixtures/homeowner-table.js`
- Export: `homeownerItems`
- The array contains active, inactive, missing-optional-value, and long-content examples.
- The ignored preview derives normal, loading-with-items, and empty demonstrations using only `items` and `loading`.
- Preview URL: `http://127.0.0.1:23610/`; browser refresh or normal hot reload is sufficient after edits.

## Acceptance and Integration Checks

The workbench version is ready for review when:

1. every preview state renders without console errors;
2. both events emit exactly the payloads above;
3. inactive state and action meaning are understandable without color alone;
4. inactive rows still expose the detail action;
5. long content and a 360-pixel viewport keep actions usable;
6. no Firebase, API, Router, global-store, or environment access exists in the component.

After submission, the coordinator reviews the component against this contract, adapts it to TypeScript if useful, integrates it without importing the ignored fixture, and runs the verification gates selected for the tracked UI change.

## Integration Evidence

- The ignored workbench component was accepted for integration after normal, loading-with-items, empty, event-payload, inactive-detail, long-content, and 360-pixel checks passed without console errors.
- The tracked TypeScript component preserves the submitted responsive headers, semantic status chips, detail/lifecycle controls, and Clear Sky colors. Contract-only props are retained; workbench-only display customization props were not promoted into the application API.
- `MasterManagement.vue` supplies the existing bounded and filtered homeowner rows, retains navigation and Firestore mutation ownership, and handles the component's exact event payloads.
- On the final integration state, `npm test` passed 92 tests with 2 existing host-limited skips and 0 failures; the 81-test Rules/Callable Emulator suite, typecheck, static build, recursive Functions syntax, seed syntax, and governance check each exited 0. The build retained its existing large-chunk and Nuxt/Nitro warnings.
