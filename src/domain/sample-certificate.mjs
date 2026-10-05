// A4 sample only. Standard Japanese CID font; no customer template or private font is bundled.
const hex = value => Array.from(String(value)).map(c => {
  const cp=c.codePointAt(0)
  return (cp <= 0xffff ? cp : 0x25a1).toString(16).padStart(4,'0')
}).join('').toUpperCase()
export function sampleCertificatePdf(row, companyName, branchName, issuedDate) {
  const lines = [
    ['白蟻保証書',24,80,765],['見本 — 打ち合わせ用',16,80,725],
    ['正式な保証書ではありません',12,80,700],
    ...[
      ['保証番号',row.warrantyNumber],['施主名',row.ownerName],['物件名',row.name],
      ['所在地',[row.prefecture,row.municipality,row.streetTownAndNumber,row.buildingName].join('')],
      ['工務店',companyName],['支店',branchName],['保証グループ',row.groupName],
      ['保証開始日',row.startDate],['現在の満了日',row.expiryDate],['発行日',issuedDate],
    ].flatMap(([label,value])=> {
      const text=`${label}：${String(value??'')}`
      return Array.from({length:Math.ceil(text.length/30)},(_,i)=>text.slice(i*30,i*30+30))
    }).map((text,i)=>[text,12,65,650-i*24]),
    ['保証内容・免責事項・正式様式は確認中です。',11,65,135],
    ['本書は操作・出力確認のための見本です。',11,65,112],
    ['ハウスソリューション／試作システム',12,65,70],
  ]
  if(lines.filter(([,size,x,y])=>size===12 && x===65 && y>135).length>20) throw new Error('見本保証書の記載が長すぎます。名称・所在地を短くして再出力してください。')
  const stream=lines.map(([t,size,x,y])=>`BT /F1 ${size} Tf ${x} ${y} Td <${hex(t)}> Tj ET`).join('\n')
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts [5 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 2 >> /FontDescriptor 6 0 R /DW 1000 >>',
    '<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 4 /FontBBox [-92 -250 1010 922] /Ascent 880 /Descent -120 /CapHeight 737 /ItalicAngle 0 /StemV 80 >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf='%PDF-1.4\n',offsets=[0]
  objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`})
  const xref=pdf.length
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}
