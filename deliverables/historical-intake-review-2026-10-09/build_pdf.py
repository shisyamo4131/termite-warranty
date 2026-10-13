from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/過去物件取込み_確認事項一覧_2026-10-09.pdf'
SOURCE = 'https://docs.google.com/spreadsheets/d/1sQoZsqo89tinYe2_wQUKAdwtbt1xsSglK-S1nNeKsIA/edit'
pdfmetrics.registerFont(TTFont('JP', 'C:/Windows/Fonts/BIZ-UDGothicR.ttc'))
pdfmetrics.registerFont(TTFont('JPB', 'C:/Windows/Fonts/BIZ-UDGothicB.ttc'))
navy, teal = colors.HexColor('#173A53'), colors.HexColor('#087E8B')
body = ParagraphStyle('body', fontName='JP', fontSize=10, leading=16, textColor=navy, wordWrap='CJK', spaceAfter=6)
small = ParagraphStyle('small', parent=body, fontSize=8.5, leading=13)
bold = ParagraphStyle('bold', parent=body, fontName='JPB')
title = ParagraphStyle('title', parent=bold, fontSize=20, leading=28, spaceAfter=12)
sub = ParagraphStyle('sub', parent=bold, fontSize=13, leading=20, spaceBefore=10, spaceAfter=8)
white = ParagraphStyle('white', parent=bold, textColor=colors.white, fontSize=9)
story=[]
def p(t, st=body): return Paragraph(t, st)
def text(t, st=body): story.append(p(t,st))
def table(headers, rows, widths):
    cells=[[p(escape(str(x)),white) for x in headers]]+[[p(escape(str(x)).replace('\n','<br/>'),small) for x in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F0F5F8')]),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#CCD8DF')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    story.extend([t,Spacer(1,10)])
def page(n,t):
    if story: story.append(PageBreak())
    text('過去物件取込みの確認資料  /  2026年10月9日',small)
    text(f'{n}  {t}',title)
def item(i,t,where,fact,why,question):
    text(f'{i}　{t}',sub)
    text('<b>対象：</b>'+where)
    text('<b>確認できた記載：</b>'+fact)
    text('<b>確認する理由：</b>'+why)
    text('<b>回答してほしい内容：</b>'+question)
    text('回答：________________________________________________________________',small)

page('1','確認事項の全体像')
text('資料の誤りと断定せず、取込み前に決める必要がある点をまとめました。回答は下記の番号で対応できます。現時点でDevへの初期化・実データ取込みは行っていません。')
text(f'確認元：<link href="{SOURCE}" color="#087E8B">新システム取込み用過去物件（差替え後のGoogle Sheets）</link>',small)
text('ファイル更新表示：2026年10月9日12:20:15 JST。HSC・SHS・UHのA1:Z1000を再読取。行番号は現在のシートの行番号です。旧ファイルを根拠にした指摘は引き継いでいません。',small)
table(['対象','件数','回答が必要な項目'],[['HSC','99','H-01・H-02は回答済み（再回答不要）'],['SHS','66','S-01 広島関連の本支店対応（先方確認待ち）\nS-02 申込日として使う列\nS-03 断熱「なし」と資材名の食い違い'],['UH','277','U-01 札幌の同一コード・異なる店舗名（先方確認待ち）'],['合計','442','回答対象4項目（保留）。開発側の照合事項は5ページに分離。']],[60,45,418])
text('分類と回答の進め方',sub)
text('S-03は項目同士の食い違いです。その他は、名称や日付の意味・取込方法の確認であり、誤記と断定していません。S-01・S-02・S-03・U-01はオーナーが先方へ確認中です。H-01・H-02は今回の回答で確定しました。')
text('回答済み事項は5ページにまとめています。各項目の回答欄には、採用する値や名称を記入してください。資料を直した場合は対象番号と修正したセルを添えれば照合できます。')
text('開発側の説明の訂正',sub)
text('・HSCは2社ではなく、同じ工務店の本社／山陽支店でした。対応は確定済みです。<br/>・SHSの福山支店・竹原支店に不整合を検出したわけではありません。<br/>・UH申込日の「5件残存」は旧ファイル参照による誤報でした。新資料は277件すべて各月1日です。')

page('2','HSC：99件')
text('所属は確定済み：アイデザインホーム㈱ 1社の配下に「本社」16件・「山陽支店」83件として登録します。ここは再回答不要です。')
text('H-01 基礎断熱の有無【確定・再回答不要】',sub)
text('2026年10月9日のオーナー回答：全99件を「基礎断熱あり」とし、H列memoの記載を「資材名」に適用します。')
text('H-02 未来の引渡日3件【確定・再回答不要】',sub)
text('2026年10月9日のオーナー回答：F98＝2026/10/12、F99・F100＝2026/10/17の3件とも、記載された日付のまま初期登録します。日付の変更や対象からの除外は行いません。')
text('確認済みの資料状態',sub)
text('A〜I列の99件に空欄なし。保証番号の重複なし。建面積は全件200.00㎡。等級は3等級90件・2等級9件。最長保証期間への対応は5ページのD-01で開発側が先に照合します。',small)

page('3','SHS：66件')
item('S-01','広島関連の本支店対応【保留】','I列「担当部署」。工務店は全件「創建ホーム㈱」。','東広島本部1件（I2）、東広島支店36件、広島支店14件。ほかに福山支店5件・竹原支店10件があります。','別拠点か名称の違いかを資料だけで判断できません。特に東広島本部と東広島支店の関係が確認点です。広島支店も同一拠点だと判断したわけではありません。','「東広島本部」「東広島支店」「広島支店」それぞれの登録先名を指定してください。同じ拠点なら同じ登録先名、別拠点なら別名で回答してください。福山・竹原に不整合の指摘はありません。')
item('S-02','申込日として使う列【保留】','A列「発行日／申込日」とB列「申込日」。66件中65件で日付が異なります。','例：A2＝2020/10/7、B2＝2020/10/5。A4＝2022/9/7、B4＝2022/8/29。','別の日付を記録しているなら矛盾ではありません。申込月の集計にも関わるため、採用する列を決めます。','申込日は全件B列を採用してよいですか。A列は申込日として使わず、発行日時とも推測して登録しない案です。')
item('S-03','断熱「なし」と資材名の食い違い【保留】','F62「基礎断熱」／G62「メーカー名等」','F62＝「なし」。G62＝「デュポンスタイロ株式会社 スタイロフォームｂⅡ」。','有無と資材名の関係が不明です。どちらかを勝手に削除・変更せず、正しい登録値を確認します。','①「なし」が正しく使用資材は空欄、②「あり」が正しくG62を使用、③その他、のいずれかと、正しい値を教えてください。')

page('4','UH：277件')
item('U-01','同一コードの異なる店舗名【保留】','E列「施工加盟店名」／F列「加盟店コード」。コード2213。','73行は「札幌南店」1件。96・105・112・119行は「札幌豊平店」4件。同じコードです。','同一工務店内で有効な本支店コードを重複登録できません。名称変更、別店舗、コード誤記のいずれかは未確認です。','同じ店舗なら、5件をまとめる登録先名を指定してください。別店舗なら、それぞれの正しいコードと登録先を指定してください。旧名称の別店舗を無効で残す等の判断は回答後に整理します。')
text('再確認を求めない事項',sub)
table(['項目','今回の扱い'],[['申込日','新資料277件全件が各月1日。修正確認済み。'],['建面積','過去物件は一律200㎡（オーナー承認済み）。'],['保証期間','UHは10年。20年／30年へ自動延長しない。'],['所属の階層','工務店＝ユニバーサルホーム、加盟店＝本支店。'],['名称末尾の「店」','松江／松江店、三次／三次店、金沢南／金沢南店は既回答の末尾「店」省略方針で整理。札幌の別名称には適用しない。'],['住所・資材名','列なし。任意設定では空欄を保存し、「不明」や契約Noを住所へ自動転記しない。グループ設定との一致は開発側が点検。']],[110,413])
text('保証番号・契約Noの重複は今回の277件にありません。契約No先頭と加盟店コードの不一致は既決方針上、一律の誤記扱いにしません。',small)

page('5','確定事項と開発側の残作業')
text('確定済み：再回答不要',sub)
table(['項目','内容'],[['過去物件の状態','保証書発行済み・請求済み・保険未報告。発行／請求の実日時・担当者を捏造しない。'],['面積','HSC／SHSは資料の200.00㎡、UHは承認済みの200㎡。実面積の再収集は求めない。'],['取込み方法','開発側が一括投入。再初期化・再取込み可能にする。旧バックアップは不要。'],['既存番号','過去番号を保持。除外番号・欠番を含め再利用しない。'],['HSC所属','1工務店、本社16件・山陽支店83件。確定済み。'],['保留の範囲','S-01 広島、S-02 申込日列、S-03 断熱材、U-01 札幌。確認後の回答待ち。']],[110,413])
text('開発側で先に照合する事項',sub)
text('<b>D-01　現在の保証期間と最長保証期間</b><br/>SHSのN列は全66件「10年間」。最長20年／30年の指定とは区別します。HSCは3等級90件・2等級9件、SHSは3等級63件・2等級3件。以前の「等級・断熱材の対応案にOK」という回答の具体的条件を開発側が照合します。資料の等級だけで上限を自動決定せず、過去回答で決まっていない点が残った場合のみ、この項目へ追記して確認します。',small)
text('<b>D-02　列の役割・保持方法</b><br/>SHSの担当者TEL／FAXを施主電話へ流用しません。S〜U列の日付補助、W／X列の選択肢を物件項目へ混ぜません。備考の保存、住所・資材名の必須設定、期間別状態と月別検索項目を現行の保存形式に対応させます。',small)
text('<b>D-03　全件照合・採番・再実行</b><br/>最新442件と既決の除外／欠番記録を照合します。通常画面の増分CSVは新規採番専用なので、過去番号保持の専用処理を準備。初期化対象・保持対象を固定し、架空データで再取込みまで検証してからDevへ投入します。',small)
text('今回確認した範囲と限界',sub)
text('3シートの件数・主要空欄・番号重複・所属表記・日付列・断熱材・期間記載を点検しました。資料と実際の業務事実の一致、取込み成功、HSの受入完了を証明するものではありません。個人名・住所・電話番号は本資料に転載していません。',small)

def footer(c,doc):
    c.setStrokeColor(teal);c.line(36,32,559,32);c.setFont('JP',8);c.setFillColor(navy)
    c.drawString(36,19,'HSC・SHS・UH  |  過去物件取込みの確認事項  |  2026-10-09')
    c.drawRightString(559,19,f'{doc.page} / 5')
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=36,leftMargin=36,topMargin=32,bottomMargin=45,title='過去物件取込みの確認事項一覧',author='開発側').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
