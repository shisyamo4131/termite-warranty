# HSC-022: Production Database Selection

- Status: Resolved
- Decision owner: Project owner
- Decision date: 2026-10-08
- Evidence: 本Codex会話でオーナーが「本番DB: Firestoreで決定」と明示。容量・検索・CSV検証はDevで継続する。

本番DBはFirestore。DB選定を再質問せず、実測による取得方式の改善とProd構築は別工程にする。Prodはまだ構築していない。

反映先：[ADR0038](../../decisions/0038-production-firestore.md)、仕様、技術要件、環境要件、operations、納品ロードマップ。反映revisionはこれらのGit変更履歴を参照。計測結果は[Dev実測](../../design/evidence/prod-readiness-2026-10-08.md)。旧比較過程はGitに保持。
