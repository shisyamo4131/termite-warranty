"""Generate the account handover sheet. Never put a password in this source."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/Googleアカウント_納品書.pdf'
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
W, H = 595.28, 841.89
c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle('Googleアカウント 納品書')
c.setAuthor('株式会社 AIR')
navy, teal, muted = '#19344D', '#087F78', '#526778'

def text(y, value, size=10, bold=False, x=40, color=navy):
    c.setFillColor(HexColor(color))
    c.setFont('JPB' if bold else 'JP', size)
    c.drawString(x, H-y, value)

def para(y, value, size=9.5, width=515):
    p = Paragraph(value, ParagraphStyle('body', fontName='JP', fontSize=size,
        leading=15, textColor=HexColor(navy), wordWrap='CJK'))
    _, height = p.wrap(width, 200)
    p.drawOn(c, 40, H-y-height)

c.setFillColor(HexColor(teal)); c.rect(0, H-7, W, 7, fill=1, stroke=0)
text(43, 'Googleアカウント 納品書', 23, True)
text(74, '株式会社ハウスソリューション 御中', 12, True)
text(97, '納品日：2026年11月2日（月）', 10)
text(97, '作成・引渡し担当：株式会社 AIR', 10, x=335)
para(112, '本番環境の管理に使用するGoogleアカウントを、下記のとおりお渡しします。')

c.setFillColor(HexColor('#F0F5F8'))
c.roundRect(32, H-303, 531, 153, 7, fill=1, stroke=0)
text(173, 'ログインID（メールアドレス）', 10, True, x=46)
text(200, 'hs.system.admin2026@gmail.com', 17, True, x=46)
text(228, 'パスワード', 10, True, x=46)
c.acroForm.textfield(name='password', tooltip='Password', x=46, y=H-278,
    width=503, height=35, value='', fontName='Helvetica', fontSize=12,
    borderWidth=1, borderColor=HexColor('#BBCAD6'), fillColor=HexColor('#FFFFFF'),
    textColor=HexColor(navy), forceBorder=True)
text(293, '※ 引渡し担当者が記入します。PDFへの入力・印刷後の手書きが可能です。', 8, x=46, color=muted)

text(330, '用途・対象環境', 12, True)
para(340, '用途：Google Cloud／Firebaseの本番環境管理、請求関連の管理、管理用メール受信。<br/>対象：TermiteWarranty Prod　／　プロジェクトID：termite-warranty-prod<br/>権限：対象プロジェクトのオーナー（付与・管理画面へのアクセス確認済み）。')
para(392, '<b>業務システムにログインする業務用管理者アカウントとは別です。</b>')

text(430, 'ログイン先', 12, True)
for y, label, url in [(451, 'Google Cloud', 'https://console.cloud.google.com/'),
                       (470, 'Firebase', 'https://console.firebase.google.com/'),
                       (489, 'Gmail', 'https://mail.google.com/')]:
    text(y, f'{label}：{url}', 10, color='#2467BE')
    c.linkURL(url, (40, H-y-3, 555, H-y+12), relative=0)
para(500, '管理画面では、右上のアカウントと選択中のプロジェクトを確認してください。', 9)

text(539, '納品当日に確認すること', 12, True)
para(550, '1. 上記アカウントでログインできること。<br/>2. HS側で管理用メールを受信・確認できること。<br/>3. 2段階認証を設定し、設定後もGoogle Cloudへログインできること。<br/>4. 本人確認用の端末、再設定用の連絡先、復旧手段をHS側で確認すること。')
para(616, '上記は引渡し時の確認項目です。本書の作成をもって設定・確認済みとはしません。', 8.5)

text(655, 'アカウント情報の取扱い', 12, True)
para(666, 'パスワード記入後の資料は管理担当者が適切に保管してください。パスワード・確認コード・復旧コードを不特定多数へ共有しないでください。パスワードや再設定情報の変更は、ご本人が操作してください。')
para(719, '本書はアカウント情報の引渡し資料です。既存の開発側オーナー権限の削除や、請求先・支払方法の変更を行うものではありません。', 8.5)
c.setStrokeColor(HexColor(teal)); c.line(40, 40, 555, 40)
text(818, '2026年11月1日作成　|　Googleアカウント 納品書', 8, color=muted)
text(818, '1 / 1', 8, x=530, color=muted)
c.showPage(); c.save()

reader = PdfReader(OUT)
assert len(reader.pages) == 1
fields = reader.get_fields()
assert set(fields) == {'password'} and fields['password'].get('/V', '') == ''
widgets = [a.get_object() for a in reader.pages[0].get('/Annots', [])
           if a.get_object().get('/Subtype') == '/Widget']
assert len(widgets) == 1 and widgets[0].get('/V', '') == ''
assert widgets[0].get('/AP', {}).get('/N') is not None
body = reader.pages[0].extract_text()
assert 'hs.system.admin2026@gmail.com' in body and '署名' not in body
print('Account handover PDF: 1 page; blank interactive password field verified; no signature field.')
