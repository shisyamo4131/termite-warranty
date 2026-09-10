# Project Coordination Runbook

Every task reads `AGENTS.md`, `governance/project-rules.md` and routed repository authorities before project work. Manual creation and recovery after the old task becomes unavailable use the same startup, without an old task ID or old-owner cooperation.

On a user replacement request: (1) update existing authoritative project facts and next work, commit relevant changes in sensible groups and leave the primary repository clean; (2) create a fresh non-fork task in that primary project with the same base name and next sequence number from the current task or user instruction. Do not create per-edit/task-action commits or an empty replacement commit. No handshake or replacement state/history/cache/validator is required.

## Evidence-bound Identifier Gate

Before presenting a material identifier as confirmed in a delegation or using it for state change, obtain its package name, version, digest or integrity value, repository path, branch, commit, tag, environment, project or database ID, deploy target, or data target from the task-routed authoritative source or actual target in the current turn. Record the exact source, location or command, and value. A prompt, summary, memory, or agent report is a lead, not confirmation. Read-only discovery may investigate an explicitly unconfirmed value.

The coordinator verifies these values before putting them in a delegation as confirmed. The delegated task verifies them again against the actual target before any file write, Git mutation, test, install, network call, or other state change. Stop and callback on missing, stale, ambiguous, or contradictory metadata without creating an owned application diff. For published artifacts, compare the available source or tag manifest, release or registry evidence, and consumer manifest or lock name, version, resolved location, and integrity. If network is unapproved, leave remote verification explicitly unverified.

## Session Capacity Routing

Treat each of these user instructions as the same task-capacity request and route here before answering:

- `容量チェック`
- `タスク容量確認`
- `セッション容量確認`
- `session size / handoff threshold確認`

These phrases refer to the persisted Codex task/session JSONL size, not the model token count or context window.

## Required Measurement

Identify the current Codex task ID from trusted task metadata. Never select the newest or most recently modified session file when parallel tasks may exist.

On Windows, run the project-local script with the current task ID:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-codex-session-size.ps1 -SessionId <current-task-id>
```

Record the command result and its independently observed exit status. The script must resolve exactly one session file for the supplied ID.

## Standard Report

Report all of the following without reading or displaying the session body:

- target task ID;
- resolved session file;
- session size in MiB;
- handoff threshold in MiB;
- usage percentage;
- `handoff_required`;
- Codex-wide reference size and 10 GiB warning threshold;
- total-scan completeness and error count;
- session measurement time and Codex-total measurement time/source;
- command result and independently observed exit status.

Propose task handoff only when `handoff_required` is `true`, which means the identified session reached the default 300 MiB threshold or a separately approved project threshold. When it is `false`, do not recommend task replacement based on age, token/context estimates, or guesswork.

## Stop and Error Contract

- If the current task ID cannot be established, stop and request the ID; do not guess.
- If the ID resolves to zero or multiple session files, report the count and nonzero exit status, then stop.
- If the script fails, report a concise error and its nonzero exit status, then stop without a handoff conclusion.
- If `codex_scan_complete` is `false`, report `codex_scan_error_count`; the session measurement may be reported, but do not claim the Codex-wide total is complete or use it for a cleanup or threshold decision.
- Never output session contents, prompts, credentials, secrets, or business data. Do not query or modify Codex-owned SQLite or WAL files as part of this check.
