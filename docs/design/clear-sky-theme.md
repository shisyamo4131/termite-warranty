# Clear Sky Theme

- Status: Approved for the local prototype
- Adopted: 2026-09-11
- Scope: Nuxt/Vuetify local prototype UI only

## Intent

Use a bright, approachable visual system suitable for business administration while retaining the meaning carried by labels, icons, and state text. The theme is implemented through Vuetify tokens and small shared styles, rather than an external admin template or component-specific hard-coded palette.

## Tokens

| Purpose | Value |
| --- | --- |
| Primary | `#3478C7` |
| Secondary / accent | `#55B8D1` |
| Application background | `#F5F9FD` |
| Primary soft surface | `#E7F1FC` |
| Main text | `#26374A` |
| Secondary text | `#65778A` |
| Border | `#DDE7F0` |
| Positive state | `#39956B` |
| Warning / attention | `#D88A32` |

Derived accessibility tokens use `#203040` for keyboard focus outlines and
filled-warning foreground text. This preserves the approved nine-colour base
palette while keeping both indicators above a 3:1 contrast ratio and warning
text above a 4.5:1 contrast ratio on the surfaces used by the prototype.

## 2026-10-05 Alert presentation

Approved by the project owner on 2026-10-05 in PM（白蟻）-07 (task 01a10af9-3ed6-78e0-9642-7c35fd362421), adopting the recommended sample and authorizing Dev Hosting deployment. Existing and future alert declarations inherit compact density, tonal backgrounds and 20px icons from `nuxt.config.ts`. Body and title use 0.875rem text, 1.5 line height, and a 12px icon gap. Existing top/bottom spacing classes use 16px; their direction remains contextual. Information, warning/attention, error and success retain shared theme colours. Use a single-row alert grid so icons and the complete message block share the same vertical centre, including multiline messages and titles. Message types and business behavior are unchanged.

## Input message regions

Do not use `hide-details="auto"` or bound auto values on Vuetify inputs. Leave the message region reserved when empty (`hide-details=false` or the default). Selection-only checkboxes that always hide details remain supported. Allow long messages to wrap rather than clipping them.

Search action buttons beside an input align within a separate region matching the input control height, not the combined control/message height. The property quick-search uses 56px for the default-density control; changing input density must also update the action region. At narrow widths the action group wraps together.

## Application Rules

- Apply theme tokens to the header, navigation drawer, page background, cards, tables, dialogs, inputs, buttons, links, and selected navigation state.
- Preserve warning, error, success, inactive, and terminal-state labels and icons; colour supplements rather than replaces them.
- Interactive controls need a visible keyboard focus indicator and sufficient text/control contrast at desktop and narrow widths.
- The postal-code external API is unrelated to this theme and remains unavailable in the local prototype.

## Verification

### 2026-10-08 カード外観の確認案（未承認・製品未変更）

オーナー希望は画面内カードの影・エレベーションをなくし、グレーの1px枠線にすること。サンプルは枠色#C7CBD1、角丸4px、白い背景で提示する。Clear Skyのアラート・入力メッセージ領域は維持する。ダイアログ本体と内部の情報整理用カードは対象外。

現物のVuetify 3.13.3ではborder=trueがv-card--borderを付け、標準CSSは細い枠と影なしを指定する。しかし本プロジェクトのapp/assets/clear-sky-theme.cssは.v-card:not(.lifecycle-card)で枠と影を上書きしている。Local描画でもborder=trueだけでは現在の青みのある枠と影が残った。採用後は対象カードへ限定したクラスとflat／borderを用い、共通CSSの対象を整理する案。全VCardへの既定値変更ではダイアログまで変わるため、この案では行わない。

| 対象候補 | 現行コンポーネント |
| --- | --- |
| 物件・保証、保証満了案内、保険満了案内、保険報告用一覧、請求用一覧の検索カード・一覧カード | MeetingPrototype.vue（5画面で同じ2宣言を共用） |
| アラート設定、工務店担当者一覧 | MeetingPrototype.vue（各1宣言） |
| 保証グループ・所属工務店・所属支店の3カード | WarrantyOrganizationManagement.vue |
| HS担当者一覧 | StaffAccountManagement.vue |
| バックアップ・復旧の状態カード | RecoveryStatus.vue |
| ログイン、パスワード設定・再設定 | LoginPanel.vue、pages/auth/action.vue |

現在のapp.vue経路にある対象候補は計11宣言。旧ConstructionCompanyPortal／CompanyPortalAccountManagement／CompanyPortalNotificationManagementの画面内カードは別途存在するが、現在の認証済み入口はMeetingPrototype固定であり、今回の適用候補に混ぜない。再利用時に確認する。BusinessDateInputの日付ポップアップ、物件詳細・登録確認・履歴・マスタ編集・アカウント編集・一括取込み等のダイアログと、内部のWarrantyLifecycleDetailsを含むカードは維持する。

この節は対象とサンプルの確認待ちの記録。CSS・Vuetify設定・製品カードの変更はなし。

Verify login, dashboard, master screens, case detail, dialogs, and navigation with the local emulator at both desktop and narrow browser widths. This visual check supplements, rather than replaces, typecheck and build evidence.
