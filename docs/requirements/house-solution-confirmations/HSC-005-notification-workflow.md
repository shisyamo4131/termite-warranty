# HSC-005: Notification Workflow and History

- Status: Partially answered
- Decision owner: House Solution

## Confirmed Context

Staff currently notify customers outside the system and store one current notification status per applied warranty. The initial release does not record notification time or operator history.

## Questions

1. Which notification methods and customer responses must be recorded?
2. Are repeated notifications, scheduled follow-ups, or response states required?
3. Must the system retain notification timestamp, operator, notes, and status history?

## Partial Resolution

- Decision: The construction-company portal is the accepted structured path for receiving a construction company's new-case or renewal response. This resolves the response-intake portion only.
- Remaining: Actual email delivery, repeated or scheduled notifications, reminders, delivery/result history, and any customer-facing response state remain unconfirmed. The prototype's queued outbox record must not be presented as a delivered email.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit approval in the current Codex task.

## Affected Documents

Alert requirements, workflow, applied-warranty data, UI, and tests.
