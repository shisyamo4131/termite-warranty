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


# Owner-specified HS trial dates. The later release dates are conditional targets.
assert date(2026,10,16).weekday()==4 and date(2026,10,19).weekday()==0
assert [date(2026,10,16)+timedelta(days=i) for i in range(4) if (date(2026,10,16)+timedelta(days=i)).weekday()<5]==[date(2026,10,16),date(2026,10,19)]
assert date(2026,10,23).weekday()==4 and date(2026,10,30).weekday()==4
story=[p('HS様 共有用  /  2026年10月15日改訂',small),Spacer(1,8),p('10月末納品に向けた目標スケジュール',title),p('Dev試行：10月16日（金）・19日（月）の2営業日',bold),Spacer(1,10),note('試行期間と現在地','10月15日に開発側から利用案内を行い、16日・19日にDev環境で試行する計画です。17日・18日の土日は試行日数に含めません。開発側のDev受入れとProd配備・技術照合は完了していますが、HS様の試行・最終受入れと正式利用開始はこれからです。'),Spacer(1,12)]
rows=[
('10/15（木）','試行の利用案内','開発側からDevのURL・ログイン情報・確認事項を案内。ログイン情報は本資料とは別途お伝えします。'),
('10/16（金）','HS試行 1日目','HS：ログイン、検索・一覧・詳細、日常業務の流れとCSV出力を確認。気付いた点を記録し開発側へ共有。'),
('10/19（月）','HS試行 2日目','HS：未確認の業務、帳票用CSV、担当者間の運用を確認。指摘・要望・利用上の支障を集約。'),
('10/20（火）','指摘整理・対応範囲決定','開発・HS：必須修正と後発要望を区別。保存項目・データ構造の変更有無を判断し、修正工数と日程を再確認。'),
('10/21〜22','修正・再試験・構築判定','開発・HS：必要な修正と再確認、管理者・正式投入の入力照合。22日に23日の最終構築可否を判定。'),
('10/23（金）','Prod最終構築確認','先行構築・配備済みの環境を照合し、初期化・管理者・正式投入の準備を確認。通常配備の成功だけで正式利用開始としません。'),
('10/26〜27','提供前保護・正式投入','リリース直前の開始条件と実行了承が揃った場合の仮枠。バックアップ・PITR・Auth退避、取得・通知・復元を検証。確定データ投入・全件照合・設定を実施。'),
('10/28（水）','修正・最終再確認','残る不具合、設定、CSV、引継ぎ事項を確認。必要な再検証を実施。'),
('10/29（木）','HS最終受入れ・引渡し','調整目標日。HSの業務確認、管理引継ぎ、社長の利用開始了承を確認。試行2日間とは別の最終判断です。'),
('10/30（金）','納品判定・予備日','月末納品の目標日。必須条件を満たした場合に完了。10/31（土）に先送りする前提ではありません。')]
story += [table(['日程','工程','担当・確認事項'],rows,[83,139,301]),Spacer(1,12),note('月末納品ラインを維持する条件','試行で判明する重大不具合・データ構造変更は、20日に影響を見直します。22日までに構築条件を揃え、正式提供前の保護検証・正式データ照合・HS最終受入れを完了することが条件です。必須確認を省略して日付だけを合わせません。'),PageBreak(),p('Dev試行の進め方と、納品前の確認',title),Spacer(1,10),p('試行環境',bold),p('URL：<link href="https://termite-warranty-dev.web.app" color="#087E8B">https://termite-warranty-dev.web.app</link><br/>ID・パスワード：開発側から別途案内します。本資料には記載しません。',body),Spacer(1,12)]
rows2=[
('日常業務の一巡','実際の担当者の流れに沿って、検索・一覧・詳細確認、保証・保険・請求に関する画面とCSVを確認します。'),
('入力・更新の確認','試行用と実データを混同しないよう、対象と後片付け方法を開発側と合わせてから実施します。採番を伴う試行も対象を明確にします。'),
('CSVと帳票運用','出力内容・対象件数・日付・項目を確認し、既存書式への取込みや差込みなど、HS側の実作業で支障がないか確認します。'),
('指摘の記録','画面名、操作手順、期待した結果、実際の結果を整理。機密情報を不要に転載せず、業務が止まる問題は試行終了を待たず連絡します。'),
('19日の集約','操作上の不具合・仕様確認・改善要望を分けて共有。20日に納品前必須の対応と後発対応を整理します。')]
story += [table(['確認項目','進め方'],rows2,[107,416]),Spacer(1,12),p('試行後から正式提供まで',bold),Spacer(1,6)]
rows3=[
('すでに確認済み','Dev自動配備、本人のDev業務受入れ、Prod配備と公開後の技術照合。文書だけの変更では、必要な検証を行って配備を省略する手順も整備済み。'),
('これから確認','HS試行の結果、管理者・会社情報・請求先、正式投入データ・採番、最終業務受入れ、管理引継ぎ・利用開始了承。Dev試行後のデータをそのままProdへ複製しません。'),
('リリース直前まで保留','Dev／Prodのバックアップ・PITR・Auth退避等。26〜27日は条件付きの作業枠で、自動的な再開日ではありません。確定したデータ構造で取得・通知・復元を検証してから正式提供します。')]
story += [table(['状態','内容'],rows3,[107,416]),Spacer(1,12),note('開発側の作業枠と再判定','22日までの残作業は従前の6〜9時間の推定枠（運用・管理者1〜3、入力照合1〜2、HS支援4時間）を維持。試行後の未確定修正は別途見積ります。23日3〜4時間、26〜27日12時間、28日6時間は既存の計画枠で、確保済み時間や完了保証ではありません。20日と22日に実際の状況で見直します。'),Spacer(1,10),p('日程の扱い',bold),p('試行2営業日は10月15日のオーナー指定に基づく案内日程です。HSへの案内・実施結果の確認は別途行います。23日構築確認・29日最終受入れ・30日納品判定は条件付き目標で、HSの最終受入日・利用開始了承を取得済みとはしていません。初期提供範囲は既存の合意を維持し、試行中の追加要望は対応範囲と日程への影響を確認して判断します。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal);canvas.setLineWidth(1);canvas.line(36,31,559,31)
    canvas.setFont('JP',7);canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  2026/10/15改訂  |  試行日程反映・納品日は条件付き目標')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='本番稼働に向けた目標スケジュール・2026年10月15日改訂',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
