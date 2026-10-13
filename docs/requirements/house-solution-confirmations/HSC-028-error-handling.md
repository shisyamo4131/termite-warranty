# HSC-028: Business-Flow Error Handling

## 2026-10-03 Resolution — 保存結果を確認して安全に再試行

通信エラー時は入力内容を画面に残し、保存結果を確認してから再試行できるようにする。結果不明のまま再登録を促さず、二重登録・二重採番・二重延長を防止する。解決できない場合は確定済みのHS→AriLabo→開発者へ問い合わせる。エラーを成功扱いする、入力を消す、結果不明操作を無条件再実行する方針は採らない。

初期の業務方針は解決。再試行キー・確認API・画面状態等は開発側で設計・検証する。ページを閉じた後の入力復元やオフライン作業まで承認されたとは扱わない。既決の入力検証・権限・競合制御も維持する。決定者：オーナー。根拠・日付：2026-10-03本Codex会話②YES。仕様書0.1.82へ反映、未コミット・未実装。

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

Some specific failures are defined, including postal lookup fallback and missing-record screens. General business-flow error handling is not confirmed.

## Questions

1. What should users see and retain after validation, network, conflict, permission, or server failures?
2. Which operations may be retried, resumed, or saved as drafts?
3. Which failures require support notification or escalation?

## Affected Documents

Error handling, UI, trusted operations, monitoring, support, and failure-path tests.
