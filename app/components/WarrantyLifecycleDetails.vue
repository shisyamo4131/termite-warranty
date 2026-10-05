<template>
  <v-card class="my-4 lifecycle-card">
    <v-card-title>保証期間</v-card-title>
    <v-card-text>
      <v-row><v-col cols="12" sm="8"><div class="text-caption">保証開始日 ～ 現在の満了日</div><div class="text-h6">{{ row.startDate }} ～ {{ row.expiryDate }}</div></v-col><v-col cols="12" sm="4"><div class="text-caption">通算保証年数／最長保証期間</div><div class="text-h6">{{ row.years }}年／{{ row.maxYears }}年</div></v-col></v-row>
      <v-divider class="my-4" />
      <div v-for="(period,index) in transactions" :key="period.id" class="period-row">
        <div><div class="font-weight-bold mb-1">{{ period.label }}</div><div>{{ period.startDate }} ～ {{ period.expiryDate }}</div></div>
        <div v-if="showBilling"><div class="text-caption mb-1">請求状態</div><v-chip size="small" :color="period.billingState==='billed' ? 'success' : 'default'">{{ billingLabel(period.billingState) }}</v-chip></div>
        <div><div class="text-caption mb-1">保証満了案内</div><v-chip v-if="index===transactions.length-1" size="small" :color="row.warrantyNotified ? 'success' : 'default'">{{ row.warrantyNotified ? '案内済み' : '未案内' }}</v-chip><span v-else>—</span></div>
        <div class="period-actions">
          <template v-if="editable && showBilling">
            <v-btn v-if="period.billingState!=='billed'" variant="outlined" :disabled="busy || !period.identifiable" @click="$emit('billing','bill',period)">請求済みにする</v-btn>
            <v-btn color="error" v-else variant="outlined" :disabled="busy" @click="$emit('billing','undoBill',period)">請求済みを取り消す</v-btn>
            <v-btn v-if="period.billingState==='unknown'" variant="outlined" :disabled="busy || !period.identifiable" @click="$emit('billing','confirmUnbilled',period)">未請求と確認する</v-btn>
          </template>
          <slot v-if="index===transactions.length-1" name="warranty-actions" />
        </div>
      </div>
      <p class="text-caption mt-3">案内状態は現在の保証満了日についてのみ表示します。<span v-if="showBilling">請求済みは請求の実施記録であり、入金済みではありません。</span></p>
      <v-alert v-if="showBilling && transactions.some(p=>p.billingState==='unknown')" type="info" variant="tonal" class="mt-3">旧データの請求状況は記録されていません。HSで実際の状況を確認して登録してください。</v-alert>
    </v-card-text>
    <v-card-actions v-if="$slots['warranty-footer']" class="justify-end pa-4"><slot name="warranty-footer" /></v-card-actions>
  </v-card>
  <v-card v-if="showInsurance" class="my-4 lifecycle-card">
    <v-card-title>保険の適用・報告状況</v-card-title>
    <v-card-text>
      <v-row><v-col cols="12" md="6"><div class="text-caption">現在の保険期間</div><div>{{ row.insuranceStartDate || '要確認' }} ～ {{ row.insuranceExpiryDate || '要確認' }}</div></v-col><v-col cols="6" md="3"><div class="text-caption mb-1">報告有無</div><v-chip size="small" :color="row.insuranceReported ? 'success' : 'default'">{{ row.insuranceReported ? '報告済み' : '未報告' }}</v-chip></v-col><v-col cols="6" md="3"><div class="text-caption mb-1">次回報告の対象年月</div><v-chip size="small" class="report-status-chip">{{ renewalLabel }}</v-chip></v-col></v-row>
      <v-expansion-panels multiple variant="accordion" class="mt-5">
        <v-expansion-panel v-for="period in insuranceGroups" :key="period.id">
          <v-expansion-panel-title><div><strong>{{ period.label }}</strong><div class="text-body-2 mt-1">{{ period.startDate }} ～ {{ period.expiryDate }}</div><div class="text-caption mt-1">前半・後半の保険報告を確認</div></div></v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-for="half in period.halves" :key="half.startDate" class="insurance-row">
              <div><div class="font-weight-bold mb-1">{{ half.label }}5年の保険</div><div>{{ half.startDate }} ～ {{ half.expiryDate }}</div><v-chip v-if="half.startDate>japanDate()" size="small" class="mt-1">保険対象期間の開始前</v-chip></div>
              <div><div class="text-caption mb-1">保険会社への報告</div><v-chip size="small" :color="half.report ? 'success' : 'default'">{{ half.state }}</v-chip><div v-if="half.report" class="text-caption mt-1">対象月：{{ half.report.month }}</div></div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-alert v-if="incomplete" type="warning" variant="tonal" class="mt-4">旧データの報告記録には不足があります。記録のない期間を未報告とは断定できません。訂正は開発側に確認してください。</v-alert>
      <v-alert v-if="unmatchedReports.length" type="warning" variant="tonal" class="mt-3"><p>現在の保証期間に対応づけられない報告があります。</p><p v-for="report in unmatchedReports" :key="report.requestId">{{ report.startDate }} ～ {{ report.expiryDate }}（{{ report.month }}分・報告済み）</p></v-alert>
      <p class="text-caption mt-3">対象年月は報告する月ではなく「何月分か」を示します（例：9月分は10月月初に報告）。前半・後半は各保証の開始日からの5年ごとの保険対象期間です。表示だけで保険が適用・更新されることはありません。報告・請求の対外訂正はHSが行います。</p>
    </v-card-text>
    <v-card-actions v-if="$slots['insurance-actions']" class="pa-4"><slot name="insurance-actions" /></v-card-actions>
  </v-card>
</template>
<script setup lang="ts">
import { nextInsuranceReportLabel } from '../utils/insuranceReportDisplay.mjs'
import { warrantyTransactions, activeInsuranceReports, japanDate } from '../../src/domain/property-warranty.mjs'
import { calculateExpiryDate, calculateExtensionStartDate } from '../../src/domain/warranty.mjs'
const props=withDefaults(defineProps<{row:Record<string,any>;editable?:boolean;busy?:boolean;showBilling?:boolean;showInsurance?:boolean}>(),{showBilling:true,showInsurance:true})
defineEmits<{billing:[action:string,period:Record<string,any>]}>()
const transactions=computed(()=>warrantyTransactions(props.row).map((period,index):Record<string,any>=>({...period,label:index ? `延長保証（${index}回目）` : '初回保証'})))
const reports=computed(()=>activeInsuranceReports(props.row))
const incomplete=computed(()=>!!props.row.insuranceHistoryIncomplete || (!props.row.insuranceEvents && (!!props.row.insuranceEverRenewed || (!!props.row.insuranceReported && !props.row.insuranceLastReport))))
const insuranceGroups=computed(()=>transactions.value.map(period=>{
  const firstExpiry=calculateExpiryDate(period.startDate,5)
  return {id:period.id,label:period.label,startDate:period.startDate,expiryDate:period.expiryDate,halves:[{label:'前半',startDate:period.startDate,expiryDate:firstExpiry},{label:'後半',startDate:calculateExtensionStartDate(firstExpiry),expiryDate:period.expiryDate}].map(half=>{
    const report=reports.value.find(r=>r.warrantyPeriodId===period.id && r.startDate===half.startDate && r.expiryDate===half.expiryDate)
    return {...half,report,state:report?'報告済み':incomplete.value?'要確認（記録不足）':'未報告'}
  })}
}))
const unmatchedReports=computed(()=>reports.value.filter(report=>!insuranceGroups.value.some(p=>p.halves.some(h=>h.report?.requestId===report.requestId))))
const renewalLabel=computed(()=>nextInsuranceReportLabel(props.row))
const billingLabel=(state:string)=>({pending:'未請求',billed:'請求済み',unknown:'要確認'}[state] || '要確認')
</script>
<style scoped>
.report-status-chip { height: auto; min-height: 26px; max-width: 100%; white-space: normal; padding-block: 4px; }
.report-status-chip :deep(.v-chip__content) { white-space: normal; }
.period-row { display:grid; grid-template-columns:minmax(220px,2fr) minmax(90px,1fr) minmax(100px,1fr); gap:16px; padding:16px 0; border-bottom:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); }
.period-actions { grid-column:1/-1; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
.insurance-row { display:grid; grid-template-columns:minmax(200px,2fr) minmax(120px,1fr); gap:16px; padding:16px 0; }
.insurance-row + .insurance-row { border-top:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); }
@media(max-width:600px) { .period-row,.insurance-row { grid-template-columns:1fr; } .period-actions { justify-content:flex-start; } }
</style>

