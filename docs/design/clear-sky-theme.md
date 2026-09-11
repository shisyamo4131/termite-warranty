# Clear Sky Theme

- Status: Approved for the local prototype
- Adopted: 2026-09-11
- Scope: Nuxt/Vuetify local prototype UI only

## Intent

Use a bright, approachable visual system suitable for business administration while retaining the meaning carried by labels, icons, and state text. The theme is implemented through Vuetify tokens and small shared styles, rather than an external admin template or component-specific hard-coded palette.

## Tokens

| Purpose | Value |
| --- | --- |
| Primary | `#3478C7` |
| Secondary / accent | `#55B8D1` |
| Application background | `#F5F9FD` |
| Primary soft surface | `#E7F1FC` |
| Main text | `#26374A` |
| Secondary text | `#65778A` |
| Border | `#DDE7F0` |
| Positive state | `#39956B` |
| Warning / attention | `#D88A32` |

Derived accessibility tokens use `#203040` for keyboard focus outlines and
filled-warning foreground text. This preserves the approved nine-colour base
palette while keeping both indicators above a 3:1 contrast ratio and warning
text above a 4.5:1 contrast ratio on the surfaces used by the prototype.

## Application Rules

- Apply theme tokens to the header, navigation drawer, page background, cards, tables, dialogs, inputs, buttons, links, and selected navigation state.
- Preserve warning, error, success, inactive, and terminal-state labels and icons; colour supplements rather than replaces them.
- Interactive controls need a visible keyboard focus indicator and sufficient text/control contrast at desktop and narrow widths.
- The postal-code external API is unrelated to this theme and remains unavailable in the local prototype.

## Verification

Verify login, dashboard, master screens, case detail, dialogs, and navigation with the local emulator at both desktop and narrow browser widths. This visual check supplements, rather than replaces, typecheck and build evidence.
