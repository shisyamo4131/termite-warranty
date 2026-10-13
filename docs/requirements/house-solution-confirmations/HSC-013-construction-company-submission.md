# HSC-013: Construction-Company Submission and Review

- Status: Deferred rollout; initial entry by HS, retained portal features reassessed before opening
- Decision owner: House Solution

## 2026-10-03 現在の位置付け

初期はHSが全入力を行い、工務店側の機能は残したまま利用開始を延期する（仕様書0.1.90、既決の再整理）。下記の初期ポータル・共有アカウント・承認処理の記述は過去の検討／試作経緯。再開時に個人アカウント、本店／支店の範囲、登録・取消・出力権限、連絡方法を改めて確認する。初期納品の未回答質問として再提示しない。

## 2026-10-01 回答照合（仕様採用前）

同日の後続オーナー決定：物件／保証の新規登録・延長更新をHS承認なしで受け付け、そのまま登録する方針を明示採用。HSがアカウントを発行し、工務店の本店・支店担当者が自社情報を操作する。自己登録なし。仕様書0.1.27、workflow、ADR 0034と関連文書へ反映。未コミット・未実装。以下の「判断待ち」は決定前の経緯。登録後の訂正／取消、二経路受付、帳票・報告の自動化、支店別アカウント等は残るが、申込承認の要否は再質問しない。

出典：[資料台帳](../source-materials.md)。フォームは全1件、送信日時の表示2026/10/01 12:13（時間帯表示なし）を直接確認。電話はユーザー転記。過去の未送付・回答待ちの記述は当時の状態であり、この節が現在の確認状態を示す。

フォーム質問1の回答は「初期段階より工務店が入力。承認なしで登録される形を希望します」。初期ポータルの必要性が示された。現行のHS承認後登録と異なる変更要望であり、承認工程の削除を採用済みとは扱わない。登録後の訂正・取消、保証書発行・保険報告までの確定範囲、更改時にも同じ運用を適用するかが残る。既存の会社別アクセス制限や入力検証を不要とする回答ではない。

## Confirmed Context

### 2026-10-01 アカウント発行と申込承認の分離（提案）

オーナーは招待なし登録で第三者が利用できる懸念を提示。フォームの「承認なしで登録」は申込内容の登録についての回答で、公開のアカウント自己登録を求める回答ではない。現行のHS管理者による会社別アカウント発行・会社への固定の紐付け・無効化を維持し、発行済みアカウントでログインした工務店の申込内容だけを承認待ちなしで登録する案を推奨する。URLの秘匿をアクセス制限の代わりにしない。アカウント自己登録の追加は未承認で、現行の自己登録なしを変更しない。申込承認の省略自体、発行・保険報告との関係、更改への適用範囲は引き続きオーナー判断待ち。

The current FileMaker-service member page is context only and cannot meet the new service's requirements. It appears to use one simple shared authentication account rather than one account per construction company; its exact implementation is unverified.

## Approved Initial Workflow

- Issue one shared account per construction company. House Solution administrators issue and disable it; the construction company sets and resets its password itself.
- Bind each account to one construction-company ID and restrict it to its own portal and provisional work items.
- Use one case-linked work item per registered/future case in the prototype. Company updates are limited by revision, state transitions, and submission locking.
- Queue company email notifications for renewal work and House Solution notifications after submission. Email is not the data source.
- Staff approve and atomically reflect the response in registered data or return it with a reason.
- The planning premise is low procedure volume and very unlikely simultaneous same-company updates to one property because warranties are five or ten years. This remains an unmeasured assumption.
- The prototype intentionally records company-level authentication and a self-declared current contact, not individual authenticated attribution.

## Resolution

- Decision: Adopt the implemented shared-account, company-bound portal, provisional work-item, submission lock, and House Solution approval/return workflow as the initial workflow.
- Boundary: Actual email delivery, scheduled renewal generation and reminders remain under HSC-005 and production service/security/operations matters. They do not change the accepted structured response-intake workflow.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task, following Dev prototype use.
- Promoted to: `docs/specification.md`, workflow, security/access, decision 0023, portal design, implementation, and tests.

## Affected Documents

External-submission options, workflow, roles, security, data states, UI, and tests.

## Decision Evidence

- 2026-09-13 Codex task instruction: implement this direction as a provisional prototype for presentation with supporting material.
- 2026-09-14 Codex task instruction: accept the implemented portal workflow as the initial workflow and resolve HSC-013.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 6 — 申込の2つの入口と工務店画面

Q2は『アカウント発行OK』『相談したい』の両方にチェックがあり、メールフォームと指定Excelの2経路が必要と記載されています。

1. メールフォームは、現在お使いのものを続けますか。それとも今回のシステムの申込画面へ置き換えますか。
2. 指定Excelは、工務店が送付しHSが入力しますか。HSがまとめて取り込みますか。工務店自身が画面へアップロードしますか。
3. 工務店のログイン画面は10月末から使いますか。新規申込・更新回答のどちらで使うかと、HS側の確認・差し戻しが必要かを教えてください。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q3はメールフォーム・指定Excelの両経路を受けたいと選択。Q6は施主利用なしに加え「基本スタッフのみ」の提案があり、Q10も工務店の新規入力端末は不明。2経路の受付は工務店の直接ログインを意味しない。

### 残る確認（文面採用済み・外部未送付）

使い始めの段階では、HS担当者様が、メールフォームやExcelで届く工務店からの申込内容をシステムに登録する形でよいでしょうか。
それとも、初期段階から、工務店担当者様がシステムに直接入力・申請し、HS担当者様が確認・承認すると申込内容が登録される仕組みが必要でしょうか？

文面承認：2026-09-29、プロジェクトオーナーが本Codex会話で「採用します」と指示。工務店ポータルが初期段階で必要かを尋ねる質問文のみを承認した。HSの回答や業務仕様の変更ではない。入力者を先に決め、その後に転記・取込方法を詰める。PDF化・外部送付は未実施。


## 2026-10-03 打合せ後の確定：初期運用はHS入力

オーナーが本日のHS打合せ結果として回答。10月末納期までに取引工務店へ周知する時間がないため、初期運用のすべての入力業務はHSが担当する。工務店側の入力機能は削除せず、利用開始を保留する。保証書出力はHS側だけの機能とする。

これは初期運用の担当変更であり、工務店機能の廃止や、将来再開時に都度HS承認を必須にする決定ではない。工務店への開放時期、既存アカウントの具体的な利用制御方法、印刷・発送担当の追加決定は含まない。現行試作のコード・配備・アカウントは未変更。HS限定出力の実装・検証は後続作業。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.33へ反映、未コミット。各事項の他の未決部分は継続管理する。
