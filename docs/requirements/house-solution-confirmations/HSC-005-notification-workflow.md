# HSC-005: Notification Workflow and History

- Status: Partially answered
- Decision owner: House Solution

## Confirmed Context

Staff currently notify customers outside the system and store one current notification status per applied warranty. The initial release does not record notification time or operator history.

## Project Recommendation for Discussion — Not House Solution-Confirmed

- Deprecate and replace manually edited applied-warranty `not notified`, `notified`, and `not required` as the renewal business state. Make the construction-company portal renewal work item authoritative and derive a renamed renewal-handling status automatically; do not expose a manual renewal-status selector.
- Keep the staff business trigger as a deliberate `更改確認を依頼` action for an alert or candidate warranty. The action creates or publishes the portal renewal work item and queues an ancillary email notification. Email is informational, not the requested business action and not proof of response or completion.
- Recommend these renewal statuses per target applied warranty: `unrequested`; `awaiting company response`; `company draft`; `awaiting HS review`; `needs correction`; `renewed/registered`; and `renewal declined`. Map them to existing work-item status and decision values where applicable, but do not claim that the current implementation already supports this per-warranty model.
- Because a case may have multiple applied warranties, link each renewal request to its target applied warranty and derive case-list summaries from child states. This is a functional and data-model proposal; the currently confirmed one-current-work-item-per-case behavior remains in force until House Solution approves a change.
- Separate technical email-delivery state from renewal business status. If a provider is later connected, delivery state may be `queued`, `sent`, or `failed`; the current queue must not be described as delivered.
- Keep `withdrawn` for unapproved new-case portal applications, not renewal. Before House Solution registration, company withdrawal is terminal and non-editable/non-reopenable, creates no registered case or case number, and should be hidden from the default active list while remaining available through a withdrawn/history filter; UI details are deferred. After registration, reversal uses registered-case `cancelled`, not portal withdrawal.
- Preserve the existing revision/state checks as the arbiter of concurrent approval and withdrawal. This recommendation does not change those checks.

## Questions

1. Does House Solution accept or revise the proposed per-applied-warranty renewal statuses, authoritative portal work item, and removal of manual renewal-status editing?
2. Does House Solution accept or revise the `更改確認を依頼` trigger, target-warranty linkage, case-summary derivation, and the constraint that one current work item per case remains until a change is approved?
3. Which notification methods, delivery states, repeated notifications, scheduled follow-ups, customer responses, timestamps, operators, notes, and status history must be recorded?
4. Does House Solution accept or revise the proposed separation of email-delivery state from renewal business state, and the treatment of withdrawn unregistered new-case applications versus registered-case cancellation?

## Partial Resolution

- Decision: The construction-company portal is the accepted structured path for receiving a construction company's new-case or renewal response. This resolves the response-intake portion only.
- Remaining: The proposed per-warranty renewal-handling model, actual email delivery, repeated or scheduled notifications, reminders, delivery/result history, and any customer-facing response state remain unconfirmed. The prototype's queued outbox record must not be presented as a delivered email.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit approval in the current Codex task.

## Affected Documents

Alert requirements, workflow, applied-warranty data, UI, and tests.
