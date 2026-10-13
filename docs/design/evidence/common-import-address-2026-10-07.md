# 共通CSV・単一住所のLocal検証とDev準備

## 2026-10-07 外部キー改修のDev反映・通常再開

オーナーの「改修が終わったらDevに反映。私が受入れ検証します」と、住所確認済み／通常Dev再開の別了承を受けて実行。追加13実装・テストファイルだけを`cbb58598e3cece7f2118911da2569fe0ecfa5487`へ統合（git commit exit0）。その13ファイルは下の一覧と同じ。主要作業ディレクトリで既存の文書・UH資料差分を保全し、別worktree・Git pushは使用していない。ソース／設定範囲はHEADと一致、index空。残る文書／資料の未コミット状態は実装コミットへ混ぜていない。

旧住所公表計画はf9c275bに固定されているため、追加ソース13ファイルを選択的に一時保全し、旧版の正式照合と旧計画のreopenを先に実行した。Local元ファイルの改行形式により配備原本とのbyte一致が失効し、旧サーバーの公開ソース5ファイルはGitの意味内容一致を確認して原本の改行へ合わせた。旧画面はVue scoped IDを含む成果物が異なったため、同じf9c275bの決定的buildを再生成してHostingへ反映（exit0）。照合を弱めず旧全7ゲートを再実行（旧domain275成功・2skip、旧Rules125成功）。正式preflight全項目passの後、`address-dev-20261007-publish1`を`owner-dev-extkey-reopen-20261007`でreopenし、normal／世代10へ遷移（exit0）。旧preflightのblockedを成功証拠として扱わない。一時保全を同じ作業ディレクトリへ復元し、13ファイルの意味内容一致を確認して追加コミットを作った。一時保全・旧source参照・非公開住所保全は削除していない。

追加コミットに対し選定全7ゲートを実行し直した。先のraw-byte集約hashは一時保全前のLocal状態の記録であり、今回の配備証拠は実HEAD cbb5859・fresh build・provider原本との比較に結び付く。ドキュメント最終更新後もgovernanceを再実行する。

| コマンド | 結果 | 独立観測exit |
| --- | --- | --- |
| node scripts/check-functions-syntax.mjs | 配布domain準備・構文成功 | 0 |
| npm run typecheck | 成功 | 0 |
| npm test | 282件中280成功、既存2skip、失敗0 | 0 |
| npm run build | 成功 | 0 |
| npm run test:rules | 架空demo限定、126成功・失敗0 | 0 |
| node --check scripts/seed-emulator.mjs | 成功 | 0 |
| ./scripts/check-governance.ps1 | 配備前の文書・検証ポリシー整合成功 | 0 |
| node scripts/build-recovery-release.mjs --revision cbb58598e3cece7f2118911da2569fe0ecfa5487 | 決定的配備成果物生成 | 0 |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project termite-warranty-dev --non-interactive | 既存19 Functions反映 | 0 |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project termite-warranty-dev --non-interactive | Dev画面反映 | 0 |
| node scripts/default-recovery.mjs preflight --project termite-warranty-dev --control recovery-control --revision cbb58598e3cece7f2118911da2569fe0ecfa5487 --source '(default)' --generation 10 --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/b053d7fc67931cde --dev-inspect | 最終全項目pass、19処理／19原本、993配信ファイル、11索引／30除外、通常10・ロックなし | 0 |
| node tmp/extkey-initialize-uh.mjs --apply-approved-uh | 対象再読取・transaction・readback：UHの必須true／名称設定の2項目だけ更新。他項目不変、所属物件・会社0 | 0 |
| node tmp/extkey-dev-after-read.mjs | 19 ACTIVE、保護自動取得false・PITR無効・日次予定0を再確認 | 0 |
| node tmp/extkey-dev-public-check.mjs | 公開画面HTTP200、公開runtime normal10／(default)、未認証の業務呼出401 | 0 |

新Hosting版は`sites/termite-warranty-dev/versions/f97cf1b40612d67f`、配信先は[Dev](https://termite-warranty-dev.web.app)。最初の追加preflightはhosting-release-proofだけblocked（コマンドexit0は検査完了であって通過ではない）。独立調査でアプリ991ファイルは全byte-hash一致、Firebase提供2ファイルも旧同site版と一致、設定も一致した。正式な同じpreflightを再実行し、全項目passを確認した。初回の原因は確定しておらず、配備直後の反映遅延等と断定しない。read-only modeのready:falseは実行許可を与えない表示であり、個別check結果と区別する。

UHの`externalKeyRequired=true`、`externalKeyLabel=お施主様契約No`は実文書へ保存・readback済み。現在のUH配下工務店0件なので、UH登録を受入する前に工務店・支店の登録が必要。本作業で物件データやAuthを変更する操作、実UH資料の取込み、バックアップ/PITR再開、IAM／Rules／索引変更は行っていない。増えた取得は配備／再開の照合と限定したUH初期設定確認であり、通常画面の恒常Read追加ではない。

文書最終整合後の`./scripts/check-governance.ps1`と`git diff --check`も実行完了、各exit0。後者は既存ファイルのLF/CRLF変換予告のみで、空白不備なし。実装13ファイルはcbb5859に統合済み、app/src/functions/scripts/testおよび主要設定の差分なし、index空を再観測した。文書・既存UH資料の差分は保持。文書だけの最終追記でruntime入力は不変のため、全7のうちdomain／型／build／Rules／構文の成功証拠はverification-policyの失効条件に照合して再利用し、governanceを最後に再確認する。省略した選定ゲートなし。

## 外部キー改修の受入手順と残件

1. [Dev](https://termite-warranty-dev.web.app)を再読込し、HS管理者でログイン。通常稼働の表示と保存可能な状態を確認する。
2. 保証グループUHを開き、外部キー必須がON・変更不可、名称がお施主様契約Noであることを確認。名称だけの編集／保存ができることを確認し、最終名称を戻す。
3. UH所属の検証用工務店と支店を登録する（現時点で0件）。支店コードを設定し、物件画面の支店選択に名称とコードが表示されることを確認する。
4. 通常の物件／保証画面でその工務店を選択。お施主様契約No空欄では下書き保存も拒否され、一意の架空キーを入れると保存できることを確認する。別の物件で同じキーを使うと重複拒否されること、保存済みキーが通常編集で変更できないことを確認する。
5. 一括取込み画面でCSVテンプレートをダウンロード。「外部キー」列と設定した名称の対応説明を確認する。登録済みキーを含む架空CSV、未登録支店コードを含む架空CSVが全件棄却され、対象・理由が表示されることを確認する。他の入力不足もない小さい正常CSVで本登録を確認する。UHの架空キーはCSV専用形式4桁-7桁を使い、先頭と支店コードの不一致だけでは拒否されないことを確認する。

実ブラウザでのHS受入はオーナー待ち。Devでの合成大容量・通信障害試験、原UH資料の重複修正と実取込みは未完了。通常登録／CSV競合・旧要求・取消保全・復旧照合はLocal試験と独立レビューの範囲。全体完了へ含めない。

差戻しは先に実配備・通常稼働と更新済み外部キーの有無を読み取る。f9へ無条件に戻すと通常登録のキー予約／復旧照合が失われるため、既存予約・保存後不変を維持する互換修正版を優先する。データ・現在権限・番号を旧像へ戻さず、停止が必要なら対象と手順を別に提示する。バックアップ停止中のため現在保管されていない像による復元を差戻し手段としない。新コレクション・依存・ガバナンス／権限設定の変更なし。影響する既存仕様・設計・要件・ADRの実装状態・運用・進捗・CHANGELOGのみ更新し、既存索引入口を維持。未決事項台帳の既存別差分には書き込まない。


## 2026-10-07 追加Local改修：外部キー必須設定・表示名（配備前の記録）

正本は[仕様0.1.126](../../specification.md#2026-10-07-通常登録の外部キー必須設定表示名)、[共通設計](../property-bulk-import.md)。オーナー指示で保証グループの必須設定を作成後不変、表示名を設定可能にし、UHの通常登録でも外部キーを必要とするLocal追加改修。現在Devのf9c275b／住所確認待ち世代9へは追加配備していない。実グループ書込み・通常再開も未実施。下の旧配備・住所移行の結果と区別する。

実装・テストの所有差分は以下の13ファイル。追加したexternal-keyの2ファイル以外は既存ファイルの変更。今回のGit統合・pushなし、HEADはf9c275bのまま。既存の文書・UH資料のdirty／untrackedを保持した。未統合差分をDev反映済みの依存や旧公開計画の再開版として扱わない。

- app/components/MeetingPrototype.vue、app/components/PropertyBulkImportDialog.vue
- functions/property-warranty.js、functions/property-bulk-import.js
- src/domain/external-key.mjs、src/domain/external-key.d.mts、src/domain/property-bulk-import.mjs、src/domain/property-warranty.mjs、src/domain/property-warranty.d.mts
- scripts/lib/recovery-controller.mjs
- test/property-warranty.test.mjs、test/property-bulk-import.test.mjs、test/emulator/property-warranty.test.mjs

最終13ファイルのraw-byte SHA256一覧をJSON化した集約hashは`6634e36678f0882b4ea085208afb5f5e969bd86e3229be5e29dfa54a7ecb2e80`。無視設定tmp/external-key-local-source.jsonに一覧を保持し、再読取で不変を確認する。

通常・CSVで同じ外部キー予約を使い、同時競合で両方が登録されないこと、旧要求のキー省略では既存値を保持すること、取消後もキーを解放しないことを試験する。通常登録の物件を取込由来へ偽装せず、復旧照合は全外部キー予約と、取込物件だけの受領行／成功記録を区別する。

EXTKEY-REVIEW-01でCSVだけ内部制御文字を許す不整合を発見。共通normalizerへ統一し、CSVの外部キーはtrim前に検査して内部・端部のtab／LF／CR／DELを拒否する。EXTKEY-REVIEW-02で修正を読取再レビューし、追加阻害なし。EXTKEY-REVIEW-03は後続の試験ID／UI値更新の修正も読取確認し、検証を弱めていない・追加阻害なしと報告。独立レビュアーはテスト・Dev・API・Git操作を行っていない。

| 選定ゲート／コマンド | 最終結果 | 独立観測したexit |
| --- | --- | --- |
| npm test | 282件中280成功、既存2skip、失敗0 | 0 |
| npm run typecheck | 成功 | 0 |
| npm run build | 成功 | 0 |
| node scripts/check-functions-syntax.mjs | 配布domainを準備して全module構文成功 | 0 |
| node --check scripts/seed-emulator.mjs | 成功 | 0 |
| npm run test:rules | 架空demoのみ、126件成功／失敗0 | 0 |
| ./scripts/check-governance.ps1 | 成功、文書最終更新後に再実行して確定 | 0 |

初回の型検査はpreview表示名の型追加漏れでexit1、修正後exit0。domain初回は旧catalog応答fixtureへの対応不足などで失敗し、欠落配列fallback・選択時v-model再現を補って最終exit0。domainのCSV回帰も一度失敗し、配布domainの準備完了後に別実行してexit0。準備と読取の競合は原因の可能性として扱い、その失敗をクラウド不具合とは断定しない。Rules再検証1回目は126件中125成功／1失敗、exit1。試験用requestIdへ不正キーの制御文字を混ぜたため本来のキー検査に到達していなかった。試験IDを安全なhex文字列に直し、全ゲートを迂回せず再実行し126成功／失敗0、exit0を独立観測した。これらの失敗を成功証拠にしない。

Devの読取コマンドnode tmp/inspect-uh-external-key.mjsはexit0／cloudWrites=falseで、UH所属物件なし・UH配下工務店なし、新設定項目は未設定と確認。既存UH物件の補完は不要だが、追加実装と実グループの初期設定はDev未反映。訂正2資料の重複3組はGit外へ保管し、JSON構造・3組／6行参照・279行／276種類を読取再検証してexit0。実番号は[受領台帳の外部保管先](../../requirements/source-materials.md#2026-10-07-外部キー追加改修と重複検査の再提示用保管)から取り出す。

仕様、共通設計、通常登録／マスタ要件、meeting-prototypeデータ契約、ADR0033、技術改修台帳、受領台帳、operations、復旧設計・runbook、CHANGELOGを影響範囲として更新。新コレクション、Rules・索引・依存、ガバナンス／権限設定の変更なし。既存入口から到達できる文書へ追記し新たな索引文書は不要。通常業務の接続先、バックアップ停止、Auth、番号／住所は変更しない。UI＋logic＋schema＋文書のunionで全7ゲートを選定、省略なし。最後の変更はテスト用値のみでapp／Nuxt／Functions構文／seed入力は不変のため型検査・build・構文の成功証拠をpolicyに従い再利用し、domain／Rulesを再実行した。実ブラウザの見た目・実Cloud受入／容量は未検証。追加Dev配備・確認待ちの引継ぎ・HS実画面受入は未完了で、全体完了と扱わない。

## 共通CSV・住所統合の先行Local検証（旧記録）

- 2026-10-07。一次作業ディレクトリ、main、変更前HEAD `0b1a287eb74804051818c792ef186ed89d6af32a`と今回のレビュー済み差分。実クラウドのアプリ配備・住所移行は未実行。正本は[仕様0.1.125](../../specification.md)、[共通設計](../property-bulk-import.md)。

検証した実装26ファイルを`c99f7f2a796ec159179c97d38627a8309cd97641`へローカル統合（git commit exit0）。統合直後に実装ソース範囲cleanを再確認した。文書には以前からの同セッションの未コミット更新とUH資料があり、今回の実装コミットへ無関係な変更を混ぜていない。push・Devアプリ配備は未実行。

その後の最終手順照合で、住所移行後にrecoveringからHS確認待ちへ進む正式な操作不足を確認。ADDR-PUBLISH-01として専用の検証・公開計画を追加実装した。下表は上記コミット＋追加8ファイルの凍結差分に対する最終検証で、失効したdomain／Rulesを再実行した。

追加レビューで、計画作成前に運用ロックだけを作ると、計画作成の通信失敗時に正式な回復が使えないことを確認。ADDR-PUBLISH-02で制御DB内のロックと計画を同じtransactionで作るよう修正した。計画の未検証中断は閉鎖を維持し、正しい旧実行者の終了／owner照合後に未適用終了と判定し、新IDで再計画する試験も成功。独立最終レビューで追加阻害事項なし。実Devでの通信障害試験を完了したという意味ではない。

追加のレビュー済み8ファイルを`f9c275b7be77c0694ba81f9d0ee7c3db0df25a55`へローカル統合（git commit exit0、244行追加／11行削除）。この実HEADを再取得し、app/src/functions/scripts/test/manifest/Rules/configの実装範囲cleanとindex空を確認した。文書と以前からのUH関連差分は未コミットで保持。push・Dev配備・業務移行は未実行。表の再実行証拠はこのコミットの内容に一致し、再利用4ゲートの該当入力も不変。

## 変更ファイル

画面：app/components/MeetingPrototype.vue、PropertyAddressFields.vue、PropertyBulkImportDialog.vue、WarrantyOrganizationManagement.vue、RecoveryStatus.vue。

業務／サーバー：src/domain/property-warranty.mjs/.d.mts、property-bulk-import.mjs/.d.mts、property-bulk-import-pending.mjs/.d.mts、sample-certificate.mjs、functions/index.js、property-warranty.js、property-bulk-import.js。

復旧／移行：scripts/lib/default-recovery.mjs、recovery-controller.mjs、property-address-migration.mjs、scripts/property-address-migration.mjs。package.jsonとtest/property-warranty.test.mjs、property-bulk-import.test.mjs、property-bulk-import-ui.test.mjs、property-address-migration.test.mjs、test/emulator/property-warranty.test.mjs、property-address-migration.test.mjs。

ADDR-PUBLISH追加8ファイル：scripts/default-recovery.mjs、scripts/lib/default-recovery.mjs、default-recovery-admission.mjs、property-address-migration.mjs、recovery-controller.mjs、test/default-recovery.test.mjs、default-recovery-admission.test.mjs、test/emulator/default-recovery.test.mjs。coordinatorが差分を照合し、読取reviewerは同8ファイルを再レビュー。app／Functions／domain／seed／依存／Rulesの追加変更はない。

仕様・関連要件、共通／UH設計と索引、データ契約meeting-prototype、HSC-015とその台帳行、保護運用・ADR0032・Prod前手順・ロードマップ・CHANGELOGを対応。管理AGENTS／project-rules／検証ポリシー、依存、Firestore Rules／indexesは変更なし。名称統一、原資料訂正、正式保証書等の他作業を完了へ含めない。

## 最終ゲート（各実行完了・終了コード0）

| コマンド | 結果 | exit |
| --- | --- | --- |
| pwsh -NoProfile -File scripts/check-governance.ps1 | 管理hash／生成内容／7ゲート整合 | 0 |
| npm test | 最終277件中275成功、既存symlink関連2skip、失敗0（再実行） | 0 |
| npm run typecheck | 型検査成功。app／Nuxt／TS／依存の変更なし、先行証拠を再利用 | 0 |
| npm run build | 静的SPA生成成功。app／Nuxt／依存／build設定の変更なし、先行証拠を再利用 | 0 |
| npm run test:rules | 最終架空demo emulators、125成功、失敗0（再実行） | 0 |
| node scripts/check-functions-syntax.mjs | 実Functionsと同期domainの構文成功。該当ソース／Node変更なし、先行証拠を再利用 | 0 |
| node --check scripts/seed-emulator.mjs | seed構文成功。seed／Node変更なし、先行証拠を再利用 | 0 |

UI／ロジック／スキーマ移行／文書の和集合で全7を選択、省略なし。再利用はgovernance/verification-policy.jsonの各invalidatedByに照合し、追加の運用スクリプト／試験変更で失効しない4ゲートに限る。最終版は編集停止後に検証。先行のtest:rulesはCLI設定読取EPERMで失敗、その後の試験は検証中にサーバー更新が重なり読込エラー／1件timeoutでexit1。局所試験の旧UH延長fixture1件も失敗し、実UH10年の条件と分離して修正。先行失敗を成功扱いにせず、最終全体試験を再実行して上表を確認した。

## 対象検証と独立レビュー

CSV引用符／改行／BOM／先頭ゼロ／不正列・末尾・件数・容量、住所・資材の「不明」、UH92日／月初／10年、共通20/30年の区間・請求／保険、キー・未知支店・設定変更を検証。

Local Firestore SDKで279件を一transaction確定、同一実行再送では追加0、別IDの重複全件拒否、同時2実行の片方だけ成功、取込予約／受領／実行結果の復旧双方向照合と改変拒否。HTTP Callableで未認証／recovering／verificationの更新／古い世代を拒否し、本人の結果照会を確認。実Cloud容量検証とは区別する。

UIの実スクリプトを使う6試験で、応答喪失→remount→結果照会、未確定時の同一CSV再送、本文の非保存、保存不能時送信0、scope変更、破棄条件、終了後の遅延応答無視を確認。実ブラウザの表示／再読込とDev受入は未検証。

移行適用は実Local DBで対象違い・収束待ち・変化した計画拒否、応答喪失／owner照合後再確認、変更前記録改変・欠落拒否、変更後文書の差戻し拒否、住所だけの差戻しとrevision未設定を含む試験を確認。独立reviewerの受付逆照合、UH期間、住所型、中断復帰、対象control照合、保全hash、revision有無、再読込時ID保全の指摘を修正し、最終再レビューで追加阻害事項なし。reviewer自身が試験を実行したという証拠ではない。

追加した確認待ち経路では、実baseline→住所適用→専用公開計画→HS確認待ち→別了承で再開をLocal検証。後付けbaseline／古いrevision／記録改変／差戻し／住所以外の変更を拒否し、同じミリ秒内のTimestamp差と参照先DB差も検出。計画／ロック作成の前・後の応答喪失、検証前の封印中断、公表前後の中断、再開済みの正当な更新を戻さない回復を確認。封印計画の通常apply/resumeは禁止。新たなバックアップ復元や一時DB作成をした試験ではない。

## Dev実行済みと未実施

保護停止・PITR無効化・Firestore／Authバックアップ各1削除は[実記録](../../runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)で別管理。私有Auth設定と復旧実装を保持。読取住所計画は16件／変更16／不一致0、inspect exit0。業務文書は未変更。

最終の実Dev読取再確認も同じ16件・不一致0・hash `5d05467d16543e613d5b47c653fa0dde68fd9dad60f9af0013d4ab5508b748d9`、`node scripts/property-address-migration.mjs inspect --project termite-warranty-dev --control recovery-control` exit0／cloudWrites=false。停止前／後にhash変化があれば実行範囲を再提示する。

以下の配備前記載と区別して、今回の実行を記録する。実サービスの合成容量・実ブラウザ受入・原UH資料の取込みは未実施。タブ終了でsessionStorageが失われた場合は開発側の読取調査を要する。再開後の住所差戻しは別計画。確認後の別の再開了承は未取得。

## 2026-10-07 承認後のDev反映・住所移行

オーナーの「Dev反映等、進めてください」を、提示済みのf9c275b配備・一時停止・既存16件住所移行・技術検証後のHS読み取り確認待ちまでの承認として照合。通常再開、原UH資料取込み、新しい外部キー必須設定、Auth変更、業務文書削除へ拡大しない。実HEADと実装範囲cleanを再確認し、版を固定した。文書の既存差分は保持し、Git変更・pushはしていない。

実行対象はtermite-warranty-dev、業務(default)、制御recovery-control、Hosting termite-warranty-dev。observeでnormal世代7と両側一致、更新なしを確認。停止はaddress-dev-20261007-enter1でrecovering世代8へ、再observeで収束を確認。移行前baselineはaddress-dev-20261007-baseline1、54文書を非公開保全。停止後inspectは16／16／不一致0、提示済みhashと一致した。

| 実行コマンド（共通の明示project/control/revision引数を省略） | 結果 | exit |
| --- | --- | --- |
| default-recovery.mjs observe --dev-inspect | normal7一致、更新／ロックなし（昇格後） | 0 |
| default-recovery.mjs enter --generation 7 --operation address-dev-20261007-enter1 --approval owner-dev-address-20261007 --dev-execute --apply --confirm fixed-recovery | recovering8 | 0 |
| default-recovery.mjs observe --dev-inspect | recovering8一致、更新収束 | 0 |
| recovery.mjs baseline --generation 8 --operation-id address-dev-20261007-baseline1 --apply --confirm recovery | 54文書保全 | 0 |
| build-recovery-release.mjs --revision f9c275b7be77c0694ba81f9d0ee7c3db0df25a55 | 専用決定的ビルド | 0 |
| firebase deploy --project termite-warranty-dev --only functions,hosting --non-interactive | 既存18更新＋propertyBulkImport新設、Hosting成功 | 0 |
| property-address-migration.mjs inspect | 停止後16件・旧計画hash一致 | 0 |
| property-address-migration.mjs apply --generation 8 --operation address-dev-20261007-migrate1 --plan-hash 5d05467d16543e613d5b47c653fa0dde68fd9dad60f9af0013d4ab5508b748d9 --apply --confirm property-address-migration | 16件の住所限定変更 | 0 |
| default-recovery.mjs plan-address --generation 8 --operation address-dev-20261007-publish1 --baseline address-dev-20261007-baseline1 --address-operation address-dev-20261007-migrate1 --address-plan-hash 5d05467d16543e613d5b47c653fa0dde68fd9dad60f9af0013d4ab5508b748d9 --approval owner-dev-address-20261007 --dev-execute --apply --confirm fixed-recovery | verified、全体54文書照合、コピー／削除0 | 0 |
| property-address-migration.mjs inspect | 16件、追加変更0、不一致0 | 0 |
| tmp/verify-paused-backups-after-release.mjs | 全19件自動取得false、Scheduler PAUSED、PITR無効、予定／Firestoreバックアップ0 | 0 |
| tmp/inspect-formal-provider-binding.mjs | 旧同site基準の管理2path・公開設定一致。全体配備証明とは別 | 0 |
| default-recovery.mjs preflight --generation 8 --source '(default)' --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/b053d7fc67931cde --dev-inspect | 全check pass、19実sourceArchives／993配信path／Rules双方／必要索引11／除外30 | 0 |
| default-recovery.mjs publish --generation 8 --operation address-dev-20261007-publish1 --approval owner-dev-address-20261007 --source '(default)' --site termite-warranty-dev --hosting-provider-version sites/termite-warranty-dev/versions/b053d7fc67931cde --dev-execute --apply --confirm fixed-recovery | verification世代9 | 0 |
| default-recovery.mjs observe --dev-inspect | verification9両側一致、更新／ロックなし、await-hs-consent | 0 |
| property-address-migration.mjs status --operation address-dev-20261007-migrate1 | journal complete16、業務checkpoint一致、lockなし | 0 |

通常sandboxのobserveは認証アクセス制限でexit1、外部読取を許可した同じコマンドはexit0。失敗を成功証拠へ混ぜない。CLIの依存更新推奨表示を理由に未承認の依存変更はしていない。Local全7ゲートの証拠は実装不変・policy失効条件不該当で再利用し、今回の決定的ビルドと実配備検証を別に記録する。preflightのready=falseは読取証拠が更新権限を与えない固定仕様であり、全checkのpassと区別する。正式publishでも直前配備・完成像・Auth対応／権限の再照合が成功した。HS実画面確認と別の通常再開了承は未完了で、更新を開放していない。確認手順は[runbook](../../runbooks/backup-recovery.md#住所統合の移行確認待ち再開2026-10-07-dev確認待ち)を参照。

今回の記録更新先は本書、共通設計、仕様の実装現在地、operations、復旧runbook、2ロードマップ、meeting-prototype契約の状態、source-materials、CHANGELOG。仕様の確定条件・データ形状を追加変更したものではなく版番号を増やさない。新しい索引追加、ADR変更、ガバナンス／権限／検証設定変更は不要。アプリコード・HEAD・indexは不変、文書は既存差分とともに未コミット保持し、再開まで実行revisionを変えない。
