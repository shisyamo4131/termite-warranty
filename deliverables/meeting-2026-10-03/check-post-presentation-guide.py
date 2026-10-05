"""Documentation/artifact checks only; no application tests or external access."""
from pathlib import Path
import re
import sys
from datetime import date, timedelta
from pypdf import PdfReader
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[2]
PDF=ROOT/'output/pdf/第1回プレゼン後提案事項.pdf'
reader=PdfReader(PDF)
assert len(reader.pages)==12
texts=[p.extract_text().replace('\n','') for p in reader.pages]
required={
 0:['初期はHSが入力','利用開始は延期'],
 1:['保証グループ','支店独自','旧保証番号','無効を含む'],
 2:['引渡日は全グループで本登録時必須','郵便番号は任意','年度切替でリセット','HSC-26-001','26-001（接頭辞なし）'],
 3:['初回は一律10年','20年または30年','時期制限なく','2か月前'],
 4:['基本契約','203010','203009','2026〜2029年'],
 5:['チェック','直近','2036年10月5日'],
 6:['報告する時期・対象はHSが判断','一律の自動繰越','全件未報告'],
 7:['元の保証開始日','延長後の満了日','印刷履歴','保険申込','空欄'],
 8:['変更前の所有者情報','新しい番号','保存','取消済み'],
 9:['優先1','優先2','優先3','自動判定は行いません'],
 10:['Word','初期登録用','利用開始','対応時間'],
 11:['13大項目','技術判断2項目','将来対応3項目','14→13']
}
# Page 6 describes user selection in ordinary words, not a forced checkbox label.
required[5][0]='HSが選んだ物件だけ'
for i,words in required.items():
 for word in words: assert word in texts[i],(i+1,word)
 assert '仕様書0.1.90' in texts[i],i+1
 assert f'{i+1} / 12' in texts[i],i+1
assert not re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', ''.join(texts))
with pdfplumber.open(PDF) as doc:
 for n,p in enumerate(doc.pages,1):
  for ch in p.chars:
   assert 20<=ch['x0'] and ch['x1']<=p.width-20,(n,'horizontal',ch['text'])
   assert 15<=ch['top'] and ch['bottom']<=p.height-12,(n,'vertical',ch['text'])

reg=(ROOT/'docs/requirements/house-solution-confirmations.md').read_text(encoding='utf-8')
unresolved=reg.split('## Unresolved Matters',1)[1].split('## Resolved Matters',1)[0]
ids=set(re.findall(r'^\| (HSC-\d+) \|',unresolved,re.M))
expected={'HSC-'+i for i in ['001','002','015','025','034','035','036','037','022','023','013','030','038']}
assert ids==expected,(ids,expected)
assert '| HSC-032 |' in reg.split('## Resolved Matters',1)[1]

docs=['docs/specification.md','docs/README.md','docs/roadmaps/2026-initial-delivery.md',
      'docs/requirements-review-2026-09-29.md','docs/requirements/house-solution-confirmations.md',
      'deliverables/meeting-2026-10-03/README.md']
docs+=['docs/requirements/'+n+'.md' for n in ['workflow','master-management','search-and-list','alerts-and-dashboard','case-warranties','insurance-reporting','initial-data-model','branches-and-addresses','security-and-access','delivery-and-technology']]
docs+=['docs/requirements/house-solution-confirmations/'+n+'.md' for n in ['HSC-013-construction-company-submission','HSC-032-case-list-month-basis','HSC-038-company-branches-recipients']]
count=0
for rel in docs:
 p=ROOT/rel;s=p.read_text(encoding='utf-8')
 for link in re.findall(r'\]\(([^)]+)\)',s):
  link=link.strip('<>').split('#',1)[0]
  if not link or re.match(r'^[a-zA-Z][\w+.-]*:',link): continue
  # Historical prose placeholders are not Markdown resource references.
  assert (p.parent/link).exists(),(rel,link)
  count+=1
road=(ROOT/'docs/roadmaps/2026-initial-delivery.md').read_text(encoding='utf-8')
weights=[]
for line in road.splitlines():
 if re.match(r'^\| M[1-5] \|',line): weights.append(int(line.split('|')[4].strip().rstrip('%')))
assert weights==[25,15,25,15,20] and sum(weights)==100
assert 'Progress: 0%' in road
assert date(2025+5,10,6)-timedelta(days=1)==date(2030,10,5)
assert date(2025+5,10,1)-timedelta(days=1)==date(2030,9,30)
print(f'PASS: 12 PDF pages, required decisions, text bounds and no email identifiers; 13 open IDs; {count} local links; 100% milestone weights; date examples')
