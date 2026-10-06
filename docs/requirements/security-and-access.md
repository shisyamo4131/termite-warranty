# Security and Access Posture

## 2026-10-06 復旧時のメンテナンス運用

同日の実装開始指示により、LocalのRules／Functionsと画面に復旧アクセス制御を追加した。作業中は業務アクセスを停止、確認待ちは開発者・HS管理者のみ閲覧可能、旧DBは業務アクセスを拒否する。アカウント自己読取はログイン判定用に保持する。公開制御文書は接続状態のみで、権限保全・履歴は非公開。以下の「未実装」は質疑時点の記録であり、現状は[実装設計](../design/backup-recovery-implementation.md)・[操作手順](../runbooks/backup-recovery.md)で更新する。新規実IAM付与・Dev配備・実復元は未実施。Auth取込と実環境のアクセス検証は残る。

切替前のDBは通常の業務アクセスから切り離し、復旧確認・原因調査が終わるまで保存する（2026-10-06オーナー採用）。切替直後の削除は行わず、削除は別途判断する。具体的な保持期間・調査時アクセス・削除手順は未確定で、実DBのアクセス変更・削除は未実施。

開発側がメンテナンス開始、全体復元、検証、報告、解除を担当する。復元前に復旧時点と戻らない登録・更新の範囲をHSへ説明し、了承を得る。復元後のデータ確認・再開了承は別に得る。HSとの報告・確認のやり取り・了承はすべてシステム外で行い、システム内の了承ボタンは解除条件にしない。具体的な連絡手段・証拠の記録方法は未確定。

メンテナンスは復旧作業中／HS確認待ちに分ける。作業中はHS管理者にも案内のみを表示する。復元・技術検証・アカウント整合確認後にHS管理者の閲覧・CSV出力を開放する。登録・編集・削除等の業務更新と、CSVに伴う報告済み・請求済み等の状態更新は再開了承まで停止する。

業務データだけの破損では現在のログイン情報を維持し、Auth自体の破損・消失等で必要な場合だけ別途復元する。毎回のAuth巻戻しはしない。両ケースで開発側が復元DB内のアカウントとの対応・権限・停止状態を確認し、不整合が残る間は再開しない。過去DBのenabled・roleをそのまま現在のアクセス許可として使用してよいとは扱わず、補正と検証方法は別途設計する。

復旧操作は開発側のアプリ外専用コマンドに限定し、アプリ内には操作ボタンを設けない。状態・バックアップ履歴の確認画面は開発者とHS管理者のみ閲覧可能で、一般担当者・工務店には表示しない。復旧作業中のHS管理者は案内のみを維持する。取得メタデータの公開範囲も設計し、画面非表示だけで制御を満たしたとは扱わない。

根拠：2026-10-06のオーナー指示と推奨案の明示採用。[採用運用](../decisions/0032-production-firebase-operations.md#2026-10-06-recovery-operation-amendment)参照。通常時の既存role・所属・即時enabled判定は維持する。既存のUI中心の制限方針だけで業務停止を実現できるとは扱わない。一般担当者・工務店と既存セッションの停止、外部コマンドの認証・IAM・対象照合、技術的強制方法は未確定・未実装。Rules／Functions変更、権限・停止状態の実変更、新規IAM付与・実復元は行っていない。

## 2026-10-05 アカウント変更の競合抑止

既存のrole・所属・即時enabled判定を維持し、同一UIDのAuth/Firestore変更はサーバー専用accountMutationLocksで直列化する。私有操作記録はクライアントに公開しない。結果不明・補償失敗時は後続変更を止める。時間切れ解除なし。管理者による状態確認と旧処理停止確認、期待操作IDと復旧所有者の照合を伴う復旧を用意するが、実行には別承認が必要。新たな業務権限やIAMは付与しない。[運用](../operations.md)、[ADR 0036](../decisions/0036-account-mutation-serialization.md)。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 終了データ削除の権限（仕様書0.1.73）

保証終了物件のCSV保存確認後の手動削除はHS管理者に限定する。自動削除はしない。削除後の延長に伴うCSVからの復元は開発側の個別対応とし、HS向け復元機能は初期対象外。取消済みのCSVなし物理削除はHS未確認・保留。根拠：同日①②YES・③保留、HSC-001。以下の削除権限未確定という旧記録をこの範囲で置き換える。権限コード未変更。

## 2026-10-03 初期HSの操作範囲（仕様書0.1.72）

HS管理者・HS担当者とも全工務店の物件登録・編集・保証延長・取消・CSV出力を許可。利用者追加・停止およびシステム設定は管理者限定。閲覧専用等の追加役割は初期対象外。開発者用システム管理者は維持する。新規に方針が示された終了データ削除の操作権限は未確定でHSC-001に集約し、一般担当者へ自動的に許可しない。ポータル再開時の確認はHSC-013。根拠：同日①YES、HSC-024。仕様記録のみ、認証・Rules・Functions未変更。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

## Status

This is a provisional, explicitly risk-bearing posture for the initial delivery. It is not evidence that the production system has adequate authorization, data protection, or attack resistance.

## Confirmed Provisional Requirements

- House Solution staff accounts are required.
- The application roles are developer superuser, House Solution administrator, and general staff.
- Staff sign in with Firebase Authentication email/password using browser-session persistence. Closing the browser window clears the authentication state and requires login at the next access. No inactivity-time automatic logout is required in the initial release.
- The developer-owned developer superuser account can create, edit, and disable House Solution administrator accounts only; it does not manage general-staff accounts.
- A House Solution administrator can create, edit, and disable general-staff accounts through the system. A general-staff account's editable fields are email address, display name, and enabled/disabled state; its role is currently fixed to `general staff`. If additional roles are introduced later, a House Solution administrator may select only roles other than `House Solution administrator` and `developer superuser`.
- Account creation sends a password-setup email; email-address verification is not required initially, and staff can reset their passwords.
- Account email input removes surrounding whitespace, converts to lowercase, and uses only a minimal email regular-expression check before Firebase Authentication's own validation.
- Account removal means reversible disablement and re-enablement. The initial scope does not physically delete Authentication users or account documents. Disabled accounts retain and reserve their identity, role or company binding, and email address; no disable reason, separate approval, or lifecycle notification is required.
- Bootstrap the initial developer-superuser account manually in Firebase Console without custom claims. Create both its Firebase Authentication user and the matching enabled staff-account record; do not grant business-data access to an Authentication-only record.
- Disabling an account must make it unusable immediately, including for an already signed-in session.
- Cloud Functions for Firebase with Firebase Admin SDK performs Firebase Authentication user administration and enforces the account-management role boundary.
- Role-based feature restrictions are limited to controlling the UI and button visibility.
- The application does not provisionally restrict business-data CRUD operations in an API or domain layer by role. Every enabled authenticated account is intended to have the same business-data-operation access.
- For direct Cloud Firestore client access, require authentication and an enabled staff-account record for application collections/documents. This is the bounded control needed to enforce immediate disabled-account access revocation; do not add role- or record-level authorization.
- Introduction of controls intended to block malicious browser-external access is deferred.
- For staff-facing business collections, do not use Firestore Rules for document schemas, field allowlists, types, business invariants, lifecycle transitions, soft deletion, or supported-workflow enforcement. Authenticated Create, Update, or Delete requests made outside the supported application flow have no integrity guarantee in this prototype.
- Start with all enabled authenticated users having the same business-data CRUD access. Account management is the bounded, server-enforced role-specific exception. Tighten other access only as role-specific functional requirements are confirmed.
- Existing-system homeowner data is not required for migration testing. Any use of actual homeowner data in the developer-owned development environment for another separately approved purpose requires a confidentiality agreement. Do not commit it to source control or place it in documentation, test fixtures, or logs.
- Operation-history and audit-log records are not an initial-release requirement. This does not remove the existing registration and update timestamps or the account-disable controls.

## Construction-Company Proposal Prototype

Target workflow amendment (2026-10-01, ADR 0034): HS continues issuing company-bound accounts with no public self-sign-up. Company users will register/extend their own warranties without HS per-submission approval. The prototype work-item-only read/write and approval transaction descriptions below are historical implementation facts pending redesign. They do not authorize broad access to registered data. Current deployed permissions are unchanged; the new company-scoped registered-data path requires implementation and validation.

- Each construction company has at most one enabled shared Firebase Authentication account in the prototype. Self-sign-up is disabled.
- A House Solution administrator issues, disables, and re-enables the account. The construction company sets and resets its own password through Firebase Authentication email; House Solution does not handle the password.
- `constructionCompanyAccounts/{uid}` is the server-side source for the account's construction-company ID and enabled state. A client-submitted company ID is never an authorization source.
- A construction-company account can read only its own profile and its own bounded provisional work-item list. It cannot read staff pages, registered case/master collections, another company's work items, or the notification outbox.
- All work-item mutations use trusted Callables. Direct browser writes to account, work-item, registered-data, and notification-outbox collections are denied.
- A work item uses a revision check, permitted state transitions, and submission locking. Approval performs the corresponding registered-data writes and terminal work-item update in one transaction.
- Shared authentication establishes company-level attribution only. Each response stores a self-declared contact name and contact email for operational follow-up; it is not an independently authenticated individual identity.
- App Check, rate limits, password policy, multi-factor authentication, notification delivery controls, retention, and production incident procedures remain unconfirmed. This prototype does not claim production-grade external access security.

## Data Responsibility Boundary

- House Solution has operational authority and is the final decision-maker for business data, including purpose, approved access, correction, retention, and deletion. Routine access and correction use approved business permissions; output requires House Solution administrator approval.
- Homeowners are personal-information subjects, not database-record owners. Construction companies are responsible for the lawful acquisition context and submitted content while their portal submission is editable; once submitted, including while it is awaiting review and after registration, House Solution manages it operationally.
- Development and maintenance providers are processors under House Solution instruction. Independent use, third-party provision, unilateral bulk export, deletion, or taking copies is not permitted. Google/Firebase are planned cloud processing providers; House Solution production ownership and operation are resolved under HSC-020, while exact provider contract terms, subprocessors, and termination conditions remain unconfirmed under HSC-025.
- Retention periods and individual deletion remain subject to HSC-001, and detailed role permissions remain subject to HSC-024. This boundary does not itself authorize an export feature or change the provisional authentication-focused Rules posture.

## Homeowner Access Boundary

- The initial release has no homeowner-facing account, login, my page, warranty viewing or editing, document download, application, or response function. Homeowners are personal-information subjects rather than application accounts.
- Requests for disclosure, correction, restriction of use, or similar handling are received through House Solution instead of direct system access. Contact method and notification behavior remain open under HSC-005 and related matters.
- Future homeowner access would require a separate scope covering purpose, identity verification, permitted data/actions, sale or inheritance relationship changes, account recovery and expiry, unauthorized viewing, and support. Read-only access may be considered first; no future behavior is authorized by this boundary.

## Production Environment Boundary

- House Solution owns and contractually controls the production Firebase/Google Cloud project and billing. Initial provisioning may use a temporary House Solution-supplied account; after verification, House Solution changes its password, revokes sessions, and the temporary credentials are destroyed. Ongoing maintenance uses individual developer Google accounts with only necessary IAM permissions.
- Routine maintenance accounts do not receive project-deletion permission. House Solution-controlled deletion, suspension, or changes to project, IAM, billing, or resources are not guaranteed to be fully reversible by routine maintenance access.
- Production is separate from development. Environment-fixed deployment workflows use environment-specific authentication and verified artifacts; WIF is preferred subject to Firebase CLI deployment verification, with a restricted rotated key as fallback if required. HSC-020 resolves the monitoring, backup, and recovery targets, while detailed security/privacy requirements and provider contract terms remain under HSC-025.

## Consequences and Residual Risks

- Shared construction-company credentials reduce account-administration cost but prevent individual operator attribution and require password rotation when access within the company changes.

- UI visibility is not an authorization boundary. An authenticated user can use a browser's developer tools or a direct client request to attempt operations that the UI hides. Account-management Cloud Functions must independently reject a caller whose role is not permitted to manage the target account.
- With a Firestore rule equivalent to `request.auth != null`, every signed-in account permitted by that rule can read and write the matched data. It does not distinguish administrator from general staff, and it does not validate intended business operations.
- The provisional approach therefore exposes customer names and addresses to any authenticated account that can access the relevant data, and permits unintended modification or deletion if the rules allow it.
- Firebase documents state that Firestore client access is governed by Security Rules; authentication-only read/write access for all signed-in users is not recommended for an entire database. Server client libraries bypass Firestore Security Rules and require separate IAM control if they are later used.
- Firebase documentation states that disabled users and revoked refresh tokens can leave a previously issued ID token valid for up to its one-hour lifetime. To meet the immediate-disable requirement, the implemented server-side operation first marks the staff-account record disabled so Firestore denies subsequent access, then disables the Firebase Authentication user and revokes refresh tokens. The inverse enable flow enables Authentication first and exposes the enabled Firestore state only after that succeeds. These paths have Emulator regression coverage; development-environment and production operator-recovery verification remain outstanding.

## Unresolved-Matter Routing

Account-management screens are a confirmed role-specific function. The account-lifecycle controls needed for creation, password setup/reset, immediate disable, and browser-session persistence are a bounded, server-enforced exception to the UI-only posture. When another business-data role-specific functional restriction is confirmed, decide its enforcement method and update this posture. No general access-control hardening milestone is currently committed before production release. This does not remove the stated residual risks or make UI visibility an authorization boundary.

HSC-021 account lifecycle is resolved. See [HSC-024 role types and functional permissions](house-solution-confirmations/HSC-024-role-business-data-access.md) for remaining role questions in the central unresolved-matter register.

## Technical References

- [Firebase: Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firebase: Fix insecure rules](https://firebase.google.com/docs/firestore/security/insecure-rules)
- [Firebase: Secure data in Cloud Firestore](https://firebase.google.com/docs/firestore/security/overview)
- [Firebase: Manage Users](https://firebase.google.com/docs/auth/admin/manage-users)
- [Firebase: Manage User Sessions](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Firebase: Authentication State Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
