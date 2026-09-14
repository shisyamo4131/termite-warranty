# Property Table Component Contract

- Status: Ready for user authoring
- User workbench file: `/.user-ui-workbench/components/PropertyTable.vue`
- Proposed tracked destination: `/app/components/PropertyTable.vue`
- Initial integration point: the property branch of `/app/components/MasterManagement.vue`
- Product boundary: current-prototype table only; list subscription, search, paging, and data mutations remain parent responsibilities

## Purpose and Placement

This presentation-only component is shown beneath the search field on the property list. It will replace only the current property `<v-table>` rendering after review and acceptance.

## Responsibilities

The component renders supplied property rows, makes the property name, address, building area, active state, and row actions understandable, communicates loading and empty states, and remains usable at a 360-pixel viewport width.

## Non-responsibilities

The component must not read, search, sort, page, create, edit, or mutate Firebase data; implement the search field or registration dialog; navigate with Vue Router; construct route URLs; decide whether lifecycle changes are allowed; show page-level messages; or modify received props.

## JavaScript Props

### `items` (required)

The parent passes its existing property objects directly. Additional domain fields must be ignored.

```js
[
  {
    id: 'property-001',
    name: '青空邸',
    address: {
      postalCode: '1000001',
      prefecture: '東京都',
      municipality: '千代田区',
      streetTownAndNumber: '丸の内1-1-1',
      buildingName: '青空レジデンス',
    },
    buildingAreaSquareMeters: 98.75,
    notes: '表示確認用の架空データ',
    active: true,
  },
]
```

- `id`: non-empty stable string.
- `name`: string; always present but may be long.
- `address`: existing five-part address object; `buildingName` may be string or `null`.
- `buildingAreaSquareMeters`: required positive number with at most two decimal places.
- `notes`: string or `null`; optional supplemental display.
- `active`: boolean; `true` means 有効 and `false` means 無効.

### `loading` (optional, default `false`)

While true, communicate loading without hiding already supplied rows. Show the empty message only when loading is false and `items` is empty.

## Emitted Events

- `show-detail`: `emit('show-detail', { id: 'property-001' })`
- `change-active`: `emit('change-active', { id: 'property-001', nextActive: false })`

The component performs no navigation and does not optimistically mutate a row.

## Slots

No slots are required. Any proposed slot must be documented for review and integration must not depend on an undeclared slot.

## Required States and Interaction

- Normal rows include active and inactive examples distinguishable without color alone.
- Long property names, addresses, and notes keep row actions usable.
- Missing building name or notes never renders as `null` or `undefined`.
- Loading with rows keeps the rows visible and communicates loading.
- Empty state appears only when not loading.
- Detail remains available on inactive rows.
- The lifecycle action's accessible name includes the property name and resulting operation.

## Vuetify, Theme, and Accessibility

- Use Vue 3 JavaScript with `<script setup>` or `<script setup lang="js">` and Vuetify 3 where useful.
- Use the application's Clear Sky semantic theme colors; do not create another brand palette.
- Use actual buttons. Icon-only controls require an `aria-label` and tooltip or visible explanation.
- Keep keyboard focus visible and associate headings with table data.
- At 360 pixels, contain horizontal scrolling inside the component or use another legible responsive layout.

## Display Fixture and Preview

- Fixture: `/.user-ui-workbench/fixtures/property-table.js`
- Export: `propertyItems`
- It contains active, inactive, missing-optional-value, and long-content fictional examples.
- The preview derives normal, loading-with-items, and empty demonstrations using only `items` and `loading`.
- Preview command: `npm run dev:ui-workbench`; URL: `http://127.0.0.1:23610/`.

## Acceptance and Integration Checks

The workbench version is ready for review when all preview states render without console errors, both events use the exact payloads above, inactive and lifecycle meaning do not rely on color alone, long content and 360-pixel width keep actions usable, and the component contains no Firebase, API, Router, global-store, or environment access.

After the user identifies it as ready, the coordinator reviews it against this contract before tracked integration.
