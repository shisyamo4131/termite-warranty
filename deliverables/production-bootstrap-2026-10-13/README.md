# Prod初回保守公開のレビュー用成果物

2026-10-13、準備のみ。公開・GitHub設定・IAM変更なし。生成元はレビュー基準 `55ff33b57a490a0da6ad2cf38db94c858a722cea` の `scripts/prepare-production-bootstrap.mjs`。対象値は環境仕様と同日の管理API確認に基づく非秘密情報で、実行許可ではない。

- `artifact/public/index.html`：表示は「準備中」「現在は業務利用できません。」のみ。JS・画像・外部通信・ログイン・業務データなし。
- `artifact/firebase.json`：公開ディレクトリはpublic、全pathをindexへ、キャッシュ無効。siteは実行前に検証済みtargetから束縛する。プロジェクトを暗黙に選択しない。
- `artifact/expected.json`：公開HTMLのHosting用hash。アプリ受入れの証明ではない。
- `target.json`：9項目の対象照合用。APIキー・個人情報・秘密鍵なし。GitHub変数には未登録。

手順・承認事項・権限案は[Prod手順](../../docs/runbooks/production-bootstrap-review.md#公開準備統合レビュー運用権限案2026-10-13)へ集約。既存の非稼働[workflowテンプレート](../../docs/runbooks/production-bootstrap.workflow.yml.template)はmain push起動＋明示enable方式。設置、対象値登録、enable、公開対象commitをまとめてレビューし、公開直前に本人承認を得る。現状は設置もenableも行わない。

公開直前に同revisionの生成物を再照合し、短期認証ライブラリ／Firebase CLI経路の実確認、liveにreleaseなし、対象Webとの一致、進行中の配備なしを確認する。既存公開版があれば初回公開を停止する。公開後のGETでは3ファイル（HTMLとFirebase予約2ファイル）、全hash、配信設定、Web構成、releaseの不変を確認してprovider versionを記録する。HTMLのHTTP本文と表示も確認する。

初回公開には戻す旧版がない。失敗・結果不明時は自動再試行／削除をせず、live/versionを読み戻す。公開停止や別内容への差替えが必要なら操作を提示して別承認を得る。DB・Authユーザー・Functionsはこの公開対象に含めない。
