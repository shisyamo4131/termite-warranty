# HSC-015: Migration Scope and Data Cleaning

## 2026-10-03 初期の満了案内状態

過去物件の満了案内は原則未案内で初期登録し、HSが既に案内したと確認できる物件だけ案内済みを引き継ぐ。保険報告は全件未報告という既決ルールとは別の状態。根拠：同日②YES、仕様書0.1.84、HSC-005。実データ取込は未実施。元資料の状態確認は後続。

## 2026-10-03 初期データの日付補完担当

申込月のみの過去データはHSが日付を指定する。引渡日が空欄のものはすべてHSが埋めて提供する。開発側が月初日・上棟日・取込日などで勝手に代用しない。根拠：同日②YESと補足、仕様書0.1.77。全件補完済みの資料を受領したという意味ではない。原資料・本番データは今回未変更。

## 2026-10-03 初期登録範囲の確定

運用開始時点で保証が継続している物件を全件登録し、保証終了・取消済みは初期登録しない。除外分も含め既使用保証番号を再利用しないための照合は開発側が行う。根拠：同日オーナー③YES。仕様書0.1.74。対象範囲の方針は解消、実ファイルの対象確定・件数・日程・欠損の個別確認は後続。データ投入は未実施。

## 2026-10-03 確定：照合・了承後に通常登録を開始

HSから元資料を受領し、開発側で不備・重複を確認、不明点をHSへ確認したうえで初期登録する。登録結果をHSが照合・了承してから通常の新規登録を開始する。番号の重複と確認途中の利用開始を防ぐ。既報告物件はゼロとの同日回答により、初回未報告として初期化する（HSC-036）。

根拠：2026-10-03本Codex会話③YES、②「既に保険会社へ報告している物件はない」。仕様書0.1.69へ反映。対象ファイル・件数・対象範囲・提供日等は未受領／未確定で、実データ投入の実行承認ではない。先行する「照合・承認手順は未確定」は本節の範囲で解消する。

## 2026-10-03 確定：初期登録は開発側が担当

保証番号の一意性を担保するため、過去データの初期登録は開発側が担当することが決定した。HSによる全件手入力案では進めない。根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.51へ反映。

登録対象・提供ファイル・個人情報取扱い・HSによる最終確認の具体的手順は引き続き整理する。実データ登録・取込ツールの実装・配備は今回実施しない。採番の年度リセットと取込後のカウンター初期化はHSC-004と整合させる。

## 2026-10-02 手入力案の検討（未確定）

最新の同日指示：初期登録は開発側が担当する可能性が高く、HSの確認・承諾を土曜日に得る。HSによる通常画面への手入力を第一案とする直前の検討から、原資料を受領し開発側で整合性確認・初期投入、HSが照合・承認する案へ進める。Firestoreへの初期投入は方式候補で、実データ投入・本番DB確定・取込処理の実装はまだ承認されていない。

承諾事項は対象データ・範囲・原資料の優先順位、開発側の受領／投入、HSの提供担当・不明点回答担当・照合承認担当、作業日程と準備中の追加修正管理。既存番号・保証期間・所属・判明している保険状況を保持する。重複・不足・矛盾は勝手に補完しない。投入前後の件数とキー情報を照合し、採番開始値、投入前検査、再実行時の重複防止、退避・差戻し手順を実施前に準備する。初期登録と保険会社への報告は分離する。

ユーザー報告：保険を仕入れとする保証サービスは2026年10月開始とのこと。数十件程度なら操作習熟を兼ねた手入力を提案。実件数は未確認で、番号の3桁表示は件数の根拠にしない。以前の保証販売実績と保険サービス開始は区別し、開始月だけで過去保証の対象を除外しない。

確認するのは実件数・対象一覧・既存保証番号・既存保証期間と保険状況・入力担当・照合担当。手入力を選ぶ場合も既存番号を保持し、新規番号と重複しない開始値を設定する必要がある。現行通常登録は自動採番なので、そのままで過去データ登録に対応済みとは扱わない。既存番号入力を許す初期登録経路等の最小改修が必要かを判断する。自動取込を作らないことと、初期データの照合を省くことは別。

根拠：2026-10-02本Codex会話。手入力方式の採用・実装指示ではなく検討案として保持する。

- Status: Awaiting migration scope and mapping clarification
- Decision owner: House Solution

## Confirmed Context

The project previously planned a best-effort migration of a feasible subset of legacy records.

## Questions

No existing records, periods, fields, or relationships will be migrated into the new system.

## Resolution

- Decision: Do not migrate data from the current system into the new system.
- Decision maker: House Solution
- Decision date: 2026-09-11
- Evidence: User instruction in the current Codex task on 2026-09-11: existing-system data migration is not required. A task/thread identifier was not available to the repository authoring context.
- Effect: Migration mapping, data cleaning, migrated-count reconciliation, migration exception reporting, and migration acceptance tests are not release requirements. Existing FileMaker data remains outside the new-system datastore.
- Reflected in: `docs/specification.md`, delivery and environment requirements, roadmap, operations, ADR 0015, and this register.
- Revision: Pending commit.

## Affected Documents

Specification, delivery scope, roadmap, environment requirements, operations, and superseding decision record.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 2 — 既存データをどこまで移すか

これまでは移行なしの前提でしたが、今回は『全件移行』『既存の有効物件を全件対象』との回答をいただいています。Excelを使うことは読み取れますが、手入力か一括取り込みかは未確定です。

1. 対象は、今回の3グループすべてですか。保証終了・取消済みの物件も移しますか。対象のExcel、対象期間、おおよその件数をご指定ください。
2. 登録方法と担当者を選んでください。元のQ3では備考欄を残すかが未選択でしたので、あわせてご回答ください。
3. 重複・不足項目の確認と、移行後の件数確認はどなたが担当しますか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回資料には移行対象・方法の追加回答はない。恒久保証への変更に伴う試作データの対応付けと、顧客が持つ既存Excelの取込は別作業。複数保証・重複物件・既存番号を自動で一つにまとめない。

### 残る確認（文面はユーザー確認前）

初回に登録しておくExcelの範囲、対象件数、終了済み物件・備考の扱い、作業担当を確認する。不足項目の扱いはHSC-003。並行運用はHSC-016。


## 2026-10-01 追加資料後のオーナー判断

取込仕様が定まっていないため試作に取込機能を実装しない。既存保証番号保持は必要。全過去データ取込後に運用開始し最大通番から新規採番する案が示されたが、移行範囲/実施順序の確定ではない。グループ・年度・既存番号の重複を検証する移行設計が必要。

根拠：本Codexタスクの同日ユーザー指示。試作の確定範囲は[試作仕様](../../design/meeting-prototype-2026-10-03.md)と仕様書0.1.30に反映。土曜日への提案は未確定のまま保持。外部未送付。
