# Branches and Addresses

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
