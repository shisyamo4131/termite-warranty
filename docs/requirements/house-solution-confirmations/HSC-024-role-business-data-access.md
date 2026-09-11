# HSC-024: Role Types and Functional Permissions

- Status: Not yet asked
- Decision owner: House Solution, then project

## Confirmed Context

- The application currently recognizes `developer superuser`, `House Solution administrator`, and `general staff` values for sign-in profiles, while the user-facing operational description groups accounts as “administrator” and “general”. The final role terminology and whether the developer superuser is a separate operational role require confirmation.
- Account-management screens and account-mutation Functions for creation, editing, disabling, deletion, or restoration are not implemented.
- The provisional requirements assign different account-management responsibilities to the two administrator roles, but all enabled authenticated staff currently have the same business-data CRUD access and no implemented role-specific business-function restriction.

## Questions

1. At initial release, are the operational roles only “administrator” and “general”, or is the developer superuser a separately managed role?
2. Is any role other than “general” required below the administrator level, such as view-only, branch-limited, case-entry-only, or approval roles?
3. For every adopted role, which functions may it view or use: case/master viewing, registration, editing, inactivation, cancellation, invalidation, export, account management, and system administration?
4. Are branch-level or record-level restrictions required?
5. After House Solution defines the role/function matrix, which restrictions require server/data-layer enforcement in addition to UI and button visibility?

Account deletion, restoration, identifier reuse, and failure-recovery semantics are decided separately in [HSC-021](HSC-021-account-lifecycle.md); this matter alone owns which roles may invoke those functions.

## Affected Documents

Roles, security rules, Functions, navigation, UI, operations, and authorization tests.

## Resolution Record

No answer has been received. Record the approved role list, function matrix, and evidence here before promoting them to confirmed requirements.
