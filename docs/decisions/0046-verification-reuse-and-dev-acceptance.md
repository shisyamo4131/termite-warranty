# 0046 同一内容のPR検証再利用とDev受入れ記録

## 2026-10-14 追補：包括PRのアプリ検証とRulesを並行実行

本人の追加指示により、包括検証のアプリ側6gateとRules3群を別VMで同時実行する。必須check名 `Verify development deployment` は成功集約として維持する。アプリjobが作ったHostingを一度だけ保存し、集約jobが同一checkout SHA/tree/run/attempt、6gateの実step成功、一意なHosting artifact IDとGitHub metadataを照合する。Rulesは既存の同SHA/run/attemptの全試験・終了証跡を集約する。両方成功した場合だけ包括証跡を発行する。片側の成功や残存Hosting単独を配備／再利用の許可にしない。

理由は、Rules完了後のアプリ検証待ちを短縮するため。新しい試験形式・API polling・再build・Cloud権限は追加しない。文書専用／証跡再利用時は両producerの正常skipを要求し、失敗・取消・異常skipは停止する。元PR→Dev→本人受入れ→mainの照合先は実際のgate所有jobへ更新する。旧方式の証跡を新版の証跡として受け入れず、既存のtree／trusted blob制約を維持する。統合後は新版のDev配備・本人受入れが必要であり、今回のdraft作成はそれらの承認ではない。

検証は包括7gate、文書分岐・並行producer・証跡／成果物の拒否系と独立レビュー、実PRの工程別比較。実Dev／Prod配備は別承認まで未実施。巻戻しは当変更一式を通常PRでrevertし、直列検証へ戻す。業務仕様・DB・既存保護設定の移行はない。

## 2026-10-14 追補：無影響の文書修正だけは配備しない

本人の明示指示により、成果物・実行設定に影響しない文書だけの変更には文書検証経路を追加する。許可した既存Markdown8件の通常ファイル修正に限定し、PRの実base→仮統合結果、merge pushのbefore→afterをそれぞれ照合する。混在・不明・新規／削除／改名・特殊ファイルは通常経路を維持する。両段階PRと文書governance／差分検査は必須。Cloud認証・build・配備・新たな本人業務受入れ記録は不要で、包括検証を実行した証跡も発行しない。

理由は、無影響の文書更新でアプリを再配備し、同じ業務の受入れを繰り返す必要がないため。アプリ／CI等を含む変更の包括検証・本人受入れ・Prod固有照合は変更しない。導入PR自身はCI変更を含むので通常経路を通す。対象・手順・巻戻しは[配備手順](../runbooks/application-deployment.md#文書だけの変更2026-10-14採用)。以下の「全変更で配備／受入れ」はこの限定例外を除く通常経路を表す。

## 2026-10-14 最終採用：改修→dev→mainの両段階PRと検証連鎖

本人の後続指示で、共通包括検証を改修branch→dev PRに集約する。dev統合後は、一意な統合PR・最新run/attempt・24時間以内・全tree一致・全7gate/3群成功・期限内artifactを照合して再利用する。PRで生成したDev Hosting成果物もrun/attempt/treeに結び付くartifact IDで取得し、digest不一致は拒否する。DevのHosting再buildは不要。証跡不備はDevで包括再実行し、統合PR不明は停止する。

Dev配備後の5照合と保護停止確認は必須。本人がそのDev版で業務受入れ後、dev上の手動受入れworkflowを実行する。記録runのhead・入力版・実Dev配備版を一致させ、owner／再実行actor・producer blob・30日以内の元PRとDev配備を確認する。Dev→main PRとmain統合後は、この元PR→Dev配備→本人受入れの連鎖を独立再検証する。mainへの改修branch直接PRは拒否する。受入れ欠落を包括試験で代替しない。PRの照合結果自体が不備ならmainは包括再実行するが、Dev受入れは省略できない。

両branchはPR必須・必須CI成功・最新base同期・管理者適用・force push/削除禁止とする。他者承認は従来どおり0人。development環境の許可branchはdevだけ。導入時は既存mainからdevを作成し、未統合PR17をdevへ向け直す。進行中試験は中断せず完了後に新方針へ切替。新方式の受入れ処理をmainへ先行直送する例外は設けない。

包括gate ID・試験内容・業務schemaは不変。Hosting/evidence/受入れartifactは30日保持。受入れ時には元PRが30日以内である必要があり、記録し直すだけで古い試験の期限を延長しない。Prod固有build・対象／成果物・全5照合は維持する。バックアップ等は保留、Devの既存退避情報は保持して有効化しない。問題時は該当enable=falseで新規配備を停止し、状態確認後、同じPR経路でrevertする。データ巻戻しとは区別する。

拒否系／分岐・成果物metadata・全7gate・実Dev push再利用／配備を検証し、本人受入れ前はDev→main実運用実証を未了と記録する。実証結果と工程別比較は[運用記録](../operations.md)。以下は前段階の採用経緯であり、本節が現行方針。

## Decision and rationale

Dev受入れ後、別変更の混入や競合解消がなく全ファイル内容が同じなら、mainで同じ業務試験を再実行する必要はない。merge commitのSHAの一致ではなく、Git tree（依存lock・試験・workflowを含む全追跡ファイル）の一致で判断する。PRの包括7検証は維持し、mainは信頼できる成功結果を再利用する。Prod固有build・対象確認・成果物検査・公開後5照合は毎回実行する。

採用した実装では同一repository/owner、mainへ統合済みの一意なPR、最新PR run/attempt、7 stepと3 shardの成功、実checkoutのtreeを名に含むartifactのGitHub管理metadataを検証する。PR結果は24時間以内に限定する。artifact本文や取得したコードを実行しない。版違い・CI結果の欠落／期限切れ／読取り失敗は包括7検証をmainで再実行する。統合元PRを確定できない場合は受入れ条件を判定できないため停止する。

dev→mainのPRとmain配備には、ownerによる明示的なDev受入れ記録も必要とする。記録は成功したdev push配備のrun/版/treeと結び付ける。自動試験成功を業務受入れの代わりにしない。受入れproducerの実装変更・別actor・版違い・失効は拒否する。保持／有効期間は30日。Dev自動配備の有効化と実際の業務受入れは別工程である。

## Compatibility, migration and rollback

包括gate ID・試験内容・業務仕様・DB schema・Cloud IAMに変更なし。CI読取り権限 `actions: read` と受入れ記録用手動workflowを追加する。導入以前のPR結果は新証跡を持たないため再利用しない。既存のfeature→main経路は維持し、dev→mainを使う際に受入れ記録を要求する。Dev→PRの包括検証重複はこの段階では残す。

従来の全再検証を恒常継続する案は、同一内容の重複待ち時間が残るため採用しない。branch名やcommitメッセージだけで省略する案は版／成功結果を証明しないため採用しない。問題時は本変更を通常PRでrevertし、包括検証へ戻す。保護設定・データ・依存の移行は不要。

## Verification and evidence

同一tree／異なるSHAの成功例と、結果偽装・欠落・失敗・旧attempt・版違い・未受入れの拒否、workflow分岐と迂回変更の拒否を検証する。その後PR包括検証→main実push→結果再利用→Prod全5照合を確認して実証完了とする。実Dev受入れの記録は本人の実受入れまで実行しない。[設計](../design/tr-003-verification-deploy-gates.md)、[手順](../runbooks/application-deployment.md)、[結果](../operations.md)。
