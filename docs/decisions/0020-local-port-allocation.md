# 0020 Dedicated Local Ports with AirGuardV2 Priority

- Date: 2026-09-12
- Status: Accepted and implemented
- Related specification: None; local development operation only
- Supersedes: None

## Context

The same host runs local development for this project and the separately governed `AirGuardV2` project. `AirGuardV2` declares normal Emulator ports 5000, 5001, 8080, 9000, 9099, and 9199, and dedicated Codex-test ports in the 14000, 15000, 18000, and 19000 ranges, with its generated UI server on 14600. This project's former Auth port 9199 conflicted with the normal AirGuardV2 Storage Emulator, and an unpinned Nuxt development server could contend for the common default port.

## Decision

Give `AirGuardV2` priority. Pin this project to a separate local-only set:

- Nuxt: 23600
- Emulator UI: 24000
- Emulator Hub: 24400
- Emulator Logging: 24500
- Functions: 25001
- Firestore: 28080
- Authentication: 29099
- Isolated UI workbench preview: 23610

Keep the application, seed, runtime guards, Emulator integration tests, operations documentation, and Firebase configuration aligned with these exact values. The seed rejects a pre-existing Auth or Firestore Emulator environment variable unless it exactly matches this project's dedicated endpoint; it must never silently reuse another local project's Emulator process.

Before startup, inspect current listeners. Do not stop or retarget another project's process. If a future conflict exists, move this project's complete affected set and revalidate it rather than changing AirGuardV2.

## Rationale

A fixed, project-specific range permits both local stacks to run concurrently and makes browser handoff repeatable. Explicit Hub and Logging ports avoid hidden contention outside the three application-facing emulators.

## Alternatives

- Keep the old values and coordinate manually. Rejected because port 9199 already overlaps AirGuardV2's declared normal configuration.
- Change AirGuardV2. Rejected because the user assigned it priority.
- Select free ports dynamically on every run. Rejected because the browser client, seed, Functions guard, and integration tests require a stable coordinated endpoint set.

## Impact

- Local URLs and Emulator connection values change; Firebase development and production targets do not.
- Developers must restart any old local processes before using the new configuration.
- The port change has no stored-data migration and does not contact either Firebase project.

## Migration

Stop old local processes, then use the normal documented start, seed, and development commands. Disposable Emulator data may be reseeded.

## Reconsider When

Reallocate this project's ports if another higher-priority local project claims any value in the dedicated set.
