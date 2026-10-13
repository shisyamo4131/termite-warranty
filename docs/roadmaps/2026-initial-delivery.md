# 2026 Initial-Delivery Roadmap

## 2026-10-13 CI切替準備後の現状

ProdのCI分離・切替条件、初回投入後の会社情報／請求先設定順、実入力チェックリストをLocalで整備。実Cloud・GitHub設定・配備なし。22日までの残工数は推定8〜10時間、23日3〜4時間は別枠。20日・22日の実条件成立を前提に23日構築と月末納品ラインを維持。HS日程は未合意、進捗0%・必須gateは変更なし。[根拠と残件](production-readiness.md)。

2026-10-13後続指示：[Prod準備ロードマップ](production-readiness.md)の初期化・管理者・初回正式投入・固定復旧・バックアップ運用入口をLocal実装・事前検証。実Cloud操作なし。22日までの残工数は11〜14時間（最終CI／実設定・手順レビュー4〜6、HS支援4、事前構築3〜4）へ再見積り。23日の最終配備・確認3〜4時間は別枠。実値・別実行承認・両認証・初回基準版・初期管理者条件が22日までに揃えば、23日構築は条件付きで実現可能。26〜27日保護／正式投入、28日修正、29日HS受入れ、30日納品判定の月末ライン維持。HS日程未定、全体進捗0%は不変。以下は各工程時点の記録。

## 棚卸し時点：2026-10-13 棚卸し後・10月末納品ライン維持

オーナーの後続指示により、[Prod実装箇所の棚卸しと具体手順](../design/production-readiness-inventory-2026-10-13.md)を作成。実装・構築は未着手。月末納品ラインを維持し、10/23構築、10/26〜27保護実証・正式投入、10/28修正、10/29 HS最終受入れ、10/30納品判定／予備日を条件付き目標にする。[現行PDFと前提](../../deliverables/production-schedule-2026-10-05/README.md)。HS試用日・受入日は未合意。

事前準備の見積りは既存コードの再利用・Dev専用処理の除外に基づく28〜40時間＋HS試用支援等4時間＝32〜44時間。10/14〜22に集中作業42時間を確保する前提で上限は2時間超過。認証・CI・初回配備を先に解決し、15日・20日・22日に再判定する。HS試用とProd準備を順次固定した下の11/4〜13試算は現行納期案にしない。達成可能性は条件付きで、Cloud未実証・重大指摘・HS未受入れを解消済みとは扱わない。全体進捗0%、部分加点なし、納品gateは不変。

## 2026-10-13 Prod準備の切分け・日程案更新

オーナーの整理・PDF更新依頼により、[Prod手順](../runbooks/production-bootstrap-review.md)に実環境作成前の準備と実値確定後の工程を整理し、[現行スケジュール](../../deliverables/production-schedule-2026-10-05/README.md)を改訂した。実装・構築は開始していない。HS試験日は本人回答で未定。10月23日は採用済みの環境構築目標として残すが、準備・実値照合・承認が22日までに揃うことが条件。未充足なら構築を延期する。

開発担当1名で作業を重複させない参考案は、棚卸し／設計2日、HS試用2日、修正3〜5日、Prod対応改修・事前検証4〜6日、構築1〜2日、保護実証・投入照合2〜3日、最終確認・引渡し1〜2日の計15〜22営業日。未実測の計画用見積りであり、10/14着手・HS10/16／19実施・情報待ちなし等を仮定した場合だけ11/4〜13が納品・開始判断の参考範囲になる。HS未合意・請求移管等未検証のため確定日ではない。待ち時間中の準備前倒しは実績を確認して再計画する。旧資料の未投入・10/28以降構築案を現行予定として用いない。既存マイルストーンの重み・完了条件・進捗0%は維持する。

## 2026-10-13 全件読取り削減のDev導入完了と次のPM

採用済みの満了案内・保証グループ・本支店／CSV・旧取得終了と延長申込日をDevへ反映し、開発側受入れまで完了。保険検索の442物件整備と業務値不変、配備ソース・公開版・索引、Chrome表示を照合した。[実行結果と制約](../operations.md)。下記の本件Dev禁止・指示待ちは当時の状態。全体納品進捗率は変更しない。

次のPMはオーナー指定のAstra／Mediumで、まず正本・Gitを確認し現在値と残作業を報告する。全件読取り削減の承認済み実装残件はなし。共有store・HS少数アカウント・月別／満了の対象全体取得は維持し、工務店アカウントはポータル展開時、Read／Write再評価は運用後。HSの442物件での試用・業務受入れ、判明事項の修正・再確認、引渡し、10月23日目標のProd事前準備は別途残る。Prodは[段階別計画](../runbooks/production-bootstrap-review.md)が採用済みで実構築未実施。報告依頼だけで新たな実装・配備・データ更新に進まない。

## 2026-10-13 優先1の方式採用・Local改修

HS満了案内の欠落非救済・開始時条件・移行復元制限維持をオーナーが採用し、改修開始を指示。[専用工程](expiry-notice-read-reduction.md)に従いLocal実装・技術検証済み。再試行や専用画面は追加しない。Dev反映は引き続き明示指示待ち。他の全件取得削減の方式まで採用したものではなく、全体進捗加点なし。

## 2026-10-12 全件読み込みの削減を優先要改善事項へ登録

オーナー指示により、棚卸しで確認した不要な全件読み込みを[優先要改善事項](technical-remediation.md#2026-10-12-全件読み込みの削減優先要改善事項)として記録した。保証グループ・本支店の重複確認、CSV取込、担当者一覧、物件検索・満了案内の残存処理を対象に具体設計する。共有storeの必要な取得と保全・移行の全件照合は維持する。方式の採用・改修完了・Dev反映を意味せず、全体進捗への加点なし。

## 2026-10-12 保証延長申込日の仕様確定・改修開始

延長申込日の必須化・請求基準変更・前月末超過の注意・理由任意は確定済み。[専用工程](expiry-notice-read-reduction.md#保証延長改修の工程)の通常操作・移行処理のLocal実装、技術検証、常用Localの復元照合まで完了。Dev読取棚卸しでは442物件・延長0件で、現時点の補完対象はない。Localの旧延長1件は実日付不明のまま保持する。オーナー受入れ、導入直前の再棚卸し、HSC-010台帳への反映は残る。Dev反映は明示指示まで禁止。全体進捗への加点なし。

## 2026-10-12 保険満了案内の実装開始

保証のLocal受入れ完了をオーナーが表明。保険の読取り削減もLocal実装・補完試験・技術検証・常用Local復元照合まで完了。[専用ロードマップ](expiry-notice-read-reduction.md)で管理する。延長申込日の改修は上節の別工程として仕様確定・Local検証済みであり、保険補完の完了とは分ける。オーナー受入れとDevへの明示指示は残る。既存マイルストーンへの進捗加点なし。

## 2026-10-12 現在の残作業と次の確認

保証・保険満了案内の読取り削減、延長申込日改修と移行処理はLocal実装・技術検証・保全復帰済み。[専用ロードマップ](expiry-notice-read-reduction.md)で、オーナー受入れとDev反映指示待ちを分けて管理する。以下のHS試用等の残作業を完了扱いにはしない。

月別3一覧の実装・包括検証・Dev反映とLocal保全／復帰は完了。同日後続のオーナー指示で、主担当がChromeの3一覧・月切替・選択解除・処理済み再出力と実CSV6ファイルを確認した。[確認範囲・クエリ調査](../operations.md#2026-10-12-月別3一覧のchrome確認とクエリ調査)。次はHSによる442物件での試用・受入れ、結果の修正・再確認、最終引渡し、その後のProd準備。更新操作や存在しない実データ条件の追加試験はしておらず、HSの受入れ完了とは扱わない。保証グループの請求先8項目は受入れ済みであり、再承認を求めない。グループ最大保証期間はHSC-043の検討事項で、実装未承認。ログイン通信エラーはHSC-041で継続観察する。Word差込み／印刷確認、帳票本体の生成、利用説明資料等の後発扱いは維持する。

次のPMタスクの最初の作業は、正本と最新記録を読み直して残作業を再提示すること。2026-10-12のオーナー指示により、明示的な指示がない限りサブエージェントを利用しない。以前の「実装・検証・配備はMediumサブエージェント」という継続指示は、今後の自動的な委任の根拠にしない。残作業の再提示だけを理由に、実装・検査・Dev操作・Local停止を開始しない。

## 2026-10-12 月別3一覧の抽出方式変更

HSC-042のオーナー決定により、指定年月の前月を基準に、通常は過去未処理を含み、「済みを含める」では前月だけの未処理・処理済みを扱う。設計・実装・包括検証・検索項目補完・Dev反映・公開版照合は完了。開発側のChrome操作とCSV6ファイルの確認も同日の後続作業で完了し、HS受入れは未完了。[実装設計](../design/monthly-queries.md#2026-10-12-実装設計と導入手順)と[運用記録](../operations.md#2026-10-12-月別3一覧のchrome確認とクエリ調査)へ状態・証拠を集約する。既存マイルストーンの重み・進捗値は変更しない。グループ最大保証期間はHSC-043で検討し、今回の実装範囲に加えない。

## 2026-10-12 会社設定・請求先・正式CSVの仕様確定

追加指示：保証グループの請求先8項目はオーナーによるDev受入れOK。自社情報は振込先5項目・編集ダイアログの改修を追加し、表示レイアウトは3案の提示後に「分類カード」を採用した。保証書CSVはボタン表記を簡略化し、期間別の再出力をLocalで利用者が確認できるようにする。実装・配備・検証は[運用記録](../operations.md)で区別する。部分受入れを納品全体の完了へ広げない。

オーナーが[確定設計](../design/company-settings-and-document-csv.md)を採用。自社10項目、保証グループごとの請求先8項目、保証書CSV共通21列、再出力の期間対応、再取込み時の設定保全が追加対象。請求CSV11列、請求書本体/印刷の後発扱いは維持する。旧記録の「正式列未確定」は現在の設計待ち事項ではない。

| 工程 | 完了条件 | 現在の状態 |
| --- | --- | --- |
| 設計確定 | 項目・権限・列順・日付・互換/保全条件のオーナー採用 | 採用済み、関連仕様へ反映 |
| 実装 | 画面/保存、工務店向け返却制限、21列CSV、復旧/再取込み保全 | 同日の開始指示により実装済み |
| 検証・提供 | 確定設計の確認項目、選定ゲート、レビュー、承認済み環境への配備と受入 | [実行記録](../operations.md#2026-10-12-会社設定請求先保証書csvの実装とdev反映)で検証・配備・HS受入を区別 |

仕様確定だけで製品実装・Dev提供・納品受入の完了条件を満たしたとはしない。既存の提供マイルストーンの重みや進捗値を変更せず、実装開始時に該当工程へ組み込む。自動バックアップ・Prod構築・請求書生成の開始承認へ広げない。

## 2026-10-10 過去物件のDev投入・確認用公開

所属回答・原資料訂正・採番照合・予行を経て、Devをアカウント保持で初期化し442物件を投入、全件照合・確認用公開後、別了承で通常再開まで完了。[専用ロードマップ](historical-property-intake.md)のHI-01〜06完了。代表画面・各CSV・架空1件の操作・採番・実442件不変・処理ログを確認。次はHS試験運用、最終引渡し。Prod構築は未実施。下記の回答待ち・Dev未投入は過去時点の記録であり、現在の回答待ちではない。提供マイルストーンの完了条件は変えず、全体進捗を加点しない。

## 2026-10-09 HS回答と共通ダイアログの採用

SHSのS-01〜03を仕様へ確定反映。UHは4桁-2桁・札幌の区別を確認したが、新一覧の重複50組と過去物件対応、SHS竹原の現存名対応が残る。[専用ロードマップ](historical-property-intake.md)で継続管理する。旧「保留4件」は現在の回答待ち内訳ではない。実投入・HS試験の加点なし。

共通ダイアログの「ツールバー＋見出しセクション」を採用済みとして[画面契約](../design/clear-sky-theme.md)へ反映。物件・保証全体取消の本文末尾配置も追加採用され、組織ツリー案と合わせ改修・検証へ着手。共通ダイアログ・組織ツリーはDev反映と実画面確認まで実施済み（[検証範囲](../operations.md#2026-10-09-共通ダイアログ組織ツリーdev反映)）。UH重複全50組の確認PDFも作成済み。HSのコード対応回答・過去物件投入は残り、全体進捗の加点なし。

## 2026-10-09 初期導入メニューとポータルの将来改修

初期導入で使わない工務店担当者タブの非表示をDevへ反映し、管理者の実画面で確認済み。[検証・配備記録](../operations.md#2026-10-09-工務店担当者メニュー非表示dev確認済み)。旧申請の本支店認可漏れは[PORTAL-SEC-01](technical-remediation.md#portal-sec-01-旧申請経路の本支店認可将来対応)として利用再開前の将来改修に保持し、現在は改修しない。全体進捗の加点なし。過去物件取込みのHS回答待ちは継続する。

## 2026-10-09 Dev試験運用を挟む再計画

過去物件取込みの工程別状態と完了条件は[専用ロードマップ](historical-property-intake.md)で管理する。HI-08の引渡し後にProd構築へ接続する。専用ロードマップの作成による進捗加点はない。

10月9日に過去資料442件を受領・点検。Dev初期化・一括投入は未実施。[事前準備・再実行手順](../runbooks/historical-property-intake.md)に沿って進める。HS試験運用は2日。10/13〜15投入・照合、10/16・19試験、10/20〜26修正・再試験、10/27構築直前確認という案へ更新。HS実施日は未合意で、取込条件が10/13までに確定する前提。保存形式変更時は再投入・照合を含め再見積りする。Prodは10/28以降に前工程を満たして開始、稼働日は再設定。HS受入・Prod構築完了や進捗加点ではない。[現行日程案](../../deliverables/production-schedule-2026-10-05/README.md)。

## 2026-10-09 請求・保証書の追加改修

6decdc5でグループ別請求／保証書、未請求の過月抽出、一括請求済み、保証書の住所列・編集取消をDev反映。全7gate・独立レビュー・315件補完・実画面とログ確認済み。[実績](../design/monthly-queries.md#0131-dev配備実画面検証2026-10-09)。HS過去データ投入／試験運用は未実施で進捗加点なし。

## 2026-10-09 保証書CSVの初版実装範囲

正式列の確定を待たず、仮5列と月次一覧・期間別発行状態を初期機能へ追加する。[仕様・導入・検証](../design/warranty-certificates.md)。保証書生成／印刷は後発のまま。8ea12dfでLocal全7gate・独立レビュー・Dev配備／315件補完・実画面／Functionsログを確認。正式列確定、実HS初期データ投入、Prod構築／運用開始はこの完了に含まない。

## Dev実測の反映（2026-10-08）

[300件容量・検索・CSV実測](../design/evidence/prod-readiness-2026-10-08.md)と[月切替12条件・請求CSV・改修後300件プレビュー](../design/monthly-queries.md)を実画面で実施済み。以下の日付付き過去記録の「300件未実施」「月別取得／getAll未実装」はこの範囲で置換。10月9日、2担当者の実画面で採番・二重取込・保存競合の3ケースを確認済み（各2行CSV、Functions処理重複を照合）。実初期規模／多数利用者・長時間・300件同時本登録の負荷、保証書CSV、Prod準備、投入準備データ受領、HS最終受入は残る。全マイルストーン完成ではなく進捗加点なし。


## 2026-10-08 オーナー決定による現在の状態

本番DB選定はFirestoreで解決。現在の開発側作業はDev架空データ容量・検索・CSV検証、Functionsログ計測、現行での不具合再発確認、文書整合。Prod workflowは環境情報が揃ってから、PITR等はProd構築後に設定する。初期登録はオーナーの投入準備データ待ちで保留。保証書出力・印刷品質確認、予算設定、HS向けシステム利用説明資料は後発。以下の旧マイルストーン中、DB再選定・Word印刷互換・説明資料納品前必須を現在のゲートに用いない。実装・検証の実績は技術改修台帳とoperationsへ集約し、全体進捗加点なし。

## 2026-10-08 後発作業：HS向けシステム利用説明資料

資料は後発へ変更。名称はHS向けシステム利用説明資料。[対象と執筆材料](../requirements/user-explanation-items.md)。資料作成・内容確認・提供は未完了。納品前必須とは扱わない。

## 2026-10-08 増分CSVの追加改修

追加の日付対応359b14cは全7Local検証・独立レビュー・Dev反映と正式照合済み。Excelの年／月／日表示を受け付け、原受領値を保全する。添付CSVは支店未登録による全件棄却を確認するためのデータであり、支店追加・Cloud本登録はしない。ユーザー受入は未完了。[日付対応の実測](../design/evidence/increment-import-2026-10-08.md#excel編集csvの日付対応2026-10-08)。進捗加点なし。

増分初回10年、14列、取込み可能グループ制限、グループ別住所／資材名必須条件と任意項目の空欄保存をa9e90e4へ実装。Local全7検証・独立レビュー・Dev19 Functions／Hosting反映と正式配備照合を完了。[実測](../design/evidence/increment-import-2026-10-08.md)、[設計](../design/property-bulk-import.md)、[R2架空CSV受入手順](../../deliverables/dev-import-acceptance-2026-10-08/README.md)。ユーザー受入と300件のDev容量試験は未実施。実HS資料の投入は引き続き保留、HSの日時準備運用は回答待ち。未完了の受入を進捗へ加算しない。

## 2026-10-08 名称統合・一括取込みの受入準備

名称統合6b2573dの全7Local検証・独立レビュー・Dev19 Functions／Hosting反映・正式照合・16件移行と全完成像照合を完了。[実測](../design/evidence/property-name-unification-2026-10-08.md)。架空CSV7本と[ユーザー受入手順](../../deliverables/dev-import-acceptance-2026-10-08/README.md)を準備。実画面／CSV受入・任意300件のDev実行は未完了、HS実資料投入は回答まで保留。既存の全体提供進捗を未実施受入で加点しない。


## 2026-10-07 提供前バックアップ開始を必須作業に追加

Dev取得停止・PITR無効化・取得済み像の削除は[運用記録](../runbooks/backup-recovery.md#2026-10-07-dev自動取得pitrの停止現在の例外)で実行確認済み。Prod提供前に自動取得とPITRを有効化し、初回実取得・通知・復元互換性を確認することを提供ゲートとする。Prod設定・取得開始は未実施であり完了へ加点しない。共通CSV・支店コード・単一住所はLocal全7ゲート／独立レビュー、承認後のDev19 Functions／Hosting反映・16件住所移行・技術検証を完了。住所のHS確認・別通常再開了承でnormal10へ再開済み。追加外部キー改修cbb5859もDev配備／技術検証・UH設定readback済み。共通機能のHS実画面受入・実Cloud容量検証・原資料の実取込みは残る。提供マイルストーンの完了／加点には含めない。[実行証拠](../design/evidence/common-import-address-2026-10-07.md)。

## 2026-10-05 HS共有用の目標日程案

[共有用PDF・生成元](../../deliverables/production-schedule-2026-10-05/README.md)を作成。10/9回答・管理者決定、10/13資料確定、10/16必要機能、10/20本番環境、10/22取込み予行、10/26最終確認、10/28本番初期登録、10/29開始判断、10/30稼働開始を目標とする。HSとの日程合意前であり納期の確約ではない。回答・資料・確認や開発検証の遅延に応じ、後続作業・稼働開始日（納期）も後ろ倒しとして協議・再設定する。工程の完了や進捗の加点を示さず、既存の完了条件は維持する。

## 0.1.99 — 2026-10-04 案内状態・取消配置

カレンダー、報告/請求カード、延長配置はオーナーOK。保証満了案内の状態と操作を直近保証行へ集約し、全体取消を右上の色付きボタンへ変更。Dev Hosting反映・実画面確認済み。全7ゲートexit 0。[記録](../design/evidence/ux-099-2026-10-04.md)。保証上限到達時の保証/保険アラート除外はHSC-036で確認、抽出条件は不変。全体進捗の加点なし。

## 2026-10-04 UX-R追加回答

UX-R01/R06はオーナーOK、日付数値入力もOK。0.1.98でカレンダー配色・報告/請求のカード表示・延長ボタン位置を修正しDev反映・開発側確認済み。[差分受入手順](../runbooks/local-acceptance-2026-10-03.md)、[証跡](../design/evidence/ux-098-2026-10-04.md)。請求年月/未請求管理はHSC-010、保険満了一覧用途はHSC-036で確認。全体進捗の加点なし。

- Status: Active
- Last reconciled: 2026-10-08
- Scope: HS-operated initial release for the new warranty service; target end of October 2026. Exact start date is undecided.
- Progress: 0% — no complete milestone has earned credit. Verified partial work remains recorded below.
- Progress method: Milestone weights total 100%. No partial credit. Documentation consolidation does not earn implementation, deployment, or acceptance credit.

## 2026-10-04 Dev受入担当・延長取消

追加：A01/B05/C11は共同準備後に完了、C12はユーザー指示で保留。U07/U09はユーザーOK。UI/UX指摘を仕様0.1.97としてDev Hostingへ配備し、[開発側確認](../design/evidence/ux-097-2026-10-04.md)完了。ユーザーの差分6項目は再確認待ち。未決請求先単位はHSC-010で後発確認。全体のマイルストーン完了率は変更しない。

A13-R/A15-Rはオーナー合格。後続指示によりCodex単独で進められる残9区分をDevで検証・受入完了。共同操作が必要な4区分と業務・UI/UX受入は残る。CodexがDev機能試験、オーナーが業務一巡・UI/UXを担当する。承認済み保証延長取消と試験範囲は[検証証跡](../design/evidence/extension-undo-dev-2026-10-04.md)。未実行項目は完了にせず、全体マイルストーンの完了判定は据え置く。

## Current Scope and Evidence

The [specification 0.1.90](../specification.md) consolidates the already-approved Q&A; it does not adopt new product scope. The former portal-first, direct-certificate-PDF, optional-handover and multiple-applied-warranty acceptance wording is superseded for initial delivery. The latest instruction authorizes deployment of the independent changes to Dev and makes Dev testing the owner acceptance environment. Production deployment and HS start approval remain separate.

- Initial operators are HS staff. Company portal capability is retained but rollout deferred. HS branches, separate legacy case/product/owner screens and per-submission HS approval are not initial workflow requirements.
- Property/one permanent warranty, group→company→branch, application-date annual numbering, mandatory handover, 10-year extensions and manual 20/30-year cap, notifications, reasoned cancellation/restoration and reporting are confirmed in the specification.
- Initial outputs are CSV. Certificate printing/output is deferred; the dedicated warranty CSV remains unfinished. Invoice calculation, premium management and dispatch remain outside initial scope.
- Initial new-service warranty data is registered by development, then reconciled and approved by HS. This is distinct from excluded legacy FileMaker migration. Used numbers remain reserved, including numbers from excluded ended/cancelled records.
- Existing postal-code, authentication and prototype evidence is retained in [operations](../operations.md), [postal design/evidence](../design/tr-009-japan-post-postal-data.md), and the [prototype evidence](../design/evidence/meeting-prototype-2026-10-01.md). Evidence of partial features is not full initial-release acceptance.
- The independent changes were deployed to Dev and its demo data reset to two retained administrators after explicit approval. Public artifact/auth-boundary verification passed; user acceptance remains pending. See [release/reset evidence](../operations.md#2026-10-03-dev受入用配備と空データ初期化).
- Independent implementation and Dev acceptance are tracked in the [current acceptance runbook](../runbooks/local-acceptance-2026-10-03.md) and [implementation evidence](../design/evidence/independent-implementation-2026-10-03.md). Automated verification is separate from user acceptance; milestone credit remains unchanged.
- The [hierarchy checkpoint](../design/evidence/meeting-prototype-2026-10-01.md#2026-10-03-hierarchy-management-checkpoint) is locally implemented/tested but not deployed or manually accepted as the final product. Subsequent Q&A changes are not covered by those earlier tests.

## Milestones

| ID | Milestone | Planning period | Weight | Completion criteria | Evidence/status |
| --- | --- | --- | ---: | --- | --- |
| M1 | Development prototype aligned to confirmed scope | Prototype phase, revised after presentation | 25% | HS workflow, permanent warranty and numbering, hierarchy, required input, lists, postal lookup and account operations verified locally and available in Dev for review. Deferred portal rollout is not required for credit. Postal maintenance/freshness requirements must be verified, not assumed from lookup availability. | Partial prototype/Dev evidence in operations and linked records; current confirmed scope not fully implemented, no credit |
| M2 | Feedback and defect corrections | After first presentation | 15% | Accepted changes and relevant known defects in the technical-remediation register corrected and verified; no false-empty lists or stale retry flows. | Pending full evidence |
| M3 | Production readiness and release rehearsal | Before production preparation | 25% | Confirmed insurance reporting/undo, guarantee notifications/CSV, initial-import checks, retained-number handling, archive/recovery, role boundaries and selected regression gates verified; complete release rehearsal. | Design/implementation/evidence pending |
| M4 | Production preparation | Before HS start approval | 15% | HS-owned environment and developer access, Firestore configuration and query validation, backup/recovery and operations configuration verified; HS-provided initial data reconciled and approved; initial CSV output compatibility checked; certificate printing deferred. | Not completed |
| M5 | Official production release | End of October 2026 target; exact date pending | 20% | HS operators verify agreed flows and data/results; HS president approves start; rollout/rollback/incident procedure verified; normal registration starts after initial-data acceptance. No legacy FileMaker cutover. | Not completed |

Weights and progress remain 100% total and 0% earned; criteria have been reconciled to prior Q&A approvals, not relaxed to award partial credit. Earlier schedule labels are planning history, not claims of on-time completion.

## Next Work and Completion Boundary

1. Wait for owner-prepared initial data. Do not re-request already received administrator information or deferred Word printing material.
2. Use the [Dev measurement](../design/evidence/prod-readiness-2026-10-08.md) to refine HSC-023 acquisition work. Firestore selection HSC-022 is resolved; prepare Prod workflow after actual environment identifiers are available.
3. Implement confirmed requirements and [technical remediation](technical-remediation.md), with scoped verification under the project policy. Select explicit file ownership and preserve existing worktree changes.
4. Obtain required deployment/data authorizations, verify Dev behavior and then rehearse production preparation. Existing approvals for earlier Dev actions are not a blanket authorization for new destructive work.
5. HS verifies, then the president approves start. Record exact release evidence and only then award applicable milestone credit.

## Unresolved Dependencies

The [sole register](../requirements/house-solution-confirmations.md) contains the current unresolved items. Do not reuse historical counts or resolved DB/name questions.

- HS: insurance removal reporting, cancelled-data retention/deletion, manual 30-year eligibility, initial files and counts/dates, acceptance/start timing, service hours/cost and saved-CSV operations.
- Development: query efficiency, result and export completeness, default-active versus latest-20 behavior, numbering concurrency, insurance cycle boundary/date edge cases, retained undo state, archived-CSV recovery and legacy prototype compatibility.
- Future: portal reopening and its access implications, custom email sender and document recipients/dispatch. Requested later HS group-correction tooling remains a separate requirement; its timing and safe conditions are not fixed.
- Operating cost estimates communicated to HS are not verified budgets or guarantees. Approximate annual 200+ and two concurrent users are owner-supplied planning inputs, not usage caps; cumulative data count must come from the actual initial source.

## Sources and Reporting

Specification, HSC register, decisions, operations and technical-remediation documents remain authoritative for their own scopes. This roadmap is not a second requirements register. Old prototype periods, stale production claims and repeated per-answer zero-progress notes have been removed from this current view; source decision files and Git retain the rationale and historical evidence.

No app, deploy, data-contract, governance or approval boundary was changed by the 2026-10-03 documentation consolidation. The existing physical schema and runtime still need implementation alignment and cannot be inferred from the rewritten milestone text.
