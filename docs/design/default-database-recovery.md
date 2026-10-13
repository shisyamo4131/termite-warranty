# (default)固定の全体復旧設計

## 障害通知からの開始（2026-10-06追加）

実障害通知をDev停止開始の指示として受け、停止可否の再質問をせず対象照合→閉鎖→収束→保全→復旧時点了承→一時復元／検証→完全同期→HS確認→別再開了承へ進む。[正式入口](../runbooks/backup-recovery.md#障害通知からの開始2026-10-06採用)参照。新 `observe` はビルド不要・読み取り専用の状態発見。管理2ファイル照合を正式release verifierへ取り込み、確認した旧同site FINALIZED版を明示して全ファイル証明を維持する。現在live版による自己証明・未知管理ファイルの無条件除外を拒否。通常Read/Write・アプリ・データschemaは変更しない。新停止／実復旧・Prod／Auth取込・緊急閉鎖Dev有効化は今回未実行。

- 状態：2026-10-06オーナー確定方針に基づく設計。固定runtimeとLocal専用同期／回復コマンドを実装し全7Localゲート・独立レビュー済み。Dev配備・移行は未実施。
- 確定：通常業務は常にFirestore `(default)`。別DBは復元・開発側検証の一時領域。必要な再配備を許容。A→B→C→D、Authは必要時だけ別復旧、HS連絡・了承はシステム外。
- 実行境界：今回の指示はDev停止・現行データ削除／上書き・DB削除・IAM変更・配備の実行承認ではない。以下の内部方式は技術設計であり、稼働への反映を完了とは扱わない。
- 関連：[仕様](../specification.md)、[既存設計](backup-recovery-implementation.md)、[手順](../runbooks/backup-recovery.md)、[実測](evidence/recovery-implementation-2026-10-06.md)。この設計は従来の別DBを通常利用する方針を置き換える。旧実装は移行まで残る。

## 現行との差分と制御の役割

| 項目 | 現行実装 | 変更後の設計 |
| --- | --- | --- |
| 業務接続先 | controlのdatabaseIdでブラウザ／Functionsを切替 | ブラウザ／Functionsとも(default)固定。一時DBは開発側コマンドだけ |
| 復元後 | 一時DBをHS確認・通常業務へ昇格 | 一時DBで検証後、完全な業務像を(default)へ反映して再検証 |
| 呼出ごとの確認 | anchor・control runtime・business marker・最後のruntime | anchorと動的DB解決を廃止予定。Functionsはdefault markerを開始／応答直前に照合。更新受付transactionはcontrolも照合 |
| 復旧制御 | 別control DB、default anchor、各DB access marker | control DBを維持する設計。復旧対象外のphase／generation、更新リース、運用ロック、権限・採番保全、処理証拠、バックアップ／Auth情報を保存。default markerはRules用で維持 |
| 設定欠損 | anchorで未有効化fallbackを検知 | 配備設定のcontrol必須化。欠損・別control・未知protocol・marker欠損で利用停止。Localも明示的初期化。設定欠損を通常稼働へfallbackさせない |
| Auth | 別退避、消失復元はLocalのみ | 同じ境界を維持。業務反映ではAuthを変更せず現在権限を保全 |

control DBを残す理由は、反映途中に(default)の業務文書が欠けても開発側の停止状態・保全像・処理記録を失わないため。クライアントアクセスの唯一の公開authorityはdefaultのaccess markerとする。そこにphase／generation／protocolなど非秘密の最小状態を置き、ブラウザは同じdefault markerを監視、Functionsも同じmarkerを読む。controlは運用状態／更新受付リース／証拠を保持する。復元先のDB IDをブラウザの接続指示として公開しない。

Functionsのanchor読取は、旧版との混在がなく、必須control設定・新protocol・marker不在拒否が全呼出に成立した後に除去する。移行中に先にanchorを消さない。新Functionsは(default)のみを解決し、旧clientの世代やprotocolを拒否。markerのcontrol識別子と配備の必須設定も照合する。配備失敗・旧instance残存時はメンテナンスを維持する。制御と公開markerの二つを同時にatomic更新できるとは扱わない。

公開順序：Aはcontrolで新規更新受付を閉じ、default markerを閉じてから収束／保全へ進む。Cは全検証証拠を確定し、controlをverification準備済みへ進めた後、default markerを最後にverificationへ公表する。Dは別の再開了承と完成証拠を確定し、controlを次世代normal準備済みへ進めた後、default markerを最後にnormalへ公表する。各段階でmarkerとcontrolの世代不一致は更新リース取得を拒否する。marker公表前の失敗ではSDK／Functionsとも古い閉じたmarkerが有効。最後のmarker公表transactionにはdefault側の完成checkpointも含める。公表の応答消失は同じ完成checkpoint・marker・controlを読んで成立／未成立を判定し、成功済み遷移を再送しない。C/Dの公開前に準備済み状態を表示や成功報告へ流用しない。

Rulesは別controlを読めないので「両DBが不一致ならすべてのSDKアクセスが必ず閉じる」という保証はしない。C公表は技術検証完成後だけ、D公表は再開了承後だけであり、公表後のprivate記録追記失敗は検証不十分な状態の開放とは区別する。A開始からmarker閉鎖完了までは停止受付／閉鎖途中で、停止完了と報告しない。運用回復は公開authorityと証拠を再照合し、状態不明なら新しい公表を行わない。

現行Functionsの世代チェックと更新リース、Rulesのphase・enabled・所属制御を維持。現行マスタの直接set/updateは世代をRulesで照合していないため、古い画面の要求が再開後に届く経路を追加検証する。設計案は直接更新にも要求世代の認可メタデータを付け、Rulesでaccess markerの世代と比較すること。業務schemaのRules検証を広げず、拒否するのは旧世代の認可要求。削除は要求本文を持てないため、採用する物理削除経路は世代検査するサーバー操作に限定する。フィールド名・全writerの移行は実装設計で確定し、未対応writerを残したまま再開しない。既存画面の再読込だけで拒否保証とは扱わない。

updateの要求世代だけを見ると、旧writerがその項目を省略した際に既存文書の新世代値を継承できる。各要求で新しいnonceを併記し、updateでは認可メタデータも変更されたことを要求する設計とする。旧writerのメタデータ省略・過去nonce再送・過去世代を拒否する回帰試験が必要。フィールド／索引除外と全writer対応は未実装。

## A：停止と保全

1. 対象project／default／control／一時DB／配備版／Rules／所在地／バックアップをその場で確認。通常Devを止める承認と、復旧時点・失われる更新範囲についての外部了承を得る。
2. controlをrecovering・新世代へ変更し、新規更新の受付を停止。defaultのRules markerもrecoveringにしてHS管理者を含む業務閲覧・書込を拒否。Authログイン判定の自己プロフィール読取は業務画面の開放とは別。
3. リースの終了、旧Functions／外部Admin／Console更新・自動処理の停止を確認。直接SDK更新はmarker閉鎖の確定後に取得する像を基準にする。結果不明・滞留リースは期限で削除しない。
4. 現在権限・停止・所属・account bindings、発行番号の上限／再利用防止情報、defaultの反映前像を復旧対象外で保全。秘密／業務本文はリポジトリへ保存しない。破損・不明な権限や採番を過去値で代用しない。

## B：一時DBの復元と検証

管理バックアップ／利用可能なPITR時点を新しい一時DBへ復元。Rulesはクライアント業務アクセス拒否。実復旧時点・非同期処理完了・元像・schema／アプリ互換性を確認。原像と現在権限／採番だけを補正した期待像を分離して記録する。会社・支店等が消失して現在所属を成立させられない場合は自動的に権限を拡大せず停止する。

業務文書、入れ子のサブコレクション、参照、番号の重複／上限、保証履歴、Authとの対応を検査。未知collection／型／孤立サブコレクションは落とさず停止。現在のscanは孤立サブコレクションを拒否するので、未対応構造を成功扱いしない。検証失敗ならCへ進まない。

## C：既存(default)へ完全な期待像を反映

**採る技術設計はDBを削除せず、文書集合を差分で同期する方式。** 管理restore APIは新DBを作る。managed importだけでは復旧像にない既存文書が残るため、全体復旧の完成条件を満たさない。defaultを削除・再作成する公式手順もあるが、今回はDB全削除を前提にしない。

1. 一時DBの検証済み期待像を封印し、source・target・世代・実装版・schema版・外部了承・保全像hashを結合した処理IDを作成。全業務path／型を含むmanifest、対象前像、書込／削除計画を非公開領域へ保持。大きなmanifestをFirestore単一文書へ詰めず、ページ化／非公開オブジェクトと保存世代固定を使う。具体保管先と必要権限は実装前に実環境で確認する。
2. 対象集合はschemaで明示し、サブコレクションを含む。期待像にない対象業務文書は**明示的削除**、同じ文書は書込省略、変更文書はmergeせず完全set。旧フィールドも残さない。子文書のない親削除だけでサブコレクションが消えたとは扱わない。

   削除は深い子から親へ、作成は親から子へ順序を固定する。途中中断でも自身の操作で孤立子を作らない。再開は最終像へのscan成功を前提にせず、封印計画と完了batch／次batchの実状態を照合する。入力時点ですでに孤立子があれば、現行scannerの拒否を維持して別の調査へ止める。
3. `_recovery/*`のmarker／移行中anchor、およびcontrol全体は業務同期から除外。プロフィール・account bindingsは現在保全像を期待像として使用。番号カウンターは保全上限以上、番号予約／再利用防止情報は保全済みの必要情報を維持する。アカウント更新ロック／未知状態は自動削除せず停止。復元像の過去権限をそのまま有効化しない。
4. FirestoreのReference値はDBまで含めて比較。復元元の内部参照だけを(default)の同じpathへ変換し、意図不明な外部project／DB参照は拒否。Timestamp、bytes、GeoPoint、数値等の型を保ち、JSON文字列化で型を壊さない。単にreference.pathだけを比較する現行hashは新経路の完成証拠に流用しない。
5. 小さなbatchごとに計画と期待前状態を照合して適用。対象前像のupdateTime／不存在を条件にし、応答消失時は対象の実状態を再読取する。書込後hashが期待値なら完了扱いにできるが、異なる値なら競合として停止。削除とset、checkpointはできる範囲で同じtransactionにまとめる。DB間の一括atomic処理とは扱わない。

   controlとdefaultをまたぐtransactionは使えない。各batchのdefault側private checkpointを保護された`_recovery`配下に置き、同じdefault transactionでset／deleteと完了記録をcommitする設計。control側進捗は後追いの参照であり、それだけを成功根拠にしない。defaultのmarkerにapply-owner／世代を保持し、各transactionでrecoveringとownerを照合する。回復owner変更時はdefault側にも新しい排他tokenを反映して旧workerを拒否し、両DBのowner不一致では作業・再開を拒否する。計画外の文書を処理しない。
6. 再実行は同じ封印計画・同じ処理ID・停止済み旧worker・回復ownerの排他を要求。何件済んだかだけで先送りせず、応答消失したbatchも期待像と再照合する。一時DB・保全像・schema・版・世代が変われば証拠失効。コピー先を再scanし、文書の集合／型込みhash・余剰0・参照・採番・現在権限／Auth一致を確認する。
7. データ検証だけでなく必要Rules／index／Functions／Hostingの配備一致と索引READY、旧要求拒否、非更新CSVを確認。上記の公開順序に従い、完成証拠→control準備済み→default marker公表でverificationへ進む。HS業務画面の開放はすべての完成ゲート後。一般担当者・工務店は引き続き拒否。

通知outbox、採番・操作receipt等も対象意味を確認する。復元で過去の通知や報告処理が再送・二重更新されないことを検証し、自動配送／TTL／外部workerがdefaultを変更できる場合はC中の停止と再開条件を別に確認する。現在未実装のメール配送を復旧のついでに有効化しない。

## 途中失敗とD

| 失敗点 | 保持する状態と回復 |
| --- | --- |
| A／Bの検証失敗 | メンテナンス維持。default反映なし。原因を直して同じ保全像と許可した復旧時点を再確認 |
| C途中・応答不明 | controlの共通ロック／private計画／batch記録／前像／一時DBを保持。旧worker停止後に専用回復を実行。一般resumeが新intentを解放しない |
| C検証・配備失敗 | HSへ開放せず、コピー完成または配備を修復。対象内容／manifestの不一致なら手動調査 |
| 前像へ戻す必要 | 停止を維持し、別承認した前像復旧を同じ完全同期・再検証で行う。自動で通常状態へ戻さない |
| HS確認で問題 | verificationの書込停止を維持し、必要に応じrecoveringへ戻す。新しい補正後は旧証拠で再開しない |

DではCの(default)検証証拠と別のHS再開了承を確認し、世代を進め、controlを準備してからmarkerを最後にnormalへ公表する。公表前は更新停止を維持し、更新受付は世代の不一致も拒否する。Authを巻き戻さず、現在enabled／role／所属チェックを維持。完了していないCからreopenできない。

## Read／Writeへの影響

- 現行wrapperの通常readはanchor・runtime・marker・最後runtimeで4文書read。固定DB案ではdefault markerを開始／応答直前に読み2readを目標とする。通常mutationは初期marker＋リース取得transactionのcontrol状態の2readが基本。現行のanchor／動的解決に伴うreadを減らす見込み。実測前なので課金削減値を断定しない。
- 更新リースの作成／削除2write、必要な権限・enabled読取、client Rulesのmarker確認は維持する。最後の公開authority確認をcacheだけへ置換しない。新要求世代／nonceメタデータは通常set/updateへ併記する設計で、独立した文書writeは不要。索引対象外とすることを検討する。
- Cの1回の比較はsource N＋target M文書read、完成の再比較も概ねN＋M。反映writeは追加／変更U、削除Dだけで、同じ文書は0write。保全像の取得・PITR／export・権限／参照検査・checkpoint・empty query最低課金・retryは別に増える。概算2(N＋M)は全処理の課金Read総数ではない。
- 今回のDev観測はN=M=54でhash一致。停止後にも一致し型／参照・権限・採番が正しければU=D=0の業務反映が可能。制御marker、配備、バックアップ設定、private証拠のwriteは別に必要。

## 必要な検証と完成条件

Localの全7ゲートと独立レビューを新実装の最終状態で行う。追加・変更・余剰削除・旧field除去・深いsubcollection・孤立親拒否・Reference変換・型保持・unknown schema・現在権限とbindings保持・番号上限／再利用防止を検査。全batch境界の停止／応答消失／checkpoint失敗／worker二重起動／source改変／target競合／再実行を検査する。

Aの新規拒否と収束、HS業務閲覧拒否、旧Callable／旧画面直接更新／オフライン再送拒否、C未完了のreopen拒否、HS確認時の読取・非更新CSV、非管理者拒否、再開後の通常処理を検査。marker欠損／古いprotocolはSDK・Functionsとも拒否。必須配備設定欠損はFunctionsを拒否し、配備混在では再開しない。

private control欠損ではFunctionsの更新受付／復旧操作を拒否する。一方、正常なdefault markerが残る場合、Functionsの読取と直接SDKの認可はその公開markerで判定し、private control欠損を即時検知する保証はない。直接SDK更新も別controlを参照できない。control異常時に業務全体を止める開発側の緊急手順として、default markerを直接recoveringへ閉じる経路を用意し、閉鎖後にSDK／Functions両経路の拒否を確認する。緊急閉鎖後、control復旧・更新収束を確認できるまでB/C/Dへ進まない。正常marker＋control欠損、marker閉鎖の応答消失を検証し、この境界を運用上の停止完了と区別する。緊急閉鎖・control照合コマンドはLocal実装済み。Dev経路は有効化していない。

Devは読み取り事前確認→対象・停止・具体反映計画の承認→停止後の再照合と前像保全→移行→defaultの検証・HS確認→別了承後再開。稼働中の観測を停止後の完成証拠へ読み替えない。managed backup初回生成／その復元、実Auth復元後ログインは独立した未検証ゲートとして残す。

## 現在Devを失わず(default)へ戻す計画

2026-10-06 13:27 JSTまでの読取でproject `termite-warranty-dev`、control `recovery-control`、normal／generation 4、active `recovery-drill-20261006`を確認。activeとdefaultは各54文書、同じ既存hash、業務文書で03:54:00Zより後のupdateTimeは0件。本文・個人情報を保存していない。defaultは旧retired状態であり、hash一致だけで利用を再開しない。稼働中の比較は同一transactionではない。

1. 新方式をLocal実装・試験し、具体的な配備対象／版と復旧・回復コマンドを準備する。現行cutoverをdefaultへ無理に流用しない。
2. 承認対象を提示：通常Devの停止時間、現activeのrecovering化、defaultのmarker更新、必要Functions／Hosting／Rules／index配備、defaultバックアップ予定と監視先の確認、sourceのretired化。データ反映は停止後の実差分に限定する。DB削除・Auth変更・通知試験は含めない。
3. 停止・収束後の**最新active像を正**として両DBの型込み内容・現在権限・採番を照合し、再開後の変更を落とさない。履歴時点11:42へ戻す移行ではない。一致なら業務文書のset/deleteなし。差があれば追加／変更／削除件数と範囲を提示し、具体反映の承認まで停止したまま待つか、別了承した安全な中止手順を使う。今回の観測0差分から将来の上書き承認を推定しない。
4. 配備・marker／control移行は世代を進め、旧sourceは業務アクセスを拒否。default verificationでHS管理者が確認し、別の再開了承後normalへ。defaultのPITR／日次予定と監視を確認する。旧sourceの設定／バックアップを勝手に外さない。

一時DB／旧DB／前像・manifestは、defaultの完全検証、HS確認と再開、原因調査、監査可能な復旧証拠、defaultの保護設定確認を終えるまで保持する。それらを満たしても**削除は対象名・失われる証拠・保存先・保持期限を提示して別承認後**。自動削除・固定日数の推定はしない。

## 根拠と未確定境界

確定方針・A〜D・実Devの非包括承認は2026-10-06のオーナー指示。技術詳細は上記設計として記録し、実装済みと区別する。必要な環境識別子・保管先・権限・停止日時は実行直前に確認する。これら以外の合意済み方針を再質問しない。

- [restore API](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases/restore)：既存DBへの全置換APIではない。
- [export/import](https://firebase.google.com/docs/firestore/manage-data/export-import)：import対象外の既存文書は残る。
- [in-place restore](https://firebase.google.com/docs/firestore/restore-in-place)：同名復元は元DB削除と新DB作成で実現する別の手順。
- [文書削除](https://firebase.google.com/docs/firestore/manage-data/delete-data)：親文書の削除だけではsubcollectionが消えない。


## 2026-10-06 固定(default)方式のLocal実装状況

固定runtime／ブラウザはprotocol 2・(default)固定。公開authorityはdefaultの`_recovery/access`、controlはprivate運用状態／リース／保全証拠。新runtimeではanchorを読まない。旧anchorとcontrol Rulesの旧public getはDev移行互換として残し、新clientは利用しない。

Localで実SDKを使う同期／回復基盤は全7Localゲート・独立レビュー済み。続行で`scripts/default-recovery.mjs`に明示的なDev読取・実行ガードとRules／index READY／Functions source・Run／Hosting一致の検査を追加し、最終Local全7ゲート・独立レビュー済み。通常Devの再停止・配備・切り戻しは未実施で、具体的な実行承認も未取得。Dev実行flagsを人の承認の代用にしない。

計画はprivate controlの`defaultRecoveryPlans/{id}`、items／preimageに封印。全対象前像を保存し、型付きJSONを文字列で保持してFirestoreにReferenceを再解釈させない。SDKのReferenceデコードはDB識別を失うため、snapshotのraw `_fieldsProto`からqualified referenceを確認する（インストール済みSDK依存、更新時に再検証）。安全整数外・整数値double・未知型は停止する。Bの新receiptにはtypedHashを保存し、旧hashだけの証拠はCへ無効。

同じ業務文書は0write。余剰は子から明示削除、作成は親から、変更はmergeなしset。現在のstaff／companyプロフィール・bindings・番号予約を保全し、カウンターは現在上限を下回らない。対象100,000文書、private item／preimageの型付き内容700KB予算を超えれば停止する。未知collection・孤立業務子も停止。private `_recovery`は業務探索自体から除外する。

文書変更とdefault checkpointは同一transaction。再実行は封印計画・停止済み旧worker・照合ownerを要求。封印だけが中断した計画は、未反映／前像一致を確認してabortedとして保全し、新IDで計画する。C公表は生成世代、DはCの公表世代とcheckpointに結合。公表応答消失は完成checkpointで照合し、正常再開後の正当な業務更新を巻き戻さない。自動rollback／DB削除はない。

通常Functions読取はdefault markerを開始／応答直前の2回取得。anchor／動的DB／閲覧リースを省く。実課金削減は未測定。Cでは繰返しscan、権限検査、private前像／計画／checkpointのRead/Writeが必要で、N＋Mが総課金Readではない。

残件：実Dev配備の実照合、停止前後の再観測・具体差分承認、移行／Dev受入／HS確認と別再開了承、default保護設定の再確認。全batch境界の網羅的fault injection、大容量／実課金測定、実managed backup復元、実Auth復元後ログインは未検証。旧／一時DB・前像の削除は別承認。Authの承認済み区切りは変更しない。


### Dev再確認と実行候補（まだ承認／実行していない）

2026-10-06 14:08:45 JST、読取のみでproject `termite-warranty-dev`／control `recovery-control`／normal generation 4／source `recovery-drill-20261006`を再確認。source/default各54文書、型付きhashは両方`85436d953ae39c56c5dfaa64235467b48728394839e535a4ada7c16cb8a21400`、参照をdefault向けに正規化したset 0／delete 0、現在権限一致、activeOperations 0／operator lockなし。記録済み再開時刻03:54:00Z以降の業務updateTimeは0件。これは稼働中の非atomic比較であり、停止後の封印像ではない。

実行対象は同projectのsource/default/controlだけ。現在のsource像を正とし、11:42の過去像へ戻さない。操作候補は以下で、実実行ラッパー／配備確認を準備してから停止日時と対象を提示し承認を得る。

1. 現在版・Rules・indexes・保護設定・Functionsの呼出設定とrollback版を読取保全。利用中sourceの更新受付とmarkerを閉じ、HS管理者も業務アクセス不可にし、全worker／更新リースの収束を確認する。
2. 停止後の最新source/default、現在権限／bindings／採番／番号予約と全前像を封印。比較一致なら業務set/deleteは0。差があれば件数・範囲を提示し、具体反映の別承認まで維持する。稼働中0差分を将来の上書き許可としない。
3. `(default)`に新Rules／indexes、既存全Functionsに固定runtime、Hostingに固定clientを反映する計画。`RECOVERY_CONTROL_DATABASE=recovery-control`必須。index READY／Functionsの完成revision・配信traffic／公開Hostingの版一致／旧要求拒否を確認。実行中の旧更新はリース等で別に収束確認し、管理APIのtrafficだけで全instance停止と断定しない。firestore-control.rulesと旧anchorはこの移行では勝手に削除しない。
4. defaultとcontrolをprotocol 2／recoveringの同世代へ移し、承認済み差分計画だけを適用。完成検証と配備検証後、sourceをretiredに保全し、defaultのHS読み取り専用／非更新CSV確認へ進む。default PITR／日次予定／監視を再確認する。
5. HS確認とシステム外の別再開了承後にdefault normalを公表。全段階の失敗では停止維持。旧source、一時DB、全前像・計画は残す。Auth、IAM、DB削除は対象外。コピー前の移行中止、コピー後の前像復旧、旧版への配備差戻しも具体対象を照合し別承認する。自動正常再開はしない。

旧source→defaultのLocal移行予行も追加し、最新像・現在権限／採番保持・書込後応答消失の再実行・C/D・旧source保持を確認した。同値0writeの実Dev移行、切替前の全境界・実配備混在／失敗は未検証で、実Dev手順の完成前に確認する。

### 続行：実配備照合と中断境界

2026-10-06オーナーは「どんどん進めてください。私が検証すべきものが発生した時点で停止。報告とともに手順を提示」と指示。Local実装・検証とDev読取準備を続行する。先の具体対象承認を要するDev停止・反映・配備の境界は撤回されていない。

14:23:53 JSTのDev再観測でもsource/defaultは各54文書、型付きhash／正規化差分／現在権限／採番上限は上記14:08と一致。再開後の業務updateTimeは0件、更新リース0件、運用lockなし。14:28:53の管理API読取ではFunctionsは18件すべてACTIVE・control設定一致・source保存世代あり、Hostingの実サイトは`termite-warranty-dev`。ACTIVEだけを新方式の配備成功と判断しない。

Local実装した実配備照合は、コミット済み実HEAD／runtimeソースclean、DB ID／所在地／phase／世代、default/control Rulesの本文一致、READY複合indexと単項目除外を別々に判定する。Functionsは保存世代を固定した実source archiveをメモリ内で読み、対象ソース／domain／packageを比較し、全関数とCloud Runの完成revision／trafficを照合する。Hostingはlive releaseの構成／確定version／全ファイルのgzip SHA256をローカル成果物と比較する。資格情報・環境変数の秘密・archive本文はログやrepositoryへ出さない。未知の形式や一部失敗ではreadyとしない。実配備照合のReadは運用時の管理API／source object取得であり、通常画面のFirestore取得へ追加しない。

配備照合からC/D公表までは、他の配備者・CLI・CIが同じ対象を更新しない排他的な運用区間とする。Functions一覧／Hosting live releaseを終端でも再取得し、照合中の版変更は拒否する。それでも複数クラウドサービスのatomic snapshotではなく、排他的な配備区間と更新収束を組み合わせる。管理APIのrevision／100% trafficは既に実行中の全instance終了を直接証明しない。

Nuxt通常generateのランダムbuildId／生成timestampが公開ファイルの再照合を妨げるため、復旧照合専用profileではbuildIdを実HEAD、既知manifestのtimestampを0へ正規化する。既存の更新検知はidで判定する。通常buildの既定値は維持し、復旧時の実配備用成果物だけを専用Localコマンドで生成する。ビルド環境が異なる場合のbyte一致は推定せず、実ファイル照合の成功を要求する。

移行計画の封印前にもdefault markerの閉鎖phase／世代／controlを検査する。旧形式のretired markerは正の旧世代、固定形式のrecovering markerは同世代・同controlに限定。再実行では封印したpriorまたは正確な閉鎖nextのみ受理し、将来世代や別controlを上書きしない。公表の実環境経路は独立した配備照合callbackの成功を要求する。既にnormal公表が成立した応答消失の収束は完成receiptを照合し、再開後の業務更新を巻き戻さない。

追加試験の完成証拠は[実測記録](evidence/recovery-implementation-2026-10-06.md)へ記録する。実Dev切り戻し・実配備の部分失敗予行は未実施。

### 次のDev実行範囲と利用者確認

実行対象は`termite-warranty-dev`の現在source `recovery-drill-20261006`、`(default)`、`recovery-control`、既存18 Functions、同projectのHosting／Rules／indexes。現在sourceの最新像を正とし、過去の11:42像は使わない。停止前の配備・呼出設定と全前像を保全し、停止後に再比較する。0差分なら業務文書のset/deleteは0。差分が生じていれば内容の範囲と件数を報告し、具体反映承認まで停止を維持する。配備失敗時も停止を維持し、完了済みの配備・marker・checkpointを読取確認して再試行する。旧source／private前像／制御情報／Authを無断で削除・巻戻ししない。

通常Devを止める実行承認を得た後、開発側がCのデータ・配備・権限・旧要求拒否・CSV非更新を検証し、HS確認待ちで停止して以下を利用者へ提示する。未配備の今この操作確認を依頼しない。

1. Devを開き、HS管理者でログイン。HS確認待ちの案内が表示されることを確認する。
2. 物件／保証一覧で既知の保証番号を完全一致検索し、物件・工務店・支店・日付・保証期間が切替前と一致することを確認する。
3. 保険報告用一覧／請求用一覧で対象行を選びCSVを出力し、内容を確認する。報告済み・請求済みへ変更する操作は行わない。
4. 新規登録・編集・報告済み変更等の業務更新が利用できないことを確認する。開発側は同時に文書hash不変を照合する。
5. 確認結果をシステム外で開発側へ知らせる。データ確認OKと通常再開の了承は別に記録し、再開了承前にDへ進まない。


## 2026-10-06 Dev最新実施状態（通常再開済み）

具体的な対象・手順の提示後、オーナーの続行指示でDev停止・最新像保全・既存18 Functions／Hosting／default Rules／indexesの再配備・停止後0差分の場合のdefault移行・開発側検証・HS確認待ちまで承認された。通常再開、差分がある場合の業務上書き／削除、Auth／IAM変更、旧DB削除は対象外。以前の未承認／未実施の記述は準備時点の履歴であり、この最新状態を優先する。

実HEAD `02bf34fa5bdb2112c58642f5c88a24b5b7031ccf`をA〜Dで固定。C公表前はDev停止中、control/defaultはprotocol 2 recovering generation 5だった。停止後のsource/default各54文書・型付きhash一致、業務set/delete 0、現在権限一致・採番上限16を確認。baseline／全前像と計画をprivate保全し、計画 `default-return-20261006-plan1` はapply後verified。既存18 FunctionsとHosting/default Rules/indexesの配備完了。C公表はverification generation 6で成功。HS確認OKと別再開了承後にD公表も成功し、現在default/controlはnormal generation 7、旧sourceは当時retired generation 7として保全し、その後の別cleanup承認により削除済み（下記最新記録参照）。2026-10-06、提示したHS確認手順に対するオーナーの「OKだ」を利用者確認OKとして受領。Dの通常再開は別質問への「YES」了承後に実施し、実runtime/default/control正常とデータ保全を照合済み。配備の公開呼出IAM digestは前後一致。失敗時は停止を維持し、完成checkpointを確認して再実行する。

Hostingのアプリ991ファイルは全一致。Firebase管理の `/__/firebase/init.js` と `/__/firebase/init.json` はビルドに含まれないため、今回だけ旧確定同site版から2hashを取得し、認証済みproject/app設定と公開設定の一致も要求する限定operatorで補足照合する。全993 path/hash/config/live再照合は既存verifierを維持し、除外はしない。公開databaseURLは空文字で、他プロジェクトのURLは拒否。operator追加fixture4件は成功exit 0、実照合は全5項目成功exit 0、独立delta reviewにP1/P2残件なし。canonical CLI単独での管理2ファイル対応は残件。最新結果・SHA・未検証範囲は実測記録へ記載する。


## 2026-10-06 旧復元DBのcleanup完了

オーナーの「不要DBが削除可能なら削除」の独立指示に基づき、Devの `recovery-drill-20261006`（UID固定）だけを削除。全54業務文書がdefaultとprivate plan前像54件に完全一致、孤立/未知metadata/旧DB参照/Functions/Eventarc依存なし、C/D完了/HS確認/保護設定を検証。旧2metadata・DBmetadata/設定/予定・了承・operation・完了記録はprivate control `recoveryRetirements/retire-dev-drill-20261006` に保全し、別cleanup了承まで自動削除しない。旧DB固有PITR履歴と旧日次予定は削除で失われる。全履歴時点を退避したとは扱わない。

実DB一覧は `(default)` と `recovery-control` の2件のみ。defaultは現在の業務用、controlは更新リース・復旧計画/全前像・Auth/backup監視/運用記録用であり削除対象外。旧DB復帰を必要とする場合は保全前像等から新たな一時DB/計画を用意し、既完了のsource DBを要求する旧コマンドを再実行しない。今回のcopy/cleanupの実行wrapperはignored tmpの限定operator、汎用DB削除機能を実装したとは扱わない。

削除要求のLRO完了・source GET404・一覧不在・default/control normal7・journal deleted/lock解放を確認。16:38:28 JSTの最終読取でも業務54文書hash不変、private前像54/metadata2、リース0/lockなし。Auth/IAM/業務像変更なし。helper9試験/構文/独立レビュー/実確認の結果と途中停止/非同期完了は実測記録に記載。managedbackup初回/実復元などの既存未検証は変更しない。
