# HSC-019: Address and Contact-Field Validation

## 2026-10-03 Resolution — TEL/FAXは現行の文字制限を維持

工務店・支店のTEL/FAXは半角数字とハイフンのみ。括弧・内線等の自由記入への緩和案は採用しない。既決の任意項目・前後空白除去・桁数やハイフン位置を追加制限しない方針は維持する。物件郵便番号は任意、入力時の書式確認と任意の住所補完は維持。住所の追加実在チェックを行わず、ログイン用メールは別の認証項目という既決方針も変更しない。

決定者：プロジェクトオーナー。日付・根拠：2026-10-03本Codex会話③「半角数字とハイフンのみ」。第2回回答の形式チェック不要との相違は今回の明答で解消し、事項を解決扱いとする。仕様書0.1.76、branches-and-addressesへ反映。未コミット・文書のみ。各画面の実装整合性は後続検証で、現行コードがすべて対応済みとは主張しない。

## 2026-10-03 追加確定（未実装）

郵便番号を任意項目とする。今回の物件／保証情報の文脈から物件住所を対象として記録し、工務店・支店等の他マスタへは拡大しない。住所そのものの必須条件は変更しない。入力された郵便番号の書式検証・検索機能を廃止する決定ではない。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.54へ反映。コード・データ契約・配備は未変更。

- Status: Reopened for contact validation; existing behavior retained
- Decision owner: House Solution

## Confirmed Context

Required address parts and postal-code normalization are specified. Telephone, fax, and other optional contact formats are not specified. On 2026-09-13, the project owner confirmed that email is not a construction-company master field; the separately issued construction-company account owns its login email, so master-email validation is no longer part of this matter.

## Resolution

- Decision: Do not perform an additional address-validity check after automatic input or manual correction. Existing required-field and postal-code normalization checks still apply.
- Decision: Optional TEL and FAX accept only ASCII digits and hyphens after surrounding whitespace is removed. A nonempty value containing another character blocks saving. No separator position or digit-count rule is imposed.
- Decision: Email belongs to authentication accounts, not the construction-company master. Account input removes surrounding whitespace, converts to lowercase, and applies only the existing minimal regular-expression check before Firebase Authentication's own acceptance checks.
- Decision: No additional format rule applies to the construction-company contact-person or contact-details free text.
- Decision maker/date: Project owner, 2026-09-14.
- Evidence: Explicit instruction and approval in the current Codex task.
- Promoted to: `docs/specification.md`, master/address requirements, prototype data contract, implementation, and tests.

## Affected Documents

Master requirements, validation logic, UI, migration cleaning, and tests.

## 2026-09-29 Current Checkpoint

Source: [received materials and reported LINE answers](../source-materials.md#2026-09-29-追加回答). Older outgoing questions remain historical snapshots and are not the current send list. The next wording must be reviewed with the project owner before a new PDF or external message.

### 回答・決定の整理

第2回Q11は住所「手入力でよい」、形式チェック「不要」を選択。任意の郵便番号補完の削除依頼とは断定しない。現行のTEL/FAX文字制限とは差分がある。ログイン用メールや必須項目まで無検証にする承認とは扱わない。

### 残る確認（文面はユーザー確認前）

事務担当者が入力できず困る電話・FAX表記の例を確認し、連絡先の入力制限をどこまで緩めるかを整理する。郵便番号補完の現行実装は残し、今回の保証仕様変更では触らない。
