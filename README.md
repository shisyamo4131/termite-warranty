# termite-warranty

House Solution Co., Ltd.向け白蟻保証業務管理システムのプロトタイプです。

## Status

確認済み要件のうち、保証期限・アラート判定と検索文字列の正規化／N-Gram生成を依存パッケージなしのドメイン層として実装しています。Nuxt、Vuetify、Firebaseのパッケージ版、Firestoreデータ契約、デプロイ設定は未決です。

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

ローカルで確認済みのNode.jsがある環境で、次のコマンドを実行します。

```powershell
npm test
```

Governance validation: `./scripts/check-governance.ps1`.

Firebase Emulator Suiteを使う統合検証は、未決のパッケージ版とFirestoreデータ契約を確定した後に追加します。実Firebaseプロジェクト、Hosting、外部APIはローカル検証に使用しません。

## Security

Do not commit secrets, credentials, session data, private production records, or unredacted confidential samples.
