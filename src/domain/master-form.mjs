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
    return {
      masterType,
      name,
      shortName: row?.shortName ?? row?.name ?? '',
      type: row?.type ?? 'warranty',
      defaultPeriodYears: row?.defaultPeriodYears ?? 1,
      notes: row?.notes ?? '',
    }
  }
  if (masterType === 'property') {
    return {
      masterType,
      name,
      homeownerId: row?.homeownerId ?? '',
      constructionCompanyId: row?.constructionCompanyId ?? '',
      buildingAreaSquareMeters: row?.buildingAreaSquareMeters ?? null,
      address: row ? editableAddress(row.address) : emptyAddress(),
      notes: row?.notes ?? '',
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
    return {
      name: form.name,
      shortName: form.shortName,
      type: form.type,
      defaultPeriodYears: form.defaultPeriodYears,
      notes: nullable(form.notes),
    }
  }
  if (form.masterType === 'property') {
    return {
      name: form.name,
      homeownerId: form.homeownerId,
      constructionCompanyId: form.constructionCompanyId,
      buildingAreaSquareMeters: form.buildingAreaSquareMeters,
      address: addressFields(form.address),
      notes: nullable(form.notes),
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
