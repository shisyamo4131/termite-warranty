# Master Management

## 2026-10-12 自社情報・保証グループの請求先

同日追加：自社の振込先1口座として金融機関名・支店名・預金種別・口座番号・口座名義の任意5項目を追加し、編集をダイアログ化する。口座番号の先頭ゼロ保持、旧画面の省略項目保持、実値の自動登録なし。表示レイアウトは「分類カード」を採用し、会社・代表者／所在地・連絡先／振込先に分ける。狭幅は1列、上部の編集ボタンからダイアログを開く。保証グループの請求先8項目はオーナーがDev検証し、受入れOKとした。

オーナー採用の[確定設計](../design/company-settings-and-document-csv.md)に従い、「その他業務 ＞ 設定」に自社情報1件を管理する。会社名・郵便番号・住所1・住所2・電話・FAX・適格請求書発行事業者番号・代表者名・代表者肩書・メールの10項目。保存時必須は会社名のみ。住所1は都道府県～番地、住所2は建物名等。開発者・HS管理者が編集し、一般HS担当者は参照する。組織管理とアラート設定は移動しない。

保証グループ編集に請求先名・部署名・担当者名・郵便番号・住所1・住所2・電話・メールの8項目を追加。1グループ1請求先、既存のHS編集範囲を維持、空欄・部分入力可とする。工務店向け取得では請求先情報を除外する。グループ間自動合算、工務店等からの推測補完は行わない。設定変更で物件・採番・請求済み状態を変更しない。

自社情報には保存/変更取消・最終更新日時/更新者を表示し、同時編集は既存同様に最後の保存を採用する。未設定でも現行CSVを停止せず、旧形式の更新でも未指定の新項目を消さない。今後の再取込みでは両設定を保全・照合する。同日の開始指示により画面・保存処理を実装。[検証・提供状態](../operations.md#2026-10-12-会社設定請求先保証書csvの実装とdev反映)を参照。実会社情報は自動投入しない。

## 2026-10-08 階層ごとの管理画面

- 配備状態：レイアウト完成後のオーナー指示により、先行Store／計測と合わせた `ebd9c45` をDevへ反映済み。下記Local時点の「Dev別途」は解消。[配備照合・機能検証・UI/UX確認手順](../design/reference-store-metrics.md#2026-10-08-dev配備と実受信)。画面操作のユーザー受入は未実施。
- 根拠：2026-10-08、画面案の本チャットでオーナーが「2番目を採用するよ。画面を改修してください。」と指示。2番目は「階層ごとのページ」で、戻るボタンを両階層へ設ける修正も採用対象。
- 従来の3カラムと選択解除を、一階層ずつの一覧・行の「工務店を見る」「本支店を見る」・所属を示すパンくずへ変更する。URLを分割せず、既存の組織管理入口内で一覧を切り替える。
- 工務店一覧には「← 保証グループ一覧」、本支店一覧には「← 工務店一覧」を設ける。検索条件とページは同じ親へ戻るとき保持し、別の親へ移るとき子側だけ初期化する。件数減少時はページ範囲を補正する。
- 追加・編集ダイアログ、所属固定、無効データの表示／再有効化、20件ページ、取得方式は維持。既存データの編集後は現在の階層に留まり、新規グループ／工務店の保存後は配下の一覧へ進む。
- 狭い画面では行の操作を名称の下へ折り返し、長い名称・コードを折り返す。タッチ操作のボタンは高さ44px以上。上位の無効による停止も本支店画面で表示する。
- 対象：`app/components/WarrantyOrganizationManagement.vue` と保存後の遷移を扱う `app/components/MeetingPrototype.vue`。回帰テストは `test/warranty-organization-ui.test.mjs` を追加し、`package.json` の `npm test` に組み込む。文書は本書・仕様書・利用者説明項目・CHANGELOGのみ更新。変更分類はUI＋application-logic＋documentation-only＋テスト実行設定（build-release-deploy）、完了ゲートはポリシーの全7件。データ契約・移行・権限・ガバナンス・進捗の変更はなく、ADR／ロードマップの追加は不要。既存索引から到達でき、新規文書・運用手順変更はない。ロールバックは今回の画面・保存後遷移の差分だけを戻し、先行改修を保持する。Dev配備は別途。

### Local検証結果

対象は上記8ファイルの今回差分を含む未コミットのprimary作業ツリー。先行する共有Store・無効編集制限等の変更を保持し、今回分だけのcommit／配備はしていない。下表は実行完了後の結果で、選択した完了ゲートの省略なし。

| コマンド | 結果 | exit |
| --- | --- | --- |
| `node --test test/warranty-organization-ui.test.mjs` | 4成功。階層往復・busy抑止・検索とページ保持・別親への切替・件数減少・無効表示・保存後遷移 | 0 |
| `npm test` | 349件中346成功、失敗0、ホストのsymlink作成制約による既存3skip | 0 |
| `npm run typecheck` | 成功。テスト実行設定変更後も再実行 | 0 |
| `npm run build` | 成功。既存のNitro external解決・大きいchunk等の警告あり | 0 |
| `npm run test:rules` | 138成功、skip0、専用Emulator停止まで確認 | 0 |
| `node scripts/check-functions-syntax.mjs` | 成功 | 0 |
| `node --check scripts/seed-emulator.mjs` | 成功 | 0 |
| `pwsh -NoProfile -File scripts/check-governance.ps1` | 成功。結果記入後にも再確認 | 0 |

初回 `npm test` はsandboxの既定一時領域のrename EPERMで7失敗（exit1）。書込み可能な本チャットの作業用ディレクトリへ当該プロセスのTEMP/TMPを変更し、失敗した2ファイルを先行確認後、全単体を再実行して上記結果。Emulator初回はsandbox内の起動待ちで失敗（exit1）；通常Local権限で同じ専用demo試験を再実行して成功。アプリコードや試験を緩めて回避していない。

実コンポーネント＋Vuetify＋共有CSSを、Firebaseへ接続しない架空データの一時プレビューで表示。デスクトップ、320／390／768px設定のブラウザ幅で階層遷移・戻るボタン・名称／コード折返しを確認。各狭幅でdocumentのscrollWidthとclientWidthが一致し、横にはみ出していない。無効本支店の「表示／有効化」の分離も確認。ブラウザの幅検証であり、実機タッチ・認証した業務画面全体・HS受入・Dev配備は未実施。

## 2026-10-08 共有参照Storeの初期方式

保証グループ・工務店・本支店はHSでは有効／無効を含めて購読し、名称表示と管理画面で共有する。登録候補は有効な親子関係だけをAutocomplete標準filterで絞る。20候補上限・2文字検索待ちは設けない。一般業務一覧の最新20件規則は維持し、参照用取得の例外と区別する。無効を含む表示の切替や通常編集禁止は維持。取得方式の見直しにFunctionsログのアプリ観測件数を使う。[現行設計](../design/reference-store-metrics.md)。


## 2026-10-08 無効データの編集を禁止

オーナーが無効状態での名称変更をバグと指摘し、全無効データに再有効化後の編集を要求した。現行の保証グループ／工務店／本支店は「無効を含む」から通常編集でき、スタッフ管理も無効アカウントを編集できた。Localでこの経路を閉じる。無効行は表示と再有効化を分離し、通常保存は最新状態が無効なら拒否する。専用再有効化はenabled・更新日時と必要なコード予約だけを更新し、名称／所属／コードの同時変更は許可しない。重複コードがある本支店は再有効化できないため、有効側の重複を解消してから再開する。

再有効化要求への編集項目混入、別画面からの無効化競合、無効スタッフのプロフィール更新とAuth副作用なし、復活後の通常編集、コード予約競合を検証する。会社アカウントには通常プロフィール更新APIがなく状態切替のみ。旧active型マスタの直接更新composableは残存するが現行画面からの呼出がなく、旧3 Callableも廃止済みのため今回の稼働経路修正の対象外。再利用時には最新active検査を必須とする。一般業務Rulesへschema制限は追加しない。移行不要、無効データの内容は自動変更しない。Dev反映なし。UI＋logic＋data contract＋docs（参照Store例外のproject guidance変更も含む）の全7ゲートを使用する。

## 2026-10-08 工務店の所属保証グループを登録後固定

オーナーが「従属先保証グループを変更できない認識。そうなっていなければ改修開始」と指示。工務店のdefaultGroupIdを作成後変更不可とし、画面と保存処理で禁止する。以下の2026-10-03所属変更許可は判断履歴として残すが、現行の通常操作には使わない。既発行保証の旧グループ／番号保全は維持し、所属を自動移行しない。[改修範囲](../design/property-bulk-import.md#branch-03-有効コードと会社所属固定)。

## 2026-10-08 グループ別の入力必須設定

保証グループexternalKeyRequiredは作成後変更不可。通常登録では必須グループだけ外部キーを表示し、下書きから必須。任意グループでは非表示、新たなキー入力をサーバーでも拒否する。一括取込み先は有効かつexternalKeyRequired=trueのグループに限定し、サーバーでも再検査する。現在のHSC／SHSは対象外、UHは対象。過去に任意グループへ保存済みのキー・予約は削除／解放せず保全する。

住所addressRequired:boolean、断熱材ありの場合の資材名insulationMaterialsRequired:booleanを保証グループへ追加し、作成後変更不可。通常登録／通常編集／CSVの本登録で同じ設定を使う。断熱材なしでは資材名不要。必須項目を空欄から「不明」へ補完して通さずエラーにする。任意の場合は通常入力・CSVとも空欄を空文字のまま保存する。「不明」の自動補完は行わない（同日オーナー訂正）。既存の「不明」値を今回書き換えない。旧設定未保存のUHは両方false、その他は両方trueとして互換読取りする。既存物件や番号の書換えは行わず、旧キー等の保全を維持。

画面では住所必須・断熱材ありの場合の資材名必須を別々に選択し、既存グループでは両スイッチを変更不可とする。未保存の旧グループは互換値を表示し、既存設定の変更を受け付けない。[仕様](../specification.md#2026-10-08-増分一括取込みと保証グループ必須条件)。

## 2026-10-07 外部キーの必須設定と名称

保証グループ作成時に外部キーを必須にするか設定し、登録後の切替は不可。必須の場合は表示名も必須で80文字以内、表示名だけは後から変更できる。UHは必須・初期表示名「お施主様契約No」。必須チェックの無効化だけでなくサーバーでも変更を拒否する。既存UH物件はDev読取で0件、補完移行は不要。[確定仕様](../specification.md#2026-10-07-通常登録の外部キー必須設定表示名)。追加改修cbb5859はDev反映・正式配備照合済み。UHの必須true／名称の2項目も実グループへ保存・readbackを完了。HS実画面受入は未完了。[実行・受入手順](../design/evidence/common-import-address-2026-10-07.md#外部キー改修の受入手順と残件)。

## 2026-10-04 Dev受入での変更（仕様書0.1.91）

接頭辞末尾のハイフンを入力する必要をなくし、採番時に非空の接頭辞へ1つ自動付与する。空接頭辞に先頭ハイフンは付けない。既存末尾ハイフン付き設定と発行番号を維持する。工務店・支店郵便番号の任意化と支店住所追加は[住所要件](branches-and-addresses.md)参照。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 初期画面の範囲（仕様書0.1.86）

表示項目は試作画面を基本とし、保証グループ・工務店・支店の確定した階層と有効状態を整える。列の自由な並べ替え、表示項目の個人設定、一括編集などは初期に追加しない。既決の検索・ページ操作と状態指定は維持。根拠：同日①YES、HSC-008の初期業務範囲を解決。取得技術判断はHSC-023/022、実装・検証は後続。

## 2026-10-03 一覧の状態指定（仕様書0.1.85）

保証グループ・工務店・支店は有効のみを既定表示し、明示的な「無効を含む」指定で無効データも対象にする。既定all案は不採用。新規登録の選択候補は有効のみ。最新20件・ページ操作は維持し、状態条件との取得方式の整合は実装時に検証する。根拠：同日①、HSC-008。未実装。

## 2026-10-03 グループ誤設定の訂正（仕様書0.1.78）

接頭辞・年度開始月は通常編集不可。初期はHSから依頼を受け開発側が発行済み番号への影響を確認して個別対応する。後発でHS自身の訂正機能を実装する要求を採用。具体的な権限・条件・既存保証反映・時期は未定で、通常編集の即時解禁や番号一括変更は行わない。根拠：同日③、HSC-037。未実装。

## 2026-10-03 確定：所属変更後も既存保証を維持

工務店の所属保証グループを変更しても、既存保証は旧グループ・旧保証番号を保持する。新たに本登録する保証だけが新グループを使用し、支店も所属工務店に従う。例えばHSCからSHSへ移った会社でも、既存HSC保証の延長でSHSへ変更・再採番しない。現在の会社所属と発行済み保証の所属は別に保持する。

根拠：2026-10-03本Codex会話の具体例へのYES。仕様書0.1.68、HSC-037。今回の階層内統一は新規登録時の適用ルールであり、既存保証の一括変更を意味しない。親子管理画面・支店上書き廃止・会社／支店無効化の実装へ進む。配備・実データ移行は別途。



## 2026-10-03 確定：保証グループ → 工務店 → 支店

保証グループはHSの営業先を捉える単位で、HSの商品である保証の種類に対応し、所属工務店を包括する。現在3種類、将来追加可能。フランチャイズの親という説明は理解のための比喩であり、法的なフランチャイズ契約を意味すると推定しない。工務店は特定の保証グループに従属し、支店は工務店に従属する。別の「工務店グループ」という分類・マスタは設けない。

新規保証に使う接頭辞は所属保証グループのものを全工務店・全支店で共通使用する。支店独自のグループ上書き・接頭辞設定は不要で、従来の「支店優先／会社標準」を廃止する。既決のグループ別・年度別採番、将来のグループ追加、保証番号の恒久性は、この回答だけで変更しない。

管理画面もこの親子関係に沿って改修する要求を受領。変更案は、保証グループを起点に所属工務店を管理し、工務店から所属支店を管理する構成。工務店の項目名は「標準保証グループ」ではなく「所属保証グループ」、支店には継承元を表示し上書き選択を設けない。別分類としての工務店グループ画面は作らない。細かな画面配置は実装設計事項。

根拠：2026-10-03本Codex会話のオーナーによる定義訂正と画面改修希望。仕様書0.1.67、HSC-037/038。以前の「会社の所属変更後も既存保証は旧グループ／恒久番号を維持」と、今回のグループ内統一の適用範囲を確認する。所属変更の禁止・既存保証の一括移動・番号振り直しは推定で実施しない。旧支店上書きデータの照合・移行とロールバック設計は後続。今回仕様・画面変更案のみで、アプリ・データ契約・配備・実データは変更しない。

## 2026-10-03 確定：工務店・支店の無効化

工務店・支店は削除せず無効化し、新規物件の登録先から除外する。既存物件との関連と保証は保持し、HSは既存保証の訂正・延長・保証書出力・保険報告を継続できる。これは当該保証自体が取消済みの場合の操作制限を解除するものではない。

工務店の無効化は配下の全支店の新規登録も停止する。支店単独の無効化は本店・他支店へ波及しない。再有効化可能だが、工務店を再有効化しても個別に無効化した支店は無効のままとする。親の無効による実効的な停止と支店自身の無効状態を区別する。ポータルのログイン・アカウント停止を自動連動させる判断は今回に含めない。

根拠：2026-10-03本Codex会話の無効化3項目への「すべてYES」。仕様書0.1.67、HSC-038。未実装・未配備。



## 2026-10-01 デモ確認後の確定変更

保証グループの接頭辞・年度開始月は作成後変更不可。無効化すると新しい割当・本登録を停止し、既存保証の処理は継続する。未設定のenabledは有効扱い。接頭辞は無効化後も再利用不可、同じグループの再有効化は可能。会社／支店自体の無効化は未採用案。 詳細・互換性は[試作契約](../design/meeting-prototype-2026-10-03.md)。ローカル反映、未配備。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

## Status

These are provisional initial-release requirements. The overall data behavior remains implementation-independent; the current local prototype navigation described below is confirmed separately.

## Required Master Types

- Construction companies
- Homeowners
- Properties
- Warranty services
- HS branch management is excluded by the 2026-10-01 owner decision (HSC-033). Existing prototype references remain pending removal; construction-company branches are separate (HSC-038).

## Required Property Fields

- Property name is required.
- Building area is required as a positive square-metre value with at most two decimal places.
- Postal code, prefecture, municipality, and street/town and number are required; building name is optional. See [branches and addresses](branches-and-addresses.md).
- Notes are optional.

## Required Warranty-Service Fields

- Name, short name, and type are required. Type is either `保証` or `保険`. After surrounding whitespace is removed, the short name must contain no more than six displayed characters; Japanese and Latin letters/digits each count as one displayed character.
- The default warranty period is a required positive integer number of whole years.
- Notes are optional.

## Required Homeowner Fields

- Homeowner name, postal code, prefecture, municipality, and street/town and number are required.
- Building name, telephone, fax, and notes are optional. A nonempty telephone or fax accepts only ASCII digits and hyphens after trimming; no digit-count or separator-position rule applies.
- Existing pre-change homeowner records without these fields remain readable. A normal edit supplies the required address parts.

## Required Construction-Company Fields

- Construction-company name, postal code, prefecture, municipality, and street/town and number are required.
- Building name, telephone, fax, contact person, contact details, and notes are optional.
- Email belongs to the separately issued construction-company account rather than the construction-company master. When an account exists, its email address is shown on the construction-company detail screen.
- Telephone and fax use the homeowner digits-and-hyphens rule. See [branches and addresses](branches-and-addresses.md).

## Required Entry Points

- Staff must be able to create a needed master record while registering a case, without abandoning the case-registration flow.
- Each master type must also have a separate list/management screen.

The case-registration flow is the expected primary business starting point.

## Confirmed Local Prototype Navigation

- After login, the top page is the dashboard and business menus are presented in a Navigation Drawer that is initially closed.
- The current local increment has separate management entries for construction companies, homeowners, warranty services, and properties. Every Navigation Drawer menu title has a suitable icon on its left, with compact icon-to-title spacing so the title remains readable.
- Branch management remains an initial-release requirement but is outside this four-master increment.
- In these screens, a delete action means reversible inactivation. No physical-delete control is provided.
- Registration and editing forms for the four current masters open as dialogs from their respective registration and row-edit buttons.
- The case-registration dialog can open the required four-master creation dialogs without discarding the unsaved case input. Branch creation remains outside this increment.
- Each of the four current master lists links to a separate detail screen at `/masters/{master-type}/{id}`.  The detail screen has a fixed link back to its master list and its edit button opens the same dialog used by the list; it does not provide a separate edit form.
- An inactive current master remains readable from its list and detail URL.  A missing master ID shows an in-app not-found message and a link back to the corresponding list; a read failure is shown separately from not-found.
- A construction-company detail screen lists up to the 20 freshest properties whose stored construction-company ID matches the company, including inactive properties, under `担当物件`, and each row links to that property's detail screen.
- A homeowner detail screen lists up to the 20 freshest properties whose stored homeowner ID matches the homeowner, including inactive properties, under `所有物件`, and each row links to that property's detail screen.
- A warranty-service detail screen lists up to 20 active property masters under `対象物件` when they are linked through both an active case and an active applied warranty for that service. Each row links to the property's detail screen.
- Each dependent-property list on a master detail screen displays five records per page and shows pagination when more than five loaded records exist.
- A property detail screen shows its current homeowner and construction-company references as links when their records can be resolved.  Missing referenced records remain visibly unresolved rather than being inferred or recreated.

## Master Name Search

- Construction-company, homeowner, and property master lists and their case-filter selection dialogs support name search using the adopted N-Gram normalization and token-generation behavior.
- The case list itself does not directly perform a name-based free-text query; it filters cases by the selected master record IDs.
- A blank master-name condition shows the freshest 20 records. Any nonblank normalized name condition switches the prototype to the complete master collection, evaluates every matching name including a one-character condition, and presents matches in 20-record pages with the total count.

## Master Update Concurrency

- Master update, inactivation, and reactivation use last-write-wins. The last trusted write that commits becomes the stored state; an edit is not rejected solely because another user updated the same master after the form was opened.
- Direct Firestore writes conform to this rule: clients do not submit or read a revision precondition, while Firestore atomically increments diagnostic revision metadata. Firestore Rules enforce only authentication and the enabled-account boundary for staff business data. Supported shapes, timestamps, revision progression, property-reference validity, and name-search N-Grams are application responsibilities; authenticated writes outside the supported application flow have no integrity guarantee.

## Lifecycle Requirement

Master records that are already referenced by a case are not physically deleted. Staff can set them inactive and later restore them to active.

- Inactive masters are excluded from selection for a new case.
- Existing cases retain their master references and continue to display the current master name/address even after the master becomes inactive.
- Construction-company names, homeowner names, and property names/addresses in existing cases follow the respective master changes; none is stored as a case snapshot.
- Use by a case does not by itself require a pre-edit warning, reason, approval, or master edit history. Ordinary input validation, reference integrity, and existing lifecycle rules continue to apply. Past-value display or history management requires a future explicit scope request.
- A property's homeowner and construction-company references remain editable after the property is used by a case. Changing either property reference changes only the property and does not rewrite an existing case, including a cancelled or invalid case.
- A property holds homeowner and construction-company IDs. Selecting the property while registering a case, or changing the property on an active case, initially selects both references; staff may change either case value before saving.
- Changing a property master's homeowner or construction-company ID does not alter existing cases. See [decision 0014](../decisions/0014-preserve-case-party-references.md).
- An applied warranty displays the current name of its warranty-service master. A master-name change therefore appears on existing cases.
- A warranty-service master's default warranty period is a positive integer number of whole years. Changing it affects only newly added applied warranties; existing applied warranties retain their fixed periods and expiry dates.

## Unresolved-Matter Routing

See [HSC-008 master-list behavior](house-solution-confirmations/HSC-008-master-list-behavior.md) in the central register. Duplicate master records remain permitted without a warning or merge requirement.
