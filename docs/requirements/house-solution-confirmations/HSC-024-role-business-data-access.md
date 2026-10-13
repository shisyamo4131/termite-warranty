# HSC-024: Role Types and Functional Permissions

## 2026-10-03 Resolution — 初期HS業務の権限分担

HS管理者・HS担当者とも全工務店の物件登録・編集・保証延長・取消・CSV出力を行える。利用者の追加・停止、システム設定は管理者に限定し、閲覧専用等の役割は初期には設けない。開発者用システム管理者の既存位置付けは変更しない。初期の通常業務権限は解決とする。

保証終了データ削除は同日新たに示された方針で、操作権限・実行手順は今回のYESから推定せずHSC-001で確認する。工務店ポータル再開時の役割見直しはHSC-013の将来範囲。決定者：プロジェクトオーナー。根拠・日付：2026-10-03本Codex会話①YES。仕様書0.1.72とsecurity-and-accessへ反映、未コミット。仕様確認であって権限コード・Rulesの変更ではない。

## 2026-10-02 追加確認：正式保証書の発行権限

同日の後続指示により、推奨運用として土曜日に提示することをオーナーが承認。本登録・延長は工務店、正式発行は当初HS、印刷・発送は別途委任可、工務店には必要なら受付確認書／位置付けを定めた仮書類、正式発行後の取消はHSへの依頼とする案を提示する。HSの承諾・実装変更の承認ではない。[当日確認資料](../../../deliverables/meeting-2026-10-03/README.md)に回答欄を設ける。

ユーザー報告では現業務はHSが厚紙へ印刷して発送する。工務店への発送委任・仮保証書の交付は利点として検討中で、採用ではない。現行試作は工務店による本登録・見本PDF保存・理由付き取消が可能（`app/components/MeetingPrototype.vue`、`functions/property-warranty.js`）。本登録の承認不要という既決定だけで、正式保証書の発行権限まで承認されたとは扱わない。

確認文案：正式な保証書は、今後もHS様が発行・発送しますか。それとも工務店様が印刷して施主様へ渡せるようにしますか。工務店様には仮の受付確認書だけを出せる形がよいでしょうか。

開発側提案・未採用：本登録は従来どおり受け付け、正式発行と発送担当を別に決める。発行後の取消は[HSC-035](HSC-035-case-cancellation-invalidation-criteria.md)と一緒に決める。画面のボタン非表示だけでなく、正式発行・取消処理側で権限を確認する必要がある。現行実装は変更しない。

根拠：2026-10-02本Codex会話でのユーザー確認依頼。HS回答待ち、外部未送付。

- Status: Consultation requested; roles/operator assignment open
- Decision owner: House Solution, then project

## Confirmed Context

2026-10-01試作方針㉑A：HS担当者は全工務店の物件を新規登録・修正・延長・取消できる。工務店の操作可能範囲を広げたりHS承認を復活させたりしない。利用者管理の既存の役割分担は変更しない。土曜日用の採用で、本番確認・実装・配備権限変更は未完了。

### 2026-10-01 打ち合わせ用プロトタイプの採用方針

オーナーが質疑第1回①A・②Aを採用。HSが担当者ごとのアカウントを発行し、本店の全店管理担当者は自社全店を閲覧・操作、支店担当者は自店のみを閲覧・操作する。他社は対象外。これは土曜日用の試作方針で、HSの本番仕様確認ではない。既存の1社1共有アカウントからの変更は未実装。既存の配備権限を変更しない。仕様・契約・認証設計の具体化と会社／支店境界テストは実装前に必要。異動・複数支店兼務・本店一般担当者の役割は今回確定しない。

- The application currently recognizes `developer superuser`, `House Solution administrator`, and `general staff` values for sign-in profiles, while the user-facing operational description groups accounts as “administrator” and “general”. The final role terminology and whether the developer superuser is a separate operational role require confirmation.
- Role-bounded staff and construction-company account-management screens and trusted mutation Functions are implemented. Account removal means disable/re-enable rather than physical deletion under resolved HSC-021.
- The provisional requirements assign different account-management responsibilities to the two administrator roles, but all enabled authenticated staff currently have the same business-data CRUD access and no implemented role-specific business-function restriction.

## Questions

1. At initial release, are the operational roles only “administrator” and “general”, or is the developer superuser a separately managed role?
2. Is any role other than “general” required below the administrator level, such as view-only, branch-limited, case-entry-only, or approval roles?
3. For every adopted role, which functions may it view or use: case/master viewing, registration, editing, inactivation, cancellation, invalidation, export, account management, and system administration?
4. Are branch-level or record-level restrictions required?
5. After House Solution defines the role/function matrix, which restrictions require server/data-layer enforcement in addition to UI and button visibility?

Account deletion, restoration, identifier reuse, and failure-recovery semantics are decided separately in [HSC-021](HSC-021-account-lifecycle.md); this matter alone owns which roles may invoke those functions.

## Affected Documents

Roles, security rules, Functions, navigation, UI, operations, and authorization tests.

## Resolution Record

No answer has been received. Record the approved role list, function matrix, and evidence here before promoting them to confirmed requirements.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 14 — 利用者と利用開始前の確認

帳票等の仕様とあわせ、使える人・使う端末・困ったときの連絡先を確認します。技術的な方式は開発側で整理しますので、業務上必要な条件をお答えください。

1. 閲覧だけの人、登録・修正する人、取消・無効化や帳票出力をする人を分けますか。工務店内でも他支店の物件を見せない制限が必要ですか。取消と誤登録の無効化は、どの場面で使い分けますか。
2. 主にパソコンで使いますか、スマートフォン・タブレットも必須ですか。利用人数、同時利用人数、月の登録件数の目安を教えてください。
3. 利用開始後の問合せ窓口・必要な対応時間帯・月額運用費の上限について、ご希望または決定担当者を教えてください。未決の場合は確認予定日をご記入ください。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q5は「相談したい」。Q7もアカウント追加・停止担当が空欄で「相談したい」。管理者・一般の2種類を承認した回答ではない。既存のアカウント停止方式はHSC-021に記録されており、この回答で自動変更しない。

### 残る確認（文面はユーザー確認前）

普段入力する人、内容を確認する人、利用者を追加・停止する人を役職や担当で伺う。システム用語で権限設計を依頼しない。


## 2026-10-03 打合せ後の確定：初期運用はHS入力

オーナーが本日のHS打合せ結果として回答。10月末納期までに取引工務店へ周知する時間がないため、初期運用のすべての入力業務はHSが担当する。工務店側の入力機能は削除せず、利用開始を保留する。保証書出力はHS側だけの機能とする。

これは初期運用の担当変更であり、工務店機能の廃止や、将来再開時に都度HS承認を必須にする決定ではない。工務店への開放時期、既存アカウントの具体的な利用制御方法、印刷・発送担当の追加決定は含まない。現行試作のコード・配備・アカウントは未変更。HS限定出力の実装・検証は後続作業。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.33へ反映、未コミット。各事項の他の未決部分は継続管理する。
