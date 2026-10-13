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

# Planning estimates, not measured implementation durations.
estimates=[(3,4),(7,10),(4,6),(4,6),(6,8),(4,6)]
assert sum(x[0] for x in estimates)==28
assert sum(x[1] for x in estimates)==40
assert (28+4,40+4)==(32,44)
start=date(2026,10,14)
workdays=[start+timedelta(days=i) for i in range(9) if (start+timedelta(days=i)).weekday()<5]
assert len(workdays)==7 and len(workdays)*6==42
assert date(2026,10,31).weekday()==5
story=[p('HS様 共有用・調整案  /  2026年10月13日 棚卸し後改訂',small),Spacer(1,8),p('10月末納品に向けた目標スケジュール',title),p('10月23日：環境構築目標　｜　10月30日：納品の最終判定',bold),Spacer(1,12),note('現在地と前提','Dev442物件の投入・開発側受入れは完了。Prod対応の棚卸しと手順整理を実施しました。実装・構築は未着手、HS試用日・最終受入日は未合意です。以下は必要な作業枠と確認が得られる場合の条件付き計画です。'),Spacer(1,12)]
rows=[
('10/14〜15','認証・配備の難所を先行','開発：自動認証、配備切替、初回公開の照合方式を優先。着手承認と既存請求先・GitHub等の情報を確認。'),
('10/16・19〜20','環境・初期化・復旧の対応','開発：既存処理を再利用し必要箇所を改修・検証する枠。HSの2日間試用を並行調整し、開発側の支援時間を確保。'),
('10/21〜22','統合検証・構築可否判定','開発・HS：指摘の優先対応、必要な検証、実情報・手順・実行承認を確認。この2日も事前対応工数の内数。'),
('10/23','Prod構築・初回配備','開発：環境・認証・成果物・管理者の確認と保護設定。別に6〜8時間を推定。実認証や索引準備が不成立なら未完了。'),
('10/26〜27','保護実証・本番投入照合','開発・HS：12時間の作業枠。バックアップ初回成功・通知・復元、正式データ・採番の一致、管理引継ぎを確認。'),
('10/28','修正・影響範囲の再確認','開発・HS：6時間の修正・調整枠。重大な不具合をこの日まで放置せず、判明時点で対応を判断。'),
('10/29','HS最終受入れ・引渡し','HS・開発：業務確認、管理引継ぎ状態、社長の開始了承を確認。日程の確保が必要。'),
('10/30','月末納品の最終判定・予備日','必要条件を満たして納品。10/31は土曜のため30日を作業上の最終判定日とする。未受入れを完了扱いにしない。')]
story += [table(['目標日','到達点','担当・条件'],rows,[83,159,281]),Spacer(1,12),note('23日の構築は条件付きで狙えますが、未確約です','事前対応28〜40時間＋HS試用支援・小修正4時間＝32〜44時間の推定。10/14〜22の7営業日×集中6時間＝42時間で、上限は2時間超過します。実測工数ではありません。Cloud待ち・重大指摘は別途再評価します。'),Spacer(1,9),p('月末ラインを守るための調整',bold),p('HS試用2日は遅くとも10/20〜21、最終受入れは29日までを調整目標とします（未合意）。実装着手、開発作業枠、必要情報を早期に確保し、15日・20日・22日に進み方を再判定します。必須検証を省いて日付を合わせません。',small),Spacer(1,6),p('旧11/4〜13は全工程を順番に実施する試算でした。現行計画では採用せず、HS試用との並行調整と既存実装の再利用により、10月末納品を目指します。',small),PageBreak(),p('棚卸し結果と、構築までの進め方',title),p('今回確認した不足と、今後の改修・検証計画',small),Spacer(1,12)]
rows2=[
('最優先','認証・正式配備照合','独自ツールは人のFirebaseログインを要求。自動認証への対応が必要。初回Hostingは過去公開版がないため、基準版を作る手順も具体化する。'),
('最優先','配備設定と検証契約','現状は手動Dev配備のみ。dev→Dev、受入済みmain→Prod、失敗時停止、同時配備防止と同一版照合を組み込む。'),
('次に','画面・Functionsの環境判定','Dev固定の接続・診断・実行判定を対応。Local／Devは維持し、未設定や未知のProdを拒否する。'),
('次に','初期化・管理者・正式投入','初期化の内部処理はあるがCloud実行入口が不足。空状態確認と安全な再開を用意し、既存の投影・採番・設定保全・照合処理を再利用。'),
('次に','復旧・Auth退避・保護','Dev固定の復旧先・私有保管先を対象化。バックアップ・監視の既存処理を使い、実取得・通知・復元で検証する。'),
('最後に','統合検証・Dev差分確認','対象外拒否、既存動作、初回公開、復元、資格情報の混入防止を検証。実Prodでしか確認できない項目は当日の残検査として明示。')]
story += [table(['優先','対応範囲','確認できた事実と必要作業'],rows2,[49,144,330]),Spacer(1,12),p('実環境の情報が必要になる段階',bold),Spacer(1,6)]
rows3=[
('作成前','開発者本人・回復手段、既存請求先と権限、GitHub契約・repository情報、希望公開先、通知先を照合。HS管理者情報の再提出は求めない。'),
('作成・設定後','Prodの実ID・番号、Web／Hosting、配備・実行主体、WIFを照合。2DB・Rules・索引・初期状態・配備内容・管理者を確認。'),
('提供前','バックアップ初回成功・通知・復元互換性、正式データ・採番、HS受入れ・開始了承を確認。請求移管が残る場合は担当・期限・暫定運用可否を明示判断。')]
story += [table(['段階','具体的な確認'],rows3,[77,446]),Spacer(1,12),note('先送りしない条件・日程のリスク','自動認証と独自ツールの組合せ、初回配備、GitHub保護の契約条件、初回バックアップ、請求移管、HS日程は未実証・未確定です。22日までの準備不成立や重大指摘が判明した時点で報告し、必要な判断を行います。期限だけを理由に完了条件は緩めません。'),Spacer(1,9),p('対象を絞って月末を守ります',bold),p('旧データ用の移行ツールやDevのデモ投入を一律Prod化しません。初期はCSV出力まで。ポータル再開、保証書生成・印刷、利用説明資料などの後発機能を追加しません。新Prodは確定原資料から投入し、Dev試用中の状態を丸ごとコピーしません。',small),Spacer(1,7),p('根拠：10/13の実ソース棚卸し、既存Prod構築手順・環境仕様・検証方針。工数は再利用範囲からの推定で、実装・構築の成功を示す資料ではありません。',small)]
def footer(canvas,doc):
    canvas.setStrokeColor(teal); canvas.setLineWidth(1); canvas.line(36,31,559,31)
    canvas.setFont('JP',7); canvas.setFillColor(navy)
    canvas.drawString(36,19,'白蟻保証業務システム  |  2026/10/13 改訂・調整案（HS日程未合意）')
    canvas.drawRightString(559,19,str(doc.page))
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=30,bottomMargin=43,title='本番稼働に向けた目標スケジュール・2026年10月13日改訂',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
