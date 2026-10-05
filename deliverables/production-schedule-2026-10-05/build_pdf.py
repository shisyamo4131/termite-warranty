from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/HS_本番稼働に向けた目標スケジュール_2026-10-05.pdf'
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
 ('10/9', '残仕様・本番準備事項の確認', 'フォームへの回答、HS管理者名・メールアドレスの決定、本番環境設定の日程調整。', 'HS'),
 ('10/13', '過去データ・帳票資料の確定', '不足情報・不明点の解消、UHの引渡日等の補完、保証書のWord差し込み項目の確定。', 'HS・開発側'),
 ('10/16', '初期稼働に必要な機能の完成', '回答に基づく改修、保証書用CSV、過去データ登録の準備、検索・採番・期間計算等の検証。', '開発側'),
 ('10/20', '本番環境の構築', 'HS所有の環境・開発者権限・料金設定、管理者アカウント、バックアップ・障害時対応の準備。', '開発側・HS'),
 ('10/22', '過去データの取込み予行・業務確認', '過去番号を保持した登録と照合。登録・延長・取消・保険報告・請求・保証書印刷を一巡。', '開発側・HS'),
 ('10/26', 'HSによる最終確認・操作説明', '実際の担当者が操作し、一覧・CSV・印刷結果を確認。指摘事項を整理して修正。', 'HS・開発側'),
 ('10/28', '本番への初期データ登録・照合', '確認期間中の追加・訂正分を反映して本番へ登録。HSが登録結果を照合・了承。', '開発側・HS'),
 ('10/29', '稼働開始の最終判断', '重大な不具合、初期データ、ログイン、問い合わせ先・障害時対応を確認し、開始を承認。', 'HS社長\n・開発側'),
 ('10/30', '本番稼働開始', 'HSによる通常の登録・更新業務を開始。開発側が初日の動作を確認。', 'HS・開発側'),
]
story = [p('HS様 共有用  /  2026年10月5日作成', small), Spacer(1, 9),
         p('本番稼働に向けた目標スケジュール', ParagraphStyle('title', parent=bold, fontSize=19, leading=27)),
         p('起算日：2026年10月5日　｜　本番稼働開始目標：2026年10月30日', bold), Spacer(1, 13)]
notice = Table([[p('本資料は「目標日程」です', bold)],
                [p('各日付は現時点の目標であり、確定した納期・完了日の確約ではありません。')],
                [p('回答・資料提供・確認、または開発・検証等の作業が遅れた場合、その影響に応じて後続作業および本番稼働開始日（納期）も後ろ倒しとなります。変更後の日程はHS様と協議して再設定します。')]], colWidths=[523])
notice.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFF4DE')),('BOX',(0,0),(-1,-1),.6,colors.HexColor('#D8B16A')),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,0),9),('BOTTOMPADDING',(0,-1),(-1,-1),9)]))
story += [notice, Spacer(1, 15)]
data = [[p('目標完了日',white),p('大項目・実施内容',white),p('主担当',white)]]
for date,title,desc,owner in rows:
    data.append([p(date,bold),[p(title,bold),p(desc,small)],p(owner.replace('\n','<br/>'),small)])
table = Table(data, colWidths=[66,383,74], repeatRows=1, hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-2),[colors.white,colors.HexColor('#F0F5F8')]),('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#E3F2F1')),('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#CCD8DF'))]))
story += [table, Spacer(1, 13),p('日程を左右する直近のお願い',bold),
          p('10/9までの回答・管理者情報の決定と、10/13までの不足データ補完をお願いします。本番環境の準備は改修と並行して進めます。',small),
          Spacer(1,7),p('初期稼働の範囲',bold),
          p('HS側で入力し、保証書・請求書はCSVを利用してHS側で作成します。工務店ポータルの利用開始などの後発事項は、今回の稼働条件に含めません。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal); canvas.setLineWidth(1); canvas.line(36,31,559,31)
    canvas.setFont('JP',7); canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  2026年10月末稼働に向けた目標日程（案）')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='本番稼働に向けた目標スケジュール',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
