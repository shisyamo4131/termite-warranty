export function historicalFixture() {
  const expectedRows={HSC:99,SHS:66,UH:277},companies=[],branches=[],rows=[]
  for(const [group,count] of Object.entries(expectedRows)) {
    companies.push({id:group,name:'架空工務店 '+group,groupId:group,address:{prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1-1'}})
    branches.push({id:group,name:'架空本店',companyId:group,branchCode:group==='UH'?'0001-00':''})
    for(let n=1;n<=count;n++)rows.push({group,sourceRow:n+1,warrantyNumber:(group==='UH'?'':group+'-')+'26-'+String(n).padStart(3,'0'),externalKey:group==='UH'?'0001-'+String(n).padStart(7,'0'):'',companyId:group,branchId:group,fields:{name:'架空物件',address:group==='UH'?'':'架空市1-1',applicationDate:'2026-06-01',handoverDate:'2026-10-01',buildingArea:200,foundationInsulation:false,insulationMaterials:'',maxYears:group==='UH'?10:20}})
  }
  return {schemaVersion:1,workbookId:'fictional-book',sourceSha256:'a'.repeat(64),transformVersion:'fixture-v1',expectedRows,decisions:Object.fromEntries(['H-01','H-02','S-01','S-02','S-03','U-01','excludedNumbers'].map(k=>[k,'fictional approval'])),companies,branches,rows,reservedNumbers:[]}
}
