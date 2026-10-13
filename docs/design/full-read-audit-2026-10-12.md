# 全件読み込みの棚卸しと削減案

2026-10-13現在：承認済みの全件読取り削減と保証延長申込日改修はDev反映・開発側受入れ済み。保険検索用2項目を442物件へ整備し、それ以外の業務値・番号は不変。以下の本件に関するDev禁止・指示待ち・未反映は各工程実施時点の記録であり、現在の状態はこの記載を優先する。HSの業務受入れとは区別する。月別対象全体取得の現状維持と工務店アカウント一覧の後発対応は変更なし。[検証・導入記録](../operations.md)。

2026-10-13追加採用：月別／満了一覧の対象全体取得は現状維持。段階取得は運用開始後のRead／Write実績から再検討し、現在の改修残件から除外。その他旧取得は[追加工程O1〜O4](legacy-property-list-retirement.md#その他の旧取得処理の整理2026-10-13追加採用)で停止改修・Local受入れ済み。通常424成功・既存2skip、結合198成功。詳細は[運用記録](../operations.md)。HS旧catalog、旧5マスタ全件候補、旧案件／マスタの全件モード、旧物件参照全件を停止。工務店store、個別案件の保証履歴、保全移行は維持し、工務店アカウント一覧は後発。以下の段階取得推奨や旧経路の表は調査時点の記録として読む。

2026-10-13最新状態：R1〜R3とHS通常案内はLocal改修・受入れ済み。HS担当者一覧R4はオーナーが数件に限られるため対応不要と判断し、工務店担当者一覧はポータル展開時の後発検討とした。R5残件は[旧取得経路の具体設計](legacy-property-list-retirement.md)を採用、Local改修・検証・受入れ済み。以下は調査時点の記録で、現在の残件は[ロードマップ](../roadmaps/technical-remediation.md)を優先する。Dev反映禁止。

2026-10-13後続採用：R1は使用先記録案を撤回し、既存IDのまま接頭辞等値検索・自己ID除外・同一取引内保存へ改修する。末尾ハイフンは別物。R2／R3も既存コード管理記録を利用した保存・再有効化・CSVの対象取得を採用し、Local改修・検証を承認。[現行設計](master-code-read-reduction.md)を優先する。Dev反映禁止。

2026-10-13追記：R1〜R3の[具体設計案](master-code-read-reduction.md)と[ロードマップ](../roadmaps/master-code-read-reduction.md)を作成。方式未採用・実装未着手。以下の調査記録を根拠とし、現在の提案の詳細は追加設計へ集約する。

優先1（R5）の具体案・対象条件・異常時の動作変更・工程は、2026-10-13作成の[追加ロードマップ](../roadmaps/expiry-notice-read-reduction.md#優先1全件取得へ戻る処理の解消2026-10-13採用)を参照。HS通常案内は同日後続指示で方式採用・Local改修・技術検証済み。旧要求は今回変更しない。

2026-10-12、オーナーの調査・独立文書是正指示に基づく。主作業ディレクトリの現在の未commit差分を含む実装を静的に確認した。Devの実配備版や呼出頻度を今回再測定した結果ではない。以下は10月12日の調査時点の記録。10月13日のHS通常案内の採用・改修状況は冒頭の工程を優先し、他の改善案は未採用・未実装。調査自体ではDev反映・Local停止・実データ更新なし。

同日の追加指示により、不要な全件読み込みの削減対象を[優先要改善事項としてロードマップに登録](../roadmaps/technical-remediation.md#2026-10-12-全件読み込みの削減優先要改善事項)した。冒頭のHS通常案内を除き、本書に記載する個々の改善方式は提案段階である。以下の一覧は10月12日時点の実装を記録する。

## 調査範囲と読み方

`app`の画面・共有処理・データ取得、`functions`の業務／管理処理、`scripts`の移行・復旧・初期化を対象に、getDocs／onSnapshot／get／transaction.get／getAll／listUsers／listCollections／listDocumentsとページ反復を検索し、取得条件と呼出元を確認した。生成コピーのfunctions/domain、依存ライブラリー、試験fixture、ignored退避・ログは業務取得の別箇所として数えない。seedの一案件内取得は下表に記録する。

「全件」には、①コレクション全体、②工務店・役割・月等で絞った対象全体、③小分けして最後まで読む全件走査がある。20件ずつ画面表示していても、先に全対象を取得していれば読み込み削減にはならない。updatedAt順のクエリは同項目がない記録を含まず、本書の全件はそのクエリの取得対象全体を指す。一方、`getAll`は指定IDの一括取得であり、名称だけで全件読み込みとは判定しない。ダッシュボードのcount集計も物件本文の全件取得とは異なる。件数集計の索引問題は本調査とは分けて扱う。

## 共有storeとして維持する取得

| 場所・入口 | 範囲・タイミング | 判断 |
| --- | --- | --- |
| [useReferenceStore](../../app/composables/useReferenceStore.ts)のstart | HSログイン後、warrantyGroups・constructionCompanies・companyBranchesを有効／無効込みで全件購読 | 採用済みの例外。名称解決・選択候補・組織画面で共用。画面ごとの再取得へ戻さない。ログアウト／所属／復旧状態変更で解除・消去する |
| 同ensureReady → [catalog](../../functions/property-warranty.js) | 工務店利用者は自社、本支店利用者は自支店へサーバーで限定。自社の本支店候補を全件取得、5分保持 | 全社データの取得ではない。所属範囲を維持し、保存時の権限確認は省略しない |

根拠：[採用済み共有設計](reference-store-metrics.md)。共有storeは現在の3種類だけを対象とする。物件・個人アカウント・旧properties／homeownersまで全件保持する根拠にはしない。

## 現行画面・通常操作での改善候補

| ID | 処理と根拠 | 現在の取得 | 改善判断 |
| --- | --- | --- | --- |
| R1 | [property-warranty](../../functions/property-warranty.js)のsaveGroup／reenableMaster(group) | 保証グループを全件読み、正規化した接頭辞の重複を確認。既存グループの請求先等の編集でもsaveGroup内で再読取り | 全件不要にできる候補。接頭辞ごとの使用先記録をサーバーで管理し、対象接頭辞の記録だけを同時確定する方式。共有storeを重複判定の根拠にはしない |
| R2 | 同reserveBranchCode → 本支店保存／再有効化 | 対象工務店の全本支店を読み、コード全文の重複を確認。既にbranchCodeReservationsも読んでいる | 全社走査ではないが会社の支店数に比例。既存予約記録の完全性を照合してから、対象コードの予約と本支店本体だけの確認へ移す候補 |
| R3 | [property-bulk-import](../../functions/property-bulk-import.js)のpreview／commit | 対象工務店の全本支店を各処理で取得し、CSVのコードと突合。全会社／全物件ではない | CSVに登場するコードを重複除去し、予約記録→対応本支店だけを一括取得する候補。R2と共通化できる |
| R4 | [staff-account-management](../../functions/staff-account-management.js)のlistManageableStaffAccountsOperation → [HS担当者画面](../../app/components/StaffAccountManagement.vue) | 管理可能な役割の全アカウントを取得、名称順に並べ、画面だけ20件ずつ表示。登録・編集等の後にも一覧を更新 | 役割内の全件取得。通常一覧の「DB側で最新20件」という規則とは不整合。件数不明のため費用効果は未測定。サーバー側20件・検索条件付き取得へ修正する候補。現状の名前順からの変更と古いアカウントの探し方を合わせて設計する |
| R5 | [property-warranty](../../functions/property-warranty.js)のlist → [満了候補処理](../../functions/warranty-notice-query.js)、[保険候補処理](../../functions/insurance-notice-query.js) | 最適化が使えない条件ではpropertyWarrantiesの全件（工務店利用者は所属内全件）を読み、案内・日付等を後から判定 | HSの通常未案内／保険案内はLocalで候補取得へ改修済み。ただし準備情報の欠落・変更時、保証のdone/all、追加条件付き旧要求、工務店側の保証案内には従来経路が残る。Dev反映待ちと未改修経路を区別する |

R2/R3でコード全文を読む理由は、[branch-code](../../src/domain/branch-code.mjs)が業務上の文字数上限を設けず、現実装が長いコードも全文比較しているため。単純なコード等値検索への置換だけで現行の重複防止を保証しない。Firestore公式にも索引値のサイズ上限と長い値の検索注意がある。[索引の公式説明](https://firebase.google.com/docs/firestore/query-data/index-overview)

## 全物件取得ではないが、対象全体を取得する一覧

| 処理 | 現在の条件 | 判断 |
| --- | --- | --- |
| propertyList | 条件なしはDB limit20、指定時は保証番号完全一致、工務店／本支店の権限範囲を加味 | 改善済み。条件なし全件取得には該当しない |
| 保険報告list(reportMonth) | insuranceQueryStart／Endの対象月範囲、処理済み表示ではinsuranceReportedQueryMonthsの別検索を合流 | 候補全体の取得。全候補が対象なら結果的に全物件相当になり得るが、無条件走査とは異なる |
| billingList／certificateList | 保証グループ＋未処理対象月の上限、または処理済みを含む月の一致 | 対象全体の取得。CSV選択・過去未処理繰越を維持する必要がある |
| 最適化成立時の保証／保険満了案内 | 未案内と満了日上限／専用保険検索日付の範囲 | 候補全体の取得。候補をさらに画面単位で分ける余地はあるが、まず現在の最適化の導入・効果確認が先 |
| 旧list(billingMonth) | billingQueryMonthsの指定月一致 | 月条件付き全対象。現在の請求画面はbillingListを使用する |

表示20件だけを欲しい場合の「続きから取得」と、対象全体の選択・CSVを別用途として扱う案を推奨する。表示側は権限・条件をサーバーで適用し、同順位を区別するIDと続き位置を返す。後から業務判定する候補では、候補20件を読んだだけで「対象なし／終了」と誤判定しない。CSVは同じ条件で対象を最後まで読み、上限や中断を明示する。全件選択が「今見えるページだけ」へ変わらないようにする。この変更にはページ数・順序・更新中の選択の扱いの設計が必要で、今回自動適用しない。Firestoreの続き取得自体は公式機能。[公式ページ分割](https://firebase.google.com/docs/firestore/query-data/query-cursors)

## 旧経路・非表示機能に残る取得

現在の通常入口は[app.vue](../../app/app.vue)からMeetingPrototypeであり、認証処理以外の旧ページは通常表示されない。以下を「現在毎回発生している読み込み」とは断定しない。ただし画面非表示はサーバー処理の停止ではない。

| 処理・ファイル | 残る全件取得と用途 | 対応案 |
| --- | --- | --- |
| property-warrantyのcatalog（HS向け旧呼出） | グループ全件。search指定時は会社全件／支店全件から名前の部分一致を後判定。groupId時はグループ内会社全件、companyId時は会社内支店全件 | 新HS画面の候補は共有storeへ移行済み。旧呼出頻度を確認し、不要入口の整理か、DBで条件適用。工務店store用の認可経路は維持 |
| 同accounts | constructionCompanyAccounts全件。画面側で先頭20件または文字検索 | 工務店担当者メニューは非表示だがAPIは残る。再開時にDB側20件＋検索へ。全件を共有storeへ追加しない |
| [masterCatalogRepository](../../app/repositories/masterCatalogRepository.ts)、useMasterCatalog | branches／constructionCompanies／homeowners／properties／warrantyServicesの5種類を全件取得 | 現通常画面からの利用なし。再利用前に現行3種類のstoreと必要ID・検索候補取得へ分離。旧物件・施主は全件キャッシュしない |
| [firestoreCaseQuerySource](../../app/repositories/firestoreCaseQuerySource.ts)、caseListRepository、useCaseList | complete=trueで旧casesと5種類の参照を全件購読 | 呼出条件を廃止またはサーバー検索へ移行してから再利用。通常complete=falseは各20件＋表示行のID参照 |
| [useMasterManagement](../../app/composables/useMasterManagement.ts) | complete=trueの一覧全件購読、loadPropertyReferencesのhomeowners／constructionCompanies全件取得 | 現通常画面からの利用なし。検索対象をDBで絞り、編集済み選択値はIDで補足 |
| firestoreCaseQuerySource.subscribeWarranties、[applied-warranty-management](../../functions/applied-warranty-management.js)、[company-portal](../../functions/company-portal.js)の旧保証追加／変更 | 選択した1案件のappliedWarrantiesを全件読み、表示または重複／一覧用情報を更新 | 全案件の走査ではない。旧機能再開時に検討し、要約の正しさを保つ必要がある。根拠なくlimit20へ切らない |

## 保全・移行・初期化での全件走査

ここは完全性の確認が目的であり、キャッシュで省略すべき通常画面の読取りではない。小分けにしても最後まで読めば総読取りは全件分である。

| 処理・所在 | 取得内容 | 改善可能な範囲 |
| --- | --- | --- |
| [recovery-backups](../../functions/recovery-backups.js) | Auth利用者を1000件ずつ最後まで取得して退避。条件成立時に実行 | 完全バックアップを維持。重複実行抑止・必要頻度は別運用判断。Firestore物件の全件取得と混同しない |
| [recovery-controller](../../scripts/lib/recovery-controller.mjs)、[default-recovery](../../scripts/lib/default-recovery.mjs) | 全業務・子階層の小分け走査、権限・採番・マスタ・予約・取込み記録の全件照合、Auth全件。移行計画items等の全件取得もある | 全件照合は維持。一つの停止中の同じ読取像を再利用できる範囲だけ統合検討。書込み／世代変更をまたいだ再利用はしない |
| [historical-intake-execution](../../scripts/lib/historical-intake-execution.mjs) | 取込み前後・中断再開の全業務像、保持アカウントの全件照合を反復 | 反復を減らすなら、途中変更の検出・再開時の完全照合を代替できることが条件。今回安全確認を削らない |
| scripts/libのmonthly-query／billing-query／certificate-query／insurance-report-query／insurance-notice／dashboard-migration | propertyWarrantiesを100件等に分けて全件走査し、必要項目を補完・照合 | 初回補完は全件必要。将来の通常保存で検索値を同時更新し、通常画面で再補完しない。移行をまとめる場合も書換え対象と準備完了条件を分離 |
| scripts/libのproperty-address／property-name／extension-application-migration | 301件または1001件を上限として全体点検、前像・計画・対象の再読取り。延長移行はcontrolの進行中操作も全件確認 | 上限超過は停止する設計。無制限取得ではないが全体棚卸し。安全な再開と変更検出を維持 |
| [auth-recovery](../../scripts/lib/auth-recovery.mjs) | 役割の保存文書を上限1001件、Authをページ取得して照合 | 個別欠損修復でも周囲の権限照合が必要。表示用キャッシュで置換しない |
| [reset-dev-business](../../scripts/reset-dev-business.mjs)、[reset-meeting-prototype](../../scripts/reset-meeting-prototype.mjs) | 対象コレクション・保持アカウント・Auth・設定の全件取得、対象削除に伴う内部走査 | 手動の初期化専用。実行許可なしで使わない。小分け化でメモリー上限を設ける余地はある |
| [migrate-development-master-fields](../../scripts/migrate-development-master-fields.mjs) | 旧warrantyServices／properties全件 | 旧移行専用。再利用時は小分け・上限・再開条件を見直す |
| [firestore-recovery-provider](../../scripts/lib/firestore-recovery-provider.mjs) | バックアップ／予定の管理APIを全ページ列挙 | 業務文書の読取りではない。管理上の完全列挙を維持 |
| [seed-emulator](../../scripts/seed-emulator.mjs) | 架空1案件の既存appliedWarranties全件を読み一覧用値を再生成 | 開発用fixture専用。日常利用の削減対象外 |

## 優先する仕組みと影響範囲（提案）

1. **満了案内の既存改修の導入判断を先行**。既にLocal検証済みの範囲を作り直さない。Dev導入は明示指示後。R5の旧条件・工務店経路は別の未改修範囲として、所属条件と業務条件をDBへ渡す設計にする。準備できていないのに空一覧を返さない。従来経路を止める場合は、移行完了確認・旧クライアント対応・復旧時の読取互換を先に定める。
2. **コードごとの使用先記録を整備（R1〜R3）**。保証接頭辞は正規化後の値、本支店は工務店ID＋コード全文から同じキーを作る。記録本文でも全文と所有先を照合し、衝突・欠落は安全側に止める。現在の予約の欠落・重複を全件棚卸ししてから必要分だけの確認へ移す。新規・編集・再有効化・CSV・初期取込み・seed・復旧を一緒に対応。現在保証グループは無効中も接頭辞予約、本支店は有効状態に応じた予約という違いを維持する。導入前は旧走査を残し、新方式だけを先行公開しない。差戻し時も予約と新規登録済みデータを失わない。
3. **アカウント一覧の読取り範囲を制限（R4、旧accounts）**。通常は最新20件、古い対象は承認した検索で探せるようにする。全一覧の名前順を維持する必要があるなら別途仕様判断が必要。現行役割・無効者の管理権限を維持し、更新後は該当行か現在の検索だけを再取得する。アカウント無効化の判定を古い画面キャッシュへ任せない。
4. **月別／満了一覧の表示と一括出力を分離**。対象数の増加を測定してから検討する。単に画面を20件表示にするだけでは効果なし。全選択・CSV・件数表示・同時更新・複数期間の重複を維持する設計と試験が必要。
5. **旧入口の整理と再発検出**。通常画面の取得は「最大件数＋サーバー条件」を必須にし、全件許可を共有3マスタ／業務CSV／保全移行等の用途ごとに明示する。架空の対象外物件を増やしても一画面の読取数が増えないこと、重複確認で無関係な支店を読まないこと、未準備時の従来取得が見えることを試験・既存計測で確認する。関数名の文字検索だけで検出せず、getAllの指定ID数やページ反復も検査する。

R1〜R3の変更は保存・予約・移行・復旧と既存データの整合に影響する。削減量はグループ数／支店数／入力コード数／操作頻度によるため、実測なしに削減率を断定しない。今回の成果は棚卸しと提案、既存文書の是正であり、上記改修の完了・採用やDev反映を意味しない。
