from pathlib import Path
from datetime import date, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/HS_本番稼働に向けた目標スケジュール_2026-10-13.pdf'
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
navy = colors.HexColor('#173A53')
teal = colors.HexColor('#087E8B')
body = ParagraphStyle('body', fontName='JP', fontSize=9, leading=13.5, textColor=navy, wordWrap='CJK')
bold = ParagraphStyle('bold', parent=body, fontName='JPB')
small = ParagraphStyle('small', parent=body, fontSize=8, leading=11.8)
white = ParagraphStyle('white', parent=bold, textColor=colors.white, fontSize=8.5)
title = ParagraphStyle('title', parent=bold, fontSize=18, leading=25)
def p(text, style=body): return Paragraph(text, style)
def table(headers, rows, widths):
    data = [[p(x, white) for x in headers]] + [[p(x, small) for x in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F0F5F8')]),('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#CCD8DF'))]))
    return t
def note(heading, text):
    t = Table([[p(heading,bold)],[p(text,small)]], colWidths=[523])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFF4DE')),('BOX',(0,0),(-1,-1),.6,colors.HexColor('#D8B16A')),('LEFTPADDING',(0,0),(-1,-1),11),('RIGHTPADDING',(0,0),(-1,-1),11),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    return t


# Confirmed delivery dates; protection remains deferred until November 1.
assert date(2026,10,23).weekday()==4
assert date(2026,10,29).weekday()==3 and date(2026,10,30).weekday()==4
assert date(2026,11,1).weekday()==6 and date(2026,11,2).weekday()==0
story=[p('HS様 共有用  /  2026年10月23日改訂',small),Spacer(1,8),
 p('11月2日納品までの作業スケジュール',title),Spacer(1,8),
 note('現在地：Prod構築・正式投入・技術照合は完了',
 '本番アプリ、過去物件442件、マスタ・採番、確定済み会社情報を反映・照合済み。開発者のログインも確認済みです。HS様の最終受入れと保護設定・検証はこれから行います。'),Spacer(1,12)]
rows=[
 ('10/23（金）<br/>完了','本番環境の準備','【開発側】配備・442件の投入・Devとの業務項目照合、管理者登録、会社情報設定、開発者ログイン確認。'),
 ('10/26（月）<br/>〜28（水）','最終受入れの準備','【HS・開発側】HS管理者の初回パスワード設定・ログイン。所在地・連絡先等の最終確認。確認項目・帳票・納品書・運用引継ぎ資料を整理。'),
 ('10/29（木）<br/>・30（金）','HS最終受入れ','【HS主体・開発側支援】現行機能と確定した過去データ取込み仕様で確認。検索・保証・保険報告・請求・CSV／帳票の代表操作を確認し、不具合を是正・再確認。'),
 ('11/1（日）','保護設定・検証','【開発側】Dev／Prodのバックアップ・PITR（過去時点への復旧）・Auth退避を設定。初回取得、失敗通知の到達、復元可能性を確認。'),
 ('11/2（月）','最終判定・納品','【HS・開発側】受入れ結果・未解決事項・保護検証結果を確認。納品書・運用資料・管理情報を引渡し、利用開始の了承と受領を確認。')]
story += [table(['日程','工程','行うべき作業'],rows,[85,109,329]),Spacer(1,12),
 p('納品の確認条件',bold),Spacer(1,5),
 p('① HS管理者がログインできること　② HS最終受入れと重大不具合の解消<br/>③ データ・会社情報・帳票の確認　④ 保護の取得・通知・復元検証<br/>⑤ 納品書・運用連絡先・管理情報の引渡しと利用開始了承',body),Spacer(1,10),
 note('日程と作業範囲の扱い','バックアップ・PITR・Auth退避は11月1日まで保留します。日程記載は自動実行予約ではありません。最終受入れでは大幅な仕様変更を受け付けず、現行機能・確定取込み仕様を確認します。11月1日は指定された日曜作業枠です。未完了・重大不具合が残る場合は、検証を省略せず納品可否を協議します。'),Spacer(1,9),
 p('引渡し資料には、住所自動入力の外部サービス（zipcloud）依存と手入力での対応、運用・障害時の連絡経路を記載します。対応時間・復旧目標などの未確定条件は明確にします。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal);canvas.setLineWidth(1);canvas.line(36,31,559,31)
    canvas.setFont('JP',7);canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  2026/10/23改訂  |  最終納品日：2026/11/2')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='11月2日納品までの作業スケジュール・2026年10月23日改訂',author='株式会社 AIR').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
