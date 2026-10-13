# 現行実装の点検・旧画面撤去・バックアップ準備

後続の承認済み改修でACCOUNT-01とRead候補1～5（4は5分共有）を実装・独立レビュー・Local検証し、Dev配備と開発側受入まで完了した。[現在の改修結果](../account-concurrency-read-efficiency-2026-10-05.md)参照。以下は点検時点の結果で、候補6と郵便番号自動更新は引き続き未改修。旧画面撤去と軽微UI修正も後続Hosting配備に含まれる。バックアップはオフラインモックのまま。

- 状態：ローカル改修と点検結果。今回のDev／Prod配備なし。
- 根拠：2026-10-05のオーナー指示。現行の打ち合わせ画面を継続改修の基礎とし、旧画面撤去後にサブエージェントで致命的不具合を点検。明確な軽微不具合は修正し、非効率な処理を列挙し、バックアップ／リストアの大枠をモックで準備する。
- 共通開始点：primary repository、main、`ed324be46e11eb5da707a401153f8dfa2d5f6e71`。開始時worktree clean。各担当が識別情報と正本文書を独立確認してから着手。
- 境界：実データ、Firebase設定、メール実送信、実バックアップ、配備、Prod、依存版、Rules／業務スキーマを変更しない。Devの確認用データと開いているブラウザ入力を保全。

## 撤去と保持

`app/app.vue`は認証アクション以外のログイン後にMeetingPrototypeを描画する。通常経路外の旧UI18部品と旧ページ10ファイルを撤去した。旧URLは今後の利用経路として維持しない。トップページの旧DashboardOverview参照を空の入口へ変更し、保持するdefault layoutから撤去済みの案件・マスタへの5つのメニューリンクを除去した。差戻しが必要なら今回削除したUIと対応する旧表示テストだけをGitから戻し、今回の修正・データを保持する。

削除した部品（すべて`app/components/`）：AppliedWarrantyDialog、CaseDetail、CaseEditDialog、CaseFilterPanel、ConstructionCompanyTable、DashboardOverview、HomeOwnerTable、MasterConstructionCompanyContactFields、MasterDetail、MasterEditDialog、MasterFormFields、MasterHomeownerContactFields、MasterManagement、MasterPropertyReferenceFields、PropertyTable、PrototypeDashboard、QuickCreateMasterDialog、WarrantyServiceTableの各.vue。

削除したページ：`app/pages/cases/{index,[id]}.vue`と`app/pages/masters/{construction-companies,homeowners,properties,warranty-services}/{index,[id]}.vue`。

保持：現行画面・共通部品・LoginPanel・auth/action・スタッフ管理・延期中ポータルとそのlayout。共有composables/repositories/utils、既存ドメイン・サーバー機能・Rulesは今回削除しない。旧UIのみを読む5テストを廃止し、混在テストから旧画面assertだけを除去した。共有住所・Snackbar・認証・ポータル・バックエンド・検索の検証は保持。

## 独立点検と不具合

担当はCLEANUP-01（参照関係）、AUDIT-01（サーバー／業務／権限）、AUDIT-02（非同期UI失敗）、READS-01（処理効率）、BACKUP-01／FIX-01（モック・軽微修正）。読取担当はアプリを書き換えず、実ブラウザ・実Firebaseには接続していない。

| ID | 確認した不具合 | 対応状態 |
| --- | --- | --- |
| UI-01 | 検索中に入力を変更すると、送信時の条件と異なるChip／適用済み判定が古い結果に付く。busy時の条件クリアも入口となる。 | 修正済み：送信前の条件を固定し、busy中のクリアを抑止。 |
| UI-02 | 一括保険報告の途中失敗後、再取得で選択が空になっても確認画面から実行でき、0件処理で完了表示する。 | 修正済み：空選択を拒否。未変更の失敗分だけ同じ処理IDで再試行し、成功済みは除外。応答喪失後にrevision／報告期間が変わった行は選択解除して再確認を要求。 |
| UI-03 | 報告失敗後の一覧再取得も失敗すると、元の報告エラーが再取得エラーで隠れる。 | 修正済み：一次エラーと再取得失敗を区別。 |
| UI-04 | 工務店アカウントの作成後、一覧更新が失敗すると設定メールを送信せず、作成ボタンだけ無効になる。 | 修正済み：設定メールと付随する一覧更新を分離し、片側失敗を正確に表示。 |
| ACCOUNT-01 | 担当者のメール／名前変更・停止／再開、工務店アカウントの停止／再開を同時実行すると、Firebase AuthとFirestoreが不一致になる。 | 未修正。アカウント単位の直列化・片側失敗の復旧設計が必要。 |

ACCOUNT-01は`functions/staff-account-management.js`のupdateStaffAccountOperation／setStaffAccountEnabledOperation、現行`functions/property-warranty.js`のsetAccountEnabled、延期中`functions/company-portal.js`のsetConstructionCompanyAccountEnabledOperationで確認。実export関数をメモリ上のAuth／DBで実行し、AのAuth更新後に文書更新を待機、Bが両方を更新、Aが文書更新を完了する順序で、両者成功だがAuth=B／文書=Aとなった。有効化と無効化の重複でもAuth無効／文書有効を再現。担当者の2回と工務店2経路の追加1回の`node --input-type=module`診断は各exit 0。これは実環境事故や既存トークンの権限突破を観測したという意味ではない。Auth変更を再試行されるFirestoreトランザクション内へ直接入れる応急修正は避け、並行操作・片側失敗・復旧の試験を伴う別の改修が必要。

AUDIT-02は実Vue scriptを無通信の合成ハーネスで実行し、`node tmp/audit-02-ui-probes.mjs`がexit 0、10確認項目成立（不具合再現を含む）。tmpはignoredで正本ではない。修正前の既存物件テスト32件も成功。修正後は物件テスト40件成功（8件追加）。独立したVERIFY-03の`node tmp/verify-03-ui-probes.mjs`は10項目成功・exit 0。修正途中の再選択処理で、保存成功／応答喪失後に次の報告期間へ進む危険をVERIFY-02が検出し、元revision／期間の一致条件と再確認の案内を追加して再検証した。タブ／会社変更の競合はプログラム上で発生するが通常UIのbusy無効化が抑止するため、利用者が通常操作で再現できる不具合とは判定していない。更新成功後の詳細取得失敗でも直接再送のrequestId／revisionは保持された。

今回のコードレビューでは、採番重複・重大な業務データ破壊・保証／保険／請求の逆順取消に関する確定した重大不具合は見つからなかった。不存在の保証やHS受入ではない。最新enabled確認、revision、receipt、報告／請求対象期間照合は保持する。スタッフ業務Rulesの承認済み境界や未確定仕様を欠陥扱いしない。

## Read／Write改善候補（未採用・未実装）

「過去24時間で1万件超」はオーナーがコンソールで見た数値。今回その内訳や課金Readの発生源を独立確認していない。現行業務一覧はpropertyPrototype Callableの一回取得で、旧画面の継続購読を原因と推定しない。アカウントのonSnapshotは即時無効化のため保持する。

| 優先 | 現行処理と影響 | 改善案／注意 |
| --- | --- | --- |
| 高 | `functions/property-warranty.js` catalogはcompanyId指定でも全社支店を取得し、JSで会社を絞る。 | 支店queryへconstructionCompanyId条件を付ける。会社条件＋更新日時＋IDの既存indexを照合。scope／無効候補／21件目以降を回帰。 |
| 高 | 工務店名Autocomplete検索は会社とグループしか使わないのに、catalogが全支店も取得する。 | 会社候補と支店候補の取得用途を分離。認証／enabled／scopeは保持。 |
| 中 | グループ指定catalogも全工務店を取得後に絞る。 | defaultGroupIdをDB条件へ。複合indexの整備・実環境確認が必要。 |
| 中 | タブ移動ごとにloadCatalogを実行。担当者管理・アラート設定や閲覧専用詳細でも不要な会社／支店候補を再取得。 | 必要タブ・編集時のみ候補を取得。詳細の返却ラベルを利用。権限情報を無期限キャッシュしない。 |
| 低 | saveCompany／saveBranchは同一参照をtransaction前と中で2回読む。 | transaction内の最新検証を残して外側重複取得を整理。 |
| 低 | 内容が変わらない物件保存も文書＋receiptの2Writeと履歴・revision更新を行う。 | 正規化後の変更なし保存をUIで抑止する案。冪等性receiptは削除しない。 |

READS-01は実propertyPrototypeOperationを架空DBで呼び、取得文書数を数えた。工務店200／支店1000／グループ3、選択会社の支店5という**架空条件**で、既定catalog44、工務店名検索1204、会社指定1024（戻る支店5）、グループ指定224（戻る会社1）。`node --input-type=module`診断exit 0。ネットワーク・実データ変更なし。課金Readの実測ではなく、空query課金やindex読み等を算定していない。会社条件をDB側へ移すと、この例の支店取得は1000→5になる。不要な共通loadCatalogを省けば、同例では担当者タブの46文書（catalog44＋alertSettings2）の反復取得を避けられる。

条件付き物件一覧の全件取得は承認済み例外。無条件は20件。条件指定時は物件数N＋一致行の重複排除した会社／支店文書等を毎回読むため、件数増加時の影響が大きい。完全一致番号・会社条件等をDB側へ寄せる改善はHSC-023と取得設計／indexの確認対象で、今回変更しない。actorチェック、transaction内の最新enabled、採番重複確認、receiptは安全性に必要な読書きとして保持。

## バックアップ／リストアの土台

`scripts/lib/backup-restore.mjs`はスキーマに依存しないprovider境界とモックの操作結果を定義し、`scripts/backup-restore.mjs`はstdoutにJSONを返すCLI。依存追加なし、Firebase SDK・認証情報・ファイル保存・ネットワーク・実データRead／Writeなし。formatVersionは合成メタデータ形式でありFirestore業務スキーマではない。

```powershell
node scripts/backup-restore.mjs status --mode mock
node scripts/backup-restore.mjs backup --mode mock --resource firestore
node scripts/backup-restore.mjs restore --mode mock --resource firestore --backup-id mock-firestore-backup --rehearsal
node scripts/backup-restore.mjs backup --mode mock --resource auth
node scripts/backup-restore.mjs restore --mode mock --resource auth --backup-id mock-auth-backup --rehearsal
```

全結果は`status: simulated`、`operationPerformed/dataRead/dataWritten: false`。backup IDは架空で、復元は同じresource/provider/version/idを持つ合成メタデータだけを受け付ける。明示mode mock、復元時rehearsalが必須。real、apply、project指定、不明引数、互換性不一致はexit 1で拒否。statusのplannedPolicyは[HSC-020](../../requirements/house-solution-confirmations/HSC-020-production-firebase-operations.md)の採用済み運用目標であり、設定済み／バックアップありの主張ではない。

実接続前の残作業：本番DB選択、HS所有の正確な環境識別とIAM、Firestore管理バックアップ毎日30日／PITR7日の設定確認、Auth週次・重要変更後のprivate Storage export30日保持、失敗通知、分離環境での復旧と件数／採番／関連情報の整合検証、24時間損失／営業時間4時間復旧の実証、承認付き手順・差戻し。管理バックアップをCloud StorageのJSONドキュメント出力に置き換えない。今回Chromeコンソールへの操作や設定は不要で未実施。

## 検証と文書整合

分類：UI／ロジック／文書、モックCLIとpackage test登録の変更。範囲が広いため全7ゲートを選択。最終コードに対するdomain・型検査・build・Rules回帰は成功。最終文書へのgovernanceと差分を確認してから統合する。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `npm test` | 最終168件中166成功・既存2skip | 0 |
| `npm run typecheck` | 最終型検査成功 | 0 |
| `npm run build` | 最終静的生成成功、現行root／auth／保持ポータル等9経路出力 | 0 |
| `npm run test:rules` | 最初はCLI設定のsandbox EPERMでexit 1。権限調整後成功、最後のUI再試行修正後も88件成功・0skip | 0 |
| `node scripts/check-functions-syntax.mjs` | 20ファイル構文成功、後続Functions／domain変更なし | 0 |
| `node --check scripts/seed-emulator.mjs` | 構文成功、後続seed変更なし | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 共通契約・policy・文書整合成功、最終文書の差分を同コマンドで再確認 | 0 |

追加のモック6件と物件40件はnpm testに含む。buildの既存プラグイン時間／Nitro外部参照の警告は残るが生成exit 0。Emulatorは架空demo-termite-warrantyのみで、実データに接続しない。選択ゲート省略なし。最後のUI修正で無効となったdomain/type/buildを再実行し、Functions／seedは対象ソース変更がないため成功証拠を再利用する。

変更ファイルは削除28件と次の19件（計47件）。削除名は上記一覧、残る差分の正本はGit。

- UI：`app/components/MeetingPrototype.vue`、`app/layouts/default.vue`、`app/pages/index.vue`。
- モック：`scripts/backup-restore.mjs`、`scripts/lib/backup-restore.mjs`。
- 試験・登録：`test/property-warranty.test.mjs`、`test/backup-restore.test.mjs`、`test/company-portal.test.mjs`、`test/master-data.test.mjs`、`test/postal-lookup.test.mjs`、`test/prototype-data-boundaries.test.mjs`、`package.json`。
- 文書：`CHANGELOG.md`、`docs/specification.md`、`docs/operations.md`、`docs/roadmaps/technical-remediation.md`、`docs/design/README.md`、`docs/design/meeting-prototype-2026-10-03.md`、本記録。


影響文書：仕様、試作契約への新記録、技術改修台帳、運用、Changelog、design索引。Rules・データ契約・ADR・本番運用目標・ロードマップ進捗・governance設定・依存版は変更しない（UI欠陥復旧とモック準備であり新たな業務スキーマ／権限／実運用方式を採用していない）。バックアップの実処理とACCOUNT-01改修は未完了として残し、この点検作業の結果と区別する。

次の操作：今回のローカル差分の確認、ACCOUNT-01の直列化／復旧設計、Read改善の採用範囲決定、実バックアップ接続・分離復旧試験。Dev反映と実設定は今回実施していない。実ブラウザの入力操作・HS受入・24時間Read内訳は未確認。
