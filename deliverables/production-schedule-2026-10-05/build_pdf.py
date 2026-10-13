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

# Remaining work estimates, not measured durations or booked capacity.
estimates=[(1,2),(4,4),(3,4)]
assert sum(x[0] for x in estimates)==8
assert sum(x[1] for x in estimates)==10
start=date(2026,10,14)
workdays=[start+timedelta(days=i) for i in range(9) if (start+timedelta(days=i)).weekday()<5]
assert len(workdays)==7 and len(workdays)*6==42
assert (42-10,42-8)==(32,34)
assert date(2026,10,31).weekday()==5
story=[p('HS様 共有用・調整案  /  2026年10月13日 Prod事前準備後改訂',small),Spacer(1,8),p('10月末納品に向けた目標スケジュール',title),p('10月23日：環境構築目標　｜　10月30日：納品の最終判定',bold),Spacer(1,12),note('現在地と前提','Prod認証・配備・初期化・正式投入・復旧のLocal実装とCI切替準備を実施。実環境の構築・配備・GitHub設定は未実施です。HS試用2日と最終受入日は未合意。実条件が揃う場合の計画であり、完了を確約するものではありません。'),Spacer(1,12)]
rows=[
('10/14〜15','実入力と作業枠の確保','開発・オーナー：既存請求先、希望公開先、GitHub、管理者・通知先を照合。事前構築の実行範囲と承認を確定。'),
('10/16〜20','Prod基盤を先行構築','別承認後、空の基盤・WIF認証・保守表示の初回基準版を実証。3〜4時間の推定。HS試用2日を並行調整。'),
('10/21〜22','統合確認・構築可否判定','開発・HS：実認証・権限・初回基準版・入力・指摘を確認。22日に23日実行の可否を判定する。'),
('10/23','初回アプリ配備・管理者確認','事前構築済み基盤へ受入済み版を配備・照合。閉鎖状態と管理者を確認。別枠3〜4時間。業務開始ではない。'),
('10/26〜27','保護実証・正式投入と設定','最大12時間の枠。原資料から投入・全件照合・読取確認。別了承で設定用の書込みを再開し、会社情報・請求先を設定。取得・通知・復元を実証。'),
('10/28','修正・再確認','6時間の調整枠。設定・CSV・重大指摘を確認。必要な再検証と再受入れを行う。'),
('10/29','HS最終受入れ・引渡し','業務確認、引継ぎ状態、社長の開始了承を確認。HS日程は未合意で、早期の確保が必要。'),
('10/30','月末納品の判定・予備日','必須条件を満たして納品。10/31は土曜のため30日を作業上の最終判定日とする。未受入れを完了扱いにしない。')]
story += [table(['目標日','到達点','担当・条件'],rows,[83,159,281]),Spacer(1,12),note('残工数の見直し：22日まで8〜10時間（推定）','実入力・権限照合1〜2時間、HS試用支援4時間、別承認後の事前構築・認証実証3〜4時間。旧11〜14時間からLocal準備完了分を除外。10/14〜22に集中42時間を確保できる仮定では差32〜34時間ですが、情報待ち・実認証の問題・重大指摘を吸収できる保証ではありません。'),Spacer(1,9),p('月末ラインを維持する条件',bold),p('HS試用は20〜21日まで、最終受入れは29日までを調整目標とします（未合意）。20日に実値・承認・作業枠が未確保なら即報告し、22日に再判定。必須検証や受入れを省いて日付を合わせません。',small),PageBreak(),p('事前構築と、提供前の確認事項',title),p('Localで準備できたことと実環境で残ることを分けます',small),Spacer(1,12)]
rows2=[
('準備済み','認証・配備・接続','明示対象の短期認証、初回保守表示の照合、同一版成果物、画面・FunctionsのProd接続をLocalで検証。実WIF・配備は未実証。'),
('準備済み','CI分離・切替条件','dev→Dev、main→Prodの条件・排他・未設定時の拒否を準備。GitHub変数・保護設定は未変更。作業ブランチのpushは配備対象外。'),
('準備済み','初期化・正式投入・復旧','閉鎖初期化、既存Authの管理者紐付け、空業務領域への投入・再開、バックアップ／復旧の対象照合をLocalで検証。'),
('実環境で実施','基盤・認証・初回基準版','対象と実行範囲の承認後、A・組織なし・既存請求先で事前構築。実ID・権限を読戻し、短期認証と許可外拒否を確認。'),
('提供前に実施','保護・設定・業務受入れ','バックアップ初回成功、Auth退避・通知・復元、正式データ・採番・会社情報・請求先・CSVを確認。HSの最終了承が必要。')]
story += [table(['状態','範囲','到達点と残条件'],rows2,[65,128,330]),Spacer(1,12),p('入力と判断を揃える順序',bold),Spacer(1,6)]
rows3=[
('作成前','本人・回復手段、既存請求先と権限、希望ID・URL、GitHub契約・識別子、通知先。HS管理者情報は受領済み資料から照合。'),
('作成・設定後','project番号、Web／Hosting、別々の配備・運用主体、WIF、2DB・Rules・索引、初回基準版、管理者UID、保護設定と実行権限。'),
('正式投入後','先に会社情報等を登録すると空領域条件に反するため、投入・読取確認・別了承での再開・設定・最終受入れの順。再開だけでは納品完了としない。'),
('提供判定前','Auth実importは未開放。バックアップ設定の結果不明時は自動再実行せず個別回復判断。請求移管が残る場合は担当・期限・暫定運用可否を明示。')]
story += [table(['段階','確認する内容'],rows3,[77,446]),Spacer(1,12),note('残る日程リスク','HS日程・実行承認・実認証と最小権限・初回取得待ち・通知・現行版復元は未確定／未実証です。22日までの成立を条件に23日構築を目指します。10月末の納品ラインは維持しますが、未検証の項目を完了と扱いません。'),Spacer(1,9),p('範囲と根拠',bold),p('初期はCSV出力まで。後発機能を追加せず、Dev試用像を丸ごとコピーしません。根拠は10/13の実装・試験記録、Prod手順・環境仕様・専用ロードマップ。見積りは作業量の推定で、実測時間や予約済み作業枠ではありません。外部共有・実環境操作は今回行っていません。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal); canvas.setLineWidth(1); canvas.line(36,31,559,31)
    canvas.setFont('JP',7); canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  2026/10/13 改訂・調整案（HS日程未合意）')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='本番稼働に向けた目標スケジュール・2026年10月13日改訂',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
