# 独立先行改修の検証記録 — 2026-10-03

- 状態：独立先行改修時点の検証記録。後続のDev配備は完了し、ユーザー受入は未確認。最新の実行結果は[運用記録](../../operations.md#2026-10-03-dev受入用配備と空データ初期化)を参照。
- 基準：仕様書0.1.90、オーナーの独立先行改修指示。詳細なデータ互換性は[試作契約](../meeting-prototype-2026-10-03.md)、現在のユーザー手順は[Dev受入](../../runbooks/local-acceptance-2026-10-03.md)。以下のLocal受入・未配備の記述は先行改修完了時点の記録であり、後続フェーズと区別する。
- 変更クラス：文書／UI／アプリケーションロジック／データ契約。和集合として全7ゲート、意図的なゲート省略なし。
- Node 22.23.2、Java 21.0.12。既定npmは10.9.8であったため、最終ゲートはローカルに既存のpackageManager指定npm 11.19.1へPATHを切り替えて実行する。依存関係の新規取得・インストールは行わない。

## この作業の変更範囲

- `app/components/MeetingPrototype.vue`：確定入力項目、検索候補・年月・CSV、報告／取消・案内状態、所属固定、ページ表示、正式Word項目待ち。
- `app/components/WarrantyOrganizationManagement.vue`：既定有効のみ、無効を含む。
- `app/components/MasterAddressFields.vue`：物件だけ郵便番号任意、空欄の検索を省略。他マスタは維持。
- `app/components/StaffAccountManagement.vue`：0／1ページでもページ操作を表示。
- `app/components/LoginPanel.vue`、`app/composables/useSession.ts`：読込失敗時の解除・再試行、タイムアウト、古い認証結果の破棄。
- `functions/property-warranty.js`：年度別カウンター、正常新規の永続保険状態・直前報告取消・再送防止、検証・権限・年月抽出、所有者電話の変更前値。
- `src/domain/property-warranty.mjs`、同`.d.mts`：入力検証、年月・保険期間・請求抽出・完全一致番号検索。うるう日計算は既存周年前日方式の技術回帰であり、保険会社の例外運用承認ではない。
- `test/property-warranty.test.mjs`：入力・保険計算と区間の安全停止・請求抽出、実useSessionを変換して読込失敗／再試行／認証世代競合を検証。
- `test/emulator/property-warranty.test.mjs`：年度・競合・警告・再送・報告／取消／引渡日ロック・案内状態・権限、HTTP Callableの失敗後訂正を検証。旧引渡日任意の試験は必須化に合わせ更新。
- 文書：`docs/specification.md`（フェーズのみ）、`docs/design/meeting-prototype-2026-10-03.md`、`docs/design/prototype-firestore-data-contract.md`、本記録、`docs/runbooks/local-acceptance-2026-10-03.md`、`docs/roadmaps/2026-initial-delivery.md`、`docs/roadmaps/technical-remediation.md`、`docs/operations.md`、`docs/README.md`、`CHANGELOG.md`。

## 検証

最終作業ツリーの選択範囲で以下を実測。npmコマンドは既存キャッシュ内のnpm 11.19.1の`.bin`をPATH先頭に置き、Windowsではnpm.cmdを使用した。最初のnpm/bin直接PATH指定は起動ラッパーの配置不一致で失敗し、正しい`.bin`で11.19.1を独立確認してから各npmゲートを再実行した。

| ゲート／コマンド | 結果 | 独立して観測した終了コード |
| --- | --- | ---: |
| `npm test` | 134件中132成功、2スキップ（Windowsでsymlink fixture作成不可） | 0 |
| `npm run typecheck` | 成功 | 0 |
| `npm run build` | Nuxt静的生成成功 | 0 |
| `npm run test:rules` | Auth／Firestore／Functions、80成功・失敗0・スキップ0 | 0 |
| `node scripts/check-functions-syntax.mjs` | 対象Functions／共有ドメイン構文確認成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File ./scripts/check-governance.ps1` | 成功。管理ハッシュ、生成AGENTS、7ゲート、文書との整合 | 0 |

関係する生ログは作業用tmp/independent-domain.log、tmp/independent-rules.log、tmp/independent-build.log。正式な永続証跡はこの要約。最後のUI変更はマスタ取得失敗後の新規ダイアログ抑止・busyボタンのみで、API・永続化・ドメインは不変。影響する型確認とビルドをその後再実行した。文書更新後のgovernanceも最終確認する。Emulatorはテスト終了時に停止し、プロジェクトのLocalポートの残存リスナーなし。Nuxtサーバーは今回起動していない。

初回未報告で保存区間が現在すでに終了している場合も個別確認に止める。過去の対象月を指定してもガードを迂回できない。これは新しい区間の起算点を採用する処理ではなく、未確定処理を実行しない境界。

## 未検証・残件

LocalのChrome／Edgeでの手動受入、当初の登録ダイアログ不具合の画面再現、Word項目、実CSV受理、過去物件の区間境界、削除・復元、DB／本番検索方式、初期取込・番号移行、旧画面のTR-010残件は完了扱いにしない。保険の履歴・専用保留、工務店ポータル開始は将来範囲。PDF資料は業務方針の説明として維持し、この実装報告で上書きしない。

既存の未コミット変更・未追跡資料・既存PDF削除差分を保持した作業。今回コミット・push・配備・実データ操作はしない。仕様バージョン変更やADR新設、管理されたgovernanceの変更はなし。ロードマップは部分実装の証跡を追加し、受入／配備未達のため達成率を加算しない。


## 2026-10-03 後続のDev配備承認

オーナーは今回改修の受入先をLocalからDevへ変更し、配備と管理者2名を残すデモデータ・マスタ・採番の初期化を承認した。以下は先行実装時点の未配備記録を置き換える後続フェーズであり、実行結果は[運用記録](../../operations.md#2026-10-03-dev受入用配備と空データ初期化)を参照。配備対象の[ソース／Hostingハッシュ](dev-release-2026-10-03.json)を保持し、未コミットの作業ツリーからの配備であることを明示する。
