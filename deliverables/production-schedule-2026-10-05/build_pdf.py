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
estimates=[(3,5),(1,3),(1,2),(4,4)]
assert sum(x[0] for x in estimates)==9
assert sum(x[1] for x in estimates)==14
start=date(2026,10,14)
workdays=[start+timedelta(days=i) for i in range(9) if (start+timedelta(days=i)).weekday()<5]
assert len(workdays)==7 and len(workdays)*6==42
assert (42-14,42-9)==(28,33)
assert date(2026,10,31).weekday()==5
story=[p('HS様 共有用・調整案  /  2026年10月13日 初回通常配備停止後改訂',small),Spacer(1,8),p('10月末納品に向けた目標スケジュール',title),p('10月23日：環境構築目標　｜　10月30日：納品の最終判定',bold),Spacer(1,12),note('現在地と前提','Prodの空基盤・保守公開に加え、通常配備IAM・運用専用認証・build基盤を設定し読戻し済み。通常アプリは包括CI成功後にmainへ統合済み。運用SAの2DB読取りも実証。初回配備の権限不足を解消後、索引22件を作成。Cloud Billing API未有効で再停止し、自動配備を解除。API先行有効化・再配備照合が残ります。バックアップ保護は本人指示で保留中。HS試用2日と最終受入日は未合意。'),Spacer(1,12)]
rows=[
('10/14〜15','CI・運用認証・配備検証','開発：main統合・包括検証・認証は成功。既定SAの追加IAMも適用。API先行有効化の承認後、同じ検証済み成果物で再配備・照合。'),
('10/16〜20','自動配備・入力・HS試用','main更新から正常配備されることを確認。許可外条件・構築入力・保護設定の再開判断を整理。HS試用2日を並行調整。'),
('10/21〜22','統合確認・構築可否判定','開発・HS：実認証・権限・初回基準版・入力・指摘を確認。22日に23日実行の可否を判定する。'),
('10/23','最終構築・管理者確認','先行配備済みなら再配備せず現行版を照合。閉鎖初期化・管理者・保護設定を確認。別枠3〜4時間。保護が保留のままなら構築完了にしない。'),
('10/26〜27','保護実証・正式投入と設定','最大12時間の枠。原資料から投入・全件照合・読取確認。別了承で設定用の書込みを再開し、会社情報・請求先を設定。取得・通知・復元を実証。'),
('10/28','修正・再確認','6時間の調整枠。設定・CSV・重大指摘を確認。必要な再検証と再受入れを行う。'),
('10/29','HS最終受入れ・引渡し','業務確認、引継ぎ状態、社長の開始了承を確認。HS日程は未合意で、早期の確保が必要。'),
('10/30','月末納品の判定・予備日','必須条件を満たして納品。10/31は土曜のため30日を作業上の最終判定日とする。未受入れを完了扱いにしない。')]
story += [table(['目標日','到達点','担当・条件'],rows,[83,159,281]),Spacer(1,12),note('残工数の見直し：22日まで9〜14時間（推定）','統合CI・通常配備3〜5、運用認証1〜3、入力照合1〜2、HS支援4時間。API先行有効化・再配備確認を配備枠に含め、停止前の9〜14時間を減らさず維持。集中42時間を確保する仮定では余力28〜33時間。保護・正式投入の後半工程は別枠です。'),Spacer(1,9),p('月末ラインを維持する条件',bold),p('HS試用は20〜21日まで、最終受入れは29日までを調整目標とします（未合意）。20日に実値・承認・作業枠が未確保なら即報告し、22日に再判定。必須検証や受入れを省いて日付を合わせません。',small),PageBreak(),p('事前構築と、提供前の確認事項',title),p('準備済み・実証済み・未実施を分けます',small),Spacer(1,12)]
rows2=[
('設定・読戻し済み','空基盤・通常配備IAM','2DB・Web／Hosting・メール認証・6 API・3実行主体を準備。配備／業務／運用の限定権限を設定。buildのEditorを除去。実データ・アプリ配備なし。'),
('統合・読取実証済み','CI・アプリ・運用認証','PR #8は包括CI成功後にmainへ統合。単体476・Rules201成功。専用WIFで2DBのSDK読取り成功。索引22件を作成後、API未有効で再停止。初期化・公開・main更新配備は未完了。'),
('準備済み','初期化・正式投入・復旧','閉鎖初期化、既存Authの管理者紐付け、空業務領域への投入・再開、バックアップ／復旧の対象照合をLocalで検証。'),
('公開・照合済み','保守基準版と残確認','保守HTML、3ファイル、期待hash、配信設定、Web構成を確認。初回CI失敗は調査終了、タイムラグ扱い（原因未実証）。通常配備enableも解除済み。保守版維持を独立確認。'),
('提供前に実施','保護・設定・業務受入れ','バックアップ初回成功、Auth退避・通知・復元、正式データ・採番・会社情報・請求先・CSVを確認。HSの最終了承が必要。')]
story += [table(['状態','範囲','到達点と残条件'],rows2,[65,128,330]),Spacer(1,12),p('入力と判断を揃える順序',bold),Spacer(1,6)]
rows3=[
('公開後の判断','保守表示は10/13公開・独立照合済み。CI・監査記録では失敗箇所を特定できず、本人指示でタイムラグ扱いとして調査終了。原因は未実証。以後はこの保守版を戻し先にする。'),
('構築判定前','設定済み運用／Functions主体の実認証、2DBのRules・索引、保守基準版、管理者UIDを照合。保留中の保護設定は再開指示が必要。初期化・保護の権限は別途確定する。'),
('正式投入後','先に会社情報等を登録すると空領域条件に反するため、投入・読取確認・別了承での再開・設定・最終受入れの順。再開だけでは納品完了としない。'),
('提供判定前','Auth実importは未開放。バックアップ設定の結果不明時は自動再実行せず個別回復判断。請求移管が残る場合は担当・期限・暫定運用可否を明示。')]
story += [table(['段階','確認する内容'],rows3,[77,446]),Spacer(1,12),note('残る日程リスク','HS日程・API先行有効化・通常アプリ再配備・保護の再開時期・初回取得／通知／復元は未確定または未実証です。22日までに構築条件を揃え、23日までに保護を設定する必要があります。目標日は維持しますが、延期したままの保護を完了扱いにしません。'),Spacer(1,9),p('範囲と根拠',bold),p('初期はCSV出力まで。後発機能を追加せず、Dev試用像を丸ごとコピーしません。根拠は10/13の実装・試験記録、Prod手順・環境仕様・専用ロードマップ。見積りは作業量の推定で、実測時間や予約済み作業枠ではありません。本資料の外部共有は未実施。実環境では承認された保守表示のみ公開し、業務利用は開始していません。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal); canvas.setLineWidth(1); canvas.line(36,31,559,31)
    canvas.setFont('JP',7); canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  2026/10/13 改訂・調整案（HS日程未合意）')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='本番稼働に向けた目標スケジュール・2026年10月13日改訂',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
