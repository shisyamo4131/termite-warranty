# HSC-025: Production Service and Risk Requirements

## 2026-10-08 オーナー決定による現在の状態

Firebaseの予算設定は後発とし、Prod構築前の条件にしない。通知先はオーナーのGoogleアカウントに確定。対応時間・費用見積りの保証を新たに採用したものではない。

## 2026-10-03 対応時間・費用上限は未定

①対応時間は未定。②費用の上限も未定。オーナーはHSへ、Prod運用後のサービス利用料は月数百円程度の見込み、利用状況・データ量で変動するが数万〜数十万円になる可能性は限りなくゼロに近い、との説明を行ったと報告した。

これはHSへ伝えた概算・見解の記録であり、開発側で現在の料金や想定読取量を検証した見積り、価格保証、契約上限、課金停止条件ではない。高額化の発生確率は未検証。直前の「想定費用提示→HS確認→運用開始」の案への明示採用とは扱わない。対応時間、費用上限・増加時の承認ルールは引き続き保留として資料に掲載する。後続の費用検討では現在の料金と使用量の前提を確認し、HSへの説明済み概算との差を明示する。

根拠：2026-10-03本Codex会話①未定・②の説明。仕様の新規確定ではなく未決事項の状況更新。課金設定・外部サービス・実装変更なし。

## 2026-10-03 問い合わせ経路の確定

HSからの操作・不具合相談はまずAriLaboへ連絡し、開発対応が必要なものをプロジェクトオーナー（開発者）へ引き継ぐ。③YESは提示した第一案への同意として記録する。対応時間・復旧目標・保守契約・費用上限を同時に合意したとは扱わない。

根拠：2026-10-03本Codex会話③YES。仕様書0.1.75。外部への連絡・通知・契約変更は行わない。残る運用条件は継続確認。

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Detailed production security, privacy, availability, support, and operating-cost requirements have not been confirmed. Operation-history and audit-log functionality is excluded from the initial release.

## Questions

1. What security and privacy controls, risk acceptance, and incident response are required?
2. What operating hours, availability, support contact, severity, and restoration expectations apply?
3. What recurring operating-cost ceiling and approval process apply?

## Affected Documents

Non-functional requirements, security posture, operations, monitoring, support, budget, and acceptance.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 14 — 利用者と利用開始前の確認

帳票等の仕様とあわせ、使える人・使う端末・困ったときの連絡先を確認します。技術的な方式は開発側で整理しますので、業務上必要な条件をお答えください。

1. 閲覧だけの人、登録・修正する人、取消・無効化や帳票出力をする人を分けますか。工務店内でも他支店の物件を見せない制限が必要ですか。取消と誤登録の無効化は、どの場面で使い分けますか。
2. 主にパソコンで使いますか、スマートフォン・タブレットも必須ですか。利用人数、同時利用人数、月の登録件数の目安を教えてください。
3. 利用開始後の問合せ窓口・必要な対応時間帯・月額運用費の上限について、ご希望または決定担当者を教えてください。未決の場合は確認予定日をご記入ください。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.
