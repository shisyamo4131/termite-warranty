# HSC-002: Initial-Release Acceptance Scope

## 2026-10-23 仕様固定の決定

決定者：オーナー、本チャット。現行機能・過去データ取込み仕様を了承。10/29・30のHS最終受入れで大幅な仕様変更を受け入れない。Dev／Prodの製品・過去データ業務内容を一致させる目標を確定したが、Prod配備・正式投入・保護は引き続き保留。利用開始日・社長の最終了承は未確定。仕様書・納品要件・工程・本番手順へ反映。HS最終受入れ完了の記録ではない。

## 2026-10-23 最終受入れの日程確定

オーナーが本チャットでHS最終受入れ確認を2026-10-29・30、納品を2026-11-02と指定。今回のDev723a7ae受入れ・dev統合了承とHS最終受入れは別。利用開始日・社長の最終了承は未確定のまま。[納品要件](../delivery-and-technology.md)と[工程](../../roadmaps/2026-initial-delivery.md)へ反映する。

## 2026-10-22 納品日の変更

決定者：オーナー（本チャット）。最終納品日は2026-11-02。従前の10月末期限を置換する。Dev060acb4の本人受入れ了承と、HS実務担当の正式確認／社長の利用開始了承は区別し、後者の実施や利用開始日を確定扱いにしない。[納品要件](../delivery-and-technology.md)。

## 2026-10-03 確定：受入担当／利用開始日は未定

HSの実務担当者が一通り操作して業務確認し、HS社長が利用開始を最終了承する。AriLaboは確認日程の調整・連絡を取りまとめる。根拠：同日オーナー②YES。実際の利用開始日は①未定のため保留し、10月末納品から具体日を推定しない。仕様書0.1.76へ反映、未コミット。実際の受入・了承は未実施。古い初期範囲案のポータル・直接PDF等は後続仕様を優先する。

- Status: Partially answered; owner wording review pending
- Decision owner: House Solution

## Confirmed Context

Production operation is mandatory by the end of October 2026. Existing-system data migration is excluded from release acceptance. The roadmap and specification define the currently planned capabilities, but the remaining minimum acceptance boundary has not been confirmed.

## Project Recommendation for Discussion — Not House Solution-Confirmed

Recommend defining initial-release acceptance as end-to-end operability for new cases, with the following mandatory acceptance scope:

1. Staff authentication and account lifecycle, plus construction-company account lifecycle including disabled-account enforcement.
2. Registration and editing of construction-company, homeowner, property, warranty-service, and responsible-branch masters, including safe display of existing references after a master is inactivated.
3. Case and applied-warranty creation, reading, and editing; multiple warranties; date calculation and correction; active/cancelled/invalid changes; and automatic case numbering.
4. Search and filtering, expiry alerts, notification-status updates, dashboard, and case detail.
5. Construction-company portal new-case submission and renewal response, submission, approval/needs-correction flow, and tenant isolation.
6. The production release procedure, backup and recovery, incident contact and response, rollback, and initial master/administrator setup.

Recommended exclusions from initial-release acceptance are FileMaker migration, attachments, an audit log, a custom email-delivery provider, the newly proposed response-record feature, deferred UI or otherwise unconfirmed features, and items House Solution explicitly accepts for later delivery. Proposed response records remain excluded until House Solution confirms them and UI design is completed.

Recommended acceptance roles are: final approval by the House Solution business owner; operational review by actual staff; and review by representative construction-company user(s). Development supplies evidence but cannot be the sole business acceptor.

Recommended pass/fail criteria are:

- All mandatory scenarios pass.
- No security, privacy, data-loss, or work-blocking defects remain.
- Minor issues may remain only with a documented workaround, owner, due date, and acceptance of the residual risk.
- Release, recovery, and rollback rehearsals are completed and their results are recorded.

Use synthetic data in development. Production smoke testing should use only the minimum non-personal setup data needed to verify the release. This recommendation preserves the confirmed mandatory production-operation deadline by the end of October 2026 and does not add FileMaker migration to acceptance.

## Questions

1. Does House Solution accept or revise the recommended mandatory end-to-end scope for initial-release acceptance?
2. Does House Solution accept or revise the recommended exclusions, including FileMaker migration, attachments, audit log, custom email delivery, proposed response records, deferred/unconfirmed features, and explicitly deferred items?
3. Does House Solution accept or revise the proposed acceptance roles, synthetic/development and production-smoke data boundaries, pass/fail criteria, and release/recovery/rollback rehearsal requirement?

## Affected Documents

`docs/specification.md`, the delivery roadmap, acceptance procedures, and release operations.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 1 — 10月末に必要なもの

新しい資料で、保証書・請求書などの出力が重要な業務であることを確認しました。10月末に必要な範囲を、HS様・AriLabo・開発側で揃えたいと考えています。

1. 下表の各行で『10月末に必須』『後日でよい』『不要』のいずれかを選んでください。
2. 保証書・請求書は、完成した書類を出す必要がありますか。それとも、現在の書式に取り込めるExcelデータを出せば足りますか。
3. 実際に使えるか確認する方と、最終的に利用開始を判断する方をご記入ください。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q1は初回帳票の選択欄が空欄で、最優先事項なし・「おすすめ」で進めたいとの備考。第2回Q2の備考は最終形を保証書PDF、請求書・報告Excelとする。初回Excel優先の方向は読み取れるが、初回の出力対象・開始日・受入担当は確定していない。

### 残る確認（文面はユーザー確認前）

最初に使い始める日と、その日に必要な一覧・書類を一つずつ確認する。最終形のPDFと初回のExcelを分け、完成例を受領する。保証の1対1・恒久番号・履歴保存はADR 0033で決定済みなので再質問しない。

### 2026-09-29 帳票検討の進め方の修正

プロジェクトオーナーは、保証書PDF出力を実装する前提でテンプレート次第の技術的な問題を開発側が先に検討すべきと指示した。「初回はExcel、PDFは後日」とする質問案は未採用のまま撤回する。上記の「初回Excel優先」は回答の読み取りであり、承認済みの提供範囲・技術的容易さではない。まず帳票の原稿・完成見本でPDFとExcelそれぞれの実現性を検証する。初回提供日・必須業務・受入担当は引き続き未確定。検討項目と資料提供依頼文は[相談用メモ](../../requirements-review-2026-09-29.md)に記録。資料提供依頼文は同日の本Codex会話でプロジェクトオーナーが「採用します」と承認した。外部送付・見本受領・技術検証は未実施。
