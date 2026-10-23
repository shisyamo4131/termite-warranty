# Delivery and Technology

## 2026-10-23 HS最終受入れ日程

オーナー指定により、HS最終受入れ確認は**10月29日（木）・30日（金）**、納品は**11月2日（月）**。利用開始日・社長の最終了承と、Prod配備／正式投入／保護の保留解除を同時に確定したものではない。事前準備・実行判断は[本番手順](../runbooks/production-bootstrap-review.md#2026-10-23-受入れ版の本番準備)を参照。

## 2026-10-22 最終納品日

オーナーの本チャットでの指示により、最終納品日を**2026年11月2日**とする。従前の10月末目標を置換する。HS正式受入れ・利用開始了承、Prodの正式投入・保護検証等の完了条件は維持し、実際の利用開始日や保留解除はこの日付から推定しない。[残工程](../roadmaps/2026-initial-delivery.md#2026-10-22-最終納品日と残作業)。

## 2026-10-20 納品書と外部サービス依存条件

オーナー指示により、システム利用条件を記した納品書を納品前に作成する。住所自動入力のzipcloud依存、停止・終了・変更・利用制限、手入力継続、利用者による住所確認、送信情報と登録済み住所の不変を明記する。[記載案・根拠](../decisions/0050-zipcloud-postal-lookup.md#納品書への記載事項)。今回は記載事項の記録のみ。正式納品書の作成、契約文言の確認、HSへの説明・受領確認は残件。

## 2026-10-20 Prod管理権限と請求先の分離

オーナーの明示指示により、既存ProdへHSのGoogleアカウントをOwnerとして追加し、開発者本人のOwnerと現在の請求先を維持する。10月23日のHS側請求先準備・請求切替は今回の引継ぎ条件から外す。将来の変更は別途承認する。既存プロジェクトの管理権限追加であり、作り直し・組織移行・開発者の権限削除は行わない。[実施結果](../operations.md#2026-10-20-prodのhsオーナー招待受諾)を参照。アプリ管理者の設定とバックアップ・PITR・Auth退避の保留は別管理とする。

## 2026-10-15 納品順序・引継ぎと保守窓口

オーナーの同日追加指示で、DevのHS試行→追加修正・再確認→HSのDev受入れ→受入れ対象のProd配備→納品の順序を確定した。既存Prodへの先行配備は納品受入れの代替にしない。正式データは確定原資料から投入し、現在のDev試行データをProdへ複製しない。Dev試行データは保持する。原資料・投入条件・結果照合は既存の[取込手順](../runbooks/historical-property-intake.md)と[Prod手順](../runbooks/production-bootstrap-review.md)に従い、今回の文書更新で実投入を実施しない。

問い合わせ経路はHS→AriLabo→開発担当者（プロジェクトオーナー）。保守は同担当者、不具合連絡先は業務用Gmailとする。仕様変更・追加要望はAriLaboによる別途見積りとし、不具合対応と区別する。実アドレスや未確定の対応時間・復旧目標・契約金額は記載しない。

10月23日に向けてHS用Googleアカウントと請求先を準備し、既存Prodの管理者権限を引き継ぐ。オーナー本人のOwnerは保持する。これは新しいProdへの作り直しや現在のOwner削除の指示ではない。実際の設定・請求先変更・権限付与の実施と確認は別工程で記録する。

引渡し文書の仕上げ・保護設定はリリース直前に行う。現時点では対象・責任・復元手順・受入れ項目を準備し、バックアップ・PITR・Auth退避を有効化しない。HS試行結果と修正量に応じて日程を再判定し、10月30日の納品判断を確約にしない。[現行工程](../roadmaps/2026-initial-delivery.md)。以下の過去日程・未実施記録は各時点の経緯であり、本節の順序・保持方針を優先する。

2026-10-13追加指示：月末納品条件を維持し、[Prod事前構築ロードマップ](../roadmaps/production-readiness.md)を作成。Local実装・事前検証は承認済み、実環境の構築・配備は未承認。基盤先行作成はHS試用と分離し、正式業務利用の条件は変更しない。

2026-10-13後続指示：10月末納品ラインを維持する。[棚卸し後の条件付き日程](../../deliverables/production-schedule-2026-10-05/README.md)を現行案とし、HS試用とProd準備を並行調整する。10/23環境構築・10/30納品判定を目標とするが、HS日程は未合意。Local実装・CI切替準備は後続で実施済み、実Cloud構築・配備は未実施。以下の11月までの順次試算への参照は旧検討。納品の検証・業務受入れ条件を緩める指示ではない。

## 2026-10-13 現行日程への参照

Dev442物件の投入・開発側検証は完了済み。HS試験日は未定。採用済みの10月23日環境構築目標と、業務利用開始／納品の判断を分離する。[改訂スケジュール](../../deliverables/production-schedule-2026-10-05/README.md)は開発担当1名の条件付き参考案であり、確定納期ではない。[Prod手順](../runbooks/production-bootstrap-review.md)の事前準備・実値照合・提供前検証を満たして再判断する。以下の旧未投入・日付付き日程は当時の記録。今回の文書整理で製品要件や完了条件を変更せず、実装・構築を開始しない。

## 2026-10-09 Dev試験運用を挟む再計画

10月9日に過去資料442件を受領・点検。Dev初期化を前提に、開発側が一括投入し、再初期化・再投入の手順を残す。実投入は未実施。[準備事項](../runbooks/historical-property-intake.md)。HS試験は2日。投入・照合3作業日、HS2日、修正・再試験3〜5作業日、構築直前確認1作業日という見積りを具体日へ置いた[改訂日程案](../../deliverables/production-schedule-2026-10-05/README.md)を使用する。HSの実施日は未合意、保存形式変更時は再投入を含め再見積り。旧10/30稼働は確約せず、Prod構築以後の日程を再設定する。

## 2026-10-08 オーナー決定による現在の状態

本番Firestore採用確定。初期導入はCSV出力まで、保証書出力は印刷品質上の懸念から後発。初期登録資料は揃ったとの報告があり、オーナーの投入準備データ提供まで登録保留。Prod workflowは構築情報が揃ってから作成、バックアップ・PITR等は構築後、予算設定とHS向けシステム利用説明資料は後発。[現行作業境界](../operations.md#2026-10-08-prod構築前の整理)。以下のDB未決・Word印刷必須・資料未収集・説明資料納品前必須は置換する。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 初期検証規模（仕様書0.1.83）

初期は同時利用2名程度を想定。年間200件超程度というユーザー申告を用い、累計件数は初期データで確認して設計へ反映する。人数・件数上限や実測性能保証ではない。性能・DB・検索方式の検証は開発側の後続作業。根拠：同日②YES、HSC-026解決、原資料HSC-015・技術判断HSC-022/023へ接続。

## 2026-10-03 初期受入・エラー方針（仕様書0.1.82）

合意業務の通し操作と登録・検索・期間計算・CSVの正確性で受入する。業務効果の削減率等の数値目標は初期に設けない。通信エラー時は画面入力を保持し保存結果を確認してから再試行、二重登録・採番・延長を防ぐ。解決不能ならHS→AriLabo→開発者。根拠：同日①②YES、HSC-027/028。実装・実受入は未完了。

## 2026-10-03 初期データの引渡日補完（仕様書0.1.77）

引渡日が空欄の過去物件はすべてHSが埋めて提供する。申込月しかない場合もHSが日を指定し、開発側で推定補完しない。補完済み資料を受領したとの実績ではない。根拠：同日②YES・補足、HSC-015。

## 2026-10-03 受入と開始日（仕様書0.1.76）

HS実務担当者が業務操作を確認し、HS社長が利用開始を最終了承。AriLaboが確認日程調整と連絡を担当する。実際の利用開始日は未定で、10月末納品から日付を推定しない。根拠：同日①未定・②YES、HSC-002。実受入は未実施。

## 2026-10-03 初期端末・画面と問い合わせ（仕様書0.1.75）

試作ベースの必要機能を先行し、ダッシュボードは将来。初期動作確認はWindowsのChrome・Edge、スマートフォン／タブレットは工務店ポータル再開時に再検討。問い合わせはHSからAriLaboへ、開発対応が必要な分を開発者へ引き継ぐ。対応時間・復旧目標・費用は継続確認。根拠：同日①方針・②③YES、HSC-006/031/025。実装・実機検証・配備の完了を意味しない。

## 2026-10-03 初期登録対象と請求資料（仕様書0.1.74）

運用開始時に保証が継続している物件を全件初期登録し、終了・取消済みは登録しない。除外データの使用済み保証番号も再利用しないよう開発側が照合する。請求用年月は新規加入が申込年月、保証延長が延長手続き年月。HSによる初期照合了承とExcel請求の方針は維持。根拠：同日①③YES、HSC-015/032。実データ投入未実施。

## 2026-10-03 管理Excelからの切替（仕様書0.1.72）

初期登録をHSが照合・了承した後は物件／保証の正しい記録を新システムとし、元の管理Excelへの二重入力を終了する。請求書作成ExcelとWord差し込み印刷は継続。FileMakerの独立運用は変更しない。元Excel自体を削除する決定ではない。日程・元資料はHSC-015で継続確認。根拠：同日③YES、HSC-016。

## 2026-10-03 初期帳票の範囲（仕様書0.1.70）

初期納品は対象物件の一覧・CSVまで。保証書はHSがWord差し込み印刷、請求書は新規加入／保証延長の年月別一覧・CSVを使いHSが既存Excelで作る。システムでの正式保証書PDF生成・請求計算／出力・入金管理・保険料管理・送付業務／書類別宛先管理は初期対象外。宛名CSVは未採用の将来候補。正式保証書の空欄PDF受領を初期完了条件にしない。CSV列とHS側帳票との整合は要確認。根拠：同日オーナー①YES・②③回答。実装未反映。

## 2026-10-03 初期登録の開始条件（仕様書0.1.69）

新保証サービスの初期データはHS元資料を開発側で不備・重複確認し、不明点をHSへ確認して登録する。登録結果をHSが照合・了承した後、通常の新規登録を開始する。対象ファイル・件数・日程は別途確定する。既報告物件はゼロで初回未報告として開始。既存FileMakerの移行を追加承認したものではない。根拠：同日オーナー③YES・②回答、HSC-015/036。実データ投入は未実施。

## Confirmed Delivery Direction

- Development will use an agile approach because there is insufficient time to fully fix every specification before the production operating deadline.
- The system must officially operate in production by the end of October 2026. Existing-system data migration is not included in that deadline.
- The new system starts without importing FileMaker records. House Solution retains the FileMaker data outside the new-system datastore.

## Confirmed Delivery Milestones

The detailed schedule and progress basis are in the [2026 initial-delivery roadmap](../roadmaps/2026-initial-delivery.md).

- Mid-September 2026: provide a prototype in the development environment.
- Through late September 2026: address additional requests and defects.
- Through early October 2026: complete production-readiness functionality and release rehearsal.
- Through mid-October 2026: build the production environment and prepare the release.
- End of October 2026: switch new registrations to the new system and officially release to production.

## Confirmed Independent-Service Boundary

- The current FileMaker service and the new service are separate systems for separate services. There is no business-data cutover, parallel system-of-record operation, or rollback between them.
- No final data migration is performed. Each service retains and manages its own records.
- Deployment rollback, backup/recovery, and incident response follow the HSC-020 production-operation plan; implementation, rehearsal, and verification remain pending.

## Confirmed Prototype Stack

- Nuxt is adopted as a single-page application (SPA) with Vuetify for the prototype.
- Firestore is adopted for the prototype database, with an application-maintained 1- and 2-character N-Gram token map for selected free-text searches.
- Firebase Authentication email/password is adopted for staff authentication.
- Cloud Functions for Firebase is adopted for server-side Firebase Admin SDK account-management operations.
- Firebase Hosting is adopted to host the Nuxt SPA.
- Japan Post's official nationwide UTF-8 postal-code CSV is adopted for postal-code lookup. Transformed data is delivered from same-origin Firebase Hosting with manual entry and correction fallback; update/transform/shard/manifest/freshness code is implemented. See [TR-009](../design/tr-009-japan-post-postal-data.md) for measured verification and remaining checks.
- Provide the prototype in a developer-owned development environment. Development and production use separate Firebase projects; House Solution owns and contractually controls production, while its project ID, accounts, IAM bindings, and settings are recorded during provisioning.
- Production is owned and contractually controlled by House Solution and uses the Blaze plan. If Firestore is selected under HSC-022, production Firestore and Cloud Functions use `asia-northeast1`. Provisioning must record the project ID, accounts, IAM bindings, and settings. Environment-fixed Dev/Prod workflows, verified revision-bound artifacts, concurrent-deploy prevention, rollback, monitoring, and backup/recovery are required by HSC-020 but remain unimplemented.
- File attachment is outside the initial-release scope, so storage for attachments is not an initial-release selection criterion.
- Exact prototype dependency versions are pinned in `package.json` and `package-lock.json`. The verified development deployment target is `termite-warranty-dev`, with Firestore, callable Functions, and Hosting configured for the development prototype; this is not approval of production identifiers, production package promotion, or a complete production architecture. Browser-session persistence is required for staff sign-in. Password emails use standard Firebase Authentication delivery initially; Cloud Functions account-management transaction/retry/recovery design remains open. See [decision 0004](../decisions/0004-account-lifecycle-enforcement.md), [decision 0005](../decisions/0005-spa-and-session-persistence.md), [decision 0006](../decisions/0006-account-management-roles.md), [decision 0007](../decisions/0007-development-and-production-isolation.md), and [environments and authentication email](environments-and-authentication-email.md).

## Confirmed Local Verification Direction

- Continue using Firebase Emulator Suite with `demo-termite-warranty` for local regression verification. Local commands must not resolve to a real project.
- Deploy only with an explicit `--project termite-warranty-dev` target. No default project alias is recorded, reducing accidental production deployment risk.
- Verify the implementation against the development environment before offering its Hosting URL for user review.

## Database Reassessment

- PostgreSQL may replace Firestore for production if prototype evidence shows that the Firestore schema, N-Gram search behavior, running cost, consistency, or delivery risk is unsuitable.
- Any replacement requires a recorded architecture decision and updates to the schema, search, security, operations, and delivery-risk documents that it affects.

## Decision Gates Before Implementation

- Confirm the minimum usable scope and release acceptance criteria for the mandatory operational deadline.
- Validate the production schema against confirmed workflows and representative synthetic volumes before approval.
- Implement and verify Firebase Admin SDK failure recovery, Firebase Hosting and Cloud Functions deployment configuration, monitoring, and production package promotion according to HSC-020; confirm the production database separately under HSC-022 based on prototype evidence, operating cost, security, and delivery constraints.
