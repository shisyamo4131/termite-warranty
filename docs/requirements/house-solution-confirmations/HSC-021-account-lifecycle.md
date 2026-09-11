# HSC-021: Account Creation, Deletion, and Recovery

- Status: Not yet asked
- Decision owner: House Solution, then project

## Confirmed Context

- Staff sign-in and current-profile loading are implemented, but account-management screens and account-mutation Functions for creation, editing, disabling, deletion, or restoration are not implemented.
- The provisional requirements say that a developer superuser manages House Solution administrators and a House Solution administrator manages general-staff accounts. Account creation sends a password-setup email, and disabling must make an account unusable immediately.
- A physical account-deletion rule and recovery behavior have not been confirmed or implemented.

## Questions

The role list and the role/function matrix, including who may invoke account-management functions, are decided in [HSC-024](HSC-024-role-business-data-access.md). This matter defines what those lifecycle operations mean and how they behave.

1. Does “delete” mean reversible disablement, recoverable soft deletion, or physical deletion from Firebase Authentication and Firestore?
2. If recovery is allowed, for how long and which identity, email, role, and history must be restored?
3. May a deleted account's email address or identifier be reused, and how should records formerly associated with that account be displayed?
4. What confirmation, reason entry, notification, and approval are required for disabling or deleting an account?
5. After the business rules are confirmed, how should partial Authentication/Firestore failures, retries, reconciliation, and administrator feedback work?

## Affected Documents

Account lifecycle requirements, roles, Functions, Firestore data contract, UI, security, operations, and tests.

## Resolution Record

No answer has been received. Record the approved answer and evidence here before promoting it to confirmed requirements.
