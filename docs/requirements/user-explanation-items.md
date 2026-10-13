# User Explanation Items

2026-10-13現在：本件はDev反映・開発側受入れ済み。以降の未反映・禁止は当時の状態。実データの延長履歴は0件で申込日補完は不要。HS業務受入れは別途。[導入結果・確認範囲](../operations.md)。

## 2026-10-13 その他旧取得の終了（Dev未反映）

現在の画面のマスタ候補・検索・CSVは維持する。旧マスタ検索や旧一覧全件モードからの要求は、取得前に「旧取得は利用できません」等のエラーで停止する。旧画面の再利用は取得仕様を見直してから行う。月別一覧・満了案内の対象全体取得は現状維持し、運用開始後のRead／Write実績で改善の必要性を判断する。

## 2026-10-13 旧検索条件の終了（Dev未反映）

現在の画面の検索・満了案内の操作は維持する。古い画面等が未対応条件を送った場合、「この検索条件には対応していません。画面を再読み込みしてください。」と表示して停止する。工務店担当者の保証案内は自社、本支店担当は自支店の対象だけを表示する。準備不備時は取得失敗となり、全物件を読み直す救済はしない。[設計](../design/legacy-property-list-retirement.md)。

## 2026-10-13 接頭辞末尾のハイフン（Local確認済み・Dev未反映）

`HSC` と `HSC-` は別の接頭辞として登録でき、新しい保証番号はそれぞれ `HSC-26-001`／`HSC--26-001` となる。入力前後の空白は除く。接頭辞は登録後に通常編集できない。既存の発行番号は変わらないが、末尾ハイフン付きの既存グループで今後新規登録する番号にはハイフンが残る。無効グループも同一接頭辞の重複対象。通常マスタ編集は引き続き後の保存を採用する。

## 2026-10-13 満了案内の抽出（Local改修・技術検証済み・Dev未反映）

案内一覧は処理開始時の設定と日付で表示する。抽出中に設定を変えてもその結果は変えず、次の取得で新設定を使う。検索に必要な項目が欠落した物件は一覧へ出ない場合があり、自動救済・補完は行わない。移行・復元の準備情報が整わない場合は取得失敗となる。[確定仕様](../specification.md)、[工程](../roadmaps/expiry-notice-read-reduction.md)。

## 2026-10-12 保証延長申込日（提供前）

提供後は、延長のたびに実際の延長申込日を入力すること、延長分の請求基準となることを説明する。初回申込日を訂正する操作ではない。延長申込日が延長開始月の前月末より後なら注意を表示するが延長でき、理由は任意。過去日を後日入力しただけでは注意しない。保証期間・番号・保険報告月は変えない。取消後の申込日と理由は手続き履歴で確認し、再延長時は新たに入力する。入金確認はシステム外。旧記録の「未確認（移行前）」は申込日を推測していないことを示す。[仕様](../specification.md#2026-10-12-保証延長申込日請求基準確定改修中)、[工程](../roadmaps/expiry-notice-read-reduction.md#保証延長改修の工程)。

## 2026-10-12 月別3一覧の説明変更

新方式の提供後は、指定した年月の前月分を処理することを説明する。例：11月指定で10月分。通常は9月以前の未処理も含み、「済みを含める」にチェックすると10月分だけとなり、9月以前の未処理も表示されない。再出力では目的の基準月の翌月を指定し、最新の物件名・住所等を使用する。請求の新規は初回申込日が基準。延長は後続の延長申込日改修提供後に当該申込日へ変更する。下記の従前の年月指定とは区別し、再出力でも翌月を指定する。[提供・検証状況](../operations.md#2026-10-12-月別3一覧の実装dev導入)を参照。[確定仕様](../specification.md#2026-10-12-月別3一覧の前月基準処理済み表示)。

## 2026-10-12 自社設定・請求先・正式CSVの説明対象

[確定設計](../design/company-settings-and-document-csv.md)に沿って実装。検証・提供状態は[運用記録](../operations.md#2026-10-12-会社設定請求先保証書csvの実装とdev反映)を参照し、配備確認後に以下を案内する。

「その他業務 ＞ 設定」で自社情報を会社・代表者／所在地・連絡先／振込先のカードで確認し、管理者は上部の「編集」でダイアログを開いて入力・保存する。未保存で「閉じる」または別画面へ移動する場合は、変更を破棄するか確認する。振込先の金融機関名・支店名・預金種別・口座番号・口座名義もここで設定する。口座番号の先頭の0は保持され、実際の振込や口座確認は行わない。請求先は「保証グループ・工務店・本支店」から保証グループを編集し、「請求先」に入力する。請求一覧の保証グループ選択欄下に宛先名を表示する。

- 自社設定は管理者が編集、一般HS担当者は参照。会社名以外は任意。住所1は番地まで、住所2は建物名等。連絡先メールを変えてもログイン・送信元設定は変わらない。
- HSの会社情報を変えてもWordの固定文字は自動更新しない。延長分に対して見本の「10年間」をそのまま使わず、Word側も確認する。
- 請求先は1保証グループ1件で8項目。未設定でも現行CSVは出力でき、同じ会社が複数グループにあっても自動合算しない。請求CSVは11列のまま。
- 保証書CSVはグループによらず21列で、未使用列も空欄として残る。外部キーはUHの契約Noに利用し、担当工務店・本支店とHS自社情報を混同しない。
- 開始日は元の開始日、満了日・年数は選択した初回/延長に対応する。延長済み物件の初回分を再出力しても初回10年の内容。年月日分割は西暦・月日の先頭ゼロなし。
- CSV出力だけでは発行済み/請求済みにならない。会社情報等の再取込み時保全は開発側の手順で行い、HSの通常入力で保証番号を変更しない。
- 一覧右上は、保証書CSVが「CSV出力」「発行済みにする」、請求用一覧が「CSV出力」「請求済みにする」、保険報告用一覧が「CSV出力」「報告済みにする」。対象の件数は一覧上部と確認画面で確認する。
- 「発行済みにする」は選択した未発行の保証期間だけを更新する。発行済み分を再出力するときはこのボタンを使わず、元の対象年月（初回は引渡月、延長はその開始月）で検索し、行を選んでCSV出力する。

## 2026-10-08 保険・請求一覧の対象件数と読取量

オーナー指示でHS向けシステム利用説明資料の対象へ追加。保険報告には指定月分だけでなく過月の未報告等も含まれ、未処理分を溜めると表示対象が増える。毎月報告することと、システム内部の読取件数は別である。

全307件の読取は、対象月をFirestoreクエリへ渡していない実装上の改善事項であり、HSに受け入れてもらう通常仕様として説明しない。対象月での抽出に改める必要があるとオーナーが指摘。取得方式の改修と完全性・Read件数の検証は[HSC-023](house-solution-confirmations/HSC-023-ngram-query-consistency.md)で管理する。HSへの業務説明は指定月と過月未処理の対象範囲に限定し、改修前の非効率な読取を運用ルールにしない。資料の作成・提供は後発のまま。

## 2026-10-08 オーナー決定による現在の状態

資料名称を**HS向けシステム利用説明資料**とし、後発で作成する。従前の「納品前に制限説明資料を作成・提供」は今回の指示で置換する。以下の説明対象は将来の執筆材料として保持する。組織階層、本支店必須、コード条件付き必須、無効編集禁止、共有Storeと計測はDev反映済み。資料本体の完成・HS提供は未実施。

## 2026-10-08 組織管理の階層移動（Local改修）

保証グループ一覧で「工務店を見る」、工務店一覧で「本支店を見る」を押して管理する。「選択解除」は使わず、画面上部の戻り先が書かれたボタンで一つ上の一覧へ戻る。パンくずから保証グループ一覧へ直接戻ることもできる。同じ親へ戻ると検索とページを保持し、別の親へ進むと子の条件を初期化する。編集後はその一覧に留まり、新規グループ／工務店の作成後は配下の登録へ進める。無効データは「無効を含む」から表示し、編集する場合は先に有効化する。Dev配備・実画面受入は別途。

## 2026-10-08 工務店・本支店の選択と参照名

工務店・本支店の候補は共有した全候補から入力で絞り込む。工務店の変更で本支店選択を解除する。候補は有効な所属先に限り、過去データの名称表示には無効マスタも使う。参照データを更新できない間は警告を出して新しい候補の選択を停止し、入力済み値は保持する。

開発側は処理別の観測件数をFunctionsログで確認する。業務内容・個人名を記録する監査機能ではなく、取得方式を見直す材料。請求対象件数との一致は保証しない。[設計と状態](../design/reference-store-metrics.md)。


## 2026-10-08 納品前作業：HS向け運用上の制限説明資料

オーナー指示（2026-10-08、本Codex会話）により、システムの制限と運用上の注意点をHSへ説明できる資料を後発で作成・提供する。状態は**作業登録済み・資料未作成／未提供**。本節は資料作成のチェックリストであり、以下に残る旧試作の説明をそのまま納品資料へ転用しない。作成時に[現行仕様](../specification.md)・実装・配備／受入記録と照合する。[納品前作業](../roadmaps/2026-initial-delivery.md#2026-10-08-後発作業hs向けシステム利用説明資料)から追跡する。

少なくとも次を説明対象に含める。

- Local改修の無効データ編集禁止：無効マスタは表示・再有効化だけ可能で、内容を変更する場合は先に再有効化する。再有効化と改名等は同時に行えない。無効スタッフの氏名・メール編集も同様。本支店コードが有効本支店と重複すると再有効化できず、有効側の重複解消を先に行う。画面の支店用語は本支店へ、新CSVは本支店コードへ変更し、旧見出しは受理する。コード桁数制限は撤廃するがCSV全体の容量制限は維持。Dev反映済み。説明資料は配備版と照合する。

- BRANCH-03のLocal改修：工務店の所属保証グループと本支店の所属工務店は登録後変更不可。本支店コードは同じ工務店の有効な本支店同士で重複不可。無効な本支店との重複は許可するが、再有効化時に重複すれば再開できない。コード再利用後に古いCSVを再検証すると現在有効な本支店に対応するので、過去ファイルの再利用時は対応先を確認する。既存保証の本支店IDは付け替えない。Dev反映済み。現行画面と照合してから利用手順として提供する。

- 保証グループの接頭辞は有効／無効に関係なく全体で重複不可。無効化しても再利用不可。空欄も重複対象。2026-10-13採用により末尾ハイフンの有無は別物として扱う。接頭辞・年度開始月は登録後の通常編集不可。
- 保証グループの外部キー・住所・資材名の必須設定は作成後変更不可。外部キーの表示名は変更可能。作成前に設定を確認する。
- 通常の物件登録では外部キー必須グループだけキー欄を表示し、下書きから必須。保存済みキーは通常編集・取消で変更／解放できない。
- 一括取込みは外部キー必須の有効グループだけ利用可能。増分の新規申込み専用で、既登録キー・ファイル内重複・未知支店・不正行があれば全件棄却。修正は通常編集で行う。任意項目は空欄のまま保存する。
- 一括取込みの支店コードは必須。空欄を本店とみなすと入力漏れと区別できないため、空欄もエラーとして全件棄却する（2026-10-08オーナー確定）。事前に対象工務店の有効支店とコードを登録する。通常物件は下書きから本支店必須。本支店コードは一括取込み対象グループ配下で必須。Dev実装済み。
- その他の登録後の変更制限、検索・CSV出力・取消・再操作の注意点は、納品対象の現行仕様と実装を棚卸しして追記する。未実装・未検証の機能を利用可能として説明しない。
- CSVの日付はExcelの日付入力を利用できる。年・月・日の順（例2018/4/1）またはYYYY-MM-DDとし、年月のみや存在しない日は不可。「CSV UTF-8」で保存し、プレビューで日付を確認する。外部キー等の先頭0は文字列として維持する。

資料では「できない操作」「理由」「日常業務での対応」「誤設定・困った場合の相談先」を、専門用語に頼らず具体例とともに示す。誤設定の訂正や例外対応は利用可能な範囲を確認し、自動修正・番号変更などの未提供機能を約束しない。

### HS向け説明文案：一括取込みの支店指定（2026-10-08）

一括取込みを利用する保証グループでは、CSVの各行で支店の指定が必要です。支店コードは省略できません。空欄を「本店」として受け付けると、入力漏れとの区別ができないためです。

取込み前に、対象工務店の支店を登録し、支店コードを設定してください。CSVにはそのコードを入力します。空欄、未登録、無効な支店のコードが1件でもあると、ファイル全体を登録しません。コードを確認・修正してから再度検証してください。本店分を取り込む場合も空欄は使えないため、登録先とコードを管理担当者に確認してください。名称や契約番号からコードを推測して埋めないでください。

この制約はUHだけでなく、一括取込みを利用できる保証グループに共通です。通常の物件入力での本支店必須化、取込み対象グループでのコード必須化は後続実装であり、現在その入力を強制する機能として案内しません。

状態：本項の説明文案は作成済み・オーナー確認前・HS未提供。制限説明資料全体の棚卸し・完成・提供は未完了。[現行契約](../design/property-bulk-import.md#2026-10-08-現行契約増分必須グループ限定)に基づき、CSVの必須条件を変更せず記録した。

完了条件：納品時点の仕様・実画面との一致を確認し、オーナーが内容を確認できる資料を完成させ、HSへ提供したことを記録する。今回の作業登録だけでは資料作成・提供完了にしない。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

2026-10-01 target amendment (ADR 0034): HS issues the account once; company operators register their own properties/warranties and extend warranties without HS approval for each submission. The prototype review/withdrawal instructions below describe the old implementation. Replacement correction/cancellation instructions require the new workflow design and validation before training. This does not enable public account registration or automatic insurance reporting.

- Status: Active
- Audience: House Solution staff who will operate or administer the system
- Purpose: Record confirmed behavior that must be explained during acceptance, training, or release preparation. This checklist does not replace the authoritative specification or decisions linked below.

## Confirmed Warranty Model — Explain After Implementation

A property has one continuing warranty. Its number stays the same on renewal, and prior periods remain available as history. Product settings and warranty groups are separate from that individual warranty; groups identify the certificate form and support property extraction. Insurance rules are separate. This model is confirmed but **not implemented**; do not demonstrate the current independent-record extension flow as if it already complied. Authority: [ADR 0033](../decisions/0033-permanent-property-warranty.md).

## Update-conflict Behavior

### Master records use last-write-wins

- Applies to update, inactivation, and reactivation of the four managed masters: construction company, homeowner, property, and warranty service.
- The last trusted mutation that commits is retained. A save is not rejected only because another user changed the same master after the form was opened.
- A full-form save can overwrite fields changed by another user in the meantime. The system does not automatically merge fields or show a conflict-resolution screen.
- Enabled-account checks, supported shapes, property-reference validation, immutable creation metadata, server timestamps, and atomic revision increments are enforced by Firestore and its Rules. Name-search N-Grams are generated by the application; under the provisional access posture the Rules do not prove that an authenticated client's submitted map semantically matches its name.
- Authority: [ADR 0016](../decisions/0016-master-last-write-wins.md) and [master management requirements](master-management.md#master-update-concurrency).

### Cases and applied warranties reject a stale editing baseline

- A case edit dialog and an applied-warranty dialog retain the parent case's exact `updatedAt` value from when editing starts.
- Saving is rejected if any case-level change or applied-warranty add/update/inactivation has changed that parent case in the meantime. The user must review the latest data and retry.
- This applies even when the two users changed different case fields or different applied warranties under the same case. The current protection is case-wide; it does not merge independent edits.
- Applied-warranty mutations update the child record and the parent case timestamp atomically. Direct client writes to applied warranties remain prohibited.
- Authority: [prototype Firestore data contract](../design/prototype-firestore-data-contract.md#required-prototype-invariants) and [case warranties](case-warranties.md).

## Delivery Checklist

- Explain both behaviors together so users understand why master saves normally proceed while case-related saves may require reopening and retrying.
- Demonstrate two-user examples before production acceptance.
- If either conflict policy changes, update the authoritative requirement or ADR, this checklist, UI messages, and concurrency tests together.

## Construction Company Portal

### New-case date assistance

- When a construction company enters a handover date for a new case, the warranty start date is filled with the same date while the warranty start date is blank or still matches the previous handover date.
- A manually changed warranty start date is preserved when the handover date is changed again.

### New-case withdrawal

- A construction company can withdraw only its own new-case work item while it is draft, submitted, or returned for correction.
- A withdrawal reason is required. The work item is retained with the reason and cannot be edited or reopened by the construction company.
- Withdrawing a submitted or returned item creates a House Solution-side notification; withdrawing a draft does not send that notification.
- An approved case is outside this withdrawal flow and follows the separate case-cancellation procedure.
- Authority: [workflow requirements](workflow.md) and [construction-company portal design](../design/construction-company-portal-prototype.md).


## 2026-10-01 デモ確認後（ローカル・未配備）

本登録前に申込日を確認する。初期値は当日だが、前日に受け付けた申込みは日付を訂正する。本登録後は申込日・保証番号を変更できない。保険報告用一覧の期間は引渡日を指し、未設定物件は含まれない。CSV出力は報告完了ではない。保証グループを無効にしても既存保証は消えず、新規本登録を再開するには有効な割当が必要。既存の実演PDFには今回の変更は未反映。 詳細は[試作契約](../design/meeting-prototype-2026-10-03.md)を参照。
