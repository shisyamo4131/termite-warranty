# Business Workflow

## 2026-10-08 初期出力とDev容量試験の現在地

初期提供はCSVまでとし、保証書出力・印刷品質検証は後発。保証書CSVは現行画面で無効のため別途実装が残る。初期投入はオーナー準備データの提供まで保留。[Dev実測](../design/evidence/prod-readiness-2026-10-08.md)で300件取込・301件拒否・保険報告／請求CSVを検証済み。全取込・初期投入・保証書CSVの完成を意味しない。


## 2026-10-08 HS業務フローとDev検証

これは現行確定仕様から整理した初期HS業務の想定手順であり、HS実務担当者による受入完了ではない。初期はHSが入力し、ポータルは利用延期。オーナーが改修後Dev配備、物件／保証初期化、Devデータ作成・変更・無効化とフローの実行を承認。最初はCallable直接検証だけを行ったが、オーナーの「実画面でやらないと意味がない」との指摘に従い、続いてDevブラウザの入力・ボタン操作・実CSVダウンロードで再検証した。以下のAPI証拠と実画面証拠を区別する。実メール・保険会社提出・請求書発行・入金は行わない。

| 順序 | HS業務 | システム操作・確認 | Dev API検証結果（画面検証は次表） |
| --- | --- | --- | --- |
| 1 | 受付先・商品分類の準備 | 保証グループ→工務店→本店／支店を登録。所属固定、有効コードの重複防止 | 成功。架空2グループ・2工務店・3本支店作成。所属変更・重複コードは拒否 |
| 2 | 申込情報の受付 | 物件名・工務店・本支店を指定して下書き。未指定は保存拒否、本店も明示選択 | 成功。未指定の下書き／本登録を拒否。本店指定の下書きは未採番 |
| 3 | 本登録 | 日付・面積等を揃え確認後に採番。番号完全一致検索、訂正、二重送信の抑止 | 成功。確認なし拒否、採番、同一要求再送で改訂増加なし、完全一致検索、名称訂正、所属変更拒否 |
| 4 | CSVによる受付 | 取込み対象グループ・工務店を選択し本支店コード照合。プレビュー→全件確定、同じ操作の再送確認 | 成功。1行取込み、本店IDへの照合、初回10年、同一要求再送は既存結果を返却 |
| 5 | 保険会社への月次報告準備 | 対象月抽出・7列CSV出力、選択分を報告済みに更新。誤報告の取消・再報告 | 成功。新規報告と取消・再報告、保険満了一覧、5年更新と取消・再報告を実行 |
| 6 | 請求管理 | 申込／延長基準の月次一覧・CSV出力、対象保証区間の請求済み／取消 | 成功。11列CSV、初回請求済み→取消→再設定、延長区間の請求済み→取消 |
| 7 | 満了対応・延長 | 満了対象抽出、外部連絡後の案内済み記録、10年延長、誤延長取消 | 成功。案内済みで未案内一覧から除外、延長で未案内へ戻る。10→20年・延長取消10年・再延長を確認 |
| 8 | 誤登録・誤取消への対応 | 理由付き取消、取消中操作拒否、理由付き復元、番号・期間・保険状態の保持 | 成功。取消中の延長拒否、復元後の番号・保証満了・保険満了の一致 |
| 9 | マスタの利用停止・再開 | 本支店無効化で新規停止、既存保証と名称保持、無効中編集拒否、再有効化 | 成功。無効本店への新規登録と改名拒否、既存保証の訂正・名称維持、再有効化 |

業務上の未実装・未確定も分けて報告する。正式保証書用CSVはWordひな型への対応が未完了で、見本PDFを正式発行とみなさない。終了保証の退避CSV・削除／復元運用は別の未完成機能。実提出・請求金額計算・請求書出力・入金・自動通知は今回のシステム検証対象外。これらはDevで成功した業務に含めない。本支店コードのグループ条件付き必須化は後続の `b5bcb354` で実装・Dev配備・実画面検証済み（[結果](../design/property-bulk-import.md#branch-code-required-01-条件付き必須)）。新規データに存在しない旧請求状態「要確認」の解消、アカウント管理・システム設定・復旧運用は今回の通常業務フローの実行対象外。

### 2026-10-08 Dev実画面での再検証

Dev Hostingに専用架空HS管理者でログインし、画面に表示された項目・確認ダイアログを操作した。通常業務の状態変更にAPI直呼びを代用しなかった。APIで作成済みの架空マスタ／過去日付の物件は一部の事前データとして利用した。検証用認証アカウントの準備・後片付け、事後の整合性／Functionsログ取得だけは開発用スクリプトで行った。

| 順序 | 実画面で実施した操作 | 確認した結果 |
| --- | --- | --- |
| 1 | 保証グループ「実画面検証保証」→「実画面検証工務店」→本店を登録 | 階層ごとの一覧へ遷移。本支店の所属工務店／工務店の所属保証グループは登録後の編集画面で変更不可 |
| 2 | 工務店だけ指定して下書き保存→本店選択→保存 | 本支店未指定は「入力・選択してください。」で停止。明示選択後に未採番の下書きとして保存 |
| 3 | 下書きを開き日付・面積・住所を入力→確認チェック→本登録→名称訂正 | 確認前の実行ボタンは無効。`QA85F17F-26-002` を採番し「実画面検証・訂正済み」へ変更 |
| 4 | テンプレートをダウンロード→架空CSVをファイル選択→内容検証→確認チェック→全件本登録 | 本支店コード001のプレビューと1件本登録成功を表示。`QI85F17F-26-002`／「実画面検証・CSV物件」は本店に所属。番号完全一致検索で1件表示 |
| 5 | 保険報告一覧で1件選択→CSV実ダウンロード→報告済み→取消。過去の更新物件で更新取消→保険満了一覧→再報告 | 7列CSVの選択行・値を確認。新規報告後に一覧から除外、取消で未報告へ。更新取消は満了2031-10-07→2026-10-07、再報告で2026-10-08〜2031-10-07へ |
| 6 | 初回保証を請求済み→理由付き取消。請求用一覧で番号検索・1件選択→CSV実ダウンロード | 請求済み／未請求の表示切替、11列CSVに本店・保証番号・期間・未請求を確認。延長分の請求切替はAPI検証のみ |
| 7 | 10年間延長→理由付き取消。過去物件の延長取消→未案内へ戻す→保証満了一覧で案内済み | 保証番号を保ち10→20→10年、満了2036→2046→2036。未案内で1件表示、案内済みで0件。延長後の案内リセットはAPI検証のみ |
| 8 | 理由・確認チェック付き物件取消→理由付き復元 | 取消済みで入力欄が無効、保存／延長不可。同じ番号・期間で復元 |
| 9 | 本支店コード重複→本店無効化→無効本店と同コードの支店登録→本店再有効化→重複解消→再有効化。工務店無効化／再有効化 | 有効同士の登録・再有効化は409で拒否。無効コードの再利用は成功、支店をUI02に変更すると本店UI01の再有効化成功。無効本支店・工務店は全欄閲覧専用、保存ボタンなし |
| 10 | 新規物件で工務店を絞込み→本店選択→工務店クリア・別工務店選択→ログアウト | 新規マスタが候補に反映。旧本支店選択が消え、候補が別工務店の本店001だけに変更。ログアウトで業務画面が消えログイン画面へ |

実ダウンロードは保険報告CSV・請求CSV・取込みテンプレート。架空データだけを使用。画面証拠はローカルの `tmp/ui-branch-required.png`、`tmp/ui-branch-reactivation-rejected.png`、`tmp/ui-csv-import-completed.png`、`tmp/ui-import-property-search.png`。これらは作業用画像であり追跡対象には追加していない。

初回ログインはnetwork-request-failed、同じ正規ログイン操作の再実行で成功した。処理中に物件リンクを操作すると開かなかった場面は処理完了後に成功しており、恒常的な読込不具合とは判定していない。CSV確定処理中には結果未確認の案内が一時表示され、その後1件成功へ遷移した。これらの一時表示・操作感はUI/UX上の継続確認事項。

`node tmp/ui-workflow-postcheck.mjs` は通常Local権限でexit0。18:09:17〜18:27:07 JSTのログ窓でFunctions計測132件（server_observed 115、client_reported 17）を受信。実画面操作のsave/register/bill/undoBill/extend/undoExtend/cancel/restore/report/undoReport/notify/saveGroup/saveCompany/saveBranch/reenableMaster/preview/commitを含む。ログにUIDは含めないため、この時間窓の全件を専用ユーザーだけのものと断定しない。6物件すべて本支店あり・会社所属一致、normal世代10。UIでログアウト後、専用アカウントとプロフィールは所有照合して削除、一時認証ファイルも削除した。最初のsandbox実行は通常ユーザーのTempと異なるためENOENT・exit1で、Cloud処理前に停止した。

上表にない全画面・全分岐の網羅試験、実利用者のUI/UX受入、外部提出は未実施。無効本支店を参照する既存保証の継続編集・名称保持と二重送信はAPI／Local回帰の証拠であり、今回の実画面成功へ水増ししない。

### 2026-10-08 実行証拠と配備状態

配備版は `1800e018e98a91b759e143be67e7c3cc90ae5a14`（primary/main、pushなし）。変更したruntime/testは `app/components/MeetingPrototype.vue`、`functions/property-warranty.js`、`test/property-warranty.test.mjs`、`test/emulator/property-warranty.test.mjs`、`test/emulator/isolated-property-import.test.mjs` の5ファイル。本支店必須の画面・サーバー判定、旧空欄の「未指定」表示、明示本店fixtureと拒否回帰を追加した。共有Store・レイアウト・既存データの無効所属の扱いは維持。対象はUI・application-logic・保存契約・文書・deployで全7ゲート、省略なし。独立レビューの旧fixture／範囲拡張指摘を解消し、既存draftの無効所属保存ルールは拡張せず維持した。

| 検証コマンド | 最終実測 | exit |
| --- | --- | --- |
| `npm test` | 350件中348成功、既存symlink制約2skip、失敗0 | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | 成功 | 0 |
| `npm run test:rules` | 139成功、Emulator停止済み | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `./scripts/check-governance.ps1` | 成功。結果記入後も再検査 | 0 |
| `git diff --cached --check` | commit前成功 | 0 |
| `npm run build:recovery-release -- --revision 1800e018e98a91b759e143be67e7c3cc90ae5a14` | 正式配信物生成 | 0 |
| `node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project termite-warranty-dev --non-interactive` | 20 Functions配備 | 0 |
| `node node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project termite-warranty-dev --non-interactive` | Hosting配備 | 0 |

初回単体はsandbox一時領域のrename EPERMで7失敗（exit1）、同じ試験を通常Local権限で実行して成功。初回Emulatorは旧空本店fixtureと新規旧draft fixtureのyears欠落により2失敗（exit1）。fixtureを契約に合わせ、最終全体139件を再実行。正式build初回はsandbox内でexit1、同じ版を通常権限で再実行してexit0。失敗した検証を省略していない。

正式照合：`node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision 1800e018e98a91b759e143be67e7c3cc90ae5a14 --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/1d80f052d9f2b352 --dev-inspect`。初回はexit0だがHostingファイルidentity-mismatchでblockedのため不合格。再配備なしで同じ照合を実行し、全10項目pass・exit0（Functions原本20、Hosting991ファイル）。初回差異の詳細原因は未確定。inspectのready=falseと全checksの結果を混同しない。

初期化：レビュー済み `node tmp/reset-property-fixtures.mjs inspect dev`／`apply dev` は各exit0。Dev物件19、操作receipt24、採番counter2、外部キー予約3、取込みsource3、取込みreceipt1の計52文書を、事前hash再照合付き単一transactionで削除。直後は6root全件0、保持7root直下文書hash一致。Auth操作・マスタ削除なし。保持rootの子collectionやAuthの全フィールド同一性まで照合したとは扱わない。Localは永続import/exportを指定しない専用Emulatorを新規起動して回帰後に停止、試験データを破棄。`node --input-type=module -e "import {assertEmulatorPortsFree} from './scripts/lib/test-emulators.mjs'; await assertEmulatorPortsFree(); console.log('Local emulator ports free; no running local data process')"` はexit0。継続稼働中のLocal DBや移行対象はなかった。

業務検証：`node tmp/hs-dev-workflow.mjs termite-warranty-dev` はexit0、12シナリオ成功。DevのFirebase Authで架空HS管理者としてログインし、実Callableを呼び出した。保険／請求CSVは実コンポーネントのexportCsv関数をDev取得行で実行しBlobを検証、DOMとダウンロード操作は代替した。ブラウザ操作やUI/UX受入の完了とは区別する。専用Auth／staffプロフィールは所有確認して削除済み。作成前run別journal、結果不明時の掃除保留、個別cleanupを独立レビューした。架空業務データはオーナーが画面で確認できるよう残した。

事後照合：`node tmp/hs-dev-postcheck.mjs` はexit0。4物件すべて本支店IDあり・会社所属一致、従前のマスタ／アカウント直下文書は検証用追加分を除いてhash一致。normal世代10、実行中operation0、運用ロックなし。Functionsログに今回の処理別計測80エントリを実受信（拒否試験はfailureとして記録）。`node tmp/store-backup-postcheck.mjs` はexit0、20 Functions自動取得false、Scheduler PAUSED、PITR無効、予定・Firestoreバックアップ0を維持。

Devに残した確認用物件（全件有効・本店を明示選択）：

| 物件名 | 保証番号 | 現在保証年数 |
| --- | --- | --- |
| 業務検証・既存保証継続 | QA85F17F-26-001 | 20年 |
| 業務検証・満了案内 | QA85F17F-16-001 | 10年（実画面で延長取消後、案内済み） |
| 業務検証・保険更新 | QA85F17F-21-001 | 10年 |
| 業務検証・CSV登録 | QI85F17F-26-001 | 10年 |
| 実画面検証・訂正済み | QA85F17F-26-002 | 10年 |
| 実画面検証・CSV物件 | QI85F17F-26-002 | 10年 |

仕様・branches-and-addresses・実演データ契約・operations・技術改修台帳・CHANGELOGを今回の状態へ整合。新しいADR・全体進捗加点・Rules/IAM/依存版/ガバナンス変更はない。既存文書差分と今回記録は未コミットで保全、runtimeは上記commitに固定済み。コードの差戻しだけで削除したデモデータは復元しない。次のユーザー作業は実施結果と既知残件の確認。開発側の実画面検証は上記のとおり実施済みで、利用者のUI/UX受入を代替するとは扱わない。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 初期案内状態と取消（仕様書0.1.84）

取消・復元で満了案内状態を保持し、取消中は案内対象外、復元時に状態・満了日で対象再判定する。初期登録は未案内を基本としHSが確認できる案内済みだけ継承。保険報告は全件未報告で開始する別ルール。根拠：同日①②YES、HSC-005/015。実装未変更。

## 2026-10-03 確定：工務店・支店の無効化

工務店・支店は削除せず無効化し、新規物件の登録先から除外する。既存物件との関連と保証は保持し、HSは既存保証の訂正・延長・保証書出力・保険報告を継続できる。これは当該保証自体が取消済みの場合の操作制限を解除するものではない。

工務店の無効化は配下の全支店の新規登録も停止する。支店単独の無効化は本店・他支店へ波及しない。再有効化可能だが、工務店を再有効化しても個別に無効化した支店は無効のままとする。親の無効による実効的な停止と支店自身の無効状態を区別する。ポータルのログイン・アカウント停止を自動連動させる判断は今回に含めない。

根拠：2026-10-03本Codex会話の無効化3項目への「すべてYES」。仕様書0.1.67、HSC-038。未実装・未配備。



## 2026-10-03 確定：取消中の操作・保険情報・誤登録

取消中の物件／保証は閲覧とHSによる理由付き復元のみ可能とし、内容編集・保証延長・保証書出力を禁止する。満了案内と通常の保険報告対象から除外し、取消済み記録は検索して確認できる。

取消・復元だけでは保険報告状態・保険満了日・保険必須更新年月を変更しない。復元時は保持した情報から報告対象を判定し、新しい保険期間を設定しない。保険会社との訂正で情報変更が必要となる場合の手順は別途整理する。物件／保証の取消と報告済み取消は別操作で、取消中に後者を操作できるという意味ではない。

誤登録・重複登録も理由付きの「取消」に統一し、「無効」を別機能にしない。データ・番号保持、番号非再利用、元の保証期間での復元、HSによる対外連絡という既決方針は維持する。

根拠：2026-10-03本Codex会話の①②③すべてYES。仕様書0.1.66、HSC-035。初期HS運用の確定で、既存旧データのinvalid状態の移行や対外訂正後の保険情報補正手順は未確定。今回文書のみ更新し、アプリ・データ契約・配備は変更しない。



## 2026-10-03 確定：物件／保証の取消と復元

- HSは理由を入力して物件／保証を取り消せる。データと保証番号を保持し、番号は再利用せず、取消済みとして確認できる。
- 誤取消はHSが理由を入力して復元できる。元の保証番号と保証期間を維持し、復元日から期間を数え直さない。
- 保証書発行済み・保険会社報告済みでもHSは取消可能。取消前の確認画面で、交付済み保証書の回収・無効の連絡や保険会社への訂正連絡の要否を確認するよう促す。対外対応はHSが行い、システムから自動連絡しない。保存済み・印刷済みの保証書がシステム取消によって消えるわけではない。

根拠：2026-10-03本Codex会話の①②③へのYES。仕様書0.1.65、HSC-035。初期のHS運用についての確定であり、ポータル再開時の工務店権限を承認するものではない。取消中の操作・一覧表示、保険状態や満了日の保持／復元、取消と誤登録無効化の区別は後続確認。理由を含む記録は必要だが、全操作履歴の形式・保持期間まで決めたものではない。今回文書のみ、アプリ・データ契約・配備は変更しない。



## 2026-10-03 初期リリース：HSによる満了案内

工務店ポータルの利用は延期し、初期の入力業務はHSが行う（HSC-013）。保証の満了案内対象をシステムで一覧表示し、工務店への連絡はHS担当者がシステム外のメール・電話等で行う。HSは物件ごとに「未案内／案内済み」を切り替えて連絡状況を記録する。保険会社への報告状態とは区別する。満了案内の自動配信は含めず、既定2か月前・設定変更可能を維持する（HSC-005、仕様書0.1.64）。以下のポータル連絡フローは初期運用には適用しない。保証を10年間延長したら、満了案内の状態を「未案内」に戻す。新しい満了日の案内開始時期（既定2か月前、設定に従う）に達するまでは案内対象一覧に表示しない。2036年満了から2046年満了へ延長した場合も同様。保険会社への報告状態は変更しない。 満了案内一覧は通常「未案内」のみを表示し、HSが「案内済み」「すべて」に切り替えられる。対象10件のうち3件を案内済みにすると、通常表示は残り7件になる。「すべて」は案内対象内の両状態を意味し、案内開始前の物件まで表示対象を広げない。 設定された最長20年／30年に達する最終満了の物件も案内対象に含め、「最終満了・延長不可」と識別表示する。最長20年で20年目、最長30年で30年目を迎える場合が該当する。 未案内の物件は満了日を過ぎても案内対象一覧に残し、「満了済み」と表示する。10月5日満了なら10月6日に自動で消さず、案内済みにするまで通常の未案内一覧に残す。保証延長時は未案内へ戻し、新しい満了日の案内開始時期に基づいて表示対象を再判定する。 初期リリースでは満了案内の現在の状態（未案内／案内済み）だけを管理し、連絡日時・担当者・過去の連絡履歴は持たない。工務店ポータルの利用開始時には要件が変わる可能性があるため再検討する。これは満了案内に限る判断で、保証の延長履歴・保険報告状態・技術的なログの扱いを変更しない。 物件／保証の新規本登録時は案内状態を「未案内」とする。登録直後から案内一覧へ表示するのではなく、設定した満了案内開始時期に達してから表示する。この状態は保証書交付の有無を意味しない。 ポータル開始時の再検討はHSC-005で管理する。今回アプリ・配備は未変更。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

HS branch exclusion (2026-10-01, HSC-033): target registration/editing does not ask for an HS responsible branch. Any responsible-branch requirement below is prototype behavior pending removal. This does not remove construction-company branches or decide the portal's approval-free submission proposal.

## Current FileMaker-Service Workflow — Context Only

1. A construction company enters new-case or renewal information in a web form on a simply authenticated shared member page.
2. The form delivers the entered information to staff by email.
3. The staff member manually registers the information in the legacy system.

The new service does not reuse this member page because it does not identify construction companies individually and does not satisfy the new service requirements.

## Confirmed Target Construction-Company Workflow (2026-10-01)

HS issues company accounts. Authenticated head-office/branch operators register their company's properties and warranties and extend coverage without waiting for HS approval. Successful submission registers the business result. New numbering uses the assigned warranty group and application-date year with a continuing group sequence; renewal preserves the warranty number and period history. Company ownership, input validation and account disablement remain required. Branch-specific assignment/account details, correction/cancellation and downstream certificate/reporting automation are separate decisions. See [ADR 0034](../decisions/0034-company-registration-without-hs-review.md).

## Existing Prototype Construction-Company Workflow — Review Superseded

1. A House Solution administrator issues or disables one shared account per construction company; the construction company sets or resets its own password.
2. For renewal, staff create a case-linked pending work item and the system queues an email notification. For a new case, the construction company starts a new request.
3. The authenticated construction company enters a response and submits it. The current operator enters a name, while the response email is derived from the authenticated shared account. Only its own provisional data can be accessed or changed.
4. Submission locks company editing and queues a House Solution notification.
5. Staff review the structured response and either atomically promote it to registered data or return it with a reason.
6. A return reopens company editing and queues a construction-company notification.
7. Before approval, the construction company may withdraw its own new-case request with a required reason. The work item remains as an audit record and cannot be reopened.

This describes existing prototype behavior, not the newly adopted approval-free target. Email delivery, reminder timing, retention, detailed audit needs, and production service/security behavior remain open under their respective matters.

Homeowners do not receive direct application access in the initial release: there is no homeowner account, login, my page, warranty/document self-service, application, or response workflow. Homeowner disclosure, correction, restriction-of-use, and similar requests are handled through a House Solution contact channel; the contact method and notification behavior remain open under HSC-005 and related matters.

## Initial Release — Confirmed Scope

The 2026-09-28 original answers Q4, Q6, Q10, Q12 and Q13 were accepted by the project owner for their unambiguous portions. Application date is the billing reference; handover date is the initial warranty and renewal-guidance reference. This records the dates' business meaning without adding a billing engine or changing the current manual-date correction behavior. Periodic inspections and historic inspection migration are excluded. Expiry guidance goes to construction companies, not homeowners. Monthly insurance reporting is defined separately in [insurance reporting](insurance-reporting.md).

The 2026-10-01 approval-free portal target supersedes per-submission staff review. Two-channel intake details and migration remain under HSC-013/HSC-015; the new workflow is not yet implemented.

- Company users perform new warranty registration and extension without HS approval. This does not remove existing HS staff administration functions.
- Staff can search and list registered information.
- The system alerts for warranty services nearing expiry.

The initial registration screen requires application date and handover date as case-level business dates, in addition to the required property, homeowner, construction company, responsible branch, and applied warranty information. No ordering rule between application date and handover date is currently specified. Remaining fields and validation rules remain open.

Entering or changing the handover date auto-fills the warranty start date while that start date is blank or still equal to the prior auto-filled handover date. A manually changed warranty start date is preserved. The same interaction applies to the construction-company new-case form.

Selecting a property automatically selects its registered homeowner and construction company for the case. Staff can change either selection before registration and while the case remains active. Changing the selected property on an active case reselects the homeowner and construction company registered on that property; staff can then change either value before saving.

## Permanent Warranty — Confirmed Target, Implementation Pending

The 2026-09-29 [permanent-warranty decision](../decisions/0033-permanent-property-warranty.md) requires one warranty per property across cases, with a permanent number and retained renewal periods. Registration and portal approval must eventually enforce this identity; their current prototype commands do not yet do so. The per-applied-record alert behavior below describes the retained prototype. The target period/notification association remains under HSC-005. The second questionnaire proposes staff-only operation; it has not yet replaced the previously approved company workflow (HSC-013).

## Alerting — Existing Prototype Behavior

The system must show an on-screen alert from 30 days before an applied warranty expiry through expiry. A case is visually emphasized and listed once when any of its applied warranties is alert eligible. Warranty-period and expiry-date details are viewed on the case detail screen. Staff carry out the actual notification at this stage and select `not notified`, `notified`, or `not required` for each applied warranty from a combobox; timestamp/user attribution and repeat behavior remain open.


## 2026-10-03 打合せ後の確定：初期運用はHS入力

オーナーが本日のHS打合せ結果として回答。10月末納期までに取引工務店へ周知する時間がないため、初期運用のすべての入力業務はHSが担当する。工務店側の入力機能は削除せず、利用開始を保留する。保証書出力はHS側だけの機能とする。

これは初期運用の担当変更であり、工務店機能の廃止や、将来再開時に都度HS承認を必須にする決定ではない。工務店への開放時期、既存アカウントの具体的な利用制御方法、印刷・発送担当の追加決定は含まない。現行試作のコード・配備・アカウントは未変更。HS限定出力の実装・検証は後続作業。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.33へ反映、未コミット。各事項の他の未決部分は継続管理する。
