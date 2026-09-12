import { masterFormDraftToFields } from '../../src/domain/master-form.mjs'

export async function submitMasterCreate({ form, createMaster, afterSuccess }) {
  const result = await createMaster(masterFormDraftToFields(form))
  await afterSuccess({ masterType: form.masterType, id: result.id })
  return result
}

export async function submitMasterUpdate({ id, form, updateMaster, afterSuccess }) {
  const result = await updateMaster(id, masterFormDraftToFields(form))
  await afterSuccess()
  return result
}
