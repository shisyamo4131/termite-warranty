# HSC-031: Mobile-Device Usage and Support Scope

## 2026-10-03 Resolution — 初期はWindowsのChrome・Edge

初期の動作確認対象はWindows PCのChrome・Edge。スマートフォン・タブレット対応は工務店ポータル再開時に再検討する。初期利用環境の範囲は解決とし、OS・ブラウザーの具体的検証版や印刷環境の実測は開発側の検証時に記録する。Mac利用の報告はなく、Mac対応を今回追加しない。

決定者：オーナー。日付・根拠：2026-10-03本Codex会話②YES。仕様書0.1.75とdelivery-and-technologyへ反映、未コミット。機器調査・実ブラウザー検証の実施済みを意味しない。将来ポータル範囲はHSC-013で再確認する。

- Status: Partially answered; company device scope open
- Decision owner: House Solution

## Confirmed Context

- The application is browser based and currently uses responsive Vuetify components, but mobile-device use is not a confirmed requirement.
- Supported device types, operating systems, browsers, screen sizes, mobile workflows, and acceptance criteria have not been defined.
- Responsive rendering alone does not establish that operational use on smartphones or tablets is supported.

## Questions

1. Will House Solution staff, construction companies, or homeowners use the system on smartphones or tablets?
2. Which workflows must be usable on mobile devices: viewing, searching, case registration/editing, master management, notifications, account management, or future external submission?
3. Which device types, operating systems, browsers, minimum screen sizes, orientation, and input methods must be supported?
4. Is use expected inside an office, at a property/construction site, or while travelling, and must poor connectivity or offline operation be considered?
5. Are mobile-specific capabilities such as camera capture, file upload, location, push notifications, or home-screen installation required?
6. What mobile usability, accessibility, performance, and acceptance-test criteria apply?

## Affected Documents

Product scope, users and workflow, non-functional requirements, responsive UI design, browser/device support, security, performance, testing, and release acceptance.

## Resolution Record

No answer has been received. Record the approved mobile support scope and evidence here before promoting it to confirmed requirements.

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

第2回Q10備考はシステム自体PC、工務店の新規入力は不明。HS側PC利用の方向と、工務店側未確認を分けて扱う。

### 残る確認（文面はユーザー確認前）

工務店が直接操作する場合に限ってスマートフォン利用の必要性を確認する。PCのブラウザーや機器の確認は利用者決定後に行う。
