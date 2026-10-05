"""Build the dated outgoing questionnaire from the reviewed snapshot."""
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

BASE = Path(__file__).resolve().parent
data = json.loads((BASE / 'questions.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('JPBold', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc', subfontIndex=0))
pdfmetrics.registerFontFamily('JP', normal='JP', bold='JPBold')
INK = colors.HexColor('#18364b')
MUTED = colors.HexColor('#526775')
BLUE = colors.HexColor('#eaf2f6')
W, H = A4
WIDTH = W - 84
styles = {
    'title': ParagraphStyle('title', fontName='JPBold', fontSize=20, leading=28, textColor=INK, spaceAfter=10, wordWrap='CJK'),
    'heading': ParagraphStyle('heading', fontName='JPBold', fontSize=13, leading=20, textColor=INK, spaceAfter=8, wordWrap='CJK'),
    'body': ParagraphStyle('body', fontName='JP', fontSize=10.2, leading=16.5, textColor=colors.HexColor('#202b33'), spaceAfter=7, wordWrap='CJK'),
    'small': ParagraphStyle('small', fontName='JP', fontSize=8.2, leading=12.5, textColor=MUTED, spaceAfter=6, wordWrap='CJK'),
    'cell': ParagraphStyle('cell', fontName='JP', fontSize=9, leading=14, wordWrap='CJK'),
}

def p(text, style='body'):
    return Paragraph(escape(text).replace('\n', '<br/>'), styles[style])

def answer_lines(count=2):
    rows = [[''] for _ in range(count)]
    t = Table(rows, colWidths=[WIDTH], rowHeights=[20]*count)
    t.setStyle(TableStyle([('LINEBELOW', (0,0),(-1,-1),0.4,colors.HexColor('#b8c8d1'))]))
    return [p('回答・補足（未決の場合は確認先と予定日をご記入ください）', 'small'), t, Spacer(1,12)]

def question(q, lines=2):
    blocks = [p(f"確認 {q['id']}　{q['title']}", 'heading'), p(q['context'])]
    blocks += [p(f"{i+1}. {text}") for i,text in enumerate(q['prompts'])]
    blocks += [p(c) for c in q['choices']]
    blocks += answer_lines(lines)
    blocks += [p(f"参照：{q['source']}", 'small')]
    return blocks

story = [p('白蟻保証管理システム\n追加確認事項', 'title')]
story += [p('ハウスソリューション様・AriLabo ご担当者様　｜　2026年9月28日', 'small')]
story += [p('ご回答と新しい資料をありがとうございます。今回確認したいのは、資料だけでは決め切れない業務の扱いと、10月末に必要な範囲です。まず確認1〜3を優先してご回答ください。')]
story += [p('□にチェックするか、回答欄にご記入ください。メールで「確認番号＋回答」をお送りいただいても構いません。AriLabo側で分かる事項はご回答いただき、HS様の判断が必要な事項は「HS確認中」としてください。未選択・空欄は承認として扱いません。')]
story += [p('回答者：　　　　　　　　　　　所属：　　　　　　　　　　　回答日：', 'body')]
story += [p('今回の質問から除いた確認済み事項', 'heading'),p('申込日・引渡日の管理／日付単位の保証期間／通常の満了日の数え方と2月29日の扱い／定期点検は対象外／施主への満了案内は不要／保険報告は毎月5日・前月付保分と基本5項目。例外や計算の不一致だけを後続で確認します。','small')]
q = data['questions'][0]
story += [p('確認 1　10月末に必要なもの', 'heading'), p(q['context'])]
rows = [[p('必要な機能・書類','cell'), p('10月末必須','cell'), p('後日でよい','cell'), p('不要','cell')]]
rows += [[p(s,'cell'),'□','□','□'] for s in q['scope']]
t = Table(rows, colWidths=[WIDTH-177,65,65,47], repeatRows=1)
t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),'JP'),('FONTSIZE',(0,0),(-1,-1),10),('BACKGROUND',(0,0),(-1,0),BLUE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(1,0),(-1,-1),'CENTER'),('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#c6d3da')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story += [t,Spacer(1,10),p(q['choices'][0]),p('書類ごとの指定・操作確認担当・最終判断者：')]
story += answer_lines(1)

for a,b in [(1,2),(3,4),(5,6),(7,8),(9,10),(11,12)]:
    story += [PageBreak()]
    story += question(data['questions'][a])
    story += [Spacer(1,12)]
    story += question(data['questions'][b])

story += [PageBreak()] + question(data['questions'][13],3)
story += [Spacer(1,16),p('あわせてご提供いただきたいもの','heading')]
story += [p('□ 保証書の表裏・請求書・更新案内・保険報告の完成見本\n□ 移行対象とするExcelの確定版と対象範囲\n□ 金額計算や等級別保証期間のルールが分かる資料\n□ 本支店・担当者・書類送付先の一覧')]
story += [p('書式の確認用見本は、実名・住所・連絡先を伏せたもので構いません。既存データの受け渡しが必要な場合は、対象と方法を別途確認します。')]
story += [p('この確認書のもとにした資料','heading')]
story += [p('2026年9月28日時点の最新受領資料：\n・ハウスソリューション様 ご確認事項 記入シート（Q1〜15）\n・白蟻 システム概要（12ページ）\n・白蟻システム 項目（Excel 7シート）\n・認識相違点まとめ（AriLabo 2026年9月27日付）','small')]
story += [p('この確認書は回答をお願いするための資料です。選択肢は決定事項ではありません。ご回答後、必要な機能と日程を整理して共有します。','small')]

def decorate(canvas, doc):
    canvas.setTitle('白蟻保証管理システム 追加確認事項 2026年9月28日')
    canvas.setAuthor('白蟻保証管理システム 開発プロジェクト')
    canvas.setFont('JP',8)
    canvas.setFillColor(MUTED)
    canvas.drawString(42,H-26,'ハウスソリューション様・AriLabo向け　追加確認事項')
    canvas.setStrokeColor(colors.HexColor('#ccd8df'))
    canvas.line(42,38,W-42,38)
    canvas.drawString(42,24,'2026年9月28日版　未回答の項目は確認待ちとして扱います')
    canvas.drawRightString(W-42,24,str(doc.page))

output = BASE/'HS_AriLabo_追加確認事項_2026-09-28.pdf'
doc = SimpleDocTemplate(str(output),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=46,bottomMargin=48)
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
print(output)
