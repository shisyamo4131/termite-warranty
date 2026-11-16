# 0052 Functionsの依存をLocalとCloudで固定する

- Status: Accepted; implementation and deployment verification in progress
- Date: 2026-11-16
- Approval: オーナーが本チャット（01a1e3b3-f313-7320-8b6f-bacd8cb40550）で「その方針で進めてください」「更新のProd配備まで完了」と指示。依存固定を先行し、その他の簡素化は本番反映後に分離する。

## 背景と決定

従来はrootのnpm workspace／package-lockでLocal依存を固定する一方、Cloudへ送るFunctionsディレクトリにlockがなく、間接依存をCloudで再解決していた。Localの成功だけではCloudが同じ依存を使う証拠にならず、更新後の版調査が増えていた。

Functionsを独立したnpm packageとし、そのpackage.jsonとpackage-lock.jsonを配備物へ含める。LocalとCloudで同じFunctions用lockを用いる。rootはSPA／CLI／運用ツール用の依存を別に管理する。標準npmで導入し、独自の依存解決器やworkspace lockの独自変換器は作らない。rootのlockをFunctionsへ単純コピーしない。

共有domainソースの準備、業務API・schema、Firebase project／DB／権限、Dev保護保留とProd保護設定は維持する。Functionsソース収集ではnode_modulesを除外し、lockの欠落・不整合を拒否する。試験は実際にFunctionsへ導入したSDKを使い、同一プロセス内のTimestampクラスや既定Admin Appが別実体に分裂しないようにする。Prodの別stageでのFunctions探索にも同じlockの依存を用意し、rootの偶然の依存へ依存しない。

## 検証・移行

依存の正本は各packageとlock。現在の直接指定CLI15.36.0／Admin14.5.1／Functions7.3.2を維持し、移行に伴う間接依存差分を確認する。清浄なnpm導入、lock包含／node_modules除外、SDK実体の同一性、配備stage探索、包括7gateと独立レビューを経て、固定候補をDevへ配備する。最終候補の実依存・Auth退避／読戻しを確認後、通常PRでdev／mainへ統合しProd配備・既存照合を行う。未実証を完了扱いにしない。

Local/Cloudの同じlockは依存再現性の改善であり、OS、Node patch、Cloud側の実行基盤全体のbyte同一性を保証しない。Cloudがlockを使った証拠と実解決版を確認し、前段の旧候補の実証と区別する。

## 切戻しと境界

変更前のGit版と配備証拠を保持し、コード／package／lock／導入処理を通常PRで切り戻す。データ移行はなく、DB復元・Auth変更・障害復旧モードへの移行を行わない。配備失敗・結果不明時は実状態を読取り、再配備を自動反復しない。新規IAMや未知のデータ操作は別途具体化する。

検証範囲の削減、Prod Linux化、対象別配備、手動バックアップ試験の恒久化は[ロードマップ](../roadmaps/technical-remediation.md#2026-11-16-firebase更新のprod反映と保守手順の簡素化)の後続工程。今回の依存更新へ混在させない。

## 根拠

- [Firebase依存管理](https://firebase.google.com/docs/functions/handle-dependencies)：配備するFunctionsのlockを依存導入に使用。
- [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)：lockとpackageの不一致時に更新せず失敗する標準導入。
- 現在地・実証は[運用記録](../operations.md)、配備経路は[配備手順](../runbooks/application-deployment.md)。
