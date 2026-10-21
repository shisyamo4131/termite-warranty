# 2026-10-03 業務実演用プロトタイプ

## 2026-10-21 満了後操作とUH初期計画

満了後の報告不要設定／取消を許可し、既存報告コマンドの過去月指定による報告済み登録を維持する。保存形式・権限・操作receipt・期間対応・履歴は不変。UH過去物件計画の住所はexternalKeyを複製し、キー予約は維持する。データ型は変更せず、過去の計画は新コードで再生成する。[仕様](../specification.md#2026-10-21-満了後の保険状態操作uh初期投入の確定)。既存Dev／Prodの保険状態を一括変更する承認ではない。

## 2026-10-15 保存結果と作成操作の契約（Local候補）

採用根拠は親タスク `01a1186d-ebfa-70e3-9fa5-67accdb2202e` の同日実装承認。検証状態は[運用記録](../operations.md#2026-10-15-納品前改修local検証)。実データ移行・補正は行わない。

- 物件mutationはoperationProtocol=2を必須とする（CSV取込みは1のまま）。`propertyOperationReceipts/{propertyId}_{requestId}`に従来のuid/action/propertyId/createdAtに加えてrequestHashVersion=1/requestHashを保存。SHA-256入力はaction別に使う入力・対象・revisionを選択し、キー順・型・欠落を正規化する。runtime世代・時計・現在のマスタ値は含めず、他操作のform入力を除外する。意味が等しくても異なる生入力を拒否し得る保守的照合で、送信snapshotは固定する。
- 同ID・同入力は`operationStatus: completed`、異入力は拒否。旧hashなしreceipt／historyだけの記録は`legacy-unverified`として現在値を再取得し、今回入力の保存成功とは表示しない。旧履歴へのhash推定補完なし。旧protocol writerは再読込みを要求する。
- `masterOperationReceipts/{sha256(actorUid,requestId)}`はサーバー専用。IDなしsaveCompany/saveBranch/saveGroupはrequestId必須。uid/action/requestHashVersion/requestHash/resultId/createdAtをマスタ作成と同じtransactionで保存する。同作成の再送はIDだけ返し、後続の編集・無効化を書き戻さない。IDあり通常編集は従来の後勝ちを維持する。
- 画面は送信前、結果不明、保存完了後の読取待ちを分ける。不明中は入力・確認内容を固定し同じ要求だけ再送。成功後detail/catalog失敗は読取りだけ再試行し、作成IDを先に保持。transactionで既存receiptなしを確認した明示拒否だけ編集再開する。セッション/runtime変更時は旧応答を反映しない。ブラウザ終了後の未保存入力復元は対象外。
- 引渡日実変更は保証期間再計算と同一transactionで該当期間IDのcertificateItems.issued=falseとする。旧発行情報を訂正history.before.certificateItemsへ保持し、invalidatedCertificatePeriodIdsを記録。旧発行日時/担当者を訂正情報で上書きしない。日付不変なら状態保持、A→B→Aでも自動復活なし。既存往復訂正はないとの本人確認により棚卸し・一括失効をしない。

masterOperationReceiptsはマスタと同じ業務復旧時点へ戻す。正式な全マスタ再投入では旧マスタと一緒に除去する計画対象となる。旧reset-dev-business/reset-meeting-prototypeは新rootを未分類として停止するため、追加記録がある環境へ流用しない。アカウント作成記録は下記の現在権限保全に従う。一般スタッフ業務Rulesのスキーマ非強制は変更しない。

2026-10-13現在：本件はDev反映・開発側受入れ済み。以降の未反映・禁止は当時の状態。実データの延長履歴は0件で申込日補完は不要。HS業務受入れは別途。[導入結果・確認範囲](../operations.md)。

## 2026-10-13 catalogの旧要求終了

propertyPrototypeのcatalogは工務店向けpurpose=referenceStoreだけを受理する。許容する上位項目はaction／purpose／runtimeGeneration／runtimeProtocol／operationProtocolで、他は値が空でもinvalid-argument。HSからreferenceStore要求はfailed-precondition、所属欠落・不正はpermission-denied。現行HS共有Storeの直接購読は維持する。保存データ・索引・移行の追加なし。[設計と互換性](legacy-property-list-retirement.md)。

## 2026-10-13 一覧取得の互換性と所属索引

list／propertyListの許容入力は[採用設計の条件表](legacy-property-list-retirement.md)に限定し、旧条件への互換性を終了する。工務店保証案内にはconstructionCompanyId＋warrantyNoticePending＋expiryDate、本支店にはさらにbranchIdを加えた索引を使用する。検索項目・業務値・IDの保存形は変更せず、新たなデータ移行は不要。既存の保険等の導入前整備は引き続き必要。準備情報不足・変更はエラー、検索項目欠落は非救済。Dev導入・索引準備は明示指示後。

## 2026-10-13 保証接頭辞の保存・検索契約

同日追加承認：前後空白除去後の英大文字・数字・ハイフンは1,499文字以内（空欄可）。保存・再有効化で上限超過を検索前に拒否する。既存値を切り詰めず、発行済み番号も変更しない。

`warrantyGroups.prefix`は前後空白だけ除去し、末尾ハイフンを保持する。新項目・予約文書・ID変更なし。saveGroup／reenableMaster(group)は同じ取引内でprefix等値検索（limitなし）と自己ID除外を行い、他者一致を拒否する。無効グループも占有する。初回採番時のみ保持した接頭辞＋区切りハイフンで保証番号を生成し、保存済みwarrantyNumberは再計算しない。旧データの接頭辞・ID・参照・採番を自動移行しない。新旧の末尾ハイフン解釈が異なるため、再導入／差戻しは[専用設計](master-code-read-reduction.md)に従う。

## 2026-10-12 延長申込日の保存契約（改修中）

既存記録は[限定移行設計](extension-application-migration.md)に従い、確認済みの日付だけを補完する。請求検索3項目とrevisionの更新、全件一括確定・再実行の完了記録を同設計に定義する。

`extend`入力に必須`extensionApplicationDate:YYYY-MM-DD`、任意`reason`（空文字可・最大2000文字）を追加。暦日の妥当性をサーバーで検証し、延長イベントに`extensionApplicationDate`と`reason`を保存する。初回`applicationDate`や操作日時`date`を上書きしない。入力日が延長開始月の前月末より後なら画面で注意するが保存は禁止しない。

`warrantyTransactions`は対応する有効延長イベントの申込日を請求基準にし、検索項目は既存の同一transaction内更新から再計算する。旧イベントに項目がない場合は従来基準を暫定維持し`extensionApplicationDateMissing`で区別。実日付の確認と補完・検索再計算が導入条件。取消済みイベントを変更せず、再延長は新規イベントとする。保証書・保険期間の起算は変更しない。[工程・差戻し](../roadmaps/expiry-notice-read-reduction.md#保証延長改修の工程)。Dev未反映。

## 2026-10-12 保険満了案内の独立検索用保存契約

`insuranceNoticeQueryVersion:1` と `insuranceNoticeQueryExpiry:string` を物件に追加し、業務変更と同時更新する。専用準備印1のときだけ候補取得へ切り替える。旧像の互換性、補完範囲、容量・復旧照合は[詳細設計](insurance-notice-queries.md)を正本とする。業務上の対象・報告／不要・請求基準は変更しない。Local実装承認済み、Dev移行・配備は未承認。

## 2026-10-12 報告済み保険の月別検索用保存契約

HSC-042の実装に伴い、物件へ `insuranceReportedQueryVersion:1` と `insuranceReportedQueryMonths:string[]` を追加する。報告イベント・保険期間の対応を確認できる有効な報告済み対象月だけを重複なく昇順保存し、対象なしは空配列。報告種別newは引渡月、renewalは対象期間開始日前日の月を使い、実際の操作月は使わない。既存履歴の書換え・不明状態の補完はしない。

新しい準備印は `prototypeSettings/insuranceReportQueries.version`。補完中0、全件照合後1。既存月別投影のversionを上げず、準備印のない旧像では新しい処理済み表示だけを閉じる。新準備印がversion=1の復元では追加値の一致を検査する。通常の業務保存・各取込みは共通計算で同時更新する。保存の詳細・限定移行・差戻しは[月別取得設計](monthly-queries.md#2026-10-12-実装設計と導入手順)、実施済みかどうかは[運用記録](../operations.md)を参照。

## 2026-10-12 自社情報・請求先の追加保存契約

同日の追加指示で、自社情報に文字列 `bankName`（金融機関名）、`bankBranchName`（支店名）、`bankAccountType`（預金種別）、`bankAccountNumber`（口座番号）、`bankAccountHolder`（口座名義）を追加する。1口座・全任意、通常の文字列上限と制御文字禁止を適用。口座番号は半角数字のみで先頭ゼロを保持する。旧保存で指定しなかった銀行項目は取引内で既存値を維持し、明示空欄で消去。取得・保存の返却は既存10項目と追加5項目・更新情報だけを返す。再取込みの文書全体保全と通常復旧に含む。既存データの書換えや実口座値の自動投入は不要。

[確定設計](company-settings-and-document-csv.md)を実装。`prototypeSettings/companyProfile` は会社情報1件。文字列 `companyName`、`postalCode`、`address1`、`address2`、`telephone`、`fax`、`invoiceRegistrationNumber`、`representativeName`、`representativeTitle`、`email` と、保存側の `updatedAt:Timestamp`、`updatedBy:UID`、`updatedByName:string` を持つ。会社名のみ必須、任意値の空欄は空文字。郵便番号は7桁、電話/FAXは半角数字・ハイフン、登録番号はT＋13桁の形式を確認する。連絡先の実在・登録の有効性は判定しない。

`propertyPrototype` の `companyProfile` でHSが参照し、`saveCompanyProfile {profile}` で開発者・HS管理者が保存する。返却の更新日時はISO文字列または未設定null。未登録は空欄、同時編集は最後の保存を採用。復旧の確認段階では許可された管理者の参照だけを許可する。既存の直接DB書込みに関する境界は変えない。工務店には取得操作を公開しない。

`warrantyGroups/{id}.billingRecipient` に `name`、`department`、`contactPerson`、`postalCode`、`address1`、`address2`、`telephone`、`email` の文字列8項目を保存する。全空欄・部分入力を許容。旧更新でまとまり全体を省略したときは保持し、個別項目の省略も保持、明示空文字で消去する。工務店のcatalogは既存の公開必要項目だけを返し、請求先や将来の未公開項目を丸ごと返さない。

通常復旧では両設定も復旧時点へ戻す。過去物件の再取込みは `preservedBusinessSettings` の型付き保全像を入力に含め、計画・開始時・中断再開・完了時に照合する。グループは固定IDと変更不可の接頭辞・年度開始月で対応付け、名前一致による推測、不明ID、重複、不一致は停止する。会社情報の更新日時・更新者を保持し、取込み実行者で上書きしない。`_recovery/historicalIntake.settingsHash` も完了証跡に含む。[操作手順](../runbooks/historical-property-intake.md)。

既存データへの一括書換えは不要。実装の検証・Dev導入状況は[運用記録](../operations.md)を参照する。

## 2026-10-10 初期過去物件の出典・投入契約

専用初期投入は通常の増分CSVとは分離する。`propertyWarranties`のIDは保証グループと既存保証番号から決定し、`historicalIntakeSource`にworkbookId、sourceSha256、transformVersion、sheet、元row、rowHash、operationIdを保持する。HSC／SHSに架空の外部キーや通常CSV用receivedRecordIdを付けない。UHは既存契約NoとexternalKeyReservationsを保持する。通常編集では出典を引き継ぎ、原資料の差替えは別の検証済み再取込みとする。

`createdAt`／`updatedAt`は実取込時のTimestamp。historyには実際の取込み1件（kind:historicalImport、ISO文字列at、実行者actorUid、実行IDrequestId）を残し、過去の請求・発行日時や担当者は作らない。保証・保険期間と月別検索・集計項目は既存の共通計算から生成する。

`_recovery/historicalIntake`は実行ID・入力計画hash・当初棚卸しhash・アカウント/Auth照合hash・削除対象path/hash・進行位置・完了像hashを保持する。削除対象表は512KiB上限を超えたら拒否する。実値・個人情報を実行ログやリポジトリへ保存しない。各100件以下の書込みと進行位置を同じ取引で確定し、応答不明時は実行を保持して正しい停止済み実行者の指定から再開する。削除中に追加・変更された業務記録は自動削除しない。

採番と各検索準備設定は新投入像から作成する。全件一致とアカウント不変を確認後、専用の完了像を既存の復旧公開検証へ接続する（plan-intake）。読取確認用の公開・別了承による通常再開には既存の配備照合を適用し、投入スクリプト自体は業務を再開しない。[詳細と予行状況](../runbooks/historical-property-intake.md#2026-10-10-取込み計画と実行準備)。

## 2026-10-10 保険期間別状態・ダッシュボードの保存契約

HSC-006 Q19〜Q30で確定した[詳細設計](dashboard.md)を実装へ反映。保険期間ごとの未報告／報告済み／報告不要、理由付きの設定・期限内取消を扱う。物件文書に `insuranceStateVersion:1`、`insuranceBasisRevision`、最大6件の `insurancePeriods`、設定・取消の `insuranceWaiverEvents` を保存する。期間の状態・実報告・不要履歴を照合し、確認不能は `state:null` と理由で保持する。業務上の第4状態や推測した報告履歴は作らない。

検索用項目は `insuranceProjectionVersion:1`、`insurancePendingStart1`〜`3`、`insurancePendingEnd1`〜`3`、`warrantyNoticePending`。未使用枠は空文字。通常保存・取消・復元・延長・報告・請求・CSV取込みで正本と同時に更新する。`insurancePeriods`／`insuranceWaiverEvents`／`insuranceMigration` は単独索引を除外。理由・担当者を含む内部履歴と移行情報は工務店向け応答に含めない。

旧記録の変換は専用 `insuranceMigration` に版・実行日時・旧revision・元記録の識別値を保存し、初回だけrevisionを1加算、updatedAtと既存履歴を保持する。検索項目だけの再補完はrevision・updatedAtを変更しない。通常業務と変換が重なっても最新文書から計算する。保険の利用準備は `prototypeSettings/insuranceStates`、集計の準備は `prototypeSettings/dashboard` に版・移行時の復旧世代・実行IDを保存し、未完了は版0、照合完了は版1とする。両者の一致を集計開始・終了時に確認する。移行時世代は証跡であり、検査済み復元像を公開した後の新しい実行世代と同一である必要はない。実行中の復旧変化は既存の復旧確認で拒否する。

影響する保存操作には `operationProtocol:1` を要求し、未対応の新規書込みを拒否。受領済みの同一操作の再送は従前の成功を返す。取消履歴を追加できる容量を文書全体で予約する。不要状態を書き込んだ後に旧処理へ戻したり、不要履歴を消して差し戻したりしない。Dev移行・実測の実施状況は[運用記録](../operations.md)で区別する。

## 2026-10-09 保証書発行の保存契約

保証期間ごとのcertificateItemsと検索用派生値、certificateQueries readinessを追加。[データ・互換性・移行契約](warranty-certificates.md)。既存の保険／請求項目は維持する。0.1.131ではissued:falseによる取消を追加し、請求抽出のbillingQueryVersion・billingPendingMonthとbillingQueries readinessを追加。[検索契約](monthly-queries.md)。

## 2026-10-08 月別検索の保存契約

`propertyWarranties`に`monthlyQueryVersion`、`insuranceQueryStart`、`insuranceQueryEnd`、`billingQueryMonths`を追加する。全業務command／CSVの同transactionで派生値を更新。`prototypeSettings/monthlyQueries.version`で既存値の補完完了を確認して月別一覧を公開する。[型・導入・復旧互換性](monthly-queries.md)。Dev反映と実測は実施記録で区別する。

## 2026-10-08 本支店コードの保存条件

一括取込み対象グループの配下は、本支店マスタ登録・編集・再有効化時のコード空欄を拒否する。対象条件はexternalKeySettings(group).required。物理フィールド・予約形式は維持し、コード省略更新は既存値保持、対象外は空欄可。コードなしの旧無効本支店の補正は通常編集では行わない。[設計](property-bulk-import.md#branch-code-required-01-条件付き必須)。

## 2026-10-08 本支店選択の保存契約

物件／保証のconstructionCompanyIdとbranchIdは下書き／本登録とも非空の既存IDを必須とし、branchIdの所属会社も検証する。本店専用の自動選択・空欄代替はない。本登録後の所属固定は不変。旧未指定記録は未指定と表示し、通常保存では必須違反となる。オーナー承認によりLocal/Dev物件保証・操作receipt・採番counter・外部キー予約・取込みsource/receiptを初期化し、マスタ・アカウントは保持する。スキーマのフィールド追加やRules変更は不要。コード差戻しだけでは削除デモデータは復元しない。[承認・検証](../requirements/workflow.md#2026-10-08-hs業務フローとdev検証)。

## 2026-10-08 共有参照Store・計測

HSの有効／無効マスタは共有Storeへ集約し、新画面の一覧・詳細・CSV名称解決に使用する。工務店・本支店候補は上限なしの標準Autocompleteへ変更し、以下にある空候補20件／2文字検索待ちの旧説明を置換する。通常物件一覧の最新20件・番号完全一致は変更しない。取得方式とFunctionsログの契約・検証は[現行設計](reference-store-metrics.md)を参照。


## 2026-10-08 DISABLED-01 無効文書の更新契約

saveCompany／saveBranch／saveGroupは最新の既存文書がenabled=falseなら拒否する。状態復活はreenableMaster（kind: company／branch／group、id）のみで行い、共通のruntimeGeneration／runtimeProtocol以外の追加項目は受け付けない。保存するのはenabled=true・updatedAt、本支店の場合は有効コード予約の取得も同じtransactionに含める。内容の正規化による暗黙更新はしない。旧クライアントの通常saveによる再有効化は拒否されるため、新UIとFunctionsを揃えて配備する。スタッフprofile変更はアカウント更新ロック取得transactionで対象enabled=trueを要求し、拒否時にAuth操作やロックを残さない。各専用状態操作、取消済み保証の復元、無効な親を参照する既存保証の処理は維持する。

## 2026-10-08 BRANCH-05 表示とコード正規化

本支店コードは固有の文字数上限なし、trim・先頭ゼロ保持・制御文字拒否をUI／保存／CSVで共通に扱う。新CSV表示は本支店コード（＊）、旧14列の支店コード（＊）も受理。branchCode・branchId・sourceValues内の旧日本語キーは互換維持し、物理データ移行なし。会社IDの範囲でコードを完全一致照合、予約hashを併用する。[互換性と検証](property-bulk-import.md#branch-05-本支店の用語とコード長)。以下のコード200文字上限と旧表示名はこの範囲で置換する。

## 2026-10-08 BRANCH-03 保存契約の変更

工務店のdefaultGroupIdは作成後不変。本支店のconstructionCompanyIdも従来どおり不変。branchCodeReservationsは同一工務店内で本支店自身が有効な非空コードだけを予約し、無効本支店の同コード重複は許可する。無効化／コード変更／再有効化は予約と本支店を原子的に保存し、他本支店の予約を解放しない。親会社／グループの無効化による予約解放なし。CSVは有効な対応先のみ、復旧検査も有効コードと予約を照合する。旧enabled省略は有効扱いを維持。[変更理由・旧データ・差戻し](property-bulk-import.md#branch-03-有効コードと会社所属固定)。以下の会社所属変更可・無効コードも一意という過去記述より本節を優先する。物理キー名、保証番号、既存保証所属、権限Rulesは変更しない。

## 2026-10-08 増分CSV・グループ入力条件の契約

オーナー承認（2026-10-08、本Codex会話）：一括取込みは毎月受領する増分の新規申込み専用で、全件を引渡日起算の初回10年として本登録する。最長保証期間は将来の延長上限として残す。初回10年が終了した行は全件棄却し、延長済み等の例外は個別対応。登録済み外部キー・ファイル内重複・未知支店コード・不正行が1件でもあれば全件棄却、既存保証番号を持ち込まず全件新規採番する。

保証グループexternalKeyRequiredは作成後変更不可。通常登録では必須グループだけ外部キーを表示し、下書きから必須。任意グループでは非表示、新たなキー入力をサーバーでも拒否する。一括取込み先は有効かつexternalKeyRequired=trueのグループに限定し、サーバーでも再検査する。現在のHSC／SHSは対象外、UHは対象。過去に任意グループへ保存済みのキー・予約は削除／解放せず保全する。

住所addressRequired:boolean、断熱材ありの場合の資材名insulationMaterialsRequired:booleanを保証グループへ追加し、作成後変更不可。通常登録／通常編集／CSVの本登録で同じ設定を使う。断熱材なしでは資材名不要。必須項目を空欄から「不明」へ補完して通さずエラーにする。任意の場合は通常入力・CSVとも空欄を空文字のまま保存する。「不明」の自動補完は行わない（同日オーナー訂正）。既存の「不明」値を今回書き換えない。旧設定未保存のUHは両方false、その他は両方trueとして互換読取りする。既存物件や番号の書換えは行わず、旧キー等の保全を維持。

共通テンプレートは14列：外部キー（＊）／支店コード（＊）／物件名（＊）／施主電話番号／郵便番号／住所／建物名／建築面積（＊）／断熱材あり（＊）／資材名／申込日（＊）／引渡日（＊）／最長保証期間（＊）／備考。住所・資材名は選択グループの設定に応じて必須と案内する。申込日・引渡日は担当者が整えた年月日を入力する。Excelの日付表示であるYYYY/M/D（例2018/4/1、月日各1〜2桁）と従来のYYYY-MM-DDを受け付け、物件の保存・プレビューはYYYY-MM-DDへ統一する。受領元の文字列は保持する。年月のみ・存在しない日・月日年の順・Excelシリアル値は推測せず拒否し、年月初日化／上棟日＋92日のシステム補完は行わない。上棟日・現在保証年数・既存保証番号を削除する。旧17列／旧UH日付補完要求は再取得を案内して拒否し、成功済み操作のstatus／同一内容再確認は保全する。HS側の日時準備運用は打診中であり回答受領済みとしない。

新たなCSV登録はyears:10、periods:1区間、billingItems:[{id:initial,state:pending,...期間}]、receivedRecordId／受領／キー予約／成功記録を保持する。過去のimportedWarrantyPeriodsと原受領は変更しない。物件スキーマのキー削除や再採番なし。[設計](property-bulk-import.md)。

## 2026-10-08 物件名称契約

現行propertyWarrantiesの現在名称はnameのみ、ラベル「物件名」。rootのownerNameを廃止。ownerTelephoneと旧history.before.ownerNameは保全し、新history.beforeはnameを記録。旧保存要求のownerNameは拒否する。CSVの共通物件名列は不変。[移行・検証設計](property-name-unification.md)。Local全7検証・独立レビュー後に6b2573dをDev反映し、16件を移行・全完成像照合済み。電話・番号・旧履歴は保全。ユーザー受入は未実施。[実測](evidence/property-name-unification-2026-10-08.md)。


## 2026-10-07 グループ別外部キー設定・通常登録の契約追加

保証グループexternalKeyRequired:booleanは作成後不変、externalKeyLabel:stringは80文字以内で変更可。必須時は名称も非空。未設定の旧UHはtrue／「お施主様契約No」、その他はfalse／「外部キー」と読む。通常物件のexternalKey:stringは任意グループでも200文字以内・全物件一意で、必須グループは下書きにも必要。一度保存した非空キーは通常操作で変更／解放しない。

通常登録とCSVは同じexternalKeyReservationsを使う。通常登録にはreceivedRecordId／propertyImportSources／propertyImportReceiptsを作らない。CSV登録は既存の内部ID・受領・成功記録を維持する。復旧整合は全キーの予約を確認し、receivedRecordIdがある物件だけ追加の取込照合を行う。新コレクション・Rules変更・Auth変更は不要。追加Local全7ゲート・独立レビュー後、cbb5859をDevへ反映・正式照合済み。UHの2項目設定と通常再開／世代10を確認。HS実画面受入は未完了。[共通設計](property-bulk-import.md)。

## 2026-10-07 共通取込み・単一住所の契約追加

物件`address:string`が住所の正本で、旧prefecture/municipality/streetTownAndNumberは移行後に削除する。postalCode/buildingNameは維持、会社／支店住所形状は不変。旧形式のみの保存要求は再読込を要求し、addressの非文字列も拒否する。maxYearsは10/20/30を許可し、UH登録／編集は10年。支店`branchCode:string`は任意・会社内一意・変更可、旧画面の未送信では既存コードを維持する。

物件の`externalKey`と`receivedRecordId`は通常編集・取消で変更／解放しない。取込みは`propertyBulkImport`のpreview/commit/statusへ分離。キー予約・受領・成功記録は物件と同一transactionで確定する。`propertyImportSources/{propertyId}`は最初に採用した行値を保持するが、訂正前原行の累積コピーは作らない。以後の通常編集は既存業務履歴で扱う。

共通形式の現在20/30年は`importedWarrantyPeriods:[{id,index,sourceRecordId,startDate,expiryDate}]`で受領区間を識別する。index0はinitial、延長区間は`import-{receivedRecordId}-{index}`。過去の操作者・延長操作履歴を生成せず、通常extend履歴がある区間はそのIDを優先する。既存番号および受領延長区間の請求状態はunknown、保険は未報告。裏付けのない過去延長取消はできず、引渡日訂正は既存制約を維持する。[共通CSV設計](property-bulk-import.md)。Local全7ゲート／独立レビュー後にDev配備と16件住所移行・技術検証を完了、住所のHS確認と別了承で通常再開済み。共通機能のHS受入・実Cloud容量試験・原資料取込みは未完了。以下の先行未実装／未配備記述は各改修準備時点の記録として区別する。

## 2026-10-07 保証最終満了の案内除外

共通の`expiryAlertEligible`で、保証の案内だけは現在年数が最長年数未満の場合に限定する。20/20・30/30を除外し、10/20・20/30は既存の有効状態・案内時期・未案内条件で判定する。年数の不足した記録を延長可能と推定しない。保険の判定、案内済み取消の業務操作、保存形状・番号・期間は変更しない。10年の選択肢・保存許可値は追加しない。UHの固定内部IDによる受領文書の関連付けは方針だけ採用され、物理スキーマ・取込処理は未実装。Local回帰検証済み、Dev未反映。実測は[運用記録](../operations.md#2026-10-07-保証満了案内の上限判定修正)へ記録する。

## 2026-10-06 物件／保証一覧は保証番号の完全一致のみ

オーナー指示により、物件／保証一覧の検索は保証番号全体の完全一致だけとする。前後空白は除去するが、接頭辞・年度・通番の補完、部分一致、N-Gram検索は行わない。名前・住所・工務店・支店・グループ・年度・状態・日付等の検索欄と詳細条件ボタンを撤去する。検索条件なしは更新日時・文書ID降順のDB limit(20)、保証番号指定時はDB whereによる一致取得とする。認証と会社／支店の閲覧範囲は維持する。最新20件に含まれない未採番の下書きを探す方法を含め、その他の検索軸は業務内容に合わせて検討し、別途承認する。

保険報告・請求・満了案内の業務別抽出はこの変更の対象外。2026-10-05の自由検索・折りたたみ式検索と、物件一覧への条件指定時全件取得の例外を置き換える。保証書CSVの項目確定待ちは維持。


## 2026-10-05 アカウント内部操作記録・参照取得

同一UIDの三つの更新入口を`accountMutationLocks/{uid}`で直列化する。サーバー専用文書はoperationId、targetPath、actorUid、kind、desired、status、createdAt、previousAuth、previousEnabledを保持し、復旧時はrecoveryOwnerも保持する。statusはrunning/recovery_required/recovery_running。変更前のAuth値は私有記録に限定し、クライアントRulesは全アクセスを拒否する。成功時はstaffAccounts/constructionCompanyAccountsへlastAccountMutationIdとupdatedAtを記録し、ロックを同じtransactionで削除する。応答喪失の成功識別に用いる。時間切れ削除・一括移行なし。既存業務文書の保存形状は不変。

catalogは会社・グループ指定をDBで絞り、purpose=companyOptionsは支店を返さない。既定応答・候補の意味・保存時の最新参照検証は保持。画面内参照キャッシュは5分・最大64条件、認証scope別、失敗は保存せず、保存成功・認証変化・logout・明示最新取得で破棄。物件／アカウント一覧と権限確認は対象外。constructionCompaniesのdefaultGroupId/updatedAt/__name__複合索引を追加。[詳細・実測](account-concurrency-read-efficiency-2026-10-05.md)。

## 2026-10-05 継続改修の基礎・旧画面撤去・点検

オーナーの指示により現行MeetingPrototypeを継続改修の基礎とする。通常経路外の旧案件・旧マスタUIを撤去し、共通部品・認証・延期中ポータル・既存バックエンドは保持。検索の適用条件は送信時の値を表示し、取得中のクリアを抑止する。報告の部分失敗では完了済みを再選択せず、空選択で成功通知せず、一次エラーを再取得エラーで隠さない。アカウント作成後のメール送信と付随する一覧更新を分離する。既存の状態遷移・権限・採番・データ形状は変更しない。

バックアップ／リストアはオフラインモックのみ。実Firebase設定、実バックアップ、実データ、今回のDev配備なし。全7ゲートと独立点検、残るアカウント同時更新の不整合、Read/Write改善候補は[記録](evidence/current-implementation-audit-2026-10-05.md)参照。復旧は今回のUI差分のみ戻し、Functionsと既存の記録を保持する。

## 0.1.104 — 請求開始月と初回保険対象

変更承認：2026-10-05のオーナー「①、②は作業開始」と基準月・HS選択の追加回答。

- billingDateは初回の申込日／延長の保証開始日を投影し、CSV第2列を請求対象基準日へ変更。保存済みhistory.dateは書換えない。請求状態フィルターは変更しない。
- 初回未報告候補は対象月末を含む5年期間。保証満了が当月内ならその日で判定し、終了翌月は除外。操作日は無関係。報告済み物件の次5年への更新規則は不変。
- 一覧・CSVで保険フィールドを更新せず、reportTargetのID・期間一致をサーバーで再検証してreport時に保存する。beforeには元の開始・満了・必須更新月・報告状態を保持し、undoReportで戻す。初回で飛ばした過去期間のイベントは作らず、insuranceEverRenewedも初回報告だけではtrueにしない。欠落する旧履歴は推定しない。
- データ形状・権限・採番・全体取消・アラート規則は不変。既存データ一括更新なし。報告の期間の意味が変わるためFunctionsとHostingは揃えて反映する必要があるが、2026-10-05の後続作業で同時反映済み（[実行記録](evidence/dev-reset-104-2026-10-05.md)）。復旧では新しい報告履歴を保持し、対象月計算を理解する互換修正で対応する。
- 影響：UI/ロジック/保存契約/文書。選択ゲートは全7種。実データ・Prod・アカウント操作は対象外。実測は[記録](evidence/implementation-104-2026-10-05.md)。

## 0.1.101 — 区間単位の状態遷移契約

状態：実装・Dev配備・機能確認済み、実測は[証跡](evidence/lifecycle-101-2026-10-04.md)。[ADR 0035](../decisions/0035-warranty-interval-lifecycle.md)と仕様書の採用事項に基づく。既存の下記0.1.96/100の保険保持・恒久ロック・案内取消不要の説明は当時の実装記録。

- `propertyWarranties.billingItems[]`: `id`（初回はinitial、延長はextendのrequestId）、startDate/expiryDate、state（pending/billed）、状態操作後はrequestId/at/actorUid。各区間はhistoryの有効なextendとbefore.yearsから対応する。取消済み延長の項目は保存して通常対象から除外。再延長は別ID。記録欠落はunknownとして表示し、HSがbillまたはconfirmUnbilledで確認するまで未請求と推定しない。
- `insuranceEvents[]`: reportイベントはrequestId、reportKind、month、warrantyPeriodId、保険startDate/expiryDate、対応保証期間、before（直前の保険4項目）、at/actorUid。undoReportイベントはtargetRequestIdを参照し元イベントを残す。有効な最後のreportのみ取消可能。`insuranceLastReport`はその投影を従来形式で保持。insuranceReported等の現在値は引き続き一覧用の投影。
- `insuranceHistoryIncomplete`: 旧記録の不足を示す。旧LastReportのみをlegacy-reportとして利用可能だが、それ以前は推測しない。既存DBを一括補正せず、最初の該当操作で既知の範囲だけ保存。新規本登録は完全な空のinsuranceEventsとfalseを保存する。
- report要求には表示して確認したreportTarget（warrantyPeriodId/startDate/expiryDate）を必須とし、サーバーで現在の対象と一致確認。旧画面の対象指定なし要求は拒否する。undoReportはtargetReportIdで直近と照合。請求操作も区間IDと開始・満了日を照合する。revisionとrequestId/receiptの既存制御を維持。
- 延長取消は直近延長について、請求pending、現在満了案内が未案内、報告済み保険が取消後保証にかからないことを検査する。初回など無関係の請求・保険はその時点では戻さない。案内の旧状態は満了日一致時だけ復元。
- 引渡日訂正は有効な延長・保険報告・請求がないこと、未確認請求・不足保険履歴がないことを検査。insuranceEverRenewedは履歴が完全ならロック判定に使わない。初回区間・保険初回区間を再計算し、案内を未案内へ戻す。取り消したイベントの期間は書換えない。
- 請求用一覧・CSVはbillingStartDate/billingExpiryDate/billingStateを投影。検索月は既存の申込月／操作月を維持し、未請求だけの暗黙フィルターは追加しない。物件編集と請求詳細の区間カードから請求済み／取消／旧未請求確認を操作。請求取消は理由必須。
- 全体取消はconfirmCancellationと理由を必須とし、確認画面に保証区間・請求状態・既知の保険報告を表示する。元状態は保持、取消中の通常操作は拒否。復元は元の状態を戻すことと外部整合確認を明示。
- historyは今回からreport/undoReport/bill/undoBill/confirmUnbilledも対象区間付きで保存。notifyの全履歴追加はしない。案内は現在状態と延長beforeを利用する。

互換性：旧記録は読める。情報のない請求・保険を事実として補完せず、必要な操作だけ止める。配備順はFunctions→Hosting。古い画面は再読込が必要。ロールバックは新しい記録を保持して互換修正版へ。旧版への単純差戻し・Dev初期化・Prod操作は行わない。影響は文書/UI/ロジック/データ契約/配備の和集合で全7ゲート。

## 0.1.100 文言・説明表示

MeetingPrototypeのラベル・案内取消タイトル・v-alert化。Functions/データ契約変更なし。案内済み延長取消の復元をEmulator試験へ追加（延長前未案内/案内済みの両方）。[証跡](evidence/ux-100-2026-10-04.md)。Hostingのみ配備、復旧は0.1.99成果物。

## 0.1.99 案内操作の明確化

変更はMeetingPrototypeの表示・配置だけ。直近保証期間行に案内状態と操作、確認画面に満了日。既存warrantyNotifiedとnotifyコマンドを維持し、過去期間の状態を捏造しない。取消は編集ダイアログ右上のerror/flat。Hostingのみ、データ移行・業務計算・権限・Functions変更なし。全7ゲートとDev確認後に配備完了を記録。復旧は0.1.98相当Hostingへ差戻し。[検証記録](evidence/ux-099-2026-10-04.md)。

## 0.1.98 追加UI改修契約

MeetingPrototypeの閲覧専用モードを報告・請求にも適用し、保存関数のガードを維持する。延長・取消ボタンを指定位置へ移動。テーマのsurface-variantとtextボタン色の上書きを除去。Hostingのみ、永続化・Functions・Rules・依存変更なし。必要時は直前0.1.97のHosting成果物へ戻す。全7ゲートを確認しDev配備後に日付配色、両一覧カード、延長ボタンを実画面検証する。[記録](evidence/ux-098-2026-10-04.md)。

## 2026-10-04 UI/UX改修（仕様0.1.97、Dev配備・開発側確認済み）

対象：MeetingPrototype、BusinessDateInputと日付文字整形、Vuetify defaults、共通入力CSS、LoginPanel、関連テスト。保存データ・サーバーの業務規則は不変。日付は完成した8桁／6桁またはスラッシュ区切りだけをISO表記へ整形し、不正日付は補正しない。案内専用モードではフォーム・汎用操作を描画せず、保存関数でも保証のnotify以外を受け付けない。検索結果全体の一括選択はreview行を除外し、再抽出で選択解除。改修・検証・配備証跡は[UI/UX記録](evidence/ux-097-2026-10-04.md)。Hostingのみの変更で、データ移行なし。必要時は0.1.96相当のHostingへ戻せる（Functionsの延長取消対応を維持）。

## 2026-10-04 延長取消（仕様0.1.96、Dev配備済み）

- [配備・検証記録](evidence/extension-undo-dev-2026-10-04.md)。HS専用undoExtendコマンド。activeかつyearsが20/30で、直近の未取消extendのbefore.yearsが現在より10年短い場合のみ許可。理由必須、対象requestId・revision一致を要求し、receiptで再送を安全に扱う。
- historyのundoExtendにtargetRequestIdを追加。元のイベントは保持。現在の引渡日からyearsを10年減らしたperiods/expiryDateを再計算。所有者・上限・番号・保険全項目は保持。warrantyNotifiedは対象延長前の値に戻し、旧履歴で値がない場合はfalse。
- billingRowsはundoExtendが参照するextendを除外。訂正後の期間と別途訂正が必要な帳票・連絡を確認画面へ表示。取り消されていない過去の延長があれば次回の取消対象になる。
- 互換性：旧履歴のbefore.years/requestIdを使う。履歴が足りない場合は推測で取消しない。データ移行・既存データ初期化なし。取消履歴を認識しない旧版に戻すと請求対象が復活するため、単純差戻し禁止。必要なら延長・請求操作を停止し、履歴を理解する修正版を画面とFunctionsへ同時配備する。
- 変更範囲：MeetingPrototype、property-warrantyの共有ドメイン／Functions／テスト、影響文書。UI・ロジック・データ契約・配備の全7ゲートを実行する。Prod、送信、初期化は対象外。


## 2026-10-04 Dev受入A00〜A04の改修契約（Dev配備済み・再確認待ち）

- 根拠：オーナーのA00〜A04受入報告。仕様書0.1.91。対象は通常画面・住所共通部品・採番ドメイン・propertyPrototype・関連試験。改修時は未配備。その後の明示指示により2026-10-04にFunctions/HostingをDev配備済み。受入データを保全し、初期化はしない。
- 接頭辞は前後空白のみ除去し末尾ハイフンを保持する（2026-10-13採用）。重複判定は保存接頭辞の完全一致検索と自己ID除外。発行済み番号・採番カウンターは変更しない。
- companyBranches.addressにpostalCode/prefecture/municipality/streetTownAndNumber/buildingNameを追加（空文字可）。旧address欠落は空欄で表示・編集。constructionCompanies.addressは住所3項目を維持し郵便番号のみ任意。入力郵便番号はハイフン・空白除去後7桁。送付先ルーティングは未実装・対象外。
- registerはconfirmRegistration=trueを毎回要求。confirmWarningsは日付・重複の追加確認に分離し、注意時のHttpsError.details.registrationWarningsで画面に提示してからチェックを要求する。同一成功操作の再送処理は維持。新旧画面・Functions混在では旧画面の本登録が拒否されるため、次の配備は両方を揃える。
- 工務店候補・支店候補・読込中・通信エラーをダイアログ内の状態として分離。背後の一覧・候補を検索で書換えない。空条件は最新20件、明示検索は該当候補、選択中の工務店は表示のため保持。会社を変更した時のみ支店選択を解除。
- 最長保証の説明はselectのhint。保証期間は開始・満了／通算・上限／初回延長の表。保険は保険期間→報告有無→次回更新年月の順。
- 互換性：支店住所の必須化・既存値補完・番号振り直しなし。旧版へ戻す場合は画面とFunctionsを揃え、旧支店保存が新住所を扱えない点と旧番号生成の違いを確認する。単純な旧版再配備は行わない。
- 検証：文書/UI/ロジック/データ契約の和集合として全7ゲート。[改修証跡](evidence/dev-acceptance-a00-a04-2026-10-04.md)。手動の表示確認・受入は今回のDev配備後にユーザーが行う。

## 2026-10-03 Dev反映・受入先変更

後続指示「Dev環境へ反映」「Dev環境でのテストを以て受入れ」により、独立先行改修をDevへ配備する。ユーザーによるDev試験が今回改修の受入であり、Localの手動受入は前提にしない。全7自動ゲートと配備後の公開成果物確認は開発側で実施。Prod配備・HSの本番開始承認とは区別する。既存データの扱いは別途確認し、移行・初期化を配備に紛れ込ませない。ロールバック時は新しい期間／採番状態の書込み有無を確認し、画面だけを旧版へ戻さない。

## 2026-10-03 確定仕様の独立先行改修（実装中・Local受入待ち）

根拠：オーナーの「独立先行できる作業を開始」「Localでの受け入れ検証はまとめて」の指示。仕様書0.1.90を基準とし、以下の過去チェックポイントより優先する。仕様の新規採用・配備・実データ移行の承認ではない。

- 対象：通常のMeetingPrototype、共有ログイン、物件ドメイン、propertyPrototypeコマンド、関連テスト。旧案件／旧マスタ画面は通常経路外でありTR-010の旧画面残件を別に保持する。
- 登録：本登録の引渡日必須、物件郵便番号任意、基礎断熱材と使用資材、面積小数2桁、申込日の注意（同名同住所候補の確認は2026-10-04廃止）、所有者変更前電話番号も履歴保存。本登録後の所属変更はサーバーでも拒否。
- 採番：warrantyCounters/{groupId}_{fiscalYear}で年度別。旧globalカウンターがあり年度カウンター未作成なら拒否し、移行を要請する。既存番号の付け直し・カウンター削除・移行はしない。既使用最大値の予約は初期取込時の別作業。
- 保険：通常新規にinsuranceStartDate/insuranceExpiryDate/insuranceRenewalMonth(YYYYMM)/insuranceReported/insuranceEverRenewed/insuranceLastReportを永続保存。更新月は満了年月。LastReportには直前状態を保存し取消で復元。EverRenewedは取消後もtrue。旧未保存データは表示可能だが報告は要確認扱い。
- 初回未報告で選択月までに区間が終了した物件は要個別確認とし、勝手に区間を進めない。通常新規／更新・過去未処理の表示、チェックCSV（7列・保険申込空欄）、別操作の報告済み、直近報告取消を実装。減少報告・初期過去物件区間決定は未実装。
- 案内：warrantyNotified(boolean)の現在状態のみ。延長でfalseへ戻す。報告と案内の業務履歴は追加しない。同一操作再送防止はサーバー専用propertyOperationReceipts/{propertyId}_{requestId}にuid/action/propertyId/createdAtを保存する（ブラウザは既定拒否）。一般の履歴と区別し、将来の削除／保持設計で扱う。
- 画面：保険月次・請求年月CSV、常時ページ表示、番号完全一致検索、管理マスタ有効既定・無効を含む、工務店候補の明示検索と選択会社の全支店取得。無条件の物件・工務店取得は最大20件を維持。
- 正式保証書CSVはWord項目未受領で保留。見本PDF操作を初期画面から外し、項目待ちを明示する。sample-certificateドメインは将来用に保持。工務店ポータルは残すが初期利用延期。
- 検証：UI、ロジック、データ契約、文書の和集合として全7ゲート。自動検証結果とLocal手動受入を分ける。外部配備、実データ削除、アカウント初期化、実メール送信なし。
- 復旧：既存未コミット差分を保全。外部DBを変更しないため外部ロールバックなし。将来配備時には画面とFunctionsを同時更新し、新しい採番・保険状態を理解しない旧版への単純差戻しを避ける。旧データの移行と再検証を先に行う。


## 2026-10-03 階層管理の改修契約（仕様書0.1.68、ローカル検証記録あり・未配備）

現在の実装・検証結果は[証跡](evidence/meeting-prototype-2026-10-01.md#2026-10-03-hierarchy-management-checkpoint)を参照。以下の旧版・未実装注記は各時点の記録。今後は質疑応答を優先し、追加実装・配備へ自動的に進まない。

- 管理画面は保証グループ→工務店→支店の選択・一覧・登録編集を提供。会社の所属変更は新規本登録だけに適用し、発行済み保証のgroupId/groupName/番号は保持する。所属グループ未選択をHSCで補完しない。
- 互換性のため会社の所属グループの保存キーdefaultGroupIdは維持。支店の旧groupIdは読み取り・採番に使わず、新規保存入力で非空の上書きを拒否する。既存旧値は今回削除・一括移行しない。新規保証のgroupIdは会社から取得し、既存保証の延長は保存済み所属を維持。
- 会社と支店にenabledを保存し、旧未設定は有効。親会社の無効は支店自身のenabledを書き換えず実効的に新規登録を停止。会社再開でも支店自身が無効なら停止を維持。無効先での新規下書き作成／本登録は拒否し、既存下書きの保存と既存本登録の処理は許可する。アカウントのenabledは自動連動しない。
- 保存処理と本登録処理はトランザクション内で最新の親・有効状態を確認する。所属条件付き管理一覧は20件取得後に除外せず条件内を抽出し画面で20件ずつ表示。条件なしは従来の最新20件を維持。
- 変更範囲はMeetingPrototype.vue、新しい階層表示コンポーネント、functions/property-warranty.js、関連Emulatorテスト、影響文書と説明PDF。保険報告状態・案内状態・年度採番リセット等、他の未実装仕様は今回含めない。
- 検証は文書、UI、業務ロジック、データ契約の複合変更としてgovernance-check/domain-test/app-typecheck/app-build/firestore-rules-test/functions-syntax/seed-syntaxを選択。実行前は未検証扱い。配備なし。外部通信・実データ変更なし。
- ロールバック：実データの一括変換はしない。ただし旧版は支店上書きと無効会社での本登録を許すため、配備後に旧版へ単純差戻ししない。必要なら新規登録を停止して会社／支店設定と期間中の発行保証を照合し、画面・Functionsを同時復旧する。


> 2026-10-03 後続の画面改修要求（未実装、仕様書0.1.67）：保証グループ→工務店→支店を管理画面に反映し、支店のgroupId上書きと採番時の支店優先を廃止する。会社の「標準保証グループ」を「所属保証グループ」として扱う。会社／支店の無効化・再有効化と既存保証継続を追加する。以下の支店優先等の契約は現行試作の記録であり新要件ではない。所属変更時の既存保証の扱いと移行方針の確認後にデータ契約・実装を改訂する。今回コード・既存データには変更なし。

- Status: Base and alert/optional-handover versions deployed; subsequent application-date/report/group feedback passed all seven gates and deployed to Dev on 2026-10-02; empty-master demo reset verified
- Authority: 2026-10-01 オーナーの27項目採用と試作改修・試験データ初期化指示。本番の未決事項を確定するものではない。
- Source: [採用27項目](../requirements-review-2026-09-29.md)、[仕様](../specification.md)、[未決事項台帳](../requirements/house-solution-confirmations.md)

## 採用範囲・変更点

共有工務店アカウント、案件、施主／商品マスタ、申込承認待ちの画面を、担当者別アカウントと物件中心の画面へ置き換える。HS支店は提供しない。会社とその支店、保証グループをHSが設定する。本店の全店担当は自社全店、支店担当は自店のみ、HS担当は全社を操作する。アカウント発行・停止は管理者のみ。

物件下書きは未採番。申込日の入力初期値は日本の当日。本登録までは訂正可能、本登録時に必須となり以降は固定。入力された申込日で年度を決定し、支店優先／会社標準グループで原子的に採番する。HSC/UHは1月、SHSは4月開始年度。番号はHSC-26-001、SHS-26-001、UHは26-001。グループ内通番は年度をまたいで継続する。

初回10年、延長は10年ずつ、時期制限なし、通算上限20/30年（既定20）。上限変更だけでは延長しない。既に30年の保証を20年に戻さない。引渡日訂正は期間再計算を確認して実行、旧値を履歴保存。取消は理由必須、番号保持。復元はHSのみで理由必須。会社／グループの変更は既発行番号へ波及しない。

施主情報は物件内。見本保証書は共通テンプレートからPDFを直接保存する。満了案内は画面のみ、請求・実メール通知・保険予定自動作成は対象外。パスワード設定メールは既存認証経路を維持する。

保険報告用一覧は引渡日（保険適用開始日）の開始・終了を含む期間で対象抽出し1物件1行。申込日・登録操作日・延長操作日は抽出基準にしない。引渡日未設定と下書きは除外。取消は通常除外、含める指定で状態列を付ける。物件情報は現在値、CSVには初回5年の保険期間を含める。CSV出力を報告完了としない。

## データ契約・互換性

`propertyWarranties/{id}` を物件と恒久保証の集約とする。会社ID、支店ID、施主、住所、面積、状態、固定グループ、番号、申込日、引渡日、通算年数／上限、期間配列、履歴配列、revision、updatedAtを持つ。履歴には実行者UID、時刻、日本日付、操作、訂正前情報と理由を必要に応じ記録。trusted commandでrevision競合検知、同一要求IDの重複操作を防止する。数十年の履歴を配列で保持する試作で、本番の容量設計は未確定。

`constructionCompanies` は住所・連絡先に加えdefaultGroupId。`companyBranches` は会社ID・名称・groupId（空は会社設定継承）。`warrantyGroups` は名称・接頭辞・年度開始月・テンプレート識別子・enabled（未保存の既存データはtrue扱い）。`constructionCompanyAccounts` は個人別でscope=company/branch、branchId、displayNameを追加。旧1社1アカウントbindingは使用しない。`warrantyCounters/{groupId}` はサーバー専用。一般スタッフの業務Rulesは認証とenabledのみ、会社側は会社／支店所有範囲に限定し書込はtrusted command。

無条件物件一覧は更新日時降順・ID順の20件。明示検索時のみ許可範囲内を全件抽出。会社／支店の権限条件は検索条件による全件化と独立し常に適用する。

## 初期化・復旧境界

オーナーは旧試験データとアカウントの削除を許可。対象は操作時に照合した開発環境 `termite-warranty-dev`、ローカル試験は `demo-termite-warranty`。実行前に残す2アカウントを照合する。旧データの新モデルへの自動変換は行わない。コードはGitで復旧可能だが、削除済み試験データは復旧対象外。初期化後は指定のシステム管理者とHS管理者、HSC/SHS/UHの設定のみ。実演用会社・支店・物件は残さない。デプロイは別途承認境界。

## 完了条件

27項目の操作、会社／支店分離、番号の競合・再送、延長上限、訂正履歴、CSV対象、見本帳票、アカウント作成を検証する。全7ゲート（governance、domain、typecheck、build、Rules/Callable、Functions syntax、seed syntax）を適用。必要な変更はapp/functions/domain/tests、Rules/indexes、初期化スクリプト、影響する仕様・設計・運用・資料。managed governanceを変更しない。完了後に未決事項全件のPDFと実演パターンを作成し、検証状況と開発環境反映・初期化結果を別々に報告する。

## 試作の実装上の補足

下書きの最小項目は物件名と所属会社（支店担当は所属支店固定）。本登録は施主名、郵便番号・住所、正の建築面積が必須。引渡日は全保証グループ共通で任意。未設定で本登録・採番できる。申込日は本登録前のみ入力・訂正可能、期間は直接編集しない。正式入力項目・例外はHS確認待ち。無条件一覧は20件、絞込後は20件ずつ画面表示。会社／支店設定一覧も条件なしは更新順20件、名称検索時は許可範囲内全件。物件名等の検索は既存の正規化・2文字N-Gram照合を維持し、読み取った許可範囲内で評価する。画面は「検索・更新」で再取得する。見本PDFは日本語CID標準フォントを利用し、正式な字体・ロゴ・長文レイアウトはテンプレート受領後に検証する。

## 実測結果

[検証・初期化・配備記録](evidence/meeting-prototype-2026-10-01.md)を参照。ローカル検証・資料作成・開発試験データ初期化と、別途承認された開発環境への配備は実施済み。公開ログイン画面と成果物の一致を確認。公開環境のログイン後の業務実演とHSによる本番仕様の受入は未完了。


## 2026-10-01 追加資料後の試作変更

根拠：同日の本タスクでのオーナー9項目指示、および「保険適用開始日＝引渡日」、続く「HSC・SHSも任意」「グループ増加もあり得る」の追加指示。以下は追加実装範囲。先行配備とは区別し、検証・配備結果は運用記録を参照。

- 保証は初回10年、10年単位、上限20年／条件付き30年の方針を維持。試作では30年条件の自動判定はしない。5年保証・5年延長の採用は保留し、HSC-005で確認する。
- 保証満了案内とHS専用の保険満了案内を別画面にする。両方の既定は2か月前。システム管理者・HS管理者は各1〜12か月前の設定を保存でき、全利用者に適用。月は暦月で、満了日から設定月数を戻した日（存在しない日は月末）から、満了後も本登録物件を表示する。取消・下書き・満了日未設定は除外。実メールは送らない。
- 保険適用開始日＝引渡日。初回5年間の満了日を計算し一覧表示するだけの試作。手入力開始日、加入確定・報告完了・更新済み状態、自動更新、保険周期履歴は実装しない。引渡日訂正で保険の表示期間も再計算する。過去物件の実際の加入日をこの試算で確定したとは扱わない。
- 全保証グループ共通で引渡日未設定の本登録・採番可。保証の開始・満了・期間配列は空のまま、番号・申込日は確定。10年という期間長は保持し、後日引渡日を入力して期間を計算する。今後追加する保証グループも同じ扱いで、グループIDによる必須判定は設けない。日付未設定を一覧・詳細に明示し専用絞り込みを設ける。未設定中の延長・保証書PDFは不可。確定済みの日付を空欄に戻す操作は不可。後日入力・訂正は期間確認と既存履歴に記録する。
- データ契約：`prototypeSettings/alerts` に `warrantyMonths` と `insuranceMonths`（整数1〜12）、`updatedAt`。設定未作成なら2。直接のブラウザ書込みは許可せず既存Callable経由で管理者のみ更新。物件の `insuranceStartDate` / `insuranceExpiryDate` は取得時に引渡日から計算する表示値で、入力・保存項目ではない。日付未設定時の `startDate` / `expiryDate` は空文字、`periods` は空配列。
- 採番の年度リセットは土曜日への提案にとどめる。現行のグループ内継続採番を維持し、採番トランザクション内で同じ保証番号の既存物件があれば登録を拒否。取込機能・採番値修正UIは追加しない。既存番号保持、取込完了後のグループ・年度別最大番号からの採番はHSC-004/015の設計案であり未確定。
- CSVは後続のデモ確認指示で引渡日期間抽出に変更する（先行版の手続き期間抽出を置き換える）。保険開始日未設定の物件は、最新指示では引渡日未設定と同義になり、未加入判定には使えない。加入対象選択・段階的加入・報告状態はHSC-036で確認する。取込・請求書出力は試作対象外。税区分はHSC-010で確認する。
- 既存の工務店→支店構造、会社標準／支店優先の保証グループは維持する。上位の工務店グループはHSC-038で確認。PDFを背景に文字を配置する正式帳票案は可能だが、今回のサンプルは画像と表面のみ。原本・裏面約款・印字条件を受領してから検証し、現行の見本PDFは維持する。

互換性：既存物件は移行不要、保険表示は読取時に導出する。旧コードへ戻すと日付未設定物件の編集時に旧必須条件へ戻るため、単純なコード差戻しだけで旧運用へ戻せるとは扱わない。必要な場合は日付補完の判断を先に行う。設定項目を削除する外部操作や試験データの再初期化は行わない。


## 2026-10-01 デモ確認後の変更契約

根拠：オーナーの6項目指摘と、申込日を本登録後は変更不可とする確認への「この形で進める」。試作の確定仕様であり、本番未決事項・HS回答を追加確定しない。

- 申込日は下書きに保存し、本登録までは訂正できる。本登録時に有効な日付を必須とし、採番年度に使う。過去の申込日を許容する。操作履歴の日付は実際の日本日付を保つ。本登録後はサーバーでも変更・消去を拒否し、既存番号は再発行しない。旧クライアントが既存本登録の申込日を送らない場合だけ保存値を維持する。旧下書きで未入力の場合は画面で当日を初期表示し、保存時に記録する。
- 受領管理表の番号年度は2桁（HSC-25-001、SHS-20-001、UHは18-001）。4桁化はせず、検索用年度値は西暦4桁のまま。年度ごとの通番リセットは未採用。
- 保証グループの接頭辞・年度開始月は作成直後から変更不可。名称・有効状態は変更可能。無効化しても番号・割当・既存保証を削除しない。無効なグループへの新しい会社／支店割当と、そのグループでの新規本登録は拒否。既存割当を保持した名称等の訂正と、既存保証の閲覧・訂正・延長は継続可能。下書きは保存でき、本登録前にHSが有効な割当へ変更する。
- 接頭辞の重複禁止は無効化後も維持し、空の接頭辞も予約対象とする。同じグループを再有効化すれば通番を継続する。誤った年度開始月を同じ接頭辞のまま修正する例外は未提供で、HSC-037で検討する。削除機能は追加しない。
- 会社／支店自体の無効化はHSC-038で検討、保険報告対象選択・報告状態はHSC-036の未採用案として記録。実装は今回に含めない。

互換性と復旧：既存の番号・日付・カウンターを書き換える移行は不要。enabled未設定は有効として扱う。旧版への単純差戻しではグループ無効化・申込日固定が守られなくなり、報告対象日も変わるため、業務を停止して影響確認した上で行う。次回配備は画面とFunctionsを同時に更新する。外部データ変更・再初期化は対象外。

検証：UI／業務ロジック／データ契約／文書の複合変更として全7ゲートを選択。申込日の年度境界・固定、引渡日抽出の両端・未設定・取消、未採番グループの編集拒否、無効化・再有効化と既存保証の継続を検証する。実測結果は[検証記録](evidence/meeting-prototype-2026-10-01.md)を参照。


## 2026-10-02 運用境界

保険報告済み情報・保険延長期限・次期保険の自動追加はオーナー指示で保留（HSC-036）。既存の引渡日期間CSVを維持してDev配備する。今回の試験データ削除では会社・支店・保証グループ・カウンター・設定と管理者を保持し、過去の全件初期化指示と区別する。実行と検証結果は運用／実測記録を参照。

同作業中の最新指示で、会社・支店・保証グループを含むマスタと採番カウンターも削除し、番号再利用を許可する。保持は管理者2名とアラート設定。`--empty-masters` を使用し初期グループは再投入しない。直前のマスタ保持案を置き換えるDev限定の初期化である。


## 2026-10-06 固定(default)復旧の認可・運用データ契約

Local新実装、Dev未配備。公開`_recovery/access`はprotocol:2／phase:normal-recovering-verification／generation:正整数／databaseId:(default)／controlDatabaseId:別DB。marker欠損・旧protocolを拒否。自己プロフィールのログイン判定は業務開放とは別。

SDK直接set/updateはruntimeGeneration:正整数／runtimeProtocol:2／runtimeNonce:要求ごとの非空文字列を併記。updateは既存nonce継承を拒否、直接deleteも拒否する。metadata3項目は10業務collection groupで索引対象外。Trusted server書込に同じSDKメタデータを要求するものではない。nonceは全履歴の再送防止台帳ではない。

Private controlの`defaultRecoveryPlans/{id}`はsource／target／controlId／generation／revision／approval／authorizationHash／sourceHash／beforeHash／expectedHash／manifestHash／status／件数。itemsはpath／set-delete／before-after hash／updateTime／型付きJSON文字列、preimageは全対象前像。Auth hash／署名秘密は含めない。BのrecoveryVerificationsはtypedHashを追加し、旧hashだけの証拠は新Cへ無効。

Default private `_recovery/apply`にplanId／generation／owner、`_recovery/apply/plans/{id}/batches/{item}`にplanId／after／completedAt、`_recovery/publication`にplanId／approval／phase／generation／revision／expectedHash。ブラウザ読書は拒否。業務同期から_recovery/controlを除外し、現在のプロフィール／bindings／番号予約とカウンター上限を保全する。[型・保持・実行境界](default-database-recovery.md#2026-10-06-固定default方式のlocal実装状況)参照。
