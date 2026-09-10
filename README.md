# termite-warranty

House Solution Co., Ltd.向け白蟻保証業務管理システムのプロトタイプです。

## Status

確認済み要件のうち、保証期限・アラート判定、N-Gram生成、およびFirebase Emulator Suite上で動くログイン・マスタ選択・案件登録・一覧／アラート表示の最小縦切りを実装しています。Firestoreデータ契約と依存版はローカルプロトタイプ限定であり、本番スキーマや実Firebaseプロジェクトは未決です。

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

Node.js 22とJava 21がある環境で、依存をlockfileどおりに導入します。

```powershell
npx --yes npm@11.19.1 ci
```

ターミナル1でEmulatorを起動し、ターミナル2で合成データを投入してアプリを起動します。

```powershell
npm run emulators:start
```

```powershell
npm run emulators:seed
npm run dev
```

ローカル画面の合成アカウントは `demo.admin@example.invalid` / `Demo-only-password-123` です。実データや実際の資格情報を入力しないでください。

この混合変更の完了ゲートは `npm test`、`npm run typecheck`、`npm run build`、`npm run test:rules`、Functions/seedの構文確認、`./scripts/check-governance.ps1` です。今後の変更では `governance/verification-policy.json` で影響クラスを選び、対象コマンドをそれぞれ単独で実行します。

Firebase CLIには架空の `demo-termite-warranty` だけを渡します。実Firebaseプロジェクト、Hosting、外部APIはローカル検証に使用しません。

## Security

Do not commit secrets, credentials, session data, private production records, or unredacted confidential samples.
