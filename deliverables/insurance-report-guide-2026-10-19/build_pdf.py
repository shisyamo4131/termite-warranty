"""HS/AriLabo向け現行仕様説明。実データ・外部接続は使用しない。"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/保険報告一覧_抽出方法のご案内_2026-10-19.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
W, H = 842, 595
c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle('保険報告用一覧 - 抽出方法と過去の未報告分の確認')
c.setAuthor('AIR')
NAVY, TEAL, GRAY = '#17334D', '#06786C', '#536574'

def text(x, y, s, size=12, color=NAVY, bold=False):
    c.setFillColor(HexColor(color)); c.setFont('JPB' if bold else 'JP', size)
    c.drawString(x, H-y, s)

def box(x, y, w, h, fill, stroke=None):
    c.setFillColor(HexColor(fill))
    c.setStrokeColor(HexColor(stroke or fill))
    c.roundRect(x, H-y-h, w, h, 8, fill=1, stroke=bool(stroke))

def base(n, title, sub):
    box(0, 0, W, 9, TEAL)
    text(36, 43, 'HS・AriLabo向け ｜ 現行仕様のご説明', 11, TEAL, True)
    text(36, 80, title, 25, bold=True)
    text(36, 107, sub, 12, GRAY)
    text(36, 568, '2026年10月19日 ｜ 10月12日採用仕様・10月19日オーナー確認に基づく', 9, GRAY)
    text(762, 568, f'{n} / 2', 10, GRAY)

def check(x, y, checked):
    c.setStrokeColor(HexColor(TEAL)); c.setLineWidth(1.6)
    c.rect(x, H-y-16, 16, 16, fill=0, stroke=1)
    if checked:
        p=c.beginPath(); p.moveTo(x+3,H-y-8); p.lineTo(x+7,H-y-12); p.lineTo(x+14,H-y-3); c.drawPath(p)

base(1, 'チェックの有無で、抽出期間も変わります', '例：対象年月に「2026年10月」を指定 → 基準は前月の「2026年9月」')
for x, checked, title, desc, fill in [(36,False,'過去の未報告分も確認','前月以前 × 未報告','#EAF5F2'),(429,True,'前月分を確認・再出力','前月限定 × 未報告＋報告済み','#EEF3F9')]:
    box(x, 129, 377, 113, fill)
    check(x+18,145,checked); text(x+44,159,'報告済みを含める',14,bold=True)
    text(x+18,191,title,17,bold=True); text(x+18,222,desc,14,TEAL,True)
text(36,272,'新規分の例（下表の月は引渡月／すべて架空の物件）',12,bold=True)
xs=[36,275,429,623]; widths=[239,154,194,183]
headers=['物件・引渡月','報告状態','チェックなし','チェックあり']
for x,w,s in zip(xs,widths,headers):
    box(x,286,w-2,32,NAVY); text(x+12,307,s,12,'#FFFFFF',True)
rows=[('A：8月以前','未報告','表示する','表示しない'),('B：9月','未報告','表示する','表示する'),('C：9月','報告済み','表示しない','表示する'),('D：10月以降','未報告','表示しない','表示しない')]
for i,row in enumerate(rows):
    y=321+i*36
    box(36,y,770,33,'#F1F5F7' if i%2==0 else '#FFFFFF')
    for x,s in zip(xs,row): text(x+12,y+22,s,12,TEAL if s=='表示する' else NAVY,bold=s=='表示する')
box(36,476,770,45,'#FFF2D9')
text(50,504,'「含める」にしても、過去分が外れるため件数が減ることがあります。',15,bold=True)
text(36,542,'更新分は直前の保険期間の満了月が基準。報告不要など、既存の対象外条件は維持します。',10,GRAY)
c.showPage()
base(2, '過去に登録された未報告分を、見落とさないために', '過去の申込分・引渡分も登録できるため、前月だけでは拾えない未報告が生じ得ます。')
box(36,132,215,116,'#EEF3F9'); text(52,158,'架空の例',11,TEAL,True)
text(52,190,'8月に引渡し',19,bold=True); text(52,220,'10月に登録・まだ未報告',12)
text(265,195,'→',26,TEAL,True)
box(308,132,498,116,'#EAF5F2')
text(326,159,'対象年月：10月',13,bold=True)
text(326,192,'チェックなし → 過去の未報告として表示',15,TEAL,True)
text(326,225,'チェックあり → 9月限定なので表示しない',14)
text(36,278,'この機能を設けた理由',15,bold=True)
text(36,304,'過去物件の未報告分を抽出・確認する機能が必要と判断したためです。',13)
text(36,327,'月ごとの確認に加え、過去に遡って未報告を見つけられるようにしています。',13)
text(36,362,'抽出・CSV出力と「報告済みにする」は別の操作です',15,bold=True)
steps=[('1  抽出・選択','対象と件数を確認'),('2  CSV出力','報告状態は変わらない'),('3  保険会社へ報告','システム外の業務'),('4  報告済みにする','選択対象を確認して記録')]
for i,(a,b) in enumerate(steps):
    x=36+i*198; box(x,379,177,64,'#EEF3F9'); text(x+10,403,a,12,bold=True); text(x+10,428,b,10)
    if i<3: text(x+180,416,'→',15,TEAL)
box(36,462,770,73,'#FFF2D9')
text(50,485,'CSVの「保険申込」欄は、現行仕様では空欄です。',14,bold=True)
text(50,508,'画面の報告状態とは別です。印を出す変更は、仕様の確認後に判断します。',11)
text(50,526,'チェックの切替やCSV出力だけで、報告状態が書き換わることはありません。',10)
c.showPage(); c.save()
print(OUT)
