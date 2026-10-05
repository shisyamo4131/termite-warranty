# 0034 工務店による承認待ちなしの新規登録・延長

> 2026-10-03 補足確定（仕様書0.1.68）：会社の所属変更は変更後の新規本登録へだけ適用する。既存保証は延長時も旧グループ・恒久番号を保持する。直下の0.1.67時点の確認待ちは解消。会社defaultGroupIdを維持し、支店の旧groupIdは新規採番に使わない。実データの一括書換えは行わない。

> 2026-10-03 定義訂正（仕様書0.1.67）：保証グループ→工務店→支店の従属関係を採用。支店独自のグループ上書きを廃止し、同一グループの全工務店・支店で共通接頭辞を使う。別の工務店グループは存在しない。下記の支店別優先設定は今回の指示で置き換える。既存保証の番号を保持する判断は撤回されていないが、所属変更時に旧グループ保証を残す既決方針と今回の統一範囲の整合をHSC-037で確認する。移行・番号変更は未実施。理由はHSが説明した実際の親子関係へ整合させるため。

> 2026-10-03 rollout amendment: initial operation uses HS for all input; company entry functionality is retained but rollout is deferred because partner communication cannot be completed before end-of-October delivery. Certificate output is HS-only. This changes initial rollout, not the approval-free design if company entry is later enabled. Specification 0.1.33; no code/deployment changes in this checkpoint.

> 2026-10-01 follow-up: implementation is authorized by the [meeting prototype contract](../design/meeting-prototype-2026-10-03.md). Individual operator scope, group numbering, period changes and reasoned HS restoration follow the 27 adopted decisions. The owner authorized disposal of prior test data instead of conversion; this does not authorize production-data migration. Earlier “implementation pending / no deletion authorized” paragraphs describe the previous checkpoint. Verification and deployment are separate gates.

- Date: 2026-10-01
- Status: Accepted; implementation pending
- Supersedes: ADR 0023の申込ごとのHS承認・差し戻しを登録条件とする部分のみ
- Evidence: 同日の本Codex会話でオーナーが、物件／保証の新規登録と延長更新をHSの承認なしで受け付けて登録する方針を採用。

## Decision

- HSが利用先工務店のアカウントを発行・停止する。公開の自己登録は提供しない。工務店の本店・支店担当者がポータルを利用する。個人別・支店別アカウントや閲覧範囲はこの決定から追加しない。
- 認証済み工務店は自社の物件／保証を新規登録し、保証を延長できる。HSの個別承認・差し戻し待ちを登録・延長の成立条件にしない。入力検証・会社への紐付けは維持する。
- 新規保証は工務店に設定された保証グループと申込日による年度を用いて採番する。グループ内の連番は年度でリセットしない。支店別使い分けの設定方法、正式な番号書式・年度区分はHSC-004/037に残る。
- 延長は既存の恒久保証番号を維持して期間履歴を追加する（ADR 0033）。受付だけを記録してHS承認まで延長を保留する方式にはしない。
- HSは運営・管理と保証提供・保険加入を担う。単なる基盤提供だけの立場へ業務責任を変更したと解釈しない。保証書発行・保険会社への報告の自動化、30年延長条件の自動判断はこの決定に含めない。

## Reason and Boundaries

フォーム回答とオーナー採用により、申込ごとのHS承認工程を省く。利用先の入口をHSによるアカウント発行で限定することと、登録操作の都度承認することを分離する。

同日の後続オーナー採用：工務店の現在の割当と個々の保証のグループを分離する。割当変更は新規登録分に適用し、既存保証は延長時も元のグループ・恒久番号を維持する。過去の保証書の分類を会社設定の変更で自動的に変えないための決定。遡及入力と変更発効日、誤登録訂正、支店別優先設定はHSC-037に残る。

## Compatibility, Migration and Rollback

現行プロトタイプは仮登録・承認方式のまま。実装前に未処理申込の下書き／提出済み／差し戻し／承認済みと保証期間履歴の対応を設計し、未処理申込を無断で本登録・延長しない。会社の所有関係、採番の重複防止、二重送信対策を保つ。データバックアップ・移行前後の照合と旧版に戻せる条件を具体化してから変換する。今回コード・保存データ・権限設定・デプロイは変更しない。

## Required Implementation Validation

グループ割当変更後、新規保証だけに新グループが付き、旧保証の表示・延長が旧グループ／番号のままであることを検証する。既存保証へのグループ割当は根拠のある元データから移行し、現在の工務店設定から過去を推定して埋めない。

新規登録で承認待ちなしに物件／保証と番号が一度だけ保存されること、延長で同じ保証番号と履歴が保たれること、別会社・無効アカウントの操作拒否、二重送信・競合・失敗時の原子性、番号年度境界、既存申込の移行と復旧を確認する。影響に応じたアプリ・データ・UIの検証ゲートを選ぶ。

## Status

仕様反映のみ。実装・移行・受入は未完了。現行データ契約・実装設計は旧版の事実を保持し、新方式の契約・手順は実装前に改定する。文書だけで進捗を加算しない。
