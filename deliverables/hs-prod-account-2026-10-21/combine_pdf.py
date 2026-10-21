"""Combine the blank account sheet and billing guide, retaining its form."""
from io import BytesIO
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'output/pdf'
OUT = BASE / 'HS_本番管理アカウントと請求先登録ガイド.pdf'
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
writer = PdfWriter()
writer.append(BASE / 'HS_本番環境管理アカウントのご案内.pdf', import_outline=False)
writer.append(BASE / 'HS_GoogleCloud_請求先とカードの登録手順.pdf', import_outline=False)
assert len(writer.pages) == 11
for i, page in enumerate(writer.pages):
    buf = BytesIO()
    w,h = float(page.mediabox.width),float(page.mediabox.height)
    c = canvas.Canvas(buf, pagesize=(w,h))
    c.setFillColor(HexColor('#FFFFFF'))
    c.rect(32,18,w-64,28,fill=1,stroke=0)
    if i == 0:
        c.rect(40,h-655,515,43,fill=1,stroke=0)
        p=Paragraph('詳しい操作は、次ページからの「請求先・カード登録手順」を参照してください。請求先の登録だけで、Prodの請求先が切り替わったとは判断しません。',ParagraphStyle('body',fontName='JP',fontSize=10,leading=17,textColor=HexColor('#19344D'),wordWrap='CJK'))
        _,ph=p.wrap(507,60);p.drawOn(c,44,h-615-ph)
    c.setFillColor(HexColor('#526778'));c.setFont('JP',8)
    c.drawString(36,30,'2026年10月21日 統合版  |  HSご担当者向け')
    c.drawRightString(w-36,30,f'{i+1} / 11')
    c.showPage();c.save();buf.seek(0)
    page.merge_page(PdfReader(buf).pages[0])
writer.add_outline_item('管理アカウント・当日の準備',0)
writer.add_outline_item('請求先・カード登録手順',1)
writer.add_metadata({'/Title':'HS 本番管理アカウントと請求先登録ガイド','/Author':'AIR'})
with OUT.open('wb') as f: writer.write(f)
r=PdfReader(OUT)
assert len(r.pages)==11
assert list(r.get_fields())==['password']
assert r.get_fields()['password'].get('/V','')==''
widgets=[a.get_object() for p in r.pages for a in p.get('/Annots',[]) if a.get_object().get('/Subtype')=='/Widget']
assert len(widgets)==1 and widgets[0]['/T']=='password'
assert widgets[0].get('/V','')=='' and widgets[0]['/AP']['/N']
assert all(p.extract_text().strip() for p in r.pages)
print('PASS: 11 pages, blank password field/widget and appearance retained, all pages readable')
