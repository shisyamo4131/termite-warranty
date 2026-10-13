# HSC-038: Construction-company Branches and Document Recipients

## 2026-10-03 全体整理時の位置付け

階層・無効化の初期業務仕様は回答済み。送付業務・書類別宛先管理は初期対象外で、下記の古い質問を初期未回答として再提示しない。残件はポータル再開時の影響と、必要になった場合の送付／宛名出力の将来検討。仕様書0.1.90の初期仕様と区別する。

## 2026-10-03 送付業務は初期システム対象外

オーナー③回答により、印刷・書類送付はHSが行い、初期システムは送付業務に関与しない。書類別送付先管理、複数宛先、配送方法などの質問は初期確認対象から外す。宛名印刷用CSVは可能性として言及されたもので、必須機能として採用しない。通常の工務店／支店の住所・連絡先自体を削除する指示ではない。

根拠：2026-10-03本Codex会話③。仕様書0.1.70。ポータル再開時の影響等は将来確認として維持。今回アプリ・配備なし。

## 2026-10-03 確定：工務店・支店の無効化

工務店・支店は削除せず無効化し、新規物件の登録先から除外する。既存物件との関連と保証は保持し、HSは既存保証の訂正・延長・保証書出力・保険報告を継続できる。これは当該保証自体が取消済みの場合の操作制限を解除するものではない。

工務店の無効化は配下の全支店の新規登録も停止する。支店単独の無効化は本店・他支店へ波及しない。再有効化可能だが、工務店を再有効化しても個別に無効化した支店は無効のままとする。親の無効による実効的な停止と支店自身の無効状態を区別する。ポータルのログイン・アカウント停止を自動連動させる判断は今回に含めない。

根拠：2026-10-03本Codex会話の無効化3項目への「すべてYES」。仕様書0.1.67、HSC-038。未実装・未配備。

## 2026-10-03 親子関係の確定

保証グループ→工務店→支店。別の工務店グループは存在せず、支店による保証グループ上書きは廃止。定義と所属変更時の確認事項はHSC-037を参照。下記の上位グループ不明・支店上書きの案は今回の回答で置き換える。書類送付先等の未決事項は維持。


- Status: Hierarchy and reversible company/branch disable confirmed; recipient routing and portal account effects open
- Decision owner: House Solution

## Confirmed Context

2026-10-01試作方針：質疑第1回①A・②Aをオーナーが採用。担当者単位のアカウント、本店の全店管理担当者は自社全店、支店担当者は自店の物件を閲覧・操作。会社・所属支店との関連を持つ方向で具体化する（HSC-024）。支店別グループ優先設定はHSC-037。本番仕様のHS確認・実装は未完了。帳票送付先や異動・兼務の扱いまでは決めていない。

2026-10-01追加決定：HS側の支店はオーナーが不要と確定（HSC-033）。工務店所属の支店は別概念として残るため、この決定を工務店支店の廃止と解釈しない。過去質問のHS側支店の要否は再質問しない。

### 2026-10-01 工務店と支店の解釈

フォーム質問4の「工務店毎、支店も使い分けしたい」と、同日のユーザーの「工務店の中に支店があるイメージ」という指摘を踏まえ、工務店を親、その所属支店を子として整理するのが自然と判断する。工務店Aの支店ごとに保証グループを使い分ける設計を検討する。これは既存のHS担当支店とは別概念であり、既存支店マスタをそのまま転用する根拠にはしない。支店なしの工務店、本社直扱い、支店別アカウント・閲覧権限、送付先の詳細までは今回確定しない。グループ選択の回答はHSC-037を参照する。

The supplied company-master image introduces company branches and document-specific recipients. These are not the current House Solution branch master. Cardinality, account relationships and routing are unconfirmed.

## Affected Documents

Specification, topic requirements, data contract, implementation, tests and release acceptance after approval.

## 2026-09-28 Clarification Checkpoint

Source: [latest received materials](../source-materials.md). The project owner authorized promotion of unambiguous answers and requested clarification of the rest on 2026-09-28. The questionnaire is prepared locally and has not been sent. Existing proposals above remain unapproved; existing decisions are retained as history until explicitly superseded. Further implementation dependent on these answers is paused.

### Outgoing question 10 — 工務店の本支店と書類の送付先

新資料は工務店の本社・支店と、書類ごとの送付先を管理する形です。現在システムにある『担当支店』はHS様の支店で、工務店の支店とは別です。

1. 工務店の各本支店に登録する担当者は、表のように2名までですか、3名以上も必要ですか。
2. 保証書・請求書・更改案内は、それぞれ複数の宛先へ送れますか。メール・郵送のどちらですか。物件に担当支店・担当者を指定しますか。
3. ログイン用メールと書類送付用メールは別々に登録してよいですか。HS様自身の支店管理・案件の担当支店は引き続き必要ですか。

Snapshot: [questionnaire package](../../../deliverables/hs-questions-2026-09-28/README.md). This file and the central register remain the authority for subsequent answers and status.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q12は支店・担当ごとに保証書・請求書・更改案内の送付先を分ける形でよいと選択。上限人数、同一書類の複数宛先、メール・郵送の内訳は未回答。

### 残る確認（文面はユーザー確認前）

実際の工務店1社を例に、3種類の書類を誰にどの方法で送るかを記入してもらう。形式の承認を受けたため、支店別に分ける必要があるかは繰り返し尋ねない。


## 2026-10-01 追加資料後のオーナー判断

議事録の「工務店グループ」の意味はオーナーも不明と判断。現行試作は工務店→支店→物件、本店物件は支店指定なし。工務店を束ねる上位グループはない。保証グループは会社標準/支店上書きで別管理。上位グループの必要性と連絡先の関係は土曜日に確認する。

根拠：本Codexタスクの同日ユーザー指示。試作の確定範囲は[試作仕様](../../design/meeting-prototype-2026-10-03.md)と仕様書0.1.30に反映。土曜日への提案は未確定のまま保持。外部未送付。


## 2026-10-01 デモ確認後

オーナーは会社／支店の無効化を検討事項と指定。実装採用ではない。推奨案：取引停止で新規物件登録・新規担当者発行を止めるが、既存保証と所属履歴は保持する。ログイン停止は担当者アカウントの停止として分離する。支店閉鎖時は本店の全店担当またはHSが既存保証を扱う案とする。延長・訂正の権限、会社停止時に全支店へ適用する範囲、再開、物件移管はHS確認が必要。無効化によって既存保証を失効させる仕様は採用しない。

根拠：本Codexタスクのオーナー指示・確認回答。確定部分のみ試作仕様へ昇格、未決・提案はこの事項で保持。
