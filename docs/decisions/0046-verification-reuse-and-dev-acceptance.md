# 0046 同一内容のPR検証再利用とDev受入れ記録

## 2026-10-15 PDF文書対象の拡張と配備なしの初回CI導入

オーナーはtask01a133e7-092f-71f0-b5e7-43a8b7833ab9で、PDF／生成元を文書検証だけでdev・mainへPR統合し、その前提となる初回CI改修は包括検証するが配備しない方針を承認した。既存8文書へ、日程PDF・専用生成元・同README・初期納品／過去物件ロードマップの計5ファイルを追加する。許可は正確なパスの既存通常ファイル変更だけで、拡張子やディレクトリの一括許可にはしない。生成元は配備から参照されない文書作成ツールであり、CIから実行しない。

初回導入は文書変更と偽らずciIntroductionとして区別する。比較元をdev482cbfd5c04b646c9fa54965344addfdf420df78／main8b65dc9bc6ba2cef356bdee3e054bba1c5ae3377に固定し、判定・専用読取検証器・workflowの包み方／契約試験・関連文書だけを許可する。アプリ、Functions、依存、Rules、配備設定、権限、他のworkflow変更・不明差分はこの経路へ入れない。最初の改修PRで包括7gateを実行し、後続のdev push／dev→main PR／main pushは一意な統合元PR・同一tree・最新成功run／attempt・24時間以内・7実step成功を再検証する。証拠不足は停止し、配備へ進めない。Cloud認証・Hosting成果物の発行・業務受入れ作成を行わず、既存の公開版と保護保留を維持する。

導入後は比較元が進むためこの限定経路は再使用できない。一般のCI変更を文書扱いする恒久例外ではない。通常の包括検証・配備・本人受入れの契約は外側の厳密な構造検査を外した後に従来通り検査する。変更混在・未知のパス・mode変更は通常経路とするが、今回の統合担当者はciIntroduction成功と配備jobのskipを確認してから統合する。失敗時は未統合のまま修正し、将来の撤回も通常PRで検証する。DB／アプリ／保護設定の移行はない。

PDF等を配備入力へ接続する将来変更では、同時に文書許可を見直す。今回の無影響根拠はpackage scripts、Nuxt入力、Firebase Hosting .output/public、Functions source、Prod bundle入力と参照検索で確認した。検証は限定差分・失敗／版違い／期限切れ／別主体／gate欠落の拒否系、通常workflow契約、包括7gate、両段階PR・pushの配備省略を含む。

## 2026-10-15 文書更新後の受入れ記録と限定的な導入修正（承認済み）

本人はDev22d5bacの受入れを明示し、文書更新後の記録不能を解消する修正・検証・dev→main統合・Prod配備を承認した。旧実装の「実配備SHA＝現dev先頭」は文書専用配備省略と両立しないため、受入れた実配備・包括検証の証拠を保持したまま、後続が許可8文書の既存通常ファイル変更だけと独立確認できる場合は記録／昇格を許可する。全Git treeの欠落なし・祖先関係・文書push検証成功を要求し、アプリ・設定・新規／削除／改名・特殊ファイル・失敗は拒否する。文書先頭のtreeを実配備済みtreeと偽って記録しない。

導入時だけ、受入れ版22d5bac7c47f101fdf8b0522f8108edf16d06330から、dev文書先頭bb9e2f97fcaf09242349b9f6a6f256acbf003047を第1親とする次の2親mergeへの修正を許容する。許可差分は既存8文書、当ADR、受入れworkflow、development-acceptance.mjs、verification-evidence.mjs、lib/verification-evidence.mjsの固定SHA比較API読取り、既存verification-evidence試験のみ。新規／削除・配備workflow・ビルド・権限・アプリは含まない。修正版は独立した包括PR成功とDev実配備・全照合成功を必須とし、旧版の本人受入れと新版の技術検証を別々に保持する。この例外を一般のCI変更や後続mergeに拡張しない。

v2 artifactは記録tree・本人受入れ配備run・技術検証配備run・attemptを結び付ける。記録は現dev checkoutで行い、実行中にdevが進んだら拒否。PR／mainで元配備と修正版の証拠、文書連続性、所有者・有効期限・producer blob・全検証結果を再照合する。旧v1は同一版だけの厳格な条件を維持する。新たな業務受入れを捏造しない。問題時は配備enableを停止し、通常PRで修正を戻す。データ巻戻し・保護有効化・権限変更は含まない。

## 2026-10-14 追補：包括PRのアプリ検証とRulesを並行実行

本人の追加指示により、包括検証のアプリ側6gateとRules3群を別VMで同時実行する。必須check名 `Verify development deployment` は成功集約として維持する。アプリjobが作ったHostingを一度だけ保存し、集約jobが同一checkout SHA/tree/run/attempt、6gateの実step成功、一意なHosting artifact IDとGitHub metadataを照合する。Rulesは既存の同SHA/run/attemptの全試験・終了証跡を集約する。両方成功した場合だけ包括証跡を発行する。片側の成功や残存Hosting単独を配備／再利用の許可にしない。

理由は、Rules完了後のアプリ検証待ちを短縮するため。新しい試験形式・API polling・再build・Cloud権限は追加しない。文書専用／証跡再利用時は両producerの正常skipを要求し、失敗・取消・異常skipは停止する。元PR→Dev→本人受入れ→mainの照合先は実際のgate所有jobへ更新する。旧方式の証跡を新版の証跡として受け入れず、既存のtree／trusted blob制約を維持する。draft検証後の追加承認はPR23／24のDev統合・自動配備・実測まで。新版の本人業務受入れ、main統合／Prod配備の承認を含まない。

検証は包括7gate、文書分岐・並行producer・証跡／成果物の拒否系と独立レビュー、実PRの工程別比較。Dev実測は追加承認の下で行い、結果は運用記録へ残す。Prodは未承認。巻戻しは当変更一式を通常PRでrevertし、直列検証へ戻す。業務仕様・DB・既存保護設定の移行はない。

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
