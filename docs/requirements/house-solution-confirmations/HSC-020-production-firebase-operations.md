# HSC-020: Production Firebase Environment and Operations

- Status: Open technical decision
- Decision owner: Project, with House Solution input

## Confirmed Context

Development and production use separate Firebase projects. The development project exists; production ownership, identifiers, regions, package promotion, deployment, monitoring, backup, and recovery are not confirmed.

## Questions

1. Who owns and administers the production Google Cloud/Firebase organization, billing, project, and credentials?
2. Which regions, deployment approvals, package versions, monitoring, alerting, backup, recovery, and support procedures apply?
3. Which House Solution availability, recovery-time, data-loss, and cost requirements constrain the technical design?

## Affected Documents

Environment requirements, operations, security, deployment workflow, recovery, and release evidence.
