# Case Warranties

## 2026-10-08 増分取込み・入力条件の改修

オーナー承認（2026-10-08、本Codex会話）：一括取込みは毎月受領する増分の新規申込み専用で、全件を引渡日起算の初回10年として本登録する。最長保証期間は将来の延長上限として残す。初回10年が終了した行は全件棄却し、延長済み等の例外は個別対応。登録済み外部キー・ファイル内重複・未知支店コード・不正行が1件でもあれば全件棄却、既存保証番号を持ち込まず全件新規採番する。

保証グループexternalKeyRequiredは作成後変更不可。通常登録では必須グループだけ外部キーを表示し、下書きから必須。任意グループでは非表示、新たなキー入力をサーバーでも拒否する。一括取込み先は有効かつexternalKeyRequired=trueのグループに限定し、サーバーでも再検査する。現在のHSC／SHSは対象外、UHは対象。過去に任意グループへ保存済みのキー・予約は削除／解放せず保全する。

住所addressRequired:boolean、断熱材ありの場合の資材名insulationMaterialsRequired:booleanを保証グループへ追加し、作成後変更不可。通常登録／通常編集／CSVの本登録で同じ設定を使う。断熱材なしでは資材名不要。必須項目を空欄から「不明」へ補完して通さずエラーにする。任意の場合は通常入力・CSVとも空欄を空文字のまま保存する。「不明」の自動補完は行わない（同日オーナー訂正）。既存の「不明」値を今回書き換えない。旧設定未保存のUHは両方false、その他は両方trueとして互換読取りする。既存物件や番号の書換えは行わず、旧キー等の保全を維持。

共通テンプレートは14列：外部キー（＊）／支店コード（＊）／物件名（＊）／施主電話番号／郵便番号／住所／建物名／建築面積（＊）／断熱材あり（＊）／資材名／申込日（＊）／引渡日（＊）／最長保証期間（＊）／備考。住所・資材名は選択グループの設定に応じて必須と案内する。申込日・引渡日は担当者が整えた年月日を入力する。Excelの日付表示であるYYYY/M/D（例2018/4/1、月日各1〜2桁）と従来のYYYY-MM-DDを受け付け、物件の保存・プレビューはYYYY-MM-DDへ統一する。受領元の文字列は保持する。年月のみ・存在しない日・月日年の順・Excelシリアル値は推測せず拒否し、年月初日化／上棟日＋92日のシステム補完は行わない。上棟日・現在保証年数・既存保証番号を削除する。旧17列／旧UH日付補完要求は再取得を案内して拒否し、成功済み操作のstatus／同一内容再確認は保全する。HS側の日時準備運用は打診中であり回答受領済みとしない。

[現在の仕様](../specification.md#2026-10-08-増分一括取込みと保証グループ必須条件)、[共通設計](../design/property-bulk-import.md)。

## 2026-10-08 現在名称は物件名一項目

現在の物件／保証名称はname・表示名「物件名」に統合しownerNameは廃止する。既存の名称が同じ場合だけ旧項目を移行削除し、電話・過去履歴を保持。新しい履歴はnameを記録する。旧ownerName要求は再読込で拒否し、新画面では旧データから旧項目を送信しない。[仕様0.1.127](../specification.md#2026-10-08-物件名施主名を物件名へ統合)、[移行設計](../design/property-name-unification.md)。実装6b2573d・全7Local検証・独立レビュー・Dev19 Functions／Hosting反映・16件移行を完了。ユーザー受入は未実施。[実測](../design/evidence/property-name-unification-2026-10-08.md)。以下の先行「未実装」は準備時点の記録。


## 2026-10-07 通常登録にも外部キーを適用

通常登録・一括取込みを同じ全物件一意の外部キー予約へ統一する。グループの必須設定と表示名を通常入力・詳細・CSV対応説明へ反映し、必須グループは下書きから入力する。保存後のキー変更・取消時の解放は行わず、入力項目を省略する旧要求は既存キーを維持する。発行後は保存された保証グループの設定を使い、工務店の所属変更で必須判定を変えない。[仕様0.1.126](../specification.md#2026-10-07-通常登録の外部キー必須設定表示名)。通常登録へ受領元行を捏造せず、復旧時の取込整合とは区別する。

## 2026-10-07 共通CSVと取込不足情報を確定

一括取込みをUH専用とせず、共通CSVをシステムからダウンロードする。保証グループ／工務店を指定し、既存キー・未知支店等があれば全件棄却、全件本登録、訂正は通常編集。取込みの住所空欄と断熱材ありの資材名空欄は「不明」に補完する。先の保留は解消したが、他の不正値を推測補完しない。物件住所は単一`address`へ統合する。[仕様0.1.125](../specification.md#2026-10-07-共通csv取込み住所統合バックアップ停止を確定)、[実装契約](../design/property-bulk-import.md)。Dev配備・16件住所移行・通常再開を実行済み。追加外部キーcbb5859もDev反映・技術照合済み。実UH資料投入とHS共通機能の実画面受入は未実施。[受入手順](../design/evidence/common-import-address-2026-10-07.md#外部キー改修の受入手順と残件)。

## 2026-10-07 UH新規一括取込みと通常編集を確定

UH一括取込みを実装する要件を採用。お施主様契約Noは全UH物件で一意、取込物件／保証に汎用の外部キーを持たせる。契約Noの先頭4桁と受領加盟店コードが異なっても、それだけで拒否しない。既取込外部キー・未登録支店コードが一つでもあれば全件棄却し、理由を表示する。保証グループ／工務店を指定し、本登録まで一括で行う。既存行の訂正・スキップ・再採番を取込処理で行わない。

UHの取込後の訂正は通常の物件／保証編集画面で行う。内部IDによる受領文書と物件の関連を維持し、外部キーと支店コードを保証番号や恒久IDと混同しない。過去保証番号保持・番号再利用禁止、申込月初日・上棟日＋92日、保険／請求／取消／日付訂正の共通制約、ポータル除外は維持する。住所・断熱材資材名の空欄許可は保留で、現行必須条件の解除ではない。[確定仕様](../specification.md#2026-10-07-uh一括取込みの実装を確定)、[設計と実装前の残条件](../design/uh-integration-import.md)。今回設計準備のみ、未実装・未検証・Dev未反映。

## 2026-10-07 施主名と物件名を一つの名称へ統一

HSから施主名＝物件名との回答があったというオーナー報告を受領し、名称の個別管理を不要とする要件を採用。現行の二つの入力・別々の必須検証・二重表示・独立保存を、導入前に一つの名称へ統一する。既存データの不一致、保存項目と旧画面／要求の互換性、CSV・保証書の対応付け、過去データ取込、名称変更と所有者変更履歴への影響は改修時に検証する。氏名を物件の一意キーとして扱わず、保証番号・内部IDは維持する。

施主電話番号や所有者変更前の履歴は名称の重複管理とは別で、今回の指示による廃止対象にしない。根拠と範囲は[受領記録](source-materials.md#2026-10-07-施主名物件名の回答と導入前改修指示)、[仕様](../specification.md#2026-10-07-物件名と施主名の統一を導入前改修に追加)、着手・完了条件は[改修記録](../roadmaps/technical-remediation.md#2026-10-07-導入前改修物件名と施主名の統一)を参照。記録済み・未実装。

## 2026-10-07 UH一括取込の日付を部分確定

オーナーがGoogleフォーム回答後に採用を明示。UHの一括取込で申込年月しか分からない場合は、その年月の初日（1日）を運用上の申込日とする。上棟日は年月日まで必須で、上棟日に暦日92日を加算した日を算出引渡日・保証開始日・保険開始日として共通期間処理へ渡す。翌日を1日目とし、休日や営業日に応じた調整はしない。旧90日案は撤回し、受領データが92日運用というオーナー報告に合わせる。

算出引渡日は実引渡日を確認済みという意味ではない。HSC/SHSの実日付、UHの上棟日必須、共通の初回保険区間・更新対象月・日付訂正の制約は維持する。申込月初日であることと上棟日の実日付を混同しない。取込実装時には月末・年末・うるう日をまたぐ92日計算、採番年度、受領した算出日との整合、HSC/SHSへの非波及を検証する。これらは未実装・未検証で、今回は仕様記録のみ。

根拠：[オーナーの確定・再確認連絡](source-materials.md#2026-10-07-uh回答に対するオーナーの仕様確定と再確認連絡)。所属とコードは[支店要件](branches-and-addresses.md#2026-10-07-uhの工務店支店と加盟店コード)、UHポータル除外は[外部受付の範囲](external-submission-options.md#2026-10-07-uhの工務店ポータル除外を確定)を参照。内部IDの既決方針、取込全体の未確定条件、最長10年追加の保留は維持する。

## 2026-10-07 内部IDによるUH受領文書の関連付けを採用

契約番号に依存せず、取込文書と共通の物件／保証文書を固定内部IDで紐付ける案をオーナーが明示採用。契約番号は受領項目として保持する対象だが、全UHで一意かは未確認。再送Excelの同一行照合は内部の関連付けとは別の残件。最長年数10の追加はUH管理の確定まで保留し、今回は保証満了案内だけを改修する。訂正前受領情報の全保存は必須ではなく、必要性を検討中。[仕様](../specification.md#2026-10-07-追加指示判定だけ修正uh内部idの関連付け)、[検討資料](../design/uh-integration-proposal-2026-10-06.md)、[ADR0033](../decisions/0033-permanent-property-warranty.md#2026-10-07-uh受領データとの内部idによる関連付け)。物理スキーマ・取込実装・UHの運用開始は未確定・未実施。

## 2026-10-07 UH上棟日の入力条件と共通期間処理

オーナーがUHの上棟日を年月日まで必須と指定。日不明を推測補完する案は採用しない。旧90日案は上記の同日決定により上棟日＋92日へ置き換えた。フォームではHSが今回の保険申込について期間の差を許容と回答しているが、保証発行主体・保険会社の了承取得を明示する証拠は未受領。オーナーによる算出日運用の採用と区別する。UHの過去保険区間、前月に満了する場合の更新報告、起算日訂正の制約は他グループと同じ。UH受領データを別コレクションに保持し、共通物件／保証へ反映する全体方式と確認専用画面は未採用の提案として[検討資料](../design/uh-integration-proposal-2026-10-06.md#2026-10-07-オーナー指摘による訂正と取込構造の検討)に整理。実装・取込なし。

## 2026-10-06 過去物件の建面積

過去物件の建面積は工務店／支店から取得していなかったとのオーナー説明を受領し、初期過去データはHS提供資料の値に従う方針を承認。実面積の再収集は初期取込の前提にしない。導入後の新規物件の建面積取得・入力と既存の必須／形式条件は維持し、全新規物件へ200㎡を自動設定する変更にはしない。根拠：[同日の追加回答](source-materials.md#2026-10-06-読取結果に対するオーナーの追加回答)、[仕様書](../specification.md#2026-10-06-過去物件の建面積の取扱い)。今回文書反映のみ、取込・Dev変更なし。UHの住所・日付・所属・帳票の未確定条件は[HSC-015](house-solution-confirmations/HSC-015-migration-scope-cleaning.md#2026-10-06-補完資料とuhの取込条件)を参照。

## 2026-10-05 取消済みデータの後発削除と全体取消

取消済みデータはCSVをHSファイルサーバーへ保管後、Firestoreから削除可とする後発要件。トリガー・期間・履歴や関連情報の範囲等は未確定。番号再利用は禁止。CSVなし削除案を置換する。全体取消は事前に保険報告を取り消すことを必須にしない現行仕様を再確認し、保険会社への減少報告はHSの外部作業とする。根拠：2026-10-05回答③⑥と追加回答。仕様書0.1.104、HSC-001/035を参照。文書更新のみ、実装・削除なし。

## 2026-10-04 状態遷移レビュー後の追加確定

後続の実装・Dev配備承認に基づく0.1.101の現在地は[検証記録](../design/evidence/lifecycle-101-2026-10-04.md)を参照。保存契約はmeeting-prototype、永続的な判断はADR 0035。

案内済みの対象満了日を照合し、満了日訂正時は未案内へ戻す。初回加入／各延長の対象区間と請求済み／未請求を管理し、延長取消には対象延長の請求済み取消と、延長に依存する保険報告取消を先行させる。初回分を含む有効な報告・請求・延長がなくなれば引渡日訂正可。処理経験だけによる恒久ロックは採用せず履歴を保持する。全体取消は報告・延長・請求の具体的影響を確認させ、履歴を消さず業務対象から除外する。外部訂正はHSの責任範囲。根拠と優先する追加要件は[仕様書](../specification.md)、設計比較は[レビュー](../design/state-transition-review-2026-10-04.md)。

## 2026-10-04 保証延長取消

オーナーが理由付きの直近1回の取消、番号・履歴保持、保険状態不変、取消延長の請求対象除外を採用。現行の確定仕様は[仕様書](../specification.md#2026-10-04-保証延長取消の確定仕様)。0.1.96としてDev配備・実画面検証済み。元の延長イベントを削除せず、取消イベントで対象を参照する。


## 2026-10-04 A15履歴表示

オーナー指示で手続き履歴をボタンから開く別ダイアログへ移動。変更前の申込日・引渡日・保証開始日・満了日等を項目名付きで表示。保存内容・履歴範囲は変更しない。ローカル実装・未配備。

## 2026-10-04 確定変更：同名・同住所判定の廃止

オーナーが本Codex会話で明示指示。HSからの要望ではなく同一物件の定義が未確定のため、同名・同住所候補の照合・注意確認は廃止。保証番号の一意性・二重操作防止・日付注意は維持する。仕様書0.1.93と登録処理・受入手順へ反映。ローカル実装、未配備。以下の2026-10-03重複候補注意の決定を置き換える。

> 2026-10-03全体整理：現行の確定事項は[仕様書0.1.90](../specification.md)に業務別に統合しました。本書の日時付き節は判断の根拠を含み、後の決定で置き換えられた記述があります。旧試作説明・当時の未決欄を現行の実装指示にしないでください。未決管理は[台帳](house-solution-confirmations.md)、配布資料は[資料索引](../../deliverables/meeting-2026-10-03/README.md)を参照します。

## 2026-10-03 重複候補の注意（仕様書0.1.83）

新規登録時、同じ住所・物件名の既存物件があれば候補を示して注意する。HS確認後は登録可能とし同住所別建物等を一律禁止しない。保証番号の一意性・同一操作の二重処理防止は維持する。根拠：同日①YES、HSC-003。照合方式の具体設計・検証は後続、コード未変更。

## 2026-10-03 所有者履歴・再登録時の日付（仕様書0.1.81）

所有者変更では変更前の所有者情報と変更日を履歴保存し、現在情報を更新。保証番号・期間は維持する。所属だけを誤登録した取消・再登録では、元の正しい申込日・引渡日を使い、操作日へ置換しない。保証期間は維持、新番号は正しい所属グループと元の申込年度で採番する。根拠：同日①②、HSC-029解決。実装未変更。

## 2026-10-03 通常の所属移管なし（仕様書0.1.80）

物件を別工務店・支店へ移す運用はない。本登録後の工務店・支店を固定し、誤登録は取消・再登録する。下書き時の選択や工務店マスタ自体の保証グループ変更を禁止する決定ではない。根拠：同日オーナー追加回答、HSC-029。実装未変更。

## 2026-10-03 所属の誤登録対応（仕様書0.1.79）

工務店・支店の誤登録は取消→正しい所属で再登録する。開発側の直接訂正ではない。取消番号は再利用せず、再本登録で新番号を採番する。根拠：同日②への追加回答、HSC-029。実装・実データ未変更。

## 2026-10-03 所有者変更後の保証（仕様書0.1.78）

売買・相続等で所有者が変わっても、同じ物件の保証番号・期間を維持して引き継ぐ。所有者変更だけで新規保証や再採番は行わない。旧所有者の保存・変更履歴は未確定。根拠：同日①YES、HSC-029。実装・実データ変更なし。

## 2026-10-03 申込日の定義と注意表示（仕様書0.1.77）

申込日は工務店の申込書記載日。HS受領・入力日とは区別する。未来日や引渡日より後の日は注意を表示し、HS確認後に登録可能。本登録前の訂正可・本登録後固定を維持し、無効な日付や必須不足は許可しない。過去データの申込月のみ・引渡日空欄はHSが日付を補完して提供する。根拠：同日①②③YES、HSC-003/015。コード未変更。

## 2026-10-03 削除後の延長対応（仕様書0.1.73）

保証終了物件はHS管理者がCSVのファイルサーバー保存を確認して手動削除する。満了時自動削除はしない。削除後の延長申出は保存CSVを開発側へ渡し、元の番号・期間を復元して延長する。HS自身の復元機能は初期対象外。取消済みの期間経過後のCSVなし物理削除案はHS確認待ちで、取消直後の保持・復元可を変更しない。根拠：同日①②YES・③保留、HSC-001。CSVの保持項目と復元手順の設計・検証は後続、実装未変更。

## 2026-10-03 保証終了データの外部保管（仕様書0.1.72）

終了データはCSV出力しHS側ファイルサーバーへ保存後、システムから削除する方針を採用。実行時期・権限・CSV内容・関連データ範囲・取消への適用・削除後の延長対応はHSC-001で確認中。満了後も延長可能な既決方針と整合させる。番号非再利用は維持。今回は文書のみで実装も削除も行わない。根拠：同日オーナー②。

## 2026-10-03 保証書CSVの項目決定（仕様書0.1.71）

HSが使用するWordひな型または差し込み項目一覧を提供してもらい、対応するCSVを作成する。空欄PDF原本の依頼をこの依頼へ置き換える。資料は未受領、項目と印字の確認は後続。根拠：同日オーナー③YES、HSC-037。実装未変更。

## 2026-10-03 初期の保証書出力（仕様書0.1.70）

物件を抽出しCSVを出力、HSがWord差し込み印刷で保証書を作る。システムによる正式保証書PDF生成・空欄PDF受領は初期要件から外す。送付もHSのシステム外業務。CSVの項目・抽出条件はHSC-037で継続確認。現行試作PDF機能は今回変更していない。

## 2026-10-03 確定：所属変更後も既存保証を維持

工務店の所属保証グループを変更しても、既存保証は旧グループ・旧保証番号を保持する。新たに本登録する保証だけが新グループを使用し、支店も所属工務店に従う。例えばHSCからSHSへ移った会社でも、既存HSC保証の延長でSHSへ変更・再採番しない。現在の会社所属と発行済み保証の所属は別に保持する。

根拠：2026-10-03本Codex会話の具体例へのYES。仕様書0.1.68、HSC-037。今回の階層内統一は新規登録時の適用ルールであり、既存保証の一括変更を意味しない。親子管理画面・支店上書き廃止・会社／支店無効化の実装へ進む。配備・実データ移行は別途。



## 2026-10-03 確定：保証グループ → 工務店 → 支店

保証グループはHSの営業先を捉える単位で、HSの商品である保証の種類に対応し、所属工務店を包括する。現在3種類、将来追加可能。フランチャイズの親という説明は理解のための比喩であり、法的なフランチャイズ契約を意味すると推定しない。工務店は特定の保証グループに従属し、支店は工務店に従属する。別の「工務店グループ」という分類・マスタは設けない。

新規保証に使う接頭辞は所属保証グループのものを全工務店・全支店で共通使用する。支店独自のグループ上書き・接頭辞設定は不要で、従来の「支店優先／会社標準」を廃止する。既決のグループ別・年度別採番、将来のグループ追加、保証番号の恒久性は、この回答だけで変更しない。

管理画面もこの親子関係に沿って改修する要求を受領。変更案は、保証グループを起点に所属工務店を管理し、工務店から所属支店を管理する構成。工務店の項目名は「標準保証グループ」ではなく「所属保証グループ」、支店には継承元を表示し上書き選択を設けない。別分類としての工務店グループ画面は作らない。細かな画面配置は実装設計事項。

根拠：2026-10-03本Codex会話のオーナーによる定義訂正と画面改修希望。仕様書0.1.67、HSC-037/038。以前の「会社の所属変更後も既存保証は旧グループ／恒久番号を維持」と、今回のグループ内統一の適用範囲を確認する。所属変更の禁止・既存保証の一括移動・番号振り直しは推定で実施しない。旧支店上書きデータの照合・移行とロールバック設計は後続。今回仕様・画面変更案のみで、アプリ・データ契約・配備・実データは変更しない。



## 2026-10-03 確定：取消中の操作・保険情報・誤登録

取消中の物件／保証は閲覧とHSによる理由付き復元のみ可能とし、内容編集・保証延長・保証書出力を禁止する。満了案内と通常の保険報告対象から除外し、取消済み記録は検索して確認できる。

取消・復元だけでは保険報告状態・保険満了日・保険必須更新年月を変更しない。復元時は保持した情報から報告対象を判定し、新しい保険期間を設定しない。保険会社との訂正で情報変更が必要となる場合の手順は別途整理する。物件／保証の取消と報告済み取消は別操作で、取消中に後者を操作できるという意味ではない。

誤登録・重複登録も理由付きの「取消」に統一し、「無効」を別機能にしない。データ・番号保持、番号非再利用、元の保証期間での復元、HSによる対外連絡という既決方針は維持する。

根拠：2026-10-03本Codex会話の①②③すべてYES。仕様書0.1.66、HSC-035。初期HS運用の確定で、既存旧データのinvalid状態の移行や対外訂正後の保険情報補正手順は未確定。今回文書のみ更新し、アプリ・データ契約・配備は変更しない。



## 2026-10-03 確定：物件／保証の取消と復元

- HSは理由を入力して物件／保証を取り消せる。データと保証番号を保持し、番号は再利用せず、取消済みとして確認できる。
- 誤取消はHSが理由を入力して復元できる。元の保証番号と保証期間を維持し、復元日から期間を数え直さない。
- 保証書発行済み・保険会社報告済みでもHSは取消可能。取消前の確認画面で、交付済み保証書の回収・無効の連絡や保険会社への訂正連絡の要否を確認するよう促す。対外対応はHSが行い、システムから自動連絡しない。保存済み・印刷済みの保証書がシステム取消によって消えるわけではない。

根拠：2026-10-03本Codex会話の①②③へのYES。仕様書0.1.65、HSC-035。初期のHS運用についての確定であり、ポータル再開時の工務店権限を承認するものではない。取消中の操作・一覧表示、保険状態や満了日の保持／復元、取消と誤登録無効化の区別は後続確認。理由を含む記録は必要だが、全操作履歴の形式・保持期間まで決めたものではない。今回文書のみ、アプリ・データ契約・配備は変更しない。



## 2026-10-03 確定：延長時期は制限しない（仕様書0.1.56）

HSは満了前・満了後とも保証を延長でき、手続きの早い・遅いを理由に制限しない。操作日ではなく従来満了日の翌日から10年追加する。例：2036年10月5日満了は、2035年または2036年11月に手続きしても2046年10月5日満了になる。既決の通算20年／30年上限は維持する。保険適用や報告状態の自動変更は本回答に含まない。根拠：同日本Codex会話のYES、HSC-005。仕様記録のみで今回コード・データ契約・配備は未変更。

## 2026-10-03 確定：登録後の保証上限変更

HSは登録後も最長保証期間を20年／30年で変更できる。ただし既に30年まで延長済みの場合は20年へ変更できない。上限の変更だけでは実際の保証期間・満了日を延長せず、10年延長は別操作とする。根拠：2026-10-03本Codex会話のYES。仕様書0.1.55へ反映。既存試作方針を初期運用要件として確認したもので、今回コード・配備・実行検証は行っていない。

## 2026-10-03 保証上限と追加項目（仕様書0.1.54、未実装）

登録時に上限20年／30年を選択し、適用条件の自動判定は行わない。初回は一律10年。物件／保証に基礎断熱材の有無と自由入力の使用資材を追加し、有の場合は使用資材必須。物件住所の郵便番号は任意。具体的データ契約・既存データ移行・実装は後続で、未実装・未配備。

## 2026-10-03 確定：初回保証10年・10年単位の延長

物件／保証登録時の初回保証期間は一律10年。最短10年で、延長は10年単位、通算最長は20年または30年。5年保証の採用検討は今回の対象から外す。保険の5年単位とは区別する。30年を選べる要件・判定方法は本回答では確定していない。試作の10年単位という方針を本番要件として確定したもので、今回コードの改修・配備・実行検証は行っていない。

根拠：2026-10-03本Codex会話のオーナー回答。仕様書0.1.53、case-warranties、HSC-034へ反映。

## 2026-10-03 年度別採番・初期登録（仕様書0.1.52、未実装）

保証番号の一意性を担保するため初期登録は開発側が担当する。初期値は001（0始まりの指示を訂正）、最低3桁の0埋め、4桁以上使用可能、年度切替リセット。グループ別・申込日による年度判定・既存番号保持・延長時番号不変を維持。取込後はグループ・年度別最大値の次から採番し欠番は埋めない。登録済みがなければ001から。必要グループは先行登録し将来追加可能とする。移行検証は後続。現行試作の実装・データ契約・配備は未変更。

## 2026-10-01 デモ確認後の確定変更

申込日は当日を初期値として本登録前に入力・訂正でき、本登録時にその日付で採番年度を決定する。本登録後は変更・消去不可。既存番号は変更しない。番号年度は受領見本どおり2桁を維持。 詳細・互換性は[試作契約](../design/meeting-prototype-2026-10-03.md)。ローカル反映、未配備。

> 2026-10-01 試作改修：オーナーが27項目の実装を承認。今回の実演範囲は[試作仕様・データ契約](../design/meeting-prototype-2026-10-03.md)に集約し、この文書の重複する旧案件・共有アカウント・承認待ち・施主／商品マスタ・取消復元・期間計算の記述に優先する。本番未決事項はHSC台帳に残す。配備・検証結果は運用記録を参照。

## Confirmed Warranty Model (2026-09-29)

Group reassignment adopted on 2026-10-01: company assignment changes apply to new warranties only. Existing warranties keep their assigned group and permanent number on renewal as well. Store the current company assignment separately from each warranty's group. This does not decide retroactive entry/effective dates, correction exceptions or branch assignment precedence (HSC-037). Implementation is pending.

2026-10-01 amendment: company portal users register their own properties/warranties and extend coverage without HS per-submission approval (ADR 0034). New numbering uses the assigned company group, application-date year and continuing group sequence. Extension preserves the permanent number and period history. Assignment-change exceptions, exact number format and eligibility details remain unresolved. Implementation is pending.

- Evidence: project-owner adoption on 2026-09-29 in task `01a0e5c9-ec13-78e0-acd2-62e03f732c95`, following reported HS LINE answers. See [ADR 0033](../decisions/0033-permanent-property-warranty.md).
- A property under warranty management has exactly one individual warranty (`保証`) across cases. Product master entries remain shared definitions, not individually numbered coverage.
- A warranty keeps the same warranty number and identity through renewal. Public numbering format, year/prefix/sequence rules and case-number relationship remain in HSC-004.
- On 2026-10-01 the project owner adopted the application date as the basis for the year in the warranty number, prioritizing the Google Form answer over the conflicting phone report. The fiscal-year boundaries/unification, number format and treatment of a corrected application date after numbering remain open in HSC-004. Renewal still preserves the permanent number. This does not redefine warranty or insurance start dates and is not yet implemented.
- The same warranty owns its initial period and renewal-period history. Its current coverage is extended while prior periods remain readable; renewal does not create another independent warranty or discard history.
- The individual warranty's group distinguishes its certificate form and supports property extraction by group. All group memberships, forms and change rules are not yet settled.
- Insurance (`保険`) number, cardinality, cycle and history are not decided by this warranty approval.
- This is a confirmed product requirement, **not implemented application behavior**. Existing data must not be silently converted. General audit logging, retention duration, renewal confirmation, cancellations and date corrections are not newly decided here.

## Existing Prototype Behavior — Warranty Identity Superseded

The list below describes the unchanged prototype and remains useful for implementation/migration analysis. Its independent warranty-record model is superseded for warranty coverage by the confirmed model above. It must not be used as a second current warranty specification.

- A case is associated with one property.
- A case can contain multiple applied warranty services.
- The same warranty-service product can be added as more than one applied warranty in the same case.
- Each applied warranty belongs to a case and holds a warranty-service product, a positive-integer whole-year warranty period, and a warranty start date. Its warranty-service name is displayed from the master, not stored as a snapshot.
- A case itself does not hold warranty-period or case-wide expiry-date information. Its applied warranties are the source for expiry and alert judgment.
- Calculate an applied warranty's initial expiry date as the day before the anniversary reached by adding its whole-year warranty period to its warranty start date. For a February 29 start date, the expiry date is February 28. Staff can manually correct it without entering a reason.
- If an initial enrolment date is needed, calculate it as the oldest warranty start date among active applied warranties; do not store it on the case.
- An applied warranty preserves its product and period even if the warranty-service master changes later.
- An applied warranty has statuses `active`, `cancelled`, and `invalid`. `cancelled` and `invalid` require a free-text reason, are retained rather than physically deleted, cannot be restored to active, and are not alert eligible.
- A case can remain active even when none of its applied warranties is active.
- Notification status belongs to each applied warranty.
- Initial notification-status choices are `not notified`, `notified`, and `not required`; they may be changed later if operations require it.
- A newly added applied warranty starts with notification status `not notified`.
- An applied warranty's period is fixed after creation and cannot be edited. Its warranty start date is editable; changing it recalculates the expiry date, which staff can then manually correct again.
- A warranty-service master's default positive-integer period change affects only newly added applied warranties; it does not alter existing applied warranties' periods or expiry dates.
- Extend coverage by adding a new applied warranty to the same case. Do not overwrite or replace the existing applied warranty; it remains a historical record with its own status and notification state.
- Initialize an extension warranty's start date to the day after the existing warranty's expiry date. Staff can edit the start date, and the system permits its coverage period to overlap with another applied warranty in the same case.
- Each case-list row links to a separate detail screen at `/cases/{id}`. The screen shows current resolved case masters and every applied warranty's current service name, fixed period, start date, expiry date, notification status, state, and any terminal-state reason. The applied-warranty list displays five records per page and shows pagination when more than five records exist. It provides a link back to the dashboard/list.
- Cancelled and invalid cases remain readable on their detail URL, including their case reason and applied-warranty history, but have no edit action. A missing case ID shows an in-app not-found message and dashboard/list link; a read failure is shown separately.
