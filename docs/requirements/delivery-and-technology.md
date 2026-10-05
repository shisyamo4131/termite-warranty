# Delivery and Technology

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
