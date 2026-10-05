# Initial Data Model

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 所有者履歴の要求（仕様書0.1.81）

物件に現在の所有者情報を保持し、変更前の所有者情報と変更日を履歴として残す。所有者変更で恒久保証番号・期間は変更しない。所属誤登録の取消・再登録では元の正しい申込日・引渡日を保持し新番号を発行する。履歴の保存形式・復元CSV・移行設計は後続で、既存DBが対応済みという意味ではない。根拠：同日①②、HSC-029。

## 2026-10-03 確定：所属変更後も既存保証を維持

工務店の所属保証グループを変更しても、既存保証は旧グループ・旧保証番号を保持する。新たに本登録する保証だけが新グループを使用し、支店も所属工務店に従う。例えばHSCからSHSへ移った会社でも、既存HSC保証の延長でSHSへ変更・再採番しない。現在の会社所属と発行済み保証の所属は別に保持する。

根拠：2026-10-03本Codex会話の具体例へのYES。仕様書0.1.68、HSC-037。今回の階層内統一は新規登録時の適用ルールであり、既存保証の一括変更を意味しない。親子管理画面・支店上書き廃止・会社／支店無効化の実装へ進む。配備・実データ移行は別途。



## 2026-10-03 確定：保証グループ → 工務店 → 支店

保証グループはHSの営業先を捉える単位で、HSの商品である保証の種類に対応し、所属工務店を包括する。現在3種類、将来追加可能。フランチャイズの親という説明は理解のための比喩であり、法的なフランチャイズ契約を意味すると推定しない。工務店は特定の保証グループに従属し、支店は工務店に従属する。別の「工務店グループ」という分類・マスタは設けない。

新規保証に使う接頭辞は所属保証グループのものを全工務店・全支店で共通使用する。支店独自のグループ上書き・接頭辞設定は不要で、従来の「支店優先／会社標準」を廃止する。既決のグループ別・年度別採番、将来のグループ追加、保証番号の恒久性は、この回答だけで変更しない。

管理画面もこの親子関係に沿って改修する要求を受領。変更案は、保証グループを起点に所属工務店を管理し、工務店から所属支店を管理する構成。工務店の項目名は「標準保証グループ」ではなく「所属保証グループ」、支店には継承元を表示し上書き選択を設けない。別分類としての工務店グループ画面は作らない。細かな画面配置は実装設計事項。

根拠：2026-10-03本Codex会話のオーナーによる定義訂正と画面改修希望。仕様書0.1.67、HSC-037/038。以前の「会社の所属変更後も既存保証は旧グループ／恒久番号を維持」と、今回のグループ内統一の適用範囲を確認する。所属変更の禁止・既存保証の一括移動・番号振り直しは推定で実施しない。旧支店上書きデータの照合・移行とロールバック設計は後続。今回仕様・画面変更案のみで、アプリ・データ契約・配備・実データは変更しない。



> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

## Status

This is a provisional business-record model for requirements discovery. It is not a database schema, data contract, migration mapping, or implemented collection design.

## Confirmed Warranty Relationship (2026-09-29)

2026-10-01 group-lifecycle decision: the company's current group assignment and each warranty's assigned group are distinct business values. Changing the former affects new registrations only, not existing warranties or their renewals. Do not dynamically derive an existing warranty's group from the current company assignment. This defines target business meaning, not collection paths or migration execution.

For properties under warranty management: one property to one individual warranty, one individual warranty to its initial and renewal periods. The warranty keeps a permanent number across renewal and references a product and warranty group. The group selects a certificate form and supports property extraction. Product/group definitions are distinct from issued warranty identity. See [ADR 0033](../decisions/0033-permanent-property-warranty.md).

| Target business entity | Confirmed meaning |
| --- | --- |
| Individual warranty | The property's single continuing warranty; permanent warranty number, property reference, product reference, group and current coverage |
| Warranty period history | Initial and renewed coverage periods belonging to that same warranty; prior periods are retained on renewal |
| Warranty group | Certificate-form grouping used to extract related properties; detailed membership/template/change rules remain open |

These are business entities, not approved Firestore paths or a migration mapping. Insurance is not included in the one-to-one or permanent-number decision. The following pre-existing entities describe the prototype; the `Applied warranty` entity no longer represents the target warranty identity model.

## Existing Prototype Entities and Minimum Fields

ADR 0034 (2026-10-01) replaces review-gated registration with company new registration/extension without HS approval. Work-item approval states and relationships below are unchanged prototype facts, not the new target. Pending items need explicit migration mapping; do not automatically register them. New guarantee numbers use assigned group and application-date year; ordinary reassignment preserves existing warranties as specified above; effective-date/correction exceptions remain open.

HS branch exclusion (2026-10-01, HSC-033): the target no longer requires an HS branch entity or case responsible-branch reference. Branch fields and editing rules below describe the prototype only. Preserve existing records until compatibility/migration is designed. Do not map these records directly to construction-company branches (HSC-038).

| Entity | Minimum fields |
| --- | --- |
| Branch (支店) | Name |
| Staff account (利用者アカウント) | Firebase Authentication UID, email address, display name, role (`developer superuser`, `House Solution administrator`, or `general staff`), enabled/disabled state; system-issued records also have registration/update timestamps |
| Construction-company account (工務店アカウント) | Firebase Authentication UID, construction-company ID, shared email address, role (`construction company`), enabled/disabled state, registration/update timestamps |
| Construction company (工務店) | Name, postal code, prefecture, municipality, street/town and number, optional building name, optional telephone, optional fax, optional contact person, optional contact details, optional notes, active/inactive state |
| Homeowner (施主) | Name, required postal code, prefecture, municipality, street/town and number, optional building name, optional telephone, optional fax, optional notes, active/inactive state |
| Property (物件) | Required name, required positive building area in square metres with at most two decimal places, homeowner ID, construction-company ID, five-part address, optional notes, active/inactive state |
| Warranty service / product (保証サービス) | Required name, required short name of at most six displayed characters after trimming, required type (`保証` or `保険`), default warranty period in positive integer whole years, optional notes, active/inactive state |
| Case (案件) | Fixed-width auto-assigned case number (initially `000001` sequence; preserve legacy number when available), required application date, required handover date, homeowner ID, property ID, construction-company ID, responsible branch ID, case status, cancellation/invalidation reason when applicable, registration timestamp, update timestamp |
| Applied warranty (案件内適用保証) | Case ID, warranty-service ID, warranty period in whole years, warranty start date, expiry date, notification status, status, cancellation/invalidation reason when applicable |
| Construction-company case work item (工務店対応データ) | Reserved/current case ID, construction-company ID, new-case/renewal kind, workflow status including retained new-case withdrawal, revision, displayed case/property/homeowner context, company response, review/withdrawal reason, submission/approval/withdrawal and registration/update timestamps |
| Notification outbox item (通知送信待ち) | Audience, optional recipient email, template, work-item ID, queued state, creation timestamp |

The current model holds separate property and case references. A case directly references its homeowner, property, and construction company. The selected property supplies the initial homeowner and construction-company values, but an active case may store independently selected values.

The initial construction-company workflow uses one shared account per construction company. A renewal work-item ID equals its existing case ID. A new-case work item reserves its generated ID as the future case ID, and approval creates the registered case under that same ID. This is the accepted one-current-work-item constraint; retained response history across multiple renewal cycles remains outside the current model.

Staff accounts use Firebase Authentication email-address and password sign-in with browser-session persistence. The developer-owned developer superuser account creates, edits, and disables House Solution administrator accounts only. A House Solution administrator creates, edits, and disables general-staff accounts; editable fields are email address, display name, and enabled/disabled state. The role is currently fixed to `general staff`; if more roles are added later, a House Solution administrator can select only roles other than `House Solution administrator` and `developer superuser`. Account creation sends a password-setup email; email-address verification is not initially required, and staff can reset their password. Account email is trimmed, lowercased, and checked by a minimal regular expression before Firebase Authentication validation. The initial developer-superuser account is manually bootstrapped in Firebase Console without custom claims by creating matching Firebase Authentication and enabled staff-account records. Disabling an account must immediately end use, including an existing session. Cloud Functions for Firebase with Firebase Admin SDK manages subsequent account lifecycle. Account removal is reversible disablement/re-enablement: no account is physically deleted, and its identity, role or company binding, and email remain reserved while disabled. The prototype cleans up an Authentication user when account-record creation fails, writes the disabled Firestore state before disabling Authentication, and enables Authentication before exposing the enabled Firestore state. Production retry and operator-recovery procedures remain unconfirmed.

The model does not include monetary transfers, invoices, payment state, payer identity, or a separate contracting party. A homeowner is not inferred to be the contracting party.

## Notification Requirement

- Show an on-screen alert for an active case when any of its applied warranties has an expiry date 30 days away.
- Staff conduct the actual notification in the initial release.
- Staff select a notification status for each applied warranty from `not notified`, `notified`, and `not required` through a combobox to record progress. A newly added applied warranty starts as `not notified`.

Staff can change notification status in the initial release. Do not record notification timestamp or operator attribution at this stage; notification method, responses, transition rules, and repeat-alert behavior remain deferred.

## Case Lifecycle Requirement

- An `active` case is editable.
- Case statuses are `active`, `cancelled`, and `invalid`.
- A cancelled or invalid case is retained rather than physically deleted, is excluded from alert eligibility, and is not editable.
- Cancelling or invalidating a case requires a free-text reason.
- A cancelled or invalid case cannot be restored to active.
- Applied warranties have the same `active`, `cancelled`, and `invalid` statuses. Cancelling or invalidating an applied warranty requires a free-text reason, cannot be restored, retains the record, and excludes that applied warranty from alert eligibility.
- A case can remain active even when it has no active applied warranties.
- Adding, editing, cancelling, invalidating, or changing notification status on an applied warranty updates its parent case's update date.
- Editing an active case's own fields also updates its case update date.

Cancelled or invalid cases do not allow any edit, including adding or editing applied warranties.

Permitted edits not explicitly confirmed below remain open decisions.

## Existing Prototype Case Registration (Pending Permanent-Warranty Implementation)

- Application date, handover date, property, homeowner, construction company, responsible branch, and at least one applied warranty service are required. Selecting a property initially selects its homeowner and construction-company IDs for the case. No ordering rule between application date and handover date is currently specified.
- Assign a case number automatically when registering a case using a fixed-width sequential number, initially represented as `000001`. Legacy case numbers are not imported. The production format remains open under HSC-004.
- Selecting a property automatically selects its homeowner and construction-company IDs for a new case. Staff may change either selection before registration and while the case remains active.
- Changing the property on an active case initially selects the newly selected property's homeowner and construction-company IDs. Staff may change either value before saving. Changing a property master's construction-company ID does not alter existing cases.
- Each applied warranty requires a warranty start date. Initialize its fixed period from the warranty-service master's default period. Its expiry date is calculated as the day before the anniversary reached by adding that period to the start date; staff may manually correct it without a reason.
- The prototype currently adds an independent applied warranty on extension. The target warranty requirement instead retains one warranty identity/number and adds period history under it; this conversion is not implemented.

See [case warranties](case-warranties.md) for applied-warranty requirements, including expiry calculation.

See [branches and addresses](branches-and-addresses.md) for branch and property-address requirements.

## Other Relationship Baseline and Open Schema Decisions

- The working direction is that a homeowner and a construction company have no parent-child relationship.
- A case directly references its homeowner, construction company, and property. The property supplies the initial homeowner and construction-company selections, after which the active case can retain independently selected references. Construction-company and homeowner names, plus the property name and address, are read from their masters and follow master changes; they are not stored as case snapshots.
- Except for fields explicitly specified as required or optional, identifiers, field types, uniqueness, normalization, and validation are unconfirmed. Operation-history and audit-log records are outside the initial-release scope; registration and update timestamps remain required.
- A master referenced by a case is not physically deleted. It can be set inactive and later restored to active. Use by a case does not by itself require snapshots, edit warnings, reasons, approvals, or edit history; ordinary validation, reference integrity, and lifecycle rules continue to apply.
- A case-wide enrolment date is not stored. If required, derive the initial enrolment date from the oldest warranty start date among active applied warranties.
- A case's responsible-branch reference is editable. A branch name is displayed from the branch master and is not retained as a case snapshot.
- A property's homeowner and construction-company references are editable even after the property is used by a case. Changing either property reference changes only the property and does not rewrite any existing case reference. See [decision 0014](../decisions/0014-preserve-case-party-references.md).
- An applied warranty's fixed period is not editable. Its start date is editable; changing it recalculates its expiry date before any subsequent manual correction.
- A warranty-service name follows the master name. A master default positive-integer period change affects only newly added applied warranties and does not alter existing applied-warranty periods or expiry dates.
- Do not import records or fields from the current FileMaker system into the new system.
