# Prod対応棚卸し・配備準備計画（2026-10-13）

2026-10-13後続指示により[事前構築ロードマップ](../roadmaps/production-readiness.md)へ移行。認証・初回保守公開照合に続き、通常CI・Prod接続、初期化・管理者・初回投入・復旧／バックアップもLocal実装・事前検証。以下は棚卸し時の状態で、実装未着手の記述を現在値に用いない。基盤事前構築の計画・工数配分・現在の未実証範囲はロードマップを優先する。

## 状態と判断

オーナーが棚卸し・配備／認証／検証手順の具体化・工数再評価を指示し、10月末納品ラインの維持を指定した。**今回完了したのは調査と計画文書の更新だけで、実装・構築は未着手。** 提案する改修方式は次の着手時にレビューし、実環境の変更には対象・範囲の承認を要する。

対象は主作業ディレクトリのHEAD `f71c9cd388355a0aca1c97dc149fe1deb683c233` と前ターンからの文書／PDF差分。製品ソースの未コミット変更は開始時になし。`app`・`src`・`functions`（生成domain／node_modules除外）・`scripts`・`.github`・Nuxt／Firebase設定を検索し、主要入口・呼出先・対応試験を読んだ。privateな設定・認証情報は読まない。GitHub／Cloud実設定の新たな照合、ネットワーク認証、アプリ試験は今回未実施。公開公式資料は末尾の範囲で確認した。

結論は**10月23日の構築は条件付きで狙えるが、現時点で達成確定とは判定できない**。接続先置換だけでは動かず、自動認証、初回初期化、配備証明、復旧経路の対応が必要。一方、業務モデル・CSV・採番・検索投影・照合の既存実装を再利用でき、旧移行・Devデモ処理を一律Prod化する必要はない。10月30日を月末納品の作業上の最終判定日と置く（31日は土曜）。期限を検証省略や未受入れの完了扱いで守ることはしない。

## 実ファイルによる棚卸し

「必要対応」は調査上の実装候補で、実装済み／実行承認済みという意味ではない。行番号は調査時点、詳細はリンク先を正本とする。

| 区分 | 実ファイル・確認箇所 | 現在の事実 | 必要対応／再利用範囲 |
| --- | --- | --- | --- |
| P1 画面接続 | [Nuxt設定](../../nuxt.config.ts)、[Firebase plugin](../../app/plugins/firebase.client.ts) | `firebaseDevProjectId`固定。Hosting init.jsonもDev一致を要求。診断先URLもDev値から生成 | 環境ごとの明示的な許可設定とHosting実値照合。診断先も同じ確認済みprojectから決定。Local・分離試験は維持。未知／未設定Prodは拒否 |
| P1 Functions入口 | [local-runtime](../../functions/local-runtime.js)、[index](../../functions/index.js) | Dev固定の判定をindex読込み時に実施 | 配備時のソース検出と実行時の双方を検証。単に判定を削除せず、承認対象とEmulator混在拒否を共通化。業務Callable本体の全面変更は不要 |
| P2 配備照合・操作 | [default-recovery](../../scripts/default-recovery.mjs)、[preflight](../../scripts/lib/default-recovery-preflight.mjs)、[admission](../../scripts/lib/default-recovery-admission.mjs)、[observation](../../scripts/lib/default-recovery-observation.mjs) | project、dev-inspect／dev-execute、操作許可がDev限定。CLIのrefresh token必須。read-only preflightはready=falseでも個別checkがpassになり得る | 環境スコープと読取／書込の分離を維持しProdへ対応。CIの照合はADC対応が必要。終了0だけでなく全checkのpassを判定。既存API許可範囲・清浄ソース・実版照合は維持 |
| P2 公開成果物 | [build](../../scripts/lib/default-recovery-build.mjs)、[release proof](../../scripts/lib/default-recovery-release-proof.mjs)、[provider init](../../scripts/lib/default-recovery-provider-init.mjs)、[build入口](../../scripts/build-recovery-release.mjs) | 新鮮な同一版buildを要求。Functions source／Hosting hash照合は再利用可能。provider initの2予約ファイルは同サイトの過去公開版を基準に照合する経路がある | Prod設定もbuild／成果物の同一性へ結び付ける。初回は過去版がないため下記の初回手順が必要。確認対象の現公開hashをそのまま期待値にしない |
| P3 初期制御状態 | [fixed recovery内部](../../scripts/lib/default-recovery.mjs) initialize、[CLI許可](../../scripts/default-recovery.mjs) | 内部initializeはprotocol2・recoveringを作るが、クラウド実行許可一覧にinitializeがない。旧[recovery-controller](../../scripts/lib/recovery-controller.mjs) initializeはprotocol2を作らない | 空の業務／制御DB、対象版、既存状態なしを条件に専用の安全な初期化入口を用意する案。途中実行の一致のみ再開。旧initializeやseedを流用しない |
| P3 管理者・空環境 | [seed-emulator](../../scripts/seed-emulator.mjs)、[Functions復旧](../../functions/recovery-runtime.js) | Local seedは架空管理者・設定を作る。通常の画面は復旧状態に依存 | Prod管理者は本人情報でAuth UIDとstaff文書を対応させる別の限定手順。試験データなしの空環境の整合確認→管理者確認用公開／normalへの移行を設計・分離環境で試験。初期化印だけ直接normalへ書換えない |
| P3 正式初期投入 | [historical-intake](../../scripts/historical-intake.mjs)、[execution](../../scripts/lib/historical-intake-execution.mjs)、[plan](../../scripts/lib/historical-intake-plan.mjs) | CLIと実行層の両方がDev／Local限定。確認文言はreset-dev-business。既存planは検索投影を生成、executionは7種の準備情報と設定保全を扱う | Prod用の対象確認・初回空状態確認を追加。現行計画／投影／設定保全／再開／全件照合を再利用。既存Prodの再初期化を初回投入承認に含めない。Dev試用結果を丸ごとコピーしない |
| P4 復旧・保護 | [recovery CLI](../../scripts/recovery.mjs)、[options](../../scripts/lib/recovery-options.mjs)、[provider](../../scripts/lib/firestore-recovery-provider.mjs)、[controller](../../scripts/lib/recovery-controller.mjs) | projectとproviderがDev限定。configure-backups、PITR／backup restore、baseline／verify等の内部処理あり。protocol2の旧切替操作は拒否される | 固定方式A〜Dで使う現役コマンドだけProdへ拡張。計画・実行・世代・対象・承認の検査を維持。空の一時DBへの復元、現行権限／採番保持を試験 |
| P4 Auth復旧 | [auth-recovery CLI](../../scripts/auth-recovery.mjs)、[auth-recovery library](../../scripts/lib/auth-recovery.mjs)、[account-mutation-recovery](../../scripts/account-mutation-recovery.mjs) | 対象はDev限定。Auth復旧の私有bucket名もDev固定 | projectと対応する許可bucketへ束縛し、別環境のhash設定／退避像を拒否。通常配備CIにAuth復元権限を与えない。人の明示操作と自動配備認証を分ける |
| P4 自動退避 | [recovery-backups](../../functions/recovery-backups.js) | bucket／証拠はパラメータ、実行はADC。automation既定false、監視は日本時間10時。正常状態でAuth退避を実行 | 主にProdの私有bucket・権限・証拠・通知設定と実受信。Dev停止例外を持ち込まない。既存処理の全面再実装は不要 |
| P5 CIと検証契約 | [deploy workflow](../../.github/workflows/deploy-development.yml)、[workflow契約](../../scripts/development-workflow-contract.mjs)、[対応試験](../../test/development-workflow-contract.test.mjs) | main pushは検証、手動だけDev配備。SA秘密を使用。契約も手動・Dev固定を要求 | dev→Dev、受入済みmain→Prodの採用方針へ変更。契約／試験も同時更新。資格情報なしの検証、失敗時停止、同一版成果物、環境別競合防止を維持 |
| P5 Cloud設定 | [firebase.json](../../firebase.json)、[control Rules](../../firestore.control.rules)、[環境仕様](../requirements/environment-configuration.md) | firebase.jsonのFirestore定義は業務DBのみ。制御DBのRules、IAM、Auth、Billing、通知は同一ソース配備だけでは構築できない | 2DB・2Rules・索引・Auth・API・CI／実行主体・通知を個別に作成／照合。必要権限は操作ごとに実証し、Devの広いroleをコピーしない |

### 今回Prodへ拡張しないもの

- Dev架空データ用のseed／reset、旧master補完とpaginationの2手動workflowはDev限定のまま。`migrate-development-master-fields.mjs`、`seed-development-pagination-data.mjs`、`seed-development-demo.mjs`、`reset-meeting-prototype.mjs`、`reset-dev-business.mjs`をProd許可へ一括置換しない。
- 新Prodを現行形式から初期投入する前提では、旧住所／名称、monthly／billing／certificate、dashboard、insurance report／notice、extension applicationの旧データ専用migration CLIを全てProd化する必要はない。新規投入の生成・全件照合と、復元時の現行互換性検査を必須とする。将来旧形式を持ち込む場合だけ、該当移行を追加レビューする。
- 業務モデル、CSV列、番号、共有Store、月別対象全体取得、Rulesの業務制約を変えない。ポータル再開、郵便番号自動更新、帳票生成等の後発機能を納品前へ追加しない。
- 長期鍵への切替、通知先変更、契約変更、業務DB削除保護・APIキー制限の未決値は自動採用しない。

## 認証・配備の具体的な手順案

### 1. 実装前／作成前に確定する入力

A本人・回復手段、Aの既存BillingのID／有効性／権限、希望project名／URL、GitHub実repository／owner ID・契約・ブランチ保護可否、通知先、HS試用日を確認する。HS管理者情報は受領済みで再提出待ちにしない。秘密情報は非公開管理とし、文書へ書かない。実Prodのproject ID／number、Web App ID、site、実行／配備SA、WIF provider、私有bucketは作成後に確定する。架空識別子を実環境設定へ入れない。

### 2. 認証方式の技術確認を最優先にする

通常配備は採用済みWIFを使用し、人の都度ログインを不要とする。具体案は**Prod専用SAを介したWIF**で、repository／ownerの不変ID、許可ref、GitHub environmentに束縛する。verify jobにCloud資格情報を渡さず、配備／照合jobだけ`id-token: write`を持つ。PRの任意コードにはProd資格情報を渡さない。environment利用時にOIDCのsubjectが変わることを条件設計へ反映する。

Firebase CLIはADCを検出することを公式資料とローカル`node_modules/firebase-tools/lib/requireAuth.js`で確認。一方、auth actionはFirebase Admin SDKのWIF非対応の注意を掲示している。現在の独自CLIはrefresh tokenを直接要求しているため、**WIFを追加しただけでは独自preflightは動かない**。GoogleAuth等による短期tokenを取得し、Firestore／管理API／Adminの明示的credentialへ渡す共通入口を検討する。これは未実装・未実証であり、直接ADCを渡せば全SDKが動くと断定しない。

最初の実装checkpointで、認証供給部分を分離試験し、Cloud実証を行う承認・対象が得られた時点で、Firebase CLI＋独自読取照合を同じSA経由で確認する。今回Dev WIF設定や試験用Cloud新設はしない。実Prodが23日まで存在しない場合、実WIF成功は当日まで未確認として残り、23日の確約はできない。

短期tokenの寿命を考慮し、長い検証を認証より前に置き、配備直前・照合直前に新しい認証を取得する。単一コマンドが寿命を超えた場合の更新も試験対象。固定tokenを環境変数へ貼って済ませない。認証生成ファイルはGit・Hosting・Functions・ログ・成果物へ混入させない。ローカル`.gitignore`にも将来必要な除外を確認する。

### 3. 検証済み版の固定とCI切替

1. P1〜P5を承認後に実装し、Local／Devの回帰と包括ゲートを通す。実装前にこの文書の未決方式をレビューする。
2. Devで対象差分を受け入れ、同一revisionの公開用build・Functions source・環境設定を固定。Prod未設定なら配備jobは拒否したままにする。
3. 旧workflowと新workflowの同時有効化による二重配備を防ぐ順番を決める。mainの直接push防止は実契約で確認して構成し、dev→Dev／受入済みmain→Prod以外を拒否する。
4. 検証jobは包括7ゲートを別stepで実行。配備jobで別内容を再buildしない。公開用buildと後続照合の環境値を同一にする。Functions predeployによるdomain同期も、検証対象と差異がないことを確認する。
5. 環境ごとの排他を設け、実行中配備を途中cancelして不明状態を作らない。失敗後の再開はCloud状態を読んで決める。mainへのmergeを配備承認として扱う運用へ移す前に、その有効化範囲を明示承認する。

### 4. 初回構築と正式照合（新規環境固有の不足）

構築順は、実ID／Billing→必要API・2DB・Rules／索引・SA／WIF→制御状態の初期化→初期管理者→初回配備・公開照合→管理者確認→保護設定。旧initializeは使わない。新しい安全な初期化入口は、空のDBと状態一致を確認してprotocol2のrecoveringから開始する。空環境の照合と公開遷移を独立試験し、管理者だけが確認する空環境を成立させてからnormalの最小動作を検証する。正式業務データの投入・一般利用開始とは分ける。

Hosting初回照合の推奨案：既存のsame-site prior-version検査を維持するため、**初回のみ、レビュー済みの保守表示を先に公開してprovider設定・予約2ファイル・公開履歴を確認し、基準版として固定した後に本アプリを配備する**。これにより初回の基準版不在を解消する。保守表示も新たな公開操作なので構築承認の対象へ含め、仮の無審査ページや検査回避にしない。採用前に分離試験で基準作成・初回配備・不一致拒否を確認する。代替は初回専用の独立したprovider照合実装だが工数増の可能性があり、現時点で自動採用しない。

初回成功後は通常手順へ移る。Cloudの実設定、両Rules、必要索引READY、Functions source／実行先、Hosting全ファイル／設定、runtime／markerの一致を照合する。個別checkのblockedが1つでもあれば未完了。別の新規jobで非対話の認証・読取照合を行い、認証確認目的の再配備は行わない。

### 5. 納品前の実証と差戻し

23日までに日次バックアップ・PITR・Auth退避・失敗通知の設定を行い、初回成功と復元実証は26〜27日に確認する計画。日次バックアップの正確な実行時刻は指定できないため、23日設定直後のREADYを約束しない。Prodがnormalでない間はAuth自動退避が動かない点も確認する。

正式投入は確定原資料と設定・採番から実施し、7種の検索準備情報は投影・全件照合と一体で公開。実データや実採番を試験で消費しない。復元は承認された一時DB／隔離した確認条件で行い、Authの本番既存UIDを試験で作り直さない。HS業務受入れ、管理引継ぎ状態、社長の開始了承を確認してから納品を判定する。

初回配備失敗時は保守表示と一般利用停止を維持。既存版への差戻しは対象・互換性を照合し、schema／データ復旧と混同しない。初期化・投入・復元の応答不明時は既存owner・operation・進捗を照合し、無条件再送／ロック削除をしない。請求移管が間に合わない場合は既存方針どおりHS／オーナーによる暫定管理・費用負担・期限の明示判断が必要で、月末期限を理由に自動延長しない。

## 検証計画（未実行）

| 段階 | 必須確認 | 対応する既存試験／証拠 |
| --- | --- | --- |
| 対象判定 | Local／Dev／設定済Prod／未設定／別project／混在を検証。診断先一致、CIソース検出も確認 | `test/local-runtime.test.mjs`、`test/prototype-data-boundaries.test.mjs`、`test/auth-diagnostics.test.mjs`へ対象差分を追加 |
| 認証・CI | 資格情報なしのverify、許可ref以外拒否、更新token、長時間操作、異なる環境への誤配備、同一版成果物、二重配備防止 | `test/development-workflow-contract.test.mjs`、`test/default-recovery-preflight.test.mjs`。実WIF成功は別Cloud gate |
| 初回・正式照合 | 空状態の2DB初期化、途中失敗再開、既存環境拒否、初回基準版／予約ファイル／別site拒否、ソース・hash不一致 | `test/default-recovery*.test.mjs`と`test/emulator/default-recovery.test.mjs`。新初期化経路の focused regressionを追加 |
| 投入・復元 | 原資料→現行投影→7準備情報、設定保全、番号・権限保持、中断再開、旧形式拒否、bucket／project混在拒否 | `test/historical-intake-plan.test.mjs`、`test/emulator/historical-intake.test.mjs`、`test/emulator/recovery.test.mjs`、`test/recovery.test.mjs` |
| 実環境 | 両Rules・索引・配備内容、管理者・Authメール・診断、別jobの認証、バックアップ初回・通知・復元、HS操作 | [環境設定仕様](../requirements/environment-configuration.md)、[Prod手順](../runbooks/production-bootstrap-review.md)B/H/C。実データの変更検証は別途保全計画が必要 |

将来実装の分類はapplication-logic＋build-release-deploy＋必要に応じgovernance-permissions-agentsで包括ゲートを選定。`pwsh -NoProfile -File scripts/check-governance.ps1`、`npm test`、`npm run typecheck`、`npm run build`、`npm run test:rules`、`node scripts/check-functions-syntax.mjs`、`node --check scripts/seed-emulator.mjs`。公開用`npm run build:recovery-release -- --revision <その時点で確認した版>`と実配備照合は別途。実値変更で失効した証拠を再取得し、成功結果を無条件に使い回さない。未実装のProdコマンド構文はここで実行可能なものとして作らない。

## 工数再評価と日程条件

以下はコードの再利用範囲と不足からの**推定実作業時間**。実装計測値ではない。開発担当1名、既存機能を再利用し、大幅な仕様変更なし。Cloud待ち・HS待ち・認証方式の再設計は別。各行は重複させず、行内の試験は単体／focused、P6は最終統合・回帰・記録を含む。

| 作業 | 時間幅 | 工数根拠 |
| --- | ---: | --- |
| P1 環境設定・画面・Functions | 3〜4時間 | 主な実行入口は限定。業務処理を変更せず対象判定を共通化 |
| P2 操作／照合の対象・認証と初回Hosting | 7〜10時間 | 複数層のDev限定、refresh token依存、初回基準版問題があり最大の不確実性 |
| P3 安全な初期化・初期管理者・正式投入 | 4〜6時間 | 内部処理と投影／再開は再利用。新クラウド入口と空環境の遷移が不足 |
| P4 復旧・Auth／bucket・保護準備 | 4〜6時間 | provider／options／bucketの対象化、現行復旧試験の拡張。保護内部処理は再利用 |
| P5 CI・WIF設計反映・検証契約 | 6〜8時間 | 既存workflowと強い手動契約の同時変更、保護・成果物・排他を追加 |
| P6 統合検証・Dev差分確認・実行資料 | 4〜6時間 | 包括検証、対象差分の受入れ、手順・失敗時対応の整合 |
| 小計 | **28〜40時間** | P1〜P6。今回の棚卸しは完了済みなので再計上しない |
| HS試用支援・小修正の確保枠 | **4時間** | HSの2日間を開発の2日間全面停止とは置かない。大きな指摘は別見積り |
| 22日までの必要枠 | **32〜44時間** | 実値照合はこの枠内で行える前提。承認・情報待ちで延長し得る |

10/14〜22は土日を除き7営業日。集中作業を1日6時間確保できれば42時間で、下限には10時間の余地、上限は2時間超過する。したがって余裕のある確約ではない。23日の構築・初回配備・管理者確認・保護設定は別に6〜8時間の暫定枠を確保する。Cloudの権限伝播・索引準備・認証不成立の時間は保証できない。

前案の11/4〜13は、HS試用2日と修正3〜5日を終えるまでProd準備を待つ仮定だった。今回はHS試用を独立して進め、開発側の支援4時間を明示確保し、既存コードを再利用する。日数を数字だけ縮める変更ではない。HS日程はなお未定で、支援4時間超や保存形式変更は23日／月末のリスクとしてその時点で再判定する。

| 日程（JST、計画） | 主な到達点 | 判定と依存 |
| --- | --- | --- |
| 10/14〜15 | P2／P5を最優先。認証供給、CI切替、初回照合の方式を固め、承認後の改修開始候補 | 15日時点で実値待ちと技術方式の問題を提示。WIF実証にCloud変更が要るなら別承認が必要 |
| 10/16・19〜20 | P1／P3／P4を実装・局所検証する枠 | HS試用は並行調整。Dev業務試験を止める配備は時間帯を調整 |
| 10/21〜22 | P6、HS指摘の優先対応、最終対象・手順・承認の確認 | この2日も32〜44時間の内数で、別の丸2日予備ではない。22日終了時にA準備gateを判定 |
| 10/23 | Prod構築・非対話配備・正式照合・管理者確認・保護設定 | Bの完了条件を満たして初めて構築完了。残る初回取得・復元等は明示して26日へ接続 |
| 10/26〜27 | 保護実証、正式投入・全件照合、HS管理引継ぎ | 2日で12時間の作業枠を計画。バックアップREADY等は週末経過だけで成功扱いにしない |
| 10/28 | 不具合修正・影響範囲の再確認、納品前残件を閉じる | 6時間の修正・調整枠。大規模再実装用の余裕ではない |
| 10/29 | HS最終業務受入れ・開始了承・引渡し確認 | HSの日程確保が条件。未了承なら納品完了としない |
| 10/30 | 最終納品判定／残調整の予備日 | 月末ライン。必要な保護・データ・受入条件を維持 |

**日程確保が必要な点**：HSの2日間試用は遅くとも10/20〜21を調整上の期限候補とし、重大指摘を22日までに把握する。これは合意済み日ではない。最終受入れは29日まで、請求／管理引継ぎ条件は26日までを調整目標とする。10/14からの実装着手承認、開発枠、A／Billing／GitHub情報が遅れる場合はこの計画をそのまま保証しない。

**22日の構築判定**：Local／Dev対象回帰、初回初期化と照合経路、CI契約、実値入力手順、必要権限・公開対象、差戻し、実行承認が揃っていること。WIF・索引・実配備等の当日検査は別に未実証として残す。準備の不成立を23日へ持ち越して「構築可能」としない。

**月末防衛策**：技術リスクの大きいP2／P5を先行。初期納品外の追加要望を混ぜず、旧移行CLIを全対応しない。HS試用・日程調整を開発待ちにしない。26〜27に本番検証、28と30に修正／予備枠を置く。15日・20日・22日に上振れを再判定する。WIF不成立、重大保存不具合、保護実証未完、HS未受入れの場合は、期限達成が危険であることを即時報告し、必要な範囲・担当・日程判断を求める。成功を装って10月末納品とはしない。

## 公式確認と今回の完了境界

- [Firebase CLIのCI認証](https://firebase.google.com/docs/cli#cli-ci-systems)：ADCを検出・使用。独自CLIの対応を保証しない。
- [auth action](https://github.com/google-github-actions/auth)：WIF／SA経由、資格情報ファイルの除外、短期token、Admin SDK非対応注意。上記の技術検証を省略しない。
- [GitHub保護ブランチ](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)：実契約と公開範囲で可否を確認。リポジトリの契約を今回推定しない。
- [Firestoreバックアップ](https://docs.cloud.google.com/firestore/native/docs/backups)：実行時刻を固定できない。初回READYは実観測で判定。

今回の変更分類はdocumentation-only。棚卸し・提案・スケジュール文書とPDFのみ更新。製品仕様・データ契約・ADR・governance・実行設定・operationsの実績は不変。アプリ試験／build／Cloud実証は未実行で、完了証拠に使わない。文書整合、リンク、日数・時間の算術、PDFを検証し、独立した終了コードを完了報告へ残す。全体納品進捗の加点なし。サブエージェントなし。
