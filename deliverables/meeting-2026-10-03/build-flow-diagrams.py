from pathlib import Path
from math import atan2, cos, sin, pi
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
import sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf'
pdfmetrics.registerFont(TTFont('JP','C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB','C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
W,H=landscape(A4)
NAVY='#17364B'; TEAL='#087F82'; BLUE='#3457AD'; INK='#263D4A'; MUTED='#5C6E78'; AMBER='#A26313'
def rect(x,y,w,h,fill,stroke=None,r=10):
 c.setFillColor(HexColor(fill)); c.setStrokeColor(HexColor(stroke or fill)); c.setLineWidth(.7); c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
def txt(x,y,s,size=10,color=INK,bold=False):
 c.setFillColor(HexColor(color)); c.setFont('JPB' if bold else 'JP',size); c.drawString(x,H-y-size,s)
def lines(x,y,items,size=10,color=INK,gap=17):
 for i,s in enumerate(items):txt(x,y+i*gap,s,size,color)
def arrow(points,color=MUTED,dash=False):
 c.setStrokeColor(HexColor(color));c.setFillColor(HexColor(color));c.setLineWidth(1.4)
 c.setDash(4,3) if dash else c.setDash()
 p=c.beginPath();p.moveTo(points[0][0],H-points[0][1])
 for x,y in points[1:]:p.lineTo(x,H-y)
 c.drawPath(p);c.setDash()
 x,y=points[-1];a=atan2(y-points[-2][1],x-points[-2][0]);p=c.beginPath();p.moveTo(x,H-y)
 for d in [-.5,.5]:p.lineTo(x-7*cos(a+d),H-(y-7*sin(a+d)))
 p.close();c.drawPath(p,fill=1,stroke=0)
def card(x,y,w,h,title,body,color=TEAL,tag=None):
 rect(x,y+3,w,h,'#E4EAF0');rect(x,y,w,h,'#FFFFFF','#CFDDE4')
 rect(x,y,4,h,color,r=2)
 if tag:txt(x+14,y+12,tag,8,color,True)
 ty=y+(29 if tag else 15);txt(x+14,ty,title,13,color,True)
 lines(x+14,ty+25,body,9.4,gap=16)
def base(name,num,title,sub):
 global c
 c=canvas.Canvas(str(OUT/name),pagesize=(W,H));c.setTitle(title);c.setAuthor('HSシステム開発担当')
 rect(0,0,W,H,'#F6F8FA',r=0);rect(0,0,10,H,TEAL,r=0)
 txt(30,21,'HOUSE SOLUTION  /  業務の全体像',8,TEAL,True)
 txt(30,42,title,23,NAVY,True);txt(31,77,sub,10,MUTED)
 rect(W-94,24,62,27,NAVY,r=13);txt(W-78,31,'図 '+num,11,'#FFFFFF',True)
 c.setStrokeColor(HexColor('#D2DEE5'));c.line(30,31,W-30,31)
 txt(30,H-23,'2026年10月3日 打ち合わせ用  |  現行試作：2026年10月2日時点',7.5,MUTED)
 txt(W-293,H-23,'出典：試作仕様・データ契約  /  A4横・1ページ',7.5,MUTED)
def pending(y,body):
 rect(30,y,W-60,57,'#FFF3DF','#E5C48E')
 txt(43,y+10,'確認中・未実装',9,AMBER,True)
 lines(150,y+10,body,9.3,INK,17)

base('HS_業務フロー図_02_担当者別_2026-10-03.pdf','02','誰が、何をするか','HSが利用環境を整え、工務店が登録・延長。HSは全体を確認して保険報告を準備します。')
for x,n,s in [(92,'01','利用開始'),(332,'02','物件・保証の登録'),(572,'03','運用・延長')]:
 txt(x,110,n,12,TEAL,True);txt(x+29,110,s,12,NAVY,True)
rect(30,142,W-60,128,'#EAF1F9');rect(30,291,W-60,134,'#E7F3F1')
rect(39,154,38,28,BLUE,r=6);txt(47,162,'HS',11,'#FFFFFF',True)
txt(38,192,'全体を',8,BLUE);txt(38,207,'管理',8,BLUE)
rect(39,304,38,28,TEAL,r=6);txt(43,313,'工務店',8,'#FFFFFF',True)
txt(38,344,'本店・',8,TEAL);txt(38,359,'支店',8,TEAL)
card(92,150,218,108,'利用の準備',['工務店・支店・保証グループを設定','担当者ごとのアカウントを発行'],BLUE,'HSの管理者')
card(332,150,218,108,'登録内容を確認',['工務店の登録・延長内容を確認','必要に応じて訂正・対応'],BLUE,'承認待ちを挟まず反映')
card(572,150,218,108,'保険報告の準備',['引渡日期間で一覧・CSVを出力','初回5年の保険満了案内を確認'],BLUE,'保険会社への送付・更新は別途')
card(92,300,218,113,'ログイン・入力開始',['設定メールからパスワードを設定','物件情報を入力し、下書き保存'],TEAL,'工務店の担当者')
card(332,300,218,113,'本登録・採番',['申込日を基準に番号が決まる','引渡日から保証開始／未定なら後日入力'],TEAL,'HSによる都度承認は不要')
card(572,300,218,113,'保証の管理・延長',['引渡日入力後、見本PDFを出力','保証満了案内を確認・10年間延長'],TEAL,'延長しても保証番号は同じ')
arrow([(201,258),(201,300)],BLUE)
arrow([(310,356),(332,356)],TEAL);arrow([(550,356),(572,356)],TEAL)
arrow([(441,300),(441,258)],BLUE);arrow([(550,204),(572,204)],BLUE)
txt(92,428,'本店の全店担当：自社全店  ／  支店担当：所属支店のみ',9,MUTED)
txt(92,446,'保証満了案内は既定2か月前。延長は案内前でも可能です。HSも登録・延長・取消を操作できます。',9,MUTED)
pending(468,['正式保証書の発行・発送と、発行後の取消権限はHSに確認します。','保険の報告済み・保留・更新管理は未実装。CSV保存だけでは報告完了になりません。'])
c.showPage();c.save()

base('HS_業務フロー図_03_物件のライフサイクル_2026-10-03.pdf','03','1つの物件と、変わらない保証番号','本登録で番号を決め、引渡日で保証期間を設定。延長後も同じ番号で履歴をつなぎます。')
rect(30,105,W-60,29,NAVY,r=7);txt(43,113,'事前準備  HSが工務店・支店・保証グループを設定し、工務店担当者のアカウントを発行',10,'#FFFFFF')
xs=[30,230,430,630]
for x,n in zip(xs,['01','02','03','04']):txt(x+3,150,n,13,TEAL,True)
card(30,174,180,113,'下書き',['工務店が物件情報を入力','途中で保存・再開できる','保証番号はまだ付かない'],TEAL)
card(230,174,180,113,'本登録',['申込日を基準に自動採番','申込日は以後変更不可','引渡日未定でも登録可能'],TEAL)
card(430,174,180,113,'保証期間を設定',['引渡日から初回10年','入力済みなら本登録時に設定','未定の場合は後日入力'],TEAL)
card(630,174,180,113,'保証を延長',['工務店が10年単位で手続き','同じ番号・過去の期間を保持','既定上限20年／30年も選択可'],TEAL)
for x in [210,410,610]:arrow([(x,224),(x+20,224)],TEAL)
rect(236,294,568,24,'#DCEFEB',r=6);txt(249,301,'本登録以降、保証番号は恒久的に維持します。延長の時期制限は試作では設けていません。',8.5,TEAL,True)
card(30,340,245,102,'引渡日が未定の間',['「引渡日未設定」として管理','見本PDF出力・延長はまだ不可','入力後に保証期間・満了案内へ反映'],BLUE)
card(296,340,245,102,'引渡日入力後にできること',['見本保証書PDFを出力','HSが引渡日期間で保険CSVを抽出','保証・初回保険の満了案内を確認'],BLUE)
card(562,340,248,102,'取消・復元という分岐',['本登録後：工務店・HSが理由付き取消','番号・履歴は残し、編集は停止','復元はHSのみ／元の番号・期間を維持'], '#805568')
arrow([(230,270),(220,270),(220,327),(153,327),(153,340)],BLUE,True)

pending(465,['現行は工務店も取消可能。正式保証書を渡した後の取消権限は確認中です。','30年保証の条件、5年保証・延長単位、保険更新の運用は未確定。案内は画面表示のみです。'])
c.showPage();c.save()
print('Created 2 one-page A4 landscape PDFs')
