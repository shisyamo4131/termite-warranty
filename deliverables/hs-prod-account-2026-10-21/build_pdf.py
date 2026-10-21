"""Password-free account handover sheet. Never embed a password in this source."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/HS_本番環境管理アカウントのご案内.pdf'
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
W, H = 595.28, 841.89
c = canvas.Canvas(str(OUT), pagesize=(W,H))
c.setTitle('HS 本番環境管理アカウントのご案内')
c.setAuthor('AIR')
navy, teal = '#19344D', '#087F78'
def text(x,y,s,size=11,bold=False,color=navy):
    c.setFillColor(HexColor(color)); c.setFont('JPB' if bold else 'JP',size)
    c.drawString(x,H-y,s)
def para(y,s,size=10):
    p=Paragraph(s,ParagraphStyle('body',fontName='JP',fontSize=size,leading=17,textColor=HexColor(navy),wordWrap='CJK'))
    _,h=p.wrap(507,200);p.drawOn(c,44,H-y-h)
def box(y,h):
    c.setFillColor(HexColor('#F0F5F8'));c.roundRect(36,H-y-h,523,h,8,fill=1,stroke=0)
def link(y,label,url):
    text(44,y,label,10,color='#2467BE')
    c.linkURL(url,(44,H-y-4,551,H-y+12),relative=0)

c.setFillColor(HexColor(teal));c.rect(0,H-8,W,8,fill=1,stroke=0)
text(36,35,'HOUSE SOLUTION  /  本番環境の管理',10,True,teal)
text(36,72,'Googleアカウントのご案内',23,True)
text(36,99,'ハウスソリューション ご担当者様',11)
text(36,122,'作業予定日：2026年10月23日（金）',12,True)
para(137,'本番環境の請求先アカウント切り替えに使用するGoogleアカウントです。<br/>当日は、以下のIDとパスワードでGoogle Cloudへログインしてください。')

box(187,175)
text(50,211,'ログインID（メールアドレス）',10,True)
text(50,238,'hs.system.admin2026@gmail.com',16,True)
text(50,269,'パスワード',10,True)
text(145,269,'※ お渡しする前に記入します',9,color='#526778')
c.acroForm.textfield(name='password',tooltip='Password',x=50,y=H-326,width=495,height=41,
    value='',fontName='Helvetica',fontSize=12,borderWidth=1,borderColor=HexColor('#BBCAD6'),
    fillColor=HexColor('#FFFFFF'),textColor=HexColor(navy),forceBorder=True)
text(50,346,'この欄はPDF上で入力できます。印刷して手書きすることも可能です。',9,color='#526778')

text(36,392,'対象の本番環境',13,True)
text(44,418,'プロジェクト名：TermiteWarranty Prod',11)
text(44,440,'プロジェクトID：termite-warranty-prod',11)
link(465,'Google Cloudを開く： https://console.cloud.google.com/', 'https://console.cloud.google.com/')
para(478,'右上のアカウントが上記IDであることと、選択したプロジェクトが上記IDであることを確認してください。業務アプリのログイン情報とは別の、環境管理用アカウントです。')

text(36,541,'当日の準備と確認',13,True)
para(555,'1. 請求先として登録する会社情報・住所・連絡先・支払方法をご用意ください。<br/>2. ログイン時に追加の本人確認を求められた場合は、画面の案内に従ってください。<br/>3. 請求先の登録と、Prodへの関連付け変更を行い、切替先を確認します。')
para(615,'詳しい操作は、別紙「HS_GoogleCloud_請求先とカードの登録手順.pdf」を参照してください。請求先の登録だけで、Prodの請求先が切り替わったとは判断しません。',10)

box(671,90)
text(50,693,'アカウント情報の取扱い',11,True)
para(704,'パスワード記入後の資料は、管理を担当する方の間で保管してください。<br/>請求先の切り替えと、業務データの正式投入・利用開始は別の作業です。')
text(36,806,'2026年10月21日作成  |  アカウント情報連絡票（納品書とは別紙）',8,color='#526778')
text(530,806,'1 / 1',9,color='#526778')
c.showPage();c.save()
print(OUT)
