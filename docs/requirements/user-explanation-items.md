# User Explanation Items

- Status: Active
- Audience: House Solution staff who will operate or administer the system
- Purpose: Record confirmed behavior that must be explained during acceptance, training, or release preparation. This checklist does not replace the authoritative specification or decisions linked below.

## Update-conflict Behavior

### Master records use last-write-wins

- Applies to update, inactivation, and reactivation of the four managed masters: construction company, homeowner, property, and warranty service.
- The last trusted mutation that commits is retained. A save is not rejected only because another user changed the same master after the form was opened.
- A full-form save can overwrite fields changed by another user in the meantime. The system does not automatically merge fields or show a conflict-resolution screen.
- Permission checks, input validation, property-reference validation, atomic writes, server timestamps, and revision metadata remain server controlled.
- Authority: [ADR 0016](../decisions/0016-master-last-write-wins.md) and [master management requirements](master-management.md#master-update-concurrency).

### Cases and applied warranties reject a stale editing baseline

- A case edit dialog and an applied-warranty dialog retain the parent case's exact `updatedAt` value from when editing starts.
- Saving is rejected if any case-level change or applied-warranty add/update/inactivation has changed that parent case in the meantime. The user must review the latest data and retry.
- This applies even when the two users changed different case fields or different applied warranties under the same case. The current protection is case-wide; it does not merge independent edits.
- Applied-warranty mutations update the child record and the parent case timestamp atomically. Direct client writes to applied warranties remain prohibited.
- Authority: [prototype Firestore data contract](../design/prototype-firestore-data-contract.md#required-prototype-invariants) and [case warranties](case-warranties.md).

## Delivery Checklist

- Explain both behaviors together so users understand why master saves normally proceed while case-related saves may require reopening and retrying.
- Demonstrate two-user examples before production acceptance.
- If either conflict policy changes, update the authoritative requirement or ADR, this checklist, UI messages, and concurrency tests together.
