# Technical Remediation Backlog

## 2026-10-08 交代後のLocal改修・確認事項

以降のDev配備は毎回の明示指示まで行わず、Local改修／検証→報告→配備指示の運用。次の範囲は[交代指示](../operations.md#2026-10-08-pm白蟻-08への交代次の作業)を正とする。CSV支店コード必須を維持しHS向け資料へ記録、通常登録の支店選択と支店登録のコード必須条件をサブエージェントで検討、テンプレート下説明文削除、ファイル指定アイコンの欄内配置をLocalで進める。画面内カードは対象一覧とvisualizeサンプルの確認を先に行い、ダイアログ内カードは維持。新タスクで未着手、進捗加点なし。台帳の古い状態表示の整合も統合後の残作業とする。

## 2026-10-08 Excel編集CSVの日付対応

添付の入力済みCSVに対応する359b14cを全7ゲート・独立レビュー後、Dev19 Functions／Hostingへ反映・正式照合済み。YYYY/M/Dを実在日検証後にISOへ統一し、従来形式・原受領値・全件棄却・同一実行再確認を維持する。添付3件はLocal入力検証成功。支店3204はオーナー意図のエラー検証用に未登録維持、Dev本登録なし。既存16物件を含む10コレクション不変。ユーザー受入は日付エラーなし／支店未登録による全件棄却を確認する。[実行記録](../design/evidence/increment-import-2026-10-08.md#excel編集csvの日付対応2026-10-08)。既存データ移行・進捗加点なし。

## 2026-10-08 増分取込みと必須グループ制限

承認済み改修a9e90e4：14列の必須マーク、増分初回10年、新規採番、グループによる取込み先制限、通常登録のキー非表示、住所／資材名の作成後不変設定と任意項目の空欄保存。全7Localゲート・独立レビュー・Dev19 Functions／Hosting配備と正式照合を完了。既存16物件を含む10コレクション不変、通常稼働とバックアップ停止を維持。[実測](../design/evidence/increment-import-2026-10-08.md)、[設計](../design/property-bulk-import.md)。ユーザー受入・実Cloud容量試験・実データ取込みとHS日時運用の回答は未完了。進捗加点なし。

## 2026-10-08 名称統合と架空CSVによるDev受入準備

オーナーが項目名「物件名」での統合・Dev反映・マイグレーションを承認。6b2573dへ統合し全7Local検証・独立レビュー・Dev19 Functions／Hosting反映・正式照合・16件移行と全完成像照合を完了。normal世代10・ロックなし、旧名称履歴8件保持。[実測](../design/evidence/property-name-unification-2026-10-08.md)。全7ゲート、独立レビュー、新版の正式配備照合、名前以外の不変・保全・競合安全性とDev移行が完了条件。テンプレート入手を含む架空CSVのDev検証手順を用意し、HS原資料の実取込みは保留する。[設計](../design/property-name-unification.md)。HS受入・Cloud容量試験は別に報告し、全体提供完了へ読み替えない。架空CSV7本と[テンプレート入手を含む受入手順](../../deliverables/dev-import-acceptance-2026-10-08/README.md)を用意済み。


## 2026-10-07 通常登録の外部キーとグループ設定

オーナー承認の追加改修。必須設定の登録後切替不可、名称設定、UH通常登録の下書きから必須、通常／CSV共通の全物件一意予約、キーの保存後不変／取消時保全、通常登録を正しく含む復旧照合を実装・検証する。Dev読取でUH物件・UH配下工務店は0件、物件への補完は不要。追加Local実装・全7ゲート・独立レビューを完了。通常テスト282件中280成功／既存2skip、Rules／emulator126成功、各exit0。追加13ファイルをcbb5859へ統合し、旧住所計画を正式照合・別了承で先に再開後、19 Functions／HostingをDev配備・正式照合済み。UH実設定2項目を保存・readback済み。HS追加受入・実Cloud容量／障害試験・原資料取込みは未完了。[仕様](../specification.md#2026-10-07-通常登録の外部キー必須設定表示名)、[設計](../design/property-bulk-import.md)。住所移行のDev確認待ちと別再開了承は維持し、追加コードを古い公表計画に混ぜない。

## 2026-10-07 共通CSV・支店コード・単一住所の実装

承認範囲は共通CSVダウンロード、新規全件本登録、キー／支店コード検証、通常編集、取込「不明」補完と物件住所移行。Local実装・全7ゲート・独立レビューを完了。[実測と残件](../design/evidence/common-import-address-2026-10-07.md)。Devの保護停止・既存像削除は[実行記録](../runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)で完了し、アプリ配備／住所移行と区別する。

住所移行後の公表不足を追加是正。型付き移行前全体との比較、公開専用plan-address、計画とロックの同時作成、未検証封印／公開の中断回復を検証し、最終domain275成功（既存2skip）・Rules125成功・独立再レビュー済み。具体計画の承認後、f9c275bの19 Functions／Hosting配備、事前54文書保全、16件住所限定移行、全体・権限・採番・配備照合を通過し、HS読み取り確認待ち世代9まで完了。住所のHS実画面確認／別再開了承とnormal10へのreopenは完了。共通機能の実Cloud容量／ブラウザ受入・原資料取込みは残る。通常業務のRead増加やバックアップ再開はない。

完了条件は[共通設計](../design/property-bulk-import.md)の原子確定／同一実行再確認、延長済み受領区間の保険・請求対応、停止／旧要求拒否、住所移行と差戻し障害試験、全7ゲート、独立レビュー、承認後Dev配備・移行・受入。原資料の番号重複等の解消はHSC-015に残る。名称統一の後続改修を同時完了としない。

## 2026-10-07 UH一括取込みの設計・実装準備

- 状態：実装する要件は確定、サブエージェント2名による現行実装の読取・整合性設計レビューを実施。アプリ実装・依存追加・スキーマ移行・実取込・Dev反映は未実施。実装進捗の加点なし。
- 正本：[仕様](../specification.md#2026-10-07-uh一括取込みの実装を確定)、[詳細準備と検証条件](../design/uh-integration-import.md)、[残条件HSC-015](../requirements/house-solution-confirmations/HSC-015-migration-scope-cleaning.md#2026-10-07-uh新規一括取込みの確定と実装前の残条件)。
- 実装単位：支店コードと名称表示、外部識別と全件確定、UH入力変換／通常編集、本登録・過去番号／採番保全、保険・出力、復旧・再送の整合。全件棄却を行単位のregisterループで実現しない。
- 先に独立準備できるもの：支店コードの形状と一意性、表示関数、外部キーの予約・検証、全件検証の架空入力／失敗検証、復旧対象の追加設計。住所／資材名の空欄許可は明示保留で、未知の必須値を補完しない。
- 完了条件：同時取込・ファイル内／既存重複・未知支店・コード変更競合・途中失敗で業務文書／採番を部分確定しない。正常時は全件本登録と一度だけの番号保全。通常編集・取消・CSV・保険区間・UH除外／HSC/SHS回帰、メンテ停止／復旧も含め選定ゲートと承認後Dev受入を完了するまで実装完了とはしない。

## 2026-10-07 導入前改修：物件名と施主名の統一

- 状態：導入前必須として記録済み。未着手・未実装・未検証・Dev未反映。実装進捗の加点なし。
- 根拠：オーナーがHS回答「施主名＝物件名」を報告し、施主名の個別管理をなくす導入前改修を指示。[採用根拠](../requirements/source-materials.md#2026-10-07-施主名物件名の回答と導入前改修指示)、[確定要件](../requirements/case-warranties.md#2026-10-07-施主名と物件名を一つの名称へ統一)。確認事項の対応先はHSC-039。台帳転記は既存別作業の変更により保留。
- 現行確認：`app/components/MeetingPrototype.vue`は物件名と施主名を別入力し、一覧にも両方表示する。`src/domain/property-warranty.mjs`は両名称を別保存対象とし、本登録時に施主名を必須検証する。`functions/property-warranty.js`は変更前の施主名を履歴へ保持する。別項目の管理が現行コードに残ることを読取確認。現在の実DBの名称不一致は未調査。
- 目標：名称項目を一つに統一し、二重入力・表示・独立保存・別必須検証を解消。画面・サーバー・出力・取込で同じ名称を扱う。保証番号・内部ID・電話番号・必要な所有者変更履歴は保全。
- 着手時の設計：既存名称の不一致と空欄を読取で分類し、どの値を引き継ぐかを明確にする。保存項目名、旧画面／要求との互換性、CSV／保証書の項目対応、取込、履歴、バックアップ／復旧を設計する。不一致を黙って上書きしない。実データ反映は対象・保全・差戻し手順と承認を別途確認。
- 完了条件：新規下書き・本登録・編集で名称を一回入力すればよく、詳細・一覧で二重表示されない。保存検証とCSV／保証書・取込の対応が一致。既存の同値・不一致・片方空欄を架空データで検証し、情報消失・再採番・二重物件化がない。名称／所有者変更の履歴と電話番号、復旧時の保全、保証番号完全一致検索と最新20件の取得を維持する。選定したLocalゲートと承認後のDev受入を終えるまで実装完了としない。
- 今回の対象：仕様・要件・改修記録・受領記録・設計の残確認表示・changelogの文書更新のみ。実装時は実際の変更面に応じてUI・ロジック・データ互換性・配備の検証ゲートを選ぶ。

## 2026-10-07 保証満了案内の最長年数判定不足

`src/domain/property-warranty.mjs`の`expiryAlertEligible`に保証案内だけ現在年数＜最長年数の条件を追加。Functions一覧も同じ判定を使用する。20/20・30/30を除外し、10/20・10/30・20/30と既存の時期・取消／未案内条件を維持。保険の更新準備は無変更。この修正時点では10年の選択肢・保存許可値をUH管理確定まで保留し、UH向け実装は行わなかった。後段のUH一括取込み確定により10年対応を[今回の準備](#2026-10-07-uh一括取込みの設計実装準備)へ含めるが、実装は未実施。Localの境界試験と実一覧取得の無書込試験を追加、[検証結果](../operations.md#2026-10-07-保証満了案内の上限判定修正)を正本とする。Dev反映・Dev実画面検証は未実施、全体進捗の加点なし。[記録とUH案](../design/uh-integration-proposal-2026-10-06.md#2026-10-07-オーナー指摘による訂正と取込構造の検討)。

## 2026-10-06 障害通知からの復旧準備

オーナーは今回専用補助処理で終えず、このCodexプロジェクトの実障害通知から停止・復元を開始できる状態を指示。正式CLIへHosting管理ファイル照合とビルド不要のread-only observeを実装、project-rules／仕様／設計／runbookへ入口・停止の事前指示・復旧時点と別HS再開了承の境界を反映。通常アプリ・業務schemaは無変更。対象は現設定Dev、Prod非対応。Local全7ゲート（domain242/240pass2skip、Rules108pass）と独立レビュー後、承認されたb89af5eのDev Hosting反映と正式全10確認（18 Functions/18 archive・Hosting993を含む）を完了。18:43 JSTにnormal7・業務54文書hash不変を読取確認。

配備後の独立再点検で、通知marker不足と監視状態の保存失敗による通知欠落のP2を2件確認。Localで安全な構造化ログ先行／状態保存失敗捕捉へ修正、成功account変更結果を保持する障害注入3試験と修正差分review済み。修正後の全Rules回帰110成功、domain240成功/既存2skip、Functions28構文/seed/governanceも各exit0。typecheck/buildは無変更のapp/buildに対する既存exit0証拠をpolicyの失効条件により再利用。追加配備対象と検証結果を提示し、オーナーが修正版0b1a287のDev反映を別承認。既存18 Functions/Hostingへ反映し、正式全10確認（18 source archives/993配信）pass、環境/実行アカウント/IAM/監視予定不変、normal7・業務54文書hash不変を確認済み。HS確認待ち中の新障害も停止に戻す既存動作をrunbookへ明記。[実測](../design/evidence/recovery-implementation-2026-10-06.md)を現在の実行状態の正本とする。

18:44 JSTの実読取ではdefaultの日次30日／PITRとJST10時監視は有効、managedbackup初回0件、Auth非公開退避3件の存在を確認。Auth退避objectの保存世代固定は現在の成功記録にも実装されておらず、過去データだけの問題ではない。実Auth取込／復元後login、managedbackup実取得／実復元、全fault/volume/cost、実Dev緊急閉鎖は別残件。今回指示を正常Devの再停止と扱わず、全体進捗を加点しない。

## 2026-10-06 Authの区切りと(default)固定復旧への変更

Authの承認済み範囲は非公開退避3件・readbackとLocal欠損UID復元／全消失・模擬部分失敗検証で完了。実Auth取込・実パスワード復元後ログイン・部分失敗の手動回復・退避参照の保存世代固定は残件で、実Auth消失復旧完了とは扱わない。[実測](../design/evidence/recovery-implementation-2026-10-06.md)参照。

オーナー確定方針として通常業務(default)固定を採用。第一段階は現行差分・Cの完全同期・回復・費用・検証・最新Dev移行計画の整理。[設計](../design/default-database-recovery.md)を追加し、仕様0.1.121／要件／ADR／runbookへ反映。固定runtime・Local専用同期／回復コマンドを実装し全7Localゲート・独立レビュー済み。続行で実Dev用配備確認／明示実行ガードを追加し最終Local全7ゲート・独立レビュー済み。Dev再配備・切り戻しは未実施。現Devの再停止・現行データ反映・DB削除は未承認。初回managed backup生成とその実復元も別残件。旧方式の達成証拠を新Cの完成へ流用せず、全体進捗の加点はしない。

次の実装完了条件：固定DB・必須control／新protocol・旧世代直接更新拒否、Cの非公開封印計画／型保持完全同期／余剰削除／batch再実行／default完成検証、専用中断回復、全7ゲートと独立レビュー。その後、実行版・対象・停止／回復・具体差分の承認を得たDev移行とHS確認／別再開了承。未完了Cで再開しない。

## 2026-10-06 回答待ち期間の優先順位・バックアップ設計検討

オーナー指示：バックアップ／リストアを第一優先とし、操作インタフェースとDevでの予行を検討する。Prod準備はHSアカウント等の情報が揃うまで待機。郵便番号自動更新は後発可。Read／Write計測は具体案を提示する段階。実バックアップ接続・設定・権限変更・復元の実行承認へ自動的に広げない。

初期資料の検査を未着手候補として再提示したのは重複。[受領資料台帳](../requirements/source-materials.md#2026-10-05-過去データのgoogleスプレッドシート受領読取確認)に3タブ440行の番号重複なしと欠損・日付補助値の確認を記録済み。補正資料の受領・最終投入検査と、その既実施検査を区別する。同じ資料を再検査する新規作業は予定しない。

### 第一優先：バックアップ／リストアの具体案（未採用）

2026-10-06の追加採用：消失Authだけを同じUIDで復元し、既存アカウントと現在権限・停止状態を保持する。Local importer／Dev読取専用診断を実装し、全7ゲート成功。Dev診断は3件保持・欠損0件。既存UIDのパスワード破損修復と実Dev取込は含まない。日次管理バックアップは続行確認でも0件で初回生成待ち。[追加設計](../design/backup-recovery-implementation.md#2026-10-06-missing-identity-auth-repair-increment)参照。

2026-10-06実装開始指示を受け、採用済み部分をLocalに実装した。同日のDev導入で全7ゲートを再実行し、保護設定・制御DB・限定IAM・秘密ハッシュ設定の保管・通知到達・復旧対応版と自動監視設定の配備を実施。隔離PITR復元の54文書一致、権限／参照／採番検査と確認待ちへの切替まで成功。見出しと以下の未着手／モックのみは質疑時点の記録で、現在は[実装設計](../design/backup-recovery-implementation.md)、[操作手順](../runbooks/backup-recovery.md)、[実測記録](../design/evidence/recovery-implementation-2026-10-06.md)に実装／未実施を分けて記録する。HS管理者の確認と別の再開了承後、新DBで通常Devを再開（世代4）。実Auth退避・私有readbackは3件で成功。初回managed backup生成とそこからの実復元は未確認。Firestore未取得でAuth成功まで利用不可にする監視表示不具合を修正し、全7ゲート・Dev配備・実再試験を完了。完了条件はLocalの全7ゲートと画面確認、その後の実ID・Rules・IAM・非公開Storage／ハッシュ設定・通知先の照合、隔離Dev復元、調整済み停止日時での通常Dev予行。Auth取込、初期化途中の復旧、旧DB削除は別の未対応境界。全体進捗の加点はしない。

失敗通知の宛先を確定（2026-10-06）：自動メールは開発側へ通知し、開発側が確認・対応。HSへの連絡が必要な場合は開発側からシステム外で行う。HS管理者への同時自動通知は採用しない。仕様0.1.117・環境要件・ADR0032・changelogへ反映。実宛先は本番構築時に確認し、検出・送信・再送等は未実装。アクセス要件は通知先の決定では変更しない。

見出しの未採用は下記の未確定な詳細設計を指す。質疑で確定した運用・予行範囲は[現行仕様](../specification.md#2026-10-06-バックアップ復元の対象範囲)・[環境要件](../requirements/environments-and-authentication-email.md#confirmed-recovery-scope)・[アクセス要件](../requirements/security-and-access.md#2026-10-06-復旧時のメンテナンス運用)・[ADR0032](../decisions/0032-production-firebase-operations.md#2026-10-06-recovery-operation-amendment)へ反映した。根拠は2026-10-06のオーナー指示と各推奨案の明示採用。実装・実設定・実復元・Dev予行は未着手。

確定範囲：全体復旧のみ、個別物件／保証復旧は対象外。バックアップは自動。開発側がメンテナンス開始→復旧時点と戻らない登録／更新の範囲を説明→HSの事前了承→復元・技術検証→HS報告・データ確認→HSの再開了承→解除を行う。HSとの報告・確認のやり取り・了承はすべてシステム外。復旧時点と再開の了承は別に得る。

メンテナンスは復旧作業中／HS確認待ちの二段階。作業中はHS管理者も案内のみ。復元・技術検証・アカウント整合確認後に閲覧・業務状態を更新しないCSV出力を開放する。登録・編集・削除と報告／請求状態更新等は再開了承まで停止する。

Auth自体の復旧が必要な場合だけ別途復元し、業務DBだけの破損では現在のログイン情報を維持。両ケースで復元DBとのアカウント対応・権限・停止状態を確認し、不整合が残る状態では再開しない。過去DBへの巻戻しで停止・権限が意図せず変わらないことを検証対象にする。

開発操作はアプリ外専用コマンド。アプリ内は状態・バックアップ履歴の確認のみで、操作ボタンは設けない。確認画面は開発者・HS管理者のみ閲覧可能、一般担当者・工務店には表示しない。最終成功日時・失敗・未取得を確認できる画面とする。作業中のHS管理者は案内のみを維持。現行は[オフラインモック](../design/evidence/current-implementation-audit-2026-10-05.md#バックアップリストアの土台)のみ。通常アプリ停止中でも外部操作経路を使えることを確認する。

切替前DBの扱いを確定（2026-10-06）：切替直後には削除せず、通常業務から切り離して復旧確認・原因調査の完了まで保存する。その後の削除は別途判断。仕様0.1.119・環境／アクセス要件・ADR0032・changelogへ反映。具体的な保持期間・調査時アクセス・調査完了確認・削除手順は未確定。切替後に旧DBへ通常業務のアクセス／更新が残らないことを検証する。実DBのアクセス変更・削除は未実施。

- 残る詳細設計案：画面の詳細項目、実コマンドの認証／IAM／対象照合、状態遷移と強制方法、一般担当者・工務店と既存セッションの停止、実行中処理の収束、復旧時点の技術判定、了承記録の場所／項目、切替・差戻し・再開方法を確定する。既存のUI中心の制御だけで停止が十分とは扱わない。
- Dev予行の採用範囲（2026-10-06）：隔離した復元先でのデータ・動作検証の後、通常Devを一時的にメンテナンス状態にし、接続先切替→HS確認待ち→再開まで予行する。通常Devを止める日時は実施前に調整。管理バックアップから新DBへ復元し、件数・文書ID／内容・採番・関連参照・保証履歴・アカウント整合、所要時間、復元側の業務操作を確認する。既存DBへの直接上書きや利用中Auth巻戻しは行わない。実行対象・設定・権限、停止／切替／差戻し、副作用抑止の詳細は別途確認。実メール・自動通知・報告を許可しない。予行後の削除は対象照合・承認後。実予行は未実施。
- Authは別復旧対象。利用中のDev Authを巻き戻さず、隔離検証先・UID対応・秘密情報の保管・取込・ログインと権限の検証を設計する。Firestore復元成功だけでログイン込みの復旧完了としない。
- スキーマ変更時は復元データと対応するアプリ版を照合し、互換性不明なら切替を止める。accountMutationLocks等の途中処理は自動再開・破棄せず復旧手順へ渡す。
- Devの現在のバックアップ／PITR／権限設定は未確認。実設定の対象・費用・権限と実行承認を確認する。Prod構築は今回対象外。業務CSV保管・個別復元とは分離し、ADR0032の既存バックアップ方針を維持する。
- 技術根拠（2026-10-06公式確認）：[Firestore管理バックアップ](https://firebase.google.com/docs/firestore/backups)はデータ・索引設定を含み、新DBへ復元する。TTL等すべての環境設定を丸ごと戻すものではない。[Auth退避／取込](https://firebase.google.com/docs/cli/auth)は別操作で、ハッシュ設定は秘密として扱う。

### Read／Write計測案（未採用）

1. Localの架空DB／Emulatorで取得・書込の共通計測を設け、操作単位の呼出数、query/get/getAllの返却文書数、書込文書数、transaction再試行、参照キャッシュ再利用、所要時間を集計。これは課金Readそのものではない。
2. 工務店／支店／グループを少数と多数のfixtureで用意し、同じ操作列（初期表示・タブ往復・会社選択・詳細開閉・マスタ保存・キャッシュ期限／破棄・番号検索）を比較。5分内の参照再利用、対象外支店を読まないこと、名前検索で支店取得しないこと、番号検索・無条件一覧の取得範囲を検証。認証の即時enabled確認に必要なReadは残す。
3. Devは専用試験時間帯に非秘密の操作IDと処理種別を付けた集計ログで確認し、Cloud側の利用指標と照合する案。氏名・住所・メール・入力検索語・文書本体・認証情報は記録しない。論理取得件数と課金Read、共有環境の他操作、指標の遅延を分け、24時間総数だけで効果を断定しない。

今回の変更は仕様・要件・ADR・台帳・changelogの文書のみ。アプリ・保存契約・設定・索引・配備・データ・共通ガバナンス・検証方針は変更しない。既存索引から到達可能で新規文書はない。README／operationsの別タスク差分は保持する。documentation-onlyとしてgovernance-checkとowned diff checkを選択し、他6ゲートは実装・設定に差分がないため選択外。設計記録は実装・復旧予行完了の証拠ではない。

## 2026-10-06 物件／保証一覧の完全一致検索（HSC-023）

- 承認範囲：保証番号完全一致だけに限定し、Dev反映まで承認。その他検索軸は業務内容の確認・仕様確定が先行する。
- 実装：propertyList入口は保証番号だけを受け付け、DB whereで完全一致取得。無条件はupdatedAt／文書ID降順のlimit(20)。会社／支店scopeを維持し、3種類の複合索引を追加。画面の名前・住所・詳細条件を撤去。他業務一覧は維持。
- 検証状況：Local全7ゲート成功。Dev Functions・索引・Hosting配備と開発側の読み取り受入を完了。単体の50件fixtureで番号一致時は物件1件だけ読取、部分一致・他社／他支店は0件。Emulatorで古い物件・番号一致／不一致・会社／支店scopeを検証。実利用24時間の削減率は未測定。
- 完了条件：Local全7ゲート、Dev Functions／索引／Hosting一致と検索受入を完了。既存業務データの変更・補完・Prod操作なし。
- 残件：未採番下書きの探索を含むその他検索軸、マスタ検索・本番規模の取得／CSV完全性は[HSC-023](../requirements/house-solution-confirmations/HSC-023-ngram-query-consistency.md)で継続。旧tokenMap導入目標を今回の実装指示にしない。全体進捗率は変更しない。
- 互換性・差戻し：保存スキーマは不変。旧list入口を他業務一覧と旧クライアント用に維持。画面はFunctions／索引の準備後に配備。差戻しは旧HostingとFunctionsを戻し、追加索引は残せる。仕様に反する旧自由検索の再公開はオーナー判断が必要。
- 文書影響：仕様・検索要件・検索設計・試作契約・HSC該当行・本台帳・changelog・プロジェクト規則。新しい永続保存設計はなくADRと保存契約は変更不要。既存operations／READMEの他タスク差分は触れない。今回の運用証跡は本節へ記録する。

### Local検証（2026-10-06）

UI＋application logic＋索引/schema＋文書＋project rule＋deployの混合変更として全7ゲートを選択。対象アプリ・索引の最終差分で実行。試験の旧detailsOpen参照・自由検索の期待値を新仕様へ更新し、報告fixtureはタブ切替完了後に準備する。最初のnpm test失敗は修正後の成功で更新。Rules試験の初回はCLI設定読取EPERMでexit 1、demo環境限定の権限付き再実行で成功。

| コマンド | 実測 | exit |
| --- | --- | --- |
| npm test | 188件、186成功・既存2スキップ・失敗0 | 0 |
| npm run typecheck | 成功 | 0 |
| npm run build | 成功。既存Nitroの警告あり | 0 |
| npm run test:rules | demo-termite-warrantyのみ、90成功・スキップ0 | 0 |
| node scripts/check-functions-syntax.mjs | 23ファイル成功 | 0 |
| node --check scripts/seed-emulator.mjs | 成功 | 0 |
| pwsh -NoProfile -File scripts/check-governance.ps1 | 成功。最終文書更新後にも再実行 | 0 |

所有ファイル：`app/components/MeetingPrototype.vue`、`functions/property-warranty.js`、`firestore.indexes.json`、`test/catalog-efficiency.test.mjs`、`test/property-warranty.test.mjs`、`test/emulator/property-warranty.test.mjs`、`docs/specification.md`、`docs/requirements/search-and-list.md`、`docs/requirements/search-architecture.md`、`docs/design/meeting-prototype-2026-10-03.md`、`docs/requirements/house-solution-confirmations.md`のHSC-023行と該当詳細、`governance/project-rules.md`、`CHANGELOG.md`、本台帳。運用詳細は本節に集約し、他タスク所有の`docs/operations.md`と`docs/README.md`は保全する。保存文書形状・認証権限・共通管理対象・検証方針は不変。追加ADR・新規文書索引は不要。

### Dev配備・受入（2026-10-06）

配備先は本ターンで`docs/operations.md`、開発配備workflow、`functions/local-runtime.js`、`functions/index.js`、`firebase.json`の実値と照合。ユーザーの「Dev反映まで進めてしまってOK」に基づく。既存業務文書・Auth・採番の書込み、初期化、Prod・IAM操作なし。

| コマンド | 実測 | exit |
| --- | --- | --- |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only 'functions:propertyPrototype,firestore:indexes' --non-interactive | propertyPrototype更新・索引配備成功 | 0 |
| node tmp/verify-property-search-indexes.mjs | 準備中はCREATINGで未完了。最終3索引READY | 0 |
| node node_modules/firebase-tools/lib/bin/firebase.js deploy --project termite-warranty-dev --only hosting --non-interactive | READY確認後に公開、991ファイル | 0 |
| node tmp/verify-property-search-release.mjs | HTML HTTP200・Localと一致、24参照資産一致、Dev接続先一致、4 callableの未認証401、3索引READY | 0 |

公開HTML SHA-256：`0ea568678b78a64d30e0aa37490bd4844e5536cff0788d01ba2d938ef1cb0d60`。

Chromeの既存Devセッションで未保存入力なしを確認し再読込。物件一覧の入力欄は保証番号のみ、詳細条件なし。初期表示16件→実在番号完全一致1件→番号の一部分0件→前後空白とEnter検索1件→条件クリア16件・入力空欄・エラー0を確認。読取試験のみで、顧客名・住所・実番号は証跡に複写しない。試験初回の番号取得はセルのグループ補足表示も連結していたため0件となり、番号のテキストノードだけで再検証して上記結果を確認した。保険報告は対象年月のみ、請求は既存検索欄を維持していることも確認し、物件一覧へ戻した。会社／支店scopeはLocal自動試験で確認し、Devで別アカウントへのログインや合成ユーザー作成は行わない。

画面証跡は個人情報を含まない検索formのみの`tmp/dev-property-exact-search.png`（ignored）。その他の検索軸と未採番下書きの探索は未決、HSC-023は未解決のまま。ユーザーの業務受入は開発側検証と区別する。公開画面で保証番号検索を確認できる。

#### 検証対象の指紋

下記ソース／テスト／索引はLocal検証後から配備・受入まで不変。後続は結果の文書記録のみでありアプリ検証を再実行しない。最終文書の`pwsh -NoProfile -File scripts/check-governance.ps1`と所有15ファイル指定の`git diff --check -- <owned paths>`は各exit 0。他6ゲートはソース・テスト・設定が不変のため上記有効証拠を再利用。

| ファイル | SHA-256 |
| --- | --- |
| `app/components/MeetingPrototype.vue` | `2f1f2e707e3b4e34008a299f06d36fbed3acee7aec210ac3bbf23c29067ad195` |
| `functions/property-warranty.js` | `932f4be3ec0cde652feb995c72846d3c72cde3d021bee2a2f340088a5b774590` |
| `firestore.indexes.json` | `0108c885a30192aeb8a849a76ae1e61fc4cc4e412bd5f88ced88b9d4c86494c8` |
| `test/catalog-efficiency.test.mjs` | `00b65f930eb920ee9572a5e6d223f52225093f5544d92f5514fac6b5e5a3f73d` |
| `test/property-warranty.test.mjs` | `3848454c7832f496eda4ec11170c938ae31f9430fb400e522b86b4472af5398c` |
| `test/emulator/property-warranty.test.mjs` | `207d14d150e1eedaed36b0bbc2454741227368c6b7e097e289599dcb78d51168` |
| `governance/project-rules.md` | `8af40b94a1641c6ba404877358d52eaf0decbb824da8aeaf2f2916c9f66cdfcf` |

## 2026-10-05 アカウント競合・Read削減の承認

ACCOUNT-01とRead候補1/2/3/5は改修・Local検証・Dev反映・開発側Dev受入を承認。候補4も後続回答により5分の参照データ共有キャッシュを採用。AirGuardV2を直接導入せず原則を参考にする。候補6の保存方式と郵便番号自動更新は説明・検討段階。[改修契約](../design/account-concurrency-read-efficiency-2026-10-05.md)へ集約。完了条件はアカウント並行／失敗／復旧の独立レビューと試験、候補取得の意味を維持したRead削減、全7ゲート、Dev配備／受入の実測。既存業務データの初期化・Prod・権限拡張なし。実装・独立レビュー・最終Local全7ゲート・Dev配備・合成データによる開発側Dev受入完了。実運用の24時間削減率は未測定。全体進捗加点なし。

## 2026-10-05 現行実装の点検・旧画面撤去

オーナーは現行の打ち合わせ画面を継続改修の基礎とし、試作前画面の撤去、サブエージェント点検、明確な軽微不具合の修正、非効率な処理の洗出し、バックアップ／リストアのモック準備を指示。[範囲・結果・検証](../design/evidence/current-implementation-audit-2026-10-05.md)を現在地とする。旧案件・旧マスタの画面28ファイルを撤去し、TR-010の旧詳細／旧案件編集に関する残件は現行UIの対象外とする。残存する旧ドメイン／バックエンドの欠陥が修正済みになったという意味ではない。延期中ポータル・旧アカウント管理は保持。配備・実データ操作・進捗加点なし。

## 2026-10-05 請求開始月・過去初回保険

オーナー承認範囲：延長請求対象月を保証開始月に変更し、初回未報告の過去保険を対象月基準で選ぶ。月内保証終了も候補に残してHSが選択する。ローカル実装・機能検証済み。完了条件は期間境界・終了・未選択保持・取消復元・請求取消後の除外の検証。2026-10-05にDev反映と指定データ初期化を完了（[実行記録](../design/evidence/dev-reset-104-2026-10-05.md)）。[保存契約](../design/meeting-prototype-2026-10-03.md)、[検証記録](../design/evidence/implementation-104-2026-10-05.md)。全体進捗の加点なし。

## 2026-10-04 状態遷移の設計レビュー（0.1.101実装・検証）

後続の改修・Dev配備指示により実装・全7ゲート・Dev反映・実画面確認を完了。[区間契約と検証記録](../design/evidence/lifecycle-101-2026-10-04.md)を現在地とする。下記は採用時点の経緯。ユーザーUI受入はまだ加点しない。

ユーザー依頼でサブエージェント3名と[状態遷移レビュー](../design/state-transition-review-2026-10-04.md)を実施後、オーナーが最小推奨案1〜3と取引単位の請求状態管理を採用。請求済み取消と延長依存の保険報告取消を延長取消の前提とし、外部訂正はHSに委ねる。全体取消の影響確認を追加。引渡日は初回分も含む有効な報告・請求・延長を戻せば訂正可能とし、処理経験だけの永久ロックは設けない。[仕様書](../specification.md)に実装待ちとして記録。連続取消に必要な記録と旧データの扱いは設計が必要。

完了条件：依存関係・既存データの扱いを確定し、必要な契約／画面／サーバー制御を反映。案内後の訂正・延長取消、請求済み延長取消の拒否と逆順取消、同月別保険区間、全体取消・復元の組合せ試験を行う。今回の文書更新で実装完了・受入加点はしない。UX-R07は受入済み。

## 0.1.100 — 2026-10-04 案内取消の文言と整合性確認

「未案内に戻す」、タイトル「保証満了案内を取り消す」、影響説明をv-alertへ変更。延長取消の既存復元動作の追加試験。全7ゲート成功、Dev Hosting反映・実画面確認済み。[記録](../design/evidence/ux-100-2026-10-04.md)。業務仕様・未確定事項の変更なし。

## 0.1.99 — 2026-10-04 案内状態・取消配置

カレンダー、報告/請求カード、延長配置はオーナーOK。保証満了案内の状態と操作を直近保証行へ集約し、全体取消を右上の色付きボタンへ変更。Dev Hosting反映・実画面確認済み。全7ゲートexit 0。[記録](../design/evidence/ux-099-2026-10-04.md)。保証上限到達時の保証/保険アラート除外はHSC-036で確認、抽出条件は不変。全体進捗の加点なし。

## 2026-10-04 UX-R追加回答

UX-R01/R06はオーナーOK、日付数値入力もOK。0.1.98でカレンダー配色・報告/請求のカード表示・延長ボタン位置を修正しDev反映・開発側確認済み。[差分受入手順](../runbooks/local-acceptance-2026-10-03.md)、[証跡](../design/evidence/ux-098-2026-10-04.md)。請求年月/未請求管理はHSC-010、保険満了一覧用途はHSC-036で確認。全体進捗の加点なし。

## 2026-10-04 UI/UX受入 U01〜U10

入力候補・余白・Vuetify既定フォーカス、日付文字入力、一括選択、取消確認とカード内操作、満了案内の専用表示を0.1.97で改修。[検証と配備](../design/evidence/ux-097-2026-10-04.md)、[再確認6項目](../runbooks/local-acceptance-2026-10-03.md#0197の要再確認ux-r0106)参照。U07/U09はユーザーOK。請求先単位の絞り込みは[HSC-010](../requirements/house-solution-confirmations/HSC-010-payer-contracting-party.md)でHS確認後の後発改修。単位は推定しない。

## 2026-10-04 パスワード設定メール・画面の後発改善

- 状態：改善要望を受領、後発作業。未実装。A01の機能受入を妨げない。
- 根拠：同日、ユーザーが設定メールの正常受信・パスワード設定・ログイン成功を報告し、初回設定／再設定時のメールと設定画面を整えることを希望。
- 対象：初回パスワード設定・再設定のメール、およびリンク先の設定画面。
- 検討案（未確定）：サービス名・送信者表示・日本語の案内文、初回設定と再設定の説明、画面の見た目、完了後のログイン導線、無効／期限切れリンクの案内を整理する。
- 着手時：利用中の認証サービスで変更できる範囲を確認し、文案と画面案を提示して具体化する。今回は認証設定・メール送信設定・実装を変更しない。
- 完了条件：採用した文案・画面を反映し、Devで初回設定／再設定のメール受信、設定、ログイン、無効リンク時の案内を確認する。

## 2026-10-04 A02-R追加指摘

郵便番号空欄登録は確認済み。入力エラーが背景一覧にも出る不具合とrules検証の不足を通常画面全体で改修する。[範囲・検証](../design/evidence/a02-r-input-validation-2026-10-04.md)を参照。2026-10-04にDev配備済み、ユーザー再確認待ち。

## 2026-10-04 Dev受入フィードバック A00〜A04

接頭辞区切り・住所拡張・工務店候補検索・本登録確認・期間表示を改修対象とする。コードの確認では背景ローディングは候補検索と一覧のbusy共有、本登録チェックの抜けは注意発生時だけ確認を要求する条件に起因。改修の自動検証とユーザー受入は[証跡](../design/evidence/dev-acceptance-a00-a04-2026-10-04.md)で区別する。旧画面残件と進捗率は変更しない。

- Status: Active
- Scope: Approved corrections and structural improvements identified during the 2026-09-11 implementation review, plus the TR-009 postal-lookup design added and independently reviewed on 2026-09-12
- Progress rule: An item is complete only when its implementation, required tests, affected contracts, and measured evidence all satisfy its completion contract. No elapsed-time or partial percentage is reported.
- Application-code baseline reviewed: `5f2a0fb47ce41d703a31cfbe7f29020c1a9d7c96`
- Repository baseline before this documentation change: `1b42ca682f423679e4345427705a25ddc12b022a` (the intervening commit from the application-code baseline changed documentation only)

This backlog records approved implementation work. It does not turn unresolved product choices into requirements. HSC-032 is resolved: no mandatory/default case-list year/month condition is used.

## Recommended Order

1. TR-001, TR-002, and TR-003: correct write semantics and make the verification/deploy path trustworthy.
2. TR-007: after that foundation phase is complete, remove the unnecessarily strong Callable boundary from the four master CUD paths before further master-form restructuring.
3. TR-008: remove the unused profile Callable while preserving the live staff-document subscription and the future server-enforced account-management boundary.
4. TR-004 and TR-006: remove duplicated form logic and split the central composable before adding more fields or screens.
5. TR-005: replace unbounded list reads after the query boundary exists; implement the common 20-document default independently of the unresolved case-month details where possible.
6. TR-009: implement the adopted Japan Post CSV transformation, Hosting shards, manifest, freshness warning, and provider-neutral lookup activation after the HSC-017 decision.

## TR-001: Align Master Writes with Last-write-wins

- Status: Implemented and accepted on `codex/tr-001-master-last-write-wins`; integration is recorded in Git history
- Detailed design: [TR-001 master last-write-wins](../design/tr-001-master-last-write-wins.md)
- Evidence: update/lifecycle DTOs and both Nuxt call sites omit `expectedRevision`; Functions derives the next safe revision from the current transaction snapshot; the registered Emulator gate covers all four masters, full-payload concurrent writes, lifecycle boundaries, invalid references/revisions, the Web Functions SDK callable boundary, and unchanged case/applied-warranty conflict behavior.
- Target: Master update, inactivation, and reactivation accept the latest trusted mutation that commits, while retaining server-side field/reference validation and atomic writes. Revision may remain as diagnostic/order metadata but not as a rejection precondition.
- Completion contract: callable DTOs, server transactions, UI calls, prototype data contract, and tests all use the rule in ADR 0016. Concurrent-write tests demonstrate last-write-wins. Case and applied-warranty stale-baseline behavior remains unchanged.
- Required validation: domain/type/build gates, master Emulator tests, Firestore Rules regression, and a UI or callable integration test that submits two edits opened from the same initial state.

## TR-002: Make Shared Domain Code Deterministic for Functions

- Status: Implemented and accepted on `codex/tr-002-functions-preparation`; integration is recorded in Git history
- Detailed design: [TR-002 deterministic Functions domain preparation](../design/tr-002-functions-domain-preparation.md)
- Purpose confirmed from repository evidence: `src/domain` contains Firebase-independent warranty, search, projection, and master-normalization logic used by both Nuxt and Functions. Because `firebase.json` declares `functions` as the Functions source directory, deployable Functions currently import a generated copy at `functions/domain`.
- Former risk: `functions/domain` was ignored by Git and generated only by selected paths. A clean checkout could not run every Functions path without manual preparation, and a developer could test an old generated copy before deployment replaced it.
- Recommended target for the current project: keep `src/domain` as the sole authored source; add one deterministic `prepare:functions` command; make every Functions syntax test, Functions Emulator start, callable integration test, and deploy path invoke it; then run a source/copy equality check that fails on drift. Never treat an existing ignored copy as test input without preparation.
- Longer-term option: evaluate a tracked internal workspace package consumed by both Nuxt and Functions. Adopt it only after proving that the Firebase deployment bundle installs and resolves the local package in a clean checkout; Firebase's documented deployment boundary remains the configured Functions source package.
- Completion contract: deleting `functions/domain` and starting from a clean checkout still permits the registered Functions tests and Emulator command to prepare the exact current source automatically; drift is detected; generated content remains excluded from commits.
- Required validation: clean-copy rehearsal, source/copy hash comparison, Functions syntax, callable integration, Emulator regression, and build/deploy dry preparation without an external deployment.
- Evidence: preparation is repository-anchored, staged, byte-compared, path-safe, and serialized with bounded lock waiting. Unit tests cover missing/stale/extra/type/content differences, byte preservation, bidirectional path containment, supported symlink boundaries, deterministic lock contention and timeout, post-lock recheck, and stage/lock cleanup. A missing real generated directory was rejected by the read-only check, then recreated by both the syntax path and the normal Emulator startup prehook; deliberate real-path content drift was rejected and repaired. The final gates passed: domain tests 48 passed/1 host-limited child-symlink fixture skipped, Firestore/Auth/Functions Emulator regression 82 passed, typecheck, build, Functions syntax, seed syntax, governance validation, canonical preparation, and independent equality check all exited 0. The normal Emulator command reached the all-ready state and was then intentionally stopped. No external deployment was performed.

## TR-003: Close Verification and Development-deploy Gaps

- Status: Implemented and accepted on `codex/tr-003-verification-deploy-gates`; integration is recorded in Git history
- Detailed design: [TR-003 verification and development-deploy gates](../design/tr-003-verification-deploy-gates.md)
- Former evidence: the existing Web Functions SDK applied-warranty test was not in a registered gate; the Functions syntax checker omitted `applied-warranty-management.js`; the development deployment workflow built and deployed without first running the project verification policy.
- Target: register an Auth+Firestore+Functions callable integration gate; cover callable wrappers and error mapping; discover or explicitly enumerate every maintained Functions module in syntax validation; make the development deploy job depend on all policy-selected gates. Review the current unconditional `--force` separately and retain it only with a documented deletion boundary.
- Completion contract: a deliberate failure in each gate blocks deployment; the callable test runs from a clean checkout using TR-002 preparation; every Functions service module is covered; deploy remains external-write gated.
- Required validation: fail-pass tests for the aggregate workflow, independent exit-status evidence for every gate, and a no-deploy workflow validation or pull-request run before enabling the changed deployment job.
- Evidence: the registered Emulator gate now covers all seven exported Callable endpoints and representative authentication, authorization, validation, stale-baseline, and atomic-rejection paths; 88 Emulator tests passed. Recursive syntax discovery checked all 10 current deployable JavaScript modules. The local workflow contract rejects every omitted comprehensive gate, conditional/non-failing gates, missing manual/`needs` boundaries, credential use in verification, missing or rebuilt revision-bound Hosting artifacts, extra/retargeted deploys, and `--force`. Domain tests passed 56 with 2 host-limited symlink fixtures skipped; typecheck, static Hosting generation with `index.html`, Functions syntax, seed syntax, and standalone workflow validation exited 0. Independent review accepted the repaired implementation. No workflow dispatch or external deployment was performed; GitHub Actions execution and remote Artifact Registry policy remain unverified.

## TR-004: Consolidate Master Form Fields and Payload Mapping

- Status: Implemented and independently accepted on `codex/tr-004-master-form-consolidation`; Git integration is recorded in repository history
- Detailed design: [TR-004 master form consolidation](../design/tr-004-master-form-consolidation.md)
- Former evidence: full creation, quick creation, and detail editing separately defined the same fields, initial state, conditional sections, and form-to-payload mapping in `MasterManagement.vue`, `QuickCreateMasterDialog.vue`, and `MasterEditDialog.vue`.
- Target: share typed form models, initialization, and pure payload mappers; reuse small field-section components for address, company contact, property references, and homeowner contact. Keep the existing list/detail shells and avoid a general metadata-driven form engine.
- Completion contract: each field is declared and mapped once per master type; full create, quick create, and edit produce the same validated payload shape; master-specific differences remain explicit and typed; no `Record<string, any>` form state remains.
- Required validation: parameterized mapper tests for every master type, component tests for the three entry points, typecheck, build, and Emulator master CRUD regression.
- Evidence: the four master types use a discriminated draft union, pure initialization/payload functions, explicit reusable field sections, and tested injectable submission adapters shared by the three entry points. Tests cover all draft/payload mappings, success callbacks, quick-create event/reset, edit saved/close, and inactive property-reference preservation; Nuxt compiles the SFC bindings. Domain/workflow tests passed 65 with 2 host-limited symbolic-link fixtures skipped; typecheck, static build, the 77-test Auth/Firestore/Functions Emulator suite, recursive Functions syntax, seed syntax, and governance validation exited 0. Independent review found no remaining High, Medium, or Low issue. DOM focus/click behavior was not automated, and no external deployment or data migration was performed.

## TR-005: Replace Unbounded List Subscriptions

- Status: Implemented and locally verified on `codex/tr-005-bounded-list-subscriptions`; mandatory case-month filtering was later rejected under HSC-032
- Detailed design: [TR-005 bounded list subscriptions](../design/tr-005-bounded-list-subscriptions.md)
- Former evidence: case and master lists subscribed to full collections, case listing created one applied-warranty listener per case, and repeated snapshots re-projected all cases in memory.
- Target: enforce ADR 0017. An unfiltered list subscribes to the freshest 20 documents using server-maintained `updatedAt` and a document-ID tie-breaker. Introduce a query/repository boundary, cursor support, and the indexes needed by bounded queries. Case warranty-derived filters use a bounded query or rebuildable list projection rather than per-case child listeners.
- Completion contract: instrumentation shows that initial listener count and reads are bounded by the visible query window rather than lifetime record count; no unfiltered full-collection fallback remains; all list types have a reliable freshness field; filtered query behavior is explicit.
- Required validation: query and index tests, listener cleanup/error tests, 20/21-record boundary tests, equal-timestamp tie-break tests, representative-volume read/listener/latency measurement, and tests for the confirmed optional case-date ranges.
- Evidence: all unfiltered case and managed-master lists use the shared `updatedAt DESC`, document-ID `DESC`, `limit(20)` query and tested cursor seam; construction-company linked properties use the corresponding bounded composite query. Case lists read an atomically maintained parent projection and create zero child-warranty listeners, while 10-ID exact-reference chunks keep visible old masters resolvable without lifetime collection reads. Unit instrumentation covers a 20-case reference plan, listener generation/cleanup/errors, projection shape, and cursor construction; Emulator tests cover equal-timestamp 20/21 boundaries and atomic registration/add/update projection paths. The seven comprehensive gates exited 0: 77 domain/workflow tests passed with 2 host-limited skips, typecheck and static build passed, 81 Emulator tests passed, recursive Functions syntax and seed syntax passed, and governance validation passed. Browser smoke confirmed the seeded dashboard, six case rows, case detail warranty, and 10-row construction-company list. The build retained its existing large-chunk and Nuxt/Nitro warnings. Optional application/handover date-range tests were added after HSC-032 rejected mandatory month filtering. Production backfill and a production-scale latency target remain outside this completed portion.

## TR-006: Split `usePrototypeData.ts` by Responsibility

- Status: Complete on `codex/tr-006-prototype-data-split`; independently reviewed
- Detailed design: [TR-006 prototype-data responsibility split](../design/tr-006-prototype-data-responsibility-split.md)
- Current evidence: one composable contains UI-facing types, date helpers, dialog draft logic, client transactions, callable gateways, master loading, case-list subscriptions, and case-detail subscriptions.
- Target: separate shared types and pure transformations, case command gateway, case list query repository, case detail query repository, and UI orchestration composables. Keep Firebase-free domain rules in the shared domain boundary. Do not add a global store unless a demonstrated cross-page state need exists.
- Completion contract: each module has one principal reason to change; UI components depend on query/command interfaces rather than raw Firestore assembly; list and detail loading expose explicit ready/error states; listener cleanup and retry behavior are testable independently.
- Required validation: existing domain and Emulator regressions, focused query/command tests, listener ordering/error/cleanup tests, component smoke tests, typecheck, and build.
- Completion evidence: the aggregate composable was removed and all consumers now use typed command, catalog, list-query, or detail-query boundaries. Dependency-free regressions cover readiness under reordered delivery, progressive data, retry generations, dynamic child cleanup, and removed-listener late callbacks. The full policy-selected gate set passed, local dashboard/list/detail smoke passed without browser console errors, and follow-up review reported no remaining High or Medium finding. See the [detailed design evidence](../design/tr-006-prototype-data-responsibility-split.md#validation).

## TR-007: Replace Master CUD Callables with Direct Firestore Writes

- Status: Implemented and independently accepted on `codex/tr-007-direct-master-writes`; integration is recorded in Git history
- Decision: [ADR 0018](../decisions/0018-direct-master-writes.md)
- Detailed design: [TR-007 direct master writes](../design/tr-007-direct-master-writes.md)
- Former evidence: direct client create/update was denied for construction-company, homeowner, property, and warranty-service masters, and every create, update, inactivation, and reactivation went through a trusted Callable. This boundary was introduced primarily so a server could derive name-search N-Gram maps and was later expanded to uniform revision, lifecycle, timestamp, and reference validation. The previously server-atomic property-to-case propagation requirement no longer exists.
- Target: enabled authenticated staff write the four master types directly through the Firestore client. As corrected by ADR 0025, Rules retain the enabled-account boundary but do not enforce staff business-data schemas or application workflow; the application generates and validates canonical fields and accepts that authenticated out-of-flow writes have no integrity guarantee.
- Boundary: keep Callable/Admin SDK paths whose server authority or multi-document transaction is separately justified, including account administration, atomic case registration and numbering, and current applied-warranty/parent-case mutation. Retain `revision` only as an atomic write-order diagnostic: direct writes neither read nor return it, so it adds no pre-write read or stale-write rejection.
- Completion contract: no master UI path invokes `createMaster`, `updateMaster`, or `setMasterActive`; the unused exported Functions and server master-mutation module are removed; direct client writes preserve current valid create/update/inactivate/reactivate behavior and reject unsupported shapes, invalid references, unauthenticated/missing/disabled staff, and physical deletion; the prototype data contract, rules, operations, tests, and deployment surface agree on the reduced boundary; accepted residual risk is documented without presenting the change as browser-external attack protection.
- Required validation: detailed design review, domain mapper/token tests, application CUD tests for all four masters, Firestore Rules authentication/enabled-account regression, application property-reference and lifecycle behavior, last-write-wins concurrency, typecheck, build, Functions syntax, clean-copy Functions preparation, and confirmation that retained Callable workflows still pass their integration tests.
- Evidence: the master UI writes all four master types through the Firestore Web SDK and no longer invokes the three removed master Callables. Rules tests cover all-four create/update/inactivate/reactivate, valid-revision legacy lifecycle-only changes, revision boundaries, enabled-account and exact-shape enforcement, active-property references, physical-delete denial, last-write-wins concurrency, and property-to-case non-propagation. The registered Emulator suite passed 78/78 and loaded only the four retained Callable exports (`getOwnProfile`, `registerCase`, `addAppliedWarranty`, and `updateAppliedWarranty`). Domain/workflow tests passed 56 with 2 host-limited symlink fixtures skipped; typecheck, static Hosting generation, recursive Functions syntax, seed syntax, Functions preparation, and governance validation exited 0. Independent review accepted the repaired implementation. No external deployment or data migration was performed.
- Subsequent correction: ADR 0025 superseded the Rules-based schema and invariant portion of this target. The historical validation above remains evidence for the implemented revision, not the current Rules contract.

## TR-008: Remove the Unused Profile Callable

- Status: Implemented and independently accepted on `codex/tr-008-remove-profile-callable`; Git integration is recorded in repository history
- Decision: [ADR 0019](../decisions/0019-remove-unused-profile-callable.md)
- Detailed design: [TR-008 remove unused profile Callable](../design/tr-008-remove-unused-profile-callable.md)
- Evidence: the local Functions inventory and Emulator load contain only `registerCase`, `addAppliedWarranty`, and `updateAppliedWarranty`; no repository client refers to `getOwnProfile`. The live `useSession` staff-document subscription and its self-read/other-user denial/staff-write denial/disabled-account regressions remain. Domain/workflow tests passed 59 with 2 host-limited symbolic-link fixture skips; typecheck, static Hosting generation, the 77-test aggregate Emulator suite, recursive Functions syntax, seed syntax, and governance validation exited 0. Independent follow-up review found no High or Medium issues. Remote existence, consumers, deployment, and deletion remain unverified and unperformed.
- Target: remove the redundant public export and wrapper test while retaining the direct self-profile Rules boundary, live session behavior, the registered aggregate Emulator gate, and future role-enforced account-management Callables.
- Completion contract: the local Functions inventory contains only `registerCase`, `addAppliedWarranty`, and `updateAppliedWarranty`; no repository client refers to `getOwnProfile`; self-read/other-user denial/staff-write denial/disabled-account regressions remain registered; affected design, decision, roadmap, indexes, operations, and changelog agree; remote existence, consumers, and deletion remain explicitly unverified and unperformed.
- Required validation: governance check, domain/workflow tests, application typecheck, aggregate Auth/Firestore/Functions Emulator regression, recursive Functions syntax, seed syntax, and independent review. Application build is omitted because no application, Nuxt, dependency, TypeScript, or build configuration changes.

## TR-009: Add Japan Post Postal-Data Lookup

- Status: Local retry correction, all three master persistence paths, and bounded visual/keyboard smoke verified on 2026-09-28; formal accessibility acceptance and deployment remain pending
- Decision: [ADR 0031](../decisions/0031-japan-post-postal-data.md)
- Detailed design: [TR-009 Japan Post postal-data lookup](../design/tr-009-japan-post-postal-data.md)
- Review evidence: the provider-neutral foundation was independently reviewed on 2026-09-12; its reusable concurrency protection and manual-entry boundary remain applicable, while the former Google-specific review gates are superseded by ADR-0031.
- Confirmed scope: transform Japan Post's nationwide UTF-8 CSV into bounded postal-code shards served from Firebase Hosting on the same origin for property, homeowner, and construction-company forms. Preserve manual entry, correction, current stored address fields, and no-match/ambiguous/failure fallbacks.
- Design boundary: the manifest records source/basis date, `lastCheckedAt`, `generatedAt`, schema version, shard/count/checksum metadata; monthly manual checking is planned and a 60-day stale-check administrator warning is required. No runtime external API, credential, billing, quota, App Check, or Google attribution is required.
- Evidence: the 2026-08-31 official source generated 124,522 normalized records across 948 deterministic shards (14,774,729 bytes including manifest); parser/generator/provider focused tests pass; all three master form types use same-origin lookup with candidate selection and manual fallback.
- Completion contract: the normalized CSV transformation and manifest are covered by synthetic fixtures; generated shards have verified counts/checksums; candidate selection and freshness warning work; late responses cannot overwrite newer field input; ambiguous results never silently choose a candidate; manual save always remains available; no runtime network request or credential is introduced; all policy-selected documentation, UI, application, syntax, and build gates pass independently.
- Foundation evidence: the provider-neutral domain/types, all three master UI paths, per-field/generation concurrency protection, provider replacement/removal handling, and synchronous full/quick/edit form cancellation are implemented with registered tests. Revision `1d113e5b3e719679ed8d7d82ac3c313b0e6daf71` was deployed to `termite-warranty-dev` by successful push verification run `35303358082` and workflow dispatch deployment run `35303604261`, including Firestore, Functions, and Hosting. Public smoke verified `/` HTTP 200 and manifest/shard integrity for representative shards `001`, `500`, and `999`. Authenticated Dev UI smoke verified lookup, candidate selection, manual correction, and cancellation in all three master dialogs; homeowner and construction-company lists were observed without test records, while property persistence was not independently rechecked. Responsive/layout and accessibility acceptance were not performed.

- 2026-09-28 checkpoint: a failed manifest load can now be retried in the same page session; regression and all selected local gates passed. All 948 shard checksums/counts were verified. Homeowner/company save and reload, property no-match/manual entry, and a temporary stale-metadata warning were observed. Browser-control timeouts blocked property save/reload and remaining visual checks. See the detailed design for commands, exit statuses, limitations and next work. No completion credit or deployment is claimed.

- Retry checkpoint (2026-09-28): the interrupted property save/reload succeeded for postal autofill/manual correction, no-match/manual saving, and multiple-candidate selection. Desktop/narrow dialog display, keyboard selection, dialog focus and cancellation were checked; screenshots are linked from the detailed design. No application code changed. Formal accessibility acceptance and deployment are not claimed.

## Earlier Remediation Evidence Source (TR-001–TR-008)

- Review: coordinator plus read-only architecture, frontend, data, and test reviewers on 2026-09-11.
- Approval and decisions: user instruction in the current Codex task on 2026-09-12. A task/thread identifier was not available to the repository authoring context.
- External documentation checked for TR-002: [Firebase Manage functions](https://firebase.google.com/docs/functions/manage-functions) documents that the CLI deploys Functions from the default/configured Functions source, and [Organize multiple functions](https://firebase.google.com/docs/functions/organize-functions) documents codebases and multiple source packages. These sources support the identified packaging purpose but do not by themselves validate a local workspace-package solution.


## TR-010: Presentation-Day Defect Record (2026-10-03)

- Status: Owner requested recording only; no implementation or deployment on presentation day. No completion credit.
- Evidence: static review of local commit `b45382f6ef92e9ab897cee59b1164766375aaa70` and current uncommitted prototype. Runtime reproduction and current hosted-version matching are unverified. Source: owner's review/deferral instruction in this Codex task.
- Scope boundary: current `app/app.vue` routes to `MeetingPrototype`; the legacy account/master/case screens below are not on the normal current route. Confirm future usage before repairing or retiring legacy code.

| Priority / scope | Finding | Later completion condition |
| --- | --- | --- |
| 1 / current shared login | `useSession.ts` does not catch rejection of initial account reads; loading remains true and no retry/subscription is established. | Release loading on failure, provide safe recovery, retain enabled checks and generation/race protection. Test failed read, recovery and sign-out/account-switch races. |
| 2 / legacy account UI and current selector review | Legacy `CompanyPortalAccountManagement.vue` limits companies and accounts to 20 with no search/paging. Current company/branch selectors also initially load 20 but settings search can reload candidates. | Make eligible companies/branches beyond 20 reachable; verify 21+ candidates, affiliation, existing accounts and account list access. Do not equate current UI with the unreachable legacy workflow. |
| 3 / legacy warranty-service properties | `useMasterManagement.ts` limits active warranties to 20 before filtering inactive cases/properties, without replenishing from later matches. | No false empty result when a qualifying property follows 20 rejected candidates; test cancellation, inactive property and duplicate references. |
| Follow-up / legacy detail | Only warranties are watched; parent cases/properties are read once. Parent-only changes do not refresh the result. | Adopt and test required refresh behaviour without prohibited per-row subscriptions. |
| Follow-up / legacy case edit | `CaseEditDialog.vue` applies new property ID/defaults against the stale catalog; `CaseDetail.vue` reloads only when opening dialogs. | Refresh/merge created property before applying defaults; verify label, homeowner and company immediately after creation. |

Presentation workaround: owner plans browser reload if login stalls. Code inspection supports reinitialization and retry on reload if communication has recovered, not a guaranteed cure; persistent connection/permission failures can recur. No runtime workaround verification was performed.

Later priority for current prototype: login recovery, company/branch selection, then list completeness. Persistent pagination under HSC-008 is a separate proposal and does not itself correct missing candidates or filtering after a limit. Implementation gates must be selected from the actual UI/application/data impact plus the regressions above. This record is documentation-only; no code, deploy or app test changes.

### 2026-10-03 プレゼン中にオーナーが観測した追加2件（後続対応）

両件とも本Codex会話でのユーザー報告に基づく。開発側での再現、ログ・送信内容確認、原因特定、稼働版照合は未実施。後発作業として記録する指示であり、今は改修・配備しない。以前の静的レビュー結果とは証拠を分ける。

| ID | 観測された手順と結果 | 後続の再現・改修完了条件 |
| --- | --- | --- |
| TR-010-06 | 物件／保証新規登録で物件名・住所等を入力し本登録。面積が未入力で「物件名、住所、建面積を入力してください」と表示。面積を追加入力して再度本登録しても同じエラー。ダイアログ終了・リロード・再登録で成功。 | 同じダイアログ内で不足項目を訂正後、最新入力値で本登録できること。フォーム値・保存済み下書き・送信内容・サーバー検証の各時点を比較し、エラー前後の部分保存の有無と再試行での重複登録・二重採番も確認。正常完了までリロード不要を実行検証する。 |
| TR-010-07 | 保証グループが存在しない状態で工務店登録を開くと「HSC」が選択済み。登録で「指定された保証グループが存在しない」旨のエラー。HSCを作成後も工務店登録が同じエラーになり、リロード・再登録で成功。 | グループ0件で存在しない候補を既定選択しない。実在する有効なグループを作成後、リロードなしで候補と選択IDが更新され、工務店を登録できること。同名再作成時の旧ID残存、削除・無効化後の選択、空データ時の初期値とキャッシュ更新を確認する。 |

原因候補（未確認）：入力値と保存・送信データのずれ、エラー後のフォーム再送状態、グループ候補・選択IDの更新不足。リロードによる解消だけで共通原因とは断定しない。実装時は変更範囲の検証ゲートに加え、上記の失敗→訂正／マスタ作成→再試行を同一画面で検証する。現在の記録変更は文書のみ。


### 2026-10-03 独立先行実装への追加承認

後続の「独立先行できる作業を開始」「Local受入はまとめて」により通常経路の改修を実施。前記の「記録のみ」は過去チェックポイント。共有ログインに読込失敗解除・15秒打切り・再試行、最新アカウント世代のみ採用する処理を追加。通常画面の会社選択に明示検索・選択会社の全支店取得を追加し、21件以降を到達可能にする。保証グループ作成後の再取得と実在ID選択を維持し、物件送信時は最新フォーム値を複製する。

TR-010-06は面積未入力→訂正→同じ要求ID再送をサーバー／HTTP Callableで回帰検証。画面での当初現象の原因特定や手動再現完了とは扱わない。TR-010-07の実画面受入も残る。通常経路外の旧画面3件（関連一覧欠落・追従不足・新規物件選択）と旧アカウントUIは今回変更しない。現行から利用する必要性の判断を待ち、解決済みにしない。

[実測](../design/evidence/independent-implementation-2026-10-03.md)／[Local受入](../runbooks/local-acceptance-2026-10-03.md)。配備・既存データ初期化は行わない。


## 2026-10-06 Dev最新実施状態（通常再開済み）

具体的な対象・手順の提示後、オーナーの続行指示でDev停止・最新像保全・既存18 Functions／Hosting／default Rules／indexesの再配備・停止後0差分の場合のdefault移行・開発側検証・HS確認待ちまで承認された。通常再開、差分がある場合の業務上書き／削除、Auth／IAM変更、旧DB削除は対象外。以前の未承認／未実施の記述は準備時点の履歴であり、この最新状態を優先する。

実HEAD `02bf34fa5bdb2112c58642f5c88a24b5b7031ccf`をA〜Dで固定。C公表前はDev停止中、control/defaultはprotocol 2 recovering generation 5だった。停止後のsource/default各54文書・型付きhash一致、業務set/delete 0、現在権限一致・採番上限16を確認。baseline／全前像と計画をprivate保全し、計画 `default-return-20261006-plan1` はapply後verified。既存18 FunctionsとHosting/default Rules/indexesの配備完了。C公表はverification generation 6で成功。HS確認OKと別再開了承後にD公表も成功し、現在default/controlはnormal generation 7、旧sourceは当時retired generation 7として保全し、その後の別cleanup承認により削除済み（下記最新記録参照）。2026-10-06、提示したHS確認手順に対するオーナーの「OKだ」を利用者確認OKとして受領。Dの通常再開は別質問への「YES」了承後に実施し、実runtime/default/control正常とデータ保全を照合済み。配備の公開呼出IAM digestは前後一致。失敗時は停止を維持し、完成checkpointを確認して再実行する。

Hostingのアプリ991ファイルは全一致。Firebase管理の `/__/firebase/init.js` と `/__/firebase/init.json` はビルドに含まれないため、今回だけ旧確定同site版から2hashを取得し、認証済みproject/app設定と公開設定の一致も要求する限定operatorで補足照合する。全993 path/hash/config/live再照合は既存verifierを維持し、除外はしない。公開databaseURLは空文字で、他プロジェクトのURLは拒否。operator追加fixture4件は成功exit 0、実照合は全5項目成功exit 0、独立delta reviewにP1/P2残件なし。canonical CLI単独での管理2ファイル対応は残件。最新結果・SHA・未検証範囲は実測記録へ記載する。


## 2026-10-06 旧復元DBのcleanup完了

オーナーの「不要DBが削除可能なら削除」の独立指示に基づき、Devの `recovery-drill-20261006`（UID固定）だけを削除。全54業務文書がdefaultとprivate plan前像54件に完全一致、孤立/未知metadata/旧DB参照/Functions/Eventarc依存なし、C/D完了/HS確認/保護設定を検証。旧2metadata・DBmetadata/設定/予定・了承・operation・完了記録はprivate control `recoveryRetirements/retire-dev-drill-20261006` に保全し、別cleanup了承まで自動削除しない。旧DB固有PITR履歴と旧日次予定は削除で失われる。全履歴時点を退避したとは扱わない。

実DB一覧は `(default)` と `recovery-control` の2件のみ。defaultは現在の業務用、controlは更新リース・復旧計画/全前像・Auth/backup監視/運用記録用であり削除対象外。旧DB復帰を必要とする場合は保全前像等から新たな一時DB/計画を用意し、既完了のsource DBを要求する旧コマンドを再実行しない。今回のcopy/cleanupの実行wrapperはignored tmpの限定operator、汎用DB削除機能を実装したとは扱わない。

削除要求のLRO完了・source GET404・一覧不在・default/control normal7・journal deleted/lock解放を確認。16:38:28 JSTの最終読取でも業務54文書hash不変、private前像54/metadata2、リース0/lockなし。Auth/IAM/業務像変更なし。helper9試験/構文/独立レビュー/実確認の結果と途中停止/非同期完了は実測記録に記載。managedbackup初回/実復元などの既存未検証は変更しない。
