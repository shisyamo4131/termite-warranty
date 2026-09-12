# 0019 Remove the Unused Profile Callable

- Date: 2026-09-12
- Status: Accepted and implemented by TR-008
- Related specification: [Security and access posture](../requirements/security-and-access.md)
- Supersedes: None

## Context

`getOwnProfile` exposes a Callable endpoint that reads the signed-in user's `staffAccounts/{uid}` document. The current UI does not call it. `useSession` already subscribes directly to that same document under Firestore Rules and uses the live result to populate the profile or sign the user out when the record becomes unavailable, disabled, or invalid.

The endpoint is therefore a second, unused profile-read path. Its removal does not remove the confirmed server-enforced account-management boundary: future account creation, editing, disabling, Authentication administration, and caller/target-role authorization still require dedicated Cloud Functions with Admin SDK access.

## Decision

Remove the `getOwnProfile` Callable export and its wrapper-level Emulator test. Keep the direct self-profile Firestore subscription and its Rules boundary unchanged.

Do not treat the source change as authorization to delete a deployed remote function. Before a future deployment, inspect the actual development target and any repository-external consumers. If the remote function exists, its deletion requires separate explicit approval under the fail-closed deployment policy.

## Rationale

One live subscription is the required path for immediate disabled-account response. Retaining an unused one-shot Callable adds a public deployment surface, maintenance code, and test scope without improving the current UI or the future account-management authorization model.

Because the UI already makes no calls to this endpoint, removal does not materially reduce current invocation charges or latency. Firestore reads used by the profile subscription remain.

## Alternatives

- Keep the endpoint for hypothetical future use. Rejected because no confirmed consumer or future contract requires it.
- Replace the Firestore subscription with the Callable. Rejected because a one-shot read would not provide the current live disabled-account response.
- Move account-management operations to direct Firestore writes. Rejected because the confirmed caller/target-role and Authentication administration boundary must remain server enforced.

## Impact

- The local Functions export set contains only case registration and applied-warranty commands.
- The profile Callable wrapper test is removed; existing Rules tests continue to cover self-read, other-user denial, staff-write denial, and disabled-account business-data denial.
- No Firestore shape, Rules, stored data, or UI behavior changes.
- Remote inventory and deletion remain unverified and separately gated.

## Migration

No data migration is required. A deployed `getOwnProfile` function, if any, is not deleted by this repository change.

## Reconsider When

Reconsider only if a confirmed repository-external consumer needs a server-shaped self-profile API that cannot use the approved Firestore self-read boundary.
