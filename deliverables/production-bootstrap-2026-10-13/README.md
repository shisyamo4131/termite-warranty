# Prod初回保守公開のレビュー用成果物

- [通常公開成果物の固定記録](published-release.json)：main `44010df` の既存CI成果物を再配備なしで照合するための非秘密の参照値。bundle digestとrun／artifact IDは[実行証拠](../../docs/operations.md#2026-10-13-main更新による通常prod自動配備)に対応。2026-10-14のGitHub読取りでもID・SHA・repo ID・main・期限内を確認。実行許可や新しい公開候補ではない。[手順・期限・停止条件](../../docs/runbooks/production-bootstrap-review.md#通常公開版の再配備なし照合2026-10-14準備)。

2026-10-13 IAM追加承認後：下記runtime-iam-planは本人承認後に適用・読戻し済み。承認時hashと実確認範囲をJSONへ記録。実認証・配備は未実証。以下の「未適用」は承認前の説明。

- [通常配備IAMの具体案](runtime-iam-plan.json)：2026-10-13後続の未適用設定案。既定build SAのEditor除去、build専用権限、配備custom role、業務DB／Authの操作権限、運用読取りWIF／GitHub environmentと各bindingを記載。65個の異なるcustom permissionは実IAM一覧で対応確認。公開・backup保護変更を含めない。実行承認と読戻し結果は[最新手順](../../docs/runbooks/production-bootstrap-review.md#main自動配備バックアップ環境の完成目標2026-10-13)・[運用記録](../../docs/operations.md#2026-10-13-通常prod配備の実行主体と基盤準備)を参照。

2026-10-13追記：本成果物と全byte一致するmain生成物から保守表示を公開済み。公開版・3ファイル・hash・設定・Web構成のGET照合は一致。公開enableはfalseへ戻し、再公開せず同じ配備SAの独立照合に成功。直後のCI失敗は追加調査でも特定不能のため、本人指示で「公開直後のタイムラグ」扱いとして調査終了（原因未実証）。[現在地・証拠](../../docs/runbooks/production-bootstrap-review.md#初回公開後の状態と読取り再照合2026-10-13)。業務アプリ公開ではない。

2026-10-13、準備のみ。公開・GitHub設定・IAM変更なし。生成元はレビュー基準 `55ff33b57a490a0da6ad2cf38db94c858a722cea` の `scripts/prepare-production-bootstrap.mjs`。対象値は環境仕様と同日の管理API確認に基づく非秘密情報で、実行許可ではない。

- `artifact/public/index.html`：表示は「準備中」「現在は業務利用できません。」のみ。JS・画像・外部通信・ログイン・業務データなし。
- `artifact/firebase.json`：公開ディレクトリはpublic、全pathをindexへ、キャッシュ無効。siteは実行前に検証済みtargetから束縛する。プロジェクトを暗黙に選択しない。
- `artifact/expected.json`：公開HTMLのHosting用hash。アプリ受入れの証明ではない。
- `.gitattributes`：レビュー用artifactの改行をLFへ固定し、Windows checkoutでも生成元と期待hashの一致を保つ。
- `target.json`：9項目の対象照合用。APIキー・個人情報・秘密鍵なし。GitHub変数には未登録。

手順・承認事項・権限案は[Prod手順](../../docs/runbooks/production-bootstrap-review.md#公開準備統合レビュー運用権限案2026-10-13)へ集約。既存の非稼働[workflowテンプレート](../../docs/runbooks/production-bootstrap.workflow.yml.template)はmain push起動＋明示enable方式。設置、対象値登録、enable、公開対象commitをまとめてレビューし、公開直前に本人承認を得る。限定統合の現況は[最新手順](../../docs/runbooks/production-bootstrap-review.md#初回保守公開の限定統合2026-10-13)を参照。統合時は公開enableを未設定とし、公開時には承認revision一致と認証前の成果物照合も必須とする。

公開直前に同revisionの生成物を再照合し、短期認証ライブラリ／Firebase CLI経路の実確認、liveにreleaseなし、対象Webとの一致、進行中の配備なしを確認する。既存公開版があれば初回公開を停止する。公開後のGETでは3ファイル（HTMLとFirebase予約2ファイル）、全hash、配信設定、Web構成、releaseの不変を確認してprovider versionを記録する。HTMLのHTTP本文と表示も確認する。

初回公開には戻す旧版がない。失敗・結果不明時は自動再試行／削除をせず、live/versionを読み戻す。公開停止や別内容への差替えが必要なら操作を提示して別承認を得る。DB・Authユーザー・Functionsはこの公開対象に含めない。
