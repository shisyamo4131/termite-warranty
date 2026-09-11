# HSC-016: Cutover, Parallel Operation, and Rollback

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Existing-system data will not be migrated into the new system. Temporary parallel operation remains the initial safety direction, but its purpose, duration, authority boundary, and rollback procedure must be reconsidered without a final data migration.

## Questions

1. Is temporary parallel operation still required when the new system starts without legacy data, and if so, how long will it continue?
2. On what date do new registrations move to the new system, and which system is authoritative for records created during any parallel period?
3. Who approves cutover or rollback, using which criteria, and how are records entered in the new system handled after a rollback?

## Affected Documents

Cutover runbook, system-of-record boundary, rollback, support, and acceptance criteria.
