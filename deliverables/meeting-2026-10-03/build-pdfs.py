"""Generate reviewable Japanese meeting documents from the unresolved-register snapshot."""
from pathlib import Path
import json, re
from xml.sax.saxutils import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, HRFlowable
from reportlab.lib.pagesizes import A4

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf'
OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
FONT='HeiseiKakuGo-W5'
styles={
 'title':ParagraphStyle('title',fontName=FONT,fontSize=23,leading=34,textColor=colors.HexColor('#173d55'),spaceAfter=20),
 'heading':ParagraphStyle('heading',fontName=FONT,fontSize=15,leading=23,textColor=colors.HexColor('#173d55'),spaceAfter=12),
 'body':ParagraphStyle('body',fontName=FONT,fontSize=10,leading=17,spaceAfter=9,wordWrap='CJK'),
 'small':ParagraphStyle('small',fontName=FONT,fontSize=8,leading=13,spaceAfter=6,wordWrap='CJK',textColor=colors.HexColor('#536776')),
 'question':ParagraphStyle('question',fontName=FONT,fontSize=11,leading=19,spaceAfter=12,wordWrap='CJK'),
}
def p(text,style='body'): return Paragraph(escape(text).replace('\n','<br/>'),styles[style])
def footer(canvas,doc):
 canvas.setFont(FONT,8);canvas.setFillColor(colors.HexColor('#536776'))
 canvas.drawString(42,27,'HS 白蟻保証システム｜2026-10-01作成｜打ち合わせ用')
 canvas.drawRightString(A4[0]-42,27,str(doc.page))
def build(name,story):
 doc=SimpleDocTemplate(str(OUT/name),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=44,bottomMargin=46,title=name.replace('.pdf',''),author='プロジェクト検討資料')
 doc.build(story,onFirstPage=footer,onLaterPages=footer)

questions=json.loads((Path(__file__).parent/'questions.json').read_text(encoding='utf-8'))
register=(ROOT/'docs/requirements/house-solution-confirmations.md').read_text(encoding='utf-8').split('## Unresolved Matters')[1].split('## Resolved Matters')[0]
expected=set(re.findall(r'\| (HSC-\d+) \|',register))
assert {q['id'] for q in questions}==expected, 'Unresolved coverage mismatch'
assert len(questions)==len(expected), 'Duplicate matter ID'
story=[p('業務実演と仕様確認\n未確定事項 全件整理','title'),p('2026年10月3日 打ち合わせ用','heading'),
 p('試作画面を見ながら、実際の業務に合うかを確認するための資料です。HS社長・ご担当者様には業務上の判断を、開発側には技術的な検討をお願いする構成です。'),
 p('読み方','heading'),p('「試作では」はオーナー判断で仮に実装した内容です。HSによる本番仕様の確定を意味しません。回答が「まだ分からない」の場合は、確認する方と回答予定日だけ決めてください。'),
 p(f'未決事項台帳の未解決{len(questions)}件をすべて収録しています。最優先6件から確認し、回答次第で後続の質問を省略・変更します。技術事項と保留事項は巻末です。'),
 p('再質問しない決定','heading'),p('物件と保証は1対1／保証番号は延長しても変更しない／保証グループの変更は新規保証に適用／工務店ポータルを設け、登録・延長の都度HS承認はしない／HS自身の支店管理は不要。'),
 p('根拠と位置付け','heading'),p('2026-09-28の受領資料4点、09-29の追加回答・LINE回答、10-01の電話報告・Googleフォーム回答、およびオーナーとの27項目の質疑を照合。各ページのHSC番号はプロジェクトの未決事項台帳と対応します。回答による変更は台帳と仕様に反映してから開発します。'),
 p('資料はまだ先方へ送付していません。実装検証・配備状況は別の作業記録で管理します。','small'),PageBreak(),p('確認する順序','title')]
for i,q in enumerate(questions,1):story.append(p(f'{i:02d}　{q["priority"]}　{q["title"]}　［{q["id"]}］','small'))
story.append(PageBreak())
for i,q in enumerate(questions,1):
 story.extend([p(f'{i:02d}　{q["title"]}','heading'),p(f'優先度：{q["priority"]}　｜　管理番号：{q["id"]}','small'),p('試作では：'+q['demo']),HRFlowable(width='100%',thickness=1,color=colors.HexColor('#bfd3df')),Spacer(1,14)])
 for n,item in enumerate(q['questions'],1):story.append(p(f'{n}. {item}','question'))
 story.extend([Spacer(1,12),p('回答・確認メモ','heading'),p('決まったこと：________________________________________________'),Spacer(1,14),p('確認する方：__________________　回答予定日：__________________'),Spacer(1,14),p('次に用意する資料・具体例：______________________________________')])
 if i<len(questions):story.append(PageBreak())
build('HS_未確定仕様事項_全件_2026-10-01.pdf',story)

flows=[
 ('1　開始時の状態とログイン','管理者2件のみ。会社・支店・工務店担当者・物件は空、保証グループHSC/SHS/UHのみ。HS管理者でログインする。','HS管理者とシステム管理者の役割を説明する。実際のログイン情報は資料に記載しない。'),
 ('2　工務店・支店を作る','架空の工務店Aの標準をHSCにする。東支店はSHSを指定、西支店は会社標準を継承する。必要なら他社Bも作る。','会社と支店の関係、支店別グループが実際の運用に合うか（HSC-037/038）。'),
 ('3　担当者アカウントを発行','本店の全店担当、東支店担当、西支店担当をHSが発行し、設定メールを送る。事前に受信できる実演用メールを用意する。','担当者単位・操作範囲、追加／停止担当（HSC-024/038）。パスワードは本人が設定する。'),
 ('4　工務店担当者で初回ログイン','別ブラウザーか別プロファイルで工務店担当者としてログイン。HSの管理タブがないことを示す。','本店は全店、支店は自店、他社情報は扱えない。'),
 ('5　引渡日未定で下書き','物件名、施主などを入力し、引渡日は空で保存。番号が未採番であることを示す。','どこまで未入力で保存したいか（HSC-003）。'),
 ('6　本登録・自動採番','引渡日・住所・面積等を揃えて本登録。郵便番号補完と手入力を示す。申込日、本店HSC／東支店SHS、10年間の期間を確認。','申込日の意味・正式番号・必要項目（HSC-003/004/019）。'),
 ('7　見本保証書PDF','工務店側で「保証書PDF（見本）」を押し、保存したPDFを開く。番号・施主・住所・保証期間を見る。','正式な書式、表裏、発行済み管理・再発行（HSC-037）。見本は正式保証書として使用しない。'),
 ('8　10年間延長','物件を開き確認して延長。番号は同じ、期間が20年まで延び、初回・延長履歴が残ることを示す。','早期／期限後の受付・通知との関係（HSC-005）。'),
 ('9　最長20年と30年','上限20年ではさらに延長不可。上限を30年へ保存しても期間は変わらず、その後の延長操作で30年になる。20年への引下げ不可も示す。','30年の条件と自動判定、上限変更権限（HSC-034）。'),
 ('10　引渡日・施主情報を訂正','変更後の保証期間を確認し保存。履歴で訂正前の期間を示す。必要なら所有者変更の例も話す。','不当な延長の防止、所有者変更と過去情報（HSC-003/029）。'),
 ('11　会社のグループを変更','会社標準をUHへ変更。既存保証は旧番号／旧グループのまま、新しい本店物件はUH形式で採番する。','遡及登録・誤割当例外・正式割当表（HSC-037）。'),
 ('12　月次報告の一覧・CSV','HSへ戻り、新規／延長手続き期間を指定して一覧・CSV出力。複数手続きでも1物件1行。CSV内の期間内最終手続きを確認。','実際は前月引渡しという回答との違い、5年保険更新、指定Excel（HSC-036）。'),
 ('13　取消とHSによる復元','工務店で理由付き取消。報告の通常除外と「取消済みも含める」を示す。HSで理由付き復元し番号・期間が同じことを確認。','取消／誤登録の違い、復元必要性、既報告分の訂正（HSC-035/036）。'),
 ('14　満了案内と担当者の停止','引渡日が約10年前の別物件を登録して満了案内に載せる。通知は画面のみ。HSで工務店アカウントを無効化し、既存ログインも利用不可になることを示す。','通知の時期・宛先・文面、退職／異動の運用（HSC-005/024/038）。')]
story=[p('業務フロー実演ガイド','title'),p('空の状態から、HSと工務店の一連の仕事を見せる','heading'),p('想定構成：基本の流れを先に通し、その後に例外・未確定事項を確認します。操作中に新しい要望が出たら、確定／仮決定／持ち帰りに分けて記録してください。'),
 p('当日までの準備','heading'),p('管理者2件でログインできること、ネット接続、受信できる実演用メール3件以上、PDF閲覧とCSVを開く環境を確認。メール到着に時間がかかる場合は、その間に会社・支店設定の説明をします。'),
 p('実演データは架空の名称・住所・施主で統一します。本番の顧客情報を使いません。初期化後に練習した場合、当日前に同じ初期状態へ戻す必要があります。'),
 p('PDF／CSVの出力は成立した契約・保険加入を意味しません。正式テンプレート・保険業務・請求・30年条件は確認中です。'),PageBreak()]
for i,(title,steps,check) in enumerate(flows):
 story.extend([KeepTogether([p(title,'heading'),p('操作：'+steps),p('その場で確認：'+check,'small'),Spacer(1,18)])])
 if i in [3,7,10]:story.append(PageBreak())
story.extend([PageBreak(),p('追加で見せる分岐パターン','title')])
for title,body in [
 ('会社・支店の境界','本店担当で東西両支店を表示→東支店担当では西支店が見えない→他社Bの物件も見えない。'),
 ('入力不足・通信・競合','必須不足では本登録できない。別タブで先に更新した物件は、古い状態から上書きせず開き直す。再送・二重クリックで二重採番しない。'),
 ('延長時期','将来の満了でも延長可能。過去に満了した架空物件でも延長操作できることを示し、保険の遡及適用とは分けて質問する。'),
 ('期間抽出','同月の本登録＋延長は1行。後の月にも延長していても、前の月に手続きがあれば対象になる。CSVは物件の現在値と指定期間内の最終手続きを表示する。'),
 ('取消の状態','取消中は編集・延長・見本PDF出力をしない。通常一覧の状態絞込、報告の取消を含める設定、HSのみ復元を確認する。'),
 ('上限・年度境界','SHSの3月は前年開始年度、4月は新年度。通番は年度で戻らない。999の次は1000。日付を改ざんして実演せず、自動テスト例で説明する。'),
 ('実装しない機能の説明','請求書、正式帳票、満了メール、自動保険加入、30年条件の判定を説明し、初日必須か後日かを確認する。')]:story.extend([KeepTogether([p(title,'heading'),p(body),Spacer(1,6)])])
story.extend([PageBreak(),p('最後に決めること','title'),p('1. 試作のまま採用する事項\n2. 変更内容と具体例\n3. HS側で確認する人・期限\n4. 帳票原稿・Excel等の受領予定\n5. 本番の開始日と初日必須機能\n6. 受入確認者と最終判断者'),p('記録欄','heading')])
for _ in range(12):story.extend([p('__________________________________________________________________'),Spacer(1,9)])
build('HS_業務フロー実演ガイド_2026-10-03.pdf',story)
print(json.dumps({'unresolved_matters':len(questions),'pdfs':[str(p) for p in OUT.glob('HS_*2026-10-0*.pdf')]},ensure_ascii=False))
