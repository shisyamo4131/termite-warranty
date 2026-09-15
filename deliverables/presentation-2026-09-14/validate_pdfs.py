from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
CHECKS = {
    "white-ant-warranty-system-overview.pdf": [
        "白蟻保証業務管理システム 概要書",
        "案件詳細と適用保証",
        "アカウントと工務店連携",
        "資料基準日 2026年9月14日",
    ],
    "white-ant-warranty-demo-runbook.pdf": [
        "白蟻保証業務管理システム デモ実施手順書",
        "demo.admin@termite-warranty.com",
        "禁止操作",
        "終了時の確認",
    ],
}
FORBIDDEN = ["sevenstar.1226", "パスワード:", "パスワード："]

failed = False
for name, required in CHECKS.items():
    reader = PdfReader(ROOT / name)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    missing = [value for value in required if value not in text]
    forbidden = [value for value in FORBIDDEN if value in text]
    print({"file": name, "pages": len(reader.pages), "characters": len(text), "missing": missing, "forbidden": forbidden})
    failed = failed or bool(missing or forbidden)

raise SystemExit(1 if failed else 0)
