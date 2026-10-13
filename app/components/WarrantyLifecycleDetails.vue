<template>
  <div class="lifecycle-stack" :class="{'insurance-first':focus==='report'}">
  <v-card border :elevation="0" class="my-4 lifecycle-card dialog-layout-card warranty-card">
    <v-card-title>{{ focus==='certificate' ? '保証書の発行状況' : focus==='billing' ? '保証期間ごとの請求状況' : '保証期間' }}</v-card-title>
    <v-card-text>
      <v-row><v-col cols="12" sm="8"><div class="text-caption">保証開始日 ～ 現在の満了日</div><div class="text-h6">{{ row.startDate }} ～ {{ row.expiryDate }}</div></v-col><v-col cols="12" sm="4"><div class="text-caption">通算保証年数／最長保証期間</div><div class="text-h6">{{ row.years }}年／{{ row.maxYears }}年</div></v-col></v-row>
      <v-divider class="my-4" />
      <div v-for="(period,index) in transactions" :key="period.id" class="period-row">
        <div><div class="font-weight-bold mb-1">{{ period.label }}</div><div>{{ period.startDate }} ～ {{ period.expiryDate }}</div><template v-if="index"><p class="mt-2">延長申込日：{{ period.extensionApplicationDate || '未確認（移行前）' }}</p><p v-if="period.extensionReason" class="waiver-reason">理由：{{ period.extensionReason }}</p></template></div>
        <div v-if="showBilling"><div class="text-caption mb-1">請求状態</div><v-chip size="small" :color="period.billingState==='billed' ? 'success' : 'default'">{{ billingLabel(period.billingState) }}</v-chip></div>
        <div><div class="text-caption mb-1">保証満了案内</div><v-chip v-if="index===transactions.length-1" size="small" :color="row.warrantyNotified ? 'success' : 'default'">{{ row.warrantyNotified ? '案内済み' : '未案内' }}</v-chip><span v-else>—</span></div>
        <div><div class="text-caption mb-1">保証書</div><v-chip size="small" :color="period.certificateIssued ? 'success' : 'default'">{{ period.identifiable ? period.certificateIssued ? '発行済み' : '未発行' : '要確認（期間記録不足）' }}</v-chip></div>
        <div class="period-actions">
          <v-btn v-if="allowCertificateUndo && period.certificateIssued" color="error" variant="outlined" :disabled="busy || !period.identifiable" @click="$emit('billing','undoCertificate',period)">発行済みを取り消す</v-btn>
          <template v-if="editable && showBilling">
            <v-btn v-if="period.billingState!=='billed'" variant="outlined" :disabled="busy || !period.identifiable" @click="$emit('billing','bill',period)">請求済みにする</v-btn>
            <v-btn color="error" v-else variant="outlined" :disabled="busy" @click="$emit('billing','undoBill',period)">請求済みを取り消す</v-btn>
            <v-btn v-if="period.billingState==='unknown'" variant="outlined" :disabled="busy || !period.identifiable" @click="$emit('billing','confirmUnbilled',period)">未請求と確認する</v-btn>
          </template>
          <slot v-if="index===transactions.length-1" name="warranty-actions" />
        </div>
      </div>
      <p class="text-caption mt-3">案内状態は現在の保証満了日についてのみ表示します。<span v-if="showBilling">請求済みは請求の実施記録であり、入金済みではありません。</span></p>
      <v-alert v-if="showBilling && transactions.some(p=>p.billingState==='unknown')" type="info" class="mt-4">旧データの請求状況は記録されていません。HSで実際の状況を確認して登録してください。</v-alert>
    </v-card-text>
    <v-card-actions v-if="$slots['warranty-footer']" class="justify-end pa-4"><slot name="warranty-footer" /></v-card-actions>
  </v-card>
  <v-card v-if="showInsurance" border :elevation="0" class="my-4 lifecycle-card dialog-layout-card insurance-card">
    <v-card-title>保険の適用・報告状況</v-card-title>
    <v-card-text>
      <div class="text-caption mb-1">次回報告の対象年月</div><v-chip size="small" class="report-status-chip mb-4">{{ renewalLabel }}</v-chip>
      <section v-for="period in insurancePeriods" :key="period.id" class="insurance-period" :class="{'insurance-current':period.startDate<=today && today<=period.expiryDate}" :aria-label="`${period.startDate}から${period.expiryDate}の保険`">
        <div class="d-flex flex-wrap align-center ga-2 mb-2"><strong>{{ transactions.find(p=>p.id===period.warrantyPeriodId)?.label }}・{{ period.half===1 ? '前半' : '後半' }}5年の保険</strong><v-chip v-if="period.startDate<=today && today<=period.expiryDate" size="small" color="primary">現在の期間</v-chip><v-chip v-if="matchesSelectedInsurancePeriod(period,selectedInsurancePeriod)" size="small" color="info">一覧で選んだ期間</v-chip></div>
        <div class="mb-3">{{ period.startDate }} ～ {{ period.expiryDate }}<v-chip v-if="period.startDate>today" size="small" class="ml-2">保険対象期間の開始前</v-chip></div>
        <div class="d-flex flex-wrap align-center ga-3"><v-chip :color="period.state==='reported' ? 'success' : period.state==='waived' ? 'secondary' : period.state===null ? 'warning' : 'default'" size="small">{{ insuranceStateLabel(period.state) }}</v-chip>
          <template v-if="insuranceEditable && row.status==='active' && period.expiryDate>=today">
            <v-btn v-if="period.state==='pending'" variant="outlined" :disabled="busy" @click="$emit('insurance','waiveInsurance',period)">報告不要にする</v-btn>
            <v-btn v-if="period.state==='waived'" color="error" variant="outlined" :disabled="busy" @click="$emit('insurance','undoInsuranceWaiver',period)">報告不要を取り消す</v-btn>
          </template>
          <span v-if="period.state==='waived' && period.expiryDate<today" class="text-caption">期間終了のため取消不可</span>
        </div>
        <dl v-if="period.state==='waived'" class="waiver-facts mt-3"><dt>理由</dt><dd class="waiver-reason">{{ waiver(period.waiverId)?.reason || '記録を確認できません' }}</dd><dt>設定者</dt><dd>{{ waiver(period.waiverId)?.actorName || waiver(period.waiverId)?.actorUid || '要確認' }}</dd><dt>設定日時</dt><dd>{{ eventTime(waiver(period.waiverId)?.at) }}</dd></dl>
        <p v-if="period.state===null" class="text-body-2 mt-3">期間の状態を確認できません。記録を確認してください。</p>
      </section>
      <v-alert v-if="incomplete" type="warning" class="mt-4">旧データの報告記録には不足があります。記録のない期間を未報告とは断定できません。訂正は開発側に確認してください。</v-alert>
      <v-alert v-if="unmatchedReports.length" type="warning" class="mt-4"><p>現在の保証期間に対応づけられない報告があります。</p><p v-for="report in unmatchedReports" :key="report.requestId">{{ report.startDate }} ～ {{ report.expiryDate }}（{{ report.month }}分・報告済み）</p></v-alert>
      <p class="text-caption mt-3">対象年月は報告する月ではなく「何月分か」を示します（例：9月分は10月月初に報告）。前半・後半は各保証の開始日からの5年ごとの保険対象期間です。表示だけで保険が適用・更新されることはありません。報告・請求の対外訂正はHSが行います。</p>
    </v-card-text>
    <v-card-actions v-if="$slots['insurance-actions']" class="pa-4"><slot name="insurance-actions" /></v-card-actions>
  </v-card>
  </div>
</template>
<script setup lang="ts">
import { certificatePeriods } from '../../src/domain/warranty-certificate.mjs'
import { nextInsuranceReportLabel, matchesSelectedInsurancePeriod } from '../utils/insuranceReportDisplay.mjs'
import { warrantyTransactions, activeInsuranceReports, japanDate } from '../../src/domain/property-warranty.mjs'
import { insurancePeriodStates } from '../../src/domain/insurance-state.mjs'
const props=withDefaults(defineProps<{row:Record<string,any>;focus?:string;editable?:boolean;allowCertificateUndo?:boolean;busy?:boolean;showBilling?:boolean;showInsurance?:boolean;insuranceEditable?:boolean;selectedInsurancePeriod?:Record<string,any>|null}>(),{showBilling:true,showInsurance:true})
defineEmits<{billing:[action:string,period:Record<string,any>];insurance:[action:string,period:Record<string,any>]}>()
const transactions=computed(()=>certificatePeriods(props.row).map((period,index):Record<string,any>=>({...period,label:index ? `延長保証（${index}回目）` : '初回保証'})))
const reports=computed(()=>activeInsuranceReports(props.row))
const incomplete=computed(()=>!!props.row.insuranceHistoryIncomplete || (!props.row.insuranceEvents && (!!props.row.insuranceEverRenewed || (!!props.row.insuranceReported && !props.row.insuranceLastReport))))
const insurancePeriods=computed(()=>insurancePeriodStates(props.row).slice().sort((a,b)=>a.startDate.localeCompare(b.startDate)))
const today=ref(japanDate())
let dateTimer:ReturnType<typeof setInterval>
onMounted(()=>{dateTimer=setInterval(()=>{today.value=japanDate()},30000)})
onUnmounted(()=>clearInterval(dateTimer))
const waiver=(id?:string)=>(props.row.insuranceWaiverEvents ?? []).find((event:Record<string,any>)=>event.kind==='waive' && event.id===id)
const insuranceStateLabel=(state:string|null)=>({pending:'未報告',reported:'報告済み',waived:'報告不要'}[state ?? ''] ?? '要確認（記録不足）')
const eventTime=(value:unknown)=>{const date=new Date(String(value ?? ''));return Number.isNaN(date.getTime()) ? '要確認' : new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'medium'}).format(date)}
const unmatchedReports=computed(()=>reports.value.filter(report=>!insurancePeriods.value.some(p=>p.startDate===report.startDate && p.expiryDate===report.expiryDate && p.warrantyPeriodId===report.warrantyPeriodId)))
const renewalLabel=computed(()=>nextInsuranceReportLabel(props.row))
const billingLabel=(state:string)=>({pending:'未請求',billed:'請求済み',unknown:'要確認'}[state] || '要確認')
</script>
<style scoped>
.insurance-period { padding:16px; margin-top:16px; border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:8px; }
.insurance-current { border:2px solid rgb(var(--v-theme-primary)); background:rgba(var(--v-theme-primary),0.04); padding:20px; }
.waiver-facts { display:grid; grid-template-columns:6em minmax(0,1fr); gap:8px; }
.waiver-reason { white-space:pre-wrap; overflow-wrap:anywhere; }
.report-status-chip { height: auto; min-height: 26px; max-width: 100%; white-space: normal; padding-block: 4px; }
.report-status-chip :deep(.v-chip__content) { white-space: normal; }
.period-row { display:grid; grid-template-columns:minmax(220px,2fr) repeat(3,minmax(90px,1fr)); gap:16px; padding:16px 0; border-bottom:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); }
.period-actions { grid-column:1/-1; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
.insurance-row { display:grid; grid-template-columns:minmax(200px,2fr) minmax(120px,1fr); gap:16px; padding:16px 0; }
.insurance-row + .insurance-row { border-top:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); }
@media(max-width:600px) { .period-row,.insurance-row { grid-template-columns:1fr; } .period-actions { justify-content:flex-start; } }
</style>


<style scoped>
.lifecycle-stack{display:flex;flex-direction:column}
.insurance-first .insurance-card{order:-1}
</style>
