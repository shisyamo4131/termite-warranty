# 0046 同一内容のPR検証再利用とDev受入れ記録

- Date: 2026-10-14
- Status: Accepted
- Approval: owner, task `01a133e7-092f-71f0-b5e7-43a8b7833ab9`。「PR結果の再利用とDev受入れ記録との連携」の次段階を実行する指示。

## Decision and rationale

Dev受入れ後、別変更の混入や競合解消がなく全ファイル内容が同じなら、mainで同じ業務試験を再実行する必要はない。merge commitのSHAの一致ではなく、Git tree（依存lock・試験・workflowを含む全追跡ファイル）の一致で判断する。PRの包括7検証は維持し、mainは信頼できる成功結果を再利用する。Prod固有build・対象確認・成果物検査・公開後5照合は毎回実行する。

採用した実装では同一repository/owner、mainへ統合済みの一意なPR、最新PR run/attempt、7 stepと3 shardの成功、実checkoutのtreeを名に含むartifactのGitHub管理metadataを検証する。PR結果は24時間以内に限定する。artifact本文や取得したコードを実行しない。版違い・CI結果の欠落／期限切れ／読取り失敗は包括7検証をmainで再実行する。統合元PRを確定できない場合は受入れ条件を判定できないため停止する。

dev→mainのPRとmain配備には、ownerによる明示的なDev受入れ記録も必要とする。記録は成功したdev push配備のrun/版/treeと結び付ける。自動試験成功を業務受入れの代わりにしない。受入れproducerの実装変更・別actor・版違い・失効は拒否する。保持／有効期間は30日。Dev自動配備の有効化と実際の業務受入れは別工程である。

## Compatibility, migration and rollback

包括gate ID・試験内容・業務仕様・DB schema・Cloud IAMに変更なし。CI読取り権限 `actions: read` と受入れ記録用手動workflowを追加する。導入以前のPR結果は新証跡を持たないため再利用しない。既存のfeature→main経路は維持し、dev→mainを使う際に受入れ記録を要求する。Dev→PRの包括検証重複はこの段階では残す。

従来の全再検証を恒常継続する案は、同一内容の重複待ち時間が残るため採用しない。branch名やcommitメッセージだけで省略する案は版／成功結果を証明しないため採用しない。問題時は本変更を通常PRでrevertし、包括検証へ戻す。保護設定・データ・依存の移行は不要。

## Verification and evidence

同一tree／異なるSHAの成功例と、結果偽装・欠落・失敗・旧attempt・版違い・未受入れの拒否、workflow分岐と迂回変更の拒否を検証する。その後PR包括検証→main実push→結果再利用→Prod全5照合を確認して実証完了とする。実Dev受入れの記録は本人の実受入れまで実行しない。[設計](../design/tr-003-verification-deploy-gates.md)、[手順](../runbooks/application-deployment.md)、[結果](../operations.md)。
