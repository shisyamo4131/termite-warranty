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
estimates=[(1,3),(1,2),(4,4)]
assert sum(x[0] for x in estimates)==6
assert sum(x[1] for x in estimates)==9
start=date(2026,10,14)
workdays=[start+timedelta(days=i) for i in range(9) if (start+timedelta(days=i)).weekday()<5]
assert len(workdays)==7 and len(workdays)*6==42
assert (42-9,42-6)==(33,36)
assert date(2026,10,31).weekday()==5
story=[p('HS様 共有用・調整案  /  2026年10月14日 自動配備完成・保護延期を反映',small),Spacer(1,8),p('10月末納品に向けた目標スケジュール',title),p('10月23日：環境構築目標　｜　10月30日：納品の最終判定',bold),Spacer(1,12),note('現在地と前提','mainへのpushから通常アプリの配備・公開後照合まで成功しました。Hostingは期待・一覧・集計の1005件が一致。日次バックアップ・PITR・Auth退避先は解除済みで、HS試行後のスキーマ確認まで再設定を延期します。HS試用2日と最終受入日は未合意です。'),Spacer(1,12)]
rows=[
('10/14〜15','自動配備完成・残確認','開発：集計未返却だけの待機を修正し、実main pushで配備・全5項目照合に成功。以後は運用認証・管理者・構築入力の残確認へ。'),
('10/16〜20','自動配備・入力・HS試用','main更新の正常配備は確認済み。許可外条件・構築入力を整理。保護設定は試行後のスキーマ確認を待つ。HS試用2日を並行調整。'),
('10/21〜22','統合確認・構築可否判定','開発・HS：実認証・権限・初回基準版・入力・指摘を確認。22日に23日実行の可否を判定する。'),
('10/23','最終構築・管理者確認','先行配備済みなら再配備せず現行版を照合。閉鎖初期化・管理者を確認。別枠3〜4時間。保護はHS試行後のスキーマ確認を経て後発対応とし、提供前に検証する。'),
('10/26〜27','保護実証・正式投入と設定','最大12時間の枠。原資料から投入・全件照合・読取確認。別了承で設定用の書込みを再開し、会社情報・請求先を設定。取得・通知・復元を実証。'),
('10/28','修正・再確認','6時間の調整枠。設定・CSV・重大指摘を確認。必要な再検証と再受入れを行う。'),
('10/29','HS最終受入れ・引渡し','業務確認、引継ぎ状態、社長の開始了承を確認。HS日程は未合意で、早期の確保が必要。'),
('10/30','月末納品の判定・予備日','必須条件を満たして納品。10/31は土曜のため30日を作業上の最終判定日とする。未受入れを完了扱いにしない。')]
story += [table(['目標日','到達点','担当・条件'],rows,[83,159,281]),Spacer(1,12),note('残工数の見直し：22日まで6〜9時間（推定）','自動配備の調査・修正・実push検証3〜5時間を完了し、9〜14時間から更新。残りは運用認証／管理者1〜3、入力1〜2、HS支援4時間。集中42時間の仮定なら余力33〜36時間。後半の保護・正式投入、外部待ち、未確定のスキーマ変更は別枠です。'),Spacer(1,9),p('月末ラインを維持する条件',bold),p('HS試用は20〜21日まで、最終受入れは29日までを調整目標とします（未合意）。20日に実値・承認・作業枠が未確保なら即報告し、22日に再判定。必須検証や受入れを省いて日付を合わせません。',small),PageBreak(),p('事前構築と、提供前の確認事項',title),p('準備済み・実証済み・未実施を分けます',small),Spacer(1,12)]
rows2=[
('設定・読戻し済み','基盤・通常配備IAM','2DB・Web／Hosting・メール認証・実行主体と限定権限を設定。既定SAのEditorを除去。承認後にCloud Billing APIも有効化。業務データは未投入。'),
('公開・自動照合済み','通常アプリ・運用認証','実main pushで包括CI・配備・直後の全5項目照合が成功。21 Functions・2DB Rules・22索引・Hostingが一致。運用WIFで2DB読取りも成功。初期化・管理者確認は未完了。'),
('準備済み','初期化・正式投入・復旧','閉鎖初期化、既存Authの管理者紐付け、空業務領域への投入・再開、バックアップ／復旧の対象照合をLocalで検証。'),
('修正・実証済み','公開直後のCI照合','今回の失敗は集計値の未返却。全件一致を維持し、集計未返却だけ待機を延長。修正後は2回目の確認で1005件一致。未記録の過去失敗まで同じ原因と断定しない。'),
('提供前に実施','保護・設定・業務受入れ','バックアップ初回成功、Auth退避・通知・復元、正式データ・採番・会社情報・請求先・CSVを確認。HSの最終了承が必要。')]
story += [table(['状態','範囲','到達点と残条件'],rows2,[65,128,330]),Spacer(1,12),p('入力と判断を揃える順序',bold),Spacer(1,6)]
rows3=[
('公開後の判断','通常アプリは実pushの配備・直後CI照合とも成功。自動配備を有効で維持。保守基準版は保持。保守表示への戻しだけではFunctions・DBは戻らない。'),
('構築判定前','設定済み運用／Functions主体の実認証、2DBのRules・索引、保守基準版、管理者UIDを照合。解除した保護設定はHS試行後のスキーマ確認まで再開しない。初期化・保護の権限は別途確定する。'),
('正式投入後','先に会社情報等を登録すると空領域条件に反するため、投入・読取確認・別了承での再開・設定・最終受入れの順。再開だけでは納品完了としない。'),
('提供判定前','Auth実importは未開放。バックアップ設定の結果不明時は自動再実行せず個別回復判断。請求移管が残る場合は担当・期限・暫定運用可否を明示。')]
story += [table(['段階','確認する内容'],rows3,[77,446]),Spacer(1,12),note('残る日程リスク','HS日程・スキーマ変更の内容・保護の再開時期と実証は未確定です。22日までに構築条件を揃えます。保護はHS試行後に再設定し、提供前の初回取得・通知・復元確認を完了する必要があります。スキーマ変更の規模次第で追加工数を再評価します。'),Spacer(1,9),p('範囲と根拠',bold),p('初期はCSV出力まで。後発機能を追加せず、Dev試用像を丸ごとコピーしません。根拠は10/14の実main配備・解除記録、Prod手順・環境仕様・専用ロードマップ。見積りは作業量の推定で、実測時間や予約済み作業枠ではありません。本資料の外部共有は未実施。通常アプリは公開済みですが、初期化・正式投入・業務利用は開始していません。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal); canvas.setLineWidth(1); canvas.line(36,31,559,31)
    canvas.setFont('JP',7); canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  2026/10/14 改訂・調整案（HS日程未合意）')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='本番稼働に向けた目標スケジュール・2026年10月14日改訂',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
