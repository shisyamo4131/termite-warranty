# Branches and Addresses

> 2026-10-08現在：本支店必須・条件付きコード必須・無効編集禁止・所属固定・共有Store②・計測・組織階層画面はDev反映済み。以下の日時付き準備記録より[最新実装・検証記録](../operations.md)を優先する。保証書専用CSVは未完了。

## 2026-10-08 本支店コードの条件付き必須化

一括取込み対象の保証グループに所属する本支店コードを、登録・編集・再有効化で必須にする実装をオーナーが指示。対象外は任意、桁数チェックなし、無効中編集禁止と有効コード重複拒否は維持。以下の「別の実装漏れ／後続」はこの改修の開始前記録。[条件・互換性・検証](../design/property-bulk-import.md#branch-code-required-01-条件付き必須)。

## 2026-10-08 本支店必須化の実装漏れを修正

全グループの物件／保証は下書きから工務店・本支店必須。本店もマスタ登録して明示選択し、「空欄は本店」を廃止する。UIとサーバー双方で検証し、旧未指定は未指定と表示。本登録済みの所属固定は維持する。Local/Dev物件保証データの初期化、改修後Dev配備、HS業務フロー実行はオーナー承認済み。過去の未実装記録を現行の任意入力仕様として扱わない。本支店コードのグループ条件付き必須化は別の実装漏れであり、この本支店選択修正だけで完了とはしない。

## 2026-10-08 本支店の用語と桁数制限撤廃

番号5の採用指示により、UI・エラー・新CSV見出しの「本支店」統一と本支店コードの200文字上限撤廃をLocal改修する。旧CSV見出しは互換受理、内部キーと既存データは維持。桁数チェック撤廃はCSV全体や保存基盤の容量上限撤廃を意味しない。[実装契約](../design/property-bulk-import.md#branch-05-本支店の用語とコード長)。下の桁数／名称未改修という記録より本節を優先する。

## 2026-10-08 有効本支店だけでのコード一意性

オーナーが同一工務店内の有効本支店間だけコード重複不可、無効本支店との重複許可、再有効化時の競合拒否を指定し、保存とCSV照合の改修開始を承認。親工務店変更禁止は維持。親会社／グループの無効化は本支店自身の無効化とは別で、コードを再利用可能にしない。既存物件は内部IDのまま所属を維持する。[設計・境界](../design/property-bulk-import.md#branch-03-有効コードと会社所属固定)。

全物件の工務店／本支店必須化と本店レコードの明示登録、コードは原則任意・取込み対象グループなら必須という方針を受領。今回の1〜3の先行改修では通常入力必須化とAutocompleteを未実装として区別する。桁数不要の指示と現行200文字上限、名称「本支店」統一と旧CSV見出しの互換性は説明・後続整合の対象であり、今回変更済みとはしない。

## 2026-10-08 現行契約と検討の境界

物件住所・資材名は保証グループ設定に従って必須／任意を判定し、任意は空欄を保存する。「不明」自動補完は撤回済み。共通取込み・住所移行はDev反映済みで、以下の未実装・未配備は当時の記録として読む。[現行契約](../design/property-bulk-import.md#2026-10-08-現行契約増分必須グループ限定)。

CSV支店コードは必須、通常の支店選択と支店マスタのコードは現在任意。取込み可能グループで通常入力も必須とする案は[読取調査と提案](../design/property-bulk-import.md#2026-10-08-pm-08local表示修正と支店必須化の検討)に整理し、採用・実装済みとは扱わない。既存データ変更は行っていない。

## 2026-10-07 物件住所を単一項目へ統合

オーナーは物件／保証の都道府県・市区町村・町域番地を`address`（住所）へ統合し、既存文書を移行するよう指示。郵便番号・建物名は別項目を維持し、工務店／支店の分割住所は変更しない。郵便番号候補は単一住所へ補完し手修正可。通常本登録では住所必須、一括取込の空欄だけ「不明」で保存する。旧3値は読取互換に使うが、明示した単一空欄を旧値で復活させない。支店コードと統合住所はLocal実装中、Dev移行は未実行。[共通設計](../design/property-bulk-import.md)。以下の旧物件住所3必須説明を置き換える。

## 2026-10-07 任意の支店コードと変更方針を確定

支店マスタに任意の支店コードを追加する。オーナーは質疑の推奨案を採用し、同一工務店内の非空コードは重複不可、空欄は複数可、別工務店との同一コードは可、登録後の変更は可と確定した。先頭ゼロを落とさない識別情報として扱い、支店内部IDを置き換えない。

コード変更で既存物件の所属・保証番号・内部IDを変更しない。新しい取込みは現在の支店コードを使う。変更後の旧コードが会社内で未登録なら、それを記したファイルは全件棄却となる。旧コードを他支店へ再利用すると古いファイルの対応先が変わる可能性があるため、受領側のコード訂正とプレビューの支店名確認が必要。旧コードの永久予約・別名受付・他支店への再利用禁止は今回採用していない。通常編集画面の支店候補は名前と設定済みコードを表示し、選択値には内部IDを使う。

UH契約Noの先頭4桁と加盟店コードが意図的に不一致の場合を許容する。支店照合には別欄の加盟店コードを用い、契約No先頭・名前・旧住所録エリアコードで代用しない。取得時のコードと確定時のコードの競合、コード同時保存の一意性はサーバーで検証する設計。[根拠](source-materials.md#2026-10-07-uh一括取込み確定と追加回答)、[詳細準備](../design/uh-integration-import.md)。未実装・未配備。

## 2026-10-07 UHの工務店支店と加盟店コード

オーナーはUHについて、工務店をユニバーサルホーム、各加盟店を配下の支店として扱うことに問題はないと明示。この所属方針を採用し、支店情報に加盟店コードを保持して識別できることを要件とする。加盟店の法的な所属を確認したという意味ではなく、システム上の管理構造の決定。受領した法人・店舗の区別を勝手に変更しない。

旧UH住所録のエリアコードは加盟店コードではないとオーナーが訂正し、現時点でシステムの関与対象から外した。住所録内の同じエリアコードや、物件一覧と住所録のコード不一致を加盟店コードの一意性欠如の根拠にしない。訂正版の物件一覧でも契約番号先頭4桁と加盟店コード欄の不一致が6件残るため、物件と支店の正しい対応は未確定。オーナーは加盟店コードの整合性・一意性と、支店へのコード保持の必要性をHSへ連絡済みと報告。現在のコードをそのまま一意キーにして支店を統合・物件を自動対応付けしない。加盟店コードは先頭ゼロ等の表記を保持できる識別情報として扱うが、保存フィールド名・形式検証・一意性の検査範囲・訂正移行は未設計。既存の支店内部IDを置き換える指示でもない。[訂正版の検査と旧照合の訂正](source-materials.md#2026-10-07-uh訂正版の契約番号検査とエリアコードの訂正)。

HSC/SHSの所属、住所・連絡先・無効化条件は変更しない。UH工務店ポータルは利用計画から除外し、支店マスタ登録だけでポータル利用を許可しない。実マスタ登録・スキーマ・アプリ・Devの変更なし。根拠：[オーナー採用記録](source-materials.md#2026-10-07-uh回答に対するオーナーの仕様確定と再確認連絡)、[所属設計](../design/uh-integration-organization.md)。

## 2026-10-04 Dev受入での変更（仕様書0.1.91）

工務店と支店の郵便番号を任意化する。支店に分割住所（都道府県、市区町村、町域・番地、建物名）を追加する。支店住所は既存データとの互換性を保つため任意入力とし、工務店の住所3項目は引き続き必須。根拠はオーナーA02報告（保証書・将来の請求書が支店宛となる可能性）。書類別送付先・発送機能を実装する指示ではない。下記の古い「他マスタへ拡大しない」は今回の明示変更で置き換える。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 TEL/FAXの文字制限再確認（仕様書0.1.76）

工務店・支店の電話／FAXは任意、半角数字とハイフンのみを受け付ける。括弧・内線を含む自由記入案は不採用。前後空白除去、桁数・ハイフン位置に追加制限をしない既決方針は維持。物件郵便番号の任意化、住所補完、認証用メールの扱いは変更しない。根拠：同日③明答、HSC-019解決。アプリ未変更。

## 2026-10-03 初期送付管理の対象外化（仕様書0.1.70）

印刷と送付はHSが行い、初期システムは書類別送付先・複数宛先・発送業務に関与しない。通常の会社／支店住所・連絡先の削除ではない。宛名印刷CSVは未採用の将来候補。根拠：同日オーナー③、HSC-038。アプリ未変更。

## 2026-10-03 確定：保証グループ → 工務店 → 支店

保証グループはHSの営業先を捉える単位で、HSの商品である保証の種類に対応し、所属工務店を包括する。現在3種類、将来追加可能。フランチャイズの親という説明は理解のための比喩であり、法的なフランチャイズ契約を意味すると推定しない。工務店は特定の保証グループに従属し、支店は工務店に従属する。別の「工務店グループ」という分類・マスタは設けない。

新規保証に使う接頭辞は所属保証グループのものを全工務店・全支店で共通使用する。支店独自のグループ上書き・接頭辞設定は不要で、従来の「支店優先／会社標準」を廃止する。既決のグループ別・年度別採番、将来のグループ追加、保証番号の恒久性は、この回答だけで変更しない。

管理画面もこの親子関係に沿って改修する要求を受領。変更案は、保証グループを起点に所属工務店を管理し、工務店から所属支店を管理する構成。工務店の項目名は「標準保証グループ」ではなく「所属保証グループ」、支店には継承元を表示し上書き選択を設けない。別分類としての工務店グループ画面は作らない。細かな画面配置は実装設計事項。

根拠：2026-10-03本Codex会話のオーナーによる定義訂正と画面改修希望。仕様書0.1.67、HSC-037/038。以前の「会社の所属変更後も既存保証は旧グループ／恒久番号を維持」と、今回のグループ内統一の適用範囲を確認する。所属変更の禁止・既存保証の一括移動・番号振り直しは推定で実施しない。旧支店上書きデータの照合・移行とロールバック設計は後続。今回仕様・画面変更案のみで、アプリ・データ契約・配備・実データは変更しない。

## 2026-10-03 確定：工務店・支店の無効化

工務店・支店は削除せず無効化し、新規物件の登録先から除外する。既存物件との関連と保証は保持し、HSは既存保証の訂正・延長・保証書出力・保険報告を継続できる。これは当該保証自体が取消済みの場合の操作制限を解除するものではない。

工務店の無効化は配下の全支店の新規登録も停止する。支店単独の無効化は本店・他支店へ波及しない。再有効化可能だが、工務店を再有効化しても個別に無効化した支店は無効のままとする。親の無効による実効的な停止と支店自身の無効状態を区別する。ポータルのログイン・アカウント停止を自動連動させる判断は今回に含めない。

根拠：2026-10-03本Codex会話の無効化3項目への「すべてYES」。仕様書0.1.67、HSC-038。未実装・未配備。



## 2026-10-03 物件住所の郵便番号（仕様書0.1.54、未実装）

物件／保証情報の郵便番号は任意とする。郵便番号以外の住所必須条件は維持。入力時の書式検証と郵便番号検索機能は残す。今回の文脈を超えて工務店・支店等のマスタへ任意化を拡大しない。コード・配備は未変更。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

## Confirmed HS Branch Exclusion (2026-10-01)

The project owner decided that House Solution branches are unnecessary. The target excludes the HS branch master, responsible-branch entry/editing, list/dashboard columns and filters. Construction-company branches remain separate under HSC-038; existing HS branch IDs must not be reused as company-branch identities. HSC-033 records the decision and pending implementation. Preserve existing data until compatibility/migration and rollback are designed; this documentation change deletes no records.

## Existing Prototype Branch Master — Removal Pending

- House Solution branches are managed as a master with a branch name.
- Each case carries a responsible branch reference. Construction companies, homeowners, and properties do not carry a responsible branch reference.
- A case's responsible branch is editable.
- When a branch-master name changes, existing cases display the new name through their branch reference; a branch name is not stored as a case snapshot.

## Property and Homeowner Address

Property and homeowner addresses are stored in these five parts:

1. Postal code
2. Prefecture
3. Municipality
4. Street/town and number
5. Building name

Postal code accepts seven digits, with an optional hyphen. Normalize the stored value. The adopted lookup source is Japan Post's official nationwide UTF-8 postal-code CSV, transformed into same-origin Firebase Hosting search data; the update command, generated shards, and freshness warning are implemented. Verification and remaining checks are tracked in [TR-009](../design/tr-009-japan-post-postal-data.md).

Postal code, prefecture, municipality, and street/town and number are required. Building name is optional. A homeowner additionally has optional telephone, fax, and notes fields. A nonempty telephone or fax accepts only ASCII digits and hyphens after trimming; no digit-count or separator-position rule applies.

## Construction-Company Address and Contact Details

Construction-company addresses use the same five stored parts as property addresses. Postal code, prefecture, municipality, and street/town and number are required; building name is optional. Telephone, fax, contact person, contact details, and notes are optional. Telephone and fax use the same digits-and-hyphens rule as homeowner contact values; contact person and contact details remain unrestricted free text. The construction-company master does not store an email address; the separately issued construction-company account owns its login email.

The selected postal-data direction covers property, homeowner, and construction-company entry with the same multiple-match, no-match, manual-correction, and failure fallback behavior. Prefecture and municipality are completed from a match, and the town-area becomes the initial value or leading portion of the existing `street/town and number` field. The user appends or corrects chome and lot number in that same field; building name remains a separate manual field. All fields remain editable after candidate selection, and no new persisted address field is added.

## Confirmed Postal-Code Data Direction

- Use Japan Post's official nationwide 「住所の郵便番号（1レコード1行、UTF-8形式）」 CSV. Transform it for search, split by postal-code leading digits or an equivalent bounded shard key, and serve it from Firebase Hosting on the same origin.
- Provide an initial-release manual update command and monthly update check. Record source/basis date, last-check date, generation date, schema version, shard/count/checksum manifest data, and warn administrators when the last check is at least 60 days old. Automatic updates are future scope.
- No runtime external API, API key, billing, quota, App Check, or Google attribution is required. The provider-neutral foundation may remain reusable, but CSV transformation, publication, and freshness operations are not implemented yet.

When one postal code has multiple matching town-area records, the staff member selects a candidate. The lookup populates prefecture, municipality, and the town-area portion of the existing street/town-and-number field; the staff member enters or corrects chome and lot number in that same field, plus the separate building-name field.

The integration must retain manual entry when no address is found or a business/other special postal code is entered. Staff may also correct prefecture and municipality after automatic input. No additional address-validity check runs after automatic input or manual correction; required fields and postal-code normalization still apply.

The future integration must show an address-lookup failure message, retain all existing input, and allow staff to enter or correct the address manually and save it.

## Unresolved-Matter Routing

HSC-017, HSC-018, and HSC-019 are resolved. The remaining implementation and operational work is recorded in TR-009.

## Technical References

- [Japan Post: UTF-8 postal-code data download](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)
- [Japan Post: postal-code data notes](https://www.post.japanpost.jp/service/search/zipcode/download/readme.html)
