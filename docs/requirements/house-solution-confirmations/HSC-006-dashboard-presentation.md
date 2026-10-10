# HSC-006: Dashboard Presentation and Accessibility

## 2026-10-10 再開 — 質疑による仕様整理

- 状態：設計解決（2026-10-10、Q30）。実装開始・移行・配備は未承認。決定者：Project owner。2026-10-10の本Codex会話でロードマップ作成と質疑による仕様整理を指示。下記2026-10-03の判断は当時の初期範囲であり、今回の再開は初期納品の必須化・日程変更・ダッシュボード実装開始を意味しない。
- 工程：[ダッシュボードロードマップ](../../roadmaps/dashboard.md)。有効物件／保証、保険未報告、保証満了案内待ち、未請求の4指標と主要な表示・操作条件を以下の回答で確定。count方式・4指標一括表示更新はQ17で採用。詳細設計はQ30で確定（実装未着手）。
- Q1（回答済み）：満了対象は全満了保証か、既存案内の対応対象か。オーナー回答は「既存の保証満了案内で、対応すべき物件の数（未案内・延長可能・期限超過を含む）」。1物件を1件とし、最長保証年数到達は除外。現行の案内月数・月末計算・取消除外を共用する。表示上の意味は保証満了案内待ち。仕様書・アラート要件に反映、実装未着手。
- Q2（回答済み）：2026-10-10、オーナーがA「今日が保証期間内の物件数」を選択。本登録かつ取消されておらず、日本時間の今日が保証開始日以上・満了日以下の物件を1件と数える。開始前・満了後・取消済み・下書きは除外。仕様書・アラート要件へ反映、実装未着手。
- Q3（Q19で今日基準へ変更）：2026-10-10、保険未報告は当月を基準に初回・更新の未処理物件を数えると確定。Q4で履歴の有無を集計条件にしないことも確定。仕様・要件へ反映、実装未着手。
- 質疑の進め方：同日のオーナー指示により、関連する質問を一度に最大3問まとめる。追加指示「いちいち設計を詰めるための質疑応答を止めないでください」に従い、回答の反映だけで区切らず、既存実装を確認して次に判断が必要な質問まで続ける。未回答を承認扱いにせず、実装禁止は維持する。
- Q4（期間基準はQ19で変更、履歴有無だけで除外しない方針は維持）：2026-10-10オーナー指示「履歴の有無にかかわらず、当月を基準に保険未報告である物件/保証の数」。履歴あり／なしで対象を除外・別集計にせず、当月の報告対象期間に対する未報告状態で物件単位に数える。履歴不足を理由に別の要確認カードを設ける提案は採用しない。既存の報告・取消時の履歴保存を廃止する指示ではない。現行review判定を集計へそのまま流用せず、履歴に依存しない判定と検索用項目をDB-03で設計する。
- Q5（回答済み）：2026-10-10オーナーがAを選択。未請求は物件数で数える。対象となる未請求期間が複数あっても1物件を1件とする。
- Q6（回答済み）：2026-10-10オーナーがAを選択。今月以前の請求対象分に未請求がある物件を数え、将来月分だけが未請求の物件は除外。Q5とともに仕様・要件へ反映、実装未着手。
- Q7（回答済み）：2026-10-10オーナーが全体合計だけを採用。保証グループ増加で画面が煩雑になることを避け、4指標とも全保証グループ合計のみ表示する。グループ別カード・切替は設けない。仕様・要件へ反映。
- Q8（回答済み）：2026-10-10、オーナーの「6. A」は直前に提示したログイン直後の画面への回答として受領。ログイン直後をダッシュボードにする案を採用し、仕様・要件へ反映。実装未着手。
- Q9（回答済み）：2026-10-10オーナーが「すべてA」と回答。保険未報告・保証満了案内待ち・未請求の3カードから対応する業務一覧へ移動する。有効数は表示のみ。
- Q10（Q13で更新）：当初の「画面を開く時の取得」は、共有Storeによる初回のみの取得へ変更。手動更新・更新時刻表示・定期自動更新なしは維持。
- Q11（回答済み）：同回答で、HS担当者全員が閲覧可能とする。管理者限定にしない。工務店ポータルは対象外。
- Q12（Q17で方式採用）：必要時にFirestoreのcountで件数のみ取得し、不足する検索用項目を業務保存と同時に更新する。初版では保存済み集計カウンター・定期集計を設けない案。初期補完・索引・権限／復旧・実測は詳細設計で扱う。
- Q13（回答済み）：2026-10-10オーナーが共有Store＋手動更新の提案に「採用します」と回答。同一アプリ内に件数だけを保持し、初回と手動更新時に取得。再表示は保持値を使う。関連更新後・日月変更時は更新を促す。ログアウト等で破棄、再読込後は初回取得。他利用者の変更検知・サーバー保存は採用範囲外。[ADR 0040](../../decisions/0040-dashboard-session-store.md)、仕様書・要件・ロードマップへ反映、実装未着手。
- Q14（回答済み）：2026-10-10、本Codex会話のオーナー回答「1.『対応優先』」「2. YES」により、5案から対応優先を採用。デザインは5候補から「対応優先」を採用する。PCでは上段に有効件数を横長に置き、その下に保険未報告・保証満了案内待ち・未請求の3カードを横並びにする。狭幅では縦に並べる。タイトル左のアイコン、基準日／月、最終更新時刻、更新ボタンを表示する。更新失敗時は前回の件数と基準日／更新時刻を保持して警告を表示し、初回取得失敗時は0件ではなく「取得できません」と表示する。 仕様書・アラート要件・ADR 0040・ロードマップ・索引・運用資料・changelogへ反映。実装未着手。
- Q15（回答済み・訂正後）：2026-10-10、未請求カードから全体対象一覧を開く案へ一度同意した後、オーナーが「画面遷移だけにしておきましょう」と訂正。最新指示を優先し、既存請求画面への単純遷移・保証グループ指定必須を維持。全体一覧新設案は不採用。
- Q16（Q19により置換済み）：2026-10-10、満了翌月以降の保険未報告を含めるかの質問に「初回・更新とも過去の未報告を含める」と回答。現行の初回除外／更新保持という差をダッシュボード集計へ持ち込まない。仕様・要件・詳細設計・ロードマップへ反映。実際の過月報告操作のガード解除を含む承認ではない。
- Q17（回答済み）：2026-10-10、4指標の件数だけを取得し、4指標すべて成功した時にまとめて更新する方式を採用して詳細設計へ進めるかの確認に、オーナーが「詰めましょう」と回答。Q12のcount方式と一括表示更新を採用。技術詳細の検証・導入と実装指示は別。
- Q18（Q19の採用により単純追加案を進めない）：保証満了後の初回未報告も保険一覧へ表示追加するかを確認。オーナーは「具体的なデータを提示して説明して」と依頼。詳細設計の架空A・B・C例を提示。続くQ19の期間別管理案を先に検討し、一覧への単純追加は確定しない。
- Q19（回答済み）：2026-10-10、オーナーが「推奨案を採用」と回答。期間別の未報告／報告済み／報告不要、不要の理由・担当者・日時、不要取消、次期間への非継承を採用。ダッシュボードは本登録・取消なし・今日が保証期間内で、今日を含む保険期間が未報告の物件数へ変更。終了した期間だけの未報告は含めない。残保証期間等の自動除外条件は未確定のため導入しない。既存記録を推測補完しない。仕様書・保険報告要件・アラート要件・詳細設計・ADR 0041・ロードマップ・運用資料へ反映。実装未着手。
- Q20（表示案採用・取消期限確定）：2026-10-10、オーナーが「現在の期間を強調」案を採用し、「保険期間が過ぎたものは報告不要状態を取り消すことができないようにしたい」と指示。当初は今日を含む期間を先頭の枠で強調し（並び順はQ27で新しい順へ変更）、状態・理由・設定者・日時と対象期間横の操作を表示。過去期間は下に並べる。不要取消は日本時間で終了当日まで、翌日以降は禁止し、状態・理由は残して「期間終了のため取消不可」と表示する。仕様・要件・詳細設計・ADR 0041・ロードマップ・運用記録へ反映。別期間から開く場合等の詳細は設計中。不要設定期限と引渡日訂正はQ21で確定。実装未着手。
- Q21（回答済み・実装未着手）：2026-10-10、実装確認後の提案に対しオーナーが「2. 推奨案を採用」「3. 訂正前に取り消すことを採用」、個別依頼について「その扱いで良い」と回答。報告不要の新規設定も対象保険期間の終了当日までとし、終了後には設定できない。引渡日訂正前には報告不要も取り消す。終了済みの保険期間に報告不要が残る場合は画面から引渡日を訂正できず、必要時は開発側へ個別依頼し影響を確認する。過去の判断を自動削除・別期間へ移し替えしない。説明上の補足：判定対象は保証全体ではなく5年ごとの保険期間であるため、前半5年が終了した時点でもこの制限が生じる。10年以上経過した物件だけの制限ではない。個別依頼の方針はデータ修正の包括承認を意味しない。オーナーの「最低でも10年」という説明は保証全体の満了を指し、今回の5年保険期間の制限とは区別して説明した。続く「それでOK」により、前半5年終了後でも個別対応になる点の了承を確認。仕様・要件・詳細設計・ADR 0041・ロードマップ・運用記録へ反映。既存報告処理を満了後一律禁止にする変更や個別データ修正の実行は未承認。
- Q22（回答済み・採用、2026-10-10）：オーナーが本Codex会話で「採用します。」と回答。報告不要にした期間は保険報告一覧の処理対象から外し、CSV出力・報告済み登録にも含めない。理由の確認・期限内の取消は物件・保証の詳細で行う。対象期間の不要を取り消せば、対象年月など既存の抽出条件を満たす時に一覧へ戻す。物件全体を永久に除外せず、次の保険期間はその期間の状態と対象月で判定する。一覧へ選択不可の不要行を残す代替案は不採用。仕様書・保険報告要件・ダッシュボード要件・詳細設計・ADR 0041・ロードマップ・運用記録・変更履歴へ反映。既存記録の引継ぎと保存形式等は設計中で、実装・移行は未着手。文書差分は未コミット。
- Q23（回答済み・採用、2026-10-10）：オーナーが延長取消の追加ルールに「YES」と回答。保証延長の取消前には、取り消す延長区間内の有効な報告不要を先に取り消す。残る保証区間の報告不要は変更しない。対象の保険期間が終了済みで不要を取り消せない場合は、画面から延長を取り消さず開発側へ個別依頼する。取消済みの不要記録は履歴として保持し、延長取消を妨げない。現行の延長区間の保険報告・請求済み等の事前取消条件も維持する。仕様・要件・ADR 0041・詳細設計・ロードマップ・運用記録・変更履歴へ反映。個別データ修正の包括承認ではなく、実装・移行は未着手。
- Q24（回答済み・採用、2026-10-10）：オーナーが2段階の操作の提案に「YES」と回答。報告済みから報告不要へ変える場合は、既存の報告取消でその期間を未報告へ戻し、その後に理由を入力して報告不要にする2段階の操作とする。直接上書きや自動的な報告取消は設けない。報告・取消履歴と新しい報告から順に取り消す手順を維持し、別期間の不要は変更しない。終了済み期間への不要設定は禁止のままとし、保険会社への訂正連絡は従来どおりHSが別途行う。既存取消の根拠はfunctions/property-warranty.jsのundoReportとMeetingPrototype.vueの確認表示。仕様・要件・ADR 0041・詳細設計・ロードマップ・運用記録・変更履歴へ反映。実装・移行は未着手。
- Q25（回答済み・採用、2026-10-10）：オーナーが開始前でも設定できる案に「YES」と回答。既に登録された保証に含まれる未報告の保険期間は、開始前でも理由付きで個別に報告不要へ設定できる。未延長で保証に含まれない期間には設定しない。終了後の設定禁止と次期間への非継承は維持し、将来期間の不要設定で今日の期間の状態は変更しない。不要設定の可否を月次一覧の選択月には連動させない。現行報告の選択月基準からは決まらない新たな操作条件として確認した。仕様・要件・ADR 0041・詳細設計・ロードマップ・運用記録・変更履歴へ反映。実装・移行は未着手。
- Q26（回答済み・採用、2026-10-10）：架空物件の前半・後半を使った説明後、オーナーが「理解した。推奨案を採用する。」と回答。保険期間別の状態と、連続する未報告期間をまとめた集計用の日付範囲を同じ物件文書に保存し、業務変更時に一緒に更新する。業務上の5年区切りと履歴は維持する。集計用区間は現行の最大6期間に対し最大3つとし、取得時の今日が含まれる物件を1件と数える。日付経過だけで全物件を書き換えず、初回・手動更新時は件数だけを取得する。仕様・要件・ADR 0041・詳細設計・現行保存契約の計画節・ロードマップ・運用記録・変更履歴へ反映。具体的な保存項目・既存変換・索引の実証・旧版互換性と差戻し条件は詳細化する。実装・実データ移行・配備の承認ではない。
- Q27（回答済み・採用、2026-10-10）：オーナーが「保険期間ごとに、下から上へ新しくしていきたいね。それ以外はOK」と回答。全保険期間を開始日が新しい順に上から並べ、開始前の期間も同じ順に含める。今日の期間は先頭へ移さず、その位置で強調する。Q20の「現在の期間を先頭」の配置をこの順序へ更新。その他の画面案（一覧で選んだ期間の目印、期間横の操作、理由・担当者・日時、理由必須と対象期間を再掲した確認、終了済み不要の取消不可、閲覧専用の操作非表示）を採用。仕様書・保険報告要件・ダッシュボード要件・詳細設計・ロードマップ・運用記録・変更履歴へ反映し、会話内の架空画面を更新。実装開始の指示とは区別する。
- Q28（回答済み・採用、2026-10-10）：現行の保険満了案内が保存済みinsuranceExpiryDateだけを見ており、不要期間を飛ばすと意味の変更になることを現行コードと読取レビューで確認。上記3期間の架空例付き提案へオーナーが「推奨案を採用する」と回答。保険満了案内を次の報告準備の一覧へ変更し、不要期間分の予告を出さない。仕様・保険要件・アラート要件・ADR 0041・詳細設計・ロードマップ・運用記録・変更履歴へ反映。従前の用途残件HSC-036にも今回の方針を参照として反映。実装未着手。
- Q29（回答済み・採用、2026-10-10）：初回未報告をダッシュボード／保険報告一覧で扱い、保険満了案内を報告実績がある物件の次の更新準備に絞る提案へ、オーナーが「推奨案を採用する」と回答。初回未報告は保険満了案内へ重ねて表示しない。実績の判定は既存の有効報告（取消済みを除く）とし、全報告を取り消した物件をeverフラグだけで更新扱いにしない。仕様・保険要件・アラート要件・ADR 0041・詳細設計・HSC-036参照・ロードマップ・運用記録・変更履歴へ反映。実装・配備は未着手。
- Q30（回答済み・設計確定、2026-10-10）：オーナーが本Codex会話の最終確認へ「YES」と回答し、以下の詳細設計を採用。採用済みの画面・件数・報告不要の扱いを基に、保存と取消、既存記録の引継ぎ、古い画面の更新拒否、導入・差戻し、作業順と合格条件までまとめた[詳細設計案](../../design/dashboard.md)を確定。実装開始・実データ変換・配備の指示は含めず、引き続き別途待つ。DB-READY-CLOSE／INS-READY-CLOSEで今回の具体化箇所に矛盾なしと確認。実動作・性能・実データは未検証。
- 業務判断の点検（2026-10-10）：読取専用サブエージェントとQ19〜Q25を照合し、現時点で必須の追加業務質問は見つからなかった。理由直接編集や一括操作を新たに追加せず、保存・既存記録の引継ぎ・集計・各更新経路の設計を進める。Q26採用後は引継ぎ・取消と集計条件を再レビューし、別期間の不要を消さない更新、旧処理へ戻す場合の互換性、全対象の変換完了確認を詳細設計へ追記。Q27は別期間表示を採用済み。続く読取点検で保険満了案内の意味の変更が必要と判明し、Q28で用途を採用、Q29で初回未報告の表示範囲を確認。実データ確認や設計レビューで新たな事実が見つかれば、その影響だけを改めて確認する。設計全体の完了判断ではない。
- 説明方針：オーナーの指示により、報告・質問は画面で何が見えるかと具体例を中心にし、技術・専門表現を控える。質問前に現行実装を確認し、既存仕様から判断できる点は根拠と推奨を示す。実装から決まらない新しい判断だけを質問する。
- 設計境界：同日のオーナー指示「実装は設計が完了してから。指示するまで実装しない」に従い、設計完了後も明示の実装指示を待つ。
- 設計案：[dashboard.md](../../design/dashboard.md)。4countと4値一括反映は採用。派生値と復旧・導入を具体化中。保険の期間別状態・画面操作、全writerと導入契約のレビューが残る。
- 次の工程：利用者向けの主要条件は確定。画面・更新仕様は確定。集計方式、遷移先との条件整合、部分取得失敗時の更新単位、具体的な導入・差戻しと試験計画をDB-03の詳細案へ整理済み。Q30で設計全体を確定済み。実装開始・配備の承認は別途。
- 過去のアクションリスト案・列・アクセシビリティ除外案は今回の採用済み仕様ではない。必要な論点だけ再評価する。

## 2026-10-03 Resolution — 初期は試作ベース、ダッシュボードは将来

初期は試作版をベースに必要機能の実装を優先する。ダッシュボード化は将来構想で、直前の「対応対象を集約した初期画面」の提案も今回必須にしない。過去の未採用ダッシュボード案・統計・強調表示案は初期受入条件から外す。既決の満了案内や保険報告の必要機能は維持する。

初期範囲の判断として解決。将来ダッシュボードへ進む際に表示・集計・アクセシビリティ要件を改めて整理する。決定者：オーナー、日付・根拠：2026-10-03本Codex会話①。仕様書0.1.75、alerts-and-dashboardへ反映。未コミット・文書のみ。質疑を終える前に実装開始する新たな指示とは解釈しない。

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

The dashboard lists alert-eligible cases and marks cases with an unnotified applied warranty. Exact presentation limits and emphasis behavior remain open.

## Project Recommendation for Discussion — Not House Solution-Confirmed

### Dashboard purpose and summary

Treat the dashboard as an operational action queue, not as potentially misleading statistics derived from only the latest 20 records. Recommend summary counts for:

- Expired and unresolved renewal.
- Awaiting House Solution review.
- Expiring within 7 days.
- Expiring within 30 days with renewal still unrequested.

Counts should cover the intended actionable dataset or clearly disclose their scope; they must not imply global totals when they are calculated from a limited window. This recommendation depends on the HSC-005 renewal-handling decision and HSC-026 query/performance decisions and does not claim that the current prototype implements it.

### Action list

- Show 20 rows per page with pagination; do not silently truncate the actionable list.
- Recommend columns in this priority: priority, case number, homeowner, property address, construction company, responsible branch, target warranty, expiry date, and renewal-handling status.
- Align pending HSC-005 terminology: `unrequested`, `awaiting company response`, `company draft`, `awaiting HS review`, `needs correction`, `renewed/registered`（更改済み）, and `renewal declined`（更改辞退）.
- Exclude `renewed/registered`（更改済み） and `renewal declined`（更改辞退） items from the default action list, while making them available through a filter or history view.
- Keep the current confirmed one-row-per-case behavior. As a proposal, aggregate child applied-warranty states for the row and link to case detail with the target warranty emphasized; make the portal response reachable where applicable.
- Prioritize rows in this order: expired but unresolved; awaiting House Solution review; within 7 days and unrequested or awaiting company response; then 8–30 days. Use earliest expiry as the tie-breaker.
- Exclude cancelled and invalid cases and cancelled and invalid applied warranties.

### Reduced accessibility boundary for initial release

For the fixed internal-user context, recommend that initial-release acceptance exclude a screen-reader/read-aloud feature, dedicated screen-reader optimization or acceptance, custom arrow-key navigation or keyboard shortcuts, exhaustive keyboard-only workflow acceptance, and formal WCAG 2.2 AA certification. This is a scope recommendation, not a legal conclusion.

Retain this low-cost baseline:

- Do not convey state or priority by color alone; retain readable contrast from the existing theme.
- Use the case number as an ordinary link and pagination as ordinary buttons.
- Provide accessible names for icon-only controls.
- Do not remove browser or component default focus indication.
- Use ordinary semantic table headings.
- Rely on standard browser/Vuetify Tab and Enter behavior without special keyboard UI.

Specific user needs or policy/legal requirements could reopen this boundary.

## Questions（2026-10-03時点の記録。今回の設計確定はQ1〜Q30を参照）

1. Does House Solution accept or revise the dashboard's operational-queue purpose, summary counts, disclosed count scope, 20-row pagination, navigation, and HSC-005/HSC-026 dependencies?
2. Does House Solution accept or revise the proposed columns, child-warranty aggregation, renewal-handling terminology, default exclusions/history filter, and priority order?
3. Does House Solution accept or revise the reduced accessibility boundary and retained baseline, including any specific user, policy, or legal needs that should reopen the scope?

## 2026-10-10 実装確認後の表示変更（採用）

オーナーが「上から下に、区間が古いものから」「保証期間の並び順が上から下だから」と指示し、Dev反映まで承認。Q27の新しい順を置き換え、開始日昇順とする。現在の期間の強調・対象期間の目印・理由・期限・操作可否は維持。同時に一覧の選択専用チェックボックスのメッセージ領域を非表示にする指示を採用。仕様・要件・詳細設計・共通UI・ロードマップ・実装と運用記録へ反映する。既存の本ファイルと台帳差分は同一コーディネーターの承認済み作業で、他項目は保持する。

## Affected Documents

Dashboard requirements, visual design, UI implementation, and acceptance tests.
