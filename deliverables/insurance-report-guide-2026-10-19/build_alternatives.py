"""比較用の抽出範囲図と、住所・契約番号の設計提案。業務実装は変更しない。"""
from pathlib import Path
import sys
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf'
OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('JP','C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB','C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
W,H=842,595
N='#18344C'; T='#08796E'; A='#A65C12'; G='#536574'
def text(x,y,s,size=12,color=N,bold=False):
    c.setFont('JPB' if bold else 'JP',size); c.setFillColor(HexColor(color)); c.drawString(x,H-y,s)
def box(x,y,w,h,fill,stroke=None):
    c.setFillColor(HexColor(fill)); c.setStrokeColor(HexColor(stroke or fill))
    c.roundRect(x,H-y-h,w,h,8,fill=1,stroke=bool(stroke))
def arrow(x1,y1,x2,y2,color=T):
    from math import atan2,cos,sin,pi
    c.setStrokeColor(HexColor(color)); c.setFillColor(HexColor(color)); c.setLineWidth(2)
    c.line(x1,H-y1,x2,H-y2)
    a=atan2(y2-y1,x2-x1); p=c.beginPath(); p.moveTo(x2,H-y2)
    for a2 in (a+pi-.45,a+pi+.45):p.lineTo(x2+9*cos(a2),H-(y2+9*sin(a2)))
    p.close(); c.drawPath(p,fill=1,stroke=0)
def header(k,title,sub,page,total):
    box(0,0,W,8,T);text(36,39,k,11,T,True);text(36,75,title,24,bold=True);text(36,101,sub,12,G)
    text(36,568,'HS・AriLabo向け ｜ 2026年10月19日 ｜ 架空例による説明',9,G)
    text(755,568,f'{page} / {total}',10,G)
def house(x,y,label,color):
    c.setStrokeColor(HexColor(color));c.setLineWidth(2)
    p=c.beginPath();p.moveTo(x,H-y-15);p.lineTo(x+15,H-y);p.lineTo(x+30,H-y-15);c.drawPath(p)
    c.rect(x+5,H-y-36,20,21,fill=0,stroke=1)
    text(x-5,y+54,label,10,color,True)

if '--only-proposal' not in sys.argv:
    f=OUT/'保険報告一覧_今回分と過去未報告分_図解比較版_2026-10-19.pdf'
    c=canvas.Canvas(str(f),pagesize=(W,H));c.setTitle('保険報告 - 今回分と過去の未報告分')
    header('④ 抽出範囲の図解 ｜ 比較用の別案','今回分と、過去から残っている未報告分','例：対象年月は2026年10月。「報告済みを含める」の有無を、新規分の引渡月で図示します。',1,1)
    text(48,137,'過去',11,G);arrow(92,133,775,133,G);text(748,124,'今回',11,T,True)
    box(36,153,290,174,'#FFF2DF');box(342,153,290,174,'#E6F5F1');box(648,153,158,174,'#F0F3F5')
    text(52,181,'8月以前の引渡分',17,A,True);text(358,181,'9月の引渡分',17,T,True);text(660,181,'10月の引渡分',14,G,True)
    house(69,198,'A 未報告',A);house(165,198,'B 未報告',A)
    house(375,198,'C 未報告',T);house(495,198,'D 報告済み',G)
    house(690,198,'E 未報告',G)
    text(52,284,'過去に報告すべきで',15,A,True);text(52,309,'未報告の分',15,A,True)
    text(358,284,'今回報告すべき分：C',15,T,True);text(358,309,'Dは確認・再出力の対象',12,G)
    text(660,287,'今回の抽出は対象外',11,G);text(660,310,'翌月の確認へ',12,G)
    arrow(150,329,150,365,A);arrow(410,329,410,365,T)
    box(36,370,596,57,'#E6F5F1',T);text(51,393,'チェックなし',13,T,True);text(51,416,'A ＋ B ＋ C ＝ 過去の未報告 ＋ 今回の未報告',15,T,True)
    c.setStrokeColor(HexColor(G));c.setLineWidth(2)
    p=c.beginPath();p.moveTo(620,H-329);p.lineTo(640,H-349);p.lineTo(640,H-440);p.lineTo(598,H-440);c.drawPath(p)
    arrow(598,440,598,449,G)
    box(342,449,290,57,'#EEF3F9');text(356,471,'チェックあり',13,N,True);text(356,493,'C ＋ D ＝ 前月分だけ（9月限定）',12,N,True)
    text(36,465,'チェックありでは、A・Bは含めません。',11,A,True)
    text(36,490,'「あり」は単純な追加表示ではありません。',10,G)
    text(36,530,'過去分を後から登録した場合も見つけられるよう、通常は「前月以前の未報告」を抽出します。',11,N)
    text(36,546,'更新分は直前の保険期間の満了月が基準。報告不要など既存の対象外条件は維持します。',9,G)
    c.showPage();c.save();print(f)

f=OUT/'保険報告CSV_住所と契約番号を分ける理由_2026-10-19.pdf'
c=canvas.Canvas(str(f),pagesize=(W,H));c.setTitle('保険報告CSV - 住所と契約番号を分ける理由')
header('③ CSVの項目設計 ｜ 開発側の推奨案・未実装','同じ「住所」欄には、同じ種類の情報を','HSの希望を踏まえた比較資料です。最終仕様は関係者間の確認後に確定します。',1,3)
box(36,126,371,310,'#FFF2DF');box(425,126,381,310,'#E6F5F1')
text(52,156,'HS希望案：UHだけ内容を変える',16,A,True)
text(52,182,'列数は増えない一方、列の意味が混在します。',11)
text(52,221,'UH',15,bold=True);arrow(110,216,171,216,A)
box(184,197,205,41,'#FFFFFF');text(197,223,'「住所」＝契約番号',13,A,True)
text(52,280,'他グループ',13,bold=True);arrow(145,275,171,275,A)
box(184,256,205,41,'#FFFFFF');text(197,282,'「住所」＝所在地',13,A,True)
text(52,334,'同じ種類の物件情報でも、',13)
text(52,358,'グループによって出力の扱いが変わります。',12)
text(52,391,'読む人・取り込む処理にも、',12)
text(52,415,'「UHだけ例外」という知識が必要です。',12,A,True)
text(441,156,'推奨案：住所と契約番号を別列に',16,T,True)
text(441,182,'すべてのグループに共通の列を用意します。',11)
box(443,200,346,34,T);text(455,222,'グループ',11,'#FFFFFF',True);text(552,222,'住所',11,'#FFFFFF',True);text(675,222,'契約番号',11,'#FFFFFF',True)
for y,g,a,k in [(256,'UH','未登録なら空欄','例：U-001'),(295,'他グループ','例：○○市…','未登録なら空欄')]:
    text(455,y,g,11);text(552,y,a,10);text(675,y,k,10)
text(441,334,'住所欄は、どの行も住所。',13,T,True)
text(441,358,'契約番号欄は、どの行も契約番号。',13,T,True)
text(441,391,'追加列が必要ですが、情報の意味を保ち、',12)
text(441,415,'例外の見落としを減らす設計です。',12,T,True)
box(36,455,770,78,'#EEF3F9');text(52,480,'提出様式と、システム内の情報の意味を分けて考えます。',16,bold=True)
text(52,506,'保険会社の指定様式に合わせる必要がある場合は、共通CSVから転記・変換する方法を検討します。',11)
text(52,525,'列名・列順・番号の参照元・未登録時の扱い・提出先の受入可否は、仕様確定時に確認します。',10,G)
c.showPage()
header('③ 固定された特別扱いの弊害 ｜ 想定例','「UHなら特別処理」を固定すると何が起きるか','ハードコーディング＝特定の名前・IDや業務条件を、プログラムに直接埋め込むこと。',2,3)
box(36,125,770,65,'#FFF2DF');text(52,151,'たとえば「UHなら契約番号、それ以外なら住所」と固定した場合',16,A,True)
text(52,175,'業務ルールを変更しても、プログラムを直すまで従来の扱いが残る可能性があります。',12)
labels=[('将来の変更（仮定）','特別扱いを見落とすと','起こり得る支障')]
for x,w,s in [(36,230,labels[0][0]),(302,230,labels[0][1]),(568,238,labels[0][2])]:
    box(x,209,w,33,N);text(x+12,231,s,13,'#FFFFFF',True)
rows=[(['別グループでも','契約番号が必要になる'],['追加条件の修正が漏れる'],['必要な契約番号が出ず、','提出資料の修正が必要に']),(['UHの提出ルールが','住所へ変更される'],['旧ルールが残る'],['誤った内容のまま出力され、','確認・差戻しにつながる']),(['同じCSVを別の集計や','システムで利用する'],['「住所は所在地」として','一律に読み込む'],['番号を住所として扱い、','照合・集計を誤る'])]
for i,row in enumerate(rows):
    y=253+i*69
    for x,w,ls in zip([36,302,568],[230,230,238],row):
        box(x,y,w,60,'#F0F4F7')
        for j,s in enumerate(ls):text(x+12,y+23+j*20,s,12)
    arrow(273,y+30,292,y+30,A);arrow(539,y+30,558,y+30,A)
box(36,475,770,66,'#E6F5F1');text(52,499,'推奨：住所と契約番号を別列にし、共通の処理にそろえる。',16,T,True)
text(52,522,'例外が不可欠なら、専用の出力設定として明示し、変更時に全グループを確認する方法を検討します。',10)
text(36,554,'上記は想定される弊害です。特別処理が直ちに不具合を起こすという意味ではありません。',9,G)
c.showPage()
header('③ ケーススタディ ｜ 将来の機能追加・改修への弊害','例外が増えると、機能を育てにくくなります','以下は将来を想定した例です。追加機能の計画・採用・実装を示すものではありません。',3,3)
for x,w,label in [(36,210,'追加・改修したいこと'),(279,292,'UHだけ例外だと'),(604,202,'別列・共通処理なら')]:
    box(x,125,w,33,N);text(x+12,147,label,13,'#FFFFFF',True)
cases=[
    (['1  出力方法を増やす','CSVに加えてExcelや','外部システム連携を追加'],['出力ごとに例外の適用箇所を確認。','個別に実装すると、CSVだけ対応し','他の出力で抜ける可能性がある。'],['同じ項目の意味を保ち、','共通の出力元を使いやすい。','形式ごとの検証は必要。']),
    (['2  対象グループを増やす','別グループでも','契約番号の出力が必要に'],['「UHなら」の固定条件を見直し、','新旧グループの組合せを確認する。','例外の追加が繰り返されやすい。'],['契約番号は同じ列へ。','グループ名による分岐を','増やさず拡張しやすい。']),
    (['3  住所を使う機能を追加','CSVを使って所在地検索や','地域別の集計を行う'],['住所欄に番号が混ざるため、','そのまま一律に使えない。','例外判定・除外・別参照が必要。'],['住所列を共通に扱える。','住所未登録分の扱いは','別途決める必要がある。'])
]
for i,row in enumerate(cases):
    y=169+i*94
    for x,w,lines,fill in zip([36,279,604],[210,292,202],row,['#EEF3F9','#FFF2DF','#E6F5F1']):
        box(x,y,w,83,fill)
        for j,line in enumerate(lines):text(x+12,y+23+j*21,line,11,T if x==604 else N,bold=(j==0 and x==36))
    arrow(252,y+41,270,y+41,A);arrow(578,y+41,596,y+41,T)
box(36,462,770,71,'#E6F5F1')
text(52,488,'弊害の中心は、追加・改修のたびに「特別扱いの確認」が増えること。',16,T,True)
text(52,511,'共通化・再利用が難しくなり、変更箇所の調査や検証の負担、将来の選択肢の制約につながり得ます。',10)
text(52,528,'住所と契約番号を分ければ、今回の出力だけでなく、将来の機能でも情報の意味を維持できます。',10)
text(36,550,'例外を一か所で管理すれば弊害は抑えられますが、同じ列に異なる意味の情報が混在する点は残ります。',9,G)
c.showPage();c.save();print(f)
