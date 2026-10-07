<template>
  <v-app-bar color="primary"><v-app-bar-title>白蟻保証 業務管理 <v-chip size="small">打ち合わせ用試作</v-chip></v-app-bar-title><template #append><span class="mr-3 d-none d-md-inline">{{ profile?.displayName }}</span><v-btn @click="logout">ログアウト</v-btn></template></v-app-bar>
  <v-main><v-container class="py-6" style="max-width:1400px">
    <v-tabs v-model="tab" color="primary" class="mb-5" show-arrows>
      <v-tab :disabled="busy" value="properties">物件・保証</v-tab><v-tab :disabled="busy" value="alerts">保証満了案内</v-tab><v-tab :disabled="busy" v-if="staff" value="insuranceAlerts">保険満了案内</v-tab><v-tab :disabled="busy" v-if="manager && !recoveryReadOnly" value="alertSettings">アラート設定</v-tab>
      <v-tab :disabled="busy" v-if="staff" value="report">保険報告用一覧</v-tab><v-tab :disabled="busy" v-if="staff" value="billing">請求用一覧</v-tab><v-tab :disabled="busy" v-if="staff && !recoveryReadOnly" value="settings">保証グループ・工務店・支店</v-tab>
      <v-tab :disabled="busy" v-if="manager && !recoveryReadOnly" value="accounts">工務店担当者</v-tab><v-tab :disabled="busy" v-if="manager && !recoveryReadOnly" value="staff">HS担当者</v-tab>
      <v-tab :disabled="busy" v-if="manager" value="recovery">バックアップ・復旧状況</v-tab>
    </v-tabs>
    <v-alert v-if="recoveryReadOnly" type="warning" class="mb-4">HS確認待ちです。閲覧とCSV出力のみ利用できます。業務再開の了承はシステム外で開発側へお知らせください。</v-alert>
    <v-alert v-if="errors.page" type="error" closable class="mb-4" @click:close="errors.page=''">{{ errors.page }}</v-alert>
    <v-progress-linear v-if="busy" indeterminate class="mb-3" />
    <RecoveryStatus v-if="tab==='recovery' && manager" />
    <StaffAccountManagement v-else-if="tab==='staff' && manager" />
    <template v-else-if="['properties','report','billing','alerts','insuranceAlerts'].includes(tab)">
      <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-4"><h1 class="text-h5">{{ tab==='billing' ? '請求用一覧（新規・延長）' : tab==='report' ? '保険会社への月次報告' : tab==='insuranceAlerts' ? '保険満了案内の対象' : tab==='alerts' ? '保証満了案内の対象' : '物件・保証' }}</h1><div class="d-flex flex-wrap ga-2"><v-btn v-if="tab==='properties' && staff && !recoveryReadOnly" variant="outlined" :disabled="busy" @click="openBulkImport">一括取込み</v-btn><v-btn variant="flat" v-if="tab==='properties' && !recoveryReadOnly" color="primary" :disabled="busy" @click="newProperty">物件を新規登録</v-btn></div></div>
      <v-alert v-if="tab==='billing'" type="info" class="mb-4">新規分は申込日の年月、延長分は延長後の保証開始年月で検索します。延長取消済みの手続きは含みません。対象年月を変更したら「検索・更新」を押してください。</v-alert>
      <v-alert v-if="tab==='report'" type="info" class="mb-4">新規は引渡年月、更新は保険満了年月で抽出。過去の未処理分を区別します。チェックした物件だけを出力します。<span v-if="!recoveryReadOnly">実際に提出した分を別操作で報告済みにしてください。</span>過去の初回未報告分は、指定月末を含む保険期間が対象です。記録不足で期間確認が必要な物件はここから報告できません。</v-alert>
      <v-alert v-if="tab==='alerts' || tab==='insuranceAlerts'" type="info" class="mb-4">満了{{ tab==='insuranceAlerts' ? alertSettings.insuranceMonths : alertSettings.warrantyMonths }}か月前から、期限を過ぎた物件も表示します。<span v-if="tab==='alerts'">未案内の物件だけを表示し、案内済みにすると一覧から外れます。</span>実際のメールは送りません。<span v-if="tab==='insuranceAlerts'">保存済みの保険満了日による予告です。報告対象は月次報告一覧で確認します。</span></v-alert>
      <v-card class="mb-4"><v-card-text><v-form ref="searchForm" @submit.prevent="loadRows"><v-row>
        <v-col v-if="tab==='properties'" cols="12"><div class="d-flex flex-wrap align-start ga-3"><v-text-field v-model="filter.warrantyNumber" :rules="optionalRules" label="保証番号（全体・完全一致）" clearable :hide-details="false" class="property-quick-search" /><div class="property-search-actions d-flex align-center ga-3"><v-btn color="primary" variant="flat" :disabled="busy" @click="loadRows">検索</v-btn></div></div></v-col>
        <v-col v-if="tab==='billing'" cols="12"><v-row><v-col cols="12" md="3"><v-text-field v-model="filter.warrantyNumber" :rules="optionalRules" label="保証番号（全体・完全一致）" clearable :hide-details="false" /></v-col><v-col cols="12" md="4"><v-text-field v-model="filter.search" :rules="optionalRules" label="物件名・施主名・住所（2文字以上）" clearable :hide-details="false" /></v-col>
        <v-col v-if="staff || profile?.accountType==='construction_company' && profile.scope==='company'" cols="6" md="2"><v-select v-model="filter.branchId" :items="branches" :item-title="branchOptionLabel" item-value="id" label="支店" clearable :hide-details="false" /></v-col>
        <v-col v-if="staff" cols="6" md="2"><v-select v-model="filter.companyId" :items="companies" item-title="name" item-value="id" label="工務店" clearable :hide-details="false" /></v-col>
        <v-col cols="6" md="2"><v-select v-model="filter.groupId" :items="groups" item-title="name" item-value="id" label="保証グループ" clearable :hide-details="false" /></v-col>
        <v-col cols="6" md="2"><v-text-field v-model="filter.fiscalYear" :rules="[yearRule]" label="年度（例：2026）" clearable :hide-details="false" /></v-col>
        </v-row></v-col><v-col v-if="tab==='report' || tab==='billing'" cols="6" md="3"><BusinessDateInput v-model="filter.month" :rules="[requiredRule,monthRule]" type="month" label="対象年月" :hide-details="false" /></v-col>
        <v-col cols="12" class="d-flex flex-wrap ga-2"><v-btn v-if="tab!=='properties'" variant="flat" color="primary" :disabled="busy" @click="loadRows">{{ tab==='report' ? '対象を抽出' : ['alerts','insuranceAlerts'].includes(tab) ? '一覧を更新' : '検索・更新' }}</v-btn><v-btn v-if="!['alerts','insuranceAlerts'].includes(tab)" variant="outlined" :disabled="busy" @click="clearFilter">条件をクリア</v-btn><v-btn variant="outlined" v-if="staff && ['report','billing'].includes(tab)" :disabled="!selectedRows.length || busy || reportDirty" @click="exportCsv">選択した行をCSV出力</v-btn><v-btn variant="outlined" v-if="tab==='report' && !recoveryReadOnly" :disabled="!selectedRows.length || busy || reportDirty" @click="reportConfirm=true">選択分を報告済みにする</v-btn><v-btn variant="outlined" v-if="tab==='properties' && staff" disabled>保証書CSV（Word項目待ち）</v-btn></v-col>
      </v-row><div v-if="tab==='properties' && appliedPropertyFilters.length" class="d-flex flex-wrap ga-2 mt-3" aria-label="適用中の検索条件"><v-chip v-for="item in appliedPropertyFilters" :key="item.key" size="small" closable :disabled="busy" @click:close="removePropertyFilter(item.key)">{{ item.label }}</v-chip></div></v-form></v-card-text></v-card>
      <p class="text-body-2 mb-3">{{ rows.length }}件{{ limited ? '（条件なし：更新が新しい20件まで）' : '' }} <span v-if="reportDirty && tab==='report'">／条件を変更しました。再抽出してください。</span></p>
      <div v-if="['report','billing'].includes(tab)" class="d-flex flex-wrap align-center ga-3 mb-3">
        <v-checkbox :model-value="allSelected" :indeterminate="selectedRows.length>0 && !allSelected" :disabled="busy || reportDirty || !selectableRows.length" :label="`すべて選択（検索結果全体・${selectableRows.length}件）`" hide-details @update:model-value="toggleAll" />
        <span>選択中：{{ selectedRows.length }}件</span><span v-if="tab==='report'" class="text-caption">個別確認が必要な行は選択対象外です。</span>
      </div>
      <v-pagination v-model="page" :length="Math.max(1,Math.ceil(rows.length/20))" /><v-card><v-table><thead><tr><th v-if="['report','billing'].includes(tab)">出力</th><th>物件／施主</th><th>工務店／支店</th><th>保証番号</th><th>{{ tab==='properties' ? '申込日／引渡日' : '引渡日／申込日' }}</th><th>{{ tab==='report' ? '報告対象の保険期間／保証期間' : tab==='insuranceAlerts' ? '現在の保険期間' : tab==='billing' ? '請求対象の保証期間' : '現在の保証期間' }}<template v-if="tab==='properties'"><br>現在の保険期間</template></th><th>状態</th></tr></thead><tbody><tr v-for="(row,i) in visibleRows" :key="row.id+':'+i"><td v-if="['report','billing'].includes(tab)"><v-checkbox v-model="selectedKeys" :aria-label="`${row.name}を選択`" :value="rowKey(row)" :disabled="row.reportKind==='review' || busy || reportDirty" :hide-details="false" /></td><td><a :href="`#property-${row.id}`" class="property-detail-link" aria-haspopup="dialog" @click.prevent="openProperty(row.id)">{{ row.name }}</a><div class="pb-2">{{ row.ownerName }}</div></td><td>{{ row.companyLabel || companyName(row.constructionCompanyId) }}<br>{{ row.branchLabel || branchName(row.branchId) }}</td><td>{{ row.warrantyNumber || '未採番' }}<br><small>{{ row.groupName }}</small></td><td><template v-if="tab==='properties'">{{ row.applicationDate || '未登録' }}<br>{{ row.handoverDate || '引渡日未設定' }}</template><template v-else>{{ row.handoverDate || '引渡日未設定' }}<br>{{ row.applicationDate || '未登録' }}</template></td><td><template v-if="tab==='report'"><div>保険：{{ row.reportTarget?.startDate || '要確認' }} ～ {{ row.reportTarget?.expiryDate || '要確認' }}</div><div class="mt-1">保証：{{ row.reportTarget?.warrantyStartDate || '要確認' }} ～ {{ row.reportTarget?.warrantyExpiryDate || '要確認' }}</div></template><template v-else>{{ (tab==='report' ? row.reportTarget?.startDate : tab==='insuranceAlerts' ? row.insuranceStartDate : tab==='billing' ? row.billingStartDate : row.startDate) || '—' }} ～ {{ (tab==='report' ? row.reportTarget?.expiryDate : tab==='insuranceAlerts' ? row.insuranceExpiryDate : tab==='billing' ? row.billingExpiryDate : row.expiryDate) || '—' }}</template><div v-if="tab==='properties'" class="mt-1"><template v-if="row.insuranceReported">{{ row.insuranceStartDate || '—' }} ～ {{ row.insuranceExpiryDate || '—' }}</template><template v-else>未報告</template></div></td><td><v-chip :color="row.status==='active'?'success':row.status==='cancelled'?'error':'default'" size="small">{{ statusLabel(row.status) }}</v-chip><div v-if="tab==='report'">{{ reportLabel(row.reportKind) }}／{{ row.reportTarget?.warrantyPeriodLabel }}</div><div v-if="tab==='billing'">{{ row.billingKind }}：{{ row.billingDate }}／{{ billingLabel(row.billingState) }}</div><div v-if="tab==='alerts'">{{ row.warrantyNotified ? '案内済み' : '未案内' }}／{{ row.years>=row.maxYears ? '最終満了・延長不可' : '延長可能' }} {{ row.expiryDate<japanDate() ? '／満了済み' : '' }}</div></td></tr><tr v-if="!rows.length"><td colspan="7" class="py-8 text-center">該当する物件はありません。</td></tr></tbody></v-table></v-card>
    </template>
    <template v-else-if="tab==='alertSettings' && manager">
      <h1 class="text-h5 mb-4">アラート設定</h1><v-card max-width="650"><v-card-text><v-form ref="alertsForm" @submit.prevent="saveAlertSettings"><p class="mb-4">全利用者共通の案内時期です。満了日から暦で月を戻し、同じ日がない月は月末から表示します。</p><v-select v-model="alertSettings.warrantyMonths" :rules="[requiredRule]" :items="monthOptions" label="保証満了の何か月前から表示するか" /><v-select v-model="alertSettings.insuranceMonths" :rules="[requiredRule]" :items="monthOptions" label="保険満了の何か月前から表示するか" /><v-btn variant="flat" color="primary" :disabled="busy" @click="saveAlertSettings">設定を保存</v-btn></v-form></v-card-text></v-card>
    </template>
    <template v-else-if="tab==='settings' && staff">
      <WarrantyOrganizationManagement :groups="groups" :companies="companies" :branches="branches" :group-id="selectedGroupId" :company-id="selectedCompanyId" :busy="busy" @select-group="selectGroup" @select-company="selectCompany" @edit="openSetting" />
      <v-btn class="mt-4" variant="outlined" :disabled="busy" @click="run(()=>loadCatalog(true))">最新の設定を取得</v-btn>
    </template>
    <template v-else-if="tab==='accounts' && manager">
      <div class="d-flex justify-space-between mb-4"><h1 class="text-h5">工務店担当者アカウント</h1><v-btn variant="flat" color="primary" :disabled="busy" @click="openAccount">担当者を追加</v-btn></div><p class="mb-4">HSが担当者ごとに発行します。本店の全店担当は自社全店、支店担当は所属支店の物件を操作します。</p>
      <v-text-field v-model="accountSearch" label="氏名・メール・工務店で絞り込み" clearable /><v-pagination v-model="accountPage" :length="Math.max(1,Math.ceil(accountRows.length/20))" /><v-card><v-table><thead><tr><th>氏名</th><th>メールアドレス</th><th>工務店／範囲</th><th>状態</th><th>操作</th></tr></thead><tbody><tr v-for="a in accountRows.slice((accountPage-1)*20,accountPage*20)" :key="a.id"><td>{{ a.displayName }}</td><td>{{ a.email }}</td><td>{{ companyName(a.constructionCompanyId) }}／{{ a.scope==='company'?'自社全店':branchName(a.branchId) }}</td><td>{{ a.enabled?'有効':'無効' }}</td><td><v-btn class="ma-1" variant="outlined" :disabled="busy" @click="toggleAccount(a)">{{ a.enabled?'無効化':'再有効化' }}</v-btn><v-btn class="ma-1" variant="outlined" :disabled="busy" @click="resend(a.email)">設定メール再送</v-btn></td></tr></tbody></v-table></v-card>
    </template>

    <v-dialog v-model="propertyDialog" max-width="1000" persistent scrollable><v-card><v-card-title v-if="noticeMode" class="text-wrap">{{ detailTitle }} — {{ current?.name }}</v-card-title><v-card-title v-else class="d-flex flex-wrap align-center ga-3"><span class="flex-grow-1">{{ current?.warrantyNumber || '物件の下書き' }} — {{ form.name || '新規物件' }}</span><v-btn v-if="current?.status==='active'" color="error" variant="flat" :disabled="busy || catalogBusy" @click="confirmation='cancel'">物件・保証を取り消す</v-btn></v-card-title><v-card-text>
      <v-alert v-if="errors.property" type="error" class="mb-4">{{ errors.property }}</v-alert>
      <v-alert v-if="current?.status==='cancelled'" type="warning" class="mb-4">取消済みです。HSで復元するまで編集できません。</v-alert>
      <template v-if="noticeMode && current">
        <v-card variant="outlined" class="mb-4"><v-card-title>物件情報</v-card-title><v-card-text><dl class="notice-details">
          <dt>保証番号</dt><dd>{{ current.warrantyNumber }}</dd><dt>物件名</dt><dd>{{ current.name }}</dd>
          <dt>工務店／支店</dt><dd>{{ current.companyLabel || companyName(current.constructionCompanyId) }}／{{ current.branchLabel || branchName(current.branchId) }}</dd>
          <dt>施主名／電話</dt><dd>{{ current.ownerName }}／{{ current.ownerTelephone || '未登録' }}</dd>
          <dt>所在地</dt><dd>{{ [propertyAddress(current),current.buildingName].filter(Boolean).join(' ') }}</dd>
          <dt>申込日／引渡日</dt><dd>{{ current.applicationDate || '未登録' }}／{{ current.handoverDate || '未登録' }}</dd>
          <dt>保証グループ</dt><dd>{{ current.groupName || '未登録' }}</dd>
          <dt>建築面積</dt><dd>{{ current.buildingArea }}㎡</dd>
          <dt>基礎断熱材／使用資材</dt><dd>{{ current.foundationInsulation ? 'あり／'+current.insulationMaterials : 'なし' }}</dd>
          <dt>備考</dt><dd class="text-pre-wrap">{{ current.notes || 'なし' }}</dd>
        </dl></v-card-text></v-card>
        <v-card v-if="['warranty','insurance'].includes(noticeMode)" variant="outlined"><v-card-title>{{ ['warranty','billing'].includes(noticeMode) ? '保証の満了・案内状況' : '保険の満了・報告状況' }}</v-card-title><v-card-text><dl class="notice-details">
          <dt>対象期間</dt><dd>{{ ['warranty','billing'].includes(noticeMode) ? current.startDate : current.insuranceStartDate }} ～ {{ ['warranty','billing'].includes(noticeMode) ? current.expiryDate : current.insuranceExpiryDate }}</dd>
          <template v-if="['warranty','billing'].includes(noticeMode)"><dt>案内状況</dt><dd>{{ current.warrantyNotified ? '案内済み' : '未案内' }}</dd><dt>保証年数／上限</dt><dd>{{ current.years }}年／{{ current.maxYears }}年 — {{ current.years>=current.maxYears ? '最終満了・延長不可' : '延長可能' }}</dd></template>
          <template v-else><dt>報告有無</dt><dd>{{ current.insuranceReported ? '報告済み' : '未報告' }}</dd><dt>次回報告の対象年月</dt><dd>{{ insuranceRenewalLabel(current) }}</dd></template>
        </dl></v-card-text></v-card>
        <p v-if="!recoveryReadOnly" class="text-body-2 mt-4">{{ noticeMode==='warranty' ? '連絡はHSが別途行います。ここでは案内状況のみ変更できます。' : noticeMode==='billing' ? '物件情報は閲覧専用です。保証期間ごとの請求状態を下のカードで管理できます。' : '報告対象の抽出と報告済みの操作は「保険報告用一覧」で行ってください。' }} 物件の訂正・保証延長は「物件・保証」で行ってください。</p>
      </template>
      <template v-else><v-progress-linear v-if="catalogBusy" indeterminate class="mb-3" /><v-alert v-if="catalogError" type="error" class="mb-4">{{ catalogError }}</v-alert><p class="text-body-2 mb-3">＊は本登録に必要な項目です。下書きは物件名と工務店を指定して保存できます。</p><v-form ref="propertyForm" @submit.prevent :disabled="current?.status==='cancelled'"><v-row><v-col cols="12" md="6"><CompanyAutocomplete v-model="form.constructionCompanyId" :items="propertyCompanies" :fetch-options="fetchCompanyOptions" :active="propertyDialog" required :disabled="busy || catalogBusy || !!current?.warrantyNumber || !staff" @select="choosePropertyCompany" /><v-select v-model="form.branchId" :items="formBranches" :item-title="branchOptionLabel" item-value="id" label="支店（空欄は本店）" :disabled="busy || catalogBusy || !!current?.warrantyNumber || companyBranchOnly" clearable /><v-text-field v-model="form.name" :rules="requiredRules" required label="物件名" /><v-text-field v-model="form.ownerName" :rules="propertyFormal ? requiredRules : optionalRules" required label="施主名" /><v-text-field v-model="form.ownerTelephone" :rules="optionalRules" label="施主電話番号" /><v-text-field v-model="form.buildingArea" :rules="[...(propertyFormal ? [requiredRule] : []),areaRule]" required type="number" min="0" step="0.01" label="建築面積（㎡）" /><BusinessDateInput v-model="form.applicationDate" :rules="[...(propertyFormal ? [requiredRule] : []),dateRule]" required type="date" label="申込日（本登録後は変更不可）" :disabled="!!current?.warrantyNumber" /><BusinessDateInput v-model="form.handoverDate" :rules="[...(propertyFormal ? [requiredRule] : []),dateRule]" required type="date" label="引渡日" :disabled="handoverBlockers.length>0" :hint="handoverBlockers.join(' ')" persistent-hint /><v-select v-model="form.maxYears" :rules="[maxYearsRule]" required :items="maxYearsOptions" label="最長保証期間（年）" hint="上限の選択だけでは延長されません。延長は「10年間延長」から行います。" persistent-hint class="mb-4" /></v-col><v-col cols="12" md="6"><PropertyAddressFields v-model="form" :validate-required="propertyFormal" :postal-lookup-provider="hostedPostalLookupProvider" /><v-switch v-model="form.foundationInsulation" label="基礎断熱材あり" color="primary" /><v-text-field v-if="form.foundationInsulation" v-model="form.insulationMaterials" :rules="propertyFormal ? requiredRules : optionalRules" required label="使用資材" /><v-textarea v-model="form.notes" :rules="optionalRules" label="備考" rows="3" /></v-col></v-row>
      <v-alert v-if="!form.handoverDate" type="info" class="mb-4">本登録には引渡日が必要です。未定の場合は下書きで保存し、確認後に本登録してください。</v-alert><v-alert v-if="dateChanged" type="warning" class="mb-4">引渡日訂正により、保証期間も {{ previewStart }} ～ {{ previewExpiry }} に変わります。訂正前の記録を残します。</v-alert>
      <v-checkbox v-if="dateChanged" v-model="confirmDates" :rules="[v=>v===true || '内容を確認してチェックしてください。']" label="変更後の保証期間を確認しました" /></v-form>
      <v-btn v-if="current?.history?.length" class="mt-4" variant="outlined" @click="historyDialog=true">手続き履歴を開く</v-btn></template>
      <WarrantyLifecycleDetails v-if="current?.warrantyNumber && (!noticeMode || ['report','billing'].includes(noticeMode))" :row="current" :show-billing="staff" :show-insurance="staff" :editable="!recoveryReadOnly && staff && current.status==='active' && (!noticeMode || noticeMode==='billing')" :busy="busy || catalogBusy" @billing="openBilling">
        <template v-if="!noticeMode && staff && current.status==='active'" #warranty-actions>
          <v-btn variant="outlined" :disabled="busy || catalogBusy" @click="confirmation='notify'">{{ noticeActionLabel }}</v-btn>
          <v-btn color="error" v-if="undoExtension" variant="outlined" :disabled="busy || catalogBusy" aria-label="直近の保証延長を取り消す" @click="confirmation='undoExtend'">延長取消</v-btn>
        </template>
        <template v-if="!noticeMode && current.status==='active'" #warranty-footer><v-btn variant="flat" color="primary" :disabled="busy || catalogBusy || !current.handoverDate || current.years>=current.maxYears" @click="confirmation='extend'">10年間延長</v-btn></template>
        <template v-if="!noticeMode && staff && current.status==='active' && current.insuranceLastReport" #insurance-actions><v-btn color="error" variant="outlined" :disabled="busy || catalogBusy" @click="confirmation='undoReport'">保険の報告済みを取り消す</v-btn></template>
      </WarrantyLifecycleDetails>
    </v-card-text><v-card-actions class="flex-wrap ga-2 pa-4"><v-btn variant="outlined" :disabled="busy || catalogBusy" @click="propertyDialog=false">閉じる</v-btn><v-spacer />
      <template v-if="noticeMode"><v-btn variant="flat" v-if="!recoveryReadOnly && noticeMode==='warranty' && staff && current?.status==='active'" color="primary" :disabled="busy" @click="confirmation='notify'">{{ noticeActionLabel }}</v-btn></template>
      <template v-else><template v-if="current?.status!=='cancelled'"><v-btn variant="flat" color="primary" :disabled="busy || catalogBusy || dateChanged && !confirmDates" @click="saveProperty('save')">{{ current?.status==='active'?'変更を保存':'下書き保存' }}</v-btn><v-btn v-if="current?.status!=='active'" color="primary" variant="flat" :disabled="busy || catalogBusy" @click="openRegistrationConfirmation">本登録・採番</v-btn></template><v-btn variant="flat" v-else-if="staff" color="primary" :disabled="busy || catalogBusy" @click="confirmation='restore'">HSで復元</v-btn>
    </template></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="historyDialog" max-width="950" scrollable><v-card><v-card-title>手続き履歴 — {{ current?.name }}</v-card-title><v-card-text><v-card v-for="h in [...(current?.history || [])].reverse()" :key="h.requestId" variant="outlined" class="mb-4"><v-card-text><p class="font-weight-bold">{{ operationLabel(h.kind) }}／{{ h.actorName || '担当者未記録' }}</p><p>操作日時：{{ new Date(h.at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}) }}</p><p v-if="h.reason">理由：{{ h.reason }}</p><p v-if="h.target">対象期間：{{ h.target.startDate }} ～ {{ h.target.expiryDate }}</p><p v-if="h.kind==='undoExtend'">取消対象の延長日：{{ current?.history?.find((event:Row)=>event.requestId===h.targetRequestId)?.date || '未記録' }}</p><template v-if="h.before"><h3 class="text-subtitle-1 mt-3">変更前の情報</h3><v-table density="compact"><tbody><tr v-for="field in historyFields" :key="field.key"><th>{{ field.label }}</th><td>{{ h.before[field.key] ?? '未記録' }}</td></tr></tbody></v-table></template><p v-else class="mt-3">新規作成のため変更前の情報はありません。</p></v-card-text></v-card></v-card-text><v-card-actions><v-spacer /><v-btn variant="outlined" @click="historyDialog=false">閉じる</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog :model-value="!!confirmation" max-width="720" persistent scrollable><v-card><v-card-title>{{ confirmation==='notify' && current?.warrantyNotified ? '保証満了案内を取り消す' : operationLabel(confirmation)+'の確認' }}</v-card-title><v-card-text><v-form ref="confirmationForm" @submit.prevent><template v-if="confirmation==='register'">
      <v-alert type="info" class="mb-4">申込日 {{ form.applicationDate || '未入力' }} を基準に保証番号を発行します。本登録後は申込日を変更できません。引渡日から10年間の保証を登録します。</v-alert>
      <v-card class="mb-4"><v-card-title>登録内容</v-card-title><v-card-text><dl class="notice-details">
        <dt>物件名</dt><dd>{{ form.name }}</dd>
        <dt>施主名</dt><dd>{{ form.ownerName }}</dd>
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
</template><p v-if="confirmation==='extend'">保存済みの保証を10年間延長します。番号は変わりません。変更後満了日：{{ extensionExpiry }}。フォームの未保存の変更は含まれません。</p><template v-if="confirmation==='undoExtend' && undoExtension"><v-alert v-if="undoExtension.blockers.length" type="warning" class="mb-4"><p v-for="message in undoExtension.blockers" :key="message">{{ extensionBlockerLabel(message) }}</p></v-alert>
  <p class="text-subtitle-1 mb-3">{{ current?.warrantyNumber }}／{{ current?.name }}</p><p class="mb-3">取消対象：{{ undoExtension.targetDate }}の10年間延長</p>
  <v-table class="mb-4"><thead><tr><th>変更項目</th><th>現在</th><th>取消後</th></tr></thead><tbody>
    <tr><th>保証年数</th><td>{{ current?.years }}年</td><td>{{ undoExtension.years }}年</td></tr>
    <tr><th>保証満了日</th><td>{{ current?.expiryDate }}</td><td>{{ undoExtension.expiryDate }}</td></tr>
  </tbody></v-table>
  <v-card variant="tonal" class="mb-4"><v-card-text><p class="font-weight-bold mb-2">変更されない情報</p><p>保証番号・手続き履歴を保持します。</p><p>保険期間：{{ current?.insuranceStartDate }} ～ {{ current?.insuranceExpiryDate }}</p><p>保険報告状態：{{ current?.insuranceReported ? '報告済み' : '未報告' }}（変更なし）</p></v-card-text></v-card>
  <p class="mb-4">この延長は請求用一覧から除外します。編集画面の未保存の変更は含みません。</p>
  <v-alert type="warning" title="HSで必要な対応">保険会社・施主等への訂正連絡、交付済み保証書・出力済みCSVや請求書の訂正は別途行ってください。</v-alert>
</template><template v-if="confirmation==='cancel' && current"><v-alert type="warning" class="mb-4">物件・保証全体を取消し状態にします。保険会社への報告、請求、保証更新案内の履歴は保持されますが、保険会社への取消し報告、請求の訂正は行われません。</v-alert><WarrantyLifecycleDetails :row="current" /><v-checkbox v-model="confirmCancellation" :rules="[v=>v===true || '取消の影響を確認してください。']" label="報告・延長・請求の内容と、HSで必要な対外対応を確認しました" /></template><p v-if="confirmation==='restore'">同じ保証番号・保証期間・報告・請求状態で復元します。外部で既に訂正した内容と一致するかHSで確認してください。</p><template v-if="['bill','undoBill','confirmUnbilled'].includes(confirmation) && billingTarget"><p class="mb-3">{{ current?.name }}／{{ billingTarget.label }}：{{ billingTarget.startDate }} ～ {{ billingTarget.expiryDate }}</p><p>{{ confirmation==='bill' ? 'この保証期間を請求済みにします。' : confirmation==='undoBill' ? 'この保証期間の請求済みを取り消し、未請求へ戻します。' : 'HSで確認した結果、この保証期間を未請求として登録します。' }}</p><v-alert type="warning" class="mt-4">請求書は作成・送信・訂正されません。実際の請求内容との整合はHSで確認してください。</v-alert></template><v-textarea v-if="['cancel','restore','undoExtend','undoBill'].includes(confirmation)" v-model="reason" :rules="requiredRules" label="理由（必須）" class="mt-4" /><v-alert v-if="errors.confirmation" type="error" class="mt-4">{{ errors.confirmation }}</v-alert></v-form></v-card-text><v-card-actions class="flex-wrap"><v-btn variant="outlined" :disabled="busy" @click="confirmation='';reason=''">戻る</v-btn><v-spacer /><v-btn variant="flat" color="primary" :disabled="busy || confirmation==='cancel' && !confirmCancellation || confirmation==='undoExtend' && !!undoExtension?.blockers.length || confirmation==='register' && (!confirmRegistration || registrationWarnings.length>0 && !confirmWarnings)" @click="performConfirmed">実行する</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="settingDialog" max-width="650" persistent scrollable><v-card><v-card-title>{{ settingTitle }}</v-card-title><v-card-text><v-form ref="settingForm" @submit.prevent><v-alert v-if="errors.setting" type="error" class="mb-4">{{ errors.setting }}</v-alert><v-text-field v-model="setting.name" :rules="requiredRules" required label="名称" /><template v-if="settingAction==='saveCompany'"><v-select v-model="setting.defaultGroupId" :rules="requiredRules" required :items="assignableGroups" item-title="name" item-value="id" label="所属保証グループ" /><MasterAddressFields v-model="setting.address" postal-optional lookup-subject="constructionCompany" :postal-lookup-provider="hostedPostalLookupProvider" /><v-text-field v-model="setting.telephone" :rules="[phoneRule]" label="電話番号" /><v-text-field v-model="setting.fax" :rules="[phoneRule]" label="FAX" /><v-text-field v-model="setting.contactPerson" :rules="optionalRules" label="窓口担当者" /></template><template v-if="settingAction==='saveBranch'"><v-select v-model="setting.constructionCompanyId" :rules="requiredRules" required :items="companies" item-title="name" item-value="id" label="所属工務店" :disabled="!!setting.id" /><v-text-field v-model="setting.branchCode" :rules="[branchCodeRule]" label="支店コード（任意）" hint="同じ工務店内で重複不可。変更後のコードを今後の取込みに使います。" persistent-hint /><MasterAddressFields v-model="setting.address" postal-optional address-optional lookup-subject="constructionCompany" :postal-lookup-provider="hostedPostalLookupProvider" /><v-text-field v-model="setting.telephone" :rules="[phoneRule]" label="電話番号" /><v-text-field v-model="setting.fax" :rules="[phoneRule]" label="FAX" /><v-alert type="info" class="mb-4">所属保証グループ：{{ settingGroupName }}。接頭辞は所属工務店と共通です。支店では変更できません。</v-alert></template><template v-if="['saveCompany','saveBranch'].includes(settingAction)"><v-switch v-model="setting.enabled" color="primary" label="有効（無効にすると新規物件の登録を停止）" /><p class="mb-3">既存保証はHSが引き続き処理できます。{{ settingAction==='saveCompany' ? '工務店の無効化は全支店に適用します。再有効化しても個別に無効化した支店は復活しません。' : '工務店自体が無効の場合は、この支店を有効にしても新規登録は停止したままです。' }}</p></template><template v-if="settingAction==='saveGroup'"><v-text-field v-model="setting.prefix" :rules="[prefixRule]" :disabled="!!setting.id" label="番号接頭辞（例：HSC／接頭辞なしは空欄）" hint="接頭辞と年度の間のハイフンは自動で付きます。" persistent-hint /><v-select v-model="setting.fiscalStartMonth" :rules="[v=>Number.isInteger(Number(v)) && Number(v)>=1 && Number(v)<=12 || '1〜12月を選択してください。']" required :disabled="!!setting.id" :items="Array.from({length:12},(_,i)=>i+1)" label="年度開始月" /><p>保証書はHSがCSVからWordで差し込み印刷します。差し込み項目は受領待ちです。登録後の接頭辞・年度開始月は変更できません。無効化しても接頭辞は再利用できません。既存保証の閲覧・延長は継続できます。</p><v-switch v-model="setting.enabled" color="primary" label="有効（無効にすると新しい割当・本登録を停止）" /></template></v-form></v-card-text><v-card-actions class="flex-wrap"><v-btn variant="outlined" :disabled="busy" @click="settingDialog=false">閉じる</v-btn><v-spacer /><v-btn variant="flat" color="primary" :disabled="busy" @click="saveSetting">保存</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog v-model="accountDialog" max-width="600" persistent><v-card><v-card-title>工務店担当者を追加</v-card-title><v-card-text><v-form ref="accountForm" @submit.prevent><v-alert v-if="errors.account" type="error" class="mb-4">{{ errors.account }}</v-alert><v-progress-linear v-if="catalogBusy" indeterminate class="mb-3" /><v-alert v-if="catalogError" type="error" class="mb-4">{{ catalogError }}</v-alert><CompanyAutocomplete v-model="account.constructionCompanyId" :items="propertyCompanies" :fetch-options="fetchCompanyOptions" :active="accountDialog" required :disabled="busy || catalogBusy || accountCreated" @select="chooseAccountCompany" /><v-text-field v-model="account.displayName" :rules="requiredRules" label="担当者名" /><v-text-field v-model="account.email" :rules="[requiredRule,emailRule]" type="email" label="メールアドレス" /><v-select v-model="account.scope" :rules="[requiredRule]" :items="[{title:'本店の全店担当（自社全店）',value:'company'},{title:'支店担当（所属支店のみ）',value:'branch'}]" label="操作範囲" /><v-select v-if="account.scope==='branch'" v-model="account.branchId" :rules="requiredRules" :items="dialogBranches.filter(b=>b.constructionCompanyId===account.constructionCompanyId)" :item-title="branchOptionLabel" item-value="id" label="所属支店" /><p>作成後にパスワード設定メールを送ります。本人がパスワードを設定します。</p></v-form></v-card-text><v-card-actions class="flex-wrap"><v-btn variant="outlined" :disabled="busy || catalogBusy" @click="accountDialog=false">閉じる</v-btn><v-spacer /><v-btn variant="flat" color="primary" :disabled="busy || catalogBusy || accountCreated" @click="createAccount">作成・設定メール送信</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog v-model="reportConfirm" max-width="600" persistent><v-card title="実際に報告した物件の確認"><v-card-text><p>{{ filter.month }}分・{{ selectedRows.length }}件。CSV出力だけでは報告は完了しません。保険会社に提出した物件であることを確認してください。更新分は次の5年間へ進めます。</p><p v-for="r in selectedRows" :key="r.id">{{ r.warrantyNumber }}／{{ r.name }} — {{ reportLabel(r.reportKind) }}・報告対象期間 {{ r.reportTarget?.startDate }} ～ {{ r.reportTarget?.expiryDate }}／{{ r.reportTarget?.warrantyPeriodLabel }}（保証：{{ r.reportTarget?.warrantyStartDate }} ～ {{ r.reportTarget?.warrantyExpiryDate }}）</p><v-alert v-if="errors.report" type="error">{{ errors.report }}</v-alert></v-card-text><v-card-actions><v-btn variant="outlined" :disabled="busy" @click="reportConfirm=false">戻る</v-btn><v-btn variant="flat" color="primary" :disabled="busy || reportDirty || !selectedRows.length" @click="markReports">報告済みにする</v-btn></v-card-actions></v-card></v-dialog>
    <PropertyBulkImportDialog v-if="staff" v-model="bulkImportDialog" :groups="bulkImportGroups" :project-id="String($firebase.auth.app.options.projectId || '')" :actor-uid="profile?.uid || ''" :fetch-companies="fetchBulkCompanies" :invoke="invokeBulkImport" @download-template="downloadBulkTemplate" @completed="bulkImportCompleted" />
  </v-container></v-main>
</template>

<script setup lang="ts">
import { createReferenceFetchCache, referenceFetchKey } from '../../src/domain/reference-fetch-cache.mjs'
import { nextInsuranceReportLabel } from '../utils/insuranceReportDisplay.mjs'
import { latestInsuranceReport, handoverChangeBlockers } from "../../src/domain/property-warranty.mjs"
import { requiredRule, requiredRules, optionalRules, postalRule, phoneRule, emailRule, prefixRule, areaRule, dateRule, monthRule, yearRule } from '../../src/domain/input-rules.mjs'
import { httpsCallable } from 'firebase/functions'
import { recoveryRuntime, withRuntimeGeneration } from '../utils/recoveryClient'
import { sendPasswordResetEmail } from 'firebase/auth'
import { hostedPostalLookupProvider } from '../../src/domain/hosted-postal-lookup.mjs'
import { coveragePeriods, csvCell, japanDate, normalizeWarrantyPrefix, extensionUndoPreview, propertyAddress } from '../../src/domain/property-warranty.mjs'
import { createBulkImportTemplate } from '../../src/domain/property-bulk-import.mjs'
// Callable records are validated by the trusted command; the view keeps flexible display records.
type Row = Record<string, any>
const { $firebase } = useNuxtApp()
const { profile, logout: sessionLogout } = useSession()
async function logout(){referenceCache.clear();await sessionLogout()}
const staff = computed(()=>profile.value?.accountType==='staff')
const manager = computed(()=>staff.value && ['developer_superuser','house_solution_administrator'].includes(profile.value?.role ?? ''))
const companyBranchOnly = computed(()=>profile.value?.accountType==='construction_company' && profile.value.scope==='branch')
const tab = ref('properties'), busy = ref(false)
const bulkImportDialog=ref(false)
const recoveryReadOnly = computed(()=>recoveryRuntime.value.phase==='verification')
const errors=reactive({page:'',property:'',confirmation:'',setting:'',account:'',report:''})
const { showValidationError, showSnackbar } = useAppSnackbar()
const errorScope=()=>confirmation.value ? 'confirmation' : propertyDialog.value ? 'property' : settingDialog.value ? 'setting' : accountDialog.value ? 'account' : reportConfirm.value ? 'report' : 'page'
const error=computed({get:()=>errors[errorScope()],set:(value:string)=>{errors[errorScope()]=value}})
type Validatable={validate:()=>Promise<{valid:boolean}>}
const propertyForm=ref<Validatable|null>(null),settingForm=ref<Validatable|null>(null),accountForm=ref<Validatable|null>(null),confirmationForm=ref<Validatable|null>(null),searchForm=ref<Validatable|null>(null),alertsForm=ref<Validatable|null>(null)
const propertyFormal=ref(false)
async function validate(view:Validatable|null){const scope=errorScope();const valid=!!view && (await view.validate()).valid;if(!valid && scope===errorScope())showValidationError();return valid}
async function validateProperty(formal:boolean){propertyFormal.value=formal;await nextTick();return validate(propertyForm.value)}
const companies = ref<Row[]>([]), branches = ref<Row[]>([]), groups = ref<Row[]>([]), accounts = ref<Row[]>([]), rows = ref<Row[]>([]), limited = ref(true)
const bulkImportGroups=computed(()=>groups.value.map(group=>({id:String(group.id),name:String(group.name),enabled:group.enabled!==false})))
const accountSearch=ref(''),accountPage=ref(1)
const accountRows=computed(()=>{const term=(accountSearch.value || '').trim();return term ? accounts.value.filter(a=>[a.displayName,a.email,companyName(a.constructionCompanyId)].join(' ').includes(term)) : accounts.value.slice(0,20)})
watch(accountSearch,()=>accountPage.value=1)
const page=ref(1)
const visibleRows=computed(()=>rows.value.slice((page.value-1)*20,page.value*20))
const selectedGroupId=ref(''), selectedCompanyId=ref('')
const alertSettings=reactive({warrantyMonths:2,insuranceMonths:2})
const monthOptions=Array.from({length:12},(_,i)=>({title:`${i+1}か月前`,value:i+1}))
const saveAlertSettings=async()=>{if(!await validate(alertsForm.value))return;await run(async()=>{Object.assign(alertSettings,await call('saveAlertSettings',{settings:{...alertSettings}}));referenceCache.clear();showSnackbar('アラート設定を保存しました。','success')})}
const emptyFilter = ()=>({month:japanDate().slice(0,7),notification:'pending',warrantyNumber:'',applicationFrom:'',applicationTo:'',handoverFrom:'',handoverTo:'',handoverMissing:'',search:'',companyId:'',branchId:'',groupId:'',fiscalYear:'',status:'',from:'',to:'',includeCancelled:false})
const filter = reactive(emptyFilter()), reportKey = ref('')
const appliedPropertyFilters=computed(()=>{
 const applied=reportKey.value ? JSON.parse(reportKey.value) : {}
 return applied.warrantyNumber ? [{key:'warrantyNumber',label:`保証番号：${applied.warrantyNumber}`}] : []
})
async function removePropertyFilter(key:string){Object.assign(filter,JSON.parse(reportKey.value),{[key]:''});await loadRows()}
const reportDirty = computed(()=>reportKey.value!==JSON.stringify(filter))
const statuses = [{title:'下書き',value:'draft'},{title:'本登録',value:'active'},{title:'取消済み',value:'cancelled'}]
const statusLabel = (status:string)=>statuses.find(s=>s.value===status)?.title ?? status
const operationLabel = (action:string)=>({save:'保存・訂正',register:'本登録',extend:'10年間延長',undoExtend:'保証延長取消',cancel:'取消',restore:'復元',notify:'保証満了案内の状態変更',undoReport:'報告済み取消',report:'保険報告済み',bill:'請求済み',undoBill:'請求済み取消',confirmUnbilled:'未請求の確認'}[action] ?? action)
const companyName = (id:string)=>companies.value.find(c=>c.id===id)?.name ?? id
const branchName = (id:string)=>branches.value.find(c=>c.id===id)?.name ?? (id || '本店')
const branchOptionLabel=(branch:Row)=>branch.branchCode ? `${branch.name}（${branch.branchCode}）` : String(branch.name ?? '')
const branchCodeRule=(value:unknown)=>String(value ?? '').trim().length<=200 || '支店コードは200文字以内で入力してください。'
const call = async (action:string, data:Row={})=>(await httpsCallable<Row,Row>($firebase.functions,'propertyPrototype')(withRuntimeGeneration({action,...data}))).data
async function run(fn:()=>Promise<void>) { if(busy.value) return; busy.value=true;const scope=errorScope();errors[scope]='';try{await fn()}catch(e){errors[scope]=e instanceof Error?e.message:'操作に失敗しました。'}finally{busy.value=false} }
const referenceCache=createReferenceFetchCache()
const referenceScope=computed(()=>({uid:profile.value?.uid ?? '',role:profile.value?.role ?? '',type:profile.value?.accountType ?? '',company:profile.value?.accountType==='construction_company' ? profile.value.constructionCompanyId : '',branch:profile.value?.accountType==='construction_company' ? profile.value.branchId : '',scope:profile.value?.accountType==='construction_company' ? profile.value.scope : ''}))
watch(()=>JSON.stringify(referenceScope.value),()=>referenceCache.clear(),{flush:'sync'})
onUnmounted(()=>referenceCache.clear())
const fetchReference=(action:string,conditions:Row={},force=false):Promise<Row>=>referenceCache.get(referenceFetchKey(referenceScope.value,action,conditions),()=>call(action,conditions),{force})
async function openBulkImport(){if(!staff.value || recoveryReadOnly.value)return;await run(loadCatalog);if(!errors.page)bulkImportDialog.value=true}
async function fetchBulkCompanies(groupId:string,search:string){const data=await fetchReference('catalog',{groupId,search,purpose:'companyOptions'});return data.companies.filter((company:Row)=>company.defaultGroupId===groupId && company.enabled!==false)}
async function bulkImportCompleted(){showSnackbar('一括取込みが完了しました。','success');await run(fetchRows)}
const invokeBulkImport=async(data:Row)=>(await httpsCallable<Row,Row>($firebase.functions,'propertyBulkImport')(withRuntimeGeneration(data))).data
function downloadBulkTemplate(){const url=URL.createObjectURL(new Blob([createBulkImportTemplate()],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='物件保証一括取込テンプレート.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function loadCatalog(force=false){
  if(force)referenceCache.clear()
  Object.assign(alertSettings,await fetchReference('alertSettings',{},force))
  const selection=tab.value==='settings' ? {...(selectedGroupId.value ? {groupId:selectedGroupId.value} : {}),...(selectedCompanyId.value ? {companyId:selectedCompanyId.value} : {})} : {}
  const data=await fetchReference('catalog',selection,force)
  companies.value=data.companies;branches.value=data.branches;groups.value=data.groups
  if(tab.value==='settings' && selectedCompanyId.value && !companies.value.some(c=>c.id===selectedCompanyId.value && c.defaultGroupId===selectedGroupId.value))selectedCompanyId.value=''
}
const selectGroup=(id:string)=>run(async()=>{selectedGroupId.value=id;selectedCompanyId.value='';companies.value=[];branches.value=[];await loadCatalog()})
const selectCompany=(id:string)=>run(async()=>{selectedCompanyId.value=id;branches.value=[];await loadCatalog()})
async function fetchRows(){ const submittedFilter={...filter};const f:Row=tab.value==='report' ? {reportMonth:submittedFilter.month} : tab.value==='alerts' ? {alertKind:'warranty',notification:'pending'} : tab.value==='insuranceAlerts' ? {alertKind:'insurance'} : tab.value==='properties' ? {warrantyNumber:submittedFilter.warrantyNumber ?? ''} : {...submittedFilter};if(tab.value==='billing')f.billingMonth=submittedFilter.month;const result=await call(tab.value==='properties' ? 'propertyList' : 'list',{filter:f});rows.value=result.rows;selectedKeys.value=[];page.value=1;limited.value=result.limited;reportKey.value=JSON.stringify(submittedFilter) }
const loadRows=async()=>{if(!await validate(searchForm.value))return;await run(fetchRows)}
async function clearFilter(){if(busy.value)return;Object.assign(filter,emptyFilter());await loadRows()}
watch(tab,async()=>{error.value='';Object.assign(filter,emptyFilter());rows.value=[];await run(async()=>{await loadCatalog();if(['properties','alerts','insuranceAlerts','report','billing'].includes(tab.value))await fetchRows();if(tab.value==='accounts')accounts.value=(await call('accounts')).accounts})})
onMounted(()=>run(async()=>{await loadCatalog();await fetchRows()}))
const confirmWarnings=ref(false),confirmRegistration=ref(false),registrationWarnings=ref<string[]>([])
async function openRegistrationConfirmation(){if(!await validateProperty(true))return;confirmRegistration.value=false;confirmWarnings.value=false;registrationWarnings.value=[];error.value='';confirmation.value='register'}
const propertyDialog=ref(false),current=ref<Row|null>(null),confirmation=ref(''),reason=ref(''),confirmDates=ref(false)
const historyDialog=ref(false),confirmCancellation=ref(false)
function extensionBlockerLabel(message:string){
  return ({
    'この延長の請求済みを先に取り消してください。':'請求済みの状態を先に取り消す必要があります。',
    'この延長区間にかかる保険報告を先に取り消してください。':'保険報告済みの状態を先に取り消す必要があります。',
    '現在の満了案内を先に未案内に戻してください。':'保証更新案内済みの状態を先に取り消す必要があります。',
  } as Record<string,string>)[message] || message.replaceAll('区間','期間')
}
const noticeActionLabel=computed(()=>current.value?.warrantyNotified ? '未案内に戻す' : '案内済みにする')
const noticeMode=ref<''|'warranty'|'insurance'|'report'|'billing'>('')
const detailTitle=computed(()=>recoveryReadOnly.value ? '復旧後の物件・保証確認' : ({warranty:'保証満了案内',insurance:'保険満了案内',report:'保険報告の物件情報',billing:'請求対象の物件情報'}[noticeMode.value || 'warranty']))
const historyFields=[{key:'applicationDate',label:'申込日'},{key:'handoverDate',label:'引渡日'},{key:'startDate',label:'保証開始日'},{key:'expiryDate',label:'保証満了日'},{key:'ownerName',label:'施主名'},{key:'ownerTelephone',label:'施主電話番号'},{key:'years',label:'保証期間（年）'},{key:'maxYears',label:'最長保証期間（年）'}]
const maxYearsOptions=computed(()=>[10,20,30].map(value=>({title:String(value),value,props:{disabled:value<Number(current.value?.years || 0)}})))
function maxYearsRule(value:unknown){return [10,20,30].includes(Number(value)) ? Number(value)>=Number(current.value?.years || 0) || '延長済みの保証期間より短い上限にはできません。' : '10年・20年・30年を選択してください。'}
watch(propertyDialog,value=>{if(!value)historyDialog.value=false})
const emptyAddress=()=>({postalCode:'',prefecture:'',municipality:'',streetTownAndNumber:'',buildingName:''})
const emptyPropertyAddress=()=>({postalCode:'',address:'',buildingName:''})
const form=ref<Row & ReturnType<typeof emptyPropertyAddress>>({...emptyPropertyAddress()})
const propertyId=ref(''),requestId=ref('')
const propertyCompanies=computed(()=>dialogCompanies.value.map(c=>({...c,id:String(c.id),name:String(c.name)})))
const formBranches=computed(()=>dialogBranches.value.filter(b=>b.constructionCompanyId===form.value.constructionCompanyId && (!!current.value || b.enabled!==false)))
async function newProperty(){noticeMode.value='';await run(loadCatalog);if(error.value)return;resetDialogCatalog();propertyFormal.value=false;errors.property='';error.value='';confirmWarnings.value=false;current.value=null;propertyId.value=crypto.randomUUID();requestId.value=crypto.randomUUID();form.value={...emptyPropertyAddress(),name:'',ownerName:'',ownerTelephone:'',buildingArea:'',applicationDate:japanDate(),handoverDate:'',maxYears:20,foundationInsulation:false,insulationMaterials:'',notes:'',constructionCompanyId:profile.value?.accountType==='construction_company'?profile.value.constructionCompanyId:'',branchId:profile.value?.accountType==='construction_company'?profile.value.branchId ?? '':''};confirmDates.value=false;propertyDialog.value=true}
async function openProperty(id:string){noticeMode.value=recoveryReadOnly.value ? 'report' : tab.value==='alerts' ? 'warranty' : tab.value==='insuranceAlerts' ? 'insurance' : tab.value==='report' ? 'report' : tab.value==='billing' ? 'billing' : '';await run(async()=>{await loadCatalog();resetDialogCatalog();const row=await call('detail',{id});await companyBranches(row.constructionCompanyId);if(!dialogCompanies.value.some(c=>c.id===row.constructionCompanyId))dialogCompanies.value.push({id:row.constructionCompanyId,name:row.companyLabel});current.value=row;propertyFormal.value=row.status==='active';errors.property='';propertyId.value=id;form.value={...emptyPropertyAddress(),...row,address:propertyAddress(row),applicationDate:row.applicationDate || (row.status==='draft' ? japanDate() : '')};requestId.value=crypto.randomUUID();confirmDates.value=false;propertyDialog.value=true})}
const dateChanged=computed(()=>current.value?.status==='active' && current.value.handoverDate!==form.value.handoverDate)
const formatMonth=(value:string)=>/^\d{6}$/.test(value || '') ? `${value.slice(0,4)}年${value.slice(4,6)}月` : '要確認'
function insuranceRenewalLabel(row:Row){return nextInsuranceReportLabel(row)}
const previewStart=computed(()=>form.value.handoverDate || '未入力')
const previewExpiry=computed(()=>{try{return coveragePeriods(form.value.handoverDate,current.value?.years || 10).at(-1)?.expiryDate}catch{return '日付を確認してください'}})
const handoverBlockers=computed(()=>handoverChangeBlockers(current.value))
const billingTarget=ref<Row|null>(null)
function openBilling(action:string,period:Row){billingTarget.value=period;confirmation.value=action}
const undoExtension=computed(()=>current.value ? extensionUndoPreview(current.value) : null)
const extensionExpiry=computed(()=>{try{return coveragePeriods(current.value?.handoverDate,current.value?.years+10).at(-1)?.expiryDate}catch{return ''}})
watch(()=>form.value.handoverDate,()=>confirmDates.value=false)
async function saveProperty(action:string){if(noticeMode.value && (!(noticeMode.value==='warranty' && action==='notify') && !(noticeMode.value==='billing' && ['bill','undoBill','confirmUnbilled'].includes(action))))return;if(['save','register'].includes(action) && !await validateProperty(action==='register' || current.value?.status==='active'))return;await run(async()=>{try{await call(action,{id:propertyId.value,requestId:requestId.value,revision:current.value?.revision ?? 0,fields:JSON.parse(JSON.stringify(form.value)),confirmDates:confirmDates.value,confirmRegistration:confirmRegistration.value,confirmWarnings:confirmWarnings.value,notified:!current.value?.warrantyNotified,targetRequestId:undoExtension.value?.targetRequestId,targetReportId:current.value ? latestInsuranceReport(current.value)?.requestId : undefined,warrantyPeriodId:billingTarget.value?.id,startDate:billingTarget.value?.startDate,expiryDate:billingTarget.value?.expiryDate,confirmCancellation:confirmCancellation.value,reason:reason.value})}catch(e){const warnings=(e as {details?:{registrationWarnings?:unknown}})?.details?.registrationWarnings;if(action==='register' && Array.isArray(warnings)){registrationWarnings.value=warnings.filter((v):v is string=>typeof v==='string');confirmWarnings.value=false}throw e}current.value=await call('detail',{id:propertyId.value});form.value={...emptyPropertyAddress(),...current.value,address:propertyAddress(current.value)};requestId.value=crypto.randomUUID();confirmDates.value=false;confirmation.value='';reason.value='';showSnackbar('保存しました。','success');if(action==='register' || action==='save' && current.value?.status==='draft')propertyDialog.value=false;await fetchRows()})}
async function performConfirmed(){if(!await validate(confirmationForm.value))return;await saveProperty(confirmation.value)}
const settingDialog=ref(false),settingAction=ref('saveCompany'),setting=ref<Row>({})
const settingSections=computed(()=>[{title:'工務店',action:'saveCompany',items:companies.value},{title:'工務店の支店',action:'saveBranch',items:branches.value},{title:'保証グループ',action:'saveGroup',items:groups.value}])
const assignableGroups=computed(()=>groups.value.filter(g=>g.enabled!==false || g.id===setting.value.defaultGroupId).map(g=>({...g,name:g.name+(g.enabled===false?'（無効）':''),props:{disabled:g.enabled===false}})))
const settingTitle=computed(()=>settingSections.value.find(s=>s.action===settingAction.value)?.title)
const settingGroupName=computed(()=>groups.value.find(g=>g.id===companies.value.find(c=>c.id===setting.value.constructionCompanyId)?.defaultGroupId)?.name ?? '未設定')
function openSetting(action:string,item:Row={}){
  errors.setting='';settingAction.value=action
  setting.value={address:emptyAddress(),name:'',branchCode:'',defaultGroupId:selectedGroupId.value,constructionCompanyId:selectedCompanyId.value,prefix:'',fiscalStartMonth:1,enabled:true,...JSON.parse(JSON.stringify(item))}
  if(action==='saveGroup')setting.value.prefix=normalizeWarrantyPrefix(setting.value.prefix)
  delete setting.value.groupId // Legacy branch overrides are never submitted or used.
  settingDialog.value=true
}
async function saveSetting(){if(!await validate(settingForm.value))return;await run(async()=>{
  const result=await call(settingAction.value,setting.value)
  referenceCache.clear()
  if(settingAction.value==='saveGroup'){selectedGroupId.value=result.id;selectedCompanyId.value=''}
  if(settingAction.value==='saveCompany'){selectedGroupId.value=setting.value.defaultGroupId;selectedCompanyId.value=result.id}
  await loadCatalog();settingDialog.value=false;showSnackbar('設定を保存しました。','success')
})}
const accountDialog=ref(false),account=ref<Row>({}),accountCreated=ref(false)
async function openAccount(){await run(loadCatalog);if(error.value)return;resetDialogCatalog();errors.account='';accountCreated.value=false;account.value={constructionCompanyId:'',branchId:'',scope:'company',displayName:'',email:''};accountDialog.value=true}
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
function resetDialogCatalog(){catalogError.value='';dialogCompanies.value=[...companies.value];dialogBranches.value=[...branches.value]}
async function runCatalog(fn:()=>Promise<void>){if(catalogBusy.value)return;catalogBusy.value=true;catalogError.value='';try{await fn()}catch(e){catalogError.value=e instanceof Error?e.message:'候補の取得に失敗しました。'}finally{catalogBusy.value=false}}
async function fetchCompanyOptions(search:string){const data=await fetchReference('catalog',{search,purpose:'companyOptions'});return data.companies.filter((c:Row)=>c.enabled!==false && data.groups.some((g:Row)=>g.id===c.defaultGroupId && g.enabled!==false))}
function rememberCompany(row:Row|null){if(row && !dialogCompanies.value.some(c=>c.id===row.id))dialogCompanies.value.push(row)}
function choosePropertyCompany(row:Row|null){rememberCompany(row);selectPropertyCompany(row?.id || '')}
function chooseAccountCompany(row:Row|null){rememberCompany(row);selectAccountCompany(row?.id || '')}
async function companyBranches(id:string){dialogBranches.value=[];if(!id)return;const data=await fetchReference('catalog',staff.value ? {companyId:id} : {});dialogBranches.value=data.branches}
const selectPropertyCompany=(id:string)=>{form.value.branchId='';if(!id){dialogBranches.value=[];return}void runCatalog(()=>companyBranches(id))}
const selectAccountCompany=(id:string)=>{account.value.branchId='';if(!id){dialogBranches.value=[];return}void runCatalog(()=>companyBranches(id))}
const selectedKeys=ref<string[]>([]),reportConfirm=ref(false)
const rowKey=(r:Row)=>[r.id,r.billingKind || '',r.billingDate || '',r.billingEventId || ''].join(':')
const selectableRows=computed(()=>rows.value.filter(r=>r.reportKind!=='review'))
const allSelected=computed(()=>selectableRows.value.length>0 && selectableRows.value.every(r=>selectedKeys.value.includes(rowKey(r))))
function toggleAll(value:unknown){if(busy.value || reportDirty.value)return;selectedKeys.value=value ? selectableRows.value.map(rowKey) : []}
const selectedRows=computed(()=>rows.value.filter(r=>selectedKeys.value.includes(rowKey(r)) && r.reportKind!=='review'))
const billingLabel=(state:string)=>({pending:'未請求',billed:'請求済み',unknown:'要確認'}[state] || '要確認')
const reportLabel=(kind:string)=>({new:'新規',renewal:'更新','past-new':'過去の未処理分（新規）','past-renewal':'過去の未処理分（更新）',review:'保険期間の個別確認が必要'}[kind] || kind)
const reportRequests=new Map<string,string>()
async function markReports(){if(busy.value || reportDirty.value)return;if(!selectedRows.value.length){errors.report='報告する物件を選択してください。';return}await run(async()=>{
  const selected:Row[]=selectedRows.value.map(r=>({...r,reportTarget:r.reportTarget ? {...r.reportTarget} : undefined}));const reportMonth=filter.month,completed=new Set<string>()
  let reportFailure:unknown,refreshFailure:unknown
  try {
    for(const r of selected){const key=`${r.id}:${r.revision}:${reportMonth}`;if(!reportRequests.has(key))reportRequests.set(key,crypto.randomUUID());await call('report',{id:r.id,revision:r.revision,requestId:reportRequests.get(key),month:reportMonth,reportTarget:r.reportTarget});completed.add(rowKey(r))}
  } catch(e){reportFailure=e}
  try{await fetchRows()}catch(e){refreshFailure=e}
  if(reportFailure){selectedKeys.value=selected.filter(r=>!completed.has(rowKey(r)) && rows.value.some(row=>rowKey(row)===rowKey(r) && row.revision===r.revision && JSON.stringify(row.reportTarget)===JSON.stringify(r.reportTarget))).map(rowKey);const message=reportFailure instanceof Error ? reportFailure.message : '報告済みの更新に失敗しました。';throw new Error(message+(refreshFailure ? ' 一覧も更新できませんでした。保存結果を確認して再試行してください。' : ' 未完了の選択分を確認して再試行してください。表示が変わった物件は選択を解除しました。「戻る」から一覧を確認し、選択し直してください。'))}
  selectedKeys.value=[];reportConfirm.value=false;showSnackbar('選択分を報告済みにしました。','success')
  if(refreshFailure)errors.page='報告済みの更新は完了しましたが、一覧を更新できませんでした。再抽出してください。'
})}
watch(confirmation,()=>{errors.confirmation='';confirmCancellation.value=false;reason.value='';requestId.value=crypto.randomUUID()})
watch(reportConfirm,()=>{errors.report=''})
function exportCsv(){
  const insurance=tab.value==='report'
  const headers=insurance ? ['対象月','物件名','住所','工務店名','引渡日','建面積','保険申込'] : ['手続き','請求対象基準日','工務店','支店','保証番号','物件名','申込日','引渡日','請求対象保証開始日','請求対象保証満了日','請求状態']
  const data=selectedRows.value.map(r=>insurance ? [filter.month,r.name,[propertyAddress(r),r.buildingName].join(''),r.companyLabel || companyName(r.constructionCompanyId),r.handoverDate,r.buildingArea,''] : [r.billingKind,r.billingDate,r.companyLabel,r.branchLabel,r.warrantyNumber,r.name,r.applicationDate,r.handoverDate,r.billingStartDate,r.billingExpiryDate,r.billingState==='billed' ? '請求済み' : r.billingState==='pending' ? '未請求' : '要確認'])
  const blob=new Blob(['\uFEFF'+[headers,...data].map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${insurance?'保険報告':'請求用一覧'}_${filter.month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
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

