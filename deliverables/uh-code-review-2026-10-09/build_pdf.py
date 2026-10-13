"""Generate a duplicate-code listing from the verified external snapshot."""
import argparse, json, math
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

parser = argparse.ArgumentParser()
parser.add_argument('--analysis', required=True, type=Path)
args = parser.parse_args()
data = json.loads(args.analysis.read_text(encoding='utf-8-sig'))
groups = sorted(data['groups'], key=lambda g: g['code'])
assert len(groups) == len({g['code'] for g in groups}) == 50
assert all(len(g['members']) == 2 for g in groups)
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/UH_加盟店コード確認資料_2026-10-09.pdf'
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
W, H = landscape(A4)
CW = W - 64
cell = ParagraphStyle('cell', fontName='JP', fontSize=10, leading=13, wordWrap='CJK')
title = ParagraphStyle('title', fontName='JPB', fontSize=18, leading=24)
small = ParagraphStyle('small', fontName='JP', fontSize=9, leading=13)
story = []
pages = math.ceil(len(groups) / 10)
for offset in range(0, len(groups), 10):
    if story: story.append(PageBreak())
    story += [Paragraph('UH 加盟店コード重複一覧', title), Spacer(1, 6),
              Paragraph('重複50コード・100行 ／ コード昇順 ／ 2026年10月9日確認資料', small), Spacer(1, 10)]
    rows = [['加盟店コード', '元資料の行', '法人名', '加盟店名']]
    rules = [('FONTNAME', (0,0),(-1,-1),'JP'), ('FONTSIZE',(0,0),(-1,-1),10),
             ('VALIGN',(0,0),(-1,-1),'MIDDLE'), ('GRID',(0,0),(-1,-1),.35,colors.HexColor('#BBC4CC')),
             ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DFE8EF')),
             ('TOPPADDING',(0,0),(-1,-1),4), ('BOTTOMPADDING',(0,0),(-1,-1),4)]
    for j,g in enumerate(groups[offset:offset+10]):
        start = len(rows)
        for k,m in enumerate(sorted(g['members'], key=lambda m:m['sourceRow'])):
            rows.append([g['code'] if k == 0 else '', str(m['sourceRow']),
                         Paragraph(escape(m['corporation']),cell), Paragraph(escape(m['store']),cell)])
        rules.append(('SPAN',(0,start),(0,start+1)))
        if j % 2 == 0: rules.append(('BACKGROUND',(0,start),(-1,start+1),colors.HexColor('#F4F6F8')))
    table = Table(rows, colWidths=[90,75,305,CW-470], rowHeights=[24]+[21]*20)
    table.setStyle(TableStyle(rules))
    story.append(table)

def footer(c,doc):
    c.setFont('JP',8)
    c.drawString(32,21,'出典：UH 加盟店コード ／ 加盟店ｺｰﾄﾞ（D列4桁＋E列2桁）　元資料の行番号を掲載')
    c.drawRightString(W-32,21,f'{doc.page} / {pages}')
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=landscape(A4),leftMargin=32,rightMargin=32,topMargin=26,bottomMargin=38,
                  title='UH 加盟店コード重複一覧',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(json.dumps({'pages':pages,'codes':len(groups),'rows':sum(len(g['members']) for g in groups)},ensure_ascii=False))
