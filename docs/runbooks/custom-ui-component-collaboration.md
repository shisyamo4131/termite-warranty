# Custom UI Component Collaboration

- Status: Active
- Workspace: `/.user-ui-workbench/` in the primary project directory
- Git policy: the workspace is ignored and is never committed

## Purpose

Use the local workbench when the user needs to express detailed appearance or interaction by writing a JavaScript Vue component rather than describing it in prose. The user may work there while implementation continues elsewhere in the repository.

## Ownership and Concurrency

- The user owns component and note files under `/.user-ui-workbench/`. Agents must not edit, rename, format, or delete them unless the user explicitly asks. The coordinator may create contract-scoped fictional data under `fixtures/` as described below.
- The user changes only the workbench copy while parallel project work is active. This avoids conflicts with tracked application components.
- The coordinator reads a submitted workbench component only after the user identifies the file as ready for review.
- The workbench may contain disposable experiments. It is not a source of truth, build input, test fixture, backup, or deliverable.
- Do not place credentials, real customer information, production records, or other secrets in the workbench.

## Contract Before Authoring

Before the user starts a target component, the coordinator records a reviewable component contract under `docs/design/ui-component-contracts/` and presents it in plain language. The contract must state:

1. component purpose and exact intended placement;
2. responsibilities and explicitly excluded responsibilities;
3. props, their JavaScript value shapes, required/default values, and examples;
4. emitted events and payload shapes;
5. slots, if any;
6. loading, empty, error, disabled, active, and responsive states that apply;
7. Vuetify/theme constraints and accessibility requirements;
8. visual and interaction acceptance examples;
9. the proposed tracked destination and integration checks.
10. whether display fixtures are needed and which states the fixtures must demonstrate.

Do not ask the user to invent TypeScript types. The contract translates every relevant type into JavaScript examples and plain-language constraints.

## User Authoring Boundary

- Create a Vue Single-File Component under `/.user-ui-workbench/components/`.
- Use JavaScript: `<script setup>` or `<script setup lang="js">`.
- Prefer props, emits, slots, HTML, CSS, and Vuetify presentation components.
- Do not connect directly to Firebase, call APIs, mutate application-wide state, navigate routes, or copy business logic unless the component contract explicitly requires it.
- Use fictional display data only in a local preview or notes file.
- Record any intentional difference from the contract in a sibling Markdown note.

## Display Fixtures

- When realistic variation will help visual work, the coordinator creates a JavaScript fixture under `/.user-ui-workbench/fixtures/` at the same time as the component contract.
- Fixtures use only clearly fictional values and plain JavaScript objects/arrays. They must not access Firebase, APIs, environment variables, or application state.
- Include only the fields in the component contract and only the states needed for appearance and interaction checks, such as normal, long text, empty, inactive, warning, or error.
- The contract states the fixture filename, exported names, and how the component or an optional workbench preview imports them.
- Fixture files are disposable and ignored by Git. The tracked application must not import from the workbench; integration replaces them with typed application inputs or tracked test fixtures as appropriate.

## Isolated Preview Before Integration

- The ignored `/.user-ui-workbench/preview/` directory is a small Nuxt/Vuetify harness. It is not part of the tracked application and must not import application pages, stores, Firebase configuration, or environment variables.
- For each component contract that needs pre-integration visual checking, the coordinator updates the ignored preview `app.vue` to import the user's component and the contract fixture. The user-owned component itself remains untouched.
- From the repository root, the coordinator starts it with `npm run dev:ui-workbench`. It is available only on `http://127.0.0.1:23610/` and uses the repository's already-installed Nuxt/Vuetify dependencies.
- The coordinator first checks that port `23610` is free and never starts the harness when another project owns it. Stop the identified preview process with `Ctrl+C` in its terminal; do not stop an unrelated process merely because it uses that port.
- The preview must render without an Emulator Suite. It uses only the fictional fixture named by the component contract. Browser refresh is sufficient after component or fixture edits.
- Before integration, the coordinator verifies that the preview renders the contracted states. Normal application validation separately confirms that tracked source and the production build do not depend on `/.user-ui-workbench/`.

## Integration

After the user marks the component ready, the coordinator:

1. compares it with the recorded contract;
2. preserves the intended visual and interaction design;
3. separates presentation from business/data responsibilities where needed;
4. converts JavaScript to TypeScript only when useful for the tracked codebase;
5. integrates it into the approved application location;
6. runs the verification gates selected for the actual changed surfaces;
7. reports any material deviation from the submitted component.

The ignored workbench copy may remain or be deleted by the user. Integration never depends on it remaining available.

## Local Visual Verification

- The coordinator starts and stops the Emulator Suite, seed, and Nuxt server when the user asks to inspect a component.
- Before startup, the coordinator checks current listeners. The colocated `AirGuardV2` project has priority over every port.
- This project uses Nuxt `23600`, Auth `29099`, Firestore `28080`, Functions `25001`, Emulator UI `24000`, Hub `24400`, and Logging `24500`.
- The application URL is `http://127.0.0.1:23600/`; the Emulator UI is `http://127.0.0.1:24000/`.
- Do not start a second instance when this project's process already owns the configured port. Stop only processes positively identified as belonging to this project.
