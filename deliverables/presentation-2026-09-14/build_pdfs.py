from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from PIL import Image as PILImage


ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "screenshots"
OVERVIEW = ROOT / "white-ant-warranty-system-overview.pdf"
RUNBOOK = ROOT / "white-ant-warranty-demo-runbook.pdf"
PORTAL = ROOT / "white-ant-warranty-construction-company-portal-overview.pdf"

BLUE = colors.HexColor("#2F75B5")
PALE_BLUE = colors.HexColor("#EAF2F8")
PALE_GRAY = colors.HexColor("#F6F8FA")
GRID = colors.HexColor("#D9E1E8")
TEXT = colors.HexColor("#28323C")
MUTED = colors.HexColor("#5A646E")


def register_font() -> str:
    candidates = [
        Path(r"C:\Windows\Fonts\YuGothM.ttc"),
        Path(r"C:\Windows\Fonts\meiryo.ttc"),
        Path(r"C:\Windows\Fonts\msgothic.ttc"),
    ]
    for path in candidates:
        if path.exists():
            pdfmetrics.registerFont(TTFont("Japanese", str(path), subfontIndex=0))
            return "Japanese"
    raise FileNotFoundError("Japanese font was not found")


FONT = register_font()


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleJP", parent=base["Title"], fontName=FONT, fontSize=22, leading=29,
            textColor=colors.black, alignment=TA_LEFT, spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "SubtitleJP", parent=base["Normal"], fontName=FONT, fontSize=12.5, leading=18,
            textColor=MUTED, spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "H1JP", parent=base["Heading1"], fontName=FONT, fontSize=17, leading=22,
            textColor=colors.black, spaceBefore=3, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2JP", parent=base["Heading2"], fontName=FONT, fontSize=12.5, leading=17,
            textColor=colors.black, spaceBefore=6, spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "BodyJP", parent=base["BodyText"], fontName=FONT, fontSize=9.6, leading=15,
            textColor=TEXT, spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "SmallJP", parent=base["BodyText"], fontName=FONT, fontSize=8.1, leading=11,
            textColor=MUTED, spaceAfter=3,
        ),
        "caption": ParagraphStyle(
            "CaptionJP", parent=base["BodyText"], fontName=FONT, fontSize=7.8, leading=10,
            textColor=MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=4,
        ),
        "bullet": ParagraphStyle(
            "BulletJP", parent=base["BodyText"], fontName=FONT, fontSize=9.3, leading=14,
            textColor=TEXT, leftIndent=13, firstLineIndent=-8, bulletIndent=0, spaceAfter=3,
        ),
        "number": ParagraphStyle(
            "NumberJP", parent=base["BodyText"], fontName=FONT, fontSize=9.3, leading=14,
            textColor=TEXT, leftIndent=18, firstLineIndent=-14, spaceAfter=3,
        ),
        "table": ParagraphStyle(
            "TableJP", parent=base["BodyText"], fontName=FONT, fontSize=8.4, leading=11,
            textColor=TEXT,
        ),
        "table_head": ParagraphStyle(
            "TableHeadJP", parent=base["BodyText"], fontName=FONT, fontSize=8.5, leading=11,
            textColor=colors.white,
        ),
    }


S = styles()


class DataRelationshipDiagram(Flowable):
    """Business-readable conceptual relationship diagram, not a physical ERD."""

    def __init__(self, width=25.2 * cm, height=12.1 * cm, include_branch=True):
        super().__init__()
        self.width = width
        self.height = height
        self.include_branch = include_branch

    def draw_box(self, canvas, x, y, w, h, title, detail, fill):
        canvas.setFillColor(fill)
        canvas.setStrokeColor(GRID)
        canvas.roundRect(x, y, w, h, 7, stroke=1, fill=1)
        canvas.setFillColor(TEXT)
        canvas.setFont(FONT, 10)
        canvas.drawCentredString(x + w / 2, y + h - 16, title)
        canvas.setFont(FONT, 7.1)
        lines = detail.split("\n")
        for i, line in enumerate(lines):
            canvas.drawCentredString(x + w / 2, y + h - 30 - i * 10, line)

    def connector(self, canvas, x1, y1, x2, y2, label=""):
        canvas.setStrokeColor(BLUE)
        canvas.setLineWidth(1.3)
        canvas.line(x1, y1, x2, y2)
        if label:
            canvas.setFillColor(MUTED)
            canvas.setFont(FONT, 6.8)
            canvas.drawCentredString((x1 + x2) / 2, (y1 + y2) / 2 + 4, label)

    def draw(self):
        c = self.canv
        box_w, box_h = 4.7 * cm, 1.75 * cm
        x_company, x_property, x_case, x_warranty = 0.2 * cm, 6.4 * cm, 12.7 * cm, 19.2 * cm
        y_main, y_top, y_bottom = 5.0 * cm, 9.0 * cm, 1.0 * cm

        self.draw_box(c, x_company, y_main, box_w, box_h, "工務店マスター", "会社・住所・担当者\n物件と案件から参照", PALE_BLUE)
        self.draw_box(c, x_property, y_main, box_w, box_h, "物件マスター", "施主・工務店を初期値に\n住所・建築面積を保持", PALE_BLUE)
        self.draw_box(c, x_case, y_main, box_w, box_h, "案件", "物件・施主・工務店・支店を参照\n案件番号・申込日・引渡日", colors.HexColor("#FFF4D6"))
        self.draw_box(c, x_warranty, y_main, box_w, box_h, "適用保証", "1案件に複数\n開始日・満了日・通知状態", colors.HexColor("#E8F5E9"))
        self.draw_box(c, x_property, y_top, box_w, box_h, "施主マスター", "氏名・住所・連絡先\n物件と案件から参照", PALE_BLUE)
        self.draw_box(c, x_warranty, y_top, box_w, box_h, "保証サービス", "保証／保険・略称\n標準保証期間", PALE_BLUE)
        self.draw_box(c, x_company, y_bottom, box_w, box_h, "工務店共通アカウント", "1工務店につき1アカウント\n自社対応データだけを表示", colors.HexColor("#F1EAF8"))
        self.draw_box(c, x_property, y_bottom, box_w, box_h, "工務店対応データ", "新規案件／保証更改\n提出・差戻し・本登録", colors.HexColor("#F1EAF8"))
        self.draw_box(c, x_case, y_bottom, box_w, box_h, "通知送信待ち", "イベントをキューに記録\n実メール配送は未接続", colors.HexColor("#FDECEC"))
        if self.include_branch:
            self.draw_box(c, x_warranty, y_bottom, box_w, box_h, "担当支店", "案件ごとの担当先\n新規承認時に選択", PALE_BLUE)

        self.connector(c, x_company + box_w, y_main + box_h / 2, x_property, y_main + box_h / 2, "工務店を設定")
        self.connector(c, x_property + box_w, y_main + box_h / 2, x_case, y_main + box_h / 2, "初期選択・直接参照")
        self.connector(c, x_case + box_w, y_main + box_h / 2, x_warranty, y_main + box_h / 2, "1 対 多")
        self.connector(c, x_property + box_w / 2, y_top, x_property + box_w / 2, y_main + box_h, "施主を設定")
        self.connector(c, x_warranty + box_w / 2, y_top, x_warranty + box_w / 2, y_main + box_h, "サービスを参照")
        self.connector(c, x_company + box_w / 2, y_bottom + box_h, x_company + box_w / 2, y_main, "1 対 1")
        self.connector(c, x_company + box_w, y_bottom + box_h / 2, x_property, y_bottom + box_h / 2, "自社の対応")
        self.connector(c, x_property + box_w, y_bottom + box_h / 2, x_case, y_bottom + box_h / 2, "イベント")
        self.connector(c, x_property + box_w / 2, y_bottom + box_h, x_case + box_w / 2, y_main, "承認時に登録・更新")
        if self.include_branch:
            self.connector(c, x_warranty + box_w / 2, y_bottom + box_h, x_case + box_w / 2, y_main, "案件が参照")


def make_doc(path: Path, page_size, title: str, margin=1.45 * cm):
    doc = BaseDocTemplate(
        str(path), pagesize=page_size, leftMargin=margin, rightMargin=margin,
        topMargin=1.35 * cm, bottomMargin=1.35 * cm, title=title,
        author="株式会社AriLabo",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")

    def footer(canvas, current_doc):
        canvas.saveState()
        canvas.setFont(FONT, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(doc.leftMargin, 0.65 * cm, "House Solution向け DEV環境デモ資料")
        canvas.drawRightString(page_size[0] - doc.rightMargin, 0.65 * cm, str(current_doc.page))
        canvas.restoreState()

    doc.addPageTemplates([PageTemplate(id="normal", frames=[frame], onPage=footer)])
    return doc


def p(text: str, style="body"):
    return Paragraph(text, S[style])


def bullet_list(items):
    return [Paragraph(f"• {item}", S["bullet"]) for item in items]


def numbered_list(items):
    return [Paragraph(f"{i}. {item}", S["number"]) for i, item in enumerate(items, 1)]


def screenshot(filename: str, max_width: float, max_height: float):
    path = SHOTS / filename
    with PILImage.open(path) as im:
        width, height = im.size
    ratio = min(max_width / width, max_height / height)
    return Image(str(path), width=width * ratio, height=height * ratio)


def figure(filename: str, caption: str, max_width: float, max_height: float):
    img = screenshot(filename, max_width, max_height)
    return KeepTogether([img, p(caption, "caption")])


def figure_cell(filename: str, caption: str, max_width: float, max_height: float):
    return [screenshot(filename, max_width, max_height), p(caption, "caption")]


def cover(story, title, subtitle):
    story += [p(title, "title"), p(subtitle, "subtitle")]
    data = [
        [p("対象", "table"), p("House Solution株式会社 清水社長", "table")],
        [p("説明担当", "table"), p("株式会社AriLabo 中村氏", "table")],
        [p("環境", "table"), p("termite-warranty-dev DEV環境 架空デモデータ", "table")],
    ]
    table = Table(data, colWidths=[4.0 * cm, 12.2 * cm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PALE_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [table, Spacer(1, 12)]


def build_overview():
    doc = make_doc(OVERVIEW, landscape(A4), "白蟻保証業務管理システム 概要書")
    story = []
    cover(story, "白蟻保証業務管理システム 概要書", "現在の業務画面とデモで確認できる範囲")
    story += [
        p("本資料は、House Solutionの白蟻保証業務を管理するDEV環境プロトタイプの全体像を、実際の画面で説明するものです。案件、施主、物件、工務店、保証サービスを関連付け、保証期限と通知状態を一つのシステムで確認できます。"),
        p("画面内の名称、住所、電話番号、案件番号は説明用の架空データです。DEV環境は本番環境ではありません。"),
        p("業務の流れ", "h1"),
    ]
    flow = [[p(str(i), "table_head") for i in range(1, 6)],
            [p(x, "table") for x in ("マスター登録", "案件登録", "保証管理", "期限確認", "工務店対応")]]
    table = Table(flow, colWidths=[5.05 * cm] * 5)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BACKGROUND", (0, 1), (-1, 1), PALE_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [table]

    story += [
        PageBreak(),
        p("データ関係図（概念図）", "h1"),
        p("画面の裏では、案件を中心に各マスター、適用保証、工務店からの対応データがつながります。これは社長説明用の概念図であり、物理的なデータベース構造をすべて示すERDではありません。"),
        DataRelationshipDiagram(include_branch=False),
        p("読み方：物件を選ぶと施主・工務店が初期選択されますが、案件は三者を直接参照します。後から物件マスターの参照先を変えても、既存案件の参照先は自動で書き換わりません。", "small"),
    ]

    pages = [
        ("ダッシュボード", "ログイン直後に、表示対象の案件数、保証期限が30日以内の案件数、未通知の案件数を確認します。対応が必要な案件から、案件詳細へ直接移動できます。", "01-dashboard.png", "ダッシュボードでは最新20件を対象に現在の対応状況を確認します"),
        ("案件一覧", "案件一覧には、案件番号、施主、物件住所、工務店、担当支店、状態が一行で表示されます。最新20件を起点として、対象の案件を探します。", "03-case-list.png", "案件一覧"),
        ("案件の絞り込み", "案件番号、関連する各マスター、保証種別、住所、通知状態、満了日、申込日、引渡日を組み合わせて案件を絞り込めます。", "04-case-filter.png", "案件の絞り込み画面"),
        ("案件登録", "物件を選択すると施主と工務店が初期選択されます。担当支店、申込日、引渡日、初回の保証サービスと保証開始日をまとめて登録できます。必要なマスターは入力途中でも追加できます。", "12-case-registration.png", "案件登録画面は初回保証までを一つの流れで入力します"),
        ("案件詳細と適用保証", "案件に関連する物件、施主、工務店、担当支店、日付を確認できます。適用保証ごとに期間、開始日、満了日、通知状態、保証状態を保持します。保証を延長するときは既存保証を残し、新しい適用保証を追加します。", "05-case-detail.png", "案件詳細では案件情報と適用保証の履歴を確認します"),
    ]
    for heading, body, image, caption in pages:
        story += [PageBreak(), p(heading, "h1"), p(body), figure(image, caption, 25.6 * cm, 13.5 * cm)]

    story += [PageBreak(), p("業務マスター", "h1"), p("工務店、施主、物件、保証サービスを個別に管理します。各一覧から詳細を開き、登録内容と関連情報を確認できます。無効化したマスターも履歴のために保持されます。")]
    master_rows = [
        ["マスター", "主な情報", "関連画面で確認できる内容"],
        ["工務店", "住所、電話、担当者、備考", "担当物件と工務店アカウント"],
        ["施主", "住所、電話、FAX、備考", "所有物件"],
        ["物件", "住所、建築面積、施主、工務店", "案件登録で選択する物件情報"],
        ["保証サービス", "名称、種別、略称、標準保証期間", "有効な案件で使用中の対象物件"],
    ]
    master_data = [[p(c, "table_head" if r == 0 else "table") for c in row] for r, row in enumerate(master_rows)]
    table = Table(master_data, colWidths=[4.0 * cm, 8.8 * cm, 12.3 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [table, Spacer(1, 8), Table([[
        figure_cell("07-company-list.png", "工務店一覧", 12.3 * cm, 5.5 * cm),
        figure_cell("06-warranty-service-list.png", "保証サービス一覧", 12.3 * cm, 5.5 * cm),
    ]], colWidths=[12.7 * cm, 12.7 * cm], style=[("VALIGN", (0, 0), (-1, -1), "TOP")])]

    story += [PageBreak(), p("マスター詳細と関連情報", "h1"), p("工務店詳細では登録内容に加えて担当物件を確認できます。物件一覧では住所と建築面積を一覧で確認し、各物件の詳細へ移動できます。"), Table([[
        figure_cell("08-company-detail.png", "工務店詳細と担当物件", 12.3 * cm, 8.8 * cm),
        figure_cell("11-property-list.png", "物件一覧", 12.3 * cm, 8.8 * cm),
    ]], colWidths=[12.7 * cm, 12.7 * cm], style=[("VALIGN", (0, 0), (-1, -1), "TOP")])]

    story += [PageBreak(), p("アカウントと工務店連携", "h1"), p("House Solution管理者は一般担当者と工務店の共通アカウントを管理できます。工務店からの仮申請や保証更改の回答は通知管理で確認します。工務店へのメールは、現在は送信待ちキューへの記録までで、外部のメール配送サービスには接続していません。"), Table([[
        figure_cell("09-notification-management.png", "工務店からの回答を扱う通知管理", 12.3 * cm, 8.8 * cm),
        figure_cell("13-staff-account-management.png", "House Solution担当者のアカウント管理", 12.3 * cm, 8.8 * cm),
    ]], colWidths=[12.7 * cm, 12.7 * cm], style=[("VALIGN", (0, 0), (-1, -1), "TOP")])]

    story += [PageBreak(), p("デモで確認する範囲", "h1")]
    story += bullet_list([
        "DEV環境の架空データを使い、案件、適用保証、各マスター、通知管理、アカウント管理の画面を確認します。",
        "デモでは登録画面を開いて入力項目を説明しますが、データは登録、編集、無効化しません。",
        "本番環境の構築、外部メール配送、監視、バックアップと復旧は今回のデモ対象外です。",
        "画面上で確認された追加要望や仕様変更は、中村氏が別途取りまとめます。",
    ])
    story += [Spacer(1, 8), p("資料基準日 2026年9月14日", "small")]
    doc.build(story)


def step_page(story, number, title, purpose, actions, talking, image):
    story += [PageBreak(), p(f"{number} {title}", "h1"), p(f"目的  {purpose}"), p("操作", "h2")]
    story += numbered_list(actions)
    story += [p("説明する内容", "h2")]
    story += bullet_list(talking)
    if image:
        story += [Spacer(1, 4), figure(image, title, 17.1 * cm, 7.6 * cm)]


def build_runbook():
    doc = make_doc(RUNBOOK, A4, "白蟻保証業務管理システム デモ実施手順書", margin=1.55 * cm)
    story = []
    cover(story, "白蟻保証業務管理システム デモ実施手順書", "清水社長向け DEV環境デモの進行台本")
    story += [p("本手順書は、中村氏がDEV環境の架空データを使ってシステムの主要な業務画面を説明するための進行台本です。想定時間は20分から25分です。")]
    info_rows = [
        ("URL", "https://termite-warranty-dev.web.app/"),
        ("ログインアカウント", "demo.admin@termite-warranty.com"),
        ("権限", "House Solution管理者"),
        ("使用データ", "DEV環境の架空デモデータ"),
        ("禁止操作", "登録確定、編集保存、無効化、アカウント発行"),
    ]
    info = Table([[p(a, "table"), p(b, "table")] for a, b in info_rows], colWidths=[4.3 * cm, 12.4 * cm])
    info.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PALE_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [info, Spacer(1, 8), p("開始前の確認", "h1")]
    story += bullet_list([
        "ログイン画面を開き、アカウントのメールアドレスとパスワードを入力しておきます。パスワードは本手順書に記録しません。",
        "DEV環境にデモ用データが表示されることを確認します。実在する顧客情報や物件情報は使用しません。",
        "デモ中は閲覧と画面遷移を中心にします。登録や無効化の確定ボタンは押しません。",
        "質問や要望はその場で判断せず、中村氏が持ち帰る項目として記録します。",
    ])

    steps = [
        ("1", "ログインとダッシュボード", "デモ環境と全体の入口を説明する", [
            "ログイン画面でメールアドレスが demo.admin@termite-warranty.com であることを確認します。",
            "パスワードが入力済みであることを確認し、ログインをクリックします。",
            "画面右上にデモ管理者と表示され、ダッシュボードが開くことを確認します。",
        ], [
            "この画面は本番環境ではなく、架空データを入れたDEV環境です。",
            "ダッシュボードでは、最新20件の案件、期限30日以内、未通知の件数を確認できます。",
            "対応が必要な案件から案件詳細へ移動できます。",
        ], "01-dashboard.png"),
        ("2", "メニュー構成", "主要機能の配置を短時間で示す", [
            "画面左上のメニューボタンをクリックします。",
            "ダッシュボード、案件一覧、工務店、施主、保証サービス、物件、担当者アカウントを順に指し示します。",
            "工務店管理ポータルには通知管理とアカウント管理があることを説明します。",
            "案件一覧をクリックします。",
        ], [
            "案件を中心に、関連するマスターと工務店対応を同じシステムで扱います。",
            "今回のデモでは主要画面を確認し、データ変更は行いません。",
        ], "02-navigation.png"),
        ("3", "案件一覧と絞り込み", "案件を探して詳細へ進む操作を示す", [
            "案件一覧の列を左から確認します。",
            "更新日時が新しい20件を表示していますという案内を指し示します。",
            "絞り込みをクリックします。",
            "案件番号、施主、物件、工務店、担当支店、保証サービス、保証種別、住所、通知状態、日付で絞り込めることを説明します。",
            "今回は条件を入力せず、キャンセルをクリックします。",
            "先頭に表示されている案件番号をクリックします。",
        ], [
            "一覧は一案件一行で、施主、物件住所、工務店、担当支店、状態を確認できます。",
            "未通知の適用保証がある案件には未通知と表示されます。",
            "条件を指定した場合は該当結果を20件ずつ確認できます。",
        ], "04-case-filter.png"),
        ("4", "案件詳細と適用保証", "案件と複数保証の関係を説明する", [
            "案件番号、施主、工務店、案件状態を確認します。",
            "案件情報で物件、住所、担当支店、申込日、引渡日を確認します。",
            "適用保証のサービス、期間、開始日、満了日、通知、状態を確認します。",
            "編集と適用保証を追加のボタンは指し示すだけにし、クリックしません。",
            "一覧へ戻るをクリックします。",
        ], [
            "一つの案件に複数の適用保証を保持できます。",
            "保証期間と満了日は案件全体ではなく、適用保証ごとに管理します。",
            "保証を延長するときは既存保証を残し、新しい適用保証を追加します。",
        ], "05-case-detail.png"),
        ("5", "案件登録画面", "新規案件の入力項目とマスター連携を説明する", [
            "案件一覧で新規登録をクリックします。",
            "物件、施主、工務店、担当支店、申込日、引渡日を上から確認します。",
            "初回保証の保証サービスと保証開始日を確認します。",
            "各選択欄の追加ボタンからマスターを追加できることを説明します。",
            "何も入力せず、キャンセルをクリックします。案件を登録はクリックしません。",
        ], [
            "物件を選ぶと、その物件に設定された施主と工務店が初期選択されます。",
            "必要なマスターがない場合も、案件入力を閉じずに追加できます。",
            "初回保証まで一つの登録操作で扱います。",
        ], "12-case-registration.png"),
        ("6", "業務マスター", "案件登録を支える基本情報を示す", [
            "メニューから保証サービスを開きます。",
            "名称、種別、略称、標準保証期間を確認します。",
            "工務店を開き、住所、電話番号、担当者が一覧表示されることを確認します。",
            "先頭の工務店の詳細を開き、基本情報と担当物件を確認します。",
            "メニューから物件を開き、住所と建築面積を確認します。",
        ], [
            "工務店、施主、物件、保証サービスには個別の一覧と詳細があります。",
            "無効化は物理削除ではなく、過去の案件から参照できる状態で保持します。",
            "保証サービスの標準保証期間を変更しても、既存案件の適用保証は変わりません。",
        ], "06-warranty-service-list.png"),
        ("7", "工務店とのやり取り", "工務店からの回答とアカウントの管理範囲を説明する", [
            "メニューの工務店管理ポータルから通知管理を開きます。",
            "仮申請 更改回答の一覧で種別、案件番号、工務店、物件と施主、状態を確認します。",
            "確認や更改依頼を作成のボタンはクリックしません。",
            "アカウント管理を開き、工務店ごとに共通アカウントを管理する画面であることを説明します。",
            "アカウントを発行と無効化はクリックしません。",
        ], [
            "工務店から提出された仮データを確認し、本登録または差し戻しを行う流れがあります。",
            "メール通知は現在、送信待ちキューへの記録までです。実際のメール配送には接続していません。",
            "工務店のパスワードはHouse Solution側で設定せず、工務店側が共通ログイン画面から設定します。",
        ], "09-notification-management.png"),
        ("8", "担当者アカウント", "House Solution側の利用者管理を説明する", [
            "メニューから担当者アカウントを開きます。",
            "表示名、メールアドレス、権限、状態を確認します。",
            "新規発行、編集、無効化はクリックしません。",
            "メニューからダッシュボードへ戻ります。",
        ], [
            "House Solution管理者は一般担当者のアカウントを発行、編集、無効化できます。",
            "一般担当者のパスワードは本人が設定または再設定します。",
        ], "13-staff-account-management.png"),
    ]
    for args in steps:
        step_page(story, *args)

    story += [PageBreak(), p("終了時の確認", "h1")]
    story += bullet_list([
        "登録、編集、無効化、アカウント発行を確定していないことを確認します。",
        "ダッシュボードへ戻り、必要に応じてログアウトします。",
        "清水社長からの未決定事項への回答、仕様追加、変更要望は中村氏が別途整理します。",
        "画面表示が資料と異なる場合は、その場で推測せず、差分として持ち帰ります。",
    ])
    story += [p("デモ中の注意", "h1")]
    cautions = [
        ("データ変更", "確定操作を行わず、閲覧とキャンセルで進める"),
        ("個人情報", "実在する顧客、物件、連絡先を画面やメモに出さない"),
        ("メール", "送信済みとは説明せず、キュー記録までと説明する"),
        ("本番利用", "DEV環境のプロトタイプであり、本番稼働中とは説明しない"),
        ("未確認事項", "その場で断定せず、中村氏が持ち帰って整理する"),
    ]
    table = Table([[p(a, "table"), p(b, "table")] for a, b in cautions], colWidths=[3.8 * cm, 12.9 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PALE_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [table, Spacer(1, 8), p("資料基準日 2026年9月14日", "small")]
    doc.build(story)


def build_portal_overview():
    doc = make_doc(PORTAL, landscape(A4), "工務店ポータル 説明資料")
    story = []
    cover(story, "工務店ポータル 説明資料", "清水社長向け：工務店との案件連携を画面とデータの流れで確認")
    story += [
        p("工務店ポータルは、各工務店が自社に割り当てられた保証更改への回答と、新規案件の申請を行う窓口です。House Solution側の管理画面と役割を分け、工務店が登録済み案件や他社データを直接閲覧・編集しない構成です。"),
        p("画面は2026年9月14日時点のDEV環境です。表示される会社名、施主名、物件名、案件番号は説明用のデモデータです。"),
        p("この資料で把握できること", "h1"),
    ]
    story += bullet_list([
        "工務店側で見える情報と、House Solution側で管理する情報の境界",
        "新規案件申請と保証更改が、本登録データへ反映されるまでの流れ",
        "工務店共通アカウント、対応データ、案件、通知送信待ちの関係",
        "現在のプロトタイプで確認できる範囲と、実メール配送などの未接続範囲",
    ])

    story += [PageBreak(), p("役割とアクセス範囲", "h1"), p("工務店には会社単位の共通アカウントを1つ発行します。ログイン後は、自社に割り当てられた工務店対応データだけが表示されます。登録済み案件やマスターを直接編集する権限はありません。")]
    roles = [
        ["利用者", "できること", "できないこと"],
        ["工務店", "自社の更改依頼を確認／回答、新規案件を下書き・提出、未承認の新規申請を取下げ", "他社データの閲覧、登録済み案件・マスターへの直接書込み、担当支店・保証サービスの確定"],
        ["House Solution", "工務店アカウント発行、更改依頼作成、提出内容の確認・差戻し・承認、本登録データ管理", "工務店側のパスワード設定、未接続の実メール配送を送信済みとして扱うこと"],
    ]
    data = [[p(cell, "table_head" if r == 0 else "table") for cell in row] for r, row in enumerate(roles)]
    t = Table(data, colWidths=[4.1 * cm, 10.5 * cm, 10.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [t, Spacer(1, 10), p("アカウントの考え方", "h2")]
    story += bullet_list([
        "一つのFirebase利用者IDを一つの工務店マスターへ結び付け、同じ工務店への重複発行を防ぎます。",
        "パスワードは工務店側が共通ログイン画面から設定・再設定し、House Solution側では設定しません。",
        "アカウントを無効化すると、対象工務店のポータル利用を停止できます。",
    ])

    story += [
        PageBreak(), p("工務店ポータルの入口", "h1"),
        p("ログインすると「対応案件」が表示されます。工務店は自社に割り当てられた保証更改や申請だけを確認できます。カードには、種別、案件番号、物件、施主、現在の満了日、今回の担当者、状態、確認コメントが表示されます。"),
        figure("14-construction-portal-list.png", "工務店ポータル：対応案件一覧（DEV環境）", 25.6 * cm, 13.2 * cm),
    ]

    story += [
        PageBreak(), p("新規案件の申請 1/2", "h1"),
        p("工務店は新規案件を申請できます。担当者名、施主名、物件名、建築面積、住所を入力し、下書き保存または提出へ進みます。連絡先メールはログイン中の共通アカウントから信頼済み処理で取得します。"),
        figure("15-construction-portal-new-case-form.png", "新規案件申請：基本情報と住所（未入力の画面）", 25.6 * cm, 13.0 * cm),
    ]
    story += [
        PageBreak(), p("新規案件の申請 2/2", "h1"),
        p("申込日、引渡日、希望保証期間、保証開始日、任意の連絡事項を入力します。引渡日を入力すると、保証開始日が未入力または自動入力のままであれば同じ日付が補助入力されます。手動で変更した保証開始日は保持されます。"),
        figure("16-construction-portal-new-case-form-lower.png", "新規案件申請：日付、保証期間、連絡事項、下書き・提出操作", 25.6 * cm, 13.0 * cm),
    ]

    story += [PageBreak(), p("新規案件と保証更改の流れ", "h1")]
    flow = [
        [p("1", "table_head"), p("2", "table_head"), p("3", "table_head"), p("4", "table_head"), p("5", "table_head")],
        [p("依頼／申請開始", "table"), p("工務店が入力", "table"), p("提出", "table"), p("確認・差戻し", "table"), p("承認・本登録", "table")],
        [p("更改はHouse Solutionが作成\n新規は工務店が開始", "small"), p("下書き保存が可能", "small"), p("受付状態を固定", "small"), p("House Solutionが内容確認", "small"), p("登録データを一括更新", "small")],
    ]
    t = Table(flow, colWidths=[5.05 * cm] * 5)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BACKGROUND", (0, 1), (-1, 1), PALE_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [t, Spacer(1, 12), p("承認時のデータ反映", "h2")]
    story += bullet_list([
        "新規案件：施主・物件・案件・初回の適用保証を作成し、工務店対応データを承認済みにします。担当支店と保証サービスはHouse Solution側で選びます。",
        "保証更改：既存案件へ該当する5年または10年の適用保証を追加し、案件一覧用の保証情報も同時に更新します。",
        "登録データの更新と工務店対応データの承認は一つの処理として行い、途中だけ反映されないようにします。",
        "差戻しでは登録済み案件を変更せず、工務店がコメントを確認して再提出できます。",
    ])

    story += [
        PageBreak(), p("データのつながり", "h1"),
        p("工務店ポータルは登録済みデータへ直接書き込まず、「工務店対応データ」を介してHouse Solutionの確認・承認へつなぎます。"),
        DataRelationshipDiagram(),
        p("工務店対応データの状態：回答待ち／下書き／提出済み／要修正／承認済み／取下げ。新規案件は承認前に理由を付けて取下げでき、監査のため記録は残ります。", "small"),
    ]

    story += [PageBreak(), p("現在の確認範囲と説明上の注意", "h1")]
    limits = [
        ["区分", "現在確認できること", "このデモで断定しないこと"],
        ["画面", "自社案件一覧、新規申請、下書き・提出、状態表示", "本番運用時の最終デザイン、モバイル・アクセシビリティ対応"],
        ["連携", "提出、差戻し、承認、登録データへの一括反映", "外部システム連携や本番移行の完了"],
        ["通知", "通知イベントを送信待ちキューへ記録", "実メールの送達、再送、エラー・バウンス管理"],
        ["運用", "工務店単位の共通アカウントと無効化", "本番向け監視、MFA、保持期間、障害対応の確定"],
    ]
    data = [[p(cell, "table_head" if r == 0 else "table") for cell in row] for r, row in enumerate(limits)]
    t = Table(data, colWidths=[3.3 * cm, 10.8 * cm, 11.0 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [t, Spacer(1, 10), p("デモでは、工務店側の一覧と新規申請画面を確認し、下書き保存・提出・取下げは行いません。未決定事項への回答や追加・変更要望は中村氏が別途整理します。"), p("資料基準日 2026年9月14日", "small")]
    doc.build(story)


if __name__ == "__main__":
    build_overview()
    build_portal_overview()
    print(OVERVIEW)
    print(PORTAL)
