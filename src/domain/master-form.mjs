const emptyAddress = () => ({
  postalCode: '',
  prefecture: '',
  municipality: '',
  streetTownAndNumber: '',
  buildingName: '',
})

const editableAddress = (address) => ({
  postalCode: address?.postalCode ?? '',
  prefecture: address?.prefecture ?? '',
  municipality: address?.municipality ?? '',
  streetTownAndNumber: address?.streetTownAndNumber ?? '',
  buildingName: address?.buildingName ?? '',
})

const nullable = (value) => value || null

export function createMasterFormDraft(masterType, row = null) {
  const name = row?.name ?? ''
  if (masterType === 'warrantyService') {
    return { masterType, name, defaultPeriodYears: row?.defaultPeriodYears ?? 1 }
  }
  if (masterType === 'property') {
    return {
      masterType,
      name,
      homeownerId: row?.homeownerId ?? '',
      constructionCompanyId: row?.constructionCompanyId ?? '',
      address: row ? editableAddress(row.address) : emptyAddress(),
    }
  }
  if (masterType === 'constructionCompany') {
    return {
      masterType,
      name,
      address: row ? editableAddress(row.address) : emptyAddress(),
      telephone: row?.telephone ?? '',
      fax: row?.fax ?? '',
      contactPerson: row?.contactPerson ?? '',
      contactDetails: row?.contactDetails ?? '',
      email: row?.email ?? '',
      notes: row?.notes ?? '',
    }
  }
  if (masterType === 'homeowner') {
    return {
      masterType,
      name,
      address: row ? editableAddress(row.address) : emptyAddress(),
      telephone: row?.telephone ?? '',
      fax: row?.fax ?? '',
      notes: row?.notes ?? '',
    }
  }
  throw new Error(`Unsupported master type: ${masterType}`)
}

const addressFields = (address) => ({
  postalCode: address.postalCode,
  prefecture: address.prefecture,
  municipality: address.municipality,
  streetTownAndNumber: address.streetTownAndNumber,
  buildingName: nullable(address.buildingName),
})

export function masterFormDraftToFields(form) {
  if (form.masterType === 'warrantyService') {
    return { name: form.name, defaultPeriodYears: form.defaultPeriodYears }
  }
  if (form.masterType === 'property') {
    return {
      name: form.name,
      homeownerId: form.homeownerId,
      constructionCompanyId: form.constructionCompanyId,
      address: addressFields(form.address),
    }
  }
  if (form.masterType === 'constructionCompany') {
    return {
      name: form.name,
      address: addressFields(form.address),
      telephone: nullable(form.telephone),
      fax: nullable(form.fax),
      contactPerson: nullable(form.contactPerson),
      contactDetails: nullable(form.contactDetails),
      email: nullable(form.email),
      notes: nullable(form.notes),
    }
  }
  if (form.masterType === 'homeowner') {
    return {
      name: form.name,
      address: addressFields(form.address),
      telephone: nullable(form.telephone),
      fax: nullable(form.fax),
      notes: nullable(form.notes),
    }
  }
  throw new Error(`Unsupported master type: ${form.masterType}`)
}
