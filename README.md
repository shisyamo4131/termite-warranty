# termite-warranty

House Solution Co., Ltd.向け白蟻保証業務管理システムです。納品後の運用・保守状況は[文書索引](docs/README.md)を参照してください。

## Status

確認済み要件のうち、保証期限・アラート判定、N-Gram生成、およびFirebase Emulator Suite上で動くログイン、ダッシュボードとNavigation Drawer、住所・連絡先を含む工務店など4種類のマスタ管理、ボタン起点のマスタ／案件登録・編集ダイアログ、案件登録中のマスタ追加、必須の申込日・引渡日、物件から自動選択後に編集できる案件の施主・工務店、案件検索、一覧／アラート表示、Vuetify日付選択の縦切りを実装しています。物件の施主・工務店を変更しても既存案件の参照は変更されません。マスタの削除は物理削除ではなく無効化し、取消・無効にした案件は編集できません。データ契約と依存版はリポジトリの現行定義を使用し、開発環境は `termite-warranty-dev`、本番環境は `termite-warranty-prod` です。現行の納品・運用状況は[文書索引](docs/README.md)を参照してください。

## Documentation

開発環境は `termite-warranty-dev`、ローカル検証は架空の `demo-termite-warranty` を使用します。本番環境は `termite-warranty-prod` です。現行の納品・運用状況は[文書索引](docs/README.md)を参照してください。

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

この導入はrootのlockに加え、postinstallで独立した`functions/package-lock.json`からFunctions依存も導入します。FunctionsのLocal実行とCloud配備には同じFunctions用lockを使用します。rootのworkspaceへ戻したり、lockを削除して導入しないでください。[依存固定の方針](docs/decisions/0052-functions-dependency-lock.md)。

ターミナル1でEmulatorを起動し、ターミナル2で合成データを投入してアプリを起動します。

```powershell
npm run emulators:start
```

```powershell
npm run emulators:seed
npm run dev
```

ローカル画面の合成アカウントは `demo.admin@example.invalid` / `Demo-only-password-123` です。実データや実際の資格情報を入力しないでください。

変更時は `governance/verification-policy.json` で影響クラスと必須ゲートを選び、[証拠の有効性](docs/operations.md#evidence-validity-and-retry)に従って今回実行・有効証拠再利用・未充足を区別します。新たに実行する各コマンドの終了コードは個別に確認します。

ローカル検証のFirebase CLIには架空の `demo-termite-warranty` だけを渡します。通常Dev／Prod配備は[直接配備手順](docs/runbooks/application-deployment.md)を使用します（[切替状況](docs/roadmaps/technical-remediation.md)）。環境とアカウントを明示し、ローカル検証と分離します。コード統合にもPRを使わず通常pushし、通常配備は手元から実行します。

## Security

Do not commit secrets, credentials, session data, private production records, or unredacted confidential samples.
