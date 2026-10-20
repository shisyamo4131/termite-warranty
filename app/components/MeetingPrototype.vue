<template>
  <v-app-bar color="primary"><v-btn v-if="!mdAndUp" icon="$menu" aria-label="業務メニューを開く" @click="drawerOpen=true" /><v-app-bar-title>白蟻保証 業務管理</v-app-bar-title><template #append><span class="mr-3 d-none d-md-inline">{{ profile?.displayName }}</span><v-btn prepend-icon="svg:M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12M4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" @click="logout">ログアウト</v-btn></template></v-app-bar>
  <v-navigation-drawer :model-value="mdAndUp || drawerOpen" :permanent="mdAndUp" :temporary="!mdAndUp" width="248" @update:model-value="drawerOpen=$event">
    <nav aria-label="業務メニュー"><v-list nav density="compact">
      <v-list-subheader>日常業務</v-list-subheader>
      <v-list-item tag="button" type="button" role="button" :tabindex="busy ? -1 : 0" class="w-100 text-left business-navigation-item" v-for="item in businessNavigation.filter(item=>['dashboard','properties'].includes(item.value))" :key="item.value" :active="tab===item.value" :disabled="busy" color="primary" :aria-current="tab===item.value ? 'page' : undefined" @click="navigate(item.value)"><template #prepend><BusinessNavigationIcon :item="item.value" /></template><v-list-item-title>{{ item.title }}</v-list-item-title></v-list-item>
      <v-list-subheader>月次業務</v-list-subheader>
      <v-list-item tag="button" type="button" role="button" :tabindex="busy ? -1 : 0" class="w-100 text-left business-navigation-item" v-for="item in businessNavigation.filter(item=>!['dashboard','properties'].includes(item.value))" :key="item.value" :active="tab===item.value" :disabled="busy" color="primary" :aria-current="tab===item.value ? 'page' : undefined" @click="navigate(item.value)"><template #prepend><BusinessNavigationIcon :item="item.value" /></template><v-list-item-title>{{ item.title }}</v-list-item-title></v-list-item>
      <v-list-subheader v-if="managementNavigation.length">その他業務</v-list-subheader>
        <v-list-item tag="button" type="button" role="button" :tabindex="busy ? -1 : 0" class="w-100 text-left business-navigation-item" v-for="item in managementNavigation" :key="item.value" :active="tab===item.value" :disabled="busy" color="primary" :aria-current="tab===item.value ? 'page' : undefined" @click="navigate(item.value)"><template #prepend><BusinessNavigationIcon :item="item.value" /></template><v-list-item-title class="text-wrap">{{ item.title }}</v-list-item-title></v-list-item>
    </v-list></nav>
  </v-navigation-drawer>
  <v-main class="business-main"><v-container class="py-4 business-workspace" :class="{ 'business-organization-workspace': tab==='settings' && staff }" style="max-width:1600px">
    <v-alert v-if="references.status.value!=='ready'" :type="references.status.value==='error' ? 'error' : 'warning'" class="mb-4">{{ references.error.value || '参照マスタの最新状態を確認中です。' }}<v-btn variant="text" @click="run(loadCatalog)">再取得</v-btn></v-alert>
    <v-alert v-if="recoveryReadOnly" type="warning" class="mb-4">HS確認待ちです。閲覧とCSV出力のみ利用できます。業務再開の了承はシステム外で開発側へお知らせください。</v-alert>
    <v-alert v-if="errors.page" type="error" closable class="mb-4" @click:close="errors.page=''">{{ errors.page }}</v-alert>
    <v-progress-linear v-if="busy" indeterminate class="mb-3" />
    <BusinessDashboard v-if="tab==='dashboard' && staff" @navigate="navigate" />
    <CompanySettings v-else-if="tab==='companySettings' && staff" :key="JSON.stringify([referenceScope,recoveryRuntime])" ref="companySettingsView" @busy="busy=$event" />
    <RecoveryStatus v-else-if="tab==='recovery' && manager" />
    <StaffAccountManagement v-else-if="tab==='staff' && manager" />
    <WarrantyCertificateManagement v-else-if="['certificates','billing'].includes(tab) && staff" :key="JSON.stringify([tab,referenceScope,recoveryRuntime])" :kind="tab" :refresh="periodRefresh" :call="call" :read-only="recoveryReadOnly" @open="openProperty" @busy="busy=$event" />
    <template v-else-if="['properties','report','billing','alerts','insuranceAlerts'].includes(tab)">
      <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-4"><h1 class="text-h5 business-page-title"><BusinessNavigationIcon :item="tab" /><span>{{ tab==='billing' ? '請求用一覧（新規・延長）' : tab==='report' ? '保険会社への月次報告' : tab==='insuranceAlerts' ? '保険満了案内の対象' : tab==='alerts' ? '保証満了案内の対象' : '物件・保証' }}</span><v-tooltip v-if="tab==='report'" location="bottom" max-width="520" open-on-click><template #activator="{ props: tooltipProps }"><v-btn v-bind="tooltipProps" icon="$info" variant="text" size="small" aria-label="抽出条件・操作の注意" /></template><div class="text-body-2">指定年月の前月以前の未報告分を抽出します。「報告済みを含める」では前月分だけの未報告・報告済み期間を表示します。新規は引渡年月、更新は保険満了年月が基準です。チェックした期間だけを出力します。<span v-if="!recoveryReadOnly">実際に提出した分を別操作で報告済みにしてください。</span>過去の初回未報告分は、基準月末を含む保険期間が対象です。記録不足で期間確認が必要な物件はここから報告できません。</div></v-tooltip></h1><div class="d-flex flex-wrap ga-2"><v-btn v-if="tab==='properties' && staff && !recoveryReadOnly" variant="outlined" :disabled="busy" @click="openBulkImport">一括取込み</v-btn><v-btn variant="flat" v-if="tab==='properties' && !recoveryReadOnly" color="primary" :disabled="busy" @click="newProperty">物件を新規登録</v-btn></div></div>
      <v-alert v-if="tab==='billing'" type="info" class="mb-4">新規分は申込日の年月、延長分は延長後の保証開始年月で検索します。延長取消済みの手続きは含みません。対象年月を変更したら「検索・更新」を押してください。</v-alert>
      <v-alert v-if="tab==='alerts' || tab==='insuranceAlerts'" type="info" class="mb-4">満了{{ tab==='insuranceAlerts' ? alertSettings.insuranceMonths : alertSettings.warrantyMonths }}か月前から、期限を過ぎた物件も表示します。<span v-if="tab==='alerts'">未案内の物件だけを表示し、案内済みにすると一覧から外れます。</span>実際のメールは送りません。<span v-if="tab==='insuranceAlerts'">報告実績のある物件の、次の未報告期間に向けた準備の案内です。報告不要の期間は飛ばします。初回未報告は保険報告用一覧で確認します。</span></v-alert>
      <v-card class="mb-4"><v-card-text><v-form ref="searchForm" @submit.prevent="loadRows"><v-row :class="{ 'monthly-search-comfortable': tab==='report' }">
        <v-col v-if="tab==='properties'" cols="12"><div class="d-flex flex-wrap align-start ga-3"><v-text-field v-model="filter.warrantyNumber" :rules="optionalRules" label="保証番号（全体・完全一致）" clearable hide-details class="property-quick-search" /><div class="property-search-actions d-flex align-center ga-3"><v-btn color="primary" variant="flat" :disabled="busy" @click="loadRows">検索</v-btn><v-btn variant="outlined" :disabled="busy" @click="clearFilter">条件をクリア</v-btn></div></div></v-col>
        <v-col v-if="tab==='billing'" cols="12"><v-row><v-col cols="12" md="3"><v-text-field v-model="filter.warrantyNumber" :rules="optionalRules" label="保証番号（全体・完全一致）" clearable hide-details /></v-col><v-col cols="12" md="4"><v-text-field v-model="filter.search" :rules="optionalRules" label="物件名・住所（2文字以上）" clearable hide-details /></v-col>
        <v-col v-if="staff || profile?.accountType==='construction_company' && profile.scope==='company'" cols="6" md="2"><v-select v-model="filter.branchId" :items="branches" :item-title="branchOptionLabel" item-value="id" label="本支店" clearable hide-details /></v-col>
        <v-col v-if="staff" cols="6" md="2"><v-select v-model="filter.companyId" :items="companies" item-title="name" item-value="id" label="工務店" clearable hide-details /></v-col>
        <v-col cols="6" md="2"><v-select v-model="filter.groupId" :items="groups" item-title="name" item-value="id" label="保証グループ" clearable hide-details /></v-col>
        <v-col cols="6" md="2"><v-text-field v-model="filter.fiscalYear" :rules="[yearRule]" label="年度（例：2026）" clearable hide-details /></v-col>
        </v-row></v-col><v-col v-if="tab==='report' || tab==='billing'" cols="6" md="3"><BusinessDateInput v-model="filter.month" :rules="[requiredRule,monthRule]" type="month" label="指定年月" :disabled="busy" /></v-col>
        <v-col v-if="tab!=='properties'" :cols="tab==='report' ? 6 : 12" class="business-search-actions" :class="{ 'report-search-actions': tab==='report' }"><div class="d-flex flex-wrap ga-2" :class="tab==='report' ? 'property-search-actions align-center' : 'align-start'"><v-btn v-if="tab!=='properties'" variant="flat" color="primary" :disabled="busy" @click="loadRows">{{ tab==='report' ? '対象を抽出' : ['alerts','insuranceAlerts'].includes(tab) ? '一覧を更新' : '検索・更新' }}</v-btn><v-btn v-if="!['alerts','insuranceAlerts'].includes(tab)" variant="outlined" :disabled="busy" @click="clearFilter">条件をクリア</v-btn></div></v-col>
        <v-col v-if="tab==='report'" cols="12"><p v-if="reportBasisMonth" class="text-body-2 mb-2">対象：{{ reportBasisMonth }}月分</p><v-checkbox v-model="filter.includeDone" label="報告済みを含める" hide-details :disabled="busy" /></v-col>
      </v-row><div v-if="tab==='properties' && appliedPropertyFilters.length" class="d-flex flex-wrap ga-2 mt-3" aria-label="適用中の検索条件"><v-chip v-for="item in appliedPropertyFilters" :key="item.key" size="small" closable :disabled="busy" @click:close="removePropertyFilter(item.key)">{{ item.label }}</v-chip></div></v-form></v-card-text></v-card>
      <v-alert v-if="tab==='report' && loadedReportIncludeDone && reportUnclassifiedCount" type="warning" class="mb-4">取得した候補のうち{{ reportUnclassifiedCount }}件に、対象月または報告期間を確認できない記録があります。確認できた期間だけ表示しています。物件・保証の詳細で記録を確認してください。</v-alert>
      <p v-if="tab!=='report'" class="text-body-2 mb-3">{{ rows.length }}件{{ limited ? '（条件なし：更新が新しい20件まで）' : '' }}</p>
      <p v-else-if="reportDirty" class="text-body-2 mb-3" role="status">条件を変更しました。再抽出してください。</p>
      <v-card class="business-results"><v-card-text class="business-results-content" :class="{ 'pa-0': !['report','billing'].includes(tab) }">
        <div v-if="['report','billing'].includes(tab)" class="business-count-summary" aria-live="polite">
          <span>抽出 <strong>{{ rows.length }}件</strong></span>
          <span>選択 <strong>{{ selectedRows.length }}件</strong></span>
          <span v-if="tab==='report'">今回報告済みにする対象 <strong>{{ pendingSelectedRows.length }}件</strong></span>
          <span v-if="rows.some(r=>r.reportKind==='review')" class="text-warning">要確認 <strong>{{ rows.filter(r=>r.reportKind==='review').length }}件</strong></span>
        </div>
      <div v-if="['report','billing'].includes(tab)" class="business-selection-bar">
        <v-checkbox :model-value="allSelected" :indeterminate="selectedRows.length>0 && !allSelected" :disabled="busy || reportDirty || !selectableRows.length" label="全ページの対象を選択" hide-details @update:model-value="toggleAll" />
        <div class="d-flex flex-wrap ga-2"><v-btn variant="outlined" v-if="staff && ['report','billing'].includes(tab)" :disabled="!selectedRows.length || busy || reportDirty" @click="exportCsv">CSV出力</v-btn><v-btn variant="flat" color="primary" v-if="tab==='report' && !recoveryReadOnly" :disabled="!pendingSelectedRows.length || busy || reportDirty" @click="reportConfirm=true">報告済みにする</v-btn></div>
      </div>
      <v-table ref="listTable" class="business-list-table" density="compact" fixed-header><thead><tr><th v-if="['report','billing'].includes(tab)">出力</th><th>物件名</th><th>工務店／本支店</th><th>保証番号</th><th>{{ tab==='properties' ? '申込日／引渡日' : '引渡日／申込日' }}</th><th>{{ tab==='report' ? '報告対象の保険期間／保証期間' : tab==='insuranceAlerts' ? '次の報告対象期間' : tab==='billing' ? '請求対象の保証期間' : '現在の保証期間' }}<template v-if="tab==='properties'"><br>現在の保険期間</template></th><th>状態</th></tr></thead><tbody><tr v-for="row in visibleRows" :key="rowKey(row)"><td v-if="['report','billing'].includes(tab)"><v-checkbox v-model="selectedKeys" :aria-label="`${row.name}を選択`" :value="rowKey(row)" :disabled="row.reportKind==='review' || busy || reportDirty" hide-details /></td><td><a :href="`#property-${row.id}`" class="property-detail-link" aria-haspopup="dialog" @click.prevent="openProperty(row.id,row.reportTarget)">{{ row.name }}</a></td><td>{{ row.companyLabel || companyName(row.constructionCompanyId) }}<br>{{ row.branchLabel || branchName(row.branchId) }}</td><td>{{ row.warrantyNumber || '未採番' }}<br><small>{{ references.name('groups',row.groupId) }}</small></td><td><template v-if="tab==='properties'">{{ row.applicationDate || '未登録' }}<br>{{ row.handoverDate || '引渡日未設定' }}</template><template v-else>{{ row.handoverDate || '引渡日未設定' }}<br>{{ row.applicationDate || '未登録' }}</template></td><td><template v-if="tab==='report'"><div>保険：{{ row.reportTarget?.startDate || '要確認' }} ～ {{ row.reportTarget?.expiryDate || '要確認' }}</div><div class="mt-1">保証：{{ row.reportTarget?.warrantyStartDate || '要確認' }} ～ {{ row.reportTarget?.warrantyExpiryDate || '要確認' }}</div></template><template v-else>{{ (tab==='report' ? row.reportTarget?.startDate : tab==='insuranceAlerts' ? insuranceReportingCandidates(row)[0]?.startDate : tab==='billing' ? row.billingStartDate : row.startDate) || '—' }} ～ {{ (tab==='report' ? row.reportTarget?.expiryDate : tab==='insuranceAlerts' ? insuranceReportingCandidates(row)[0]?.expiryDate : tab==='billing' ? row.billingExpiryDate : row.expiryDate) || '—' }}</template><div v-if="tab==='properties'" class="mt-1">{{ currentInsuranceSummary(row) }}</div></td><td><v-chip :color="row.status==='active'?'success':row.status==='cancelled'?'error':'default'" size="small">{{ statusLabel(row.status) }}</v-chip><div v-if="tab==='report'">{{ reportLabel(row.reportKind) }}／{{ row.reportTarget?.warrantyPeriodLabel }}<div>{{ row.reportState==='reported' ? '報告済み' : row.reportState==='pending' ? '未報告' : '要確認' }}</div></div><div v-if="tab==='billing'">{{ row.billingKind }}：{{ row.billingDate }}／{{ billingLabel(row.billingState) }}</div><div v-if="tab==='alerts'">{{ row.warrantyNotified ? '案内済み' : '未案内' }}／{{ row.years>=row.maxYears ? '最終満了・延長不可' : '延長可能' }} {{ row.expiryDate<japanDate() ? '／満了済み' : '' }}</div></td></tr><tr v-if="!rows.length"><td colspan="7" class="py-8 text-center">該当する物件はありません。</td></tr></tbody></v-table><v-pagination v-if="rows.length>20" v-model="page" :length="Math.ceil(rows.length/20)" :disabled="busy" /></v-card-text></v-card>
    </template>
    <template v-else-if="tab==='alertSettings' && manager">
      <h1 class="text-h5 mb-4 business-page-title"><BusinessNavigationIcon item="alertSettings" /><span>アラート設定</span></h1><v-card max-width="650"><v-card-text><v-form ref="alertsForm" @submit.prevent="saveAlertSettings"><v-select v-model="alertSettings.warrantyMonths" :rules="[requiredRule]" :items="monthOptions" label="保証満了の何か月前から表示するか" /><v-select v-model="alertSettings.insuranceMonths" :rules="[requiredRule]" :items="monthOptions" label="保険満了の何か月前から表示するか" /><v-btn variant="flat" color="primary" :disabled="busy" @click="saveAlertSettings">設定を保存</v-btn></v-form></v-card-text></v-card>
    </template>
    <template v-else-if="tab==='settings' && staff">
      <WarrantyOrganizationManagement :groups="groups" :companies="companies" :branches="branches" :group-id="selectedGroupId" :company-id="selectedCompanyId" :busy="busy" @select-group="selectGroup" @select-company="selectCompany" @edit="openSetting" @reenable="reenableSetting"><template #refresh><v-btn variant="outlined" :disabled="busy" @click="run(()=>loadCatalog(true))">最新の設定を取得</v-btn></template></WarrantyOrganizationManagement>
    </template>
    <template v-else-if="tab==='accounts' && manager">
      <div class="d-flex justify-space-between mb-4"><h1 class="text-h5">工務店担当者アカウント</h1><v-btn variant="flat" color="primary" :disabled="busy" @click="openAccount">担当者を追加</v-btn></div><p class="mb-4">HSが担当者ごとに発行します。本店の全店担当は自社全店、本支店担当は所属本支店の物件を操作します。</p>
      <v-text-field v-model="accountSearch" label="氏名・メール・工務店で絞り込み" clearable /><v-pagination v-model="accountPage" :length="Math.max(1,Math.ceil(accountRows.length/20))" /><v-card><v-table ref="accountTable"><thead><tr><th>氏名</th><th>メールアドレス</th><th>工務店／範囲</th><th>状態</th><th>操作</th></tr></thead><tbody><tr v-for="a in accountRows.slice((accountPage-1)*20,accountPage*20)" :key="a.id"><td>{{ a.displayName }}</td><td>{{ a.email }}</td><td>{{ companyName(a.constructionCompanyId) }}／{{ a.scope==='company'?'自社全店':branchName(a.branchId) }}</td><td>{{ a.enabled?'有効':'無効' }}</td><td><v-btn class="ma-1" variant="outlined" :disabled="busy" @click="toggleAccount(a)">{{ a.enabled?'無効化':'再有効化' }}</v-btn><v-btn class="ma-1" variant="outlined" :disabled="busy" @click="resend(a.email)">設定メール再送</v-btn></td></tr></tbody></v-table></v-card>
    </template>

    <v-dialog v-model="propertyDialog" max-width="1000" persistent scrollable><v-card :border="false" class="business-dialog"><BusinessDialogHeader :title="noticeMode ? detailTitle : '物件・保証の編集'" :subtitle="`${current?.warrantyNumber || '物件の下書き'} — ${noticeMode ? current?.name || '' : form.name || '新規物件'}`" :status="current?.status==='cancelled' ? '取消済み・閲覧のみ' : noticeMode ? '物件情報は閲覧のみ' : '編集'" :icon="noticeMode==='certificate' ? 'certificates' : noticeMode==='billing' ? 'billing' : noticeMode==='report' ? 'report' : 'properties'" :busy="busy || catalogBusy || !!pendingProperty" @close="!pendingProperty && (propertyDialog=false)" /><v-card-text><v-alert v-if="pendingProperty" type="warning" class="mb-4">{{ pendingMessage(pendingProperty) }}<v-btn variant="outlined" :disabled="busy" @click="retryProperty">{{ pendingProperty.phase==='unknown' ? '同じ内容で再試行' : '最新情報を再取得' }}</v-btn></v-alert><div :inert="!!pendingProperty || busy">
      <v-alert v-if="errors.property" type="error" class="mb-4">{{ errors.property }}</v-alert>
      <v-alert v-if="current?.status==='cancelled'" type="warning" class="mb-4">取消済みです。HSで復元するまで編集できません。</v-alert>
      <template v-if="noticeMode && current">

        <v-card v-if="['warranty','insurance'].includes(noticeMode)" border :elevation="0" class="dialog-layout-card"><v-card-title>{{ ['warranty','billing'].includes(noticeMode) ? '保証の満了・案内状況' : '保険の満了・報告状況' }}</v-card-title><v-card-text><dl class="notice-details">
          <dt>対象期間</dt><dd>{{ ['warranty','billing'].includes(noticeMode) ? current.startDate : insuranceReportingCandidates(current)[0]?.startDate }} ～ {{ ['warranty','billing'].includes(noticeMode) ? current.expiryDate : insuranceReportingCandidates(current)[0]?.expiryDate }}</dd>
          <template v-if="['warranty','billing'].includes(noticeMode)"><dt>案内状況</dt><dd>{{ current.warrantyNotified ? '案内済み' : '未案内' }}</dd><dt>保証年数／上限</dt><dd>{{ current.years }}年／{{ current.maxYears }}年 — {{ current.years>=current.maxYears ? '最終満了・延長不可' : '延長可能' }}</dd></template>
          <template v-else><dt>現在の期間・状態</dt><dd>{{ currentInsuranceSummary(current) }}</dd><dt>次回報告の対象年月</dt><dd>{{ insuranceRenewalLabel(current) }}</dd></template>
        </dl></v-card-text></v-card>
        <p v-if="!recoveryReadOnly" class="text-body-2 mt-4">{{ noticeMode==='warranty' ? '連絡はHSが別途行います。ここでは案内状況のみ変更できます。' : noticeMode==='certificate' ? '物件情報は閲覧専用です。保証期間カードから発行済みを取り消し、未発行へ戻せます。' : noticeMode==='billing' ? '物件情報は閲覧専用です。保証期間ごとの請求状態を下のカードで管理できます。' : noticeMode==='report' ? '物件情報は閲覧専用です。保険カードから直近の報告済みを取り消せます。' : '報告対象の抽出と報告済みの操作は「保険報告用一覧」で行ってください。' }} 物件の訂正・保証延長は「物件・保証」で行ってください。</p>
      </template>
      <template v-else><v-progress-linear v-if="catalogBusy" indeterminate class="mb-3" /><v-alert v-if="references.status.value!=='ready'" type="warning" class="mb-4">参照マスタの最新状態を確認できません。工務店・本支店の選択は再取得後に行ってください。</v-alert><v-alert v-if="catalogError" type="error" class="mb-4">{{ catalogError }}</v-alert><p class="text-body-2 mb-3">＊は本登録に必要な項目です。下書きも物件名・工務店・本支店の指定が必要です。本店が担当の場合も、登録した本店を選択してください。外部キーが必須の保証グループでは、下書きにも入力が必要です。</p><v-form ref="propertyForm" @submit.prevent :disabled="current?.status==='cancelled' || busy || !!pendingProperty"><v-row><v-col cols="12" md="6"><h2 class="business-section-title">担当工務店・本支店</h2><dl v-if="current?.warrantyNumber || current?.status==='cancelled' || !staff" class="mb-4"><dt class="text-caption text-medium-emphasis">工務店</dt><dd class="text-body-1 text-break">{{ current?.companyLabel || companyName(form.constructionCompanyId) }}</dd></dl><CompanyAutocomplete v-else v-model="form.constructionCompanyId" :items="propertyCompanies" :fetch-options="fetchCompanyOptions" :active="propertyDialog" required :disabled="references.status.value!=='ready' || busy || catalogBusy || !!current?.warrantyNumber || !staff" @select="choosePropertyCompany" /><dl v-if="current?.warrantyNumber || current?.status==='cancelled' || companyBranchOnly" class="mb-4"><dt class="text-caption text-medium-emphasis">本支店</dt><dd class="text-body-1 text-break">{{ branches.find(b=>b.id===form.branchId) ? branchOptionLabel(branches.find(b=>b.id===form.branchId)!) : current?.branchLabel || branchName(form.branchId) }}</dd></dl><v-autocomplete v-else v-model="form.branchId" :items="formBranches" :item-title="branchOptionLabel" item-value="id" label="本支店" :rules="requiredRules" required :disabled="references.status.value!=='ready' || busy || catalogBusy || !!current?.warrantyNumber || companyBranchOnly" clearable /><v-text-field v-if="propertyKeySettings.required" v-model="form.externalKey" :label="propertyKeySettings.label" :rules="[...(propertyKeySettings.required ? requiredRules : []),externalKeyRule]" :required="propertyKeySettings.required" :disabled="!!pendingProperty || busy || catalogBusy || !!current?.externalKey" hint="入力した値は全物件で重複不可。保存後は変更できません。" persistent-hint /><h2 class="business-section-title">物件の基本情報</h2><v-text-field v-model="form.name" :rules="requiredRules" required label="物件名" /><v-text-field v-model="form.ownerTelephone" :rules="optionalRules" label="施主電話番号" /><v-text-field v-model="form.buildingArea" :rules="[...(propertyFormal ? [requiredRule] : []),areaRule]" required type="number" min="0" step="0.01" label="建築面積（㎡）" /><h2 class="business-section-title">申込・保証期間</h2><dl v-if="current?.warrantyNumber || current?.status==='cancelled'" class="mb-4"><dt class="text-caption text-medium-emphasis">申込日</dt><dd class="text-body-1">{{ form.applicationDate || '未登録' }}</dd></dl><BusinessDateInput v-else v-model="form.applicationDate" :rules="[...(propertyFormal ? [requiredRule] : []),dateRule]" required type="date" label="申込日（本登録後は変更不可）" :disabled="!!current?.warrantyNumber || busy || !!pendingProperty" /><dl v-if="handoverBlockers.length>0 || current?.status==='cancelled'" class="mb-4"><dt class="text-caption text-medium-emphasis">引渡日</dt><dd class="text-body-1">{{ form.handoverDate || '未登録' }}<p v-if="handoverBlockers.length" class="text-caption text-medium-emphasis mt-1">{{ handoverBlockers.join(' ') }}</p></dd></dl><BusinessDateInput v-else v-model="form.handoverDate" :rules="[...(propertyFormal ? [requiredRule] : []),dateRule]" required type="date" label="引渡日" :disabled="handoverBlockers.length>0 || busy || !!pendingProperty" :hint="handoverBlockers.join(' ')" persistent-hint /><v-select v-model="form.maxYears" :rules="[maxYearsRule]" required :items="maxYearsOptions" label="最長保証期間（年）" hint="上限の選択だけでは延長されません。延長は「10年間延長」から行います。" persistent-hint class="mb-4" /></v-col><v-col cols="12" md="6"><h2 class="business-section-title">所在地</h2><PropertyAddressFields ref="propertyAddressFields" v-model="form" :validate-required="propertyFormal && propertyRequirements.addressRequired" :postal-lookup-provider="hostedPostalLookupProvider" /><h2 class="business-section-title">建物・施工情報</h2><v-switch v-model="form.foundationInsulation" label="基礎断熱材あり" color="primary" /><v-text-field v-if="form.foundationInsulation" v-model="form.insulationMaterials" :rules="propertyFormal && propertyRequirements.insulationMaterialsRequired ? requiredRules : optionalRules" :required="propertyRequirements.insulationMaterialsRequired" label="使用資材" /><h2 class="business-section-title">備考</h2><v-textarea v-model="form.notes" :rules="optionalRules" label="備考" rows="3" /></v-col></v-row>
      <v-alert v-if="!form.handoverDate" type="info" class="mb-4">本登録には引渡日が必要です。未定の場合は下書きで保存し、確認後に本登録してください。</v-alert><v-alert v-if="dateChanged" type="warning" class="mb-4">引渡日訂正により、保証期間も {{ previewStart }} ～ {{ previewExpiry }} に変わります。訂正前の記録を残します。</v-alert>
      <v-checkbox v-if="dateChanged" v-model="confirmDates" :rules="[v=>v===true || '内容を確認してチェックしてください。']" label="変更後の保証期間を確認しました" /></v-form>
      <v-btn v-if="procedureHistory.length" class="mt-4" variant="outlined" @click="historyDialog=true">手続き履歴を開く</v-btn></template>
      <v-alert v-if="noticeMode==='report' && !recoveryReadOnly && !selectedInsurancePeriodMatches" type="warning" class="mt-4">一覧で選んだ保険期間を最新の記録と照合できません。変更する場合は一覧を再抽出し、対象期間を確認してください。</v-alert>
      <WarrantyLifecycleDetails v-if="current?.warrantyNumber && (!noticeMode || ['report','billing','certificate','insurance','warranty'].includes(noticeMode))" :row="current" :focus="noticeMode" :selected-insurance-period="selectedInsurancePeriod" :insurance-editable="!recoveryReadOnly && staff && current.status==='active' && (!noticeMode || noticeMode==='report' && selectedInsurancePeriodMatches)" @insurance="openInsurance" :show-billing="staff" :show-insurance="staff" :editable="!recoveryReadOnly && staff && current.status==='active' && (!noticeMode || noticeMode==='billing')" :allow-certificate-undo="(!noticeMode || noticeMode==='certificate') && !recoveryReadOnly && staff && current.status==='active'" :busy="busy || catalogBusy || !!pendingProperty" @billing="openBilling">
        <template v-if="!noticeMode && staff && current.status==='active'" #warranty-actions>
          <v-btn variant="outlined" :disabled="!!pendingProperty || busy || catalogBusy" @click="confirmation='notify'">{{ noticeActionLabel }}</v-btn>
          <v-btn color="error" v-if="undoExtension" variant="outlined" :disabled="!!pendingProperty || busy || catalogBusy" aria-label="直近の保証延長を取り消す" @click="confirmation='undoExtend'">延長取消</v-btn>
        </template>
        <template v-if="!noticeMode && current.status==='active'" #warranty-footer><v-btn variant="flat" color="primary" :disabled="!!pendingProperty || busy || catalogBusy || !current.handoverDate || current.years>=current.maxYears" @click="confirmation='extend'">10年間延長</v-btn></template>
        <template v-if="(!noticeMode || noticeMode==='report') && !recoveryReadOnly && staff && current.status==='active' && current.insuranceLastReport" #insurance-actions><v-btn color="error" variant="outlined" :disabled="!!pendingProperty || busy || catalogBusy" @click="confirmation='undoReport'">保険の報告済みを取り消す</v-btn></template>
      </WarrantyLifecycleDetails>
        <details v-if="noticeMode && current" class="business-property-facts"><summary>物件情報（申込日・引渡日・所在地など）</summary><div class="pt-4"><dl class="notice-details">
          <dt>保証番号</dt><dd>{{ current.warrantyNumber }}</dd><dt>物件名</dt><dd>{{ current.name }}</dd>
          <dt>工務店／本支店</dt><dd>{{ current.companyLabel || companyName(current.constructionCompanyId) }}／{{ current.branchLabel || branchName(current.branchId) }}</dd>
          <dt>施主電話番号</dt><dd>{{ current.ownerTelephone || '未登録' }}</dd>
          <dt>所在地</dt><dd>{{ [propertyAddress(current),current.buildingName].filter(Boolean).join(' ') }}</dd>
          <dt>申込日／引渡日</dt><dd>{{ current.applicationDate || '未登録' }}／{{ current.handoverDate || '未登録' }}</dd>
          <dt>保証グループ</dt><dd>{{ current.groupName || '未登録' }}</dd><template v-if="current.externalKey"><dt>{{ externalKeyLabelFor(current) }}</dt><dd>{{ current.externalKey }}</dd></template>
          <dt>建築面積</dt><dd>{{ current.buildingArea }}㎡</dd>
          <dt>基礎断熱材／使用資材</dt><dd>{{ current.foundationInsulation ? 'あり／'+current.insulationMaterials : 'なし' }}</dd>
          <dt>備考</dt><dd class="text-pre-wrap">{{ current.notes || 'なし' }}</dd>
        </dl></div></details>
      <section v-if="!noticeMode && current?.status==='active'" class="business-cancellation-section"><h2 class="business-section-title">物件・保証全体の取消</h2><p class="text-body-2 mb-4">物件・保証全体を取消し状態にします。実行前に理由と影響を確認します。</p><v-btn color="error" variant="outlined" :disabled="!!pendingProperty || busy || catalogBusy" @click="confirmation='cancel'">物件・保証を取り消す</v-btn></section>
    </div></v-card-text><v-card-actions class="flex-wrap ga-2 pa-4"><v-btn variant="outlined" :disabled="!!pendingProperty || busy || catalogBusy" @click="propertyDialog=false">閉じる</v-btn><v-spacer />
      <template v-if="noticeMode"><v-btn variant="flat" v-if="!recoveryReadOnly && noticeMode==='warranty' && staff && current?.status==='active'" color="primary" :disabled="busy || !!pendingProperty" @click="confirmation='notify'">{{ noticeActionLabel }}</v-btn></template>
      <template v-else><template v-if="current?.status!=='cancelled'"><v-btn variant="flat" color="primary" :disabled="!!pendingProperty || busy || catalogBusy || dateChanged && !confirmDates" @click="saveProperty('save')">{{ current?.status==='active'?'変更を保存':'下書き保存' }}</v-btn><v-btn v-if="current?.status!=='active'" color="primary" variant="flat" :disabled="!!pendingProperty || busy || catalogBusy" @click="openRegistrationConfirmation">本登録・採番</v-btn></template><v-btn variant="flat" v-else-if="staff" color="primary" :disabled="!!pendingProperty || busy || catalogBusy" @click="confirmation='restore'">HSで復元</v-btn>
    </template></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="historyDialog" max-width="950" scrollable><v-card :border="false" class="business-dialog"><BusinessDialogHeader title="手続き履歴" :subtitle="current?.name" @close="historyDialog=false" /><v-card-text><v-card v-for="h in procedureHistory" :key="h.requestId" border :elevation="0" class="mb-4 dialog-layout-card"><v-card-text><p class="font-weight-bold">{{ operationLabel(h.kind) }}／{{ h.actorName || h.actorUid || '担当者未記録' }}</p><p>操作日時：{{ new Date(h.at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}) }}</p><p v-if="h.kind==='extend'">延長申込日：{{ h.extensionApplicationDate || '未確認（移行前）' }}</p><p v-if="h.reason">理由：{{ h.reason }}</p><template v-if="h.target"><p v-for="(period,index) in h.target.periods || [h.target]" :key="index">対象期間：{{ period.startDate }} ～ {{ period.expiryDate }}</p></template><p v-if="h.kind==='undoExtend'">取消対象の延長日：{{ current?.history?.find((event:Row)=>event.requestId===h.targetRequestId)?.date || '未記録' }}</p><template v-if="h.before"><h3 class="text-subtitle-1 mt-3">変更前の情報</h3><v-table density="compact"><tbody><tr v-for="field in historyFields" :key="field.key"><th>{{ field.label }}</th><td>{{ h.before[field.key] ?? '未記録' }}</td></tr><tr v-if="h.before.ownerName !== undefined"><th>旧履歴の施主名（参考）</th><td>{{ h.before.ownerName }}</td></tr></tbody></v-table></template><p v-else-if="!['waiveInsurance','undoInsuranceWaiver'].includes(h.kind)" class="mt-3">新規作成のため変更前の情報はありません。</p></v-card-text></v-card></v-card-text><v-card-actions><v-spacer /><v-btn variant="outlined" @click="historyDialog=false">閉じる</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog :model-value="!!confirmation" max-width="720" persistent scrollable><v-card :border="false" class="business-dialog"><BusinessDialogHeader :title="confirmation==='notify' && current?.warrantyNotified ? '保証満了案内を取り消す' : operationLabel(confirmation)+'の確認'" :subtitle="current?.name || form.name" :busy="busy || !!pendingProperty" @close="!pendingProperty && (confirmation='');!pendingProperty && (reason='')" /><v-card-text><v-alert v-if="pendingProperty" type="warning" class="mb-4">{{ pendingMessage(pendingProperty) }}<v-btn variant="outlined" :disabled="busy" @click="retryProperty">{{ pendingProperty.phase==='unknown' ? '同じ内容で再試行' : '最新情報を再取得' }}</v-btn></v-alert><v-form :disabled="!!pendingProperty || busy" :inert="!!pendingProperty || busy" ref="confirmationForm" @submit.prevent><template v-if="confirmation==='register'">
      <v-alert type="info" class="mb-4">申込日 {{ form.applicationDate || '未入力' }} を基準に保証番号を発行します。本登録後は申込日を変更できません。引渡日から10年間の保証を登録します。</v-alert>
      <v-card border :elevation="0" class="mb-4 dialog-layout-card"><v-card-title>登録内容</v-card-title><v-card-text><dl class="notice-details">
        <dt>物件名</dt><dd>{{ form.name }}</dd>

        <dt>申込日</dt><dd>{{ form.applicationDate }}</dd>
        <dt>引渡日・保証開始日</dt><dd>{{ previewStart }}</dd>
        <dt>保証満了日</dt><dd>{{ previewExpiry }}</dd>
        <dt>初回保証期間</dt><dd>10年間</dd>
      </dl></v-card-text></v-card><v-checkbox v-model="confirmRegistration" :rules="[v=>v===true || '内容を確認してチェックしてください。']" label="上記の登録内容・申込日・保証期間を確認しました" /><v-alert v-if="registrationWarnings.length" type="warning"><p v-for="warning in registrationWarnings" :key="warning">{{ warning }}</p></v-alert><v-checkbox v-if="registrationWarnings.length" v-model="confirmWarnings" :rules="[v=>v===true || '内容を確認してチェックしてください。']" label="表示された注意事項を確認し、この内容で登録します" /></template><template v-if="confirmation==='notify'"><p class="mb-3">{{ current?.warrantyNumber }}／{{ current?.name }}</p><p class="font-weight-bold mb-3">{{ current?.expiryDate }}の保証満了についての案内</p><p>{{ current?.warrantyNotified ? '「案内済み」の記録を取り消し、「未案内」に戻します。' : 'HSが保証満了の案内を行ったものとして、「案内済み」にします。' }}</p><v-alert type="info" class="mt-4">保証期間や保険の報告状態は変わりません。メール送信や、既に行った対外連絡の撤回は行いません。</v-alert></template><template v-if="confirmation==='undoReport'">
  <p class="text-subtitle-1 mb-3">{{ current?.warrantyNumber }}／{{ current?.name }}</p>
  <p class="mb-3">取消対象：{{ current?.insuranceLastReport?.month }}分（{{ current?.insuranceLastReport?.kind==='renewal' ? '更新' : '新規' }}）</p>
  <v-table class="mb-4"><thead><tr><th>変更項目</th><th>現在</th><th>取消後</th></tr></thead><tbody>
    <tr><th>保険満了日</th><td>{{ current?.insuranceExpiryDate }}</td><td>{{ current?.insuranceLastReport?.before?.insuranceExpiryDate }}</td></tr>
    <tr><th>報告状態</th><td>{{ current?.insuranceReported ? '報告済み' : '未報告' }}</td><td>{{ current?.insuranceLastReport?.before?.insuranceReported ? '報告済み' : '未報告' }}</td></tr>
  </tbody></v-table><v-alert type="warning" title="HSで必要な対応">保険会社への取消・訂正連絡は別途行ってください。提出済みの資料は自動で訂正されません。</v-alert>
</template><template v-if="confirmation==='extend'"><p class="mb-4">保存済みの保証を10年間延長します。番号は変わりません。変更後満了日：{{ extensionExpiry }}。フォームの未保存の変更は含まれません。</p><BusinessDateInput v-model="extensionApplicationDate" :rules="[requiredRule,dateRule]" label="延長申込日（必須）" :disabled="!!pendingProperty || busy" /><p class="mb-4">延長分の請求は、この申込日を基準にします。</p><v-alert v-if="extensionApplicationDate && extensionDeadline && extensionApplicationDate>extensionDeadline" type="warning" class="my-4">延長申込日が、延長後保証開始月の前月末（{{ extensionDeadline }}）を過ぎています。受付状況を確認してください。理由は任意で記録できます。</v-alert><v-textarea v-model="reason" :rules="[v=>String(v ?? '').length<=2000 || '2000文字以内で入力してください。']" label="理由（任意）" counter="2000" :disabled="!!pendingProperty || busy" /></template><template v-if="confirmation==='undoExtend' && undoExtension"><v-alert v-if="undoExtension.blockers.length" type="warning" class="mb-4"><p v-for="message in undoExtension.blockers" :key="message">{{ extensionBlockerLabel(message) }}</p></v-alert>
  <p class="text-subtitle-1 mb-3">{{ current?.warrantyNumber }}／{{ current?.name }}</p><p class="mb-3">取消対象：{{ undoExtension.targetDate }}の10年間延長</p>
  <v-table class="mb-4"><thead><tr><th>変更項目</th><th>現在</th><th>取消後</th></tr></thead><tbody>
    <tr><th>保証年数</th><td>{{ current?.years }}年</td><td>{{ undoExtension.years }}年</td></tr>
    <tr><th>保証満了日</th><td>{{ current?.expiryDate }}</td><td>{{ undoExtension.expiryDate }}</td></tr>
  </tbody></v-table>
  <v-card border :elevation="0" class="mb-4 dialog-layout-card"><v-card-text><p class="font-weight-bold mb-2">変更されない情報</p><p>保証番号・手続き履歴を保持します。</p><p>保険期間：{{ current?.insuranceStartDate }} ～ {{ current?.insuranceExpiryDate }}</p><p>保険報告状態：{{ current?.insuranceReported ? '報告済み' : '未報告' }}（変更なし）</p></v-card-text></v-card>
  <p class="mb-4">この延長は請求用一覧から除外します。編集画面の未保存の変更は含みません。</p>
  <v-alert type="warning" title="HSで必要な対応">保険会社・施主等への訂正連絡、交付済み保証書・出力済みCSVや請求書の訂正は別途行ってください。</v-alert>
</template><template v-if="confirmation==='cancel' && current"><v-alert type="warning" class="mb-4">物件・保証全体を取消し状態にします。保険会社への報告、請求、保証更新案内の履歴は保持されますが、保険会社への取消し報告、請求の訂正は行われません。</v-alert><WarrantyLifecycleDetails :row="current" :show-insurance="staff" :show-billing="staff" /><v-checkbox v-model="confirmCancellation" :rules="[v=>v===true || '取消の影響を確認してください。']" label="報告・延長・請求の内容と、HSで必要な対外対応を確認しました" /></template><p v-if="confirmation==='restore'">同じ保証番号・保証期間・報告・請求状態で復元します。外部で既に訂正した内容と一致するかHSで確認してください。</p><template v-if="['bill','undoBill','confirmUnbilled','undoCertificate'].includes(confirmation) && billingTarget"><p class="mb-3">{{ current?.name }}／{{ billingTarget.label }}：{{ billingTarget.startDate }} ～ {{ billingTarget.expiryDate }}</p><p>{{ confirmation==='undoCertificate' ? 'この保証期間の発行済みを取り消し、未発行へ戻します。' : confirmation==='bill' ? 'この保証期間を請求済みにします。' : confirmation==='undoBill' ? 'この保証期間の請求済みを取り消し、未請求へ戻します。' : 'HSで確認した結果、この保証期間を未請求として登録します。' }}</p><v-alert type="warning" class="mt-4">{{ confirmation==='undoCertificate' ? '発行した保証書の回収・訂正は行いません。実際の発行状況との整合はHSで確認してください。' : '請求書は作成・送信・訂正されません。実際の請求内容との整合はHSで確認してください。' }}</v-alert></template><template v-if="['waiveInsurance','undoInsuranceWaiver'].includes(confirmation) && insuranceTarget"><p class="mb-3">{{ current?.name }}／保証番号：{{ current?.warrantyNumber }}</p><p class="mb-3">対象期間：{{ insuranceTarget.startDate }} ～ {{ insuranceTarget.expiryDate }}</p><v-alert type="warning" class="my-4">{{ confirmation==='waiveInsurance' ? 'この期間だけを報告不要にします。次の期間には引き継ぎません。理由を記録してください。' : 'この期間を未報告に戻します。対象年月などの条件を満たす場合に保険報告用一覧へ戻ります。' }} 保険期間の終了翌日からは変更できません。</v-alert><v-textarea v-if="confirmation==='waiveInsurance'" v-model="reason" :rules="[...requiredRules,v=>String(v ?? '').length<=2000 || '2000文字以内で入力してください。']" label="報告不要とする理由（必須）" counter="2000" /></template><v-textarea v-if="['cancel','restore','undoExtend','undoBill','undoCertificate'].includes(confirmation)" v-model="reason" :rules="requiredRules" label="理由（必須）" class="mt-4" /><v-alert v-if="errors.confirmation" type="error" class="mt-4">{{ errors.confirmation }}</v-alert></v-form></v-card-text><v-card-actions class="flex-wrap"><v-btn variant="outlined" :disabled="!!pendingProperty || busy" @click="confirmation='';reason=''">戻る</v-btn><v-spacer /><v-btn variant="flat" color="primary" :disabled="!!pendingProperty || busy || confirmation==='cancel' && !confirmCancellation || confirmation==='undoExtend' && !!undoExtension?.blockers.length || confirmation==='register' && (!confirmRegistration || registrationWarnings.length>0 && !confirmWarnings)" @click="performConfirmed">実行する</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="settingDialog" max-width="650" persistent scrollable><v-card :border="false" class="business-dialog"><BusinessDialogHeader :title="settingTitle || '設定'" :subtitle="setting.name || '新規登録'" :status="settingReadOnly ? '無効・閲覧のみ' : '編集'" icon="settings" :busy="busy || !!pendingSetting" @close="!pendingSetting && (settingDialog=false)" /><v-card-text><v-alert v-if="pendingSetting" type="warning" class="mb-4">{{ pendingMessage(pendingSetting) }}<v-btn variant="outlined" :disabled="busy" @click="retrySetting">{{ pendingSetting.phase==='unknown' ? '同じ内容で再試行' : '最新情報を再取得' }}</v-btn></v-alert><v-form :inert="!!pendingSetting || busy" ref="settingForm" :disabled="settingReadOnly || busy || !!pendingSetting" @submit.prevent><v-alert v-if="errors.setting" type="error" class="mb-4">{{ errors.setting }}</v-alert><h2 class="business-section-title">名称・所属</h2><v-text-field v-model="setting.name" :rules="requiredRules" required label="名称" /><template v-if="settingAction==='saveCompany'"><dl v-if="setting.id" class="mb-4"><dt class="text-caption text-medium-emphasis">所属保証グループ</dt><dd class="text-body-1">{{ groups.find(row => row.id===setting.defaultGroupId)?.name || '確認できません' }}</dd></dl><v-select v-else v-model="setting.defaultGroupId" :rules="requiredRules" required :disabled="settingReadOnly || !!setting.id" :items="assignableGroups" item-title="name" item-value="id" label="所属保証グループ" /><h2 class="business-section-title">所在地・連絡先</h2><MasterAddressFields ref="companyAddressFields" v-model="setting.address" postal-optional lookup-subject="constructionCompany" :postal-lookup-provider="hostedPostalLookupProvider" /><v-text-field v-model="setting.telephone" :rules="[phoneRule]" label="電話番号" /><v-text-field v-model="setting.fax" :rules="[phoneRule]" label="FAX" /><v-text-field v-model="setting.contactPerson" :rules="optionalRules" label="窓口担当者" /></template><template v-if="settingAction==='saveBranch'"><dl v-if="setting.id" class="mb-4"><dt class="text-caption text-medium-emphasis">所属工務店</dt><dd class="text-body-1">{{ companies.find(row => row.id===setting.constructionCompanyId)?.name || '確認できません' }}</dd></dl><v-select v-else v-model="setting.constructionCompanyId" :rules="requiredRules" required :items="companies" item-title="name" item-value="id" label="所属工務店" :disabled="settingReadOnly || !!setting.id" /><v-text-field v-model="setting.branchCode" :rules="[...(settingBranchCodeRequired ? requiredRules : []),branchCodeRule]" :required="settingBranchCodeRequired" :label="settingBranchCodeRequired ? '本支店コード' : '本支店コード（任意）'" hint="同じ工務店内の有効な本支店で重複不可。変更後のコードを今後の取込みに使います。" persistent-hint /><h2 class="business-section-title">所在地・連絡先</h2><MasterAddressFields ref="branchAddressFields" v-model="setting.address" postal-optional address-optional lookup-subject="constructionCompany" :postal-lookup-provider="hostedPostalLookupProvider" /><v-text-field v-model="setting.telephone" :rules="[phoneRule]" label="電話番号" /><v-text-field v-model="setting.fax" :rules="[phoneRule]" label="FAX" /></template><template v-if="['saveCompany','saveBranch'].includes(settingAction)"><h2 class="business-section-title">利用状態</h2><v-switch v-model="setting.enabled" color="primary" label="有効" /><v-alert type="warning" class="my-4"><template v-if="settingAction==='saveCompany'">この工務店を無効にすると、所属するすべての本支店で、新たな物件・保証の本登録ができなくなります。登録済みの保証には、引き続きHSが対応できます。工務店を再び有効にすると、各本支店の元の有効・無効状態に従って登録を再開します。個別に無効化していた本支店は、無効のままです。</template><template v-else>この本支店を無効にすると、この本支店を担当とする物件・保証の本登録ができなくなります。登録済みの保証には、引き続きHSが対応できます。所属する工務店が無効の場合は、この本支店を有効にしても本登録は再開できません。</template></v-alert></template><template v-if="settingAction==='saveGroup'">
  <template v-if="!setting.id"><h2 class="business-section-title">採番・入力条件</h2><v-text-field v-model="setting.prefix" :rules="[prefixRule]" :disabled="settingReadOnly || !!setting.id" label="番号接頭辞（例：HSC／接頭辞なしは空欄）" hint="接頭辞と年度の間のハイフンは自動で付きます。" persistent-hint /><v-select v-model="setting.fiscalStartMonth" :rules="[v=>Number.isInteger(Number(v)) && Number(v)>=1 && Number(v)<=12 || '1〜12月を選択してください。']" required :disabled="settingReadOnly || !!setting.id" :items="Array.from({length:12},(_,i)=>i+1)" label="年度開始月" /><v-switch v-model="setting.externalKeyRequired" color="primary" label="外部キーを必須にする" :disabled="settingReadOnly || !!setting.id || setting.name.trim().toUpperCase()==='UH'" /><v-switch v-model="setting.addressRequired" color="primary" label="住所を必須にする" :disabled="settingReadOnly || !!setting.id" /><v-switch v-model="setting.insulationMaterialsRequired" color="primary" label="断熱材ありの場合、資材名を必須にする" :disabled="settingReadOnly || !!setting.id" /><v-alert type="info" class="my-4">接頭辞・年度開始月・各必須設定は登録後に変更できません。一括取込みは外部キー必須のグループだけで利用できます。</v-alert></template>
  <details v-else :key="setting.id" class="mb-4"><summary class="business-section-title cursor-pointer">登録時の設定</summary>
    <v-alert type="info" class="my-4">以下の設定は登録後に変更できません。</v-alert>
    <v-table density="compact"><tbody>
      <tr><th scope="row">番号接頭辞</th><td>{{ setting.prefix || 'なし' }}</td></tr>
      <tr><th scope="row">年度開始月</th><td>{{ setting.fiscalStartMonth }}月</td></tr>
      <tr><th scope="row">外部キー</th><td>{{ setting.externalKeyRequired ? '必須（一括取込み対象）' : '使用しない' }}</td></tr>
      <tr><th scope="row">住所</th><td>{{ setting.addressRequired ? '必須' : '任意' }}</td></tr>
      <tr><th scope="row">断熱材ありの場合の資材名</th><td>{{ setting.insulationMaterialsRequired ? '必須' : '任意' }}</td></tr>
    </tbody></v-table>
  </details>
  <v-text-field v-if="setting.externalKeyRequired" v-model="setting.externalKeyLabel" label="外部キーの名称" :rules="[...(setting.externalKeyRequired ? requiredRules : []),externalKeyLabelRule]" :required="setting.externalKeyRequired" hint="例：お施主様契約No。表示名は後から変更できます。" persistent-hint />
  <h2 class="business-section-title">請求先</h2>
  <v-text-field v-model="setting.billingRecipient.name" label="請求先名" :rules="optionalRules" />
  <v-text-field v-model="setting.billingRecipient.department" label="部署名" :rules="optionalRules" />
  <v-text-field v-model="setting.billingRecipient.contactPerson" label="担当者名" :rules="optionalRules" />
  <BusinessContactFields v-model="setting.billingRecipient" />
  <h2 class="business-section-title">利用状態</h2>
  <v-switch v-model="setting.enabled" color="primary" label="有効" />
  <v-alert type="warning" class="my-4">この保証グループを無効にすると、新たな工務店の所属先として選択できなくなり、このグループでの物件・保証の本登録もできなくなります。登録済みの保証は、引き続き閲覧・延長できます。無効化しても、番号接頭辞を別の保証グループで再利用することはできません。</v-alert></template></v-form></v-card-text><v-card-actions class="flex-wrap"><v-btn variant="outlined" :disabled="busy || !!pendingSetting" @click="settingDialog=false">閉じる</v-btn><v-spacer /><v-btn variant="flat" color="primary" :disabled="busy || !!pendingSetting" v-if="!settingReadOnly" @click="saveSetting">保存</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog v-model="accountDialog" max-width="600" persistent><v-card :border="false" class="business-dialog"><BusinessDialogHeader title="工務店担当者を追加" icon="staff" :busy="busy || catalogBusy" @close="accountDialog=false" /><v-card-text><v-form ref="accountForm" @submit.prevent><v-alert v-if="errors.account" type="error" class="mb-4">{{ errors.account }}</v-alert><v-progress-linear v-if="catalogBusy" indeterminate class="mb-3" /><v-alert v-if="references.status.value!=='ready'" type="warning" class="mb-4">参照マスタの最新状態を確認できません。工務店・本支店の選択は再取得後に行ってください。</v-alert><v-alert v-if="catalogError" type="error" class="mb-4">{{ catalogError }}</v-alert><CompanyAutocomplete v-model="account.constructionCompanyId" :items="propertyCompanies" :fetch-options="fetchCompanyOptions" :active="accountDialog" required :disabled="references.status.value!=='ready' || busy || catalogBusy || accountCreated" @select="chooseAccountCompany" /><v-text-field v-model="account.displayName" :rules="requiredRules" label="担当者名" /><v-text-field v-model="account.email" :rules="[requiredRule,emailRule]" type="email" label="メールアドレス" /><v-select v-model="account.scope" :rules="[requiredRule]" :items="[{title:'本店の全店担当（自社全店）',value:'company'},{title:'本支店担当（所属本支店のみ）',value:'branch'}]" label="操作範囲" /><v-autocomplete :disabled="references.status.value!=='ready'" v-if="account.scope==='branch'" v-model="account.branchId" :rules="requiredRules" :items="references.activeBranches(account.constructionCompanyId)" :item-title="branchOptionLabel" item-value="id" label="所属本支店" /><p>作成後にパスワード設定メールを送ります。本人がパスワードを設定します。</p></v-form></v-card-text><v-card-actions class="flex-wrap"><v-btn variant="outlined" :disabled="busy || catalogBusy" @click="accountDialog=false">閉じる</v-btn><v-spacer /><v-btn variant="flat" color="primary" :disabled="references.status.value!=='ready' || busy || catalogBusy || accountCreated" @click="createAccount">作成・設定メール送信</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog v-model="reportConfirm" max-width="600" persistent><v-card :border="false" class="business-dialog"><BusinessDialogHeader title="実際に報告した物件の確認" icon="report" :busy="busy" @close="reportConfirm=false" /><v-card-text><p>{{ loadedReportMonth }}月分・未報告 {{ pendingSelectedRows.length }}件。CSV出力だけでは報告は完了しません。保険会社に提出した物件であることを確認してください。更新分は次の5年間へ進めます。</p><p v-for="r in pendingSelectedRows" :key="rowKey(r)">{{ r.warrantyNumber }}／{{ r.name }} — {{ reportLabel(r.reportKind) }}・報告対象期間 {{ r.reportTarget?.startDate }} ～ {{ r.reportTarget?.expiryDate }}／{{ r.reportTarget?.warrantyPeriodLabel }}（保証：{{ r.reportTarget?.warrantyStartDate }} ～ {{ r.reportTarget?.warrantyExpiryDate }}）</p><v-alert v-if="errors.report" type="error">{{ errors.report }}</v-alert></v-card-text><v-card-actions><v-btn variant="outlined" :disabled="busy" @click="reportConfirm=false">戻る</v-btn><v-btn variant="flat" color="primary" :disabled="busy || reportDirty || recoveryReadOnly || !pendingSelectedRows.length" @click="markReports">報告済みにする</v-btn></v-card-actions></v-card></v-dialog>
    <PropertyBulkImportDialog v-if="staff" v-model="bulkImportDialog" :groups="bulkImportGroups" :project-id="String($firebase.auth.app.options.projectId || '')" :actor-uid="profile?.uid || ''" :reference-ready="references.status.value==='ready'" :companies="references.activeCompanies.value" :fetch-companies="fetchBulkCompanies" :invoke="invokeBulkImport" @download-template="downloadBulkTemplate" @completed="bulkImportCompleted" />
  </v-container></v-main>
</template>

<script setup lang="ts">
import { selectedMonthToBasisMonth } from '../../src/domain/monthly-query.mjs'
import { useDisplay } from 'vuetify'
import { billingRecipientDefaults } from '../../src/domain/company-settings.mjs'
import { createReferenceFetchCache, referenceFetchKey } from '../../src/domain/reference-fetch-cache.mjs'
import { insuranceReportingCandidates, insurancePeriodStates } from '../../src/domain/insurance-state.mjs'
import { nextInsuranceReportLabel, currentInsuranceSummary, matchesSelectedInsurancePeriod } from '../utils/insuranceReportDisplay.mjs'
import { latestInsuranceReport, handoverChangeBlockers } from "../../src/domain/property-warranty.mjs"
import { requiredRule, requiredRules, optionalRules, postalRule, phoneRule, emailRule, prefixRule, areaRule, dateRule, monthRule, yearRule } from '../../src/domain/input-rules.mjs'
import { httpsCallable } from 'firebase/functions'
import { recoveryRuntime, withRuntimeGeneration } from '../utils/recoveryClient'
import { sendPasswordResetEmail } from 'firebase/auth'
import { hostedPostalLookupProvider } from '../../src/domain/hosted-postal-lookup.mjs'
import { extensionApplicationDeadline, coveragePeriods, csvCell, japanDate, normalizeWarrantyPrefix, extensionUndoPreview, propertyAddress } from '../../src/domain/property-warranty.mjs'
import { propertyFieldRequirements } from '../../src/domain/property-field-requirements.mjs'
import { externalKeySettings, normalizeExternalKey } from '../../src/domain/external-key.mjs'
import { normalizeBranchCode } from '../../src/domain/branch-code.mjs'
import { createReferenceRequestGuard } from '../../src/domain/reference-store-request.mjs'
import { createBulkImportTemplate } from '../../src/domain/property-bulk-import.mjs'
// Callable records are validated by the trusted command; the view keeps flexible display records.
type Row = Record<string, any>
const { $firebase } = useNuxtApp()
const { profile, logout: sessionLogout } = useSession()
async function logout(){if(pendingProperty.value || pendingSetting.value || !canLeaveCompanySettings())return;companyProfileStore.reset();dashboard.reset();referenceCache.clear();references.reset();await sessionLogout()}
const staff = computed(()=>profile.value?.accountType==='staff')
const manager = computed(()=>staff.value && ['developer_superuser','house_solution_administrator'].includes(profile.value?.role ?? ''))
const companyBranchOnly = computed(()=>profile.value?.accountType==='construction_company' && profile.value.scope==='branch')
const dashboard=useDashboardStore()
const companyProfileStore=useCompanyProfile()
const companySettingsView=ref<{canLeave:()=>boolean}|null>(null)
const canLeaveCompanySettings=()=>tab.value!=='companySettings' || companySettingsView.value?.canLeave()!==false
type PendingSubmission={action:string;payload:Row;phase:'unknown'|'completed'|'legacy-unverified';result?:Row}
const pendingProperty=ref<PendingSubmission|null>(null),pendingSetting=ref<PendingSubmission|null>(null)
function frozenPayload(input:Row):Row {
  const freeze=(value:any):any=>{if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
  return freeze(JSON.parse(JSON.stringify(input)))
}
function assertSubmissionResult(result:Row,expectedId?:string){
  if(!result || !['completed','legacy-unverified'].includes(result.operationStatus) || typeof result.id!=='string' || !/^[\w-]{1,128}$/.test(result.id) || expectedId!==undefined && result.id!==expectedId)throw new Error('保存応答を確認できません。同じ内容で再試行してください。')
}
function warnPendingUnload(event:BeforeUnloadEvent){if(pendingProperty.value || pendingSetting.value){event.preventDefault();event.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',warnPendingUnload))
onUnmounted(()=>window.removeEventListener('beforeunload',warnPendingUnload))
const pendingMessage=(submission:PendingSubmission|null)=>submission?.phase==='unknown' ? '保存結果を確認できていません。入力を固定しています。同じ内容で再試行してください。' : submission?.phase==='legacy-unverified' ? '以前の操作記録が見つかりましたが、今回の入力が保存されたかは確認できません。最新情報を再取得して確認してください。' : '保存は完了しています。最新情報の再取得だけを再試行してください。'
const tab = ref(staff.value ? 'dashboard' : 'properties'), busy = ref(false)
const { mdAndUp } = useDisplay()
const drawerOpen=ref(false)
const businessNavigation=computed(()=>[...(staff.value ? [{value:'dashboard',title:'ダッシュボード'}] : []),{value:'properties',title:'物件・保証'},{value:'alerts',title:'保証満了案内'},...(staff.value ? [{value:'insuranceAlerts',title:'保険満了案内'},{value:'report',title:'保険報告用一覧'},{value:'billing',title:'請求用一覧'},{value:'certificates',title:'保証書CSV'}] : [])])
const managementNavigation=computed(()=>[...(staff.value ? [{value:'companySettings',title:'設定'}] : []),...(staff.value && !recoveryReadOnly.value ? [{value:'settings',title:'保証グループ・工務店・本支店'}] : []),...(manager.value && !recoveryReadOnly.value ? [{value:'staff',title:'HS担当者'},{value:'alertSettings',title:'アラート設定'}] : []),...(manager.value ? [{value:'recovery',title:'バックアップ・復旧状況'}] : [])])
function navigate(value:string){if(busy.value || pendingProperty.value || pendingSetting.value || value!==tab.value && !canLeaveCompanySettings())return;tab.value=value;drawerOpen.value=false}

const bulkImportDialog=ref(false)
const recoveryReadOnly = computed(()=>recoveryRuntime.value.phase==='verification')
const errors=reactive({page:'',property:'',confirmation:'',setting:'',account:'',report:''})
const { showValidationError, showSnackbar } = useAppSnackbar()
const errorScope=()=>confirmation.value ? 'confirmation' : propertyDialog.value ? 'property' : settingDialog.value ? 'setting' : accountDialog.value ? 'account' : reportConfirm.value ? 'report' : 'page'
const error=computed({get:()=>errors[errorScope()],set:(value:string)=>{errors[errorScope()]=value}})
type Validatable={validate:()=>Promise<{valid:boolean}>}
const propertyForm=ref<Validatable|null>(null),settingForm=ref<Validatable|null>(null),accountForm=ref<Validatable|null>(null),confirmationForm=ref<Validatable|null>(null),searchForm=ref<Validatable|null>(null),alertsForm=ref<Validatable|null>(null)
type PostalLookupControl={cancelPostalLookup:()=>void}
const propertyAddressFields=ref<PostalLookupControl|null>(null),companyAddressFields=ref<PostalLookupControl|null>(null),branchAddressFields=ref<PostalLookupControl|null>(null)
const propertyFormal=ref(false)
async function validate(view:Validatable|null){const scope=errorScope();const valid=!!view && (await view.validate()).valid;if(!valid && scope===errorScope())showValidationError();return valid}
async function validateProperty(formal:boolean){propertyFormal.value=formal;await nextTick();return validate(propertyForm.value)}
const references=useReferenceStore()
const {companies,branches,groups}=references
const accounts = ref<Row[]>([]), rows = ref<Row[]>([]), limited = ref(true)
const bulkImportGroups=computed(()=>groups.value.map(group=>({id:String(group.id),name:String(group.name),enabled:group.enabled!==false,externalKeyRequired:externalKeySettings(group).required,externalKeyLabel:externalKeySettings(group).label,...propertyFieldRequirements(group)})))
const accountSearch=ref(''),accountPage=ref(1)
const accountRows=computed(()=>{const term=(accountSearch.value || '').trim();return term ? accounts.value.filter(a=>[a.displayName,a.email,companyName(a.constructionCompanyId)].join(' ').includes(term)) : accounts.value.slice(0,20)})
watch(accountSearch,()=>accountPage.value=1)
const page=ref(1)
const listTable=usePaginationScroll(page)
const accountTable=usePaginationScroll(accountPage)
const visibleRows=computed(()=>rows.value.slice((page.value-1)*20,page.value*20))
const selectedGroupId=ref(''), selectedCompanyId=ref('')
const alertSettings=reactive({warrantyMonths:2,insuranceMonths:2})
const monthOptions=Array.from({length:12},(_,i)=>({title:`${i+1}か月前`,value:i+1}))
const saveAlertSettings=async()=>{if(!await validate(alertsForm.value))return;await run(async()=>{Object.assign(alertSettings,await call('saveAlertSettings',{settings:{...alertSettings}}));referenceCache.clear();showSnackbar('アラート設定を保存しました。','success')})}
const emptyFilter = ()=>({month:japanDate().slice(0,7),notification:'pending',warrantyNumber:'',applicationFrom:'',applicationTo:'',handoverFrom:'',handoverTo:'',handoverMissing:'',search:'',companyId:'',branchId:'',groupId:'',fiscalYear:'',status:'',from:'',to:'',includeCancelled:false,includeDone:false})
const filter = reactive(emptyFilter()), reportKey = ref('')
const loadedReportMonth=ref(''),loadedReportSelectedMonth=ref(''),loadedReportIncludeDone=ref(false),reportUnclassifiedCount=ref(0)
const reportBasisMonth=computed(()=>{try{return selectedMonthToBasisMonth(filter.month)}catch{return ''}})
const appliedPropertyFilters=computed(()=>{
 const applied=reportKey.value ? JSON.parse(reportKey.value) : {}
 return applied.warrantyNumber ? [{key:'warrantyNumber',label:`保証番号：${applied.warrantyNumber}`}] : []
})
async function removePropertyFilter(key:string){Object.assign(filter,JSON.parse(reportKey.value),{[key]:''});await loadRows()}
const reportDirty = computed(()=>reportKey.value!==JSON.stringify(filter))
const statuses = [{title:'下書き',value:'draft'},{title:'本登録',value:'active'},{title:'取消済み',value:'cancelled'}]
const statusLabel = (status:string)=>statuses.find(s=>s.value===status)?.title ?? status
const operationLabel = (action:string)=>({historicalImport:'過去物件の初期取込み',waiveInsurance:'保険を報告不要にする',undoInsuranceWaiver:'報告不要を取り消す',save:'保存・訂正',register:'本登録',extend:'10年間延長',undoExtend:'保証延長取消',cancel:'取消',restore:'復元',notify:'保証満了案内の状態変更',undoReport:'報告済み取消',report:'保険報告済み',bill:'請求済み',undoBill:'請求済み取消',confirmUnbilled:'未請求の確認',issueCertificate:'保証書発行済み',undoCertificate:'保証書発行済み取消',billPeriods:'選択期間の請求済み'}[action] ?? action)
const companyName = (id:string)=>references.name('companies',id)
const branchName = (id:string)=>id ? references.name('branches',id) : '未指定'
const branchOptionLabel=(branch:Row)=>branch.branchCode ? `${branch.name}（${branch.branchCode}）` : String(branch.name ?? '')
const branchCodeRule=(value:unknown)=>{try{normalizeBranchCode(value);return true}catch(error){return error instanceof Error ? error.message : '本支店コードを確認してください。'}}
const requestGuard=createReferenceRequestGuard()
const dashboardMutations=new Set(['save','register','extend','undoExtend','cancel','restore','notify','report','undoReport','waiveInsurance','undoInsuranceWaiver','bill','undoBill','confirmUnbilled','billPeriods','issueCertificate','undoCertificate','saveAlerts','saveAlertSettings'])
const call = async (action:string, data:Row={})=>requestGuard.run(async()=>{
  const scope=requestGuard.capture()
  try { const result=(await httpsCallable<Row,Row>($firebase.functions,'propertyPrototype')(withRuntimeGeneration({action,...data,...(dashboardMutations.has(action) && action!=='saveAlertSettings' ? {operationProtocol:2} : {}),...(staff.value && ['list','propertyList','detail'].includes(action) ? {omitReferenceLabels:true} : {})}))).data
    if(requestGuard.isCurrent(scope) && dashboardMutations.has(action))dashboard.markStale()
    return result
  } catch(error) { if(requestGuard.isCurrent(scope) && dashboardMutations.has(action))dashboard.markStale();throw error }
})
async function run(fn:()=>Promise<void>) { if(busy.value)return false;const token=requestGuard.capture();busy.value=true;const scope=errorScope();errors[scope]='';try{await fn();requestGuard.assertCurrent(token);return true}catch(e){if(requestGuard.isCurrent(token))errors[scope]=e instanceof Error?e.message:'操作に失敗しました。';return false}finally{if(requestGuard.isCurrent(token))busy.value=false} }
const referenceCache=createReferenceFetchCache()
const referenceScope=computed(()=>({uid:profile.value?.uid ?? '',role:profile.value?.role ?? '',type:profile.value?.accountType ?? '',company:profile.value?.accountType==='construction_company' ? profile.value.constructionCompanyId : '',branch:profile.value?.accountType==='construction_company' ? profile.value.branchId : '',scope:profile.value?.accountType==='construction_company' ? profile.value.scope : ''}))
watch(()=>JSON.stringify([referenceScope.value,recoveryRuntime.value]),()=>{requestGuard.invalidate();pendingProperty.value=null;pendingSetting.value=null;busy.value=false;catalogBusy.value=false;referenceCache.clear();rows.value=[];current.value=null;form.value={...emptyPropertyAddress()};account.value={};accounts.value=[];dialogCompanies.value=[];dialogBranches.value=[];propertyDialog.value=false;accountDialog.value=false;settingDialog.value=false;bulkImportDialog.value=false},{flush:'sync'})
onUnmounted(()=>referenceCache.clear())
const fetchReference=(action:string,conditions:Row={},force=false):Promise<Row>=>referenceCache.get(referenceFetchKey(referenceScope.value,action,conditions),()=>call(action,conditions),{force})
async function openBulkImport(){if(!staff.value || recoveryReadOnly.value)return;if(await run(loadCatalog))bulkImportDialog.value=true}
async function fetchBulkCompanies(groupId:string,search:string){await references.ensureReady();return references.activeCompanies.value.filter(company=>company.defaultGroupId===groupId)}
async function bulkImportCompleted(){dashboard.markStale();showSnackbar('一括取込みが完了しました。','success');await run(fetchRows)}
const invokeBulkImport=async(data:Row)=>requestGuard.run(async()=>{const scope=requestGuard.capture();try{return (await httpsCallable<Row,Row>($firebase.functions,'propertyBulkImport')(withRuntimeGeneration({...data,operationProtocol:1}))).data}finally{if(requestGuard.isCurrent(scope) && data.action==='commit')dashboard.markStale()}})
function downloadBulkTemplate(){const url=URL.createObjectURL(new Blob([createBulkImportTemplate()],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='物件保証一括取込テンプレート.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function loadCatalog(force=false){
  const token=requestGuard.capture()
  if(force)referenceCache.clear()
  Object.assign(alertSettings,await fetchReference('alertSettings',{},force))
  await references.ensureReady(force)
  requestGuard.assertCurrent(token)
  if(tab.value==='settings' && selectedCompanyId.value && !companies.value.some(c=>c.id===selectedCompanyId.value && c.defaultGroupId===selectedGroupId.value))selectedCompanyId.value=''
}
const selectGroup=(id:string)=>run(async()=>{selectedGroupId.value=id;selectedCompanyId.value='';await loadCatalog()})
const selectCompany=(id:string)=>run(async()=>{selectedCompanyId.value=id;await loadCatalog()})
const periodRefresh=ref(0)
async function fetchRows(){ if(tab.value==='dashboard')return;if(['certificates','billing'].includes(tab.value)){periodRefresh.value++;return}const submittedFilter={...filter};const f:Row=tab.value==='report' ? {reportMonth:selectedMonthToBasisMonth(submittedFilter.month),includeDone:submittedFilter.includeDone} : tab.value==='alerts' ? {alertKind:'warranty',notification:'pending'} : tab.value==='insuranceAlerts' ? {alertKind:'insurance'} : tab.value==='properties' ? {warrantyNumber:submittedFilter.warrantyNumber ?? ''} : {...submittedFilter};if(tab.value==='billing')f.billingMonth=submittedFilter.month;const result=await call(tab.value==='properties' ? 'propertyList' : 'list',{filter:f});rows.value=result.rows;selectedKeys.value=[];page.value=1;limited.value=result.limited;reportKey.value=JSON.stringify(submittedFilter);if(tab.value==='report'){loadedReportMonth.value=f.reportMonth;loadedReportSelectedMonth.value=submittedFilter.month;loadedReportIncludeDone.value=submittedFilter.includeDone;reportUnclassifiedCount.value=result.unclassifiedCount ?? 0} }
const loadRows=async()=>{if(!await validate(searchForm.value))return;await run(fetchRows)}
async function clearFilter(){if(busy.value)return;Object.assign(filter,emptyFilter());await loadRows()}
watch(tab,async()=>{if(['dashboard','companySettings'].includes(tab.value))return;error.value='';Object.assign(filter,emptyFilter());rows.value=[];await run(async()=>{await loadCatalog();if(['properties','alerts','insuranceAlerts','report'].includes(tab.value))await fetchRows();if(tab.value==='accounts')accounts.value=(await call('accounts')).accounts})})
onMounted(()=>{if(tab.value!=='dashboard')void run(async()=>{await loadCatalog();await fetchRows()})})
const confirmWarnings=ref(false),confirmRegistration=ref(false),registrationWarnings=ref<string[]>([])
async function openRegistrationConfirmation(){if(!await validateProperty(true))return;confirmRegistration.value=false;confirmWarnings.value=false;registrationWarnings.value=[];error.value='';confirmation.value='register'}
const propertyDialog=ref(false),current=ref<Row|null>(null),confirmation=ref(''),reason=ref(''),extensionApplicationDate=ref(''),confirmDates=ref(false)
const historyDialog=ref(false),confirmCancellation=ref(false)
const procedureHistory=computed(()=>{
 const row=current.value,events:Row[]=staff.value ? row?.insuranceWaiverEvents ?? [] : []
 const waivers=events.map(event=>{const original=event.kind==='undoWaive' ? events.find(item=>item.id===event.targetId) : event;return {...event,requestId:event.id,kind:event.kind==='undoWaive' ? 'undoInsuranceWaiver' : 'waiveInsurance',target:original ? {startDate:original.startDate,expiryDate:original.expiryDate} : null,...(event.kind==='undoWaive' ? {reason:original?.reason} : {})}})
 return [...(row?.history ?? []),...waivers].sort((a,b)=>String(b.at).localeCompare(String(a.at)))
})
function extensionBlockerLabel(message:string){
  return ({
    'この延長の請求済みを先に取り消してください。':'請求済みの状態を先に取り消す必要があります。',
    'この延長区間にかかる保険報告を先に取り消してください。':'保険報告済みの状態を先に取り消す必要があります。',
    '現在の満了案内を先に未案内に戻してください。':'保証更新案内済みの状態を先に取り消す必要があります。',
  } as Record<string,string>)[message] || message.replaceAll('区間','期間')
}
const noticeActionLabel=computed(()=>current.value?.warrantyNotified ? '未案内に戻す' : '案内済みにする')
const noticeMode=ref<''|'warranty'|'insurance'|'report'|'billing'|'certificate'>('')
const detailTitle=computed(()=>noticeMode.value==='certificate' ? '保証書発行の物件情報' : recoveryReadOnly.value ? '復旧後の物件・保証確認' : ({warranty:'保証満了案内',insurance:'保険満了案内',report:'保険報告の物件情報',billing:'請求対象の物件情報'}[noticeMode.value || 'warranty']))
const historyFields=[{key:'applicationDate',label:'申込日'},{key:'handoverDate',label:'引渡日'},{key:'startDate',label:'保証開始日'},{key:'expiryDate',label:'保証満了日'},{key:'name',label:'物件名'},{key:'ownerTelephone',label:'施主電話番号'},{key:'years',label:'保証期間（年）'},{key:'maxYears',label:'最長保証期間（年）'}]
const maxYearsOptions=computed(()=>[10,20,30].map(value=>({title:String(value),value,props:{disabled:value<Number(current.value?.years || 0)}})))
function maxYearsRule(value:unknown){return [10,20,30].includes(Number(value)) ? Number(value)>=Number(current.value?.years || 0) || '延長済みの保証期間より短い上限にはできません。' : '10年・20年・30年を選択してください。'}
watch(propertyDialog,value=>{if(!value)historyDialog.value=false})
const emptyAddress=()=>({postalCode:'',prefecture:'',municipality:'',streetTownAndNumber:'',buildingName:''})
const emptyPropertyAddress=()=>({postalCode:'',address:'',buildingName:''})
const form=ref<Row & ReturnType<typeof emptyPropertyAddress>>({...emptyPropertyAddress()})
const propertyId=ref(''),requestId=ref('')
const propertyCompanies=computed(()=>{const available=references.activeCompanies.value;const saved=companies.value.find(company=>company.id===current.value?.constructionCompanyId);return [...available,...(saved && !available.some(company=>company.id===saved.id) ? [{...saved,props:{disabled:true}}] : [])].map(c=>({...c,id:String(c.id),name:String(c.name)}))})
const propertyGroup=computed(()=>{const groupId=current.value?.warrantyNumber ? current.value.groupId : dialogCompanies.value.find(c=>c.id===form.value.constructionCompanyId)?.defaultGroupId;return groups.value.find(g=>g.id===groupId) ?? {}})
const propertyKeySettings=computed(()=>externalKeySettings(propertyGroup.value))
const propertyRequirements=computed(()=>propertyFieldRequirements(propertyGroup.value))
function externalKeyLabelFor(row:Row){return externalKeySettings(groups.value.find(g=>g.id===row.groupId) ?? {name:row.groupName}).label}
const externalKeyRule=(value:unknown)=>{try{normalizeExternalKey(value,propertyKeySettings.value.label);return true}catch(e){return e instanceof Error?e.message:'入力を確認してください。'}}
const externalKeyLabelRule=(value:unknown)=>typeof value==='string' && value.trim().length<=80 && !/[\u0000-\u001f\u007f]/.test(value) || '名称は80文字以内で入力してください。'
const formBranches=computed(()=>current.value?.warrantyNumber ? branches.value.filter(b=>b.id===form.value.branchId) : references.activeBranches(form.value.constructionCompanyId))
async function newProperty(){if(pendingProperty.value)return;noticeMode.value='';if(!await run(loadCatalog))return;resetDialogCatalog();propertyFormal.value=false;errors.property='';error.value='';confirmWarnings.value=false;current.value=null;propertyId.value=crypto.randomUUID();requestId.value=crypto.randomUUID();form.value={...emptyPropertyAddress(),name:'',externalKey:'',ownerTelephone:'',buildingArea:'',applicationDate:japanDate(),handoverDate:'',maxYears:20,foundationInsulation:false,insulationMaterials:'',notes:'',constructionCompanyId:profile.value?.accountType==='construction_company'?profile.value.constructionCompanyId:'',branchId:profile.value?.accountType==='construction_company'?profile.value.branchId ?? '':''};confirmDates.value=false;propertyDialog.value=true}
async function openProperty(id:string,reportTarget?:Row){if(pendingProperty.value)return;selectedInsurancePeriod.value=tab.value==='report' ? reportTarget ?? null : null;noticeMode.value=recoveryReadOnly.value ? 'report' : tab.value==='alerts' ? 'warranty' : tab.value==='insuranceAlerts' ? 'insurance' : tab.value==='certificates' ? 'certificate' : tab.value==='report' ? 'report' : tab.value==='billing' ? 'billing' : '';await run(async()=>{await loadCatalog();resetDialogCatalog();const row=await call('detail',{id});const token=requestGuard.capture();await companyBranches(row.constructionCompanyId);requestGuard.assertCurrent(token);if(!dialogCompanies.value.some(c=>c.id===row.constructionCompanyId))dialogCompanies.value.push({id:row.constructionCompanyId,name:row.companyLabel});current.value=row;propertyFormal.value=row.status==='active';errors.property='';propertyId.value=id;form.value={...emptyPropertyAddress(),...row,address:propertyAddress(row),applicationDate:row.applicationDate || (row.status==='draft' ? japanDate() : '')};delete form.value.ownerName;requestId.value=crypto.randomUUID();confirmDates.value=false;propertyDialog.value=true})}
const dateChanged=computed(()=>current.value?.status==='active' && current.value.handoverDate!==form.value.handoverDate)
const formatMonth=(value:string)=>/^\d{6}$/.test(value || '') ? `${value.slice(0,4)}年${value.slice(4,6)}月` : '要確認'
function insuranceRenewalLabel(row:Row){return nextInsuranceReportLabel(row)}
const previewStart=computed(()=>form.value.handoverDate || '未入力')
const previewExpiry=computed(()=>{try{return coveragePeriods(form.value.handoverDate,current.value?.years || 10).at(-1)?.expiryDate}catch{return '日付を確認してください'}})
const handoverBlockers=computed(()=>handoverChangeBlockers(current.value))
const billingTarget=ref<Row|null>(null)
const insuranceTarget=ref<Row|null>(null),selectedInsurancePeriod=ref<Row|null>(null)
const selectedInsurancePeriodMatches=computed(()=>!!current.value && insurancePeriodStates(current.value).some(period=>matchesSelectedInsurancePeriod(period,selectedInsurancePeriod.value)))
function openInsurance(action:string,period:Row){insuranceTarget.value=period;confirmation.value=action}
function openBilling(action:string,period:Row){billingTarget.value=period;confirmation.value=action}
const undoExtension=computed(()=>current.value ? extensionUndoPreview(current.value) : null)
const extensionDeadline=computed(()=>{try{return current.value ? extensionApplicationDeadline(coveragePeriods(current.value.handoverDate,current.value.years+10).at(-1)!.startDate) : ''}catch{return ''}})
const extensionExpiry=computed(()=>{try{return coveragePeriods(current.value?.handoverDate,current.value?.years+10).at(-1)?.expiryDate}catch{return ''}})
watch(()=>form.value.handoverDate,()=>confirmDates.value=false)
async function saveProperty(action:string){
  if(pendingProperty.value){await retryProperty();return}
  if(!['waiveInsurance','undoInsuranceWaiver'].includes(action) && noticeMode.value && (!(noticeMode.value==='warranty' && action==='notify') && !(noticeMode.value==='billing' && ['bill','undoBill','confirmUnbilled'].includes(action)) && !(noticeMode.value==='report' && action==='undoReport') && !(noticeMode.value==='certificate' && action==='undoCertificate')))return
  if(['save','register'].includes(action) && !await validateProperty(action==='register' || current.value?.status==='active'))return
  if(busy.value)return
  propertyAddressFields.value?.cancelPostalLookup()
  pendingProperty.value={action,payload:frozenPayload({id:propertyId.value,requestId:requestId.value,revision:current.value?.revision ?? 0,fields:JSON.parse(JSON.stringify(form.value)),confirmDates:confirmDates.value,confirmRegistration:confirmRegistration.value,confirmWarnings:confirmWarnings.value,notified:!current.value?.warrantyNotified,targetRequestId:undoExtension.value?.targetRequestId,targetReportId:current.value ? latestInsuranceReport(current.value)?.requestId : undefined,warrantyPeriodId:billingTarget.value?.id,startDate:billingTarget.value?.startDate,expiryDate:billingTarget.value?.expiryDate,confirmCancellation:confirmCancellation.value,reason:reason.value,...(action==='extend' ? {extensionApplicationDate:extensionApplicationDate.value} : {}),insurancePeriodId:insuranceTarget.value?.id}),phase:'unknown'}
  await retryProperty()
}
async function retryProperty(){await run(async()=>{
  const submission=pendingProperty.value;if(!submission)return
  if(submission.phase==='unknown'){
    try{
      const result=await call(submission.action,submission.payload)
      assertSubmissionResult(result,submission.payload.id)
      submission.result=result;submission.phase=result.operationStatus==='legacy-unverified'?'legacy-unverified':'completed'
    }catch(e){
      const details=(e as {details?:{operationOutcome?:string;registrationWarnings?:unknown}})?.details
      if(details?.operationOutcome==='rejected'){
        pendingProperty.value=null;requestId.value=crypto.randomUUID()
        if(submission.action==='register' && Array.isArray(details.registrationWarnings)){registrationWarnings.value=details.registrationWarnings.filter((v):v is string=>typeof v==='string');confirmWarnings.value=false}
      }
      throw e
    }
  }
  const row=await call('detail',{id:submission.payload.id})
  current.value=row;form.value={...emptyPropertyAddress(),...row,address:propertyAddress(row)};delete form.value.ownerName
  requestId.value=crypto.randomUUID();confirmDates.value=false
  const legacy=submission.phase==='legacy-unverified'
  pendingProperty.value=null;confirmation.value='';reason.value=''
  showSnackbar(legacy?'以前の操作記録を確認しました。今回の入力の保存は未確認です。最新の内容を確認してください。':'保存しました。',legacy?'warning':'success')
  if(!legacy && (submission.action==='register' || submission.action==='save' && row.status==='draft'))propertyDialog.value=false
  try{await fetchRows()}catch{errors.page='保存結果は確認済みですが、一覧を更新できませんでした。再抽出してください。'}
})}

async function performConfirmed(){if(pendingProperty.value){await retryProperty();return}if(!await validate(confirmationForm.value))return;await saveProperty(confirmation.value)}
const settingReadOnly=ref(false)
const settingDialog=ref(false),settingAction=ref('saveCompany'),setting=ref<Row>({})
const settingSections=computed(()=>[{title:'工務店',action:'saveCompany',items:companies.value},{title:'工務店の本支店',action:'saveBranch',items:branches.value},{title:'保証グループ',action:'saveGroup',items:groups.value}])
const assignableGroups=computed(()=>groups.value.filter(g=>g.enabled!==false || g.id===setting.value.defaultGroupId).map(g=>({...g,name:g.name+(g.enabled===false?'（無効）':''),props:{disabled:g.enabled===false}})))
const settingTitle=computed(()=>settingSections.value.find(s=>s.action===settingAction.value)?.title)
const settingGroup=computed(()=>groups.value.find(g=>g.id===companies.value.find(c=>c.id===setting.value.constructionCompanyId)?.defaultGroupId))
const settingBranchCodeRequired=computed(()=>externalKeySettings(settingGroup.value).required)
function openSetting(action:string,item:Row={}){
  if(pendingSetting.value)return
  errors.setting='';settingAction.value=action;settingReadOnly.value=!!item.id && item.enabled===false
  setting.value={address:emptyAddress(),name:'',branchCode:'',defaultGroupId:selectedGroupId.value,constructionCompanyId:selectedCompanyId.value,prefix:'',fiscalStartMonth:1,enabled:true,...JSON.parse(JSON.stringify(item))}
  if(action==='saveGroup'){setting.value.billingRecipient={...billingRecipientDefaults(),...(setting.value.billingRecipient ?? {})};setting.value.prefix=normalizeWarrantyPrefix(setting.value.prefix);const keys=externalKeySettings(item);setting.value.externalKeyRequired=keys.required;setting.value.externalKeyLabel=keys.label;Object.assign(setting.value,propertyFieldRequirements(item))}
  delete setting.value.groupId // Legacy branch overrides are never submitted or used.
  settingDialog.value=true
}
watch(()=>setting.value.name,(name)=>{if(settingAction.value==='saveGroup' && !setting.value.id && String(name ?? '').trim().toUpperCase()==='UH'){setting.value.externalKeyRequired=true;setting.value.addressRequired=false;setting.value.insulationMaterialsRequired=false;if(!setting.value.externalKeyLabel || setting.value.externalKeyLabel==='外部キー')setting.value.externalKeyLabel='お施主様契約No'}})
async function saveSetting(){
  if(pendingSetting.value){await retrySetting();return}
  if(settingReadOnly.value || busy.value || !await validate(settingForm.value))return
  if(busy.value || pendingSetting.value)return
  companyAddressFields.value?.cancelPostalLookup();branchAddressFields.value?.cancelPostalLookup()
  pendingSetting.value={action:settingAction.value,payload:frozenPayload({...setting.value,...(!setting.value.id?{requestId:crypto.randomUUID()}: {})}),phase:'unknown'}
  await retrySetting()
}
async function retrySetting(){await run(async()=>{
  const submission=pendingSetting.value;if(!submission)return
  if(submission.phase==='unknown'){
    try{
      const result=await call(submission.action,submission.payload)
      assertSubmissionResult(result,submission.payload.id || undefined)
      submission.result=result;submission.phase=result.operationStatus==='legacy-unverified'?'legacy-unverified':'completed'
      // Preserve the created identity before any catalog request can fail.
      setting.value.id=result.id
      if(!submission.payload.id && submission.action==='saveGroup'){selectedGroupId.value=result.id;selectedCompanyId.value=''}
      if(!submission.payload.id && submission.action==='saveCompany'){selectedGroupId.value=submission.payload.defaultGroupId;selectedCompanyId.value=result.id}
    }catch(e){if((e as {details?:{operationOutcome?:string}})?.details?.operationOutcome==='rejected')pendingSetting.value=null;throw e}
  }
  referenceCache.clear();await loadCatalog()
  const legacy=submission.phase==='legacy-unverified'
  pendingSetting.value=null;settingDialog.value=false
  showSnackbar(legacy?'以前の操作記録を確認しました。今回の入力の保存は未確認です。最新の設定を確認してください。':'設定を保存しました。',legacy?'warning':'success')
})}

const accountDialog=ref(false),account=ref<Row>({}),accountCreated=ref(false)
async function reenableSetting(kind:string,item:Row){await run(async()=>{await call('reenableMaster',{kind,id:item.id});referenceCache.clear();await loadCatalog();showSnackbar('有効化しました。','success')})}
async function openAccount(){if(!await run(loadCatalog))return;resetDialogCatalog();errors.account='';accountCreated.value=false;account.value={constructionCompanyId:'',branchId:'',scope:'company',displayName:'',email:''};accountDialog.value=true}
async function sendSetup(email:string){$firebase.auth.languageCode='ja';await sendPasswordResetEmail($firebase.auth,email,{url:window.location.origin})}
async function createAccount(){if(accountCreated.value || !await validate(accountForm.value))return;await run(async()=>{
 const result=await call('createAccount',account.value);accountCreated.value=true
 let mailSent=false
 try{await sendSetup(result.email);mailSent=true}catch{errors.account='アカウントは作成済みですが、設定メールを送信できませんでした。一覧の「設定メール再送」を使ってください。'}
 try{accounts.value=(await call('accounts')).accounts}catch{const message='担当者一覧を更新できませんでした。画面を開き直して確認してください。';if(mailSent)errors.page=message;else errors.account+=' '+message}
 if(mailSent){accountDialog.value=false;showSnackbar('アカウントを作成し、パスワード設定メールを送信しました。','success')}
})}
const resend=(email:string)=>run(async()=>{await sendSetup(email);showSnackbar('設定メールを送信しました。','success')})
const toggleAccount=(a:Row)=>run(async()=>{await call('setAccountEnabled',{uid:a.id,enabled:!a.enabled});accounts.value=(await call('accounts')).accounts})
const catalogBusy=ref(false), catalogError=ref('')
const dialogCompanies=ref<Row[]>([]),dialogBranches=ref<Row[]>([])
watch(companies,()=>{dialogCompanies.value=[...companies.value]})
watch(()=>form.value.constructionCompanyId,()=>{if(!current.value?.externalKey)form.value.externalKey=""})
function resetDialogCatalog(){catalogError.value='';dialogCompanies.value=[...companies.value];dialogBranches.value=[...branches.value]}
async function runCatalog(fn:()=>Promise<void>){if(catalogBusy.value)return;const token=requestGuard.capture();catalogBusy.value=true;catalogError.value='';try{await fn()}catch(e){if(requestGuard.isCurrent(token))catalogError.value=e instanceof Error?e.message:'候補の取得に失敗しました。'}finally{if(requestGuard.isCurrent(token))catalogBusy.value=false}}
async function fetchCompanyOptions(search:string){await references.ensureReady();return references.activeCompanies.value}
function rememberCompany(row:Row|null){if(row && !dialogCompanies.value.some(c=>c.id===row.id))dialogCompanies.value.push(row)}
function choosePropertyCompany(row:Row|null){rememberCompany(row);selectPropertyCompany(row?.id || '')}
function chooseAccountCompany(row:Row|null){rememberCompany(row);selectAccountCompany(row?.id || '')}
async function companyBranches(id:string){dialogBranches.value=[];if(!id)return;await references.ensureReady();dialogBranches.value=references.activeBranches(id)}
const selectPropertyCompany=(id:string)=>{form.value.branchId='';if(!id){dialogBranches.value=[];return}void runCatalog(()=>companyBranches(id))}
const selectAccountCompany=(id:string)=>{account.value.branchId='';if(!id){dialogBranches.value=[];return}void runCatalog(()=>companyBranches(id))}
const selectedKeys=ref<string[]>([]),reportConfirm=ref(false)
const rowKey=(r:Row)=>JSON.stringify([r.id,r.reportTarget?.insurancePeriodId ?? '',r.reportTarget?.warrantyPeriodId ?? '',r.reportTarget?.startDate ?? '',r.reportTarget?.expiryDate ?? '',r.reportId ?? '',r.billingEventId ?? ''])
const selectableRows=computed(()=>rows.value.filter(r=>r.reportKind!=='review'))
const allSelected=computed(()=>selectableRows.value.length>0 && selectableRows.value.every(r=>selectedKeys.value.includes(rowKey(r))))
function toggleAll(value:unknown){if(busy.value || reportDirty.value)return;selectedKeys.value=value ? selectableRows.value.map(rowKey) : []}
const selectedRows=computed(()=>rows.value.filter(r=>selectedKeys.value.includes(rowKey(r)) && r.reportKind!=='review'))
const pendingSelectedRows=computed(()=>selectedRows.value.filter(r=>r.reportState==='pending'))
watch(()=>JSON.stringify(filter),()=>{selectedKeys.value=[];reportConfirm.value=false;errors.report=''})
const billingLabel=(state:string)=>({pending:'未請求',billed:'請求済み',unknown:'要確認'}[state] || '要確認')
const reportLabel=(kind:string)=>({new:'新規',renewal:'更新','past-new':'過去の未処理分（新規）','past-renewal':'過去の未処理分（更新）',review:'保険期間の個別確認が必要'}[kind] || kind)
const reportRequests=new Map<string,string>()
async function markReports(){if(busy.value || reportDirty.value || recoveryReadOnly.value)return;if(!pendingSelectedRows.value.length){errors.report='報告する物件を選択してください。';return}await run(async()=>{
  const selected:Row[]=pendingSelectedRows.value.map(r=>({...r,reportTarget:r.reportTarget ? {...r.reportTarget} : undefined}));const reportMonth=loadedReportMonth.value,completed=new Set<string>()
  let reportFailure:unknown,refreshFailure:unknown
  try {
    for(const r of selected){const key=JSON.stringify([rowKey(r),r.revision,reportMonth]);if(!reportRequests.has(key))reportRequests.set(key,crypto.randomUUID());await call('report',{id:r.id,revision:r.revision,requestId:reportRequests.get(key),month:reportMonth,reportTarget:r.reportTarget});completed.add(rowKey(r))}
  } catch(e){reportFailure=e}
  try{await fetchRows()}catch(e){refreshFailure=e}
  if(reportFailure){selectedKeys.value=selected.filter(r=>!completed.has(rowKey(r)) && rows.value.some(row=>rowKey(row)===rowKey(r) && row.revision===r.revision && JSON.stringify(row.reportTarget)===JSON.stringify(r.reportTarget))).map(rowKey);const message=reportFailure instanceof Error ? reportFailure.message : '報告済みの更新に失敗しました。';throw new Error(message+(refreshFailure ? ' 一覧も更新できませんでした。保存結果を確認して再試行してください。' : ' 未完了の選択分を確認して再試行してください。表示が変わった物件は選択を解除しました。「戻る」から一覧を確認し、選択し直してください。'))}
  selectedKeys.value=[];reportConfirm.value=false;showSnackbar('選択分を報告済みにしました。','success')
  if(refreshFailure)errors.page='報告済みの更新は完了しましたが、一覧を更新できませんでした。再抽出してください。'
})}
watch(confirmation,()=>{extensionApplicationDate.value='';errors.confirmation='';confirmCancellation.value=false;reason.value='';requestId.value=crypto.randomUUID()})
watch(reportConfirm,()=>{errors.report=''})
async function exportCsv(){
  if(busy.value || reportDirty.value || !selectedRows.value.length)return
  try{await references.ensureReady()}catch(e){errors.page=e instanceof Error?e.message:'参照マスタを取得できません。';return}
  if(busy.value || reportDirty.value || !selectedRows.value.length)return
  if(selectedRows.value.some(row=>!companies.value.some(company=>company.id===row.constructionCompanyId) || (row.branchId && !branches.value.some(branch=>branch.id===row.branchId)))){errors.page='出力対象の工務店・本支店名を確認できません。参照マスタを確認してください。';return}
  const insurance=tab.value==='report'
  const headers=insurance ? ['対象月','物件名','住所','工務店名','支店名','引渡日','建面積','保険申込'] : ['手続き','請求対象基準日','工務店','本支店','保証番号','物件名','申込日','引渡日','請求対象保証開始日','請求対象保証満了日','請求状態']
  const data=selectedRows.value.map(r=>insurance ? [loadedReportMonth.value,r.name,[propertyAddress(r),r.buildingName].join(''),r.companyLabel || companyName(r.constructionCompanyId),r.branchId ? r.branchLabel || branchName(r.branchId) : '',r.handoverDate,r.buildingArea,''] : [r.billingKind,r.billingDate,r.companyLabel || companyName(r.constructionCompanyId),r.branchLabel || branchName(r.branchId),r.warrantyNumber,r.name,r.applicationDate,r.handoverDate,r.billingStartDate,r.billingExpiryDate,r.billingState==='billed' ? '請求済み' : r.billingState==='pending' ? '未請求' : '要確認'])
  const blob=new Blob(['\uFEFF'+[headers,...data].map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${insurance?'保険報告':'請求用一覧'}_${insurance ? loadedReportMonth.value : filter.month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
</script>

<style scoped>
.property-quick-search { flex: 1 1 280px; min-width: 0; }
/* Match the default-density input control; exclude its reserved message region. */
.property-search-actions { height: 56px; flex: 0 0 auto; }
.property-detail-link { color: rgb(var(--v-theme-primary)); text-decoration: underline; text-underline-offset: 3px; }
.notice-details { display: grid; grid-template-columns: minmax(8rem, 1fr) 3fr; gap: 16px 24px; }
.notice-details dt { color: rgb(var(--v-theme-on-surface)); font-weight: 600; }
.notice-details dd { margin: 0; overflow-wrap: anywhere; }
@media (max-width: 599px) { .notice-details { grid-template-columns: 1fr; gap: 8px; } .notice-details dd { margin-bottom: 12px; } }
</style>

