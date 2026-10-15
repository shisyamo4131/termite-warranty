# 0047 統合前の一度の検証と非製品変更の1PR化

- Status: Accepted; merged to main, not synchronized to dev or deployment-proven
- Date: 2026-10-15
- Approval: 親タスク `01a1186d-ebfa-70e3-9fa5-67accdb2202e` が04:56 UTCの本人承認を確認。専用branchで実装・試験・独立review・push・draft PRまで。merge、Dev/Prod配備、権限・設定・データ変更は未承認。
- Additional approval: 同日の本人「見積もり報告後、PR #35の反映を許可する」に基づき、Prod昇格前の機能試験工程を除く追加修正を承認。再検証はDev側または試験・CI変更の技術確認へ戻す。統合・配備の承認は含まない。
- Integration approval: 同じ親タスクで本人がPR35のmain統合と非配備の文書・Local再利用測定を承認。PR35は07:26:38 UTCにmain `36249552c41ea31077575eb93535df5625f77311`へ通常merge。Dev/Prod配備、実データ、IAM・保護・OS設定変更は対象外。以前の候補段階の承認境界・governance索引の未統合記述は当時の状態として読み、現在値はこの承認と運用記録を優先する。
- Supersedes: [0046](0046-verification-reuse-and-dev-acceptance.md)の現行経路。既存の実行記録と本人受入れの事実は保持する。

## 判断

製品は改修→検証→Dev配備→Dev受入れ→Prod配備→Prod受入れとし、改修→dev→mainの2段階PRを使う。成果物に影響しない試験・CI・文書は通常main向け1PRとする。機能試験の責任はDev受入れまでに完了し、Prod昇格PRは実行済みの確認と製品の同一性を照合する。branch保護と必須check `Verify development deployment`、環境の許可branch、Cloud権限を変更しない。

現在の全tree・24時間/30日期限・現在producerとのbyte一致は、記録やCI修正を製品の変更と結合する。新方式では検証入力と製品入力のdigestを分ける。通常文書は両方から除外、試験・CIは検証入力だけへ含める。未知の既存ファイルは製品入力へ含め、未知差分・特殊mode・比較不能は停止する。Functions配下の試験も実配備sourceなので製品入力である。`scripts/**`の一括除外はしない。正本は `scripts/lib/change-scope.mjs`。

必要な共通試験は上流の検証PRに置く。Localを使わない場合は改修→devまたは試験・CI変更PRで包括7gateとfocused回帰を実行する。Localを使う場合は `scripts/local-verification.mjs` が固定npmのクリーンinstall後に固定commandを実行し、全gateのexit、単体/focusedの全件・fail/skip/cancelなし、Rules全群とEmulator終了を記録する。owner本人がPRへ投稿した `TERMITE local-verification` commentのJSONだけを承認として読む。PR作者・run actor・JSON内の自己申告IDを承認に代用しない。これは本人による実行結果の明示証言であり、遠隔署名・改竄不能な実行証明ではない。第三者/forkを信頼範囲へ拡張しない。本人commentのIDと内容digestをartifact名へ結び付け、後続で編集・削除・新しい記録があれば元PRの再確認へ停止する。

Local/CIの互換profileはWindows、PowerShell 7、Node 22、npm 11.19.1、Java 21と固定lock。完全なruntime文字列も保存する。許可profile内でも試験省略や未完了があればLocal再利用を拒否する。入力digestはPR headだけでなく仮統合checkoutで照合し、base更新・競合解消・依存変更を見逃さない。製品PRではLocal試験を再利用しても環境用HostingをCIで生成する。配備jobでの再buildはしない。

Dev pushは元PRの最新run/attempt成功と同じ入力のartifactを確認して配備する。証拠欠落・失敗をdev/mainで包括再実行して補わず停止し、元候補の検証を直す。GitHubの成功runとartifact metadataを使い、現在方式では表示名/全step配列の再照合をしない。artifact消失/期限切れは利用不可だが、成功という事実を24時間経過だけで取り消さない。古い成功runを選んで最新の失敗を隠さない。

業務受入れはownerが昇格PRへ投稿する `TERMITE dev-acceptance` commentへ集約する。実Dev配備run・製品digest・明示accepted・参照を必須とし、Devの配備後照合marker、元PR証拠、同製品入力を検証する。製品不変の記録やCI変更だけでは本人受入れを無効化しない。検証入力だけが変われば必要な技術試験を別途実施する。新しい手動受入れworkflowは作らず、旧workflowは退役する。

dev→main昇格には機能試験工程を置かない。受入れ時と技術入力も同じなら元の確認を使う。異なる場合は、昇格PRのdev headの実treeと仮統合候補の製品・検証入力が一致し、上流の一意なdev統合PRの最新run/attemptに同じ入力の成功証拠があることを必須にする。記録だけの後続commitは、first-parent上の製品・検証digest不変を一つずつ確認して越え、入力が最後に変わった統合revisionを参照する。任意の成功runを探さず、その元PRの最新失敗・Local承認の編集/削除/撤回を拒否する。履歴不完全・64commit以内に境界を特定できない場合も停止する。不足・不一致・撤回を昇格PRのLocal記録や包括試験で補わない。main pushでも同条件を再確認する。次のDev作業が先へ進んだだけで受入れ済み候補を失効させないよう、参照は昇格PRの固定headと実行証拠へ結び付ける。配備するmainの最新候補確認は認証前に維持する。

mainで確認した非製品変更をDev候補へ取り込む必要がある場合だけ、main→dev同期PRを許可する。同期前devと仮統合結果の製品digest不変を要求し、試験・CI入力は同期候補で技術確認する。文書だけなら文書確認のみ。同期pushは配備せず、製品不変の業務受入れも取り直さない。mainの変更で仮統合入力が変わる場合、先に同期・検証を終える。任意の非製品branch→devや技術変更だけのdev→mainを別の試験入口にはしない。文書追記だけで前の技術確認を取り消さず、上記の入力不変な履歴で参照を維持する。

製品変更・動作に影響する依存/設定変更・製品を変える競合解消はDev検証・必要な業務受入れへ戻す。試験/CIだけの変更は技術確認へ戻し、同製品の受入れは保持する。Prodには必要な環境別build、配備先・認証・設定・成果物確認、公開後の実版照合を残す。Prod受入れは公開先でログイン、代表的な読取り、権限/接続先の確認に絞り、同じ自動照合や業務全機能試験を再演しない。通常文書だけなら機能試験・配備・新たな業務受入れは不要。

移行時に既存run38675079811を、当時の承認producer `0dc6acaa99e27c90f2a18167d96d2f1cb737af23` と照合して読めるようにする。旧v2の本人受入れ版と技術検証版の区別を保持する。旧readerと拒否試験は互換処理として残し、新規経路へ旧fallbackを再使用しない。任意の旧同名artifactは受け入れない。

PR検証と配備の待ち列を分離する。baseline対shardの性能比較は手動検証へ移し、runner方式を変える際だけ実施する。通常PRには追加のbaseline全試験を自動起動しない。環境別配備は非取消で直列化し、認証直前にbranchの現候補であることを確認する。Dev/Prodの固定対象、認証前guard、bundle digest、配備後5照合と保護保留は維持する。契約試験はこれらの条件と失敗停止を検証し、表示名・独立gateの並び・全YAML一致への結合を外す。

記録文書を検証入力digestへ含めない代わりに、governanceは最新PR文書に対して集約jobで一度確認する。Local／Dev証拠を再利用するPRでも省略しない。アプリ側との二重実行は削除し、統合後pushは元PRの結果を使う。

## 比較・効果の測定

現行維持は移行リスクが小さいが往復を残す。PR廃止/直接pushは保護変更と個人操作への依存を伴うため採用しない。今回の案はPRによる確認を残す。

PR31〜34の全工程33分42秒にはCI改修とLocal作業を含む。PDF4回の文書検証は計5分50秒。1回1分30秒と仮定した約4分20秒削減は推定であり実績ではない。実装後は同種変更のPR本数、手動操作、再試験回数、作業開始から記録完了まで、run待機/実行時間を測る。並行runの時間を直列総時間へ加算しない。

## 移行・切戻し・承認境界

包括検証・独立review済みのPR35をmainへ統合し、非配備経路を測定する段階。dev同期と実Dev/Prodの実証は別承認。非製品main変更は次の製品PRの検証前にdevへ取り込み、同期だけの再配備/受入れを増やさない。本人のHS試行10/16・19（2営業日）と保護のリリース直前までの保留は変更しない。

切戻しは当変更一式を通常PRでrevertする。旧記録・artifact・公開環境を消さない。Git revertをデータ復元と混同しない。新方式の成果物を旧方式の名前へ付け替えず、必要な候補検証を旧経路で取り直す。変更後は包括7gate、routing/governance focused回帰、owner/版/部分成功/最新失敗/artifactの拒否系、独立reviewを選択する。新方式の実配備成功は承認後の実測まで未実証とする。
