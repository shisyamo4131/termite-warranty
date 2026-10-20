"""HS向けGoogle Cloud請求先登録ガイド。実登録は行わない。"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'output/pdf/HS_GoogleCloud_請求先とカードの登録手順.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
W, H = 595.28, 841.89
c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle('HS向け Google Cloud 請求先・クレジットカード登録手順')
c.setAuthor('AIR')
NAVY, BLUE, TEAL, GRAY = '#19344D', '#2467BE', '#087F78', '#526778'
TOTAL = 10
def txt(x,y,s,size=11,color=NAVY,bold=False):
    c.setFillColor(HexColor(color)); c.setFont('JPB' if bold else 'JP',size)
    c.drawString(x,H-y,s)
def box(x,y,w,h,fill='#F1F5F9',stroke=None):
    c.setFillColor(HexColor(fill)); c.setStrokeColor(HexColor(stroke or fill))
    c.roundRect(x,H-y-h,w,h,7,fill=1,stroke=bool(stroke))
def para(x,y,w,s,size=11,color=NAVY,bold=False):
    p=Paragraph(s,ParagraphStyle('body',fontName='JPB' if bold else 'JP',fontSize=size,
        leading=size*1.65,textColor=HexColor(color),wordWrap='CJK'))
    _,h=p.wrap(w,700); p.drawOn(c,x,H-y-h); return h
def base(n,title,sub,kind='手順'):
    box(0,0,W,8,TEAL)
    txt(36,35,'HOUSE SOLUTION  /  Google Cloud',10,TEAL,True)
    txt(36,70,title,22,bold=True)
    para(36,85,523,sub,10,GRAY)
    txt(36,811,'2026年10月20日版  |  HSご担当者向け  |  '+kind,8,GRAY)
    txt(510,811,f'{n} / {TOTAL}',9,GRAY)
def note(y,title,body,color='#EDF5FD'):
    box(36,y,523,67,color); txt(49,y+21,title,11,bold=True)
    para(49,y+29,496,body,10)
def step(y,n,title,body):
    box(36,y,29,29,TEAL); txt(44,y+20,str(n),12,'#FFFFFF',True)
    txt(77,y+18,title,13,bold=True); para(77,y+27,480,body,11)
def shot(name,x,y,w,crop_h=None,marks=()):
    path=HERE/'screenshots'/name
    iw,ih=Image.open(path).size
    visible=crop_h or ih
    h=w*visible/iw
    c.saveState()
    p=c.beginPath();p.rect(x,H-y-h,w,h);c.clipPath(p,stroke=0)
    c.drawImage(str(path),x,H-y-ih*w/iw,width=w,height=ih*w/iw)
    c.restoreState()
    c.setStrokeColor(HexColor('#D5DFE7'));c.rect(x,H-y-h,w,h,fill=0,stroke=1)
    for rx,ry,rw,rh,num in marks:
        sx,sy=x+rx*w/iw,y+ry*w/iw
        c.setStrokeColor(HexColor('#D64B35'));c.setLineWidth(2)
        c.roundRect(sx,H-sy-rh*w/iw,rw*w/iw,rh*w/iw,3,fill=0,stroke=1)
        c.setFillColor(HexColor('#D64B35'));c.circle(sx+7,H-sy-7,9,fill=1,stroke=0)
        txt(sx+4,sy+10,str(num),9,'#FFFFFF',True)
    return h
def field(y,label,value,body=None):
    txt(54,y,label,11,bold=True)
    box(54,y+10,487,39,'#FFFFFF','#C5D3DF')
    txt(67,y+35,value,11,GRAY)
    if body: para(54,y+55,487,body,10,GRAY)
def link(y,label,url):
    txt(36,y,label,11,BLUE,True)
    c.linkURL(url,(36,H-y-5,559,H-y+13),relative=0)
    para(36,y+8,523,url,8,GRAY)

base(1,'請求先・カード情報を登録する','HSアカウントで進める、スクリーンショット付き操作ガイド')
box(36,131,523,91,'#EAF5F2')
txt(52,158,'今回のゴール',14,TEAL,True)
para(52,172,490,'HS用の請求先アカウントを作り、会社情報と支払方法を登録する。<br/>既存Prodの請求先を切り替える操作は、登録完了後の別工程です。',12)
for i,(a,b) in enumerate([('1  HSでログイン','アカウントを確認'),('2  請求先を登録','会社情報・カード'),('3  必要時に切替','Prodへ関連付け')]):
    x=36+i*177;box(x,245,169,77);txt(x+12,270,a,12,bold=True)
    para(x+12,281,145,b,10)
txt(36,356,'操作前に用意するもの',15,bold=True)
items=[
('ログイン','HS用Googleアカウントと、その本人確認を行える端末。'),
('会社情報','HSの正式な会社名・所在地・郵便番号・連絡先。'),
('カード','利用を認められたカード、名義・有効期限・請求先住所。カード会社の追加認証に対応できる状態。'),
('担当者','規約・課金条件を確認して申込みを確定できるHSの担当者。')]
y=376
for a,b in items:
    txt(36,y+13,a,11,TEAL,True);para(116,y,443,b,11);y+=61
note(638,'本書の画面について','2〜4ページは2026年10月20日にHSログインで撮影した実画面。5ページ以降の入力例は説明図です。実際の入力欄・順番は表示に従ってください。')
para(36,724,523,'資料作成時は追加の無料トライアル規約へ同意せず停止しています。会社情報・カード入力・請求先作成・Prodの請求先変更は実施していません。',10,GRAY)
c.showPage()

base(2,'01  HSでログインし「課金」を開く','開始URL： https://console.cloud.google.com/　右上のアカウントを必ず確認')
shot('01-home.png',36,123,523,crop_h=105,marks=[(201,4,197,40,1),(873,3,50,45,2)])
para(36,193,523,'① 対象は「TermiteWarranty Prod」。② 右上アイコンからHS用アカウントであることを確認します。別アカウントなら切り替えてから進みます。',11)
shot('02-menu.png',36,251,370,marks=[(13,343,255,45,3)])
box(422,260,137,200,'#EDF5FD')
para(434,272,113,'③ 左上の三本線メニューを開き、<b>「課金」</b>を選びます。<br/><br/>別の表示では「お支払い」と表記される場合があります。',11)
note(650,'無料トライアルの大きな案内ボタンは、この段階では選びません','まず「課金」から請求先一覧へ進み、既存の請求先があるかを確認します。次ページの画面が表示されない場合は、直接一覧へ進めます。')
para(36,730,523,'一覧のURL： https://console.cloud.google.com/billing<br/>このURLを開いた場合も、HSアカウントであることを確認してください。',10,GRAY)
c.showPage()

base(3,'02  請求先アカウントを追加する','実画面：既存Prodの請求先と、HS側で作成する請求先は別です')
shot('03-linked.png',36,125,523,crop_h=285,marks=[(317,216,185,39,1)])
para(36,301,523,'① この画面が出たら「請求先アカウントを管理」を選びます。「Firebase のお支払い」は現在Prodに関連付いている請求先です。今回ここを書き換える必要はありません。',11)
shot('04-billing-list.png',36,381,523,crop_h=435,marks=[(43,359,188,38,2)])
para(36,641,523,'② 「請求先アカウントを追加」を選びます。画面やアカウント状態により「アカウントを作成」と表示されることもあります。',11)
note(711,'すでにHS用の請求先がある場合','重複作成せず、対象の請求先を開いて「お支払い方法」でカードを登録します。後日のカード差替えは9ページを参照。')
c.showPage()

base(4,'03  初回は無料トライアル画面へ','実画面：今回のHSアカウントでは、追加ボタンからこの画面へ遷移しました')
shot('05-trial-step1.png',65,126,465,crop_h=650,
     marks=[(65,197,370,56,1),(62,349,349,43,2),(59,560,121,44,3)])
step(469,1,'表示アカウントと国を確認','HS用アカウントであること、日本の会社情報で登録する場合は国が「日本」であることを確認します。')
step(555,2,'規約を読み、担当者自身が同意して進む','Google Cloud規約に加え、無料トライアルの追加規約等が表示されます。了承できる場合だけ「同意して続行」を選びます。')
note(650,'この先の実画面は未撮影です','資料作成のためだけに申込みを進めていません。次ページ以降は公式案内に基づく説明図です。表示が異なる場合、入力内容を確認してから進んでください。')
para(36,730,523,'通常の作成画面が表示された場合：請求先名（例「HS 本番運用」）・国・通貨等を確認して進みます。無料トライアルへの加入可否を本書だけで判断しないでください。',10,GRAY)
c.showPage()

base(5,'04  支払プロファイルに会社情報を入力','説明図（実画面ではありません）｜ 会社情報とカード名義は別々に確認します', '入力説明図')
box(36,130,523,478,'#F1F5F9')
txt(54,158,'お支払い情報・お客様情報の入力イメージ',13,TEAL,True)
field(190,'アカウントの種類','ビジネス／組織（会社として登録する場合）','個人用の登録と混同しないよう確認します。種類は後から変更できません。')
field(292,'会社名','HSの正式な会社名を入力','略称や仮名ではなく、担当者が確認した正式情報を使います。')
field(394,'住所・郵便番号','会社の正式な請求先所在地を入力')
field(478,'連絡先・必要に応じた追加情報','実際に確認・受信できる情報を入力','入力欄が表示された項目だけを、事実に沿って入力します。')
note(638,'既存のお支払いプロファイルが表示された場合','会社名・住所・種類を確認します。開発者個人や別会社のプロファイルを流用せず、HS用のものを選ぶか新規作成します。')
para(36,730,523,'国・通貨やプロファイルの種類には変更できない項目があります。登録前に担当者が確認してください。画面で会社情報が不足する場合は推測で埋めず、HS内で確認します。［出典1］',10,GRAY)
c.showPage()

base(6,'05  クレジットカード情報を入力','説明図（実画面ではありません）｜ カード保有者がGoogle画面へ直接入力', '入力説明図')
box(36,130,523,429,'#F1F5F9')
txt(54,157,'お支払い方法：クレジットカード／デビットカード',12,TEAL,True)
field(190,'カード番号','カードに記載された番号を入力')
field(272,'有効期限・セキュリティコード','月／年と、カードのセキュリティコードを入力')
field(354,'カード名義','カードに登録されている名義を入力')
field(436,'カードの請求先住所（求められた場合）','カード会社に登録している住所を確認して入力')
step(586,1,'追加認証が出たらカード保有者が対応','SMS・カード会社アプリ等の本人認証を求められる場合は、その案内に従います。認証コードを他者へ転送する必要はありません。')
note(684,'カード情報はメール・チャット・手順書へ記載しません','入力済み画面のスクリーンショットも共有しないでください。本書には実カード番号・名義・住所・認証コードを掲載していません。')
para(36,760,523,'カードの受付可否は登録時の確認結果によります。第三者名義のカードが必ず使えるとは保証しません。',9,GRAY)
c.showPage()

base(7,'06  登録を確定し、作成結果を確認','説明図｜ ボタンを押しただけで完了とせず、作成された請求先を確認します', '登録後の確認')
for i,(title,body) in enumerate([
('会社情報・カード・規約を最終確認','HSの担当者が内容を確認し、登録・開始を確定するボタンを押します。ボタン名は登録経路により異なります。'),
('認証・審査結果を確認','エラーや確認待ちなら、成功したことにしません。メール確認等が求められた場合は対応します。結果不明のまま繰り返し作成しません。'),
('請求先一覧に戻って確認','作成された請求先の名前・ID・状態を確認します。カードの登録だけでは、既存Prodの請求先が自動で切り替わったとは判断しません。')]):
    step(136+i*105,i+1,title,body)
box(36,471,523,164,'#FFF4DF')
txt(51,497,'本番への関連付け前に：有料アカウントの状態を確認',13,bold=True)
para(51,510,493,'無料トライアルは期限やクレジット上限があります。継続運用のため、Prodへ切り替える前に有料の請求先として利用できる状態を確認する方針です。<br/><br/>無料トライアルの場合は、Google Cloudの「有効化／Activate」から有料化の確認へ進み、課金条件を担当者が了承して確定します。表示名は画面によります。［出典3］',11)
note(665,'登録確認だけなら、ここで終了して構いません','Prodへの切替時期が決まっていなければ、次ページの変更は実施しません。現状の請求先と開発者のOwner権限は維持します。')
para(36,753,523,'カードの有効性確認で一時的な利用枠確保が発生する場合があります。実際の課金とは区別し、不明な表示はカード会社またはGoogleへ確認します。［出典1］',9,GRAY)
c.showPage()

base(8,'07  必要な時点でProdへ関連付ける','説明図｜ この工程から、既存Prodの請求先が変わります', '別工程：請求先切替')
box(36,129,523,102,'#EDF5FD')
txt(51,156,'HSアカウントのまま操作できます',14,BLUE,True)
para(51,171,493,'ProdのOwner権限と切替先請求先の必要権限を持つ担当者が実施します。対象は「termite-warranty-prod」。Devや別プロジェクトを選ばないでください。［出典4］',11)
for i,(title,body) in enumerate([
('「課金」→「自分のプロジェクト」','今回の画面では「自分のプロジェクト」です。資料によっては「マイ プロジェクト」と表記されます。'),
('TermiteWarranty Prod の行で三点メニューを開く','実画面で「お支払い情報を変更」が表示されることを確認済みです。「課金を無効にする」は選びません。'),
('「お支払い情報を変更」からHSの請求先を選択','切替先の名前・IDを照合し、確定ボタンで関連付けます。ロックや権限不足の表示がある場合は停止し、開発担当者へ相談します。'),
('切替後の状態を確認','請求先の名前・ID、課金が有効であること、FirebaseのBlaze表示、Prodの表示・代表的な読取りを確認します。')]):
    step(260+i*105,i+1,title,body)
note(700,'切替前の利用料金は、旧請求先に残ります','切替の日時と結果を記録します。開発者Ownerの削除、プロジェクトの再作成、バックアップ等の再開はこの操作に含めません。［出典4］')
c.showPage()

base(9,'08  後日、カードを差し替える場合','説明図｜ 開発者のカードを一時利用した場合も、同じ順番で切り替えます', '後日のカード変更')
for i,(title,body) in enumerate([
('HSの請求先を開く','「課金」→対象の請求先アカウント→「お支払い方法」を開きます。会社情報の変更とカード変更を混同しないでください。'),
('HSのカードを追加し、認証を完了する','カード保有者が直接入力します。支払方法を管理・削除する権限は、ProdのOwner権限とは別に必要です。'),
('HSのカードをメインの支払方法にする','追加だけでは切替完了ではありません。新しいカードがメインになっていることを確認します。'),
('旧カードを削除し、残っていないことを確認','削除できない場合は、画面の条件・権限・処理中の状態を確認します。予備の支払方法としても残していないか確認します。')]):
    step(137+i*115,i+1,title,body)
box(36,627,523,107,'#EAF5F2')
txt(51,652,'カード切替の完了条件',13,TEAL,True)
para(51,668,493,'HSカードの認証完了 ＋ メイン設定確認 ＋ 旧カードの削除確認。<br/>請求先アカウント自体が同じなら、Prodとの関連付けを再度変える作業とは別です。［出典2］',11)
para(36,755,523,'旧カード削除は過去の請求や取引履歴の消去ではありません。立替分の扱いは担当者間で別途確認してください。',10,GRAY)
c.showPage()

base(10,'確認項目・困ったとき・参照先','本書の作成だけでは、請求先・カードの登録や切替は完了していません', '確認と情報源')
txt(36,138,'担当者の最終確認',14,bold=True)
for i,s in enumerate([
'HSアカウントで操作した／会社情報・プロファイル種類を確認した',
'支払方法の登録・認証が完了した／請求先名・ID・状態を確認した',
'Prodへ切替済みか、未切替で登録だけかを担当者間で共有した',
'切替した場合はProdの課金状態・アプリ動作を確認した']):
    c.setStrokeColor(HexColor(TEAL));c.rect(37,H-(161+i*30)-11,10,10,fill=0,stroke=1)
    para(56,159+i*30,503,s,10)
txt(36,305,'画面が違う・進めない場合',14,bold=True)
para(36,319,523,'別のGoogleアカウントになっていないかを最初に確認します。カード拒否・本人認証はカード保有者／カード会社へ、請求先やProdの権限・関連付けは開発担当者へ確認します。共有する画面はカード番号・認証コード・住所等を隠してください。',10)
txt(36,405,'公式資料（リンクをクリックして開けます）',13,bold=True)
link(434,'1. 請求先アカウントの作成','https://docs.cloud.google.com/billing/docs/how-to/create-billing-account')
link(491,'2. 支払方法の追加・変更・削除','https://docs.cloud.google.com/billing/docs/how-to/payment-methods')
link(548,'3. 無料トライアルと有料アカウントへの切替','https://docs.cloud.google.com/free/docs/free-cloud-features')
link(605,'4. プロジェクトの請求先変更','https://docs.cloud.google.com/billing/docs/how-to/modify-project')
box(36,665,523,100,'#F1F5F9')
para(49,677,497,'実画面確認日：2026年10月20日。スクリーンショットは開始画面・メニュー・請求先への案内・請求先一覧・無料トライアルのステップ1を収録。赤枠と番号は操作案内の追記です。<br/>以降は実登録を行わず説明図で補っています。Googleの画面変更や登録状態によって文言・順番が異なる場合があります。',9,GRAY)
c.showPage()
c.save()
print(OUT)
