# termite-warranty Project Rules

## 明示起動のDev配備（2026-10-16採用）

[ADR0048](../docs/decisions/0048-explicit-lightweight-development-deployment.md)と[配備手順](../docs/runbooks/application-deployment.md)を適用する。dev/mainのPR保護、developmentのdev限定、Prodの既存保護を維持する。dev上のcontrollerから同一repositoryの確認済み未統合commitへ明示配備する実効範囲は承認済み。Localの必要gateと有効証拠再利用を維持し、証拠取り込み専用の固定全試験/JSONコメント/CI再実行を要求しない。通常Devの全ZIP/全Hosting hash比較を外す。実装・検証承認とmain統合/実配備承認を区別する。HS試行期間だけで待機せず、Devデータ保持・保護設定保留は維持する。

- Status: Active
- Owner: Project
- Project-owned governance: `governance/common-governance.md`
- Rule: This file may add project-specific requirements but must not weaken the common governance contract.

## Project and Current Scope

The project is for House Solution Co., Ltd. and its termite-warranty operations. Confirmed requirements and approved implementation scope are recorded in `docs/specification.md` and `docs/requirements/`; current delivery status and remaining work are recorded in `docs/roadmaps/`, with implemented operations and verification evidence in `docs/operations.md`. Follow those task-routed authorities instead of treating an earlier discovery phase as the current state. Additional implementation scope still requires explicit approval.

## Required Reading and Sources of Truth

Start with `governance/README.md` and `docs/README.md`, then read only the documents routed for the task. `docs/specification.md` is the current authoritative requirement summary; `docs/requirements/` holds the supporting, topic-specific requirement records. Operations and verification rules live in `docs/operations.md`; durable decisions live in `docs/decisions/`.

Approved implementation remediation is tracked in `docs/roadmaps/technical-remediation.md`. Record confirmed defects and approved structural work there with their current implementation evidence, target state, completion contract, and validation. Do not use the remediation backlog as a substitute for confirmed product requirements or the unresolved-matter register.

## Unresolved-Matter Register

- `docs/requirements/house-solution-confirmations.md` is the sole index of current unresolved matters. Its historical name is retained, but it covers both matters requiring confirmation by House Solution and project technical decisions.
- Store each matter in one Markdown file under `docs/requirements/house-solution-confirmations/`; do not place the full discussion in the index or combine unrelated matters in one file.
- Concurrent writes to the register are prohibited. Before changing the index or a matter file, inspect both register paths for existing worktree changes; if another work item has changed either path, remain read-only until that work is integrated. Do not assign register writes to parallel tasks.
- Give each matter the next unused stable sequential ID after confirming that the register has no other in-progress changes. Within the register index and `docs/requirements/house-solution-confirmations/`, a task that creates or updates a matter may change only that matter's file and its corresponding index row and must preserve every other entry. Normal approved changes outside the register follow their own document and verification rules.
- Record confirmed context, exact questions, status, decision owner, and affected documents. Add the reason or answer-specific effects when they are material and known. Keep facts, proposals, and unanswered questions visibly separate.
- An answer recorded in the register does not become a confirmed requirement by itself. Promote it to `docs/specification.md`, the affected topic records, data contracts, decisions, operations, or implementation only after explicit confirmation and the normal approval process.
- When a matter is resolved, keep its file and add a resolution record containing the approved decision, decision maker, decision date, evidence, affected authoritative documents, and the revision or commit that reflects the decision when available. Move its index row from unresolved to resolved; do not delete or reuse its ID.
- Evidence may cite a user instruction in a Codex chat, meeting minutes, email, ticket, or another reviewable source. For chat evidence, persist a concise decision summary and the message date plus task/thread or share identifier when available; do not depend on chat history remaining retrievable, and do not copy secrets or unrelated personal information.
- Confirmed product behavior belongs in `docs/specification.md` and its supporting topic record. Use an ADR when the resolution is a durable architectural or operational decision with rationale and tradeoffs. The unresolved-matter file remains the decision-evidence and promotion record, not the sole source of the resulting requirement.
- When the user asks to present or review unresolved matters, start from this index and open its linked matter files. Filter by decision owner only when the user asks specifically for House Solution confirmations or technical decisions. Do not rely on chat history or topic-document `Open Decisions` sections as a separate list.

## Product and Domain Boundaries

The product boundary is an independent business-management system for a new termite-warranty service, not a replacement for the current FileMaker service. The current service and its member page are reference context only; their data and accounts will not be migrated into the new system. System ownership, data ownership, detailed access model, and external-service boundaries remain unconfirmed. Do not infer them from the repository name or technology candidates.

## List Query and Subscription Boundaries

- Owner-approved exception (2026-10-08): the shared reference Store may subscribe to all warranty-group, construction-company, and branch master documents, including disabled ones, for HS users. Autocomplete filters those candidates locally with its standard filter; no N-Gram or 20-result cap is required for this reference use. This exception does not change ordinary business-list limits. Portal retrieval must remain server-authorized within its company/branch scope; logout, identity/scope change, and recovery boundaries must release listeners and cached references. Initial strategy is all-state subscription (option 2); operation metrics may justify a later change to enabled subscriptions plus on-demand disabled caching (option 1). See `docs/design/reference-store-metrics.md`. This approval does not extend direct-read permissions.

- When a list has no search or filter value, subscribe to at most the 20 documents with the freshest server-maintained update timestamp, in descending order, using document ID as a stable tie-breaker.
- Do not implement an unfiltered list by subscribing to an entire business collection or by creating one child listener per parent record. A record type without a reliable server-maintained freshness field must gain one before this default can be implemented.
- Property/warranty list search is exact full warranty number only, as approved on 2026-10-06. Query that equality in Firestore and preserve account scope; unfiltered reads remain bounded to the freshest 20. Other search axes require business specification before adoption. For other approved prototype lists, the filtered complete-read exception remains as recorded in the specification; do not extend it to the property/warranty list or unfiltered lists.
- Case-list month semantics are not confirmed by this rule. Route the choice of application month, handover month, applied-warranty expiry month, default month, and result-limit interaction through HSC-032.

## Project-specific Roles and Workstreams

Use the standard five agents generated by the scaffold. Do not add optional agents until project risk establishes a need.

## User-authored UI Component Collaboration

- The user-authored JavaScript UI component workflow is an adopted project practice. Use it when the user chooses to express detailed appearance or interaction through a working component instead of prose.
- Route every such component through `docs/runbooks/custom-ui-component-collaboration.md` and a tracked contract under `docs/design/ui-component-contracts/`. The tracked contract, not the ignored workbench copy, is authoritative.
- The user owns component and note files under the ignored `/.user-ui-workbench/`. Agents must preserve that ownership boundary, provide a Japanese convenience contract and fictional fixtures when needed, and use the isolated preview without coupling it to Firebase or tracked application code.
- Integration begins only after the user identifies the component as ready and the coordinator completes a contract review. The coordinator reports either acceptance or requested changes, then adapts the accepted design into tracked code, converts it to TypeScript when useful, and runs the verification gates selected for the actual integration impact.
- The workbench remains disposable and must never become a tracked dependency, source of truth, production-data location, or substitute for application verification.

## Recovery Maintenance Boundary

The owner-approved recovery maintenance mode is a bounded operational access exception to the normal staff authentication/enabled-only Rules posture. Enforce recovery-in-progress business access denial, verification-phase developer/HS-administrator read-only access, retired-database denial, and server-owned runtime/backup metadata boundaries. Keep ordinary business schema/invariants in application/server commands. Recovery operations are developer-operated external commands; HS approvals and communication stay outside the system. Follow `docs/design/backup-recovery-implementation.md`; no production configuration or destructive database cleanup is implied.

## Owner-reported Incident Entry

The owner explicitly instructed on 2026-10-06 that reporting an actual incident in this project must start developer-operated maintenance/recovery, rather than another discussion of whether to prepare it. Route such a report immediately to the incident section at the start of `docs/runbooks/backup-recovery.md`, verify the configured target from repository authorities and the actual cloud state, and execute the reviewed maintenance entry without asking again whether to stop. This standing instruction currently covers the configured Dev business `(default)` and its separate control database only; Prod is not configured or authorized by this rule. A discussion, hypothetical example, or readiness test is not an incident report.

Persist and follow the existing A–D checkpoints: close new updates and HS business access, confirm drain, preserve current authorization/numbering, obtain the external recovery-point approval, restore/verify a new temporary DB, fully reconcile `(default)`, expose HS read-only verification only after technical gates, and reopen only after separate external HS consent. Missing recovery-point consent, identity/state conflict, unavailable credentials/control, incompatible data, or uncertain prior execution is a concrete blocking condition to report with the next required action. Do not infer consent to Auth repair, IAM changes, database/evidence deletion, or unbounded data changes from an incident report. Preserve unknown operation results; never repeat restore submissions or release maintenance blindly. The readiness implementation is not permission to stop the current healthy Dev for a rehearsal.

## Shared UI Design Rules

- Existing and future screens must follow the approved alert and input layout rules in `docs/design/clear-sky-theme.md`. Read that document before adding or changing input or alert components.
- Keep alert defaults in `nuxt.config.ts` and alert typography in `app/assets/clear-sky-theme.css`; do not reproduce or override them per screen. All alert types use tonal backgrounds, compact density, 20px icons and 0.875rem body/title text. Information uses info, attention/warning uses warning, failures use error and completion uses success. Preserve semantic message types.
- Use 16px contextual top/bottom spacing around alerts; use the shared 12px icon-to-text gap. Do not add per-screen colours, font sizes or decorative borders. A design exception requires an explicit approved change to the authoritative design rules.
- Do not use `hide-details="auto"` or its bound equivalent on Vuetify inputs. Reserve the message region even when empty; existing selection-only checkboxes that always hide details may remain. Do not clip long validation messages to force a fixed height.
- Verify new/changed screens against the shared defaults and design rules through the applicable project verification gates.

## Project-specific Approval and Safety Boundaries

### Gmail・Googleドライブの参照先

- 2026-10-10のオーナー指示により、本プロジェクトでGmail・Googleドライブを参照する際は、事業用の「AIR」を対象とする。
- 参照開始時・再接続時に、利用ツールの接続アカウントと対象がAIRであることを確認する。AIRを確認できない場合は別アカウントで代用せず、参照を止めて接続先の確認を求める。
- この参照先指定はメール送信や外部資料の変更の承認を含まない。外部書込み等には下記の承認境界を適用する。

Customer and home-related information is expected to be handled, but its exact fields, classification, retention, and legal obligations are unconfirmed. Keep secrets and private records out of the repository.

### 公開Web参照の承認範囲

- 2026-10-10、オーナーがGOVERNANCE-MANAGER（タスク `01a1015f-0477-7ad3-8b3c-ef77242b4dcf`）で採用した方針により、本プロジェクトの作業に必要な公開Web検索・閲覧・公式資料取得を恒常承認する。この範囲では都度の確認を求めない。共通契約の「別途承認済み」に当たり、ツール・実行環境の制限を解除するものではない。
- 検索語・URL・送信内容へ秘密情報、顧客・物件情報や非公開資料を含めない。認証付きの非公開情報へのアクセスはこの公開参照承認に含めず、既存の承認範囲を確認する。Gmail・Googleドライブの参照では、上記AIR接続先も確認する。HTTP GETでも削除・状態変更等の効果がある操作は閲覧扱いにしない。
- メール送信・投稿・外部資料編集・購入・配備・権限変更・破壊的操作等は、その操作と対象を含む明示承認が必要。既に承認された対象・範囲を重ねて質問せず、範囲外・対象不明・承認不足の操作だけを止める。その他のネットワーク利用は別途承認を要する。

## Project-specific Implementation and Verification

### Local受入れ用データの恒常承認

2026-10-13のオーナー指示により、Local環境のデータは試験用データとして扱い、Local受入れに必要な作成・変更・削除を都度承認なしで実行する。この指示は従前の「Localデータ変更に個別承認が必要」という扱いに優先する。

- 対象は確認済みのループバック上の本プロジェクトのEmulator。受入れ用の物件・関連履歴・マスタ・設定・採番・Local Authアカウント、検索用項目と準備情報の整備・後片付けを含む。必要な架空データがないことだけで受入れを止めて再承認を求めない。準備情報は対応するデータ整備・整合確認と一体で更新し、印だけを書いて移行・復元制限を回避しない。
- 試験目的に必要な範囲で行い、他担当の進行中の確認と競合する操作は調整する。受入れ用に残すデータと一時データの後片付けを結果に記録する。Localの試験データ操作だけを理由とした全データ退避・復元・元の採番への巻戻しは不要。明示された保持対象は維持する。
- Dev・Prod・他プロジェクト・外部サービスのデータや送信、環境・権限の変更には拡張しない。接続先が不明・矛盾する場合は確認してから操作する。自動試験は常用Localと分離した試験プロファイルを使用する。

### 検証データ・採番変更を実運用へ残さない

2026-10-10のオーナー指示により、次を検証の準備・実施・完了条件とする。実運用に使うデータを取り込んだDevも対象に含む。Local試験データの承認・保全範囲は上記「Local受入れ用データの恒常承認」を優先する。

- 更新・採番を伴う検証は、原則としてLocal／エミュレーター等の隔離した検証環境と架空データで行う。実運用データや共用の採番管理を、検証の都合で消費・変更しない。
- 実データのあるDev等で更新検証が必要な場合は、開始前に対象環境、検証専用レコードの識別方法、関連記録、検証前の実データ・採番値、終了後の削除／復元方法、競合時の停止条件を確定する。外部書込み・物理削除・採番復元について既存の承認が対象と範囲を満たすことも確認する。安全に後片付けできない検証は開始せず、隔離環境で代替する。この規則自体は実データの削除や無制限の番号巻戻しを許可しない。
- 検証終了時は、検証専用物件だけでなく、それに由来する操作記録・番号予約・外部キー予約・関連データ・業務設定変更も確認し、承認範囲内で除去／復元する。「取消済み」「無効」「非表示」にしただけで、検証データや検証による番号消費を実運用へ残して完了としない。検証の証跡は機密値を含めず運用記録へ残し、業務データに代用させない。
- 採番の復元前に、検証後の実業務登録・同時更新・番号の外部利用・他レコードからの参照がないことを確認する。検証だけが原因の変更と証明できる範囲に限って、関連記録の削除と採番復元を一括確定する等、競合を防ぐ。実業務の番号を再利用したり、最新の採番値を検証前の値で無条件に上書きしたりしない。不明・競合があれば復元を止め、残存影響と必要な判断を報告する。
- 検証用レコード・番号・予約を、原資料、正式な取込み入力、初期値、再取込み計画へ混入させない。同じ確定原資料の再取込みでは、検証前に確認した採番開始値になることを計画の再生成で検証する。原資料や実業務記録が変わった場合は、その正しい番号を優先して再照合し、過去の開始値を強制しない。
- 完了報告前に、検証対象と関連記録の残存なし、実データの不変または承認された復元、採番の次番号、再取込み時の開始値を読取りで再確認し、方法・結果・残件を既存の運用記録へ保存する。再確認のために実番号をもう一度消費しない。後片付けと照合が終わるまで検証全体を完了扱いにしない。

The approved prototype stack is a Nuxt SPA with Vuetify, Firebase Hosting, Firestore with application-maintained N-Gram search indexes, Firebase Authentication email/password sign-in using browser-session persistence, and Cloud Functions for Firebase for Firebase Admin SDK account management. Exact local-prototype dependency versions are authoritative in `package.json` and `package-lock.json`; do not infer real Firebase project IDs, deployment configuration, production dependency promotion, or production database selection from them. Local acceptance uses the fictional `demo-termite-warranty` identifier; automated verification uses `demo-termite-warranty-test` with the isolated loopback profile in `functions/test-emulator-profile.js`. Both require emulators; neither authorizes cloud access. Firestore access has one bounded authorization exception: the signed-in account must be enabled, so immediate account disable is enforceable. PostgreSQL may replace Firestore only through a recorded architecture decision and an updated schema/migration assessment. The dependency-free domain slice is verified with `npm test`; additional runtime and integration commands become confirmed only after successful local execution and policy registration. Use the project-owned policy as the machine-readable source; classify impact before work. Governance scaffolding, migration, local contract/tool changes, effective permission/agent-policy, and release/deploy work require comprehensive validation. Owner-approved reference-target clarification alone follows `project-guidance-metadata` in the policy when capability, approval/safety boundaries, executable configuration, and verification behavior are unchanged; mixed or uncertain impact keeps the broader gates. Record each selected command and exit status independently; never use status-masking command chains as completion evidence.

For staff-facing business collections, Firestore Rules are limited to authentication and the live enabled-account check. Do not use Rules to enforce document schemas, field allowlists, types, business invariants, lifecycle transitions, soft deletion, or application workflow. The prototype explicitly does not guarantee integrity for authenticated Create, Update, or Delete requests made outside the supported application flow. Keep schema and business validation in the application or a trusted server command where that command is required by the supported workflow. Account records, construction-company ownership boundaries, notification outbox records, account bindings, and server-owned numbering state may remain denied or scoped in Rules because they are authentication/identity or server-authority boundaries rather than staff business-schema validation.

## Project-specific Progress and Reporting

The 2026 initial-delivery effort is multi-phase. Track it in `docs/roadmaps/2026-initial-delivery.md`; report progress only from verified milestone evidence, never elapsed time. The default coordinator handoff threshold is 300 MiB per session.

## Project-specific Task Lifecycle

Use the primary repository directory configured by the user. A separate worktree requires prior explicit approval. Start every task by reading `AGENTS.md`, this file, and routed authorities. Prefer event-driven callbacks for delegated checkpoints; report unresolved approvals and unverified facts explicitly.
