# termite-warranty

Purpose and users are not yet confirmed. This repository currently contains the initial project governance scaffold.

## Status

Initial governance established; requirements and implementation are not yet confirmed.

## Documentation

- `AGENTS.md`: generated common-governance entry point; do not edit directly
- `governance/project-rules.md`: project-owned instructions and approval boundaries
- `governance/common-governance.md`: managed shared contract snapshot
- `governance/governance.lock.toml`: managed version and integrity hashes
- `docs/README.md`: task-oriented documentation navigation
- `docs/specification.md`: current confirmed specification
- `docs/decisions/`: material decisions and rationale
- `CHANGELOG.md`: visible changes
- `docs/operations.md`: operating and recovery guidance
- `INITIAL_PROMPT.md`: first prompt for a future Codex task
- `.codex/config.toml`: project multi-agent settings
- `.codex/agents/`: project-scoped specialist agents

Start with `AGENTS.md`, then use `docs/README.md` to select the documents required for the current task.

## Development

No application setup or runtime command has been verified. Governance validation: `./scripts/check-governance.ps1`.

## Security

Do not commit secrets, credentials, session data, private production records, or unredacted confidential samples.
