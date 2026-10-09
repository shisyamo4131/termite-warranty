from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/HS_本番稼働に向けた目標スケジュール_2026-10-09.pdf'
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
navy = colors.HexColor('#173A53')
teal = colors.HexColor('#087E8B')
body = ParagraphStyle('body', fontName='JP', fontSize=9.3, leading=14, textColor=navy, wordWrap='CJK')
bold = ParagraphStyle('bold', parent=body, fontName='JPB')
small = ParagraphStyle('small', parent=body, fontSize=8, leading=12)
white = ParagraphStyle('white', parent=bold, textColor=colors.white, fontSize=9)
def p(text, style=body): return Paragraph(text, style)

rows = [
 ('10/9', '過去データ受領・事前点検', 'HSC 99件・SHS 66件・UH 277件、計442件を確認。不足値・所属・初期状態の対応を整理。取込みは未実施。', '開発側'),
 ('10/13\n〜10/15', 'Dev初期化・一括取込み・照合', '不明点の解消と取込処理の検証後に実施。過去番号を保持し、件数・日付・保証期間・状態を全件照合。再取込み手順も整備。', '開発側\n・HS'),
 ('10/16・19', 'HS試験運用（2日）', 'Devの実画面で登録・訂正・延長・月別一覧・各CSV・済み登録と取消を確認。指摘をまとめる。実施日はHSと調整。', 'HS'),
 ('10/20\n〜10/26', '修正・再試験（3〜5作業日）', 'UIや保存形式を必要に応じ修正。形式変更時は再初期化・再取込み・全件照合を行い、期間を再見積り。', '開発側\n・HS'),
 ('10/27', 'Prod構築直前の確認', '初期仕様、データ、未解決不具合、管理者情報、設定・権限、再現可能な投入手順を確認。HS試験完了が開始条件。', '開発側\n・HS'),
 ('10/28以降', 'Prod構築・本番投入・最終確認', '環境と権限、配備、PITR等の設定・検証後、原資料から本番投入して照合。HS社長による利用開始判断。各日は構築前確認後に設定。', '開発側\n・HS'),
 ('再設定', '本番稼働開始', '従来の10/30は確約しない。上記工程と最終了承を満たして開始日を決める。11月以降への後ろ倒しも含めて調整。', 'HS\n・開発側'),
]
story = [p('HS様 共有用  /  2026年10月9日改訂', small), Spacer(1, 9),
         p('本番稼働に向けた目標スケジュール', ParagraphStyle('title', parent=bold, fontSize=19, leading=27)),
         p('過去データによるDev試験を先行　｜　HS試験運用：2日', bold), Spacer(1, 13)]
notice = Table([[p('本資料は「目標日程」です', bold)],
                [p('各日付は現時点の目標であり、確定した納期・完了日の確約ではありません。')],
                [p('回答・資料提供・確認、または開発・検証等の作業が遅れた場合、その影響に応じて後続作業および本番稼働開始日（納期）も後ろ倒しとなります。変更後の日程はHS様と協議して再設定します。')]], colWidths=[523])
notice.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFF4DE')),('BOX',(0,0),(-1,-1),.6,colors.HexColor('#D8B16A')),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,0),9),('BOTTOMPADDING',(0,-1),(-1,-1),9)]))
story += [notice, Spacer(1, 15)]
data = [[p('目標完了日',white),p('大項目・実施内容',white),p('主担当',white)]]
for date,title,desc,owner in rows:
    data.append([p(date.replace('\n','<br/>'),bold),[p(title,bold),p(desc,small)],p(owner.replace('\n','<br/>'),small)])
table = Table(data, colWidths=[66,383,74], repeatRows=1, hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-2),[colors.white,colors.HexColor('#F0F5F8')]),('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#E3F2F1')),('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#CCD8DF'))]))
story += [table, Spacer(1, 13),p('日程の前提',bold),
          p('土日・祝日を除く案（10/12は祝日）。10/13までに取込条件が確定する前提で、HSの実施日は未合意です。不足情報や保存形式の変更に応じて再調整します。',small),
          Spacer(1,7),p('初期稼働の範囲',bold),
          p('初期対応はCSV出力まで。保証書生成・印刷は後発です。過去データは開発側が一括投入し、HSによる1件ずつの手入力は求めません。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal); canvas.setLineWidth(1); canvas.line(36,31,559,31)
    canvas.setFont('JP',7); canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  Dev試験運用を先行する改訂日程（案）')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='本番稼働に向けた目標スケジュール',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
