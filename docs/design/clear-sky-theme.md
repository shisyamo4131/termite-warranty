# Clear Sky Theme

## 2026-10-12 自社情報の分類カード

自社情報表示はオーナー採用の「分類カード」を使用する。上段に会社・代表者と所在地・連絡先の2カード、下段に全幅の振込先カードを置き、狭幅では1列へ折り返す。この画面のカードはVCardの`border`と`:elevation="0"`による細いグレー枠・影なしとし、対象専用クラスを既存の独自枠・影から除外する。他画面のカード外観は変更しない。編集は上部のボタンから既存共通ダイアログを開く。項目、警告・入力説明、編集権限・保存条件は[確定設計](company-settings-and-document-csv.md#2026-10-12-表示レイアウト分類カードの採用)を維持する。

## 2026-10-10 ダイアログ内カードの枠線・影

オーナーが枠線あり・影なしの見本を採用。物件・保証の編集・詳細と関連する確認／履歴ダイアログ内の情報整理用カードは、VCardの`border`と`:elevation="0"`で細いグレー枠・影なしにする。保証期間、保険の適用・報告状況、満了・案内状況、手続き履歴、登録内容、変更されない情報が対象。共通の独自枠・影の指定から対象カードを除外し、枠色・太さ・影の独自指定は追加しない。ダイアログ外側と一覧・ダッシュボードのカードは対象外。現在の保険期間の青い強調、項目・操作・保存条件は維持する。

## 2026-10-10 変更できない申込日・引渡日の表示

物件・保証詳細の申込日・引渡日も、変更できない場合は入力欄ではなく日付の文字表示とする。申込日は本登録後・取消中、引渡日は既存の訂正制限あり・取消中が対象。引渡日の訂正に必要な手続きの説明は残す。変更可能な場合は従来の入力欄を使用し、変更条件・保存内容は変えない。

## 2026-10-10 物件・保証の変更できない所属表示

オーナーの画面確認指示により、物件・保証の担当工務店・本支店は、本登録後・取消中・担当者の利用範囲により変更できない項目を名称の文字表示とする。本支店コードが確認できる場合は従来どおり名称と併記する。新規・下書きで変更可能な項目は選択欄を維持。処理中・参照取得中という一時的な無効化では表示形式を切り替えない。保存・権限・所属固定条件は変更しない。

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

Do not use `hide-details="auto"` or bound auto values on Vuetify inputs. Leave the message region reserved when empty (`hide-details=false` or the default). Selection-only checkboxes in lists must always hide details (owner instruction, 2026-10-10); validation or confirmation inputs retain their message area. Allow long messages to wrap rather than clipping them.

Search action buttons beside an input align within a separate region matching the input control height, not the combined control/message height. The property quick-search uses 56px for the default-density control; changing input density must also update the action region. At narrow widths the action group wraps together.

## Application Rules

### 2026-10-10 画面タイトルのアイコン

オーナー採用により、現在のDrawerにある10画面のh1左へ、メニューと同じBusinessNavigationIconを表示する。物件・保証、保証満了案内、保険満了案内、保険報告、請求、保証書CSV、組織管理、HS担当者、アラート設定、バックアップ・復旧が対象。既存の20px・文字色継承・装飾扱いを維持し、間隔12px、アイコンは縮めず長いタイトルは折り返す。共通business-page-titleクラスを用い、既存のタイトル文言・文字サイズを変更しない。旧非公開画面・ダイアログは今回の追加対象外。Local改修、Dev未反映。

### 組織管理の一覧領域（2026-10-09 追加指示）

組織ツリーの保証グループはfolder、工務店はbuilding-2のアイコンを表示する。最新の設定を取得するボタンは「無効を含む」の左側へ配置する。組織リストと右側の一覧はそれぞれ残りの画面領域内で独立してスクロールし、Bodyをスクロールさせない。一覧の表見出し・検索・ページ操作は到達可能に保ち、データ取得や保存条件は変更しない。

追加2アイコンは既存メニューと同じLucide配布版・同梱ライセンスを使用する。通常は表の中身だけをスクロールし、狭幅・低高・警告や長い名称で領域が足りない場合には右側領域全体でスクロールして操作を隠さない。

組織リストのPC幅は320px。右一覧の名称検索入力はflex: 0 0 autoとし、縦方向の余白を吸収しない。メッセージ領域と狭幅時の1列配置を維持する。

### 2026-10-09 共通ダイアログ（Dev反映済み）

すべてのv-dialog直下のVCardは`:border="false"`とし、共通CSSでもダイアログ直下カードのborderを0にする。一般の画面内カード・ダイアログ内部カード・影・ツールバーや操作領域の区切り線は変更しない。v-menuの日付入力ポップアップは対象外。

保証グループ・工務店・本支店の利用状態スイッチは「有効」に統一し、無効化の影響・再有効化時の制約を直下の共通warning v-alertにまとめる。操作案内を通常の段落やスイッチの括弧書きへ分散させない。工務店の所属保証グループ、本支店の所属工務店は登録済みなら名称・所属内に文字で常時表示し、新規時だけ選択欄にする。本支店の「所属保証グループ・接頭辞共通・変更不可」案内は表示しない。

保証グループ編集の固定設定は、閉じた「登録時の設定」を展開して文字で確認する。外部キーの名称は必須設定がオンの場合のみ入力欄を表示する。新規登録では固定設定の入力欄を表示する。保存済みデータは表示切替で消去しない。

オーナー採用は「ツールバー＋見出しセクション」。物件・保証編集、保険報告等の一覧詳細、マスタ編集を対象とし、本支店画面だけに限定しない。v-toolbarへ画面名・装飾アイコン・閉じる操作を配置。その下に対象名・識別番号・状態をまとめ、本文は見出し付きセクション、下部は保存／閉じる等の通常操作とする。編集と閲覧の違いを示し、業務一覧詳細は対象期間・当該業務状態を先に表示する。

既存の全項目・入力メッセージ領域・権限・復旧時制限・期間別操作・理由入力・確認手順を保持する。通常画面では本文だけを必要に応じてスクロールさせ、ツールバーと下部操作を到達可能に保つ。物件・保証全体の取消は、同日のオーナー追加採用により本文末尾の「物件・保証全体の取消」専用セクションに赤い枠線ボタンを配置する。保存・閉じるの通常操作とは離し、理由入力と影響確認を維持する。期間ごとの取消は各期間・状態の近くに保持する。

組織管理の「組織ツリー＋共通一覧」と合わせ実装し、Devへ反映済み。[検証結果と確認範囲](../operations.md#2026-10-09-共通ダイアログ組織ツリーdev反映)を参照。保存・取消の業務処理やデータ形式は変更しない。

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

## 2026-10-09 採用済み一覧・詳細・ナビゲーション

5つの画面サンプルをオーナーが全採用。サンプルの簡略化された列や架空状態を製品仕様には持ち込まず、既存の項目・確認操作・権限を維持して配置を適用する。

- 横並びタブを左の業務メニューへ変更。日常業務の物件・保証、サブヘッダー「月次業務」の5一覧、サブヘッダー「その他業務」の管理機能を分け、各項目を常時表示する。狭い幅ではtemporary drawer。工務店担当者は引き続き非表示。ヘッダーの試作Chipを撤去。
- 保険／保証書／請求は選択件数とCSV・状態更新を同じ操作領域に配置。保証書／請求は抽出全体・選択中・今回更新の3種類を表示。要確認行を未処理に誤集計しない。
- 常設の説明はdetailsで開閉できる。エラー、参照失敗、条件変更、復旧制限は隠さない。入力メッセージ領域と共通アラートの規則を維持。
- 表はcompactとし、検索・操作欄を除いた画面の残りの高さに収めて見出しを固定。表の最低高さは128px。メイン領域をヘッダー込みの画面高に制限し、狭い画面や説明展開で収まらないときはメイン領域内でスクロールする。Bodyへはみ出させず、操作欄・警告・ページ送りを切り捨てない。ページ送りは表の下へ。件数が多い場合も20行の表示単位と検索取得範囲は維持。
- 一覧詳細は保証書・請求なら保証期間カード、保険報告なら保険カードを先に表示。物件情報は後段の開閉領域。通常の物件編集フォームは維持。

実装先はMeetingPrototype、WarrantyCertificateManagement、WarrantyLifecycleDetailsと共通CSS。DB形式・ADR・移行なし。差戻しはこれらの配置変更を戻し、検証後Hosting再配備。検証・配備結果はoperationsへ記録する。

業務画面内のv-alertはflex: 0 0 autoとし、余白を吸収して縦に伸ばさない。文章の折返しに必要な高さは保持する。

## 2026-10-09 採用済みメニューアイコン

各業務名の左にLucideの線画を20px・文字との間隔12pxで表示。文字色を継承し、選択時は既存のprimary色。装飾アイコンは読み上げ対象外、業務名と常時表示の3分類は維持する。物件=house、保証満了=calendar-clock、保険満了=shield-alert、保険報告=clipboard-list、請求=receipt-text、保証書=file-badge、組織=network、HS担当者=users-round、アラート=bell-ring、復旧=database-backup。

配布版はnpm registryで確認したlucide-static 1.54.0。https://unpkg.com/lucide-static@1.54.0/icons/ から当該10点のみpublic/icons/lucideへ同梱。stroke-widthのみ提案に合わせ2から1.8へ変更し、同版LICENSEをLICENSE.txtに保持する。表示時の外部通信やnpm依存追加なし。実装はBusinessNavigationIconとMeetingPrototype、余白は共通CSS。
